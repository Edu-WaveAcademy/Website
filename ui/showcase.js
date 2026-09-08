/* Local-only, deterministic examples. Never calls the academy API. */
const UI = window.EduwaveUI;
UI.enhanceForms();
const region = document.querySelector('#toast-region');
document.querySelector('#example-states').innerHTML = [
  { kind: 'loading', title: 'Gathering your lessons', description: 'Your learning space will be ready shortly.' },
  { title: 'All caught up', description: 'New assignments will appear here when your teacher shares them.' },
  { kind: 'error', title: 'Lessons are unavailable', description: 'Check your connection and try again.' }
].map(UI.stateMarkup).join('');
document.querySelector('#example-form').addEventListener('submit', async event => {
  event.preventDefault();
  const button = event.currentTarget.querySelector('[type="submit"]');
  const output = document.querySelector('#example-status');
  UI.setBusy(button, true, 'Saving student…');
  UI.setStatus(output, 'Saving your example…');
  try {
    await new Promise(resolve => setTimeout(resolve, 1200));
    UI.setStatus(output, 'Example complete. No data was saved.', 'success');
    UI.notify(region, 'Student example completed.');
  } finally { UI.setBusy(button, false); }
});
document.querySelector('#example-error').addEventListener('click', () => UI.notify(region, 'Could not save. Your changes are still here; please try again.', 'error'));
const tabs = document.querySelector('#example-tabs');
const panel = document.querySelector('#example-panel');
const messages = ['New assignments will appear when your teacher shares them.', 'Attendance will appear after your next class.', 'Teacher notes will appear after your lessons.'];
function selectTab(button) {
  [...tabs.children].forEach((item, index) => {
    item.setAttribute('aria-selected', String(item === button));
    item.classList.toggle('active', item === button);
    if (item === button) panel.innerHTML = UI.stateMarkup({ title: `No ${item.textContent.toLowerCase()} yet`, description: messages[index] });
  });
}
tabs.addEventListener('click', event => { const button = event.target.closest('[role="tab"]'); if (button) selectTab(button); });
selectTab(tabs.firstElementChild);
UI.tabs(tabs, { panel });
