# Eduwave Apps Script Deployment

See `../plan.md` for the full architecture and migration order.

## One-time setup

1. Open the academy spreadsheet while signed in as `studywitheduwaveacademy@gmail.com`.
2. Open **Extensions > Apps Script**.
3. Replace the project files with `Code.gs` and `appsscript.json` from this folder.
4. Run `setupEduwave` and grant the requested permissions.
5. In **Project Settings > Script properties**, add `GOOGLE_CLIENT_ID` with the OAuth web client ID used by the GitHub Pages site.
6. Deploy as a web app. Use **Execute as: Me** and **Who has access: Anyone**.
7. Copy the deployed `/exec` URL into `script.js` as `CONFIG.apiUrl`, and set `CONFIG.googleClientId`.

The deployment endpoint can be public because every useful request is checked by a verified Google token or a valid portal session. Do not make the source Sheet or Drive folder public.

## Drive import

Use the Academy Login > Library screen. Paste the master folder ID, scan it, publish only academy-owned files, then assign each resource to a child. Historical student submissions are indexed as external and cannot be published.

## Trial constraints

PDFs and images must be at most 10 MB for protected in-portal viewing. Google Sheets and Docs are rendered by Apps Script. DOCX should be converted to Google Docs or PDF before publishing. Videos are intentionally excluded from parent delivery during the free trial.
