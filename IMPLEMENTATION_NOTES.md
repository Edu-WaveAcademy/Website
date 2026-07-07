# Eduwave Trial Implementation Notes

## What was implemented

- redesigned the site around Home, Programs, Trial Class, Student Portal, Fee Info, About, FAQ, and Contact
- replaced the old folder-link login modal with a portal login and dashboard shell
- added a payment-note submission flow for manual UPI verification
- added an admin workflow preview modal
- removed visible broken character encoding text
- fixed the duplicated navbar SVG structure
- added a free-stack Apps Script backend scaffold

## Frontend config

Replace this placeholder in `script.js`:

```javascript
const API_BASE_URL = 'YOUR_APPS_SCRIPT_WEB_APP_URL';
```

Until that value is replaced, the site runs in demo mode for login and trial flows.

## Honest limitation

This implementation now has the correct free-stack architecture, but true read-only Drive and Sheet rendering still depends on how the legacy content is organized. That next step belongs in Apps Script proxy endpoints.
