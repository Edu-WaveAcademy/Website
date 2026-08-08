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
assert.match(script, /parentSubmitAssignment/, 'student worksheet submission flow must be present');
assert.match(script, /adminReviewSubmission/, 'academy worksheet review flow must be present');
assert.match(script, /adminUploadResource/, 'academy mixed-file upload flow must be present');
assert.match(script, /adminSubmissionFile/, 'academy protected submission preview must be present');
assert.match(script, /adminDriveFolders/, 'academy Drive folder picker must be present');
assert.match(script, /drive-folder-list/, 'Drive folders must use a scrollable picker instead of an ID-first form');
assert.match(script, /Parents and enrolled students/, 'academy family directory must identify approved parents and their children');
assert.match(script, /family-search/, 'academy family directory must be searchable');
assert.match(script, /unlinkedStudents/, 'academy family directory must flag active students without a parent link');
assert.match(script, /\.pdf,\.jpg,\.jpeg,\.png,\.doc,\.docx,\.xls,\.xlsx,\.ppt,\.pptx/, 'academy file picker must accept common teaching formats');
assert.doesNotMatch(script, /drive\.google\.com\/.*(?:attachment|submission)|attachment_drive_id/, 'frontend must not expose uploaded Drive identifiers');

console.log(`Site structure passed: ${ids.length} unique IDs, valid anchors, balanced CSS, searchable family directory, secure mixed-file workflow, no legacy login.`);
