# Eduwave Portal Status

## Live backend
The Google Apps Script web app is deployed at the URL in `script.js`. The portal schema is present in the existing spreadsheet as `Portal_*` tabs. The old `Settings` tab was not changed.

## Completed verification
- Parent demo dashboard: assignment, exam, and fee notifications appear on login.
- Resource preview: an assigned Google Sheet renders as a watermarked table in the portal.
- Admin demo: Drive index, resource publishing, and child assignment complete through the GUI.

## Before production parent/admin Google login
1. Create a Google OAuth Web client ID in the Google Cloud project owned by `studywitheduwaveacademy@gmail.com`.
2. Add `https://edu-waveacademy.github.io` as an authorised JavaScript origin.
3. Set Apps Script property `GOOGLE_CLIENT_ID` to that client ID.
4. Replace `YOUR_GOOGLE_CLIENT_ID` in `script.js` with the same client ID.
5. Deploy the GitHub Pages branch only after the above is configured.

The Apps Script URL is public by design; it is not a secret. Google ID-token validation and the parent-to-child mapping enforce access.