/* Framework-free presentation primitives. Domain actions stay in script.js. */
(() => {
  'use strict';
  const busyButtons = new WeakMap();
  const tabBindings = new WeakMap();
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

  function setBusy(button, busy, label = 'Working…') {
    if (!button) return;
    if (busy) {
      if (busyButtons.has(button)) return;
      busyButtons.set(button, { nodes: [...button.childNodes], disabled: button.disabled, ariaBusy: button.getAttribute('aria-busy') });
      button.textContent = label;
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');
      button.classList.add('is-busy');
    } else {
      const previous = busyButtons.get(button);
      if (!previous) return;
      button.replaceChildren(...previous.nodes);
      button.disabled = previous.disabled;
      if (previous.ariaBusy === null) button.removeAttribute('aria-busy');
      else button.setAttribute('aria-busy', previous.ariaBusy);
      button.classList.remove('is-busy');
      busyButtons.delete(button);
    }
  }

  function setStatus(element, message = '', tone = '') {
    if (!element) return;
    element.classList.remove('error', 'success');
    if (['error', 'success'].includes(tone)) element.classList.add(tone);
    element.classList.add('form-status');
    element.setAttribute('role', tone === 'error' ? 'alert' : 'status');
    element.setAttribute('aria-atomic', 'true');
    element.textContent = message;
  }

  // Returns escaped markup for the existing string-template renderers.
  function stateMarkup({ kind = 'empty', title, description = '' } = {}) {
    const mode = ['empty', 'loading', 'error'].includes(kind) ? kind : 'empty';
    const heading = title ?? {empty:'Nothing here yet', loading:'Loading…', error:'Unable to load'}[mode];
    return `<div class="ui-state ui-state--${mode}" role="${mode === 'error' ? 'alert' : 'status'}" aria-atomic="true"><span class="ui-state__mark" aria-hidden="true">${mode === 'loading' ? '' : mode === 'error' ? '!' : '—'}</span><strong>${escape(heading)}</strong>${description ? `<p>${escape(description)}</p>` : ''}</div>`;
  }

  function notify(region, message, tone = 'success') {
    if (!region || !message) return;
    const toast = document.createElement('div');
    toast.className = `toast ${tone === 'error' ? 'error' : 'success'}`;
    toast.setAttribute('role', tone === 'error' ? 'alert' : 'status');
    const text = document.createElement('p');
    text.textContent = message;
    const close = document.createElement('button');
    close.type = 'button';
    close.setAttribute('aria-label', 'Dismiss message');
    close.textContent = '×';
    let timer;
    const pause = () => clearTimeout(timer);
    const dismiss = () => { pause(); toast.remove(); };
    const resume = () => { pause(); if (tone !== 'error') timer = setTimeout(dismiss, 8000); };
    close.addEventListener('click', dismiss);
    toast.addEventListener('pointerenter', pause);
    toast.addEventListener('pointerleave', () => { if (!toast.contains(document.activeElement)) resume(); });
    toast.addEventListener('focusin', pause);
    toast.addEventListener('focusout', event => { if (!toast.contains(event.relatedTarget)) resume(); });
    toast.append(text, close);
    region.append(toast);
    resume();
    return dismiss;
  }

  /** Bind once to a stable tablist. Call sync after replacing its children. */
  function tabs(root, { panel } = {}) {
    if (!root) return;
    if (tabBindings.has(root)) { tabBindings.get(root).sync(); return tabBindings.get(root); }
    const items = () => [...root.querySelectorAll('[role="tab"]')];
    function sync() {
      const buttons = items();
      const selected = buttons.find(button => button.getAttribute('aria-selected') === 'true') || buttons[0];
      buttons.forEach((button, index) => {
        button.id ||= `${root.id}-tab-${index}`;
        button.tabIndex = button === selected ? 0 : -1;
        if (panel) button.setAttribute('aria-controls', panel.id);
      });
      if (panel && selected) {
        panel.setAttribute('role', 'tabpanel');
        panel.setAttribute('aria-labelledby', selected.id);
        panel.tabIndex = 0;
      }
    }
    function keydown(event) {
      if (!event.target.closest('[role="tab"]')) return;
      const buttons = items().filter(button => !button.disabled);
      const index = buttons.indexOf(event.target.closest('[role="tab"]'));
      const vertical = root.getAttribute('aria-orientation') === 'vertical';
      const next = vertical ? 'ArrowDown' : 'ArrowRight';
      const previous = vertical ? 'ArrowUp' : 'ArrowLeft';
      if (![next, previous, 'Home', 'End'].includes(event.key) || !buttons.length) return;
      event.preventDefault();
      const target = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (event.key === next ? 1 : -1) + buttons.length) % buttons.length;
      buttons[target].click();
      sync();
      // A domain renderer may have replaced the button during click.
      items().find(button => button.tabIndex === 0)?.focus();
    }
    const click = () => queueMicrotask(sync);
    root.addEventListener('keydown', keydown);
    root.addEventListener('click', click);
    const binding = { sync, destroy() { root.removeEventListener('keydown', keydown); root.removeEventListener('click', click); tabBindings.delete(root); } };
    tabBindings.set(root, binding);
    sync();
    return binding;
  }

  function enhanceForms(root = document) {
    const invalid = event => event.target.setAttribute('aria-invalid', 'true');
    const input = event => { if (event.target.validity?.valid) event.target.removeAttribute('aria-invalid'); };
    const submit = event => {
      if (event.target.querySelector('button[aria-busy="true"]')) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };
    root.addEventListener('invalid', invalid, true);
    root.addEventListener('input', input);
    root.addEventListener('submit', submit, true);
    return () => { root.removeEventListener('invalid', invalid, true); root.removeEventListener('input', input); root.removeEventListener('submit', submit, true); };
  }

  window.EduwaveUI = Object.freeze({ setBusy, setStatus, stateMarkup, notify, tabs, enhanceForms });
})();
