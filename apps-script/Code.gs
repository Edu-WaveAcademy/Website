const SHEET_NAMES = {
  students: 'Students',
  accounts: 'Accounts',
  trials: 'Trials',
  fees: 'Fees',
  resources: 'Resources',
  assignments: 'Assignments',
  reminders: 'Reminders',
  accessLogs: 'AccessLogs'
};

const SESSION_TTL_MINUTES = 180;
const MAX_FAILED_ATTEMPTS = 6;
const SCRIPT_TZ = Session.getScriptTimeZone() || 'Asia/Kolkata';
const ADMIN_KEY = 'Diwish.1'; // Simple secret key for trial phase admin authorization

/**
 * Custom menu when opening the Google Sheet
 */
function onOpen() {
  try {
    const ui = SpreadsheetApp.getUi();
    ui.createMenu('Eduwave Portal Admin')
      .addItem('1. Seed Headers / Create Tabs', 'seedHeadersMenu')
      .addSeparator()
      .addItem('2. Reset Student Password', 'resetPasswordMenu')
      .addItem('3. Mark Fee as Paid', 'markFeePaidMenu')
      .addItem('4. Generate WhatsApp Reminder', 'generateReminderMenu')
      .addToUi();
  } catch (e) {
    // onOpen can fail if script is not authorized, fails silently
  }
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents || '{}');
    const action = String(payload.action || '').trim();
    let data;

    switch (action) {
      case 'seedHeaders':
        data = seedHeaders_();
        break;
      case 'submitTrial':
        data = submitTrial_(payload);
        break;
      case 'login':
        data = login_(payload);
        break;
      case 'logout':
        data = logout_(payload);
        break;
      case 'submitPaymentNote':
        data = submitPaymentNote_(payload);
        break;
      case 'getDashboard':
        data = getDashboard_(payload);
        break;
      case 'getResourcePreview':
        data = getResourcePreview_(payload);
        break;
      case 'adminCreateStudent':
        data = adminCreateStudent_(payload);
        break;
      case 'adminResetPassword':
        data = adminResetPassword_(payload);
        break;
      case 'adminMarkFeePaid':
        data = adminMarkFeePaid_(payload);
        break;
      case 'adminGenerateReminder':
        data = adminGenerateReminder_(payload);
        break;
      default:
        return jsonResponse_(false, 'Unknown action.');
    }

    return jsonResponse_(true, 'Success', data);
  } catch (error) {
    return jsonResponse_(false, error.message || 'Server error');
  }
}

/* --- Spreadsheet Menu Handlers --- */

function seedHeadersMenu() {
  const ui = SpreadsheetApp.getUi();
  try {
    const res = seedHeaders_();
    ui.alert('Success', 'Eduwave tabs and headers have been seeded successfully!', ui.ButtonSet.OK);
  } catch (e) {
    ui.alert('Error', 'Failed to seed headers: ' + e.message, ui.ButtonSet.OK);
  }
}

function resetPasswordMenu() {
  const ui = SpreadsheetApp.getUi();
  
  const idPrompt = ui.prompt('Reset Student Password', 'Enter Student ID or Username:', ui.ButtonSet.OK_CANCEL);
  if (idPrompt.getSelectedButton() !== ui.Button.OK) return;
  const identifier = idPrompt.getResponseText().trim();
  if (!identifier) return;

  const pwPrompt = ui.prompt('Reset Student Password', 'Enter New Password for ' + identifier + ':', ui.ButtonSet.OK_CANCEL);
  if (pwPrompt.getSelectedButton() !== ui.Button.OK) return;
  const newPassword = pwPrompt.getResponseText().trim();
  if (!newPassword) return;

  try {
    const accountRow = findRow_(SHEET_NAMES.accounts, function (row) {
      return String(row[0] || '').toLowerCase() === identifier.toLowerCase() || String(row[1] || '').toLowerCase() === identifier.toLowerCase();
    });
    if (!accountRow) {
      ui.alert('Error', 'Student account not found for: ' + identifier, ui.ButtonSet.OK);
      return;
    }

    getSheet_(SHEET_NAMES.accounts).getRange(accountRow.rowIndex, 3, 1, 6).setValues([[
      hashPassword_(newPassword),
      '', // session
      '', // last login
      '', // device
      0,  // failed attempts
      ''  // lockout
    ]]);
    ui.alert('Success', 'Password has been reset successfully for student: ' + accountRow.values[0], ui.ButtonSet.OK);
  } catch (e) {
    ui.alert('Error', 'Failed to reset password: ' + e.message, ui.ButtonSet.OK);
  }
}

