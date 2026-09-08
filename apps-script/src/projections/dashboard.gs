// Pure dashboard joins and ordering. Inputs are request-local snapshots; no service reads or clock access.

// Maps preserve exact keys, input order, and legacy first-match behavior even
// when an existing workbook contains duplicate identifiers.
function firstIndex_(items, key) {
  var index = new Map();
  items.forEach(function (item) {
    if (!index.has(item[key])) index.set(item[key], item);
  });
  return index;
}

function groupIndex_(items, key) {
  var index = new Map();
  items.forEach(function (item) {
    var value = item[key];
    if (!index.has(value)) index.set(value, []);
    index.get(value).push(item);
  });
  return index;
}

function assignmentSubmission_(data, assignmentId, studentId) {
  return (data.submissionsByAssignment.get(assignmentId) || []).find(
    function (row) {
      return row.student_id === studentId;
    }
  );
}

function recentStudentRows_(index, studentId) {
  // Sort a copy so projections never mutate the shared snapshot.
  return (index.get(studentId) || []).slice().sort(newest_).slice(0, 6);
}

function adminFamilyDirectory_(parents, students, links) {
  var studentsById = firstIndex_(students, 'student_id'),
    linksByParent = groupIndex_(links, 'parent_id'),
    activeLinks = links.filter(function (r) {
      return clean_(r.active).toLowerCase() === 'true';
    }),
    linked = {};
  activeLinks.forEach(function (link) {
    linked[link.student_id] = true;
  });
  var families = parents
    .map(function (parent) {
      var children = (linksByParent.get(parent.parent_id) || [])
        .map(function (link) {
          var student = studentsById.get(link.student_id);
          if (!student) return null;
          return {
            student_id: student.student_id,
            name: student.name,
            class_level: student.class_level,
            enrollment_status: student.enrollment_status,
            monthly_fee: student.monthly_fee,
            due_day: student.due_day,
            relationship: link.relationship || 'Parent',
            link_active: clean_(link.active).toLowerCase() === 'true'
          };
        })
        .filter(Boolean)
        .sort(function (a, b) {
          var activeA =
              clean_(a.enrollment_status).toLowerCase() === 'active' &&
              a.link_active,
            activeB =
              clean_(b.enrollment_status).toLowerCase() === 'active' &&
              b.link_active;
          if (activeA !== activeB) return activeA ? -1 : 1;
          return clean_(a.name).localeCompare(clean_(b.name));
        });
      return {
        parent_id: parent.parent_id,
        name: parent.name,
        email: parent.email,
        phone: parent.phone,
        status: parent.status,
        email_verified: !!parent.email_verified_at,
        children: children
      };
    })
    .sort(function (a, b) {
      var activeA = clean_(a.status).toLowerCase() === 'active',
        activeB = clean_(b.status).toLowerCase() === 'active';
      if (activeA !== activeB) return activeA ? -1 : 1;
      return clean_(a.name).localeCompare(clean_(b.name));
    });
  var unlinkedStudents = students
    .filter(function (student) {
      return (
        clean_(student.enrollment_status).toLowerCase() === 'active' &&
        !linked[student.student_id]
      );
    })
    .map(function (student) {
      return {
        student_id: student.student_id,
        name: student.name,
        class_level: student.class_level,
        enrollment_status: student.enrollment_status,
        monthly_fee: student.monthly_fee,
        due_day: student.due_day
      };
    });
  return { families: families, unlinkedStudents: unlinkedStudents };
}

function projectChildren_(parentId, data) {
  var ids = new Set(
    data.links
      .filter(function (r) {
        return (
          r.parent_id === parentId && clean_(r.active).toLowerCase() === 'true'
        );
      })
      .map(function (r) {
        return r.student_id;
      })
  );
  return data.students
    .filter(function (r) {
      return (
        ids.has(r.student_id) &&
        clean_(r.enrollment_status).toLowerCase() === 'active'
      );
    })
    .map(function (s) {
      var assignments = (
        data.assignmentsByStudent.get(s.student_id) || []
      ).filter(function (r) {
        return clean_(r.status).toLowerCase() === 'published';
      });
      var resources = assignments
        .map(function (a) {
          var r = data.resourcesById.get(a.resource_id);
          if (!r) return null;
          var sub = assignmentSubmission_(data, a.assignment_id, s.student_id),
            type = submissionType_(r);
          return {
            assignment_id: a.assignment_id,
            resource_id: r.resource_id,
            title: a.title_override || r.title,
            subject: r.subject,
            kind: r.kind,
            submission_type: type,
            due_date: a.due_date,
            submission_status: sub
              ? sub.status
              : type === 'view_only'
                ? 'view_only'
                : 'pending',
            submitted_at: sub ? sub.submitted_at : ''
          };
        })
        .filter(Boolean);
      return {
        student_id: s.student_id,
        name: s.name,
        class_level: s.class_level,
        resources: resources,
        fees: recentStudentRows_(data.feesByStudent, s.student_id),
        attendance: recentStudentRows_(data.attendanceByStudent, s.student_id),
        progress: recentStudentRows_(data.progressByStudent, s.student_id)
      };
    });
}

function projectNotifications_(ids, data, today) {
  var notes = [],
    studentIds = new Set(ids);
  data.assignments
    .filter(function (r) {
      return (
        studentIds.has(r.student_id) &&
        clean_(r.status).toLowerCase() === 'published' &&
        (!r.visible_from || r.visible_from <= today)
      );
    })
    .forEach(function (r) {
      var resource = data.resourcesById.get(r.resource_id),
        sub = assignmentSubmission_(data, r.assignment_id, r.student_id);
      if (!sub || clean_(sub.status).toLowerCase() === 'needs_changes')
        notes.push({
          type: 'assignment',
          title: sub ? 'Changes requested' : 'Pending assignment',
          message:
            (resource ? resource.title : 'A new resource') +
            (sub && sub.feedback
              ? ' - ' + sub.feedback
              : ' is ready to complete.'),
          student_id: r.student_id
        });
    });
  data.fees
    .filter(function (r) {
      return (
        studentIds.has(r.student_id) &&
        clean_(r.status).toLowerCase() !== 'paid'
      );
    })
    .forEach(function (r) {
      notes.push({
        type: 'payment',
        title: 'Fee update',
        message:
          r.billing_month + ' fee of Rs ' + r.amount + ' is ' + r.status + '.',
        student_id: r.student_id,
        fee_id: r.fee_id
      });
    });
  data.announcements
    .filter(function (r) {
      return (
        (!r.active_from || r.active_from <= today) &&
        (!r.active_until || r.active_until >= today) &&
        (r.audience === 'all' || studentIds.has(r.student_id))
      );
    })
    .forEach(function (r) {
      notes.push({
        type: r.type || 'exam',
        title: r.title,
        message: r.message,
        student_id: r.student_id
      });
    });
  return notes.slice(0, 20);
}
