# Eduwave Apps Script Deployment

This folder contains the complete backend for the GitHub Pages website. It uses Google Sheets for records, Google Drive for academy material, and Apps Script `MailApp` for one-time login codes. Google OAuth is not used by parents or administrators.

## Upgrade the existing Apps Script project

1. Sign in as `studywitheduwaveacademy@gmail.com` and open the academy spreadsheet.
2. Open **Extensions > Apps Script**.
3. Replace the existing `Code.gs` with this folder's `Code.gs`.
4. Open **Project Settings**, enable **Show appsscript.json manifest file in editor**, and replace it with this folder's `appsscript.json`.
5. Select `setupEduwave` and click **Run**.
6. Approve the requested Sheets, Drive read-only, Docs read-only, and send-email permissions.

Running `setupEduwave` again is safe. It adds `Portal_LoginCodes`, extends `Portal_Parents` and `Portal_Sessions`, generates a private `AUTH_SECRET` Script Property, and preserves all existing portal and legacy data.

Click **Run**, not **Debug**. If an earlier setup reached the six-minute limit, its blocking completion alert may have been waiting in the spreadsheet window. The current setup uses a non-blocking notification, so replace `Code.gs` and rerun it; completed tabs and records are preserved.

## Deploy the new backend version

1. Select **Deploy > Manage deployments**.
2. Edit the existing Web app deployment.
3. Choose **New version**.
4. Use **Execute as: Me**.
5. Use **Who has access: Anyone**.
6. Deploy and authorize the new mail scope when prompted.
7. Keep the existing `/exec` URL. If Google issues a different URL, replace `CONFIG.apiUrl` in `../script.js`.

No `GOOGLE_CLIENT_ID` property is needed. An old property can be deleted after the email-code deployment is working.

## First live test

1. Submit a parent account request from the website.
2. Sign in through **Academy login** using an address allowlisted in `Portal_Config` and the code sent to that inbox.
3. Open **Families** and approve the pending parent.
4. Link or create the child under that approved parent.
5. Log out and request a parent code using the approved email.
6. Confirm the parent sees only linked children and assigned resources.

## Security behavior

- Signup creates a `pending` parent and never grants immediate access.
- Login codes are valid for 10 minutes, single-use, and limited to five attempts.
- Only HMAC values are stored for login codes and sessions.
- One newer login revokes the previous session for that email.
- Academy access is allowlisted through `admin_email` and `developer_email` in `Portal_Config`.
- `studywitheduwaveacademy@gmail.com` is the admin and `diwij.narang2001@gmail.com` is the developer by default.
- Approved academy addresses are not rendered in the website login dialog.
- The browser stores the active opaque session in `sessionStorage`, not a reusable password.
- The master Sheet and Drive folder must remain private.

## Drive import

Use **Academy Login > Library**. Paste the master folder ID, scan it, publish only academy-owned files, and assign resources to children. Parents receive rendered portal previews; they are not added as Drive viewers.

## Free-trial limits

Apps Script mail quotas apply to login emails. Google consumer accounts currently have a daily recipient limit, so keep sessions active instead of requesting a code repeatedly. PDFs and images must be at most 10 MB for portal preview. Convert DOCX files to Google Docs or PDF before publishing; videos remain excluded.
