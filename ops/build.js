// Explicit public-file allowlist: never publish source, tests, Sheet data or credentials.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
// Source modules are authoritative; compile before packaging the public artifact.
require('../tools/build.cjs').build();
const out = path.join(root, 'dist');
let script = fs.readFileSync(path.join(root, 'script.js'), 'utf8');
const original = script.match(/const CONFIG=\{apiUrl:'([^']+)'\};/);
if (!original) throw new Error('Cannot locate CONFIG.apiUrl; review build integration.');
const apiUrl = process.env.API_URL || original[1];
if (!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(apiUrl)) {
  throw new Error('API_URL must be an HTTPS Apps Script /exec deployment URL.');
}
script = script.replace(original[0], `const CONFIG={apiUrl:'${apiUrl}'};`);
fs.rmSync(out, { recursive: true, force: true }); // Fixed project-owned build directory only.
fs.mkdirSync(path.join(out, 'ui'), { recursive: true });
for (const file of ['index.html', 'style.css', 'ui/components.css', 'ui/components.js']) {
  fs.copyFileSync(path.join(root, file), path.join(out, file));
}
fs.cpSync(path.join(root, 'images'), path.join(out, 'images'), { recursive: true });
fs.writeFileSync(path.join(out, 'script.js'), script);
fs.writeFileSync(path.join(out, '.nojekyll'), '');
fs.writeFileSync(path.join(out, 'healthz'), 'ok\n');
const hashes = {};
function inventory(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) inventory(file);
    else hashes[path.relative(out, file).replaceAll('\\', '/')] = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  }
}
inventory(out);
fs.writeFileSync(path.join(out, 'release.json'), JSON.stringify({
  revision: process.env.GITHUB_SHA || 'local', files: hashes
}, null, 2));
console.log(`Built ${Object.keys(hashes).length} public files into dist.`);
