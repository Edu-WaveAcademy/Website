const assert = require('node:assert/strict');
async function check(siteUrl, apiUrl, expectedRevision) {
  const base = new URL(siteUrl);
  if (!base.pathname.endsWith('/')) base.pathname += '/';
  async function get(file) {
    const response = await fetch(new URL(file, base), {signal: AbortSignal.timeout(15000), cache:'no-store'});
    assert.equal(response.status, 200, `${file}: HTTP ${response.status}`);
    return response;
  }
  assert.match(await (await get('index.html')).text(), /<title>.*Eduwave/i);
  assert.match(await (await get('script.js')).text(), /const CONFIG=/);
  assert.equal((await (await get('healthz')).text()).trim(), 'ok');
  const release = await (await get('release.json')).json();
  if (expectedRevision) assert.equal(release.revision, expectedRevision, 'Wrong deployed revision');
  if (apiUrl) {
    // GET performs no login, mail delivery, payment or data mutation.
    const response = await fetch(apiUrl, {signal: AbortSignal.timeout(20000), redirect:'follow'});
    assert.equal(response.status, 200, 'Backend HTTP failure');
    const body = await response.json();
    assert.equal(body.ok, true, 'Backend application failure');
    assert.equal(body.data?.configured, true, 'Backend is not configured');
    assert.equal(body.data?.auth, 'email_otp', 'Unexpected backend contract');
  }
  console.log('Smoke passed: frontend files, release, health and optional backend contract.');
}
module.exports = {check};
if (require.main === module) {
  if (!process.env.SITE_URL) throw new Error('Set SITE_URL (include any repository path).');
  check(process.env.SITE_URL, process.env.API_URL, process.env.EXPECTED_REVISION)
    .catch(error => { console.error(error.message); process.exitCode = 1; });
}
