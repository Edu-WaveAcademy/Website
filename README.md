# Eduwave Academy Website and Portal

Eduwave is a static GitHub Pages website with a private parent portal and an academy administration dashboard. The backend runs on Google Apps Script, stores operational data in Google Sheets, stores only deliberately uploaded teaching files in a private Drive folder, and sends passwordless login codes by email.

## Stack

- GitHub Pages: `index.html`, `style.css`, `script.js`
- Google Apps Script: `apps-script/Code.gs`
- Google Sheets: `Portal_*` tabs
- Google Drive: private storage created for current portal uploads and student submissions
- Apps Script `MailApp`: parent and academy login codes
- WhatsApp click-to-chat: manually sent reminders

No paid host, database, payment gateway, or messaging provider is required for the trial phase.

## Authentication

Parents request an account using their email and required 10-digit mobile number. The request remains pending until approved from **Academy Login > Families**. Approved parents sign in with the matching email and mobile number, then receive a six-digit, single-use email code. Existing approved records with no saved mobile capture it on their next code request. Allowlisted academy users continue to use email and the one-time code only.

The backend stores HMAC values rather than raw codes or session tokens. One newer login revokes the previous session. Academy requests use the same passwordless flow but are accepted only for addresses listed under `admin_email` or `developer_email` in `Portal_Config`. Approved addresses are never shown in the public login dialog.

There is no demo login, Google OAuth client, parent password sheet, or hardcoded admin password.

## Main features

- Public programs, teaching approach, results, trial booking, FAQ, and contact sections
- Parent account request and approval workflow
- Parent dashboard for linked children only
- Assignment, exam, fee, attendance, and progress notifications
- Watermarked previews for uploaded PDFs and images, plus authenticated Office-file downloads
- Manual UPI payment-reference submission and verification
- Admin GUI for families, children, submissions, learning updates, resources, fees, reminders, and trials
- Reversible student departure controls and immediate per-assignment access revocation
- Current/former filters and reversible departure controls for both parents and students
- Searchable submission archive with student/month filters and ten records per page
- Manual current-syllabus uploads without exposing permanent Drive links to parents
- Audit records for authentication, access, and administrative actions

## Local preview

Serve this folder with any static HTTP server, then open the local URL. Authentication requests use the deployed Apps Script URL configured in `src/config.cjs`. After source edits, run `node tools/build.cjs` to regenerate `script.js` and `apps-script/Code.gs`. See [ARCHITECTURE.md](ARCHITECTURE.md) for module ownership, build commands, and regression checks.

Example:

```powershell
python -m http.server 4173
```

Open `http://localhost:4173/`.

## Backend deployment

Follow `SETUP_STEPS.md`. In summary:

1. Replace the Apps Script `Code.gs` and `appsscript.json` files.
2. Run `setupEduwave` again to add the authentication schema safely.
3. Authorize the email permission.
4. Deploy a new Web app version as the academy account with access set to Anyone.
5. Update `CONFIG.apiUrl` in `src/config.cjs` and rebuild only if the `/exec` URL changes.

## Important files

- `index.html`: public site, parent login, and academy login markup
- `style.css`: shared responsive design system
- `src/`: editable frontend feature modules, dependencies, state, and browser adapters
- `script.js`: generated browser bundle; rebuild after editing `src/`
- `apps-script/src/`: editable backend application, authorization, projections, and adapters
- `apps-script/Code.gs`: generated backend deployment artifact
- `apps-script/appsscript.json`: Apps Script runtime and permission scopes
- `SETUP_STEPS.md`: deployment and acceptance test
- `IMPLEMENTATION_NOTES.md`: email-login migration summary
- `plan.md`: product architecture and verification checklist
- `ui/README.md`: reusable component architecture, APIs, examples, and validation commands
- `ui/showcase.html`: interactive component reference (local examples; no API calls)

## Security boundaries

- Keep the academy spreadsheet and `Eduwave Portal Uploads` folder private.
- Do not add parents as Drive viewers.
- Approve only known enrolled families.
- Enable two-step verification on `studywitheduwaveacademy@gmail.com`.
- Treat screenshots and screen recording as unavoidable; watermarks and audit logs deter redistribution but are not DRM.
- Apps Script mail quotas limit how many login emails can be sent each day.

## Evidence log

### 2026-09-08 — Shared UI foundation

Branch `codex/unified-portal-revamp`, starting revision `f7df4a3`. Added dependency-free busy buttons, status messages, empty/loading/error states, keyboard tabs, toast behavior, and delegated form validation in `ui/`. Integrated the presentation layer into portal flows and added a runnable showcase and API documentation. Browser checks identified intrinsic grid overflow in the hero, parent section, and section introductions at 320px; shrinkable tracks and contained decorative overflow resolved it.

Validation: `node tests/site-structure.test.js`, `node tests/auth-flow.test.js`, and `git diff --check` passed. `node tests/ui-browser.test.js` passed with bundled Playwright through `NODE_PATH` and `UI_BROWSER_CHANNEL=msedge`: loading restoration (including disabled buttons and original DOM nodes), repeated submission prevention, escaped markup, keyboard tabs, validation feedback, toast dismissal, dialog focus restoration, reduced motion, and 320/375/768/1440px layout checks. Default Chromium was unavailable; sandboxed Edge launch returned EPERM; approved headless Edge execution succeeded. Screenshots are in `tests/ui-showcase-*.png` and `tests/ui-site-mobile.png`.

Status: local UI behavior verified; live authenticated dashboards, screen-reader output, other browser engines, and backend capacity remain unverified. Backend changes and dashboard-refactor tests appeared concurrently and were not authored by this UI task. Next focused check: staging parent/admin flows with representative data and assistive technology. No commit or deployment performed.
