# Eduwave Email Authentication Migration

## What changed

- Removed Google Sign-In and all local demo-login behavior.
- Added parent account requests with `pending`, `active`, and `denied` states.
- Added email one-time codes through Apps Script `MailApp`.
- Added HMAC-protected login-code and session records.
- Added one-active-session enforcement for parent and academy accounts.
- Restricted Academy Login to `admin_email` and `developer_email` in `Portal_Config` without exposing either address in the dialog.
- Added parent approval and denial controls to the Families admin screen.
- Preserved the existing student, fee, resource, Drive index, assignment, attendance, progress, reminder, and audit records.

## Required migration

Replace both files under `apps-script`, run `setupEduwave`, and deploy a new Apps Script Web app version. The existing website cannot send login codes until the new backend version and mail permission are active.

See `SETUP_STEPS.md` for the exact sequence.

## Important behavior

Submitting **Create account** records a parent request but does not send an OTP or grant access. The academy approves the request first. Only approved parent emails and allowlisted academy or developer emails receive login codes.

Old Google-authenticated sessions become invalid after this deployment because new session identifiers are stored as HMAC values. Existing data remains intact.