function markFeePaidMenu() {
  const ui = SpreadsheetApp.getUi();
  
  const idPrompt = ui.prompt('Mark Fee Paid', 'Enter Student ID (e.g. STU-XXXX):', ui.ButtonSet.OK_CANCEL);
  if (idPrompt.getSelectedButton() !== ui.Button.OK) return;
  const studentId = idPrompt.getResponseText().trim();
  if (!studentId) return;

  const monthPrompt = ui.prompt('Mark Fee Paid', 'Enter Month (e.g. July 2026):', ui.ButtonSet.OK_CANCEL);
  if (monthPrompt.getSelectedButton() !== ui.Button.OK) return;
  const month = monthPrompt.getResponseText().trim();
  if (!month) return;

  const refPrompt = ui.prompt('Mark Fee Paid', 'Enter UPI Reference / Note (Optional):', ui.ButtonSet.OK_CANCEL);
  if (refPrompt.getSelectedButton() !== ui.Button.OK) return;
  const reference = refPrompt.getResponseText().trim();

  try {
    const feeRow = findRow_(SHEET_NAMES.fees, function (row) {
      return String(row[0] || '') === studentId && String(row[1] || '').toLowerCase() === month.toLowerCase();
    });

    const nowStamp = stamp_(new Date());
    const refVal = reference || 'admin-marked';
    const noteVal = 'Marked paid via spreadsheet menu';

    if (feeRow) {
      getSheet_(SHEET_NAMES.fees).getRange(feeRow.rowIndex, 5, 1, 6).setValues([[
        'paid',
        nowStamp.split('T')[0],
        refVal,
        noteVal,
        'admin-verified',
        nowStamp
      ]]);
    } else {
      getSheet_(SHEET_NAMES.fees).appendRow([
        studentId,
        month,
        'Not set',
        'Paid',
        'paid',
        nowStamp.split('T')[0],
        refVal,
        noteVal,
        'admin-verified',
        nowStamp
      ]);
    }
    ui.alert('Success', 'Fee marked as Paid for student ' + studentId + ' (' + month + ')', ui.ButtonSet.OK);
  } catch (e) {
    ui.alert('Error', 'Failed to mark fee paid: ' + e.message, ui.ButtonSet.OK);
  }
}

