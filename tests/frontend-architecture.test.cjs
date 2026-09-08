const assert = require('node:assert/strict');
const { test } = require('node:test');
const createState = require('../src/state.cjs');
const createBrowser = require('../src/infrastructure/browser.cjs');
const format = require('../src/shared/format.cjs')({});
const config = require('../src/config.cjs');

test('composition constructs without DOM or network effects until explicitly started', () => {
  const listeners=[];
  const application=require('../src/application.cjs')({
    document:{
      querySelector:() => {throw Error('Unexpected DOM access during construction');},
      addEventListener:(...args) => listeners.push(args),
    },
  });
  assert.equal(listeners.length, 0);
  application.start();
  assert.equal(listeners.length, 1);
  assert.equal(listeners[0][0], 'DOMContentLoaded');
  assert.equal(typeof listeners[0][1], 'function');
});

function transport(fetch) {
  let scheduled = 0, cleared = 0;
  const adapter = createBrowser({
    ...config, fetch, AbortController,
    setTimeout: () => { scheduled++; return 42; },
    clearTimeout: id => { assert.equal(id, 42); cleared++; },
  });
  return { ...adapter, timers: () => [scheduled, cleared] };
}

test('transport preserves POST wire contract and releases its timeout', async () => {
  const client = transport(async (url, request) => {
    assert.equal(url, config.CONFIG.apiUrl);
    assert.equal(request.method, 'POST');
    assert.equal(request.headers['Content-Type'], 'text/plain;charset=utf-8');
    assert.deepEqual(JSON.parse(request.body), {action:'parentDashboard', sessionId:'opaque'});
    return {ok:true, json:async () => ({ok:true, data:{children:[]}})};
  });
  assert.deepEqual(await client.api('parentDashboard', {sessionId:'opaque'}), {children:[]});
  assert.deepEqual(client.timers(), [1, 1]);
});

test('transport preserves backend errors, timeout guidance, and does not retry writes', async () => {
  const cases = [
    [async () => ({ok:true, json:async () => ({ok:false, message:'Access revoked'})}), /Access revoked/],
    [async () => ({ok:true, json:async () => ({ok:false, message:'Unknown action.'})}), /email-login backend is not deployed/],
    [async () => ({ok:false}), /temporarily unavailable/],
    [async () => { throw Object.assign(new Error(), {name:'AbortError'}); }, /may still have completed/],
  ];
  for (const [response, expected] of cases) {
    let calls = 0;
    const client = transport((...args) => { calls++; return response(...args); });
    await assert.rejects(client.api('requestLoginCode'), expected);
    assert.equal(calls, 1);
    assert.deepEqual(client.timers(), [1, 1]);
  }
});

test('upload adapter keeps the size boundary and file payload format', async () => {
  class File { constructor(size, name='work.pdf', type='') { Object.assign(this, {size, name, type}); } }
  class FileReader { readAsDataURL() { this.result='data:application/pdf;base64,cGRm'; this.onload(); } }
  const files = createBrowser({...config, ...format, File, FileReader});
  await assert.rejects(files.encodeFile({size:1}), /Choose a file first/);
  await assert.rejects(files.encodeFile(new File(0)), /Choose a file first/);
  await assert.rejects(files.encodeFile(new File(config.MAX_UPLOAD_BYTES+1)), /smaller than 8 MB/);
  assert.deepEqual(await files.encodeFile(new File(config.MAX_UPLOAD_BYTES)), {
    name:'work.pdf', mimeType:'application/pdf', size:config.MAX_UPLOAD_BYTES, data:'cGRm',
  });
});

test('new application instances do not share sessions or directory filters', () => {
  const first = createState(), second = createState();
  first.auth.parentEmail='parent@example.com';
  first.sessionId='private';
  first.submissionPage=3;
  assert.equal(second.auth.parentEmail, '');
  assert.equal(second.sessionId, '');
  assert.equal(second.submissionPage, 0);
});

test('submission filters clamp pages and preserve ten records per page', () => {
  const state=createState();
  const ui={stateMarkup: () => '<p>Empty</p>'};
  const submissions=require('../src/features/admin/submissions.cjs')({...format, state, EduwaveUI:ui});
  const data={students:[], resources:[], submissions:Array.from({length:23}, (_,i) => ({
    submission_id:`SUB${i}`, student_id:'S1', resource_id:'R1', submitted_at:'2026-09-01', status:'submitted', answers:[],
  }))};
  let html=submissions.submissionsPanel(data);
  assert.equal((html.match(/class="submission-review-form"/g)||[]).length, 10);
  assert.match(html, /Showing 1-10 of 23/);
  state.submissionPage=99;
  html=submissions.submissionsPanel(data);
  assert.equal(state.submissionPage, 2);
  assert.match(html, /Showing 21-23 of 23/);
  state.submissionMonth='2026-08';
  html=submissions.submissionsPanel(data);
  assert.equal(state.submissionPage, 0);
  assert.match(html, /Showing 0 submissions/);
});

test('worksheet presentation escapes content and retains saved answers', () => {
  const materials=require('../src/features/materials.cjs')({...format});
  const html=materials.worksheetTable({submissionType:'online_answers', values:[['Question'],['<script>']], submission:{answers:[{row:2,answer:'"<&'}]}});
  assert.equal(html.toLowerCase().includes('<script'), false);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /value="&quot;&lt;&amp;"/);
  assert.match(materials.submissionPanel({submissionType:'view_only'}), /Nothing needs to be submitted/);
});

test('failed saved sessions are removed without blocking the other role', async () => {
  const saved=new Map([[config.SESSION_KEYS.parent, 'expired'], [config.SESSION_KEYS.admin, 'valid']]);
  const state=createState();
  let applied=0;
  const auth=require('../src/features/auth.cjs')({
    ...config, state,
    sessionStorage:{getItem:key => saved.get(key), removeItem:key => saved.delete(key)},
    api:async action => { if(action==='parentDashboard') throw Error('Expired'); return {metrics:{}}; },
    applyAdmin:() => { applied++; },
  });
  await auth.restoreSessions();
  assert.equal(saved.has(config.SESSION_KEYS.parent), false);
  assert.equal(state.admin.sessionId, 'valid');
  assert.equal(applied, 1);
});
