# Eduwave Email Authentication Migration

## What changed

- Removed Google Sign-In and all local demo-login behavior.
- Added parent account requests with `pending`, `active`, and `denied` states.
- Added email one-time codes through Apps Script `MailApp`.
- Added HMAC-protected login-code and session records.
- Added one-active-session enforcement for parent and academy accounts.
- Restricted Academy Login to `admin_email` and `developer_email` in `Portal_Config` without exposing either address in the dialog.
- Added parent approval and denial controls to the Families admin screen.
- Preserved family, student, fee, attendance, progress, reminder, current portal-upload, and audit records.
- Retired the obsolete Drive archive importer after the syllabus changed.
- Removed automatic scanning, folder selection, hourly refresh jobs, and archive-only permissions.
- Kept manual current-material uploads and secure student-submission storage.
- Added reversible student departure controls that disable parent access and revoke active assignments without deleting history.
- Added per-assignment access revocation from the Library.
- Moved submitted work into a dedicated archive with student/month filters and ten-item pagination.

## Required migration

Replace both files under `apps-script`, remove the old scanner triggers, run `retireLegacyDriveArchive` once, run `setupEduwave`, and deploy a new Apps Script Web app version.

See `SETUP_STEPS.md` for the exact sequence.

## Important behavior

Submitting **Create account** records a parent request but does not send an OTP or grant access. The academy approves the request first. Only approved parent emails and allowlisted academy or developer emails receive login codes.

Old Google-authenticated sessions become invalid after this deployment because new session identifiers are stored as HMAC values. Existing data remains intact.
