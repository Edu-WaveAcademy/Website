// Trial intake, parent signup and academy family lifecycle.

function submitTrial_(p) {
  [
    'childName',
    'classLevel',
    'parentName',
    'phone',
    'email',
    'subjects',
    'preferredSlot'
  ].forEach(function (k) {
    if (!clean_(p[k]))
      throw new Error('Please complete all required trial fields.');
  });
  var now = stamp_();
  append_(PORTAL.trials, {
    trial_id: id_('TRIAL'),
    child_name: clean_(p.childName),
    class_level: clean_(p.classLevel),
    parent_name: clean_(p.parentName),
    phone: clean_(p.phone),
    email: email_(p.email),
    subjects: clean_(p.subjects),
    preferred_slot: clean_(p.preferredSlot),
    notes: clean_(p.notes),
    status: 'pending',
    created_at: now,
    updated_at: now
  });
  audit_(
    'public',
    email_(p.email),
    'trial_requested',
    'trial',
    '',
    clean_(p.childName)
  );
  return { recorded: true };
}

function signupParent_(p) {
  if (clean_(p.website)) return { recorded: true };
  var name = clean_(p.name),
    email = validEmail_(p.email),
    phone = phone_(p.phone);
  if (!name || !email || !phone)
    throw new Error(
      'Enter the parent name, a valid email address, and a 10-digit mobile number.'
    );
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var old = first_(PORTAL.parents, function (r) {
      return email_(r.email) === email;
    });
    if (!old)
      append_(PORTAL.parents, {
        parent_id: id_('PAR'),
        name: name,
        email: email,
        phone: phone,
        status: 'pending',
        created_at: stamp_(),
        updated_at: stamp_(),
        email_verified_at: ''
      });
    else if (clean_(old.status).toLowerCase() === 'pending')
      update_(PORTAL.parents, old._row, {
        name: name,
        phone: phone,
        updated_at: stamp_()
      });
  } finally {
    lock.releaseLock();
  }
  audit_('public', email, 'parent_signup_requested', 'parent', '', name);
  return { recorded: true };
}

function adminCreateFamily_(p) {
  var admin = requireAdmin_(p.sessionId),
    email = validEmail_(p.email),
    phone = phone_(p.phone);
  if (!email || !clean_(p.name) || !phone)
    throw new Error(
      'Parent name, a valid email address, and a 10-digit mobile number are required.'
    );
  if (
    first_(PORTAL.parents, function (r) {
      return email_(r.email) === email;
    })
  )
    throw new Error('That parent email address already exists.');
  var parent = {
    parent_id: id_('PAR'),
    name: clean_(p.name),
    email: email,
    phone: phone,
    status: 'active',
    created_at: stamp_(),
    updated_at: stamp_(),
    email_verified_at: ''
  };
  append_(PORTAL.parents, parent);
  audit_(
    'admin',
    admin.email,
    'parent_created',
    'parent',
    parent.parent_id,
    email
  );
  return parentView_(parent);
}

function adminSetParentStatus_(p) {
  var admin = requireAdmin_(p.sessionId),
    parent = first_(PORTAL.parents, function (r) {
      return r.parent_id === clean_(p.parentId);
    }),
    status = clean_(p.status).toLowerCase();
  if (!parent) throw new Error('Parent account not found.');
  if (['active', 'denied', 'left'].indexOf(status) === -1)
    throw new Error('Choose active, denied, or left.');
  update_(PORTAL.parents, parent._row, {
    status: status,
    updated_at: stamp_()
  });
  var students = rows_(PORTAL.students),
    activeStudents = {};
  students
    .filter(function (r) {
      return clean_(r.enrollment_status).toLowerCase() === 'active';
    })
    .forEach(function (r) {
      activeStudents[r.student_id] = true;
    });
  rows_(PORTAL.links)
    .filter(function (r) {
      return r.parent_id === parent.parent_id;
    })
    .forEach(function (link) {
      update_(PORTAL.links, link._row, {
        active:
          status === 'active' && activeStudents[link.student_id]
            ? 'true'
            : 'false'
      });
    });
  if (status !== 'active')
    rows_(PORTAL.sessions)
      .filter(function (r) {
        return r.parent_id === parent.parent_id && !r.revoked_at;
      })
      .forEach(function (r) {
        update_(PORTAL.sessions, r._row, {
          revoked_at: stamp_(),
          revoke_reason: 'account_' + status
        });
      });
  audit_(
    'admin',
    admin.email,
    'parent_' + status,
    'parent',
    parent.parent_id,
    parent.email
  );
  return { updated: true, status: status };
}

