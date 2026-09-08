# Production readiness change record

Date: 2026-09-08. Branch: `codex/unified-portal-revamp`, base `f7df4a3646b290eb9e150bc41cc55b9f00b76f1b`.

Requested: architecture, CI/CD, monitoring/logging, reliability, downtime reduction, scaling, Docker/Kubernetes and production checklist.

Changed: allowlisted release builder with URL validation/revision hashes; pinned non-root Nginx container; read-only Compose configuration; portable Kubernetes probes/HPA/PDB/network policy/ingress templates; SHA-pinned GitHub Actions test/build/scan/Pages promotion; external semantic probes and alert rules; deployment/rollback/recovery/launch runbook. API timeout bounds browser waits without automatic mutation retries. Backend request outcome/duration telemetry omits payload/identity and tolerates logger failure. Existing response/error envelope is preserved.

Concurrent work: frontend/backend modules, UI features, architecture tests and generated bundle refactors appeared during this task. Their architecture is integrated, not attributed to this task. Timeout was initially added to the flat script and was carried into `src/infrastructure/browser.cjs` by the concurrent extraction; telemetry was added to authoritative `apps-script/src/http/routes.gs`. Release builder compiles the new modules. No unrelated changes were reverted.

Verified: `npm test` passed source parity, site structure, auth flows, 19 architecture/dashboard/transport tests and production-specific timeout, log privacy/failure, public allowlist, configuration rejection, HTTP-200 semantic failure and wrong-revision checks. Both browser suites passed using headless Edge at localhost:4173 with mocked backend calls. All 12 YAML files parsed via PyYAML. Dependency lockfile resolution initially reported zero vulnerabilities; dependency changes introduced concurrently require the CI audit on the final lockfile. `git diff --check` performed separately at handoff.

Environment evidence: initial registry/Git access failed through the sandbox proxy; approved network access resolved action SHAs and Nginx digest. A sandboxed production test failed at Node child-process creation (EPERM); the same test passed with approved execution. Docker and kubectl are not installed; no container runtime test, Trivy scan, Kubernetes render/server validation, live Apps Script deployment, alert delivery or backup restore was performed locally. GitHub execution remains unverified.

Residual risks: limited Apps Script mail/execution capacity; non-transactional Sheets/Drive workflows; backend concurrency/idempotency and public-endpoint abuse protection; lack of operational backups and external alerting; mixed-version unversioned frontend assets during rolling releases. Manifests require real image digest, ingress class/domain/certificate and platform components. Production runbook explicitly records these launch gates.

Next acceptance: run the workflow on reviewed source, provision isolated staging, test container and manifest behavior, verify real auth/files/fees and restore/alert drills, then approve production promotion. No commit, push, cloud provisioning or live release performed.
