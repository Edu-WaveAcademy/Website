// Dependencies are supplied by the composition root; this module owns its feature behavior.
module.exports = function createParentPortal({
  SESSION_KEYS,
  $,
  $$,
  state,
  document,
  EduwaveUI,
  sessionStorage,
  FormData,
  clean,
  date,
  api,
  setStatus,
  setBusy,
  notify,
  closeDialog,
  toggleNotifications,
  resetAuth,
  resource,
}) {
  function applyParent(data) {
    state.sessionId = data.sessionId;
    state.parent = data.parent;
    state.dashboard = data.dashboard;
    state.activeChild = data.dashboard.children[0]?.student_id || '';
    sessionStorage.setItem(SESSION_KEYS.parent, data.sessionId);
    $('#portal-auth').classList.add('hidden');
    $('#parent-app').classList.remove('hidden');
    $('#parent-greeting').textContent =
      `Hello, ${data.parent.name.split(' ')[0]}`;
    renderParent();
    const hasUpdates = data.dashboard.notifications.length > 0;
    $('#notification-panel').classList.toggle('hidden', !hasUpdates);
    $('#notification-button').setAttribute('aria-expanded', String(hasUpdates));
    if (hasUpdates)
      notify(
        `${data.dashboard.notifications.length} update${data.dashboard.notifications.length === 1 ? '' : 's'} waiting in the parent portal.`,
      );
  }

  async function parentLogout() {
    try {
      await api('logout', { sessionId: state.sessionId });
    } catch (_) {}
    sessionStorage.removeItem(SESSION_KEYS.parent);
    state.sessionId = '';
    state.parent = null;
    state.dashboard = null;
    state.activeChild = '';
    $('#parent-app').classList.add('hidden');
    $('#portal-auth').classList.remove('hidden');
    $('#notification-panel').classList.add('hidden');
    $('#notification-button').setAttribute('aria-expanded', 'false');
    resetAuth('parent');
    closeDialog($('#portal-dialog'));
  }

  function child() {
    return state.dashboard.children.find(
      (x) => x.student_id === state.activeChild,
    );
  }

  function renderParent() {
    const children = state.dashboard.children,
      active = child();
    $('#child-tabs').innerHTML = children
      .map(
        (x) =>
          `<button type="button" role="tab" aria-selected="${x.student_id === state.activeChild}" class="${x.student_id === state.activeChild ? 'active' : ''}" data-child="${clean(x.student_id)}">${clean(x.name)} <small>(Class ${clean(x.class_level)})</small></button>`,
      )
      .join('');
    $$('[data-child]').forEach((b) =>
      b.addEventListener('click', () => {
        state.activeChild = b.dataset.child;
        renderParent();
      }),
    );
    EduwaveUI.tabs($('#child-tabs'), { panel: $('#parent-dashboard') });
    const notes = state.dashboard.notifications.filter(
      (n) => !n.student_id || n.student_id === state.activeChild,
    );
    $('#notification-count').textContent = notes.length;
    $('#notification-panel').innerHTML = notes.length
      ? notes
          .map(
            (n) =>
              `<div class="notification"><b>${clean(n.type)}</b><strong>${clean(n.title)}</strong><br>${clean(n.message)}</div>`,
          )
          .join('')
      : '<div class="notification">No updates right now.</div>';
    if (!active) {
      $('#parent-dashboard').innerHTML = EduwaveUI.stateMarkup({
        title: 'No children linked yet',
        description:
          'Contact the academy to link your child to this approved account.',
      });
      return;
    }
    const resources = active.resources.length
      ? active.resources
          .map((r) => {
            const status = r.submission_status || 'pending',
              label =
                status === 'pending'
                  ? r.due_date
                    ? `Due ${date(r.due_date)}`
                    : 'To do'
                  : status.replace('_', ' ');
            return `<div class="resource-row"><button type="button" data-resource="${clean(r.resource_id)}"><span>${clean(r.title)}</span><small>${clean(r.subject || 'Learning material')} &#8250; ${clean(r.kind)} &#8250; ${r.submission_type === 'file_upload' ? 'Upload completed work' : 'Open assignment'}</small></button><span class="status-pill ${clean(status)}">${clean(label)}</span></div>`;
          })
          .join('')
      : EduwaveUI.stateMarkup({
          title: 'Ready for the next lesson',
          description:
            'Assignments and learning materials will appear here when the academy shares them.',
        });
    const fees = active.fees.length
      ? active.fees
          .map(
            (f) =>
              `<div class="fee-row"><div><b>Rs ${clean(f.amount)} &#8250; ${clean(f.billing_month)}</b><small>Due ${clean(date(f.due_date))}${f.reference ? ` &#8250; Ref ${clean(f.reference)}` : ''}</small></div><span class="status-pill ${clean(f.status)}">${clean(f.status.replace('_', ' '))}</span>${f.status !== 'paid' ? `<button class="text-button" data-pay="${clean(f.fee_id)}">Pay note</button>` : ''}</div>`,
          )
          .join('')
      : EduwaveUI.stateMarkup({
          title: 'No fees due',
          description: 'New fee records will appear here.',
        });
    const attendance = active.attendance.length
      ? active.attendance
          .map(
            (x) =>
              `<div class="attendance-row"><div><b>${clean(x.subject)}</b><small>${clean(date(x.session_date))}${x.note ? ` &#8250; ${clean(x.note)}` : ''}</small></div><span class="status-pill ${clean(x.status)}">${clean(x.status)}</span></div>`,
          )
          .join('')
      : EduwaveUI.stateMarkup({
          title: 'No attendance updates yet',
          description: 'Session records will appear here after class.',
        });
    const progress = active.progress.length
      ? active.progress
          .map(
            (x) =>
              `<div class="progress-row"><div><b>${clean(x.topic)}</b><small>${clean(x.subject)}${x.teacher_note ? ` &#8250; ${clean(x.teacher_note)}` : ''}</small></div><span class="status-pill">${clean(x.score || 'noted')}</span></div>`,
          )
          .join('')
      : EduwaveUI.stateMarkup({
          title: 'Progress starts here',
          description:
            'Teacher feedback will appear after your child’s lessons.',
        });
    $('#parent-dashboard').innerHTML =
      `<section class="dashboard-hero"><div><p>CLASS ${clean(active.class_level)}</p><h3>${clean(active.name)}&#8217;s learning space</h3><p>${active.resources.length} learning item${active.resources.length === 1 ? '' : 's'} currently available.</p></div><button class="button button-dark" id="quick-updates" type="button">View ${notes.length} update${notes.length === 1 ? '' : 's'}</button></section><div class="dashboard-grid"><section class="dash-card"><h4>Assignments & materials</h4><div class="resource-list">${resources}</div></section><section class="dash-card"><h4>Fee status</h4><div class="fee-list">${fees}</div></section></div><div class="two-cards"><section class="dash-card"><h4>Recent attendance</h4><div class="attendance-list">${attendance}</div></section><section class="dash-card"><h4>Teacher notes & progress</h4><div class="progress-list">${progress}</div></section></div>`;
    $('#quick-updates').addEventListener('click', toggleNotifications);
    $$('[data-resource]').forEach((b) =>
      b.addEventListener('click', () => resource(b.dataset.resource, b)),
    );
    $$('[data-pay]').forEach((b) =>
      b.addEventListener('click', () => payment(b.dataset.pay)),
    );
  }

  function payment(feeId) {
    const activeChild = child();
    if (!activeChild) return;
    const f = activeChild.fees.find((x) => x.fee_id === feeId);
    if (!f) return;
    const t = $('#payment-template').content.cloneNode(true),
      form = $('.payment-form', t),
      card = document.createElement('section');
    card.className = 'dash-card';
    card.innerHTML = `<h4>Payment for ${clean(f.billing_month)}</h4><p class="form-status">Pay by UPI${state.dashboard.upiId ? ` to ${clean(state.dashboard.upiId)}` : ' using the academy instructions'}, then submit the reference.</p>`;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const out = $('.form-status', form),
        button = form.querySelector(
          'button[type="submit"],button:not([type]),input[type="submit"]',
        );
      setStatus(out, 'Submitting payment note...');
      setBusy(button, true, 'Submitting...');
      try {
        await api('parentPaymentNote', {
          sessionId: state.sessionId,
          studentId: state.activeChild,
          feeId,
          ...Object.fromEntries(new FormData(form)),
        });
        setStatus(out, 'Submitted for academy verification.', 'success');
        notify('Payment reference submitted for verification.');
        await refreshParent();
      } catch (err) {
        setStatus(out, err.message, 'error');
        notify(err.message, 'error');
      } finally {
        setBusy(button, false);
      }
    });
    card.append(t);
    $('#parent-dashboard').prepend(card);
    card.scrollIntoView({ behavior: 'smooth' });
  }

  async function refreshParent() {
    const d = await api('parentDashboard', { sessionId: state.sessionId });
    state.parent = d.parent;
    state.dashboard = d.dashboard;
    renderParent();
  }
  return {
    applyParent,
    parentLogout,
    child,
    renderParent,
    payment,
    refreshParent,
  };
};
