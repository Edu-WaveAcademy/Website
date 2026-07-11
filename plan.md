# Eduwave Trial Portal Plan

## Goal

Run a professional parent portal without paid hosting, databases, or messaging services during the trial. GitHub Pages hosts the website. Google Apps Script runs the protected API. One private Google Sheet is the operational database and the academy Drive remains the private content store.

## Architecture

```text
Parent or academy Google account
             |
GitHub Pages website -> Apps Script web app -> Portal_* tabs in Google Sheets
                                      |
                               Private academy Drive
```

The portal never adds parents as Drive viewers and never exposes permanent Drive links. Apps Script verifies an approved Google ID token, creates a short-lived session, checks the parent-child link, then returns an in-portal preview.

## Spreadsheet Migration

Run `setupEduwave()` from the Apps Script editor. It creates the following tabs without deleting or changing the legacy `Settings` tab:

- `Portal_Parents`: approved parent identity and contact details
- `Portal_Students`: child profile, fee amount, due day
- `Portal_ParentStudents`: family-to-child links
- `Portal_Sessions`: max-two-device session policy
- `Portal_Trials`: public trial requests
- `Portal_Fees`: monthly fee rows and parent payment references
- `Portal_DriveIndex`: metadata-only import of the academy master folder
- `Portal_Resources` and `Portal_Assignments`: approved material and child visibility
- `Portal_Attendance`, `Portal_Progress`, `Portal_Announcements`: learning updates
- `Portal_Reminders`: WhatsApp click-to-chat queue
- `Portal_AuditLogs`: login, content, admin, and session activity
- `Portal_Config`: academy email, Drive root ID, UPI ID, academy name

## Parent Experience

1. The academy adds and approves a parent Gmail address.
2. The parent signs in with that same Google account.
3. The dashboard opens linked children only.
4. A login notification tray shows current assignments, exam notices, and unpaid fees.
5. Materials render in the portal: Sheets as tables, Docs as text, PDFs and images as protected previews with an identity watermark.
6. The parent submits a UPI reference; the academy verifies it manually.

## Academy Experience

1. Use the single academy Google account to open Academy Login.
2. Add a parent, then add and link a child.
3. Scan the master Drive folder from Library. Only academy-owned, non-video files become publish candidates.
4. Publish an item, then assign it to a child.
5. Add attendance, progress notes, and an exam notice.
6. Generate monthly fee rows, verify payments, and create a prefilled WhatsApp reminder link.

## Security Boundaries

- Google ID tokens are verified by Apps Script.
- Admin access is limited to `studywitheduwaveacademy@gmail.com` in `Portal_Config`.
- Parent accounts are Gmail-based; there is no password sheet or hardcoded admin key.
- A third device sign-in revokes the oldest active session.
- Sessions expire after 60 minutes idle or 12 hours absolute.
- The Drive importer records metadata first and excludes externally owned content from publishing.
- Browser screenshot prevention is not technically reliable. Portal previews display a parent/time watermark and log opens instead.

## Deployment Sequence

1. Copy `apps-script/Code.gs` and `apps-script/appsscript.json` into the Apps Script project bound to the academy spreadsheet.
2. Run `setupEduwave()` once and authorize it.
3. Add `GOOGLE_CLIENT_ID` in Apps Script Project Settings > Script properties.
4. Deploy as a web app: execute as academy account, access for anyone. Keep the Sheet and Drive private.
5. Put the deployment URL and Google client ID into `script.js`.
6. Push the `codex/parent-admin-portal` branch for review. Publish to GitHub Pages only after the live acceptance check.

## Verification Checklist

- Parent Gmail denied before approval and accepted after approval.
- Third parent device revokes the oldest session.
- Parent can see only linked children and assigned items.
- Admin can scan, publish, and assign a demo Drive file.
- Parent login notification tray includes assignment, exam, and fee updates.
- Payment note changes fee status to `pending_verification`.
- Admin can mark paid and produce a WhatsApp click-to-chat reminder.
- No raw Drive URLs or old `Settings` credentials appear in the frontend.
