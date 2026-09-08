// Live session and account authorization. Never use dashboard snapshots for access checks.

function createSession_(role, email, parentId, p) {
  var now = new Date(),
    active = rows_(PORTAL.sessions)
      .filter(function (r) {
        return (
          r.role === role &&
          r.email === email &&
          !r.revoked_at &&
          r.expires_at > stamp_(now)
        );
      })
      .sort(function (a, b) {
        return String(a.created_at).localeCompare(String(b.created_at));
      });
  while (active.length >= MAX_ACTIVE_SESSIONS) {
    var oldest = active.shift();
    update_(PORTAL.sessions, oldest._row, {
      revoked_at: stamp_(),
      revoke_reason: 'new_login'
    });
    audit_(
      'system',
      email,
      'session_revoked',
      'session',
      '',
      'A newer login replaced this session.'
    );
  }
  var raw = token_(),
    hours = role === 'admin' ? ADMIN_ABSOLUTE_HOURS : SESSION_ABSOLUTE_HOURS;
  append_(PORTAL.sessions, {
    session_id: authHash_('session|' + raw),
    parent_id: parentId,
    device_hash: hash_(clean_(p.deviceId) || 'unknown-device'),
    label: clean_(p.deviceLabel) || 'Browser',
    created_at: stamp_(),
    last_seen_at: stamp_(),
    expires_at: stamp_(new Date(now.getTime() + hours * 3600000)),
    revoked_at: '',
    revoke_reason: '',
    role: role,
    email: email
  });
  return raw;
}

function logout_(p) {
  var s = session_(p.sessionId, false);
  if (s)
    update_(PORTAL.sessions, s._row, {
      revoked_at: stamp_(),
      revoke_reason: 'logout'
    });
  return { loggedOut: true };
}

function requireAdmin_(sessionId) {
  var s = session_(sessionId, true, 'admin');
  if (adminEmails_().indexOf(s.email) === -1)
    throw new Error('This email is not approved for academy access.');
  return { email: s.email, access_role: academyRole_(s.email) };
}

function parentFromSession_(id) {
  var s = session_(id, true, 'parent'),
    p = first_(PORTAL.parents, function (r) {
      return (
        r.parent_id === s.parent_id &&
        clean_(r.status).toLowerCase() === 'active'
      );
    });
  if (!p) throw new Error('Parent account is inactive.');
  return p;
}

function session_(id, required, role) {
  var raw = clean_(id),
    key = raw ? authHash_('session|' + raw) : '',
    s =
      key &&
      first_(PORTAL.sessions, function (r) {
        return r.session_id === key;
      });
  if (!s || (role && s.role !== role)) {
    if (required)
      throw new Error('Your session has ended. Please sign in again.');
    return null;
  }
  var now = new Date(),
    lastSeen = Date.parse(s.last_seen_at),
    idle = lastSeen && !isNaN(lastSeen) ? now.getTime() - lastSeen : Infinity,
    idleLimit =
      (s.role === 'admin' ? ADMIN_IDLE_MINUTES : SESSION_IDLE_MINUTES) * 60000;
  if (s.revoked_at || s.expires_at < stamp_(now) || idle > idleLimit) {
    if (!s.revoked_at)
      update_(PORTAL.sessions, s._row, {
        revoked_at: stamp_(),
        revoke_reason: idle > idleLimit ? 'idle_timeout' : 'expired'
      });
    if (required)
      throw new Error('Your session has ended. Please sign in again.');
    return null;
  }
  update_(PORTAL.sessions, s._row, { last_seen_at: stamp_() });
  return s;
}

function requireLinkedStudent_(pid, sid) {
  if (
    !first_(PORTAL.links, function (r) {
      return (
        r.parent_id === pid &&
        r.student_id === sid &&
        clean_(r.active).toLowerCase() === 'true'
      );
    })
  )
    throw new Error('This child is not linked to your parent account.');
}

function adminEmails_() {
  return [
    getConfig_('admin_email') || 'studywitheduwaveacademy@gmail.com',
    getConfig_('developer_email') || 'diwij.narang2001@gmail.com'
  ]
    .join(',')
    .split(',')
    .map(email_)
    .filter(Boolean);
}

function academyRole_(email) {
  return (getConfig_('developer_email') || '')
    .split(',')
    .map(email_)
    .indexOf(email_(email)) !== -1
    ? 'developer'
    : 'admin';
}
