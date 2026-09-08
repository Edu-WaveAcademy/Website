// Dependencies are supplied by the composition root; this module owns its feature behavior.
module.exports = function createDialogs({ $, $$, document }) {
  let lastDialogTrigger = null;
  function openDialog(id, trigger) {
    const dialog = $('#' + id);
    if (!dialog || dialog.open) return;
    lastDialogTrigger = trigger || document.activeElement;
    dialog._returnFocus = lastDialogTrigger;
    dialog.showModal();
    document.body.classList.add('dialog-open');
  }

  function closeDialog(dialog) {
    if (dialog?.open) dialog.close();
  }

  function syncDialogState(event) {
    const dialog = event?.currentTarget;
    dialog?._returnFocus?.focus?.();
    if (dialog) dialog._returnFocus = null;
    if (!$$('dialog[open]').length) {
      document.body.classList.remove('dialog-open');
      lastDialogTrigger = null;
    }
  }

  function toggleNotifications() {
    const panel = $('#notification-panel'),
      button = $('#notification-button');
    if (!panel || !button) return;
    const opening = panel.classList.contains('hidden');
    panel.classList.toggle('hidden', !opening);
    button.setAttribute('aria-expanded', String(opening));
  }

  function confirmAdminAction(
    { title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel' },
    trigger,
  ) {
    const dialog = $('#confirm-dialog'),
      accept = $('#confirm-accept'),
      cancel = $('#confirm-cancel');
    $('#confirm-heading').textContent = title;
    $('#confirm-message').textContent = message;
    accept.textContent = confirmLabel;
    cancel.textContent = cancelLabel;
    openDialog('confirm-dialog', trigger);
    return new Promise((resolve) => {
      let settled = false;
      const finish = (value) => {
        if (settled) return;
        settled = true;
        if (dialog.open) dialog.close();
        resolve(value);
      };
      accept.onclick = () => finish(true);
      cancel.onclick = () => finish(false);
      dialog.addEventListener('close', () => finish(false), { once: true });
    });
  }
  return {
    openDialog,
    closeDialog,
    syncDialogState,
    toggleNotifications,
    confirmAdminAction,
  };
};
