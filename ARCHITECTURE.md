# Eduwave architecture

The editable application now lives in feature modules. `script.js` and
`apps-script/Code.gs` are generated deployment artifacts. The website remains
static, the Apps Script entry points remain global, and existing API payloads,
storage keys, schemas, permissions, DOM markup, and user workflows are retained.

## Folder structure

```text
src/
  main.cjs                     Browser entry point
  application.cjs              Composition root: explicit dependency wiring
  config.cjs                   API URL, storage keys, upload limit
  state.cjs                    Fresh state per application instance
  infrastructure/browser.cjs   HTTP transport, device storage, file encoding
  shared/
    format.cjs                 Escaping, formatting, simple selectors
    feedback.cjs               Adapter to the existing UI components
    dialogs.cjs                Dialog lifecycle, focus, confirmations
  features/
    site.cjs                   Site initialization, event binding, trial form
    auth.cjs                   Signup, codes, session restoration
    parent.cjs                 Parent dashboard, payment notes, logout
    materials.cjs              Protected files, worksheets, submissions
    admin/
      controller.cjs           Tab orchestration, shared mutations, refresh
      families.cjs             Directory, status filters, enrolment actions
      learning.cjs             Classroom forms and notice presentation
      library.cjs              Uploads, assignments, access revocation
      submissions.cjs          Review archive, filtering, pagination
apps-script/
  modules.json                 Ordered source manifest
  src/
    config/schema.gs           Tables, headers, limits
    http/routes.gs             HTTP entry points and action dispatch
    auth/{login,sessions}.gs   Login and access enforcement
    application/
      setup.gs                 Setup and existing migration entry points
      families.gs              Parent/student lifecycle
      dashboard.gs             Request-local reads and projection facades
      learning.gs              Resources and submitted work
      billing.gs               Fees and reminders
      activity.gs              Trials, notices, attendance, progress
    projections/
      values.gs                Pure value conversions
      dashboard.gs             Pure joins, ordering, parent projections
    adapters/
      sheets.gs                Header-aware persistence
      files.gs                 Private Drive file operations
      mail.gs                  Login email delivery
      runtime.gs               Config, crypto, clock, audit, JSON output
  Code.gs                      Generated backend; deploy this file
  appsscript.json              Existing permissions/runtime manifest
ui/                            Existing reusable presentation components
tools/build.cjs                Deterministic source build and freshness check
tests/                         Auth, parity, architecture, and browser checks
script.js                      Generated frontend; loaded by index.html
index.html / style.css         Existing website shell and styles
```

Deployment/container tooling under `ops/`, `deploy/`, and `.github/` is maintained
by the parallel deployment task. Its public-file packaging calls the source
builder before packaging the site.

## Boundaries and dependency direction

The composition root constructs the browser adapters, UI helpers, and features.
Each feature receives named dependencies through its factory argument. Features
do not import one another or reach into an application-wide service registry.
Cross-feature operations, such as refreshing a dashboard after a mutation, are
explicit callbacks. Callbacks resolve already-created features when an event
runs; constructors must not invoke these callbacks during assembly.

`state.cjs` allocates one state object per application instance. This retains
the existing session and filter semantics without module-level mutable state
leaking between instances. State remains shared within an instance because the
current parent, authentication, and admin workflows depend on it. Separating
those state slices further would be a subsequent, separately tested refactor.

The backend follows this flow:

```text
HTTP routes -> authenticated application operations -> service adapters
                              |
                              +-> pure projections <- request snapshots
```

Pure dashboard projections receive data and the current date as values. They
perform no Sheets, Drive, configuration, or clock reads. Compatibility facades
retain the previous callable function signatures and acquire a fresh snapshot
when callers omit one. This makes projection behavior testable without Google
services and preserves immediate visibility of revoked access on later reads.

Apps Script still links application operations and adapters through its shared
global runtime. This is a pragmatic modular boundary, not complete dependency
inversion for every backend service. Replacing that runtime, transaction model,
or persistence engine is outside this behavior-preserving refactor.

## Working on the code

Use Node 24 and install the locked development dependencies with `npm ci`.

```sh
node tools/build.cjs
node tools/build.cjs --check
npm run test:architecture
```

Edit `src/config.cjs` when changing the default API URL. The compact `CONFIG`
declaration remains compatible with the parallel packaging tool's URL override.
Do not format that declaration independently until that parser is updated.

Edit source modules, rebuild, and include the generated files with the change.
Deploy the generated `Code.gs` and the existing manifest using `SETUP_STEPS.md`;
do not upload both the source modules and generated backend into the same Apps
Script project, which would duplicate declarations. No setup or migration is
required solely because code has been reorganized.

The source builder understands static relative CommonJS imports under `src/`.
It rejects imports outside that tree and dynamic/external imports, validates
JavaScript syntax, and emits one browser script with private module scopes.
No bundler runtime is downloaded by the browser. Backend files are concatenated
from the manifest; ordering is explicit and tested. The freshness check detects
forgotten rebuilds of either artifact. Add backend files to the manifest and
frontend files through explicit imports from their owner.

Browser checks require a local static server and an installed Playwright browser:

```sh
python -m http.server 4173
# In another terminal:
node tests/ui-browser.test.js
node tests/portal-browser.test.cjs
```

Use `UI_TEST_URL` to change the server and `UI_BROWSER_CHANNEL=chrome` or `msedge`
to select an installed browser. These tests intercept the Apps Script endpoint;
they do not submit live academy records.

## Improvements and practical limits

- Feature changes have a clear owner and smaller review scope. Readable source
  replaces hand-maintained monoliths while deployment remains unchanged.
- Browser capabilities and cross-feature calls are explicit dependencies, making
  API failures, uploads, session restoration, and presentation independently testable.
- Pure backend projections separate read assembly from business presentation.
  The existing dashboard indexing optimization is preserved: its 100-student
  fixture reads nine dashboard source tables instead of the original 1,492 calls.
  That optimization predates this module extraction; it is not new capacity
  delivered by moving files.
- Reproducible builds and artifact freshness checks prevent source/deployment
  drift. Existing security tests cover ownership, departure, revocation, and
  protected submissions across the reorganized backend.

This refactor improves the ability to extend and test the product. It does not
remove Apps Script execution/mail quotas, full-table Sheets reads, or existing
concurrent-write limitations. No live throughput claim or database migration is
implied. HTML template strings remain inside their owning features to preserve
exact rendered markup; a separate template migration would need its own parity
checks.