function generateReminderMenu() {
  const ui = SpreadsheetApp.getUi();
  
  const idPrompt = ui.prompt('Generate Reminder', 'Enter Student ID (e.g. STU-XXXX):', ui.ButtonSet.OK_CANCEL);
  if (idPrompt.getSelectedButton() !== ui.Button.OK) return;
  const studentId = idPrompt.getResponseText().trim();
  if (!studentId) return;

  const typePrompt = ui.prompt('Generate Reminder', 'Enter Type (fee-due, trial-welcome, or custom):', ui.ButtonSet.OK_CANCEL);
  if (typePrompt.getSelectedButton() !== ui.Button.OK) return;
  const type = typePrompt.getResponseText().trim().toLowerCase();
  if (!type) return;

  let message = '';
  if (type === 'custom') {
    const msgPrompt = ui.prompt('Generate Reminder', 'Enter Custom Message:', ui.ButtonSet.OK_CANCEL);
    if (msgPrompt.getSelectedButton() !== ui.Button.OK) return;
    message = msgPrompt.getResponseText().trim();
  }

  try {
    const student = getStudentById_(studentId);
    if (!student) {
      ui.alert('Error', 'Student not found.', ui.ButtonSet.OK);
      return;
    }

    const studentRow = findRow_(SHEET_NAMES.students, function (row) {
      return String(row[0] || '') === studentId;
    });
    const parentName = studentRow ? String(studentRow.values[3] || 'Parent') : 'Parent';
    const parentPhone = studentRow ? String(studentRow.values[4] || '') : '';
    if (!parentPhone) {
      ui.alert('Error', 'Parent phone number not available.', ui.ButtonSet.OK);
      return;
    }

    if (type === 'fee-due') {
      const fee = getFee_(studentId);
      message = 'Hi ' + parentName + ', this is a reminder from Eduwave Academy. The fee of ' + fee.amount + ' for ' + fee.month + ' is currently due (Due Date: ' + fee.dueDate + '). Please submit the payment note in the student portal after UPI transfer. Thank you!';
    } else if (type === 'trial-welcome') {
      message = 'Hi ' + parentName + ', welcome to Eduwave Academy! We have received your trial class request for ' + student.name + '. We will contact you shortly to schedule the slot. Thank you!';
    } else if (!message) {
      message = 'Hi ' + parentName + ', this is an update from Eduwave Academy regarding ' + student.name + '.';
    }

    // Queue reminder
    getSheet_(SHEET_NAMES.reminders).appendRow([
      studentId,
      type,
      message,
      stamp_(new Date()),
      '',
      'queued'
    ]);

    const cleanPhone = parentPhone.replace(/[^0-9]/g, '');
    let waPhone = cleanPhone;
    if (waPhone.length === 10) waPhone = '91' + waPhone;
    const waLink = 'https://api.whatsapp.com/send?phone=' + waPhone + '&text=' + encodeURIComponent(message);

    // Display link in dialog
    const htmlOutput = HtmlService.createHtmlOutput(
      '<p>Reminder has been logged in the Reminders sheet!</p>' +
      '<p><b>Message:</b> ' + message + '</p>' +
      '<p><a href="' + waLink + '" target="_blank" style="padding: 10px 20px; background-color: #25D366; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Send on WhatsApp</a></p>'
    ).setWidth(400).setHeight(250);
    ui.showModalDialog(htmlOutput, 'WhatsApp Reminder Generated');

  } catch (e) {
    ui.alert('Error', 'Failed to generate reminder: ' + e.message, ui.ButtonSet.OK);
  }
}

/* --- API Backend Actions --- */

function seedHeaders_() {
  const headers = {
    Students: ['id', 'name', 'class_level', 'parent_name', 'parent_phone', 'parent_email', 'status'],
    Accounts: ['student_id', 'username', 'password_hash', 'session_token', 'last_login', 'device_hash', 'failed_attempts', 'lockout_until'],
    Trials: ['lead_id', 'child_name', 'student_class', 'parent_name', 'phone', 'email', 'subject_need', 'preferred_slot', 'notes', 'status', 'created_at'],
    Fees: ['student_id', 'month', 'amount', 'due_date', 'status', 'paid_date', 'reference', 'note', 'admin_state', 'updated_at'],
    Resources: ['resource_id', 'title', 'type', 'drive_file_id', 'subject', 'class_level', 'preview_mode'],
    Assignments: ['student_id', 'resource_id', 'visible_from', 'active'],
    Reminders: ['student_id', 'type', 'message', 'created_at', 'sent_at', 'status'],
    AccessLogs: ['student_id', 'username', 'login_at', 'device_hash', 'result', 'note']
  };

  Object.keys(headers).forEach(function (name) {
    const sheet = getOrCreateSheet_(name);
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(headers[name]);
    }
  });

  return { seeded: true };
}

function submitTrial_(payload) {
  const required = ['childName', 'studentClass', 'parentName', 'phone', 'email', 'subjectNeed', 'preferredSlot'];
  required.forEach(function (field) {
    if (!clean_(payload[field])) throw new Error('Missing field: ' + field);
  });

  getSheet_(SHEET_NAMES.trials).appendRow([
    'TRIAL-' + Utilities.getUuid().slice(0, 8).toUpperCase(),
    clean_(payload.childName),
    clean_(payload.studentClass),
    clean_(payload.parentName),
    clean_(payload.phone),
    clean_(payload.email),
    clean_(payload.subjectNeed),
    clean_(payload.preferredSlot),
    clean_(payload.notes),
    'pending',
    stamp_(new Date())
  ]);

  return { recorded: true };
}

