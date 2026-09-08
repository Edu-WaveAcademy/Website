// Learning updates, assignment authorization, submissions and worksheet delivery.

function parentResource_(p) {
  var parent = parentFromSession_(p.sessionId),
    studentId = clean_(p.studentId);
  requireLinkedStudent_(parent.parent_id, studentId);
  var asn = first_(PORTAL.assignments, function (r) {
    return (
      r.student_id === studentId &&
      r.resource_id === clean_(p.resourceId) &&
      clean_(r.status).toLowerCase() === 'published'
    );
  });
  if (!asn) throw new Error('This resource is not assigned to this child.');
  var resource = first_(PORTAL.resources, function (r) {
    return (
      r.resource_id === asn.resource_id &&
      clean_(r.status).toLowerCase() === 'published'
    );
  });
  if (!resource) throw new Error('This resource is not available.');
  audit_(
    'parent',
    parent.parent_id,
    'resource_open',
    'resource',
    resource.resource_id,
    studentId
  );
  if (clean_(resource.kind).toLowerCase() === 'worksheet')
    return renderPortalWorksheet_(resource, parent, studentId, asn);
  var item = first_(PORTAL.driveIndex, function (r) {
    return (
      r.drive_id === resource.drive_id &&
      clean_(r.sync_run_id).toLowerCase() === 'upload'
    );
  });
  if (!item || clean_(item.safe_candidate).toLowerCase() !== 'true')
    throw new Error('This uploaded material is no longer available.');
  return renderStoredFile_(item, resource, parent, studentId, asn);
}

function parentSubmitAssignment_(p) {
  var parent = parentFromSession_(p.sessionId),
    studentId = clean_(p.studentId),
    assignmentId = clean_(p.assignmentId);
  requireLinkedStudent_(parent.parent_id, studentId);
  var asn = first_(PORTAL.assignments, function (r) {
    return (
      r.assignment_id === assignmentId &&
      r.student_id === studentId &&
      clean_(r.status).toLowerCase() === 'published'
    );
  });
  if (!asn) throw new Error('This assignment is not available.');
  var resource = first_(PORTAL.resources, function (r) {
    return (
      r.resource_id === asn.resource_id &&
      clean_(r.status).toLowerCase() === 'published'
    );
  });
  if (!resource) throw new Error('This resource is not available.');
  var type = submissionType_(resource),
    old = first_(PORTAL.submissions, function (r) {
      return r.assignment_id === assignmentId && r.student_id === studentId;
    });
  if (type === 'view_only')
    throw new Error('This material does not require a submission.');
  if (old && clean_(old.status).toLowerCase() === 'reviewed')
    throw new Error('This assignment has been reviewed and is now locked.');
  var answers = Array.isArray(p.answers) ? p.answers : [],
    safeAnswers = answers
      .slice(0, 100)
      .map(function (a) {
        return {
          row: Math.max(1, Number(a.row) || 1),
          question: clean_(a.question).slice(0, 500),
          answer: clean_(a.answer).slice(0, 2000)
        };
      })
      .filter(function (a) {
        return a.answer;
      });
  var note = clean_(p.note).slice(0, 3000),
    uploaded = null;
  if (p.attachment)
    uploaded = savePortalUpload_(
      p.attachment,
      STUDENT_UPLOAD_MIMES,
      'submission_upload_folder_id',
      'Student Submissions',
      studentId + '_' + assignmentId + '_'
    );
  if (type === 'file_upload' && !uploaded && !(old && old.attachment_drive_id))
    throw new Error('Attach a PDF, JPG, or PNG scan before submitting.');
  if (type === 'online_answers' && !safeAnswers.length && !note)
    throw new Error('Add at least one answer or a note before submitting.');
  var now = stamp_(),
    v = {
      assignment_id: assignmentId,
      student_id: studentId,
      resource_id: asn.resource_id,
      responses_json: JSON.stringify(safeAnswers),
      student_note: note,
      status: 'submitted',
      submitted_at: now,
      updated_at: now,
      reviewed_at: '',
      feedback: ''
    };
  if (uploaded) {
    v.attachment_drive_id = uploaded.file.getId();
    v.attachment_name = uploaded.name;
    v.attachment_mime = uploaded.mime;
    v.attachment_size = String(uploaded.size);
  }
  if (old) update_(PORTAL.submissions, old._row, v);
  else {
    v.submission_id = id_('SUB');
    append_(PORTAL.submissions, v);
  }
  if (
    uploaded &&
    old &&
    old.attachment_drive_id &&
    old.attachment_drive_id !== uploaded.file.getId()
  )
    trashFile_(old.attachment_drive_id);
  audit_(
    'parent',
    parent.parent_id,
    'assignment_submitted',
    'assignment',
    assignmentId,
    studentId + (uploaded ? ' | file uploaded' : '')
  );
  return {
    submitted: true,
    status: 'submitted',
    submittedAt: now,
    hasAttachment: !!(uploaded || (old && old.attachment_drive_id))
  };
}

