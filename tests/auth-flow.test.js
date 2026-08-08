const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const vm = require('node:vm');

class Range {
  constructor(sheet, row, column, rows, columns) {
    Object.assign(this, { sheet, row, column, rows, columns });
  }
  getDisplayValues() {
    return Array.from({ length: this.rows }, (_, y) =>
      Array.from({ length: this.columns }, (_, x) => String(this.sheet.data[this.row - 1 + y]?.[this.column - 1 + x] ?? ''))
    );
  }
  setValues(values) {
    values.forEach((valuesRow, y) => valuesRow.forEach((value, x) => {
      const targetRow = this.row - 1 + y;
      this.sheet.data[targetRow] ||= [];
      this.sheet.data[targetRow][this.column - 1 + x] = value;
    }));
  }
}

class Sheet {
  constructor(name) { this.name = name; this.data = []; }
  getLastRow() { return this.data.reduce((last, row, index) => row.some(value => value !== '') ? index + 1 : last, 0); }
  getLastColumn() { return this.data.reduce((max, row) => Math.max(max, row.length), 0); }
  appendRow(row) { this.data.push([...row]); }
  getRange(row, column, rows, columns) { return new Range(this, row, column, rows, columns); }
  getDataRange() { return new Range(this, 1, 1, Math.max(1, this.getLastRow()), Math.max(1, this.getLastColumn())); }
}

const sheets = new Map();
const spreadsheet = {
  getId: () => 'test-sheet',
  getSheetByName: name => sheets.get(name) || null,
  insertSheet: name => { const sheet = new Sheet(name); sheets.set(name, sheet); return sheet; }
};
const properties = new Map();
const emails = [];
let uuidCounter = 0;
const bytes = value => Buffer.isBuffer(value) ? value : Buffer.from(value);

const context = vm.createContext({
  console,
  Date,
  JSON,
  Math,
  Number,
  String,
  Error,
  RegExp,
  SpreadsheetApp: {
    getActive: () => spreadsheet,
    getUi: () => ({ createMenu: () => ({ addItem() { return this; }, addToUi() {} }), alert() {} })
  },
  Session: { getScriptTimeZone: () => 'Asia/Kolkata' },
  PropertiesService: {
    getScriptProperties: () => ({
      getProperty: key => properties.get(key) || null,
      setProperty: (key, value) => properties.set(key, value)
    })
  },
  LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
  MailApp: {
    getRemainingDailyQuota: () => 100,
    sendEmail: message => emails.push(message)
  },
  Utilities: {
    DigestAlgorithm: { SHA_256: 'sha256' },
    getUuid: () => `${(++uuidCounter).toString(16).padStart(8, '0')}-1234-4abc-8def-${crypto.randomBytes(6).toString('hex')}`,
    formatDate: (date, _zone, format) => format === 'yyyy-MM-dd' ? new Date(date).toISOString().slice(0, 10) : new Date(date).toISOString(),
    computeDigest: (_algorithm, value) => crypto.createHash('sha256').update(String(value)).digest(),
    computeHmacSha256Signature: (value, key) => crypto.createHmac('sha256', String(key)).update(String(value)).digest(),
    base64Encode: value => bytes(value).toString('base64'),
    base64EncodeWebSafe: value => bytes(value).toString('base64url')
  },
  ContentService: { MimeType: { JSON: 'json' }, createTextOutput: text => ({ text, setMimeType() { return this; } }) },
  MimeType: { GOOGLE_SHEETS: 'sheet', GOOGLE_DOCS: 'doc', PDF: 'pdf' }
});

vm.runInContext(fs.readFileSync('apps-script/Code.gs', 'utf8'), context, { filename: 'Code.gs' });
context.setupEduwave();
assert.equal(context.authorizeEduwaveMail().remainingDailyQuota, 100);

function rows(name) {
  const [headers, ...data] = sheets.get(name).data;
  return data.map(row => Object.fromEntries(headers.map((header, index) => [header, String(row[index] ?? '')])));
}

context.signupParent_({ name: 'Test Parent', email: 'parent@example.com', phone: '9876543210' });
assert.equal(rows('Portal_Parents')[0].status, 'pending');
context.requestLoginCode_({ role: 'parent', email: 'parent@example.com', deviceId: 'parent-device' });
assert.equal(emails.length, 0, 'pending parents must not receive login codes');

context.requestLoginCode_({ role: 'admin', email: 'studywitheduwaveacademy@gmail.com', deviceId: 'admin-device' });
const adminCode = emails.at(-1).body.match(/\b(\d{6})\b/)[1];
assert.notEqual(rows('Portal_LoginCodes').at(-1).code_hmac, adminCode, 'raw OTP must not be stored');
assert.throws(() => context.verifyLoginCode_({ role: 'admin', email: 'studywitheduwaveacademy@gmail.com', code: '999999', deviceId: 'admin-device' }), /invalid or expired/i);
const adminLogin = context.verifyLoginCode_({ role: 'admin', email: 'studywitheduwaveacademy@gmail.com', code: adminCode, deviceId: 'admin-device', deviceLabel: 'Test' });
assert.equal(adminLogin.role, 'admin');
assert.equal(adminLogin.dashboard.admin.access_role, 'admin');
assert.notEqual(rows('Portal_Sessions').at(-1).session_id, adminLogin.sessionId, 'raw session token must not be stored');

context.requestLoginCode_({ role: 'admin', email: 'diwij.narang2001@gmail.com', deviceId: 'developer-device' });
const developerCode = emails.at(-1).body.match(/\b(\d{6})\b/)[1];
const developerLogin = context.verifyLoginCode_({ role: 'admin', email: 'diwij.narang2001@gmail.com', code: developerCode, deviceId: 'developer-device', deviceLabel: 'Developer test' });
assert.equal(developerLogin.dashboard.admin.access_role, 'developer');

context.adminSetParentStatus_({ sessionId: adminLogin.sessionId, parentId: rows('Portal_Parents')[0].parent_id, status: 'active' });
assert.equal(rows('Portal_Parents')[0].status, 'active');

context.requestLoginCode_({ role: 'parent', email: 'parent@example.com', deviceId: 'parent-device' });
const firstCode = emails.at(-1).body.match(/\b(\d{6})\b/)[1];
const firstLogin = context.verifyLoginCode_({ role: 'parent', email: 'parent@example.com', code: firstCode, deviceId: 'parent-device', deviceLabel: 'First browser' });
assert.equal(firstLogin.role, 'parent');
assert.equal(firstLogin.parent.email_verified, true);

context.requestLoginCode_({ role: 'parent', email: 'parent@example.com', deviceId: 'second-device' });
const secondCode = emails.at(-1).body.match(/\b(\d{6})\b/)[1];
context.verifyLoginCode_({ role: 'parent', email: 'parent@example.com', code: secondCode, deviceId: 'second-device', deviceLabel: 'Second browser' });
assert.throws(() => context.parentDashboard_({ sessionId: firstLogin.sessionId }), /session has ended/i, 'new login must revoke the previous session');

console.log('Auth flow passed: signup, approval, OTP, hashed storage, and session revocation.');