function login_(payload) {
  const username = clean_(payload.username).toLowerCase();
  const password = clean_(payload.password);
  const deviceId = clean_(payload.deviceId) || 'unknown-device';
  if (!username || !password) throw new Error('Username and password are required.');

  const accountRow = findRow_(SHEET_NAMES.accounts, function (row) {
    return String(row[1] || '').toLowerCase() === username;
  });
  if (!accountRow) {
    appendAccessLog_(['', username, stamp_(new Date()), deviceId, 'failed', 'unknown-user']);
    throw new Error('Invalid login credentials.');
  }

  const failedAttempts = Number(accountRow.values[6] || 0);
  const lockoutUntil = accountRow.values[7];
  if (lockoutUntil && new Date(lockoutUntil).getTime() > Date.now()) {
    throw new Error('Too many failed attempts. Please try later.');
  }

  if (hashPassword_(password) !== String(accountRow.values[2] || '')) {
    updateAccountState_(accountRow.rowIndex, {
      sessionToken: accountRow.values[3] || '',
      lastLogin: accountRow.values[4] || '',
      deviceHash: accountRow.values[5] || '',
      failedAttempts: failedAttempts + 1,
      lockoutUntil: failedAttempts + 1 >= MAX_FAILED_ATTEMPTS ? stamp_(new Date(Date.now() + 60 * 60 * 1000)) : ''
    });
    appendAccessLog_(['', username, stamp_(new Date()), deviceId, 'failed', 'invalid-password']);
    throw new Error('Invalid login credentials.');
  }

  const student = getStudentById_(String(accountRow.values[0] || ''));
  if (!student || student.status !== 'active') throw new Error('Student account is inactive.');

  const token = Utilities.getUuid() + '-' + Date.now();
  updateAccountState_(accountRow.rowIndex, {
    sessionToken: token,
    lastLogin: stamp_(new Date()),
    deviceHash: deviceId,
    failedAttempts: 0,
    lockoutUntil: ''
  });

  appendAccessLog_([student.id, username, stamp_(new Date()), deviceId, 'success', accountRow.values[5] && accountRow.values[5] !== deviceId ? 'device-changed' : 'normal']);

  return {
    token: token,
    studentId: student.id,
    name: student.name,
    classLevel: student.classLevel,
    summary: buildSummary_(student.id),
    fee: getFee_(student.id),
    resources: getResources_(student.id)
  };
}

function logout_(payload) {
  const token = clean_(payload.token);
  if (!token) return { cleared: true };
  const row = findRow_(SHEET_NAMES.accounts, function (values) { return String(values[3] || '') === token; });
  if (row) {
    updateAccountState_(row.rowIndex, {
      sessionToken: '',
      lastLogin: row.values[4] || '',
      deviceHash: row.values[5] || '',
      failedAttempts: row.values[6] || 0,
      lockoutUntil: row.values[7] || ''
    });
  }
  return { cleared: true };
}

function submitPaymentNote_(payload) {
  const account = validateSession_(clean_(payload.token), clean_(payload.studentId));
  const reference = clean_(payload.reference);
  if (!reference) throw new Error('Payment reference is required.');
  const note = clean_(payload.note);
  const feesSheet = getSheet_(SHEET_NAMES.fees);
  const openFee = findRow_(SHEET_NAMES.fees, function (row) {
    return String(row[0] || '') === account.studentId && String(row[4] || '').toLowerCase() !== 'paid';
  });
  if (openFee) {
    feesSheet.getRange(openFee.rowIndex, 7, 1, 4).setValues([[reference, note, 'parent-submitted', stamp_(new Date())]]);
  } else {
    feesSheet.appendRow([account.studentId, month_(new Date()), '', '', 'pending-verification', '', reference, note, 'parent-submitted', stamp_(new Date())]);
  }
  getSheet_(SHEET_NAMES.reminders).appendRow([account.studentId, 'payment-note', 'Parent submitted payment reference ' + reference, stamp_(new Date()), '', 'open']);
  return { recorded: true };
}

