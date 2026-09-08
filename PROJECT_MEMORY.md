# Project engineering memory

## Source of truth

Product architecture and deployment: `README.md`, `plan.md`, `SETUP_STEPS.md`, `apps-script/README.md`. Architecture analysis and this task's change audit: `ARCHITECTURE_REVIEW.md`. This file records engineering evidence without rewriting the product README.

## Evidence log

### 2026-09-08 — production deployment preparation

- Branch/revision: `codex/unified-portal-revamp`, base `f7df4a3646b290eb9e150bc41cc55b9f00b76f1b`; concurrent uncommitted UI and module-refactor work preserved.
- Added release build, container and Kubernetes templates, GitHub Actions CI/controlled Pages promotion, semantic probes/alerts and `docs/PRODUCTION.md`. Added bounded API waits without write retries and privacy-minimized backend request telemetry in authoritative modules.
- `npm test` passed: generated-source parity, structure/auth, 19 backend/frontend architecture checks and production failure-path checks. Both browser suites passed using `UI_BROWSER_CHANNEL=msedge` against localhost:4173 with backend interception. Twelve YAML files parsed with PyYAML.
- Sandbox Node child-process creation initially returned EPERM; approved execution passed. Registry lookup similarly needed approved network execution. Docker/kubectl absent; container runtime, Trivy, Kubernetes schema/runtime and live Google-service behavior remain unverified.
- User confirmed no existing infrastructure. No cloud, monitor receiver or backup destination was configured. Runtime acceptance, mail capacity, concurrency/idempotency, backups/restores, abuse controls and cluster prerequisites remain launch gates. Full audit: `change_audits/2026-09-08-production-readiness.md`.
- No commit/push/deployment performed; shared uncommitted changes cannot be attributed wholesale to this task. Next focused step: reviewed CI run and isolated staging operational acceptance from the production checklist.

### 2026-09-08 22:17 +05:30 — architecture and behavior-preserving backend refactor

- Branch/revision: `codex/unified-portal-revamp` at `f7df4a3646b290eb9e150bc41cc55b9f00b76f1b`, local uncommitted changes.
- Starting state: `index.html`, `script.js` and untracked `ui/` already contained separate work. UI tests and deployment tooling subsequently appeared during this task; they were not authored here. No commit, push or deployment was requested or performed.
- Baseline action: `node --test tests/*.test.js`. Expected: existing auth and structure tests pass. Sandbox attempt failed with `spawn EPERM`; authorized execution outside the sandbox passed both existing suites. Do not misclassify the first failure as an application defect.
- Changed: `apps-script/Code.gs` now loads nine dashboard tables once per assembly, builds ordered indexes, shares them between projections, and indexes family directory joins. Sheet mutations map actual headers and update only supplied cells; required-column validation fails before mutation. All action names and public payload contracts remain unchanged.
- Added: `tests/dashboard-refactor.test.js`, frozen pre-refactor dashboard functions under `tests/fixtures/legacy-dashboard.js`, and `ARCHITECTURE_REVIEW.md` as the architecture/refactoring/change audit.
- Acceptance: compare exact old/new dashboard JSON on fixtures with 0, 1, 3, 20 and 100 students; check duplicates, sorting, first-match semantics, visibility behavior, link/enrolment filtering, fresh revocations, unchanged snapshot order, reordered/custom headers, untouched formulas and schema validation.
- Observed: 100-student synthetic fixture reduced dashboard source-table `rows_` calls from 1,492 to 9. This excludes authentication/config reads and is not a live latency or throughput benchmark. Reads still scale with total sheet data size; no cross-request cache or transaction isolation was introduced.
- Expanded wildcard run: ten checks passed; concurrently added browser test initially failed to resolve `playwright`. Retried with `NODE_PATH=C:\Users\diwij\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules` and `UI_BROWSER_CHANNEL=msedge`, against the existing localhost:4173 server. Runtime issue resolved; browser test failed at the 320px site overflow assertion (document width 504px). Browser test blocks live Apps Script requests. Its screenshot outputs may be refreshed by the test. No frontend source edits were made here.
- Final scoped verification: `node --test tests/auth-flow.test.js tests/site-structure.test.js tests/dashboard-refactor.test.js` passed 10/10. `node --check script.js`, `node --check ui/components.js`, and `git diff --check` passed. Backend source parses and executes in the regression VM.
- Status: source changed and local backend regression acceptance passed. Full browser acceptance failed; live Apps Script behavior, external-service failures, mail delivery, deployment and concurrency remain unverified.
- Residual risks: unlocked session creation/check-then-write mutations, non-atomic Drive/Sheets operations, full-history admin payloads, differing assignment release-date predicates, and frontend async response races. Refer to the review for staged strategies; do not claim these were fixed.
- Next focused checks: validate actual Sheets writes with canonical/reordered headers in a private staging workbook; exercise parent dashboard and file workflows there. Coordinate the 320px layout failure and regression-test integration with the separate UI/deployment work. The newly observed `npm test` did not yet include the dashboard regression file, so use the explicit command above until integrated.

### 2026-09-08 — concurrent source extraction revalidation

