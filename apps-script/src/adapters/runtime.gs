// Apps Script clock, identifiers, hashes and script properties.

function id_(p) {
  return p + '-' + Utilities.getUuid().slice(0, 8).toUpperCase();
}

function hash_(v) {
  return Utilities.base64Encode(
    Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, clean_(v))
  );
}

function stamp_(d) {
  return Utilities.formatDate(d || new Date(), TZ, "yyyy-MM-dd'T'HH:mm:ssXXX");
}

function date_(d) {
  return Utilities.formatDate(d || new Date(), TZ, 'yyyy-MM-dd');
}

function authSecret_() {
  var props = PropertiesService.getScriptProperties(),
    secret = props.getProperty('AUTH_SECRET');
  if (!secret) {
    secret = token_();
    props.setProperty('AUTH_SECRET', secret);
  }
  return secret;
}

function authHash_(value) {
  return Utilities.base64EncodeWebSafe(
    Utilities.computeHmacSha256Signature(clean_(value), authSecret_())
  ).replace(/=+$/, '');
}

function token_() {
  return (
    Utilities.getUuid().replace(/-/g, '') +
    Utilities.getUuid().replace(/-/g, '')
  );
}

function otp_() {
  var n =
    parseInt(Utilities.getUuid().replace(/-/g, '').slice(0, 8), 16) % 1000000;
  return ('000000' + n).slice(-6);
}
