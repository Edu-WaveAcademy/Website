const assert = require('node:assert/strict');
(async () => {
  const base = 'http://127.0.0.1:8080';
  const response = await fetch(base);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('x-frame-options'), 'DENY');
  assert.equal(response.headers.get('cache-control'), 'no-cache');
  assert.ok(response.headers.get('content-security-policy-report-only'));
  for (const file of ['/apps-script/Code.gs', '/tests/auth-flow.test.js', '/README.md', '/ui/showcase.html', '/.git/config']) {
    const result = await fetch(base + file);
    assert.ok([403, 404].includes(result.status), `${file} must not be published`);
  }
  assert.equal((await fetch(base, {method: 'POST', body: '{}'})).status, 403);
  console.log('Container passed: headers, cache policy, source isolation, static-only methods.');
})().catch(error => { console.error(error); process.exitCode = 1; });
