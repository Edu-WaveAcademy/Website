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
  clearContent() {
    for (let y = 0; y < this.rows; y += 1) {
      for (let x = 0; x < this.columns; x += 1) {
        const targetRow = this.row - 1 + y;
        if (this.sheet.data[targetRow]) this.sheet.data[targetRow][this.column - 1 + x] = '';
      }
    }
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
  insertSheet: name => { const sheet = new Sheet(name); sheets.set(name, sheet); return sheet; },
  deleteSheet: sheet => sheets.delete(sheet.name),
  toast() {}
};
const properties = new Map();
const emails = [];
let uuidCounter = 0;
const bytes = value => Buffer.isBuffer(value) ? value : Buffer.from(value);
const driveFiles = new Map();
const driveFolders = new Map();
let driveCounter = 0;

class DriveBlob {
  constructor(data, mimeType, name) { this.data = bytes(data); this.mimeType = mimeType; this.name = name; }
  getBytes() { return this.data; }
  getContentType() { return this.mimeType; }
}

class DriveFile {
  constructor(blob, parent) {
    this.id = `drive-file-${++driveCounter}`;
    this.blob = blob;
    this.parent = parent;
    this.trashed = false;
    driveFiles.set(this.id, this);
  }
  getId() { return this.id; }
  getName() { return this.blob.name; }
  getMimeType() { return this.blob.mimeType; }
  getSize() { return this.blob.data.length; }
  getBlob() { return this.blob; }
  getOwner() { return { getEmail: () => 'studywitheduwaveacademy@gmail.com' }; }
  getLastUpdated() { return new Date(); }
  getParents() { return iterator([this.parent]); }
  setTrashed(value) { this.trashed = value; }
}

class DriveFolder {
  constructor(name) {
    this.id = `drive-folder-${++driveCounter}`;
    this.name = name;
    this.files = [];
    this.folders = [];
    driveFolders.set(this.id, this);
  }
  getId() { return this.id; }
  getName() { return this.name; }
  createFolder(name) { const folder = new DriveFolder(name); this.folders.push(folder); return folder; }
  createFile(blob) { const file = new DriveFile(blob, this); this.files.push(file); return file; }
  getFiles() { return iterator(this.files); }
  getFolders() { return iterator(this.folders); }
}

function iterator(items) {
  let index = 0;
  return { hasNext: () => index < items.length, next: () => items[index++] };
}

const driveRoot = new DriveFolder('Drive root');

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
  LockService: { getScriptLock: () => ({ waitLock() {}, tryLock() { return true; }, releaseLock() {} }) },
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
    base64EncodeWebSafe: value => bytes(value).toString('base64url'),
    base64Decode: value => Buffer.from(value, 'base64'),
    newBlob: (value, mimeType, name) => new DriveBlob(value, mimeType, name)
  },
  DriveApp: {
    createFolder: name => driveRoot.createFolder(name),
    getRootFolder: () => driveRoot,
    getFolderById: id => { if (!driveFolders.has(id)) throw new Error('Folder not found'); return driveFolders.get(id); },
    getFileById: id => { if (!driveFiles.has(id)) throw new Error('File not found'); return driveFiles.get(id); }
  },
  ContentService: { MimeType: { JSON: 'json' }, createTextOutput: text => ({ text, setMimeType() { return this; } }) },
});

const backendCode = fs.readFileSync('apps-script/Code.gs', 'utf8');
const manifest = JSON.parse(fs.readFileSync('apps-script/appsscript.json', 'utf8'));
assert.match(backendCode, /retireLegacyDriveArchive/, 'backend must include the one-time legacy archive cleanup');
assert.doesNotMatch(backendCode, /ScriptApp|refreshMaterialLibrary|adminScanDrive|adminDriveFolders/, 'legacy Drive scanning and trigger code must stay removed');
assert.ok(!manifest.oauthScopes.includes('https://www.googleapis.com/auth/script.scriptapp'), 'trigger-management permission must be removed');
assert.ok(!manifest.oauthScopes.includes('https://www.googleapis.com/auth/documents.readonly'), 'Google Docs archive permission must be removed');
vm.runInContext(backendCode, context, { filename: 'Code.gs' });
context.setupEduwave();
assert.equal(context.authorizeEduwaveMail().remainingDailyQuota, 100);

