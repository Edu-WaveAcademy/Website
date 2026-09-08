// Authenticated parent activity recording.

function parentEvent_(p) {
  var parent = parentFromSession_(p.sessionId);
  audit_(
    'parent',
    parent.parent_id,
    clean_(p.event).slice(0, 60),
    clean_(p.entityType).slice(0, 60),
    clean_(p.entityId).slice(0, 80),
    clean_(p.detail).slice(0, 500)
  );
  return { logged: true };
}
