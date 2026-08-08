# Eduwave Email Login Setup

The portal now uses passwordless email codes. Google OAuth client setup is no longer required.

## 1. Replace the Apps Script files

Open the academy spreadsheet as `studywitheduwaveacademy@gmail.com`, then open **Extensions > Apps Script**.

Replace:

- `Code.gs` with `apps-script/Code.gs`
- `appsscript.json` with `apps-script/appsscript.json`

If the manifest is hidden, open **Project Settings** and enable **Show appsscript.json manifest file in editor**.

## 2. Upgrade the Sheet schema

Select `setupEduwave` in the Apps Script function list and click **Run**.

Use **Run**, not **Debug**. The function is safe to rerun and now finishes without waiting for a blocking spreadsheet alert. If an older copy timed out after six minutes, check whether `Portal_LoginCodes` was already created, replace `Code.gs` with the current file, and run `setupEduwave` again.

Approve these permissions:

- View and update the academy spreadsheet
- Read academy Drive files
- Read Google Docs used for portal previews
- Send login-code emails as the academy account

After setup, select `authorizeEduwaveMail` and click **Run**. Approve the email permission when Google prompts you. The helper checks the remaining mail quota but does not send an email.

The function safely creates or extends:

- `Portal_Parents`: adds `email_verified_at`
- `Portal_Sessions`: adds `role` and `email`
- `Portal_LoginCodes`: stores single-use code HMACs and expiry information

It also creates a random `AUTH_SECRET` under **Project Settings > Script properties**. Do not copy that secret into the Sheet, website, or repository.

## 3. Confirm the academy allowlist

Open `Portal_Config` and confirm:

```text
admin_email | studywitheduwaveacademy@gmail.com
developer_email | diwij.narang2001@gmail.com
```

Both addresses can use Academy Login. The academy address is recorded as `admin`; the second address is recorded as `developer`. More addresses can be added to either row later as a comma-separated list. The public dialog never displays this allowlist.

## 4. Redeploy Apps Script

1. Open **Deploy > Manage deployments**.
2. Edit the current Web app deployment.
3. Select **New version**.
4. Set **Execute as** to `Me`.
5. Set **Who has access** to `Anyone`.
6. Deploy and finish the authorization prompt.

Confirm **Execute as** is `Me`. If it is set to the visitor, parents would be asked for Google permissions and login emails cannot be sent anonymously.

The `/exec` URL normally stays unchanged. If it changes, update `CONFIG.apiUrl` at the top of `script.js`.

## 5. Publish the website

Publish the branch containing the updated `index.html`, `style.css`, and `script.js` through GitHub Pages. Hard-refresh the site after deployment.

The Google Cloud OAuth client is no longer used. Leave it untouched until email login is verified, then it can be deleted or disabled.

## 6. End-to-end test

1. Open **Parent Portal > Create account**.
2. Submit a parent name and email.
3. Open **Academy Login**.
4. Request a code and check the academy inbox.
5. Enter the code and open **Families**.
6. Approve the new parent account.
7. Add or link a child to that parent.
8. Log out of the academy dashboard.
9. Open **Parent Portal > Sign in**.
10. Request and enter the code sent to the approved parent email.
11. Confirm that only linked children, assigned materials, fees, attendance, progress, and notices are visible.
12. Request another login from a different browser and confirm the older session is rejected.
13. Repeat Academy Login with `diwij.narang2001@gmail.com` and confirm the dashboard reports the `developer` role.

## Operational rules

- Do not manually add parents as Drive viewers.
- Do not make the master Sheet or Drive folder public.
- Approve signup requests only after confirming they belong to a real enrolled family.
- Ask the academy Gmail account owner to enable Google two-step verification.
- Never use a shared admin password. Academy access is controlled by the allowlisted email plus a one-time code.
- Check Apps Script **Executions** if an email or portal action fails.
- Login codes expire after 10 minutes and can be attempted five times.
- A maximum of three codes can be requested per approved email within 15 minutes.
