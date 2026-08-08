const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('style.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const script = fs.readFileSync('script.js', 'utf8');
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
const duplicates = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
const anchors = [...html.matchAll(/href="#([^"]+)"/g)].map(match => match[1]);
const missingAnchors = [...new Set(anchors.filter(anchor => !ids.includes(anchor)))];

assert.deepEqual(duplicates, [], `duplicate IDs: ${duplicates.join(', ')}`);
assert.deepEqual(missingAnchors, [], `missing anchors: ${missingAnchors.join(', ')}`);
assert.equal([...css].reduce((balance, character) => balance + (character === '{') - (character === '}'), 0), 0, 'CSS braces must balance');
assert.doesNotMatch(html + script, /demo(?:Login|Mode|-parent|-admin)|googleLogin|idToken/i, 'legacy login code must stay removed');
const adminDialog = html.slice(html.indexOf('<dialog id="admin-dialog"'), html.indexOf('<dialog id="viewer-dialog"'));
assert.doesNotMatch(adminDialog, /studywitheduwaveacademy@gmail\.com|diwij\.narang2001@gmail\.com/i, 'approved addresses must not be exposed in the academy login dialog');

console.log(`Site structure passed: ${ids.length} unique IDs, valid anchors, balanced CSS, no legacy login.`);
