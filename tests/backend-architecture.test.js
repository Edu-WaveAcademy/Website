const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const acorn = require('acorn');

const root = path.resolve(__dirname, '../apps-script');
const modules = JSON.parse(
  fs.readFileSync(path.join(root, 'modules.json'), 'utf8')
);
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const source = modules.map(read).join('\n');
const parse = (text) => acorn.parse(text, { ecmaVersion: 2022 });
const normalize = (value) =>
  JSON.parse(
    JSON.stringify(value, (key, item) =>
      ['start', 'end', 'raw'].includes(key) ? undefined : item
    )
  );

test('manifest lists every backend source once using safe relative paths', () => {
  assert.ok(Array.isArray(modules) && modules.length > 0);
  assert.equal(new Set(modules).size, modules.length);
  for (const file of modules) {
    assert.match(file, /^src\/(?:[a-z-]+\/)*[a-z-]+\.gs$/);
    assert.ok(fs.statSync(path.join(root, file)).isFile());
  }
  function walk(directory) {
    return fs
      .readdirSync(path.join(root, directory), { withFileTypes: true })
      .flatMap((entry) =>
        entry.isDirectory()
          ? walk(`${directory}/${entry.name}`)
          : [`${directory}/${entry.name}`]
      );
  }
  assert.deepEqual([...modules].sort(), walk('src').sort());
  assert.equal(modules[0], 'src/config/schema.gs');
});

test('deployable output equals manifest sources, allowing a generated comment header', () => {
  assert.deepEqual(normalize(parse(read('Code.gs'))), normalize(parse(source)));
  const functions = parse(source).body.filter(
    (node) => node.type === 'FunctionDeclaration'
  );
  assert.equal(
    new Set(functions.map((node) => node.id.name)).size,
    functions.length
  );
  // Parsing as a script also forbids module imports/exports incompatible with Apps Script.
  const context = vm.createContext({
    Session: { getScriptTimeZone: () => 'Asia/Kolkata' }
  });
  vm.runInContext(source, context);
  for (const name of [
    'doGet',
    'doPost',
    'onOpen',
    'setupEduwave',
    'upgradeFileUploads',
    'authorizeEduwaveMail',
    'generateMonthlyFees',
    'retireLegacyDriveArchive'
  ]) {
    assert.equal(typeof context[name], 'function', name);
  }
  assert.equal(context.childViews_.length, 2);
  assert.equal(context.notifications_.length, 2);
});

test('pure dashboard projections load without Apps Script, storage, config or clock', () => {
  const context = vm.createContext({});
  vm.runInContext(
    read('src/projections/values.gs') +
      '\n' +
      read('src/projections/dashboard.gs'),
    context
  );
  const data = {
    links: [],
    students: [],
    assignments: [],
    fees: [],
    announcements: [
      {
        audience: 'all',
        title: 'Today',
        message: 'Welcome',
        active_from: '2026-09-08'
      },
      { audience: 'all', title: 'Tomorrow', active_from: '2026-09-09' }
    ]
  };
  const plain = (value) => JSON.parse(JSON.stringify(value));
  assert.deepEqual(plain(context.projectChildren_('P', data)), []);
  assert.deepEqual(
    plain(context.projectNotifications_([], data, '2026-09-08')),
    [{ type: 'exam', title: 'Today', message: 'Welcome' }]
  );
  assert.equal(context.projectNotifications_([], data, '2026-09-09').length, 2);
  assert.deepEqual(plain(context.adminFamilyDirectory_([], [], [])), {
    families: [],
    unlinkedStudents: []
  });
});

test('compatibility facades acquire missing snapshots and read the clock per call', () => {
  const context = vm.createContext({});
  vm.runInContext(read('src/application/dashboard.gs'), context);
  const snapshot = {};
  const calls = [];
  context.dashboardData_ = () => {
    calls.push('read');
    return snapshot;
  };
  context.date_ = () => {
    calls.push('clock');
    return 'today';
  };
  context.projectChildren_ = (parent, data) => {
    assert.equal(data, snapshot);
    return parent;
  };
  context.projectNotifications_ = (ids, data, today) => {
    assert.equal(data, snapshot);
    assert.equal(today, 'today');
    return ids;
  };
  assert.equal(context.childViews_('P'), 'P');
  context.childViews_('P', snapshot);
  context.notifications_([]);
  context.notifications_([], snapshot);
  assert.deepEqual(calls, ['read', 'read', 'clock', 'clock']);
});
