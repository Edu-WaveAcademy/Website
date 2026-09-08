# Eduwave UI

A dependency-free presentation layer for the existing static product. Open `/ui/showcase.html` through the local HTTP server for interactive usage examples. It never calls the backend.

## Component architecture

```text
style.css                 Brand tokens and existing product layout
ui/components.css         Shared states, focus, motion and touch targets
ui/components.js          EduwaveUI: reusable presentation behavior
script.js                 Domain state, API calls and page composition
ui/showcase.*             Isolated interactive reference
tests/ui-browser.test.js  Browser regression coverage
```

Load `components.css` after `style.css`, and `components.js` before consumers. The single frozen `window.EduwaveUI` namespace avoids a build requirement. Components have no knowledge of accounts, sessions, network calls, or application state. Existing portal renderers migrate incrementally; this is not a complete rewrite of the legacy stylesheet or application.

## Props / API

| Component | API | Contract |
| --- | --- | --- |
| Busy button | `setBusy(button, busy, label?)` | Native button; default label `Working…`. Repeated `true` is idempotent. Restores original nodes, disabled state and `aria-busy`. Use `finally` to release. |
| Inline status | `setStatus(element, message?, tone?)` | `tone`: `success`, `error`, or empty. Preserves layout classes; error uses alert semantics. Keep the element mounted before updating. |
| Content state | `stateMarkup({kind?, title?, description?})` | `kind`: `empty`, `loading`, `error`. Returns escaped HTML for existing template renderers. No raw HTML props. Supply specific next steps. |
| Toast | `notify(region, message, tone?)` | Returns a dismissal callback. Success dismisses after 8 seconds, paused during focus/hover; errors persist. Region must not itself be a live region, avoiding duplicate announcements. |
| Tabs | `tabs(root, {panel?})` | Stable, uniquely identified tablist; native buttons with `role=tab` and domain-managed `aria-selected`. Optional shared dynamic panel requires an ID. Returns `{sync, destroy}`. Arrow/Home/End activate; Tab enters the panel. Call `sync` after programmatic selection or replacing buttons. |
| Form behavior | `enhanceForms(root?)` | Defaults to document. Delegated invalid/input handling and duplicate submission guard, including dynamically inserted forms. Returns cleanup callback. Bind once per root. |

## Usage

```js
const UI = window.EduwaveUI;
UI.enhanceForms(); // once during app initialization

async function save(button, output) {
  UI.setBusy(button, true, 'Saving…');
  UI.setStatus(output, 'Saving your changes…');
  try {
    await saveRecord(); // domain-owned operation
    UI.setStatus(output, 'Changes saved.', 'success');
  } catch (error) {
    UI.setStatus(output, 'Could not save. Your changes are still here.', 'error');
  } finally {
    UI.setBusy(button, false);
  }
}

list.innerHTML = UI.stateMarkup({
  title: 'No matching assignments',
  description: 'Clear the filters to see all assignments.'
});
```

Use a persistent visible `<label>` for every field, `aria-describedby` for hints, native validation attributes, and explicit button types. Native dialogs remain the product's modal primitive: `showModal()` handles focus containment and Escape; existing dialog code restores the opening trigger.

## Best practices and boundaries

- Keep API operations, authorization, retries, and data normalization outside UI components. Do not retry mutations automatically: a lost response may still represent a successful write.
- Use text content or escaped state props for untrusted strings. Busy labels never accept HTML; original button nodes are retained so icon behavior survives restoration.
- Loading disables only the initiating action. Keep user input after failures. The submit guard prevents repeat submission within a busy form; backend idempotency is still needed for distributed correctness.
- Use inline feedback for form outcomes. Reserve toasts for cross-page feedback; avoid announcing the same error in both places when migrating older flows.
- Empty, filtered-empty, loading, and failure are different states. Explain the next useful action, and never present fabricated records as real data.
- Keep tables scrollable inside their own containers and use grid `minmax(0,1fr)` for shrinkable cards. Test at 320px, desktop, zoom, keyboard-only, reduced motion, and forced colors.
- Tabs here use automatic activation for locally available panels. Fetch-driven tabs should use manual activation or cache content to avoid a network request for each arrow key.
- Destroy bindings when removing persistent widgets. Avoid attaching listeners after every render; this layer uses delegation and WeakMaps.
- This frontend change does not establish million-user capacity: the current Apps Script/Sheets backend and large directory rendering need separate load testing, server pagination, observability, and capacity work before such a rollout.

## Verification

```powershell
node tests/site-structure.test.js
node tests/auth-flow.test.js
python -m http.server 4173
# In another terminal, with Playwright available through NODE_PATH:
node tests/ui-browser.test.js
# To use an installed Edge instead of bundled Chromium:
$env:UI_BROWSER_CHANNEL='msedge'
node tests/ui-browser.test.js
```

The browser suite uses only local pages and blocks backend requests. No account writes or login emails are sent. Authenticated data screens still require staging verification with representative accounts and assistive technology.