function adminCreateAnnouncement_(p) {
  var admin = requireAdmin_(p.sessionId);
  if (!clean_(p.title) || !clean_(p.message))
    throw new Error('Announcement title and message are required.');
  var a = {
    announcement_id: id_('ANN'),
    audience: clean_(p.audience) || 'all',
    student_id: clean_(p.studentId),
    title: clean_(p.title),
    message: clean_(p.message),
    type: clean_(p.type) || 'notice',
    active_from: clean_(p.activeFrom) || date_(),
    active_until: clean_(p.activeUntil),
    created_at: stamp_()
  };
  append_(PORTAL.announcements, a);
  audit_(
    'admin',
    admin.email,
    'announcement_created',
    'announcement',
    a.announcement_id,
    a.title
  );
  return a;
}

function adminRecordAttendance_(p) {
  var admin = requireAdmin_(p.sessionId);
  if (!clean_(p.studentId) || !clean_(p.sessionDate) || !clean_(p.subject))
    throw new Error('Child, date, and subject are required.');
  var old = first_(PORTAL.attendance, function (r) {
      return (
        r.student_id === clean_(p.studentId) &&
        r.session_date === clean_(p.sessionDate) &&
        r.subject === clean_(p.subject)
      );
    }),
    v = {
      student_id: clean_(p.studentId),
      session_date: clean_(p.sessionDate),
      subject: clean_(p.subject),
      status: clean_(p.status) || 'present',
      note: clean_(p.note),
      updated_at: stamp_()
    };
  if (old) update_(PORTAL.attendance, old._row, v);
  else {
    v.attendance_id = id_('ATT');
    append_(PORTAL.attendance, v);
  }
  audit_(
    'admin',
    admin.email,
    'attendance_saved',
    'student',
    clean_(p.studentId),
    clean_(p.status)
  );
  return { saved: true };
}

function adminRecordProgress_(p) {
  var admin = requireAdmin_(p.sessionId);
  if (!clean_(p.studentId) || !clean_(p.subject) || !clean_(p.topic))
    throw new Error('Child, subject, and topic are required.');
  var v = {
    progress_id: id_('PROG'),
    student_id: clean_(p.studentId),
    subject: clean_(p.subject),
    topic: clean_(p.topic),
    score: clean_(p.score),
    teacher_note: clean_(p.note),
    updated_at: stamp_()
  };
  append_(PORTAL.progress, v);
  audit_(
    'admin',
    admin.email,
    'progress_saved',
    'student',
    v.student_id,
    v.topic
  );
  return v;
}

function adminReviewSubmission_(p) {
  var admin = requireAdmin_(p.sessionId),
    submission = first_(PORTAL.submissions, function (r) {
      return r.submission_id === clean_(p.submissionId);
    }),
    status = clean_(p.status).toLowerCase();
  if (!submission) throw new Error('Submission not found.');
  if (['reviewed', 'needs_changes'].indexOf(status) === -1)
    throw new Error('Choose reviewed or needs changes.');
  update_(PORTAL.submissions, submission._row, {
    status: status,
    feedback: clean_(p.feedback).slice(0, 3000),
    reviewed_at: stamp_(),
    updated_at: stamp_()
  });
  audit_(
    'admin',
    admin.email,
    'assignment_' + status,
    'submission',
    submission.submission_id,
    submission.student_id
  );
  return { reviewed: true, status: status };
}

function adminSubmissionFile_(p) {
  var admin = requireAdmin_(p.sessionId),
    submission = first_(PORTAL.submissions, function (r) {
      return r.submission_id === clean_(p.submissionId);
    });
  if (!submission || !submission.attachment_drive_id)
    throw new Error('This submission has no uploaded file.');
  var file = DriveApp.getFileById(submission.attachment_drive_id);
  if (file.getSize() > MAX_BINARY_BYTES)
    throw new Error('This submitted file is too large to preview.');
  var blob = file.getBlob(),
    mime = blob.getContentType(),
    kind =
      mime === 'application/pdf'
        ? 'pdf'
        : /^image\//.test(mime)
          ? 'image'
          : 'download';
  audit_(
    'admin',
    admin.email,
    'submission_file_opened',
    'submission',
    submission.submission_id,
    submission.student_id
  );
  return {
    kind: kind,
    title: submission.attachment_name || file.getName(),
    mimeType: mime,
    data_url:
      'data:' + mime + ';base64,' + Utilities.base64Encode(blob.getBytes())
  };
}

