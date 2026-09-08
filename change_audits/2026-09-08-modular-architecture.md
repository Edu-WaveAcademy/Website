# Behavior-preserving module extraction

## Request and scope

Separate concerns, reduce coupling, and make the existing static frontend and
Apps Script backend easier to maintain without changing product behavior.
Work began on `codex/unified-portal-revamp`, revision `f7df4a3`, with concurrent
UI and dashboard changes. The user confirmed multiple tasks share this checkout.
Deployment/container work and pre-existing dashboard optimizations are preserved
but are not attributed to this extraction.

## Changes

- Extracted all 70 frontend functions into named feature/helper factories with
  explicit dependencies and a single composition root. State is allocated per
  application instance. Browser effects can be substituted in tests.
- Added 16 formatted backend source modules and an explicit manifest. Kept
  global entry points and signatures compatible with Apps Script. Separated
  pure dashboard projections from snapshot acquisition and date reads.
- Added a deterministic build with a stale-artifact check. Existing `script.js`
  and `Code.gs` remain the deployment interfaces.
- Added eight frontend architecture tests, four backend architecture tests,
  and a mocked portal browser suite. Documented the structure and boundaries in
  `ARCHITECTURE.md`; updated configuration/build guidance in deployment docs.
- Existing submission structure assertion now accepts whitespace introduced by
  formatting. Pagination behavior has a runtime test.

## Evidence

- Baseline direct Node auth, dashboard, and structure checks passed. Node's
  subprocess test runner initially returned `spawn EPERM`; running each file
  directly avoided that environment restriction.
- Acorn AST comparison found all 70 extracted frontend function implementations
  unchanged relative to the local pre-extraction snapshot. Factories, imports,
  state creation, and composition wiring are new and tested independently.
- `npm run test:architecture` passed the source freshness check, frontend and
  backend architecture checks, eight dashboard comparisons, auth flow, and
  site structure. The additional constructor-side-effect test passed separately.
- Dashboard parity fixtures for 0/1/3/20/100 students retained payload order,
  duplicate behavior, and nine request-local source-table reads. Formula-safe
  writes and fresh access revocation tests passed.
- `tests/ui-browser.test.js` passed in installed headless Chrome against local
  port 4187: component behavior, dialogs, accessibility-related interactions,
  reduced motion, and 320/375/768/1440px widths. Initial default Chromium was
  absent; sandboxed Chrome launch returned EPERM; approved execution succeeded.
- `tests/portal-browser.test.cjs` passed on both the original and new frontend,
  with every Apps Script request intercepted. Parent dashboard and all six admin
  tabs produced exactly equal DOM snapshots. Session restoration and independent
  logout passed with no page errors. The first test iteration read storage before
  async logout finished; waiting for the completion condition fixed the test.
- Registry tooling installation initially failed due to sandbox network/cache
  restrictions; approved installation of Acorn/Prettier succeeded. No runtime
  frontend framework was introduced.
- Final integrated `npm test` passed: generated-source freshness, structure,
  auth, 20 architecture/dashboard checks, and the parallel production task's
  transport/telemetry/build/smoke tests. Final mocked portal browser rerun passed
  after unused dependency callbacks were removed. HEAD was `cf0bd02` during
  this final verification because other tasks committed their own work.

## Limits and handoff

Changed and locally built; the listed mocked/browser checks passed. No live
Google deployment, email delivery, real file upload, or capacity test was
performed by this task. Backend global service coupling and shared frontend
state within an instance remain documented compatibility tradeoffs. Existing
concurrency and platform quota constraints remain. No commit or push was made
by this task; other tasks may independently commit their own evidence.

Future edits belong in source modules followed by `node tools/build.cjs`.
Next operational acceptance is a private staging workbook exercising real
login, material/submission uploads, and access revocation.