function adminCreateStudent_(p) {
  var admin = requireAdmin_(p.sessionId),
    parent = first_(PORTAL.parents, function (r) {
      return (
        r.parent_id === clean_(p.parentId) &&
        clean_(r.status).toLowerCase() === 'active'
      );
    });
  if (!parent || !clean_(p.name) || !clean_(p.classLevel))
    throw new Error(
      'Choose an approved parent and complete the child name and class.'
    );
  var student = {
    student_id: id_('STU'),
    name: clean_(p.name),
    class_level: clean_(p.classLevel),
    enrollment_status: 'active',
    monthly_fee: clean_(p.monthlyFee),
    due_day: clean_(p.dueDay) || '10',
    created_at: stamp_(),
    updated_at: stamp_()
  };
  append_(PORTAL.students, student);
  append_(PORTAL.links, {
    link_id: id_('LINK'),
    parent_id: parent.parent_id,
    student_id: student.student_id,
    relationship: clean_(p.relationship) || 'Parent',
    active: 'true',
    created_at: stamp_()
  });
  audit_(
    'admin',
    admin.email,
    'student_created',
    'student',
    student.student_id,
    parent.parent_id
  );
  return student;
}

function adminSetStudentStatus_(p) {
  var admin = requireAdmin_(p.sessionId),
    student = first_(PORTAL.students, function (r) {
      return r.student_id === clean_(p.studentId);
    }),
    status = clean_(p.status).toLowerCase();
  if (!student) throw new Error('Student not found.');
  if (['active', 'left'].indexOf(status) === -1)
    throw new Error('Choose active or left.');
  update_(PORTAL.students, student._row, {
    enrollment_status: status,
    updated_at: stamp_()
  });
  var parents = rows_(PORTAL.parents),
    activeParents = {};
  parents
    .filter(function (r) {
      return clean_(r.status).toLowerCase() === 'active';
    })
    .forEach(function (r) {
      activeParents[r.parent_id] = true;
    });
  var links = rows_(PORTAL.links).filter(function (r) {
      return r.student_id === student.student_id;
    }),
    revoked = 0;
  links.forEach(function (link) {
    update_(PORTAL.links, link._row, {
      active:
        status === 'active' && activeParents[link.parent_id] ? 'true' : 'false'
    });
  });
  if (status === 'left')
    rows_(PORTAL.assignments)
      .filter(function (r) {
        return (
          r.student_id === student.student_id &&
          clean_(r.status).toLowerCase() === 'published'
        );
      })
      .forEach(function (assignment) {
        update_(PORTAL.assignments, assignment._row, { status: 'revoked' });
        revoked += 1;
      });
  audit_(
    'admin',
    admin.email,
    status === 'active' ? 'student_restored' : 'student_departed',
    'student',
    student.student_id,
    String(revoked)
  );
  return { updated: true, status: status, revokedAssignments: revoked };
}

function adminApproveTrial_(p) {
  var admin = requireAdmin_(p.sessionId),
    trial = first_(PORTAL.trials, function (r) {
      return r.trial_id === clean_(p.trialId);
    });
  if (!trial) throw new Error('Trial request not found.');
  update_(PORTAL.trials, trial._row, {
    status: clean_(p.status) || 'approved',
    updated_at: stamp_()
  });
  audit_(
    'admin',
    admin.email,
    'trial_updated',
    'trial',
    trial.trial_id,
    clean_(p.status) || 'approved'
  );
  return { updated: true };
}
