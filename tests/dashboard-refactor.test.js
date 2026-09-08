const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { test } = require('node:test');

const source = fs.readFileSync('apps-script/Code.gs', 'utf8');
const legacy = fs.readFileSync('tests/fixtures/legacy-dashboard.js', 'utf8');
const plain = value => JSON.parse(JSON.stringify(value));

function runtime(data, useLegacy = false) {
  const reads = {};
  const context = vm.createContext({ Session: { getScriptTimeZone: () => 'Asia/Kolkata' } });
  vm.runInContext(source, context);
  if (useLegacy) vm.runInContext(legacy, context);
  context.rows_ = name => {
    reads[name] = (reads[name] || 0) + 1;
    return structuredClone(data[name] || []);
  };
  context.date_ = () => '2026-09-08';
  context.getConfig_ = key => ({ upi_id: 'academy@test', academy_name: 'Academy' })[key];
  return { context, reads };
}

function fixture(count) {
  const data = {};
  const add = (name, row) => (data[`Portal_${name}`] ||= []).push(row);
  for (let i = 0; i < count; i++) {
    const sid = `S${i}`;
    add('Students', { student_id: sid, name: `Child ${i}`, class_level: '8', enrollment_status: i % 7 === 6 ? 'left' : 'active' });
    add('ParentStudents', { parent_id: i % 5 === 4 ? 'OTHER' : 'P', student_id: sid, active: i % 6 === 5 ? 'false' : 'TRUE' });
    for (let j = 0; j < 9; j++) {
      const aid = `${sid}-A${j}`, rid = `R${j}`;
      add('Assignments', { assignment_id: aid, student_id: sid, resource_id: rid, title_override: j === 2 ? 'Override' : '', status: j === 8 ? 'revoked' : 'published', visible_from: j === 3 ? '2027-01-01' : '', due_date: '' });
      if (j % 3 !== 0) {
        add('Submissions', { assignment_id: aid, student_id: sid, status: j % 2 ? 'needs_changes' : 'reviewed', feedback: 'Try again', submitted_at: '2026-09-01' });
        add('Submissions', { assignment_id: aid, student_id: sid, status: 'submitted', feedback: 'Later duplicate' });
      }
      for (const name of ['Fees', 'Attendance', 'Progress']) {
        add(name, { student_id: sid, fee_id: `${aid}-F`, billing_month: 'September', amount: '500', status: j % 2 ? 'paid' : 'due', updated_at: `2026-09-0${j + 1}`, marker: aid });
      }
    }
  }
  for (let j = 0; j < 8; j++) {
    add('Resources', { resource_id: `R${j}`, title: `Resource ${j}`, kind: j % 2 ? 'worksheet' : 'pdf', submission_type: j === 4 ? 'view_only' : '', status: j === 5 ? 'draft' : 'published', subject: 'Maths' });
  }
  add('Resources', { resource_id: 'R0', title: 'Duplicate must not win' });
  add('Assignments', { assignment_id: 'MISSING', student_id: 'S0', resource_id: 'MISSING', status: 'published' });
  add('Announcements', { audience: 'all', title: 'General', message: 'Hello', active_from: '', active_until: '', type: '' });
  add('Announcements', { student_id: 'S0', title: 'Private', message: 'Hello', active_from: '', active_until: '' });
  add('Announcements', { audience: 'all', title: 'Expired', active_until: '2020-01-01' });
  add('Announcements', { student_id: 'OTHER', title: 'Other family' });
  return data;
}

for (const count of [0, 1, 3, 20, 100]) {
  test(`parent dashboard preserves legacy payload and ordering (${count} students)`, () => {
    const data = fixture(count), before = runtime(data, true), after = runtime(data);
    const expected = plain(before.context.dashboardForParent_({ parent_id: 'P' }));
    assert.deepEqual(plain(after.context.dashboardForParent_({ parent_id: 'P' })), expected);
    assert.equal(Object.values(after.reads).reduce((a, b) => a + b, 0), 9);
    assert.ok(Object.values(after.reads).every(count => count === 1));
    if (count === 100) console.log(`Dashboard table reads (100 students): ${Object.values(before.reads).reduce((a, b) => a + b, 0)} -> 9 (configuration/authentication excluded).`);
  });
}

