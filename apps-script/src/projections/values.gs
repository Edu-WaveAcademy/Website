// Pure normalization and record projections. No Apps Script services.

function clean_(v) {
  return String(v === undefined || v === null ? '' : v).trim();
}

function email_(v) {
  return clean_(v).toLowerCase();
}

function validEmail_(v) {
  var e = email_(v);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : '';
}

function phone_(v) {
  var p = clean_(v).replace(/\D/g, '');
  if (p.length === 12 && p.slice(0, 2) === '91') p = p.slice(2);
  return /^[6-9]\d{9}$/.test(p) ? p : '';
}

function newest_(a, b) {
  return String(b.updated_at || b.created_at || '').localeCompare(
    String(a.updated_at || a.created_at || '')
  );
}

function merge_(a, b) {
  Object.keys(b).forEach(function (k) {
    a[k] = b[k];
  });
  return a;
}

function parentView_(r) {
  return {
    parent_id: r.parent_id,
    name: r.name,
    email: r.email,
    phone: r.phone,
    status: r.status,
    email_verified: !!r.email_verified_at
  };
}

function submissionView_(r) {
  var answers = [];
  try {
    answers = JSON.parse(r.responses_json || '[]');
  } catch (_) {}
  return {
    submission_id: r.submission_id,
    assignment_id: r.assignment_id,
    student_id: r.student_id,
    resource_id: r.resource_id,
    answers: answers,
    student_note: r.student_note,
    status: r.status,
    submitted_at: r.submitted_at,
    updated_at: r.updated_at,
    reviewed_at: r.reviewed_at,
    feedback: r.feedback,
    has_attachment: !!r.attachment_drive_id,
    attachment_name: r.attachment_name,
    attachment_mime: r.attachment_mime,
    attachment_size: Number(r.attachment_size) || 0
  };
}

function validSubmissionType_(value, kind) {
  var v = clean_(value).toLowerCase();
  return ['online_answers', 'file_upload', 'view_only'].indexOf(v) !== -1
    ? v
    : clean_(kind).toLowerCase() === 'worksheet'
      ? 'online_answers'
      : 'file_upload';
}

function submissionType_(resource) {
  return validSubmissionType_(resource.submission_type, resource.kind);
}

function mimeForName_(name) {
  var ext =
      (clean_(name)
        .toLowerCase()
        .match(/\.([a-z0-9]+)$/) || [])[1] || '',
    map = {
      pdf: 'application/pdf',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ppt: 'application/vnd.ms-powerpoint',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      rtf: 'application/rtf',
      txt: 'text/plain'
    };
  return map[ext] || '';
}

function safeFileName_(name) {
  var safe = clean_(name)
    .replace(/[\\/:*?\"<>|\u0000-\u001F]/g, '_')
    .replace(/\s+/g, ' ')
    .slice(0, 160);
  return safe || 'upload';
}

function fileKind_(mime, name) {
  if (mime === 'application/pdf') return 'pdf';
  if (/^image\//.test(mime)) return 'image';
  if (
    /\.(docx?|xlsx?|pptx?|rtf)$/i.test(name) ||
    /msword|officedocument|ms-excel|ms-powerpoint|rtf/.test(mime)
  )
    return 'office';
  return 'file';
}

function recordValues_(headers, record) {
  return headers.map(function (key) {
    return record[key] === undefined ? '' : record[key];
  });
}

function safeEqual_(a, b) {
  a = clean_(a);
  b = clean_(b);
  if (a.length !== b.length) return false;
  var diff = 0;
  for (var i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
