# Eduwave Trial Portal Plan

## Goal

Run a professional parent portal without paid hosting, databases, or messaging services during the trial. GitHub Pages hosts the website. Google Apps Script runs the protected API. One private Google Sheet is the operational database and a private portal-created Drive folder stores only current manual uploads and student submissions.

## Architecture

```text
Parent or academy email code
             |
GitHub Pages website -> Apps Script web app -> Portal_* tabs in Google Sheets
                                      |
                         Private portal upload folder
```

The portal never adds parents as Drive viewers and never exposes permanent Drive links. Apps Script sends a one-time code only to an approved email, creates a short-lived session, checks the parent-child link, then returns an in-portal preview.

## Spreadsheet Migration

Run `setupEduwave()` from the Apps Script editor. It creates the following tabs without deleting or changing the legacy `Settings` tab:

- `Portal_Parents`: pending and approved parent identity and contact details
- `Portal_Students`: child profile, fee amount, due day
- `Portal_ParentStudents`: family-to-child links
- `Portal_Sessions`: HMAC-protected parent and admin sessions
- `Portal_LoginCodes`: single-use login-code HMACs, expiry, and attempt count
- `Portal_Trials`: public trial requests
- `Portal_Fees`: monthly fee rows and parent payment references
- `Portal_DriveIndex`: internal metadata for files uploaded through Eduwave only
- `Portal_Resources` and `Portal_Assignments`: approved material and child visibility
- `Portal_Attendance`, `Portal_Progress`, `Portal_Announcements`: learning updates
- `Portal_Reminders`: WhatsApp click-to-chat queue
- `Portal_AuditLogs`: login, content, admin, and session activity
- `Portal_Config`: academy email, private upload-folder IDs, UPI ID, academy name

## Parent Experience

1. A parent requests access with their email and required mobile number, or the academy creates the parent directly.
2. The academy approves the request and links the child.
3. The parent enters the approved email and matching mobile number, then signs in using a one-time code sent to the approved email.
4. The dashboard opens linked children only.
5. A login notification tray shows current assignments, exam notices, and unpaid fees.
6. Uploaded PDFs and images render as protected previews; Office files use authenticated downloads.
7. The parent submits a UPI reference; the academy verifies it manually.

## Academy Experience

1. Request an Academy Login code for the single allowlisted academy email.
2. Add a parent, then add and link a child.
3. Upload one current-syllabus file from Library and add its title, subject, and class.
4. Assign the uploaded item to a child.
5. Review uploaded work from Submissions, filtered by child or month in pages of ten.
6. Revoke individual material access from Library when an assignment is finished.
7. Mark a child as left from Families to remove portal access without deleting academy history.
8. Add attendance, progress notes, and an exam notice.
9. Generate monthly fee rows, verify payments, and create a prefilled WhatsApp reminder link.

## Security Boundaries

- Login codes expire after 10 minutes, are single-use, and are stored only as HMAC values.
- Admin access is limited to `studywitheduwaveacademy@gmail.com` in `Portal_Config`.
- Parent accounts can use any valid email provider; there is no password sheet or hardcoded admin key.
- A new login revokes the previous session for that account.
- Sessions expire after 60 minutes idle or 12 hours absolute.
- Admin sessions expire after 30 minutes idle or 8 hours absolute.
- No existing Drive folder is scanned. Only files deliberately uploaded through the academy portal enter the material library.
- Browser screenshot prevention is not technically reliable. Portal previews display a parent/time watermark and log opens instead.

## Deployment Sequence

1. Copy `apps-script/Code.gs` and `apps-script/appsscript.json` into the Apps Script project bound to the academy spreadsheet.
2. Run `setupEduwave()` once and authorize it.
3. Deploy as a web app: execute as academy account, access for anyone. Keep the Sheet and Drive private.
4. Put the deployment URL into `script.js` if it changed.
5. Publish the GitHub Pages branch only after the live acceptance check.

## Verification Checklist

- Parent email receives no code before approval and can sign in after approval.
- A second login revokes the older session.
- Parent can see only linked children and assigned items.
- Marking a child as left hides the child, revokes published assignments, and preserves submissions.
- Revoking one assignment blocks the resource immediately and keeps its submitted work.
- Submissions can be filtered by child and month and are paginated ten at a time.
- Admin can upload and assign a current PDF, image, Word, Excel, PowerPoint, RTF, or text file.
- Parent login notification tray includes assignment, exam, and fee updates.
- Payment note changes fee status to `pending_verification`.
- Admin can mark paid and produce a WhatsApp click-to-chat reminder.
- No raw Drive URLs or old `Settings` credentials appear in the frontend.