function adminUploadResource_(p) {
  var admin = requireAdmin_(p.sessionId),
    title = clean_(p.title);
  if (!title) throw new Error('Add a title for this material.');
  var uploaded = savePortalUpload_(
    p.file,
    ACADEMY_UPLOAD_MIMES,
    'resource_upload_folder_id',
    'Resources',
    ''
  );
  var file = uploaded.file,
    kind = fileKind_(uploaded.mime, uploaded.name),
    owner = '';
  try {
    owner = file.getOwner() ? file.getOwner().getEmail() : admin.email;
  } catch (_) {
    owner = admin.email;
  }
  var resource = {
    resource_id: id_('RES'),
    drive_id: file.getId(),
    title: title,
    subject: clean_(p.subject),
    class_level: clean_(p.classLevel),
    kind: kind,
    status: 'published',
    created_at: stamp_(),
    updated_at: stamp_(),
    submission_type: validSubmissionType_(p.submissionType, kind),
    library_path: 'Eduwave Portal Uploads / Resources',
    source: 'portal_upload',
    auto_added: 'false'
  };
  append_(PORTAL.resources, resource);
  append_(PORTAL.driveIndex, {
    drive_id: file.getId(),
    parent_drive_id:
      file.getParents && file.getParents().hasNext()
        ? file.getParents().next().getId()
        : '',
    path: resource.library_path,
    name: uploaded.name,
    mime_type: uploaded.mime,
    kind: kind,
    owner_email: owner,
    ownership: 'academy',
    size_bytes: String(uploaded.size),
    modified_at: stamp_(),
    indexed_at: stamp_(),
    safe_candidate: 'true',
    skip_reason: '',
    resource_id: resource.resource_id,
    last_seen_at: stamp_(),
    sync_run_id: 'upload'
  });
  audit_(
    'admin',
    admin.email,
    'resource_uploaded',
    'resource',
    resource.resource_id,
    resource.title + ' | ' + uploaded.name
  );
  return resource;
}

function adminAssignResource_(p) {
  var admin = requireAdmin_(p.sessionId),
    student = first_(PORTAL.students, function (x) {
      return (
        x.student_id === clean_(p.studentId) &&
        clean_(x.enrollment_status).toLowerCase() === 'active'
      );
    });
  if (!student || !clean_(p.resourceId))
    throw new Error('Choose a currently enrolled child and a resource.');
  var r = first_(PORTAL.resources, function (x) {
    return (
      x.resource_id === clean_(p.resourceId) && clean_(x.status) === 'published'
    );
  });
  if (!r) throw new Error('Published resource not found.');
  var old = first_(PORTAL.assignments, function (x) {
      return (
        x.student_id === student.student_id &&
        x.resource_id === r.resource_id &&
        clean_(x.status).toLowerCase() === 'published'
      );
    }),
    v = {
      student_id: student.student_id,
      resource_id: r.resource_id,
      title_override: clean_(p.titleOverride),
      visible_from: clean_(p.visibleFrom) || date_(),
      due_date: clean_(p.dueDate),
      status: 'published',
      created_at: stamp_()
    };
  if (old) update_(PORTAL.assignments, old._row, v);
  else {
    v.assignment_id = id_('ASN');
    append_(PORTAL.assignments, v);
  }
  audit_(
    'admin',
    admin.email,
    'resource_assigned',
    'resource',
    r.resource_id,
    student.student_id
  );
  return {
    assigned: true,
    assignmentId: old ? old.assignment_id : v.assignment_id
  };
}

function adminRevokeAssignment_(p) {
  var admin = requireAdmin_(p.sessionId),
    assignment = first_(PORTAL.assignments, function (r) {
      return r.assignment_id === clean_(p.assignmentId);
    });
  if (!assignment) throw new Error('Assignment not found.');
  if (clean_(assignment.status).toLowerCase() !== 'revoked')
    update_(PORTAL.assignments, assignment._row, { status: 'revoked' });
  audit_(
    'admin',
    admin.email,
    'assignment_revoked',
    'assignment',
    assignment.assignment_id,
    assignment.student_id
  );
  return { revoked: true };
}

function renderPortalWorksheet_(resource, parent, studentId, assignment) {
  var rows = rows_(PORTAL.worksheetRows)
      .filter(function (r) {
        return r.resource_id === resource.resource_id;
      })
      .sort(function (a, b) {
        return Number(a.row_no) - Number(b.row_no);
      }),
    submission = first_(PORTAL.submissions, function (r) {
      return (
        r.assignment_id === assignment.assignment_id &&
        r.student_id === studentId
      );
    }),
    values = [['No.', 'Question', 'Hint']];
  rows.forEach(function (r) {
    values.push([r.row_no, r.question, r.hint]);
  });
  if (values.length === 1)
    throw new Error('This worksheet does not have any questions yet.');
  return {
    kind: 'table',
    title: resource.title,
    values: values,
    watermark:
      parent.name +
      ' | ' +
      stamp_().replace('T', ' ').slice(0, 16) +
      ' | ' +
      studentId.slice(-4),
    assignmentId: assignment.assignment_id,
    dueDate: assignment.due_date,
    submissionType: submissionType_(resource),
    submission: submission ? submissionView_(submission) : null
  };
}
