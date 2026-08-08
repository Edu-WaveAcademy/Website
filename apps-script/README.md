# Eduwave Apps Script Deployment

This folder contains the complete backend for the GitHub Pages website. It uses Google Sheets for records, Google Drive for academy material, and Apps Script `MailApp` for one-time login codes. Google OAuth is not used by parents or administrators.

## Upgrade the existing Apps Script project

1. Sign in as `studywitheduwaveacademy@gmail.com` and open the academy spreadsheet.
2. Open **Extensions > Apps Script**.
3. Replace the existing `Code.gs` with this folder's `Code.gs`.
4. Open **Project Settings**, enable **Show appsscript.json manifest file in editor**, and replace it with this folder's `appsscript.json`.
5. Select `setupEduwave` and click **Run**.
6. Approve the requested Sheets, Drive, Docs read-only, and send-email permissions. Drive write access is required only for the private resource and student-submission upload folders.
7. Select `authorizeEduwaveMail`, click **Run**, and approve the email permission. This checks quota without sending an email.

Running `setupEduwave` again is safe. It adds any missing portal columns, including assignment type and protected-submission metadata, generates a private `AUTH_SECRET` Script Property, and preserves all existing portal and legacy data.

Click **Run**, not **Debug**. If an earlier setup reached the six-minute limit, its blocking completion alert may have been waiting in the spreadsheet window. The current setup uses a non-blocking notification, so replace `Code.gs` and rerun it; completed tabs and records are preserved.

For an established Eduwave workbook where all portal tabs already exist, run `upgradeFileUploads` instead of the full setup. It updates only the resource, submission, and configuration headers needed by this release and is safe to rerun.

## Deploy the new backend version

1. Select **Deploy > Manage deployments**.
2. Edit the existing Web app deployment.
3. Choose **New version**.
4. Use **Execute as: Me**.
5. Use **Who has access: Anyone**.
6. Deploy and authorize the Drive and mail scopes when prompted.
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

## Add and assign learning material

Use **Academy Login > Library**.

1. Run `setupMaterialLibraryAutomation` once after deploying this version. It upgrades the catalogue tabs, imports the configured master Drive folder, and installs one hourly refresh trigger.
2. The Library reads its persistent catalogue from `Portal_Resources`; it does not load the full Drive tree whenever the page opens.
3. Supported, academy-owned files are added automatically as unassigned material. Their Drive folder path is retained and subject/class are inferred from file and folder names when possible.
4. Use **Assign material to a child**, add an optional due date, and save. Only this assigned material appears to that family.
5. Use **Upload from this device** only for a new scan or file that is not already inside the configured master folder.
6. For handwritten work, the child opens the assignment, answers in a notebook, and uploads one PDF, JPG, or PNG from the parent portal.
7. The academy opens **Learning**, previews the protected upload, adds feedback, and marks it reviewed or requests changes.

Apps Script creates `Eduwave Portal Uploads/Resources` and `Eduwave Portal Uploads/Student Submissions` in the academy account. Their IDs are stored in `Portal_Config`. Keep both folders private. Parents receive rendered previews or short-lived in-page file data; they are never added as Drive viewers and never receive a Drive ID.

The background import is resumable. `Portal_DriveSync` stores pending folders and Drive continuation tokens, so a large archive continues on the next run instead of starting again. The portal reports supported-material counts, folders remaining, and every skipped file with its full Drive path and reason. Typical skipped reasons are external ownership, unsupported archive/video format, Google Slides, or the 10 MB secure-delivery limit.

## View enrolled families

Use **Academy Login > Families** to see the academy enrolment directory. Each approved parent card shows the saved name, email, WhatsApp number, login-verification state, and every linked child with class, enrolment state, monthly fee, and due day. The directory can be searched by parent, child, email, phone, or class. Active students without an active parent link are highlighted separately so they can be corrected before a parent tries to sign in.

## Free-trial limits

Apps Script mail quotas apply to login emails. Google consumer accounts have daily recipient limits, so keep sessions active instead of requesting a code repeatedly. New uploads must be at most 8 MB; portal previews are capped at 10 MB. PDFs and images preview in the portal. Native Google Docs and Sheets render as controlled views. Word, Excel, and PowerPoint files are delivered as authenticated downloads. Videos and executable/archive formats remain excluded.
