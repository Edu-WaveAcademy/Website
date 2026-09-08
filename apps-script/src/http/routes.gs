// Apps Script HTTP entry points and unchanged response envelopes.

function doGet() {
  return json_(true, 'Eduwave portal API is online.', {
    version: '3.5',
    auth: 'email_otp',
    configured: !!getConfig_('admin_email')
  });
}

function doPost(e) {
  var requestStarted = Date.now(), requestSucceeded = false;
  try {
    var p = JSON.parse((e && e.postData && e.postData.contents) || '{}'),
      a = clean_(p.action),
      d;
    if (!a) throw new Error('Missing action.');
    switch (a) {
      case 'health':
        d = {
          version: '3.5',
          auth: 'email_otp',
          configured: !!getConfig_('admin_email')
        };
        break;
      case 'submitTrial':
        d = submitTrial_(p);
        break;
      case 'signupParent':
        d = signupParent_(p);
        break;
      case 'requestLoginCode':
        d = requestLoginCode_(p);
        break;
      case 'verifyLoginCode':
        d = verifyLoginCode_(p);
        break;
      case 'logout':
        d = logout_(p);
        break;
      case 'parentDashboard':
        d = parentDashboard_(p);
        break;
      case 'parentResource':
        d = parentResource_(p);
        break;
      case 'parentSubmitAssignment':
        d = parentSubmitAssignment_(p);
        break;
      case 'parentPaymentNote':
        d = parentPaymentNote_(p);
        break;
      case 'parentEvent':
        d = parentEvent_(p);
        break;
      case 'adminDashboard':
        d = adminDashboard_(p);
        break;
      case 'adminCreateFamily':
        d = adminCreateFamily_(p);
        break;
      case 'adminSetParentStatus':
        d = adminSetParentStatus_(p);
        break;
      case 'adminCreateStudent':
        d = adminCreateStudent_(p);
        break;
      case 'adminSetStudentStatus':
        d = adminSetStudentStatus_(p);
        break;
      case 'adminApproveTrial':
        d = adminApproveTrial_(p);
        break;
      case 'adminCreateAnnouncement':
        d = adminCreateAnnouncement_(p);
        break;
      case 'adminRecordAttendance':
        d = adminRecordAttendance_(p);
        break;
      case 'adminRecordProgress':
        d = adminRecordProgress_(p);
        break;
      case 'adminReviewSubmission':
        d = adminReviewSubmission_(p);
        break;
      case 'adminSubmissionFile':
        d = adminSubmissionFile_(p);
        break;
      case 'adminGenerateMonthlyFees':
        requireAdmin_(p.sessionId);
        d = generateMonthlyFees_();
        break;
      case 'adminMarkFeePaid':
        d = adminMarkFeePaid_(p);
        break;
      case 'adminQueueReminder':
        d = adminQueueReminder_(p);
        break;
      case 'adminUploadResource':
        d = adminUploadResource_(p);
        break;
      case 'adminAssignResource':
        d = adminAssignResource_(p);
        break;
      case 'adminRevokeAssignment':
        d = adminRevokeAssignment_(p);
        break;
      default:
        throw new Error('Unknown action.');
    }
    requestSucceeded = true;
    return json_(true, 'Success', d);
  } catch (err) {
    return json_(false, err && err.message ? err.message : 'Server error');
  } finally {
    try {
      console.info(JSON.stringify({event: 'portal_request', ok: requestSucceeded, duration_ms: Date.now() - requestStarted}));
    } catch (loggingError) { /* Logging must never change the API result. */ }
  }
}

function json_(ok, message, data) {
  return ContentService.createTextOutput(
    JSON.stringify({ ok: ok, message: message, data: data || {} })
  ).setMimeType(ContentService.MimeType.JSON);
}