- A later read found `Code.gs` had become generated from `apps-script/modules.json` and `apps-script/src/` through separate work. The dashboard loader/indexes and header-aware writes were preserved in `src/application/dashboard.gs`, `src/projections/dashboard.gs`, and `src/adapters/sheets.gs`. Future changes must use source modules, not patch the generated bundle alone.
- Because the backend had changed, reran `node --test tests/auth-flow.test.js tests/site-structure.test.js tests/dashboard-refactor.test.js` against the newly generated version. Observed 10/10 passed; the fixture still reported 1,492 -> 9 table reads. The broader concurrent extraction and deployment additions are not independently certified by this task's scoped regression checks.

### 2026-09-08 22:25 +05:30 — evidence-only commit and push preparation

- User explicitly invoked `git-evidence-push`. Active branch: `codex/unified-portal-revamp`; observed base: `f7df4a3646b290eb9e150bc41cc55b9f00b76f1b`; configured upstream: `origin/codex/unified-portal-revamp` at `https://github.com/Edu-WaveAcademy/Website.git`.
- Re-ran `node --test tests/auth-flow.test.js tests/site-structure.test.js tests/dashboard-refactor.test.js`: 10/10 passed, including the 1,492 -> 9 dashboard table-read comparison. This is local execution with mocked Google services, not live production validation. The earlier 320px browser failure was not retested in this push task.
- Observed working-file SHA-256: `apps-script/Code.gs` = `530CA0B5A96B1181659658D1064A2602FBF37B7874DDE18E09B0A488639477D8`; `tests/dashboard-refactor.test.js` = `069948415258499AA6C8CA1AE91E4D34DFDCD8BE9A65A513BB66D32BC9ABD158`.
- Commit scope: only `ARCHITECTURE_REVIEW.md` and `PROJECT_MEMORY.md`. Implementation/source extraction, frontend changes, tests, deployment tooling and generated outputs are mixed with separate ongoing work and are excluded. Therefore this evidence-only commit does not itself contain or reproduce the refactored implementation described above.
- Separate UI files became staged during preparation. Use an explicit path-limited commit so that their staging is preserved and they are not included accidentally.
- Updated observation: the current local `package.json` now includes the dashboard regression test in `npm test`; the earlier integration gap has been addressed by separate work. No full `npm test`, deployment or live acceptance claim is made here.
- Next test: private staging-workbook validation of headers, dashboard and file workflows; coordinate separate implementation commits before treating this evidence as a release. Push outcome must be verified from Git's response rather than inferred from a local commit.

### 2026-09-08 — frontend/backend module extraction complete

- Branch: codex/unified-portal-revamp; started at f7df4a3, final verification observed cf0bd02 after parallel task commits. This task made no commit, push, or deployment.
- Editable code now lives in src/ and apps-script/src/. node tools/build.cjs produces script.js and apps-script/Code.gs; --check detects stale artifacts. ARCHITECTURE.md explains ownership and remaining coupling.
- Verified all 70 extracted frontend function ASTs unchanged against the local pre-extraction snapshot. Mocked browser runs produced exact equal DOM for the parent dashboard and all six academy tabs; both session roles and independent logout passed. Existing UI browser suite passed in approved headless Chrome at four viewport widths.
- Final npm test passed: freshness, structure, auth, 20 architecture/dashboard tests, and integrated production checks. No live Google-service or scale validation performed. Existing dashboard indexing and concurrent deployment changes were preserved, not attributed to this extraction.
- Environment/test failures and fixes are recorded in change_audits/2026-09-08-modular-architecture.md. Next focused check: real login, file upload/submission, and revocation in a private staging workbook. Edit source modules and rebuild before any deployment.

### 2026-09-08 — production readiness evidence push

- Active branch/upstream: `codex/unified-portal-revamp` → `origin/codex/unified-portal-revamp`; production preparation was validated after architecture commit `8a47a03`.
- Exact evidence: `npm test` passed source freshness, structure/auth, 20 architecture/dashboard checks, semantic smoke, timeout-without-retry, privacy-minimized telemetry, allowlisted packaging, invalid-configuration rejection and wrong-release detection. `npm audit --audit-level=high` reported zero vulnerabilities. PyYAML parsed all 12 workflow/Compose/Kubernetes/monitoring YAML files; `git diff --check` passed.
- Browser evidence from the same working implementation: `UI_BROWSER_CHANNEL=msedge npm run test:browser` passed both mocked suites, including four responsive widths, session restoration, both dashboards and independent logout. Backend requests were intercepted; no production records or login emails were created.
- Status boundary: source and configuration changed; local Node/browser behavior passed. Docker and kubectl are absent, so container execution, Trivy scanning, Kubernetes server validation, live Apps Script workflows, alert delivery, backup restore and production capacity remain unverified. No cloud or production deployment was performed.
- Commit boundary: production runbook, CI/CD, Docker/Compose, Kubernetes, monitoring, public release/smoke tooling, production tests, dependency hygiene and this evidence/audit entry. Generated screenshots remain untracked and excluded. Next acceptance is a green GitHub workflow followed by isolated Google staging and restore/alert drills.