function getDashboard_(payload) {
  const account = validateSession_(clean_(payload.token), clean_(payload.studentId));
  const student = getStudentById_(account.studentId);
  if (!student || student.status !== 'active') throw new Error('Student account is inactive.');

  return {
    token: clean_(payload.token),
    studentId: student.id,
    name: student.name,
    classLevel: student.classLevel,
    summary: buildSummary_(student.id),
    fee: getFee_(student.id),
    resources: getResources_(student.id)
  };
}

function getResourcePreview_(payload) {
  const account = validateSession_(clean_(payload.token), clean_(payload.studentId));
  const resourceId = clean_(payload.resourceId);
  if (!resourceId) throw new Error('Resource ID is required.');

  // Validate student is assigned to this resource
  const assignment = findRow_(SHEET_NAMES.assignments, function (row) {
    return String(row[0] || '') === account.studentId && String(row[1] || '') === resourceId && String(row[3] || '').toLowerCase() === 'true';
  });
  if (!assignment) throw new Error('Resource is not assigned to this student or is inactive.');

  // Get the resource details
  const resourceRow = findRow_(SHEET_NAMES.resources, function (row) {
    return String(row[0] || '') === resourceId;
  });
  if (!resourceRow) throw new Error('Resource details not found.');

  const driveFileId = String(resourceRow.values[3] || '');
  if (!driveFileId) throw new Error('Preview not available (missing Drive File ID).');

  return {
    resourceId: resourceId,
    title: String(resourceRow.values[1] || ''),
    type: String(resourceRow.values[2] || ''),
    previewUrl: 'https://drive.google.com/file/d/' + driveFileId + '/preview'
  };
}

function adminCreateStudent_(payload) {
  validateAdmin_(payload.adminKey);

  const name = clean_(payload.name);
  const classLevel = clean_(payload.classLevel);
  const parentName = clean_(payload.parentName);
  const parentPhone = clean_(payload.parentPhone);
  const parentEmail = clean_(payload.parentEmail);
  const username = clean_(payload.username).toLowerCase();
  const password = clean_(payload.password);

  if (!name || !classLevel || !parentName || !parentPhone || !parentEmail || !username || !password) {
    throw new Error('All student and account fields are required.');
  }

  // Check if username already exists
  const existing = findRow_(SHEET_NAMES.accounts, function (row) {
    return String(row[1] || '').toLowerCase() === username;
  });
  if (existing) throw new Error('Username already exists.');

  const studentId = 'STU-' + Utilities.getUuid().slice(0, 8).toUpperCase();

  // Add to Students tab
  getSheet_(SHEET_NAMES.students).appendRow([
    studentId,
    name,
    classLevel,
    parentName,
    parentPhone,
    parentEmail,
    'active'
  ]);

  // Add to Accounts tab
  getSheet_(SHEET_NAMES.accounts).appendRow([
    studentId,
    username,
    hashPassword_(password),
    '', // session_token
    '', // last_login
    '', // device_hash
    0,  // failed_attempts
    ''  // lockout_until
  ]);

  return { studentId: studentId, username: username, name: name };
}

function adminResetPassword_(payload) {
  validateAdmin_(payload.adminKey);

  const identifier = clean_(payload.studentId || payload.username).toLowerCase();
  const newPassword = clean_(payload.newPassword);
  if (!identifier || !newPassword) throw new Error('Student ID/Username and new password are required.');

  const accountRow = findRow_(SHEET_NAMES.accounts, function (row) {
    return String(row[0] || '').toLowerCase() === identifier || String(row[1] || '').toLowerCase() === identifier;
  });
  if (!accountRow) throw new Error('Student account not found.');

  // Update password hash and reset failed attempts/lockouts/session
  getSheet_(SHEET_NAMES.accounts).getRange(accountRow.rowIndex, 3, 1, 6).setValues([[
    hashPassword_(newPassword),
    '', // Clear session token
    '', // Clear last login
    '', // Clear device hash
    0,  // Reset failed attempts
    ''  // Reset lockout
  ]]);

  return { success: true, studentId: accountRow.values[0] };
}

