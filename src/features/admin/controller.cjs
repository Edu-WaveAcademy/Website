// Dependencies are supplied by the composition root; this module owns its feature behavior.
module.exports = function createAdministration({
  SESSION_KEYS,
  $,
  $$,
  state,
  window,
  sessionStorage,
  FormData,
  clean,
  options,
  activeStudents,
  api,
  setStatus,
  setBusy,
  notify,
  closeDialog,
  resetAuth,
  submissionFile,
  learningPanel,
  renderFamilyDirectory,
  bindFamilyDirectory,
  libraryPanel,
  bindMaterialDirectory,
  bindAssignmentAccess,
  adminUploadResource,
  submissionsPanel,
  bindSubmissionDirectory,
}) {
  function applyAdmin() {
    if (state.admin?.sessionId)
      sessionStorage.setItem(SESSION_KEYS.admin, state.admin.sessionId);
    $('#admin-auth').classList.add('hidden');
    $('#admin-app').classList.remove('hidden');
    renderAdmin();
  }

  async function adminLogout() {
    const token = state.admin?.sessionId;
    try {
      if (token) await api('logout', { sessionId: token });
    } catch (_) {}
    sessionStorage.removeItem(SESSION_KEYS.admin);
    state.admin = null;
    $('#admin-app').classList.add('hidden');
    $('#admin-auth').classList.remove('hidden');
    resetAuth('admin');
    closeDialog($('#admin-dialog'));
  }

  function renderAdmin() {
    const d = state.admin.data;
    $('#admin-metrics').innerHTML = [
      ['Approved parents', d.metrics.parents],
      ['Parent requests', d.metrics.pendingParents || 0],
      ['Active students', d.metrics.students],
      ['Pending trials', d.metrics.pendingTrials],
      ['Open fees', d.metrics.openFees],
    ]
      .map((x) => `<div><small>${x[0]}</small><b>${x[1]}</b></div>`)
      .join('');
    adminPanel($('.admin-tabs button.active').dataset.adminTab);
  }

  function adminPanel(tab) {
    const d = state.admin.data,
      root = $('#admin-content'),
      students = activeStudents(d);
    if (tab === 'families') {
      const activeParents = d.parents.filter((x) => x.status === 'active'),
        pendingParents = d.parents.filter((x) => x.status === 'pending'),
        former = d.students.filter((x) => x.enrollment_status !== 'active');
      root.innerHTML = `<section class="admin-panel"><h3>Your academy families.</h3><p class="form-status">Current students stay easy to find. Marking a child as left removes parent access and future fees while preserving past submissions.</p><div class="family-summary"><div><small>Approved parents</small><b>${activeParents.length}</b></div><div><small>Currently enrolled</small><b>${students.length}</b></div><div><small>Former students</small><b>${former.length}</b></div><div><small>Awaiting approval</small><b>${pendingParents.length}</b></div></div><div class="admin-grid"><article class="admin-card admin-card-wide family-directory-card"><div class="directory-heading"><div><p class="eyebrow">Academy directory</p><h4>Parents and enrolled students</h4></div><label>Find a family<input id="family-search" type="search" placeholder="Search parent, child, email, or class"></label></div><div class="family-directory" id="family-directory"></div>${(d.unlinkedStudents || []).length ? `<div class="unlinked-warning"><b>Students needing a parent link</b>${d.unlinkedStudents.map((x) => `<span>${clean(x.name)} &#8250; Class ${clean(x.class_level)}</span>`).join('')}</div>` : ''}</article><article class="admin-card"><h4>Parent account requests</h4><div class="data-list">${pendingParents.map((x) => `<div class="data-line"><b>${clean(x.name)}</b><small>${clean(x.email)} &#8250; ${clean(x.phone || 'No phone')}</small><button data-parent-status="active" data-parent-id="${clean(x.parent_id)}">Approve</button><button data-parent-status="denied" data-parent-id="${clean(x.parent_id)}">Deny</button></div>`).join('') || '<div class="notice">No pending parent requests.</div>'}</div></article><article class="admin-card"><h4>Add an approved parent</h4><form id="family-form"><label>Parent name<input required name="name"></label><label>Approved email<input required name="email" type="email"></label><label>WhatsApp number<input name="phone" inputmode="tel"></label><button class="button button-dark">Create parent</button><p class="form-status"></p></form></article><article class="admin-card"><h4>Add a child</h4><form id="student-form"><label>Approved parent<select required name="parentId">${options(activeParents, 'parent_id', 'name')}</select></label><label>Child name<input required name="name"></label><label>Class<input required name="classLevel" placeholder="e.g. 8"></label><div class="form-row"><label>Monthly fee<input name="monthlyFee" inputmode="numeric"></label><label>Due day<input name="dueDay" type="number" min="1" max="28" value="10"></label></div><button class="button button-dark">Create child</button><p class="form-status"></p></form></article></div></section>`;
    }
    if (tab === 'learning') root.innerHTML = learningPanel(d, students);
    if (tab === 'submissions') root.innerHTML = submissionsPanel(d);
    if (tab === 'library') root.innerHTML = libraryPanel(d);
    if (tab === 'finance')
      root.innerHTML = `<section class="admin-panel"><h3>Fees and gentle reminders.</h3><div class="admin-grid"><article class="admin-card"><h4>Generate this month&#8217;s rows</h4><p class="form-status">One fee row per active child with a fee amount. It does not duplicate rows.</p><button class="button button-dark" id="generate-fees">Generate monthly fees</button><p class="form-status"></p></article><article class="admin-card"><h4>Mark payment verified</h4><form id="paid-form"><label>Fee row<select required name="feeId">${options(d.fees, 'fee_id', 'billing_month')}</select></label><label>Reference (optional)<input name="reference"></label><button class="button button-dark">Mark paid</button><p class="form-status"></p></form></article><article class="admin-card"><h4>WhatsApp reminder</h4><form id="reminder-form"><label>Child<select required name="studentId">${options(students, 'student_id', 'name')}</select></label><label>Type<select name="type"><option value="fee">Fee reminder</option><option value="general">General update</option></select></label><label>Message<textarea name="message" rows="3" placeholder="Leave blank for a useful default"></textarea></label><button class="button button-dark">Create WhatsApp link</button><p class="form-status"></p></form></article><article class="admin-card"><h4>Fee records</h4><div class="data-list">${d.fees.map((x) => `<div class="data-line"><b>${clean(x.billing_month)} &#8211; Rs ${clean(x.amount)}</b><small>${clean(x.status)} &#8250; due ${clean(x.due_date)} &#8250; ${clean(x.reference || 'No reference')}</small></div>`).join('') || '<div class="notice">No fee rows yet.</div>'}</div></article></div></section>`;
    if (tab === 'trials')
      root.innerHTML = `<section class="admin-panel"><h3>Trial requests.</h3><div class="admin-grid"><article class="admin-card"><h4>Pending and recent</h4><div class="data-list">${d.trials.map((x) => `<div class="data-line"><b>${clean(x.child_name || x.childName)} &#8211; ${clean(x.class_level || x.classLevel)}</b><small>${clean(x.parent_name || x.parentName)} &#8250; ${clean(x.phone)} &#8250; ${clean(x.subjects)} &#8250; ${clean(x.status)}</small>${x.status === 'pending' ? `<button data-approve="${clean(x.trial_id)}">Approve</button><button data-decline="${clean(x.trial_id)}">Decline</button>` : ''}</div>`).join('') || '<div class="notice">No trial requests yet.</div>'}</div></article><article class="admin-card"><h4>Simple next step</h4><p class="form-status">Approve a suitable trial, then create or approve the parent email and link the child in Families when they enrol. Only material uploaded through Eduwave appears to parents.</p></article></div></section>`;
    bindAdmin();
    if (tab === 'families') renderFamilyDirectory();
  }

  function bindAdmin() {
    bindFamilyDirectory();
    bindMaterialDirectory();
    bindSubmissionDirectory();
    bindAssignmentAccess();
    [
      ['family-form', 'adminCreateFamily'],
      ['student-form', 'adminCreateStudent'],
      ['announcement-form', 'adminCreateAnnouncement'],
      ['attendance-form', 'adminRecordAttendance'],
      ['progress-form', 'adminRecordProgress'],
      ['assign-form', 'adminAssignResource'],
      ['paid-form', 'adminMarkFeePaid'],
      ['reminder-form', 'adminQueueReminder'],
    ].forEach(([id, a]) => {
      const f = $('#' + id);
      if (f) f.addEventListener('submit', (e) => adminSubmit(e, a));
    });
    $('#upload-resource-form')?.addEventListener('submit', adminUploadResource);
    $$('.submission-review-form').forEach((f) =>
      f.addEventListener('submit', (e) =>
        adminSubmit(e, 'adminReviewSubmission'),
      ),
    );
    $$('[data-submission-file]').forEach((b) =>
      b.addEventListener('click', () =>
        submissionFile(b.dataset.submissionFile, b),
      ),
    );
    $('#generate-fees')?.addEventListener('click', async (e) => {
      const button = e.currentTarget,
        out = button.nextElementSibling;
      setStatus(out, 'Creating fee rows...');
      setBusy(button, true, 'Creating rows...');
      try {
        const r = await api('adminGenerateMonthlyFees', {
          sessionId: state.admin.sessionId,
        });
        const message = `Created ${r.created} row(s) for ${r.month}.`;
        setStatus(out, message, 'success');
        notify(message);
        await refreshAdmin();
      } catch (err) {
        setStatus(out, err.message, 'error');
        notify(err.message, 'error');
      } finally {
        setBusy(button, false);
      }
    });
    $$('[data-approve]').forEach((b) =>
      b.addEventListener('click', () =>
        trialUpdate(b.dataset.approve, 'approved'),
      ),
    );
    $$('[data-decline]').forEach((b) =>
      b.addEventListener('click', () =>
        trialUpdate(b.dataset.decline, 'declined'),
      ),
    );
    $$('[data-parent-status]').forEach((b) =>
      b.addEventListener('click', () =>
        parentStatus(b.dataset.parentId, b.dataset.parentStatus),
      ),
    );
  }

  async function adminSubmit(e, action) {
    e.preventDefault();
    const f = e.currentTarget,
      out = $('.form-status', f),
      button = f.querySelector(
        'button[type="submit"],button:not([type]),input[type="submit"]',
      );
    if (!f.reportValidity()) return;
    setStatus(out, 'Saving...');
    setBusy(button, true, 'Saving...');
    try {
      const result = await api(action, {
        sessionId: state.admin.sessionId,
        ...Object.fromEntries(new FormData(f)),
      });
      if (action === 'adminQueueReminder' && result.whatsappUrl) {
        setStatus(out, 'Reminder queued. Opening WhatsApp...', 'success');
        notify('Reminder link is ready.');
        window.open(result.whatsappUrl, '_blank', 'noopener');
      } else {
        setStatus(out, 'Saved.', 'success');
        notify('Academy record saved.');
      }
      f.reset();
      await refreshAdmin();
    } catch (err) {
      setStatus(out, err.message, 'error');
      notify(err.message, 'error');
    } finally {
      setBusy(button, false);
    }
  }

  async function parentStatus(parentId, statusValue) {
    try {
      await api('adminSetParentStatus', {
        sessionId: state.admin.sessionId,
        parentId,
        status: statusValue,
      });
      notify(
        `Parent account ${statusValue === 'active' ? 'approved' : 'denied'}.`,
      );
      await refreshAdmin();
    } catch (err) {
      notify(err.message, 'error');
    }
  }

  async function trialUpdate(id, statusValue) {
    try {
      await api('adminApproveTrial', {
        sessionId: state.admin.sessionId,
        trialId: id,
        status: statusValue,
      });
      notify(`Trial request ${statusValue}.`);
      await refreshAdmin();
    } catch (err) {
      notify(err.message, 'error');
    }
  }

  async function refreshAdmin() {
    state.admin.data = await api('adminDashboard', {
      sessionId: state.admin.sessionId,
    });
    renderAdmin();
  }
  return {
    applyAdmin,
    adminLogout,
    renderAdmin,
    adminPanel,
    bindAdmin,
    adminSubmit,
    parentStatus,
    trialUpdate,
    refreshAdmin,
  };
};
