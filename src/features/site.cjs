// Dependencies are supplied by the composition root; this module owns its feature behavior.
module.exports = function createSite({
  $,
  $$,
  window,
  EduwaveUI,
  FormData,
  IntersectionObserver,
  api,
  setStatus,
  setBusy,
  notify,
  openDialog,
  closeDialog,
  syncDialogState,
  toggleNotifications,
  parentAuthMode,
  signupParent,
  requestLoginCode,
  verifyLoginCode,
  resetAuth,
  restoreSessions,
  parentLogout,
  adminLogout,
  adminPanel,
}) {
  function init() {
    const year = $('#year');
    if (year) year.textContent = new Date().getFullYear();

    const navToggle = $('.nav-toggle');
    const siteNav = $('#site-nav');
    if (navToggle && siteNav) {
      navToggle.addEventListener('click', () => {
        const expanded = navToggle.getAttribute('aria-expanded') === 'true';
        navToggle.setAttribute('aria-expanded', String(!expanded));
        navToggle.setAttribute(
          'aria-label',
          expanded ? 'Open navigation' : 'Close navigation',
        );
        siteNav.classList.toggle('open');
      });
      $$('#site-nav a').forEach((a) =>
        a.addEventListener('click', () => {
          navToggle.setAttribute('aria-expanded', 'false');
          navToggle.setAttribute('aria-label', 'Open navigation');
          siteNav.classList.remove('open');
        }),
      );
    }

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        (entries, ob) =>
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('visible');
              ob.unobserve(entry.target);
            }
          }),
        { threshold: 0.1, rootMargin: '0px 0px -40px' },
      );
      $$('.reveal').forEach((el) => observer.observe(el));
    } else $$('.reveal').forEach((el) => el.classList.add('visible'));

    $$('[data-open-portal]').forEach((b) =>
      b.addEventListener('click', () => openDialog('portal-dialog', b)),
    );
    $$('[data-open-admin]').forEach((b) =>
      b.addEventListener('click', () => openDialog('admin-dialog', b)),
    );
    $$('[data-close-dialog]').forEach((b) =>
      b.addEventListener('click', () => closeDialog(b.closest('dialog'))),
    );
    $('[data-close-viewer]')?.addEventListener('click', () =>
      closeDialog($('#viewer-dialog')),
    );
    $$('dialog').forEach((dialog) => {
      dialog.addEventListener('click', (event) => {
        if (event.target === dialog) closeDialog(dialog);
      });
      dialog.addEventListener('close', syncDialogState);
    });

    $('#trial-form')?.addEventListener('submit', trial);
    $$('[data-parent-auth]').forEach((b) =>
      b.addEventListener('click', () => parentAuthMode(b.dataset.parentAuth)),
    );
    $('#parent-login-form')?.addEventListener('submit', (e) =>
      requestLoginCode(e, 'parent'),
    );
    $('#parent-signup-form')?.addEventListener('submit', signupParent);
    $('#parent-code-form')?.addEventListener('submit', (e) =>
      verifyLoginCode(e, 'parent'),
    );
    $('#admin-login-form')?.addEventListener('submit', (e) =>
      requestLoginCode(e, 'admin'),
    );
    $('#admin-code-form')?.addEventListener('submit', (e) =>
      verifyLoginCode(e, 'admin'),
    );
    $$('[data-reset-auth]').forEach((b) =>
      b.addEventListener('click', () => resetAuth(b.dataset.resetAuth)),
    );
    $('#parent-logout')?.addEventListener('click', parentLogout);
    $('#admin-logout')?.addEventListener('click', adminLogout);
    $('#notification-button')?.addEventListener('click', toggleNotifications);
    $('#admin-tabs').addEventListener('click', (e) => {
      const b = e.target.closest('[data-admin-tab]');
      if (!b) return;
      $$('#admin-tabs button').forEach((x) => {
        x.classList.toggle('active', x === b);
        x.setAttribute('aria-selected', String(x === b));
      });
      adminPanel(b.dataset.adminTab);
    });

    $$('img').forEach((img) => {
      img.addEventListener('error', () => {
        img.style.display = 'none';
        const fallback = img.nextElementSibling;
        if (fallback && fallback.classList.contains('img-fallback'))
          fallback.style.display = 'flex';
      });
    });

    $$('form').forEach((form) => {
      form.addEventListener('submit', (e) => {
        if (!form.checkValidity()) {
          e.preventDefault();
          e.stopPropagation();
          const firstInvalid = form.querySelector(':invalid');
          if (firstInvalid) {
            firstInvalid.focus();
            firstInvalid.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
            });
          }
        }
        form.classList.add('was-validated');
      });
    });
    EduwaveUI.enhanceForms();
    EduwaveUI.tabs($('#admin-tabs'), { panel: $('#admin-content') });
    restoreSessions();
  }

  async function trial(e) {
    e.preventDefault();
    const form = e.currentTarget,
      target = $('#trial-status'),
      button = form.querySelector(
        'button[type="submit"],button:not([type]),input[type="submit"]',
      );
    if (!form.reportValidity()) return;
    setStatus(target, 'Sending your request...');
    setBusy(button, true, 'Sending request...');
    try {
      await api('submitTrial', Object.fromEntries(new FormData(form)));
      form.reset();
      form.classList.remove('was-validated');
      const message = 'Request received. The academy will confirm a slot.';
      setStatus(target, message, 'success');
      notify(message);
    } catch (err) {
      setStatus(target, err.message, 'error');
      notify(err.message, 'error');
    } finally {
      setBusy(button, false);
    }
  }
  return { init, trial };
};
