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

Parents request an account using their email. The request remains pending until approved from **Academy Login > Families**. Approved parents and allowlisted academy users sign in with a six-digit, single-use email code.

The backend stores HMAC values rather than raw codes or session tokens. One newer login revokes the previous session. Academy requests use the same passwordless flow but are accepted only for addresses listed under `admin_email` or `developer_email` in `Portal_Config`. Approved addresses are never shown in the public login dialog.

There is no demo login, Google OAuth client, parent password sheet, or hardcoded admin password.

## Main features

- Public programs, teaching approach, results, trial booking, FAQ, and contact sections
- Parent account request and approval workflow
- Parent dashboard for linked children only
- Assignment, exam, fee, attendance, and progress notifications
- Watermarked previews for uploaded PDFs and images, plus authenticated Office-file downloads
- Manual UPI payment-reference submission and verification
- Admin GUI for families, children, learning updates, resources, fees, reminders, and trials
- Manual current-syllabus uploads without exposing permanent Drive links to parents
- Audit records for authentication, access, and administrative actions

## Local preview

Serve this folder with any static HTTP server, then open the local URL. Authentication requests use the deployed Apps Script URL configured at the top of `script.js`.

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
5. Update `CONFIG.apiUrl` in `script.js` only if the `/exec` URL changes.

## Important files

- `index.html`: public site, parent login, and academy login markup
- `style.css`: shared responsive design system
- `script.js`: portal UI, sessions, API calls, parent and admin workflows
- `apps-script/Code.gs`: complete API, authorization, Sheet operations, and protected file storage
- `apps-script/appsscript.json`: Apps Script runtime and permission scopes
- `SETUP_STEPS.md`: deployment and acceptance test
- `IMPLEMENTATION_NOTES.md`: email-login migration summary
- `plan.md`: product architecture and verification checklist

## Security boundaries

- Keep the academy spreadsheet and `Eduwave Portal Uploads` folder private.
- Do not add parents as Drive viewers.
- Approve only known enrolled families.
- Enable two-step verification on `studywitheduwaveacademy@gmail.com`.
- Treat screenshots and screen recording as unavoidable; watermarks and audit logs deter redistribution but are not DRM.
- Apps Script mail quotas limit how many login emails can be sent each day.