function adminMarkFeePaid_(payload) {
  validateAdmin_(payload.adminKey);

  const studentId = clean_(payload.studentId);
  const month = clean_(payload.month);
  if (!studentId || !month) throw new Error('Student ID and month are required.');

  const feeRow = findRow_(SHEET_NAMES.fees, function (row) {
    return String(row[0] || '') === studentId && String(row[1] || '').toLowerCase() === month.toLowerCase();
  });

  const reference = clean_(payload.reference) || 'admin-marked';
  const note = clean_(payload.note) || 'Marked paid by admin';
  const nowStamp = stamp_(new Date());

  if (feeRow) {
    // Update existing row
    getSheet_(SHEET_NAMES.fees).getRange(feeRow.rowIndex, 5, 1, 6).setValues([[
      'paid',
      nowStamp.split('T')[0], // paid_date
      reference,
      note,
      'admin-verified',
      nowStamp
    ]]);
  } else {
    // Append new row
    getSheet_(SHEET_NAMES.fees).appendRow([
      studentId,
      month,
      clean_(payload.amount) || 'Not set',
      clean_(payload.dueDate) || 'Paid',
      'paid',
      nowStamp.split('T')[0],
      reference,
      note,
      'admin-verified',
      nowStamp
    ]);
  }

  return { success: true };
}

function adminGenerateReminder_(payload) {
  validateAdmin_(payload.adminKey);

  const studentId = clean_(payload.studentId);
  const type = clean_(payload.type) || 'custom';
  if (!studentId) throw new Error('Student ID is required.');

  const student = getStudentById_(studentId);
  if (!student) throw new Error('Student not found.');

  // Fetch full student row to get parent name and phone
  const studentRow = findRow_(SHEET_NAMES.students, function (row) {
    return String(row[0] || '') === studentId;
  });
  if (!studentRow) throw new Error('Student data mismatch.');

  const parentName = String(studentRow.values[3] || 'Parent');
  const parentPhone = String(studentRow.values[4] || '');
  if (!parentPhone) throw new Error('Parent phone number not available.');

  let message = '';
  if (type === 'fee-due') {
    const fee = getFee_(studentId);
    message = 'Hi ' + parentName + ', this is a reminder from Eduwave Academy. The fee of ' + fee.amount + ' for ' + fee.month + ' is currently due (Due Date: ' + fee.dueDate + '). Please submit the payment note in the student portal after UPI transfer. Thank you!';
  } else if (type === 'trial-welcome') {
    message = 'Hi ' + parentName + ', welcome to Eduwave Academy! We have received your trial class request for ' + student.name + '. We will contact you shortly to schedule the slot. Thank you!';
  } else {
    message = clean_(payload.message) || ('Hi ' + parentName + ', this is an update from Eduwave Academy regarding ' + student.name + '.');
  }

  // Record in reminders queue
  getSheet_(SHEET_NAMES.reminders).appendRow([
    studentId,
    type,
    message,
    stamp_(new Date()),
    '', // sent_at (admin will mark when sent)
    'queued'
  ]);

  // Generate WhatsApp link
  const cleanPhone = parentPhone.replace(/[^0-9]/g, '');
  let waPhone = cleanPhone;
  if (waPhone.length === 10) {
    waPhone = '91' + waPhone; // Default to India prefix if 10 digits
  }
  const waLink = 'https://api.whatsapp.com/send?phone=' + waPhone + '&text=' + encodeURIComponent(message);

  return {
    message: message,
    parentPhone: parentPhone,
    whatsappLink: waLink
  };
}

function validateSession_(token, studentId) {
  const row = findRow_(SHEET_NAMES.accounts, function (values) { return String(values[3] || '') === token; });
  if (!row) throw new Error('Session expired. Please log in again.');
  if (String(row.values[0] || '') !== studentId) throw new Error('Session does not match student.');
  const lastLogin = row.values[4] ? new Date(row.values[4]) : null;
  if (lastLogin && ((Date.now() - lastLogin.getTime()) / 60000) > SESSION_TTL_MINUTES) {
    throw new Error('Session expired. Please log in again.');
  }
  return { studentId: studentId };
}

