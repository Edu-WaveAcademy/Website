// Private Drive upload storage and protected binary delivery.

function parseUpload_(payload, allowed) {
  if (!payload || typeof payload !== 'object')
    throw new Error('Choose a file to upload.');
  var name = safeFileName_(payload.name),
    mime = clean_(payload.mimeType).toLowerCase() || mimeForName_(name),
    data = clean_(payload.data).replace(/^data:[^;]+;base64,/, '');
  if (allowed.indexOf(mime) === -1)
    throw new Error('That file type is not supported.');
  if (!data) throw new Error('The selected file is empty.');
  var bytes;
  try {
    bytes = Utilities.base64Decode(data);
  } catch (_) {
    throw new Error('The selected file could not be read.');
  }
  if (!bytes.length) throw new Error('The selected file is empty.');
  if (bytes.length > MAX_UPLOAD_BYTES)
    throw new Error('Choose a file smaller than 8 MB.');
  return { name: name, mime: mime, bytes: bytes, size: bytes.length };
}

function portalUploadRoot_() {
  var id = getConfig_('portal_upload_root_id'),
    folder = null;
  if (id) {
    try {
      folder = DriveApp.getFolderById(id);
    } catch (_) {
      folder = null;
    }
  }
  if (!folder) {
    folder = DriveApp.createFolder('Eduwave Portal Uploads');
    setConfig_('portal_upload_root_id', folder.getId());
  }
  return folder;
}

function portalUploadFolder_(key, name) {
  var id = getConfig_(key),
    folder = null;
  if (id) {
    try {
      folder = DriveApp.getFolderById(id);
    } catch (_) {
      folder = null;
    }
  }
  if (!folder) {
    folder = portalUploadRoot_().createFolder(name);
    setConfig_(key, folder.getId());
  }
  return folder;
}

function savePortalUpload_(payload, allowed, folderKey, folderName, prefix) {
  var parsed = parseUpload_(payload, allowed),
    name = safeFileName_((prefix || '') + parsed.name),
    blob = Utilities.newBlob(parsed.bytes, parsed.mime, name),
    file = portalUploadFolder_(folderKey, folderName).createFile(blob);
  return { file: file, name: name, mime: parsed.mime, size: parsed.size };
}

function trashFile_(id) {
  try {
    DriveApp.getFileById(id).setTrashed(true);
  } catch (_) {}
}

function renderStoredFile_(item, resource, parent, studentId, assignment) {
  var file = DriveApp.getFileById(item.drive_id),
    watermark =
      parent.name +
      ' | ' +
      stamp_().replace('T', ' ').slice(0, 16) +
      ' | ' +
      studentId.slice(-4),
    submission = first_(PORTAL.submissions, function (r) {
      return (
        r.assignment_id === assignment.assignment_id &&
        r.student_id === studentId
      );
    }),
    meta = {
      assignmentId: assignment.assignment_id,
      dueDate: assignment.due_date,
      submissionType: submissionType_(resource),
      submission: submission ? submissionView_(submission) : null
    };
  if (Number(item.size_bytes) > MAX_BINARY_BYTES)
    return merge_(meta, {
      kind: 'notice',
      title: resource.title,
      message:
        'This file is too large for secure delivery. Upload a file under 10 MB.'
    });
  var blob = file.getBlob(),
    mime =
      blob.getContentType() || item.mime_type || 'application/octet-stream';
  if (item.kind === 'pdf' || item.kind === 'image')
    return merge_(meta, {
      kind: item.kind,
      title: resource.title,
      data_url:
        'data:' + mime + ';base64,' + Utilities.base64Encode(blob.getBytes()),
      watermark: watermark
    });
  return merge_(meta, {
    kind: 'download',
    title: resource.title,
    file_name: item.name || file.getName(),
    mimeType: mime,
    data_url:
      'data:' + mime + ';base64,' + Utilities.base64Encode(blob.getBytes()),
    message:
      'This file opens in Word, Excel, PowerPoint, or another compatible app.'
  });
}
