// Dependencies are supplied by the composition root; this module owns its feature behavior.
module.exports = function createAuthentication({
  SESSION_KEYS,
  $,
  $$,
  state,
  sessionStorage,
  FormData,
  navigator,
  setTimeout,
  maskEmail,
  api,
  device,
  setStatus,
  setBusy,
  notify,
  applyParent,
  applyAdmin,
}) {
  function parentAuthMode(mode) {
    const login = mode !== 'signup';
    $$('[data-parent-auth]').forEach((b) => {
      const active = b.dataset.parentAuth === (login ? 'login' : 'signup');
      b.classList.toggle('active', active);
      b.setAttribute('aria-pressed', String(active));
    });
    $('#parent-login-form').classList.toggle('hidden', !login);
    $('#parent-signup-form').classList.toggle('hidden', login);
    $('#parent-code-form').classList.add('hidden');
    $('.auth-switch', $('#portal-auth')).classList.remove('hidden');
    setStatus($('#portal-auth-status'));
  }

  async function signupParent(e) {
    e.preventDefault();
    const form = e.currentTarget,
      target = $('#portal-auth-status'),
      button = form.querySelector(
        'button[type="submit"],button:not([type]),input[type="submit"]',
      );
    if (!form.reportValidity()) return;
    setStatus(target, 'Submitting your access request...');
    setBusy(button, true, 'Submitting request...');
    try {
      const values = Object.fromEntries(new FormData(form));
      await api('signupParent', values);
      form.reset();
      parentAuthMode('login');
      $('#parent-login-form [name="email"]').value = values.email;
      $('#parent-login-form [name="phone"]').value = values.phone;
      const message =
        'Request received. The academy will approve your email before your first login.';
      setStatus(target, message, 'success');
      notify(message);
    } catch (err) {
      setStatus(target, err.message, 'error');
      notify(err.message, 'error');
    } finally {
      setBusy(button, false);
    }
  }

  async function requestLoginCode(e, role) {
    e.preventDefault();
    const form = e.currentTarget,
      target = $(
        role === 'parent' ? '#portal-auth-status' : '#admin-auth-status',
      ),
      button = form.querySelector(
        'button[type="submit"],button:not([type]),input[type="submit"]',
      );
    if (!form.reportValidity()) return;
    const values = Object.fromEntries(new FormData(form)),
      email = String(values.email || '')
        .trim()
        .toLowerCase();
    setStatus(target, 'Preparing your secure code...');
    setBusy(button, true, 'Sending code...');
    try {
      await api('requestLoginCode', {
        role,
        email,
        phone: role === 'parent' ? values.phone : '',
        deviceId: device(),
      });
      state.auth[role + 'Email'] = email;
      showCodeStep(role, email);
      setStatus(
        target,
        'If these details are approved, the code will arrive shortly. It expires in 10 minutes.',
        'success',
      );
    } catch (err) {
      setStatus(target, err.message, 'error');
      notify(err.message, 'error');
    } finally {
      setBusy(button, false);
    }
  }

  function showCodeStep(role, email) {
    if (role === 'parent') {
      $('#parent-login-form').classList.add('hidden');
      $('#parent-signup-form').classList.add('hidden');
      $('.auth-switch', $('#portal-auth')).classList.add('hidden');
    } else $('#admin-login-form').classList.add('hidden');
    const form = $(
      role === 'parent' ? '#parent-code-form' : '#admin-code-form',
    );
    form.classList.remove('hidden');
    $('#' + role + '-code-email').textContent = maskEmail(email);
    setTimeout(() => form.elements.code.focus(), 0);
  }

  async function verifyLoginCode(e, role) {
    e.preventDefault();
    const form = e.currentTarget,
      target = $(
        role === 'parent' ? '#portal-auth-status' : '#admin-auth-status',
      ),
      button = form.querySelector(
        'button[type="submit"],button:not([type]),input[type="submit"]',
      );
    if (!form.reportValidity()) return;
    const email = state.auth[role + 'Email'],
      code = String(new FormData(form).get('code') || '').trim();
    setStatus(target, 'Verifying the code...');
    setBusy(button, true, 'Verifying...');
    try {
      const data = await api('verifyLoginCode', {
        role,
        email,
        code,
        deviceId: device(),
        deviceLabel: navigator.platform || 'Browser',
      });
      form.reset();
      if (role === 'parent') applyParent(data);
      else {
        state.admin = { sessionId: data.sessionId, data: data.dashboard };
        sessionStorage.setItem(SESSION_KEYS.admin, data.sessionId);
        applyAdmin();
      }
    } catch (err) {
      setStatus(target, err.message, 'error');
      notify(err.message, 'error');
    } finally {
      setBusy(button, false);
    }
  }

  function resetAuth(role) {
    state.auth[role + 'Email'] = '';
    setStatus(
      $(role === 'parent' ? '#portal-auth-status' : '#admin-auth-status'),
    );
    if (role === 'parent') {
      $('#parent-code-form').classList.add('hidden');
      $('#parent-login-form').classList.remove('hidden');
      $('.auth-switch', $('#portal-auth')).classList.remove('hidden');
    } else {
      $('#admin-code-form').classList.add('hidden');
      $('#admin-login-form').classList.remove('hidden');
    }
  }

  async function restoreSessions() {
    const parentToken = sessionStorage.getItem(SESSION_KEYS.parent),
      adminToken = sessionStorage.getItem(SESSION_KEYS.admin);
    if (parentToken)
      try {
        const d = await api('parentDashboard', { sessionId: parentToken });
        applyParent({
          sessionId: parentToken,
          parent: d.parent,
          dashboard: d.dashboard,
        });
      } catch (_) {
        sessionStorage.removeItem(SESSION_KEYS.parent);
      }
    if (adminToken)
      try {
        state.admin = {
          sessionId: adminToken,
          data: await api('adminDashboard', { sessionId: adminToken }),
        };
        applyAdmin();
      } catch (_) {
        sessionStorage.removeItem(SESSION_KEYS.admin);
        state.admin = null;
      }
  }
  return {
    parentAuthMode,
    signupParent,
    requestLoginCode,
    showCodeStep,
    verifyLoginCode,
    resetAuth,
    restoreSessions,
  };
};