test('new requests observe revocation and recent lists do not reorder snapshot records', () => {
  const data = fixture(3), { context } = runtime(data);
  const snapshot = context.dashboardData_(), saved = plain(snapshot.feesByStudent.get('S0'));
  context.childViews_('P', snapshot);
  assert.deepEqual(plain(snapshot.feesByStudent.get('S0')), saved);
  assert.ok(context.dashboardForParent_({ parent_id: 'P' }).children[0].resources.length);
  data.Portal_Assignments.forEach(row => { row.status = 'revoked'; });
  assert.equal(context.dashboardForParent_({ parent_id: 'P' }).children[0].resources.length, 0);
  data.Portal_ParentStudents.forEach(row => { row.active = 'false'; });
  assert.equal(context.dashboardForParent_({ parent_id: 'P' }).children.length, 0);
});

test('family directory joins preserve duplicates, missing records, sorting, and departed links', () => {
  const data = fixture(20), before = runtime(data, true).context, after = runtime(data).context;
  const parents = [
    { parent_id: 'P', name: 'Zed', status: 'active' },
    { parent_id: 'OTHER', name: 'Amy', status: 'left' },
    { parent_id: 'EMPTY', name: 'Bea', status: 'pending' }
  ];
  const students = data.Portal_Students.concat([{ student_id: 'S0', name: 'Duplicate' }]);
  const links = data.Portal_ParentStudents.concat([data.Portal_ParentStudents[0], { parent_id: 'P', student_id: 'missing', active: 'true' }]);
  const original = plain({ parents, students, links });
  assert.deepEqual(plain(after.adminFamilyDirectory_(parents, students, links)), plain(before.adminFamilyDirectory_(parents, students, links)));
  assert.deepEqual({ parents, students, links }, original);
});

test('sheet writes follow real headers and preserve untouched formulas and custom columns', () => {
  const { context } = runtime({});
  const headers = ['value', 'custom', 'updated_at', 'key'];
  const data = [headers, ['old', '=1+2', '=TODAY()', 'setting']];
  const writes = [];
  const sheet = {
    getLastColumn: () => headers.length,
    getLastRow: () => data.length,
    appendRow: row => data.push(row),
    getRange: (row, col, height, width) => ({
      getDisplayValues: () => Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => data[row - 1 + y]?.[col - 1 + x] ?? '')),
      setValues: values => {
        writes.push({ row, col, height, width });
        values.forEach((record, y) => record.forEach((value, x) => {
          data[row - 1 + y] ||= [];
          data[row - 1 + y][col - 1 + x] = value;
        }));
      },
      clearContent: () => {
        for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) data[row - 1 + y][col - 1 + x] = '';
      }
    })
  };
  context.sheet_ = () => sheet;
  context.update_('Portal_Config', 2, { value: 'new' });
  assert.deepEqual(data[1], ['new', '=1+2', '=TODAY()', 'setting']);
  assert.deepEqual(writes, [{ row: 2, col: 1, height: 1, width: 1 }]);
  context.append_('Portal_Config', { key: 'next', value: 0, updated_at: 'now' });
  assert.deepEqual(plain(data[2]), [0, '', 'now', 'next']);
  context.update_('Portal_Config', 2, { updated_at: 'later', key: 'renamed' });
  assert.equal(writes.at(-1).width, 2, 'adjacent supplied fields share one write');
  context.replaceData_('Portal_Config', [{ key: 'only', value: 'kept', custom: 'extension' }]);
  assert.deepEqual(plain(data[1]), ['kept', 'extension', '', 'only']);
  assert.ok(data[2].every(value => value === ''));
  headers[3] = 'wrong_header';
  const writeCount = writes.length;
  assert.throws(() => context.update_('Portal_Config', 2, { value: 'bad' }), /Missing portal columns/);
  assert.equal(writes.length, writeCount, 'incomplete schema fails before writing');
});
