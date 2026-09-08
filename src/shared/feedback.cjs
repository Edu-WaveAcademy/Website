// Dependencies are supplied by the composition root; this module owns its feature behavior.
module.exports = function createFeedback({ $, EduwaveUI }) {
  function setStatus(el, text = '', type = '') {
    EduwaveUI.setStatus(el, text, type);
  }

  function setBusy(button, busy, label = 'Working...') {
    EduwaveUI.setBusy(button, busy, label);
  }

  function notify(message, type = 'success') {
    EduwaveUI.notify($('#toast-region'), message, type);
  }
  return { setStatus, setBusy, notify };
};
