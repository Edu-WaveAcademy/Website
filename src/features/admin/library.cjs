// Dependencies are supplied by the composition root; this module owns its feature behavior.
module.exports = function createLibrary({
  $,
  $$,
  state,
  FormData,
  clean,
  date,
  options,
  activeStudents,
  api,
  encodeFile,
  setStatus,
  setBusy,
  notify,
  confirmAdminAction,
  refreshAdmin,
}) {
  function libraryPanel(d) {
    const ready = d.resources.filter((x) => x.status === 'published').length,
      students = activeStudents(d),
      activeAssignments = d.assignments.filter((x) => x.status === 'published');
    return `<section class="admin-panel"><div class="library-heading"><div><p class="eyebrow">Current syllabus library</p><h3>Add only the material you want to teach now.</h3><p>Upload a current file, assign it deliberately, and revoke access as soon as the child no longer needs it.</p></div><span class="library-count"><b>${ready}</b> ready to assign</span></div><div class="manual-library-note"><span aria-hidden="true">01</span><p><b>The old archive is disconnected.</b> New materials appear here only after you upload them through Eduwave.</p></div><div class="admin-grid library-followup"><article class="admin-card admin-card-accent"><div class="route-label"><span>Step 1</span><b>Upload current material</b></div><p>Select one PDF, image, Word, Excel, PowerPoint, RTF, or text file that matches the current syllabus.</p><form id="upload-resource-form"><label>Choose the material<input required name="file" type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.rtf,.txt"></label><small class="field-help">Maximum 8 MB. Handwritten worksheets can be scanned as a PDF or clear image.</small><label>Title<input required name="title" placeholder="e.g. Fractions practice test"></label><div class="form-row"><label>Subject<input required name="subject" placeholder="e.g. Maths"></label><label>Class<input required name="classLevel" placeholder="e.g. 8"></label></div><label>What should the child do?<select name="submissionType"><option value="file_upload">Answer in a notebook and upload a scan</option><option value="online_answers">Type answers on the website</option><option value="view_only">Only read or download it</option></select></label><button class="button button-dark">Add this material</button><p class="form-status"></p></form></article><article class="admin-card assign-card"><div class="route-label"><span>Step 2</span><b>Assign it to a child</b></div><p>Only currently enrolled children can receive new material.</p><form id="assign-form"><label>Child<select required name="studentId">${options(students, 'student_id', 'name')}</select></label><label>Material<select required name="resourceId">${options(
      d.resources.filter((x) => x.status === 'published'),
      'resource_id',
      'title',
    )}</select></label><div class="form-row"><label>Available from<input name="visibleFrom" type="date" value="${new Date().toISOString().slice(0, 10)}"></label><label>Due date <small>optional</small><input name="dueDate" type="date"></label></div><button class="button button-dark">Assign to this child</button><p class="form-status"></p></form></article><article class="admin-card admin-card-wide access-directory-card"><div class="directory-heading"><div><p class="eyebrow">Live access</p><h4>Material currently visible to students</h4></div><span class="access-count">${activeAssignments.length} active</span></div><p>Reviewed work stays in Submissions. Revoking access removes the material from the parent portal immediately.</p><div class="assignment-access-list">${activeAssignmentRows(d)}</div></article><article class="admin-card admin-card-wide material-directory-card"><div class="directory-heading"><div><p class="eyebrow">Current materials</p><h4>Files available for assignment</h4></div><label>Find material<input id="material-search" type="search" placeholder="Search title, subject, class, or file type"></label></div><div class="material-directory" id="material-directory">${materialDirectoryRows(d.resources)}</div></article></div></section>`;
  }

  function activeAssignmentRows(d) {
    const submissions = new Map(
      (d.submissions || []).map((x) => [x.assignment_id, x]),
    );
    return (
      d.assignments
        .filter((x) => x.status === 'published')
        .map((x) => {
          const student = d.students.find((s) => s.student_id === x.student_id),
            resource = d.resources.find((r) => r.resource_id === x.resource_id),
            submission = submissions.get(x.assignment_id),
            status = submission?.status || 'pending';
          return `<div class="assignment-access-row"><div><b>${clean(resource?.title || 'Material')}</b><small>${clean(student?.name || 'Student')} &#8250; ${x.due_date ? `due ${clean(date(x.due_date))}` : 'no due date'}</small></div><span class="status-pill ${clean(status)}">${clean(status === 'pending' ? 'not submitted' : status.replace('_', ' '))}</span><button class="button button-danger-quiet" type="button" data-revoke-assignment="${clean(x.assignment_id)}" data-assignment-label="${clean(`${resource?.title || 'Material'} for ${student?.name || 'student'}`)}">Revoke access</button></div>`;
        })
        .join('') ||
      '<div class="notice">No material is currently assigned.</div>'
    );
  }

  function materialDirectoryRows(resources) {
    const d = state.admin?.data || {},
      activeAssignments = (d.assignments || []).filter(
        (x) => x.status === 'published',
      ),
      students = d.students || [],
      query = state.materialQuery.toLowerCase(),
      rows = resources
        .filter((x) => x.status === 'published')
        .filter((x) => {
          const assignedNames = activeAssignments
            .filter((a) => a.resource_id === x.resource_id)
            .map(
              (a) =>
                students.find((s) => s.student_id === a.student_id)?.name || '',
            )
            .join(' ');
          return (
            !query ||
            [x.title, x.subject, x.class_level, x.kind, assignedNames]
              .join(' ')
              .toLowerCase()
              .includes(query)
          );
        })
        .sort(
          (a, b) =>
            String(a.subject || '').localeCompare(String(b.subject || '')) ||
            String(a.class_level || '').localeCompare(
              String(b.class_level || ''),
            ) ||
            String(a.title || '').localeCompare(String(b.title || '')),
        )
        .slice(0, 500);
    return (
      rows
        .map((item) => {
          const names = [
            ...new Set(
              activeAssignments
                .filter((a) => a.resource_id === item.resource_id)
                .map(
                  (a) =>
                    students.find((s) => s.student_id === a.student_id)?.name,
                )
                .filter(Boolean),
            ),
          ];
          return `<div class="material-directory-row ${names.length ? 'is-assigned' : 'is-unassigned'}"><div><b>${clean(item.title)}</b><small class="material-assignment-copy">${names.length ? `Currently assigned to ${clean(names.join(', '))}` : 'Not assigned to any student'}</small></div><div class="material-tags"><span class="material-live-state ${names.length ? 'assigned' : 'unassigned'}">${names.length ? `${names.length} active` : 'available'}</span><span>${clean(item.subject || 'Subject not set')}</span><span>${item.class_level ? `Class ${clean(item.class_level)}` : 'Class not set'}</span><span>${clean(item.kind)}</span></div></div>`;
        })
        .join('') ||
      '<div class="notice">No current material has been uploaded yet.</div>'
    );
  }

  function materialOptions(resources) {
    return `<option value="">Select</option>${resources
      .filter((x) => x.status === 'published')
      .sort(
        (a, b) =>
          String(a.subject || '').localeCompare(String(b.subject || '')) ||
          String(a.class_level || '').localeCompare(
            String(b.class_level || ''),
          ) ||
          String(a.title || '').localeCompare(String(b.title || '')),
      )
      .map(
        (item) =>
          `<option value="${clean(item.resource_id)}">${clean(`${item.title}${item.subject ? ' | ' + item.subject : ''}${item.class_level ? ' | Class ' + item.class_level : ''}`)}</option>`,
      )
      .join('')}`;
  }

  function renderMaterialDirectory() {
    const root = $('#material-directory');
    if (root)
      root.innerHTML = materialDirectoryRows(state.admin.data.resources || []);
  }

  function bindMaterialDirectory() {
    const select = $('#assign-form [name="resourceId"]');
    if (select)
      select.innerHTML = materialOptions(state.admin.data.resources || []);
    $('#material-search')?.addEventListener('input', (event) => {
      state.materialQuery = event.currentTarget.value.trim();
      renderMaterialDirectory();
    });
  }

  function bindAssignmentAccess() {
    $$('[data-revoke-assignment]').forEach((button) =>
      button.addEventListener('click', () => revokeAssignment(button)),
    );
  }

  async function revokeAssignment(button) {
    const confirmed = await confirmAdminAction(
      {
        title: 'Revoke this material?',
        message: `${button.dataset.assignmentLabel} will disappear from the parent portal immediately. Any submitted work remains in Submissions.`,
        confirmLabel: 'Revoke access',
        cancelLabel: 'Keep access',
      },
      button,
    );
    if (!confirmed) return;
    setBusy(button, true, 'Revoking...');
    try {
      await api('adminRevokeAssignment', {
        sessionId: state.admin.sessionId,
        assignmentId: button.dataset.revokeAssignment,
      });
      notify('Student access revoked. The submission history was kept.');
      await refreshAdmin();
    } catch (err) {
      notify(err.message, 'error');
      setBusy(button, false);
    }
  }

  async function adminUploadResource(event) {
    event.preventDefault();
    const form = event.currentTarget,
      out = $('.form-status', form),
      button = form.querySelector(
        'button[type="submit"],button:not([type]),input[type="submit"]',
      );
    if (!form.reportValidity()) return;
    setStatus(out, 'Adding the file securely...');
    setBusy(button, true, 'Adding file...');
    try {
      const fd = new FormData(form),
        file = await encodeFile(fd.get('file')),
        payload = Object.fromEntries(fd);
      delete payload.file;
      await api('adminUploadResource', {
        sessionId: state.admin.sessionId,
        ...payload,
        file,
      });
      setStatus(out, 'Material added. Assign it to a child below.', 'success');
      notify('Material added to Eduwave.');
      form.reset();
      await refreshAdmin();
    } catch (err) {
      setStatus(out, err.message, 'error');
      notify(err.message, 'error');
    } finally {
      setBusy(button, false);
    }
  }
  return {
    libraryPanel,
    activeAssignmentRows,
    materialDirectoryRows,
    materialOptions,
    renderMaterialDirectory,
    bindMaterialDirectory,
    bindAssignmentAccess,
    revokeAssignment,
    adminUploadResource,
  };
};
