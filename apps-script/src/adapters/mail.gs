// Login email delivery and authorization error translation.

function mailPermissionError_(err) {
  return /permission|authoriz|script\.send_mail/i.test(
    String((err && err.message) || err)
  );
}

function mailQuota_() {
  try {
    return MailApp.getRemainingDailyQuota();
  } catch (err) {
    if (mailPermissionError_(err))
      throw new Error(
        'Academy email needs one-time authorization. Run authorizeEduwaveMail in Apps Script, then deploy a new web app version.'
      );
    throw err;
  }
}

function sendLoginCode_(email, code, role) {
  var academy = getConfig_('academy_name') || 'Eduwave Academy',
    label = role === 'admin' ? 'academy administration' : 'parent portal',
    subject = academy + ' login code',
    plain =
      'Your ' +
      academy +
      ' code is ' +
      code +
      '. It expires in ' +
      OTP_EXPIRY_MINUTES +
      ' minutes. If you did not request this code, ignore this email.',
    html =
      '<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:28px;color:#1d2a25"><p style="font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#596861">' +
      academy +
      ' · ' +
      label +
      '</p><h1 style="font-size:24px">Your secure login code</h1><p>Enter this code on the Eduwave website:</p><p style="font-size:32px;font-weight:700;letter-spacing:.24em;background:#f3f1e8;padding:16px 20px;border-radius:12px">' +
      code +
      '</p><p>This code expires in ' +
      OTP_EXPIRY_MINUTES +
      ' minutes and can be used once.</p><p style="color:#596861;font-size:13px">If you did not request it, you can safely ignore this email.</p></div>';
  try {
    MailApp.sendEmail({
      to: email,
      subject: subject,
      body: plain,
      htmlBody: html,
      name: academy
    });
  } catch (err) {
    if (mailPermissionError_(err))
      throw new Error(
        'Academy email needs one-time authorization. Run authorizeEduwaveMail in Apps Script, then deploy a new web app version.'
      );
    throw err;
  }
}

function authorizeEduwaveMail() {
  var quota = MailApp.getRemainingDailyQuota();
  try {
    SpreadsheetApp.getActive().toast(
      'Login email is authorized. Remaining daily quota: ' + quota + '.',
      'Eduwave Portal',
      5
    );
  } catch (_) {}
  return { authorized: true, remainingDailyQuota: quota };
}
