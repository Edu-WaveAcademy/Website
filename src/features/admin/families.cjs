// Dependencies are supplied by the composition root; this module owns its feature behavior.
module.exports = function createFamilies({
  $,
  $$,
  state,
  clean,
  api,
  setBusy,
  notify,
  confirmAdminAction,
  refreshAdmin,
}) {
  function studentDirectoryRow(child, former = false) {
    const nextStatus = former ? 'active' : 'left';
    return `<div class="student-directory-row ${former ? 'is-former' : ''}"><div><strong>${clean(child.name)}</strong><small>Class ${clean(child.class_level || 'not set')} &#8250; ${clean(child.relationship || 'Child')}</small></div><div class="student-directory-meta"><span class="status-pill ${former ? 'left' : 'active'}">${former ? 'left academy' : 'enrolled'}</span><small>${child.monthly_fee ? `Rs ${clean(child.monthly_fee)} / month &#8250; due day ${clean(child.due_day || '?')}` : 'Fee not set'}</small></div><button class="${former ? 'button button-outline' : 'button button-danger-quiet'}" type="button" data-student-status="${nextStatus}" data-student-id="${clean(child.student_id)}" data-student-name="${clean(child.name)}">${former ? 'Restore enrolment' : 'Mark as left'}</button></div>`;
  }

  function parentAssociationStatus(family) {
    const labels = {
      active: 'current parent',
      left: 'former parent',
      pending: 'awaiting approval',
      denied: 'access denied',
    };
    return labels[family.status] || family.status;
  }

  function parentAssociationButton(family) {
    if (family.status === 'active')
      return `<button class="button button-danger-quiet" type="button" data-parent-directory-status="left" data-parent-id="${clean(family.parent_id)}" data-parent-name="${clean(family.name)}">Mark parent as left</button>`;
    if (family.status === 'left')
      return `<button class="button button-outline" type="button" data-parent-directory-status="active" data-parent-id="${clean(family.parent_id)}" data-parent-name="${clean(family.name)}">Restore parent</button>`;
    return '';
  }

  function renderFamilyDirectory() {
    const root = $('#family-directory');
    if (!root) return;
    const query = state.familyQuery.toLowerCase(),
      parentFilter = state.familyParentStatus,
      studentFilter = state.familyStudentStatus;
    const families = (state.admin.data.families || [])
      .map((family) => {
        const activeChildren = family.children.filter(
            (child) =>
              child.enrollment_status === 'active' && child.link_active,
          ),
          formerChildren = family.children.filter(
            (child) =>
              child.enrollment_status !== 'active' || !child.link_active,
          ),
          visibleChildren =
            studentFilter === 'current'
              ? activeChildren
              : studentFilter === 'former'
                ? formerChildren
                : family.children;
        return { ...family, activeChildren, formerChildren, visibleChildren };
      })
      .filter(
        (family) =>
          (parentFilter === 'all' || family.status === parentFilter) &&
          (studentFilter === 'all' || family.visibleChildren.length > 0),
      )
      .filter((family) => {
        const searchable = [
          family.name,
          family.email,
          family.phone,
          family.status,
          ...family.children.flatMap((child) => [
            child.name,
            child.class_level,
            child.enrollment_status,
          ]),
        ]
          .join(' ')
          .toLowerCase();
        return !query || searchable.includes(query);
      });
    root.innerHTML =
      families
        .map((family) => {
          const initial = String(family.name || 'P')
              .trim()
              .charAt(0)
              .toUpperCase(),
            currentVisible = family.visibleChildren.filter(
              (child) =>
                child.enrollment_status === 'active' && child.link_active,
            ),
            formerVisible = family.visibleChildren.filter(
              (child) =>
                child.enrollment_status !== 'active' || !child.link_active,
            ),
            parentFormer = family.status === 'left';
          return `<article class="family-record ${parentFormer ? 'is-former-parent' : ''}"><header><span class="family-avatar" aria-hidden="true">${clean(initial)}</span><div><h5>${clean(family.name)}</h5><p>${family.activeChildren.length} currently enrolled student${family.activeChildren.length === 1 ? '' : 's'}</p></div><div class="family-status-stack"><span class="status-pill ${clean(family.status)}">${clean(parentAssociationStatus(family))}</span><small>${family.email_verified ? 'Login verified' : 'First login pending'}</small></div></header><div class="parent-contact"><a href="mailto:${clean(family.email)}">${clean(family.email)}</a><span>${clean(family.phone || 'Mobile number missing')}</span></div><div class="parent-record-actions">${parentAssociationButton(family)}</div><div class="linked-students">${currentVisible.length ? `<b>Current students</b>${currentVisible.map((child) => studentDirectoryRow(child)).join('')}` : ''}${formerVisible.length ? `<div class="former-students ${studentFilter === 'former' ? 'is-open' : ''}"><b>Former students</b><div>${formerVisible.map((child) => studentDirectoryRow(child, true)).join('')}</div></div>` : ''}${!family.visibleChildren.length ? '<div class="family-alert">No students match this filter.</div>' : ''}</div></article>`;
        })
        .join('') ||
      '<div class="notice">No parent or student matches these filters.</div>';
    bindStudentStatusButtons();
    bindParentStatusButtons();
  }

  function bindFamilyDirectory() {
    const root = $('#family-directory');
    if (root && !$('#family-filters'))
      root.insertAdjacentHTML(
        'beforebegin',
        `<div class="family-filters" id="family-filters"><label>Parent status<select id="family-parent-filter"><option value="all">All parents</option><option value="active">Current parents</option><option value="left">Former parents</option><option value="pending">Awaiting approval</option></select></label><label>Student status<select id="family-student-filter"><option value="all">All students</option><option value="current">Current students</option><option value="former">Former students</option></select></label></div>`,
      );
    const parentFilter = $('#family-parent-filter'),
      studentFilter = $('#family-student-filter');
    if (parentFilter) parentFilter.value = state.familyParentStatus;
    if (studentFilter) studentFilter.value = state.familyStudentStatus;
    $('#family-search')?.addEventListener('input', (event) => {
      state.familyQuery = event.currentTarget.value.trim();
      renderFamilyDirectory();
    });
    parentFilter?.addEventListener('change', (event) => {
      state.familyParentStatus = event.currentTarget.value;
      renderFamilyDirectory();
    });
    studentFilter?.addEventListener('change', (event) => {
      state.familyStudentStatus = event.currentTarget.value;
      renderFamilyDirectory();
    });
    const familyPhone = $('#family-form [name="phone"]');
    if (familyPhone) {
      familyPhone.required = true;
      familyPhone.pattern = '[6-9][0-9]{9}';
      familyPhone.minLength = 10;
      familyPhone.maxLength = 10;
      familyPhone.placeholder = '10-digit mobile number';
    }
  }

  function bindStudentStatusButtons() {
    $$('[data-student-status]').forEach((button) =>
      button.addEventListener('click', () => setStudentStatus(button)),
    );
  }

  function bindParentStatusButtons() {
    $$('[data-parent-directory-status]').forEach((button) =>
      button.addEventListener('click', () => setParentAssociation(button)),
    );
  }

  async function setStudentStatus(button) {
    const leaving = button.dataset.studentStatus === 'left',
      name = button.dataset.studentName,
      confirmed = await confirmAdminAction(
        {
          title: leaving ? `Mark ${name} as left?` : `Restore ${name}?`,
          message: leaving
            ? 'The child will disappear from the parent portal, active material access will be revoked, and no new monthly fees will be generated. Past submissions and records stay saved.'
            : 'The child will return to the family directory. Previous material access stays revoked until you assign it again.',
          confirmLabel: leaving ? 'Mark as left' : 'Restore enrolment',
          cancelLabel: leaving ? 'Keep enrolled' : 'Cancel',
        },
        button,
      );
    if (!confirmed) return;
    setBusy(button, true, leaving ? 'Removing access...' : 'Restoring...');
    try {
      const result = await api('adminSetStudentStatus', {
        sessionId: state.admin.sessionId,
        studentId: button.dataset.studentId,
        status: button.dataset.studentStatus,
      });
      notify(
        leaving
          ? `${name} was moved to former students. ${result.revokedAssignments || 0} active assignment${result.revokedAssignments === 1 ? '' : 's'} revoked.`
          : `${name} is enrolled again.`,
      );
      await refreshAdmin();
    } catch (err) {
      notify(err.message, 'error');
      setBusy(button, false);
    }
  }

  async function setParentAssociation(button) {
    const leaving = button.dataset.parentDirectoryStatus === 'left',
      name = button.dataset.parentName,
      confirmed = await confirmAdminAction(
        {
          title: leaving
            ? `Mark ${name} as a former parent?`
            : `Restore ${name}?`,
          message: leaving
            ? 'Parent login will stop immediately and this parent will move to the former list. Student enrolment and historical records will not be deleted.'
            : 'Parent login will be restored. Links reconnect only for children who are currently enrolled.',
          confirmLabel: leaving ? 'Mark parent as left' : 'Restore parent',
          cancelLabel: 'Cancel',
        },
        button,
      );
    if (!confirmed) return;
    setBusy(button, true, leaving ? 'Removing access...' : 'Restoring...');
    try {
      await api('adminSetParentStatus', {
        sessionId: state.admin.sessionId,
        parentId: button.dataset.parentId,
        status: button.dataset.parentDirectoryStatus,
      });
      notify(
        leaving
          ? `${name} was moved to former parents.`
          : `${name} is a current parent again.`,
      );
      await refreshAdmin();
    } catch (err) {
      notify(err.message, 'error');
      setBusy(button, false);
    }
  }
  return {
    studentDirectoryRow,
    parentAssociationStatus,
    parentAssociationButton,
    renderFamilyDirectory,
    bindFamilyDirectory,
    bindStudentStatusButtons,
    bindParentStatusButtons,
    setStudentStatus,
    setParentAssociation,
  };
};
