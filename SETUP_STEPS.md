# Eduwave Academy — Setup & Sign-In Fix

Step-by-step checklist to get **Sign in with Google** working on the live
site, in the right order. Each step is small and verifiable. Don't skip ahead.

> **Branches:** this repo uses two branches.
> - `main` is where ongoing work lives.
> - `gh-pages` is what GitHub Pages actually serves.
>
> After any code change, the fix only reaches the live site when it lands on
> `gh-pages`. The simplest way: commit on `main`, then run
> `git checkout gh-pages && git cherry-pick <sha> && git push origin gh-pages && git checkout main`.

---

## Part A — One-time Google Cloud Console setup

You need to do this in the browser, in your own Google account.

### Step 1. Open the Google Cloud project for Eduwave

1. Go to https://console.cloud.google.com/
2. At the top of the page, make sure the project picker shows
   **Edu-WaveAcademy** (the project whose number is `626070627425` —
   that's the project the OAuth client ID belongs to).

### Step 2. Add the live origin to Authorized JavaScript origins

The OAuth client ID
`1095668738635-22i312u56jq7bq4ac3l19pqs6t7htasl.apps.googleusercontent.com`
must be told which web origins are allowed to use it.

1. In the left menu: **APIs & Services → Credentials**.
2. On the **OAuth 2.0 Client IDs** row, click the client whose name ends in
   `…22i312u56jq7bq4ac3l19pqs6t7htasl.apps.googleusercontent.com`.
3. Scroll to **Authorized JavaScript origins**.
4. Click **Add URI** and add each of these (one at a time):
   - `https://edu-waveacademy.github.io`
   - `http://localhost:5500`  *(only if you also test on a local server)*
5. Click **Save**.

> If you serve the site from a different GitHub Pages URL, replace the
> `edu-waveacademy.github.io` origin with the actual one you use.

### Step 3. Fill out the OAuth consent screen

The "Access blocked / doesn't comply with OAuth 2.0" error almost always
comes from a missing or incomplete consent screen.

1. Left menu: **APIs & Services → OAuth consent screen**.
2. Pick **External** user type (unless you are inside a Google Workspace
   org that should only see this app — then **Internal**). Click **Create**.
3. Fill in the **App information** section:
   - **App name:** `Eduwave Academy`
   - **User support email:** `studywitheduwaveacademy@gmail.com`
4. Fill in **App domain**:
   - **Application home page:**
     `https://edu-waveacademy.github.io/Website/`
   - **Application privacy policy link:** create a `privacy.html` page
     in the repo first, then put its URL here, e.g.
     `https://edu-waveacademy.github.io/Website/privacy.html`
   - **Application terms of service link:** same idea, can point to a
     `terms.html` you add to the repo.
5. **Authorized domains:** click **Add Domain** and add `github.io`.
6. **Developer contact information:** `studywitheduwaveacademy@gmail.com`.
7. Click **Save and Continue**.

### Step 4. Add the required scopes

1. On the **Scopes** step of the consent screen, click
   **Add or Remove Scopes**.
2. Filter for / select these three:
   - `https://www.googleapis.com/auth/userinfo.email`
   - `https://www.googleapis.com/auth/userinfo.profile`
   - `openid`
3. Click **Update → Save and Continue**.

> `appsscript.json` in this repo also lists
> `script.external_request`, `spreadsheets`, and `drive.readonly` —
> those are for the Apps Script itself, not for the user's Google
> sign-in, so they don't go in the consent screen scopes list.

### Step 5. Add test users

Until you go through Google's full app-verification process, only the
Gmail addresses you add here will be able to sign in. That's normal
and what you want for now.

1. On the **Test users** step, click **Add Users**.
2. Add at minimum:
   - `studywitheduwaveacademy@gmail.com`
   - your own personal Gmail
3. Click **Save and Continue**.
4. Back on the summary page, the **Publishing status** will say
   **Testing**. **Leave it as Testing.** Do not click "Publish App"
   unless you intend to do the full Google verification (verified
   domain, privacy policy, demo video, etc.).

---

## Part B — Re-authorize the Apps Script deployment

Even though `appsscript.json` already declares
`https://www.googleapis.com/auth/script.external_request`, the deployed
Web App has to be re-authorized so that scope is granted for live calls.
This is a one-time step, in your browser, not in code.

### Step 6. Open the Apps Script project

1. Go to https://script.google.com/
2. Open the project that contains the `Code.gs` deployed as a Web App
   (the deployment URL is the same one in `script.js` line 3).

### Step 7. Redeploy with a new version

1. In the Apps Script editor, click **Deploy → Manage deployments**.
2. Find the active Web App deployment (it should show
   "Active" and have the URL ending in `/exec`).
3. Click the **pencil icon** ✏️ on that row.
4. Under **Version**, select **New version**. *(Important: re-deploying
   the same version won't trigger the OAuth consent flow.)*
5. Click **Deploy**.

### Step 8. Grant the new scopes

1. A **"Authorization required"** dialog should appear.
2. Click **Authorize access**.
3. Sign in with `studywitheduwaveacademy@gmail.com`.
4. Google may show **"Google hasn't verified this app"**. This is
   expected for internal/test projects. Click **Advanced → Go to
   (project name) (unsafe)**.
5. You'll see the four scopes listed. Click **Allow**.
6. The deployment is now live with all scopes granted.

> **If no "Authorization required" dialog appears in step 1**, do this
> fallback:
> 1. In the Apps Script editor, open the function dropdown at the top
>    (it usually says `doPost` or similar).
> 2. Select **`verifyGoogleToken_`** from the list.
> 3. Click **Run** ▶️.
> 4. The first time you run it, Google will pop the same authorization
>    dialog. Complete it.
> 5. After that, the Web App is authorized to call `UrlFetchApp.fetch`.

### Step 9. Verify the Apps Script can reach Google

1. In the Apps Script editor, run `verifyGoogleToken_` once with a
   dummy string argument. It should throw
   "Google sign-in could not be verified" — that's fine; it proves
   the function is reachable and `UrlFetchApp` is now allowed.
2. If it throws a `UrlFetchApp.fetch` permission error, repeat
   Step 8 — the scope grant didn't take.

---

## Part C — Verify on the live site

### Step 10. Hard-reload the site

1. Visit `https://edu-waveacademy.github.io/Website/`.
2. Press **Ctrl+Shift+R** (Windows/Linux) or **Cmd+Shift+R** (Mac) to
   bypass cache.

### Step 11. Try the parent sign-in

1. Click **Parent portal** in the header.
2. Click **Continue with Google**.
3. A real Google **Sign in with Google** button should now appear
   inside the dialog (rendered by GIS, not just the placeholder).
4. Click it. Pick your Google account.
5. Expected outcomes:
   - **Success** → you land in the parent dashboard.
   - **"This Google account is not yet approved for the Eduwave
     portal."** → your Gmail verified fine, but the `parents` sheet
     in your Apps Script-bound Google Sheet doesn't have a row for
     your email with `status=active`. See Part D below.
   - **"No response from Google"** (our watchdog message) → the
     Authorized JavaScript origins in Step 2 don't include the page's
     origin. Add it and try again.
   - **"Access blocked / doesn't comply with OAuth 2.0"** → a consent
     screen field is still missing. Re-check Part A.

### Step 12. Try the admin sign-in (optional)

1. Click **Academy login** in the header.
2. Sign in with `studywitheduwaveacademy@gmail.com` (this must match
   the `admin_email` script property).
3. You should land in the admin control room.

---

## Part D — If sign-in verifies but says "account not approved"

The Apps Script looks up the signed-in email in the **`parents`** sheet
of the Google Sheet that the Apps Script is bound to. The row must have:

| column | required value |
| --- | --- |
| `email` | the exact Gmail the user is signing in with |
| `status` | `active` (lowercase) |

1. Open the Google Sheet bound to the Apps Script.
2. Open the **`parents`** tab.
3. Add or edit a row:
   - `parent_id`: anything unique, e.g. `PAR-001`
   - `name`: the parent's display name
   - `email`: the Gmail they'll sign in with
   - `phone`: their WhatsApp number (optional but used for reminders)
   - `status`: `active`
4. Save the sheet. Reload the site and try again.

If you also want the parent to see a child, add a row to the
**`students`** tab and a row to the **`parent_student_links`** tab
(see `Code.gs` and `apps-script/README.md` for the exact column names).

---

## Part E — Local testing (optional)

To test on `http://localhost`:

1. Add `http://localhost:5500` (or your port) to Authorized JavaScript
   origins (Step 2).
2. From the repo folder, run a static server, e.g.:
   ```bash
   npx serve -p 5500 .
   ```
3. Visit `http://localhost:5500/` and run the same checks as Part C.

---

## Quick reference — common error messages

| Message you see | Cause | Fix |
| --- | --- | --- |
| `You do not have permission to call UrlFetchApp.fetch` | Apps Script deployment not yet granted `script.external_request` | Re-run Steps 7–8 |
| `This Google account is not yet approved for the Eduwave portal.` | Sign-in worked, but the Gmail is missing or `status≠active` in the `parents` sheet | Part D |
| `Access blocked: This app doesn't comply with OAuth 2.0 policy` | Consent screen incomplete, or you're not a test user | Re-run Steps 3 and 5 |
| `No response from Google` after clicking the button | Authorized JavaScript origins don't include the page origin | Re-run Step 2 |
| `Google sign-in was rejected: <something>` from our watchdog | Usually the OAuth client is misconfigured | Re-run Steps 2–5 |

---

## Branch & deployment cheat sheet

```bash
# Edit and commit on main
git checkout main
git add -A
git commit -m "Describe your change"

# Push to the deployment branch (gh-pages) without losing the separate main history
git checkout gh-pages
git cherry-pick <commit-sha-from-main>
git push origin gh-pages
git checkout main
```

GitHub Pages will redeploy within ~1 minute of the push.