function rows(name) {
  const [headers, ...data] = sheets.get(name).data;
  return data
    .filter(row => row.some(value => value !== ''))
    .map(row => Object.fromEntries(headers.map((header, index) => [header, String(row[index] ?? '')])));
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

const student = context.adminCreateStudent_({ sessionId: adminLogin.sessionId, parentId: rows('Portal_Parents')[0].parent_id, name: 'Test Student', classLevel: '8' });
const familyDashboard = context.adminData_({ email: 'studywitheduwaveacademy@gmail.com', access_role: 'admin' });
const approvedFamily = familyDashboard.families.find(family => family.parent_id === rows('Portal_Parents')[0].parent_id);
assert.equal(approvedFamily.name, 'Test Parent');
assert.equal(approvedFamily.email_verified, true);
assert.equal(approvedFamily.children[0].student_id, student.student_id);
assert.equal(approvedFamily.children[0].enrollment_status, 'active');
assert.equal(familyDashboard.unlinkedStudents.length, 0);
const directoryWithUnlinkedStudent = context.adminFamilyDirectory_(
  rows('Portal_Parents'),
  rows('Portal_Students').concat([{ student_id: 'STU-UNLINKED', name: 'Unlinked Student', class_level: '7', enrollment_status: 'active' }]),
  rows('Portal_ParentStudents')
);
assert.equal(directoryWithUnlinkedStudent.unlinkedStudents[0].student_id, 'STU-UNLINKED');
context.append_('Portal_Resources', { resource_id: 'RES-TEST', drive_id: '', title: 'Maths worksheet', subject: 'Maths', class_level: '8', kind: 'worksheet', status: 'published', created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
context.append_('Portal_Assignments', { assignment_id: 'ASN-TEST', student_id: student.student_id, resource_id: 'RES-TEST', title_override: '', visible_from: new Date().toISOString().slice(0, 10), due_date: '', status: 'published', created_at: new Date().toISOString() });
context.append_('Portal_WorksheetRows', { resource_id: 'RES-TEST', row_no: '1', question: '6 x 7', hint: 'Multiply' });
assert.equal(context.parentResource_({ sessionId: firstLogin.sessionId, studentId: student.student_id, resourceId: 'RES-TEST' }).values[1][1], '6 x 7');
context.parentSubmitAssignment_({ sessionId: firstLogin.sessionId, studentId: student.student_id, assignmentId: 'ASN-TEST', answers: [{ row: 2, question: '6 x 7', answer: '42' }], note: 'Completed independently.' });
assert.equal(rows('Portal_Submissions')[0].status, 'submitted');
assert.equal(context.parentDashboard_({ sessionId: firstLogin.sessionId }).dashboard.children[0].resources[0].submission_status, 'submitted');
context.adminReviewSubmission_({ sessionId: adminLogin.sessionId, submissionId: rows('Portal_Submissions')[0].submission_id, status: 'reviewed', feedback: 'Correct.' });
assert.equal(rows('Portal_Submissions')[0].status, 'reviewed');
assert.throws(() => context.parentSubmitAssignment_({ sessionId: firstLogin.sessionId, studentId: student.student_id, assignmentId: 'ASN-TEST', answers: [{ row: 2, answer: '43' }] }), /reviewed and is now locked/i);

const officeMime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const uploadedResource = context.adminUploadResource_({
  sessionId: adminLogin.sessionId,
  title: 'Handwritten algebra practice',
  subject: 'Maths',
  classLevel: '8',
  submissionType: 'file_upload',
  file: { name: 'algebra-practice.docx', mimeType: officeMime, data: Buffer.from('test office file').toString('base64') }
});
assert.equal(uploadedResource.kind, 'office');
assert.equal(uploadedResource.submission_type, 'file_upload');
const legacyFile = driveRoot.createFile(new DriveBlob(Buffer.from('old syllabus'), 'application/pdf', 'old-syllabus.pdf'));
context.append_('Portal_Resources', { resource_id: 'RES-OLD', drive_id: legacyFile.getId(), title: 'Old syllabus worksheet', subject: 'Maths', class_level: '8', kind: 'pdf', status: 'published', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), submission_type: 'file_upload', library_path: 'Classroom / Old Syllabus', source: 'drive_auto', auto_added: 'true' });
context.append_('Portal_DriveIndex', { drive_id: legacyFile.getId(), parent_drive_id: driveRoot.getId(), path: 'Classroom / Old Syllabus', name: 'old-syllabus.pdf', mime_type: 'application/pdf', kind: 'pdf', ownership: 'academy', size_bytes: String(legacyFile.getSize()), safe_candidate: 'true', resource_id: 'RES-OLD', sync_run_id: 'SYNC-OLD' });
context.append_('Portal_Assignments', { assignment_id: 'ASN-OLD', student_id: student.student_id, resource_id: 'RES-OLD', visible_from: new Date().toISOString().slice(0, 10), status: 'published', created_at: new Date().toISOString() });
context.append_('Portal_Submissions', { submission_id: 'SUB-OLD', assignment_id: 'ASN-OLD', student_id: student.student_id, resource_id: 'RES-OLD', responses_json: '[]', status: 'submitted', submitted_at: new Date().toISOString(), updated_at: new Date().toISOString() });
context.setConfig_('drive_root_id', driveRoot.getId());
context.setConfig_('material_refresh_enabled', 'true');
const syncSheet = spreadsheet.insertSheet('Portal_DriveSync');
syncSheet.appendRow(['folder_id', 'path', 'status']);
syncSheet.appendRow([driveRoot.getId(), 'Classroom', 'pending']);

const cleanup = context.retireLegacyDriveArchive();
assert.equal(cleanup.removedResources, 1);
assert.equal(cleanup.removedAssignments, 1);
assert.equal(cleanup.removedSubmissions, 1);
assert.equal(sheets.has('Portal_DriveSync'), false, 'legacy sync tab must be deleted');
assert.equal(rows('Portal_Resources').some(row => row.resource_id === 'RES-OLD'), false);
assert.equal(rows('Portal_Assignments').some(row => row.assignment_id === 'ASN-OLD'), false);
assert.equal(rows('Portal_Submissions').some(row => row.submission_id === 'SUB-OLD'), false);
assert.equal(rows('Portal_Resources').some(row => row.resource_id === uploadedResource.resource_id), true, 'portal uploads must be preserved');
assert.equal(rows('Portal_Resources').some(row => row.resource_id === 'RES-TEST'), true, 'standalone portal worksheets must be preserved');
assert.equal(rows('Portal_DriveIndex').every(row => row.sync_run_id === 'upload'), true, 'only uploaded-file metadata may remain');
assert.equal(rows('Portal_Config').some(row => row.key === 'drive_root_id' || row.key === 'material_refresh_enabled'), false, 'legacy archive configuration must be removed');
context.adminAssignResource_({ sessionId: adminLogin.sessionId, studentId: student.student_id, resourceId: uploadedResource.resource_id, dueDate: '2026-08-20' });
const fileAssignment = rows('Portal_Assignments').find(row => row.resource_id === uploadedResource.resource_id);
const secureDownload = context.parentResource_({ sessionId: firstLogin.sessionId, studentId: student.student_id, resourceId: uploadedResource.resource_id });
assert.equal(secureDownload.kind, 'download');
assert.match(secureDownload.data_url, /^data:/);
assert.equal(secureDownload.submissionType, 'file_upload');

context.parentSubmitAssignment_({
  sessionId: firstLogin.sessionId,
  studentId: student.student_id,
  assignmentId: fileAssignment.assignment_id,
  note: 'Completed in my notebook.',
  attachment: { name: 'answers.pdf', mimeType: 'application/pdf', data: Buffer.from('scanned answer pages').toString('base64') }
});
const fileSubmission = rows('Portal_Submissions').find(row => row.assignment_id === fileAssignment.assignment_id);
const firstAttachmentId = fileSubmission.attachment_drive_id;
assert.ok(firstAttachmentId);
const publicSubmission = context.adminData_({ email: 'studywitheduwaveacademy@gmail.com', access_role: 'admin' }).submissions.find(row => row.submission_id === fileSubmission.submission_id);
assert.equal(publicSubmission.has_attachment, true);
assert.equal('attachment_drive_id' in publicSubmission, false, 'Drive IDs must not be exposed in dashboard payloads');
assert.equal(context.adminSubmissionFile_({ sessionId: adminLogin.sessionId, submissionId: fileSubmission.submission_id }).kind, 'pdf');

context.adminReviewSubmission_({ sessionId: adminLogin.sessionId, submissionId: fileSubmission.submission_id, status: 'needs_changes', feedback: 'Please scan the final page again.' });
context.parentSubmitAssignment_({
  sessionId: firstLogin.sessionId,
  studentId: student.student_id,
  assignmentId: fileAssignment.assignment_id,
  note: 'Added the final page.',
  attachment: { name: 'answers-final.png', mimeType: 'image/png', data: Buffer.from('replacement page').toString('base64') }
});
assert.equal(driveFiles.get(firstAttachmentId).trashed, true, 'replaced scans must be moved to trash');
const replacedSubmission = rows('Portal_Submissions').find(row => row.submission_id === fileSubmission.submission_id);
assert.equal(context.adminSubmissionFile_({ sessionId: adminLogin.sessionId, submissionId: replacedSubmission.submission_id }).kind, 'image');
context.adminReviewSubmission_({ sessionId: adminLogin.sessionId, submissionId: replacedSubmission.submission_id, status: 'reviewed', feedback: 'Complete.' });
assert.throws(() => context.parentSubmitAssignment_({ sessionId: firstLogin.sessionId, studentId: student.student_id, assignmentId: fileAssignment.assignment_id, note: 'Another update.' }), /reviewed and is now locked/i);

context.requestLoginCode_({ role: 'parent', email: 'parent@example.com', deviceId: 'second-device' });
const secondCode = emails.at(-1).body.match(/\b(\d{6})\b/)[1];
context.verifyLoginCode_({ role: 'parent', email: 'parent@example.com', code: secondCode, deviceId: 'second-device', deviceLabel: 'Second browser' });
assert.throws(() => context.parentDashboard_({ sessionId: firstLogin.sessionId }), /session has ended/i, 'new login must revoke the previous session');

console.log('Auth flow passed: login, worksheet answers, mixed-file assignment, scanned submission/review, private Drive metadata, and session revocation.');
