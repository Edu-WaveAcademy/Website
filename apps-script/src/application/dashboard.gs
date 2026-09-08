// Request-scoped dashboard reads and compatibility entry points. No cross-request data cache.

// Dashboard snapshots live only for one read operation. Never cache authorization
// or these records across requests: revocation must be checked against Sheets.
function dashboardData_() {
  var data = {};
  [
    'links',
    'students',
    'assignments',
    'resources',
    'submissions',
    'fees',
    'attendance',
    'progress',
    'announcements'
  ].forEach(function (key) {
    data[key] = rows_(PORTAL[key]);
  });
  data.resourcesById = firstIndex_(data.resources, 'resource_id');
  data.assignmentsByStudent = groupIndex_(data.assignments, 'student_id');
  data.submissionsByAssignment = groupIndex_(data.submissions, 'assignment_id');
  data.feesByStudent = groupIndex_(data.fees, 'student_id');
  data.attendanceByStudent = groupIndex_(data.attendance, 'student_id');
  data.progressByStudent = groupIndex_(data.progress, 'student_id');
  return data;
}

function dashboardForParent_(parent) {
  var data = dashboardData_(),
    students = childViews_(parent.parent_id, data);
  return {
    children: students,
    notifications: notifications_(
      students.map(function (s) {
        return s.student_id;
      }),
      data
    ),
    upiId: getConfig_('upi_id'),
    academyName: getConfig_('academy_name') || 'Eduwave Academy'
  };
}

function parentDashboard_(p) {
  var parent = parentFromSession_(p.sessionId);
  return {
    parent: parentView_(parent),
    dashboard: dashboardForParent_(parent)
  };
}

function adminDashboard_(p) {
  return adminData_(requireAdmin_(p.sessionId));
}

function adminData_(admin) {
  var fees = rows_(PORTAL.fees),
    trials = rows_(PORTAL.trials),
    parents = rows_(PORTAL.parents),
    students = rows_(PORTAL.students),
    directory = adminFamilyDirectory_(parents, students, rows_(PORTAL.links)),
    submissions = rows_(PORTAL.submissions).map(submissionView_).sort(newest_);
  return {
    admin: admin,
    metrics: {
      parents: parents.filter(function (x) {
        return clean_(x.status).toLowerCase() === 'active';
      }).length,
      pendingParents: parents.filter(function (x) {
        return clean_(x.status).toLowerCase() === 'pending';
      }).length,
      students: students.filter(function (x) {
        return clean_(x.enrollment_status).toLowerCase() === 'active';
      }).length,
      pendingTrials: trials.filter(function (x) {
        return clean_(x.status).toLowerCase() === 'pending';
      }).length,
      openFees: fees.filter(function (x) {
        return clean_(x.status).toLowerCase() !== 'paid';
      }).length
    },
    parents: parents.map(parentView_),
    students: students,
    families: directory.families,
    unlinkedStudents: directory.unlinkedStudents,
    trials: trials.sort(newest_),
    fees: fees.sort(newest_),
    resources: rows_(PORTAL.resources).sort(newest_),
    assignments: rows_(PORTAL.assignments).sort(newest_),
    submissions: submissions,
    announcements: rows_(PORTAL.announcements).sort(newest_),
    reminders: rows_(PORTAL.reminders).sort(newest_).slice(0, 50),
    activity: rows_(PORTAL.audit).sort(newest_).slice(0, 50)
  };
}

// Preserve optional snapshots and the original global function signatures.
function childViews_(parentId, data) {
  return projectChildren_(parentId, data || dashboardData_());
}
function notifications_(ids, data) {
  data = data || dashboardData_();
  return projectNotifications_(ids, data, date_());
}
