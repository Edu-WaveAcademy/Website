const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const http = require('node:http');
const {execFileSync} = require('node:child_process');
const {check} = require('../ops/smoke');

(async () => {
  const apiSource = fs.readFileSync('src/infrastructure/browser.cjs', 'utf8');
  let calls = 0, cleared = 0, timer;
  const context = { module:{exports:{}}, CONFIG: {apiUrl:'https://example.invalid'}, AbortController,
    setTimeout(fn, ms) { assert.equal(ms,45000); timer=fn; return 1; },
    clearTimeout() { cleared++; },
    fetch: async () => { calls++; return {ok:true,json:async()=>({ok:true,data:{saved:true}})} }
  };
  vm.createContext(context);
  vm.runInContext(apiSource,context);
  context.api=context.module.exports({...context,fetch:(...args)=>context.fetch(...args)}).api;
  assert.equal((await context.api('write')).saved,true);
  context.fetch = async (_url, options) => {
    calls++;
    return new Promise((_resolve,reject)=> {
      options.signal.addEventListener('abort',()=>reject(Object.assign(new Error('aborted'),{name:'AbortError'})));
      timer();
    });
  };
  await assert.rejects(context.api('write'), /may still have completed/);
  assert.equal(calls,2,'A timed-out mutation must not be retried');
  assert.equal(cleared,2,'Timers must be cleaned on success and timeout');
  context.fetch = async () => ({ok:false});
  await assert.rejects(context.api('write'), /temporarily unavailable/);

  // Actual backend dispatcher: never log user input, including error text.
  const records=[];
  const backend={
    console:{info:entry=>records.push(JSON.parse(entry))},
    json_:(ok,message,data)=>({ok,message,data}), clean_:v=>String(v||'').trim(),
    getConfig_:()=> 'configured'
  };
  vm.createContext(backend);
  const gs=fs.readFileSync('apps-script/src/http/routes.gs','utf8');
  const dispatcher=gs.slice(gs.indexOf('function doPost('),gs.indexOf('function json_('));
  vm.runInContext(dispatcher,backend);
  assert.equal(backend.doPost({postData:{contents:'{"action":"health"}'}}).ok,true);
  assert.equal(backend.doPost({postData:{contents:'{"action":"private@example.com","sessionId":"SECRET"}'}}).ok,false);
  assert.deepEqual(records.map(row=>row.ok),[true,false]);
  assert.ok(records.every(row=>Number.isFinite(row.duration_ms)));
  assert.doesNotMatch(JSON.stringify(records),/private|SECRET/);
  backend.console.info=()=>{throw new Error('logging offline')};
  assert.equal(backend.doPost({postData:{contents:'{"action":"health"}'}}).ok,true);

  execFileSync(process.execPath,['ops/build.js'],{stdio:'pipe',env:{...process.env,API_URL:'https://script.google.com/macros/s/test-release/exec'}});
  const manifest=JSON.parse(fs.readFileSync('dist/release.json','utf8'));
  assert.ok(manifest.files['ui/components.js']);
  for(const file of ['apps-script','tests','README.md','ui/showcase.html']) assert.equal(fs.existsSync('dist/'+file),false);
  assert.match(fs.readFileSync('dist/script.js','utf8'),/test-release\/exec/);
  assert.throws(()=>execFileSync(process.execPath,['ops/build.js'],{stdio:'pipe',env:{...process.env,API_URL:"https://evil.invalid/'"}}));

  // Uptime must detect an HTTP-200 application failure and wrong deployed revision.
  let healthy=true;
  const server=http.createServer((request,response)=>{
    if(request.url==='/api') {response.setHeader('content-type','application/json');response.end(JSON.stringify({ok:healthy,data:{configured:true,auth:'email_otp'}}));return;}
    const file='dist/'+request.url.split('?')[0].slice(1);
    if(!fs.existsSync(file)){response.statusCode=404;response.end();return;}
    response.end(fs.readFileSync(file));
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const url=`http://127.0.0.1:${server.address().port}/`;
  try{
    await check(url,url+'api');
    healthy=false;
    await assert.rejects(check(url,url+'api'),/Backend application failure/);
    await assert.rejects(check(url,undefined,'wrong-revision'),/Wrong deployed revision/);
  }finally{await new Promise(resolve=>server.close(resolve));}
  execFileSync(process.execPath,['ops/build.js'],{stdio:'pipe'});
  console.log('Production checks passed: timeout without retry, private telemetry, allowlisted build, configuration validation, semantic health and release mismatch.');
})().catch(error=>{console.error(error);process.exitCode=1});