function validateAdmin_(adminKey) {
  const cleanKey = clean_(adminKey);
  if (!cleanKey || cleanKey !== ADMIN_KEY) {
    throw new Error('Unauthorized: Invalid Admin Key.');
  }
}

function getStudentById_(studentId) {
  const row = findRow_(SHEET_NAMES.students, function (values) { return String(values[0] || '') === studentId; });
  if (!row) return null;
  return {
    id: String(row.values[0] || ''),
    name: String(row.values[1] || ''),
    classLevel: String(row.values[2] || ''),
    parentEmail: String(row.values[5] || ''),
    status: String(row.values[6] || '').toLowerCase()
  };
}

function getFee_(studentId) {
  const row = findRow_(SHEET_NAMES.fees, function (values) { return String(values[0] || '') === studentId && String(values[4] || '').toLowerCase() !== 'paid'; });
  if (!row) {
    return { month: month_(new Date()), amount: 'Not set', dueDate: 'To be updated', status: 'No fee record yet', note: 'Admin can add the fee record in the Fees sheet.' };
  }
  return {
    month: row.values[1] || month_(new Date()),
    amount: row.values[2] || 'Not set',
    dueDate: row.values[3] || 'To be updated',
    status: row.values[4] || 'pending',
    note: row.values[7] || 'Submit payment note after UPI transfer.'
  };
}

function getResources_(studentId) {
  const resourceMap = {};
  getRows_(SHEET_NAMES.resources).forEach(function (row) {
    resourceMap[row[0]] = { resourceId: row[0], title: row[1], type: row[2], subject: row[4], description: 'Resource served through portal preview mode.' };
  });
  return getRows_(SHEET_NAMES.assignments)
    .filter(function (row) { return String(row[0] || '') === studentId && String(row[3] || '').toLowerCase() === 'true'; })
    .map(function (row) { return resourceMap[row[1]]; })
    .filter(Boolean);
}

function buildSummary_(studentId) {
  return getResources_(studentId).length + ' assigned resources, fee status ' + getFee_(studentId).status + ', single-session login protection active.';
}

function updateAccountState_(rowIndex, state) {
  getSheet_(SHEET_NAMES.accounts).getRange(rowIndex, 4, 1, 5).setValues([[state.sessionToken || '', state.lastLogin || '', state.deviceHash || '', state.failedAttempts || 0, state.lockoutUntil || '']]);
}

function appendAccessLog_(values) { getSheet_(SHEET_NAMES.accessLogs).appendRow(values); }
function getRows_(name) { const sheet = getSheet_(name); if (sheet.getLastRow() < 2) return []; return sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues(); }
function findRow_(name, predicate) { const rows = getRows_(name); for (var i = 0; i < rows.length; i += 1) { if (predicate(rows[i])) return { rowIndex: i + 2, values: rows[i] }; } return null; }
function getSheet_(name) { const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name); if (!sheet) throw new Error('Missing sheet: ' + name); return sheet; }
function getOrCreateSheet_(name) { const ss = SpreadsheetApp.getActiveSpreadsheet(); return ss.getSheetByName(name) || ss.insertSheet(name); }
function clean_(value) { return String(value || '').trim(); }
function stamp_(value) { return Utilities.formatDate(new Date(value), SCRIPT_TZ, "yyyy-MM-dd'T'HH:mm:ss"); }
function month_(value) { return Utilities.formatDate(new Date(value), SCRIPT_TZ, 'MMMM yyyy'); }
function jsonResponse_(ok, message, data) { return ContentService.createTextOutput(JSON.stringify({ ok: ok, message: message, data: data || null })).setMimeType(ContentService.MimeType.JSON); }
function hashPassword_(plainPassword) {
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, plainPassword, Utilities.Charset.UTF_8);
  return digest.map(function (byte) { const value = (byte < 0 ? byte + 256 : byte).toString(16); return value.length === 1 ? '0' + value : value; }).join('');
}

