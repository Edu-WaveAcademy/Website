# Eduwave Apps Script Backend

This folder contains the backend for Eduwave. It is designed to run as a Google Apps Script web app attached to a Google Sheet.

## What it does

- Validates portal logins using Eduwave usernames and hashed passwords
- Enforces one active session token per student
- Serves student dashboard details (fees, assigned resources) via session token checks
- Provides secure, server-validated Google Drive preview URLs without sharing raw file folders
- Logs access attempts in `AccessLogs`
- Stores trial class requests in `Trials`
- Stores payment notes in `Fees` and `Reminders`
- Allows admin workflows (Student Creation, Password Reset, Marking Fees Paid, Generating Reminders with WhatsApp click-to-chat links) authenticated via `ADMIN_KEY`

## Sheets required

Create one spreadsheet and add these tabs:

- `Students`
- `Accounts`
- `Trials`
- `Fees`
- `Resources`
- `Assignments`
- `Reminders`
- `AccessLogs`

You can also run `seedHeaders` once by sending:

```json
{ "action": "seedHeaders" }
```

## First password hash

The `Accounts.password_hash` field stores a SHA-256 hash. In Apps Script, temporarily run:

```javascript
Logger.log(hashPassword_('student-password'));
```

Copy the logged value into the `Accounts` sheet, then remove the temporary call.

## Admin Key Configuration

The admin endpoints require a header/payload parameter `adminKey`. The default key in `Code.gs` is:
```javascript
const ADMIN_KEY = 'eduwave-admin-secret-2026';
```
Be sure to update this key inside `Code.gs` before deploying to production.

## Endpoints Summary

### Actions (via POST payload `{ "action": "ACTION_NAME", ... }`)

1. **`seedHeaders`**: Seeds column headers on empty sheets.
2. **`submitTrial`**: Logs a new lead from the trial request form.
3. **`login`**: Authenticates user, creates session, and returns initial dashboard data.
4. **`logout`**: Clears session token for the student.
5. **`submitPaymentNote`**: Appends or updates fee records with a reference ID.
6. **`getDashboard`**: Fetches fresh student details using their active session token.
7. **`getResourcePreview`**: Validates assignment and returns secure `https://drive.google.com/file/d/{id}/preview` link.
8. **`adminCreateStudent`**: Creates a student and an account with hashed password. (Requires `adminKey`)
9. **`adminResetPassword`**: Resets a student's password hash. (Requires `adminKey`)
10. **`adminMarkFeePaid`**: Marks a student's month fee as paid. (Requires `adminKey`)
11. **`adminGenerateReminder`**: Logs a reminder in the queue and returns a WhatsApp link. (Requires `adminKey`)

## Deployment

1. Open script.google.com.
2. Create a project bound to the Eduwave spreadsheet.
3. Paste `Code.gs` into the project.
4. Add `appsscript.json`.
5. Deploy as a web app.
6. Set execution to your Google account.
7. Set access to `Anyone`.
8. Copy the web app URL into `script.js` by replacing `YOUR_APPS_SCRIPT_WEB_APP_URL`.
