// Passwordless login, rate limits and single-use codes.

function requestLoginCode_(p) {
  var email = validEmail_(p.email),
    role = clean_(p.role).toLowerCase() === 'admin' ? 'admin' : 'parent',
    device = clean_(p.deviceId) || 'unknown-device',
    phone = role === 'parent' ? phone_(p.phone) : '',
    eligible = false,
    actorId = '';
  if (!email) throw new Error('Enter a valid email address.');
  if (role === 'parent' && !phone)
    throw new Error('Enter a valid 10-digit mobile number.');
  if (role === 'admin') {
    eligible = adminEmails_().indexOf(email) !== -1;
    actorId = email;
  } else {
    var parent = first_(PORTAL.parents, function (r) {
        return (
          email_(r.email) === email &&
          clean_(r.status).toLowerCase() === 'active'
        );
      }),
      savedPhone = parent ? phone_(parent.phone) : '';
    eligible = !!parent && (!savedPhone || savedPhone === phone);
    actorId = parent ? parent.parent_id : email;
    if (parent && eligible && !savedPhone)
      update_(PORTAL.parents, parent._row, {
        phone: phone,
        updated_at: stamp_()
      });
  }
  if (!eligible) return { sent: true, expiresMinutes: OTP_EXPIRY_MINUTES };
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var now = Date.now(),
      recent = rows_(PORTAL.loginCodes).filter(function (r) {
        var created = Date.parse(r.created_at);
        return (
          r.email === email &&
          r.role === role &&
          created &&
          !isNaN(created) &&
          now - created < OTP_WINDOW_MINUTES * 60000
        );
      });
    if (recent.length >= OTP_REQUEST_LIMIT) {
      audit_('system', actorId, 'login_code_rate_limited', role, '', email);
      return { sent: true, expiresMinutes: OTP_EXPIRY_MINUTES };
    }
    if (mailQuota_() < 1)
      throw new Error(
        'Login email service is temporarily unavailable. Please contact the academy.'
      );
    rows_(PORTAL.loginCodes)
      .filter(function (r) {
        return r.email === email && r.role === role && !r.used_at;
      })
      .forEach(function (r) {
        update_(PORTAL.loginCodes, r._row, { used_at: stamp_() });
      });
    var codeId = id_('OTP'),
      code = otp_(),
      row = {
        code_id: codeId,
        email: email,
        role: role,
        code_hmac: authHash_(
          'otp|' + codeId + '|' + email + '|' + role + '|' + code
        ),
        device_hash: hash_(device),
        created_at: stamp_(),
        expires_at: stamp_(new Date(now + OTP_EXPIRY_MINUTES * 60000)),
        attempts: '0',
        used_at: ''
      };
    append_(PORTAL.loginCodes, row);
    try {
      sendLoginCode_(email, code, role);
    } catch (err) {
      var saved = first_(PORTAL.loginCodes, function (r) {
        return r.code_id === codeId;
      });
      if (saved) update_(PORTAL.loginCodes, saved._row, { used_at: stamp_() });
      throw err;
    }
    audit_('system', actorId, 'login_code_sent', role, codeId, email);
  } finally {
    lock.releaseLock();
  }
  return { sent: true, expiresMinutes: OTP_EXPIRY_MINUTES };
}

function verifyLoginCode_(p) {
  var email = validEmail_(p.email),
    role = clean_(p.role).toLowerCase() === 'admin' ? 'admin' : 'parent',
    code = clean_(p.code),
    device = clean_(p.deviceId) || 'unknown-device';
  if (!email || !/^[0-9]{6}$/.test(code))
    throw new Error('Enter the six-digit code from your email.');
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var row = rows_(PORTAL.loginCodes)
      .filter(function (r) {
        return (
          r.email === email &&
          r.role === role &&
          !r.used_at &&
          r.device_hash === hash_(device)
        );
      })
      .sort(newest_)[0];
    if (
      !row ||
      row.expires_at < stamp_() ||
      Number(row.attempts) >= OTP_MAX_ATTEMPTS
    ) {
      if (row && !row.used_at)
        update_(PORTAL.loginCodes, row._row, { used_at: stamp_() });
      throw new Error('That code is invalid or expired. Request a new code.');
    }
    var expected = authHash_(
      'otp|' + row.code_id + '|' + email + '|' + role + '|' + code
    );
    if (!safeEqual_(expected, row.code_hmac)) {
      var attempts = Number(row.attempts || 0) + 1;
      update_(PORTAL.loginCodes, row._row, {
        attempts: String(attempts),
        used_at: attempts >= OTP_MAX_ATTEMPTS ? stamp_() : ''
      });
      throw new Error('That code is invalid or expired. Request a new code.');
    }
    update_(PORTAL.loginCodes, row._row, { used_at: stamp_() });
  } finally {
    lock.releaseLock();
  }
  if (role === 'admin') {
    if (adminEmails_().indexOf(email) === -1)
      throw new Error('This email is not approved for academy access.');
    var admin = { email: email, access_role: academyRole_(email) },
      adminSession = createSession_('admin', email, '', p);
    audit_(
      admin.access_role,
      email,
      'login',
      'session',
      '',
      clean_(p.deviceLabel)
    );
    return {
      role: 'admin',
      sessionId: adminSession,
      dashboard: adminData_(admin)
    };
  }
  var parent = first_(PORTAL.parents, function (r) {
    return (
      email_(r.email) === email && clean_(r.status).toLowerCase() === 'active'
    );
  });
  if (!parent)
    throw new Error('This parent account is awaiting academy approval.');
  update_(PORTAL.parents, parent._row, {
    email_verified_at: stamp_(),
    updated_at: stamp_()
  });
  parent.email_verified_at = stamp_();
  var parentSession = createSession_('parent', email, parent.parent_id, p);
  audit_(
    'parent',
    parent.parent_id,
    'login',
    'session',
    '',
    clean_(p.deviceLabel)
  );
  return {
    role: 'parent',
    sessionId: parentSession,
    parent: parentView_(parent),
    dashboard: dashboardForParent_(parent)
  };
}
