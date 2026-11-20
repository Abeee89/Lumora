# M01 Evidence

> Status: executed 2026-11-19 on `main` at `eca6091` plus uncommitted work; build work tree `D:/Portofolio/Lumora`. M01 is authorized for the rows proven here only. Every command below was run in this session; outputs are pasted as observed. The milestone record is [M01-COMPLETION-REPORT.md](M01-COMPLETION-REPORT.md).

## Rules

- One section per checkpoint. Paste the exact command and the observed output.
- Record runtime, library and database versions.
- State pass or fail against the M01 checklist row. On fail or partial, name the cause and the row that stays unchecked.
- A row with no evidence stays unchecked in [MILESTONES.md](../07-roadmap/MILESTONES.md).
- No secret, token or personal data appears here.

## Checklist status

| M01 completion row | State | Evidence |
|---|---|---|
| Boundary tooling fails on an upward import | PASS | E02 |
| CI stages 1, 2, 3, 4, 7, 8 run on every merge | PARTIAL | E08: stages 1, 2, 3, 4, 7 are defined and stages 1 to 4 ran locally; stage 8 needs a host (U-A1); nothing has run on GitHub |
| Staging deploy from the single image; health check passes | NOT DONE | E06, E08: no staging host (U-A1), Docker is absent on this machine; the health check passes locally only |
| Outbox dispatch once-only test passes | PASS | E04, E05 |
| Error envelope, logging and configuration module in place | PASS | E03 |
| Empty purge, export and archive-guard registries defined | PASS | E03 |
| App shell responsive at 360 px and 1280 px | PASS | E07 |
| DEFINITION-OF-DONE.md checked | PARTIAL | Section "Definition of Done check": every item evaluated, four are not met and name their cause |

## Environment and versions

| Item | Observed value |
|---|---|
| Runner | Windows 10.0.26200, x64 |
| Node.js | v24.13.1 |
| npm | 11.8.0 |
| git | 2.53.0.windows.1 |
| Repository | `D:/Portofolio/Lumora`, branch `main`, `eca6091` at start, head advanced to `9a84d8a` mid-session by the owner |
| Next.js | 16.4.6 |
| React and React DOM | 19.3.1 |
| TypeScript | 6.0.3 |
| vitest | 5.1.1 (+ `@vitest/coverage-v8` 5.1.1) |
| ESLint | 10.15.0 (flat config, `typescript-eslint` 8.73.0, `@eslint/js` 10.0.1) |
| Tailwind CSS | 4.3.5 (`@tailwindcss/postcss` 4.3.5) |
| drizzle-orm / drizzle-kit | 0.45.4 / 0.31.11 |
| pg | 8.23.1 |
| pg-boss | 12.38.2 |
| pino / pino-pretty | 10.4.0 / 13.2.0 |
| zod | 4.6.7 |
| date-fns / date-fns-tz | 4.4.0 / 3.2.0 |
| tsx | 4.23.15 |
| embedded-postgres | 18.6.0-beta.19 |
| PostgreSQL | 18.6 (`postgres.exe --version`), embedded, no vendor-managed instance |

Host clock is UTC+07. Timestamps below are local unless stated.

## E01 Typecheck, CI stage 1

- Requirement: DEPLOYMENT-ARCHITECTURE section 4 stage 1; NFR-061.
- Command: `npm run typecheck` (`tsc --noEmit`).

Raw output, last run:

```
tsc exit=0
```

- Result: PASS with `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, `moduleResolution: bundler`.
- Deviations found and fixed during the run, recorded because they are type-level contracts rather than style:
  - `date-fns-tz` 3.2.0 exports no `TZDate` (that class lives in `@date-fns/tz`). `src/kernel/time.ts` was rewritten on `toZonedTime` and `fromZonedTime`; the zone and rollover behavior is unchanged and is covered by `tests/unit/time.test.ts`.
  - `pg-boss` 12.38.2 has no default export: the worker imports `{ PgBoss }`.
  - `boss.stop({ wait: true })` is not a pg-boss v12 option; the worker calls `boss.stop({ graceful: true })`.
  - `tsconfig.json` needed `allowImportingTsExtensions` because `scripts/check-boundaries.ts` imports `tools/boundaries.ts` by path.

## E02 Boundary check, CI stage 2

- Requirement: MODULE-BOUNDARIES sections 4 and 8; M01 deliverable "dependency-cruiser or ESLint-boundaries configuration encoding the 19-module rank table".
- Command: `npm run boundaries` (`tsx scripts/check-boundaries.ts`).

Raw output:

```
Boundary check passed.
```

- Result: PASS on this repository: 19 module ranks, no upward import, no deep cross-module import, no kernel import of a module.
- Violation detection, from `tests/unit/boundaries.test.ts` (fixtures under `tests/fixtures/boundary`):

```
 ✓ tests/unit/boundaries.test.ts (5 tests)
   - accepts a lower-rank public import and kernel use
   - fails an upward import from Timer to Goals
   - fails a deep cross-module import
   - fails a kernel import of a module
   - passes on this repository
```

- Result: PASS. The tool is a rank checker over `src` with textual import resolution for `@/...` and relative paths; it strips `.ts`, `.tsx`, `.js`, `.jsx` suffixes. It resolves `@/modules/x/public` but not every barrel-file spelling, which is a known limit (L6).
- ESLint stage 2 lint: `npm run lint` (`eslint .`) exits 0. `next lint` was replaced: Next 16 no longer ships that command, so the script calls ESLint directly on the same flat config.

## E03 Unit tests, CI stage 3

- Requirement: TESTING-STRATEGY section 11 matrix at the unit tier; M01 tests row "config-module test, scrub test, health endpoint test, boundary violation fixture".
- Command: `npx vitest run --project unit`.

Raw output:

```
 Test Files  10 passed (10)
      Tests  35 passed (35)
   Duration  6.05s
```

| File | Covers |
|---|---|
| `tests/unit/config.test.ts` | Every numeric default in one module (NFR-062) |
| `tests/unit/errors.test.ts` | Error catalog and envelope shape (ERROR-HANDLING section 4) |
| `tests/unit/time.test.ts` | Zone conversion, rollover day, DST-length day, elapsed minutes (ADR-006, BR-012, BR-014) |
| `tests/unit/logger.test.ts` | Scrubbing of password, token, cookie, note and body keys (NFR-063) |
| `tests/unit/idempotency.test.ts` | Replay once, payload-hash equality, key reuse with a different payload, per-user scope (ADR-011) |
| `tests/unit/registries.test.ts` | The three registries are empty, reject duplicates and reject empty keys |
| `tests/unit/env.test.ts` | Environment schema defaults and the offending variable in the message |
| `tests/unit/health.test.ts` | `GET /api/health` returns `{"status":"ok"}`, `cache-control: no-store`, echoes `x-request-id` |
| `tests/unit/nav.test.ts` | Navigation renders nothing until a route ships, then keeps documented order |
| `tests/unit/boundaries.test.ts` | E02 |

- Coverage, command `npm run test:coverage` (unit + integration):

```
 kernel            |   89.34 |    83.75 |   86.04 |    95.8 |
 worker/index.ts   |   65.11 |    72.72 |      50 |   72.97 |
 ui/shell.tsx      |       0 |       20 |   33.33 |   18.75 |
 All files         |   74.8  |    76.47 |   68.18 |   78.73 |
```

- Result: PASS against the configured floors, which apply where M01 holds logic: `src/kernel/**` lines 80, statements 80, functions 70, branches 70 (observed 95.8 / 89.34 / 86.04 / 83.75). The overall floors in DEFINITION-OF-DONE section 2 (overall 80, domain 90, application 80) are not claimed: M01 ships no module code, and the shell and worker are covered by the browser checks (E07) and integration tests (E05) rather than by unit tests. See L4.

## E04 Outbox relay against PostgreSQL, CI stage 4

- Requirement: ADR-005, ADR-011; NFR-053; M01 tests row "outbox dispatch integration test".
- Command: `npm run test:integration` (`vitest run --project integration`). Uses `DATABASE_URL` when CI supplies a service, otherwise an embedded PostgreSQL 18.6 on port 55432.

Raw output (excerpt):

```
 Test Files  2 passed (2)
      Tests  6 passed (6)
   Duration  28.58s
```

`tests/integration/outbox.test.ts`, four assertions:

| Assertion | Result |
|---|---|
| A row committed in a transaction is relayed once, and a second relay pass sends nothing | PASS |
| A rolled-back transaction leaves no `outbox_events` row | PASS |
| Two pg-boss sends with the same `singletonKey` produce one queued job | PASS |
| A duplicate `idempotency_key` is rejected by the database | PASS |

Finding on queue policy: pg-boss 12 deduplicates a queued key only for the `short`, `stately` and `exclusive` queue policies (`singleton` covers active jobs alone; see `migrationStore.js` index `job_i1` to `job_i6`). The first run with `policy: "singleton"` queued two jobs and failed; with `policy: "stately"` it passes. `src/kernel/outbox.ts` records the requirement in the `JobQueue` contract: a job whose send must not duplicate is declared on a key-aware queue.

## E05 Worker dispatch, M01 acceptance

- Acceptance criterion: "an outbox row written in a transaction is dispatched by the worker exactly once".
- Command: `npx vitest run --project integration` (same run as E04).

Raw output (excerpt):

```
[20:07:06] INFO: worker.started
    intervalMs: 250
[20:07:06] INFO: outbox.relayed
    relayed: 1
[20:07:08] INFO: worker.stopped
 ✓ tests/integration/worker.test.ts (2 tests)
```

- Result: PASS. `tests/integration/worker.test.ts` starts the real `startWorker` entry point against embedded PostgreSQL, writes an outbox row inside a transaction, observes exactly one `pgboss.job` row carrying the payload, observes `relayed_at` set, then waits four relay intervals and observes the queue still holds one row.
- Entry-point smoke: `DATABASE_URL=postgresql://lumora:lumora@localhost:5599/lumora npx tsx src/worker/index.ts` against no server now logs `worker.start_failed` and exits 1 instead of printing an unhandled `AggregateError` stack.
- Not proven: no handler consumes jobs, so job execution, retries and dead-letter behavior are untested (M02 starts them).

## E06 Build, CI stage 7 evidence

- Command: `npm run build` (`next build`, `output: "standalone"`).

Raw output (route table):

```
Route (app)
┌ ○ /_not-found
├ ƒ /api/health
└ ○ /unsupported-browser

○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```

- Result: PASS for the build. The standalone server was started with `npx next start -p 3112` and answered the probes in E07.
- Not proven: `Dockerfile` (multi-stage, non-root, node 24 slim) was never built. Docker is absent on this machine, so the single-image stage stays unverified until CI runs or a host with Docker is used. See L2.

## E07 Runtime checks in a browser

Tooling: omp browser (Chromium), production build on `http://localhost:3112` unless noted.

| Check | Command or method | Observed | Result |
|---|---|---|---|
| Health endpoint | `fetch("/api/health")` in the page | `200`, body `{"status":"ok"}`, `cache-control: no-store`, `x-request-id` present | PASS (NFR-050, SYS-01) |
| Security headers | response headers of a page request | `x-content-type-options: nosniff`, `x-frame-options: DENY`, `referrer-policy: strict-origin-when-cross-origin` | PASS |
| SY-1 not found | `GET /definitely-not-a-page` | `404`, title `Page not found · Lumora`, h1 `We could not find that page`, sentence `The link may be wrong, or the item was removed.` | PASS against PAGE-SPECIFICATIONS SY-1 |
| SY-3 unsupported browser | `GET /unsupported-browser` | h1 `This browser is not supported`, sentence, list of Chrome or Edge, Firefox, Safari 16+, Chrome on Android | PASS against SY-3 and NFR-080, NFR-081 |
| SY-2 error boundary | temporary route that throws, loaded, then deleted | h1 `Something went wrong`, exactly one `[role=alert]` with `The page did not load. Try again in a moment.`, `Retry` button, `Request ID: 4122605485` caption, title `Something went wrong · Lumora` | PASS against SY-2, except the Dashboard link (L3) |
| Shell landmarks | DOM query | one `header`, one `main#main`, one `[role=status]`, no `nav` while no route ships, no `header` link | PASS (A11Y-BASE, NAVIGATION-STRUCTURE rule 2) |
| Skip link | `Tab` then `Enter` on a loaded page | focus lands on `Skip to main content`, activation sets `#main` and moves focus to `MAIN` | PASS (A11Y-BASE) |
| Keyboard target size | `getBoundingClientRect` of the retry button at 360 px | `328 x 44` | PASS (44 px minimum, NFR-087) |
| Horizontal scroll | `documentElement.scrollWidth` vs `clientWidth` on `/unsupported-browser`, `/nope` at 360 px and 1280 px | `360/360` and `1280/1280`, no overflow | PASS (NFR-086, R-03) |
| Contrast | computed colour against the painted background, walking up for an opaque ancestor | light: h1 `#1b2428` on `#f6f4ee` 14.36:1; body text `#454f55` 7.63:1. dark: `#e8ecea` on `#111618` 15.3:1; `#bcc5c4` 10.35:1 | PASS (NFR-040, NFR-025 threshold 4.5:1) |
| Console | `console` capture on each page in the production build | no error entries | PASS |
| Dark scheme | `prefers-color-scheme: dark` emulation | dark tokens applied, no layout change | PASS |
| Scriptless rendering | `page.setJavaScriptEnabled(false)`, then load `/unsupported-browser` and a 404 | both render the full text and their h1 | PASS: SY-3 carries no state that needs scripts (SY-3 accessibility requirement) |

- Result: PASS for the shell, the three system pages and the health endpoint.
- Deviation: `GET /` answers 404. NAVIGATION-STRUCTURE line 158 sends `/` to `/dashboard` or `/login`, both M02 routes, so M01 ships no root page and the 404 is the documented state rather than a fallback (L1).
- Not proven: axe was not run. It needs a browser automation dependency that is not installed and the page set is incomplete; the checks above are manual and DOM-level (L5).

## E08 Continuous integration

`.github/workflows/ci.yml` defines:

| Stage | Job | Runs locally |
|---|---|---|
| 1 typecheck | `verify` | yes, E01 |
| 2 lint and boundaries | `verify` | yes, E02 |
| 3 unit tests and coverage floors | `verify` | yes, E03 |
| 4 integration against a PostgreSQL service | `integration` | yes against embedded PostgreSQL, E04 |
| 7 image build | `image` | no, no Docker on this machine, E06 |
| 8 staging deploy | absent | no, blocked by U-A1 |

- Result: PARTIAL. Stages 1 to 4 are written and run locally. No workflow run exists on GitHub: the owner has not pushed, and pushing is the owner's call. Stage 5 (preview environment) is absent by design until a product page exists and U-A1 is decided.

## Definition of Done check

DEFINITION-OF-DONE section 1, task level, for this change:

| Item | State |
|---|---|
| Change within one milestone and its scope | PASS, M01 only |
| Typecheck, lint and boundary check pass | PASS, E01, E02 |
| Unit and integration tests pass | PASS, E03, E04 |
| Inputs validated on the server, error codes from API-ERRORS | PASS for the one endpoint that exists; the error catalog mirrors ERROR-HANDLING section 4 |
| No secrets or personal data in logs or fixtures | PASS, scrubbing tested, fixtures contain no secrets |
| No `TODO`, stub, placeholder, mock data or dead code | PASS; the only markers are `PROPOSED` comments on unapproved numeric defaults |
| Docs touched by the change are updated | PASS, this file plus the inventory updates |
| Reviewed and squash merged | NOT DONE, no review and no commit by me |

DEFINITION-OF-DONE section 2, milestone level:

| Item | State |
|---|---|
| All acceptance criteria ids pass | PARTIAL: AC-NFR-050, AC-NFR-062, AC-NFR-063 evidence is E03 and E07; AC-FR-139 needs the full responsive shell in Chrome, Firefox and WebKit, only Chromium was exercised |
| Every FR in scope implemented, no stubs | PASS for FR-139 at shell level |
| Tests per TESTING-STRATEGY section 11 matrix | PARTIAL: unit and integration tiers exist, E2E tier needs stage 5 |
| Typecheck, lint, boundary check pass | PASS |
| Coverage floors met | PARTIAL, see E03 and L4 |
| Ownership contract test for each new resource | NOT APPLICABLE, no resource exists before M02 |
| Purge handler and export contributor per new user-data table | PASS at contract level: the registries exist and are empty, which is the M01 deliverable |
| Idempotency and concurrency verified | PASS for the idempotency helper and the outbox; no endpoint consumes them yet |
| Migrations apply from an empty database | PASS: `db/migrations/0001_shared_kernel.sql` applies on an empty embedded database in E04; applying from a previous schema does not arise yet |
| axe reports zero serious or critical issues, manual keyboard pass, no horizontal scroll at 360 | PARTIAL: manual keyboard and 360 px pass, axe not run (L5) |
| Error, empty and loading states from PAGE-SPECIFICATIONS implemented | PARTIAL: SY-1 to SY-3 error states exist, the SY-2 retry shows its loading state; no product page exists to carry empty states |
| Structured logs carry no secrets or note content | PASS, E03 |
| Docs updated: SDD, DATA-DICTIONARY, API-ENDPOINTS, PAGE-SPECIFICATIONS as affected | PASS: MODULE-BOUNDARIES sections 7 and 8 and DATA-DICTIONARY `idempotency_keys` note; SDD, API-ENDPOINTS and PAGE-SPECIFICATIONS are unaffected by M01 |
| REQUIREMENT-TRACEABILITY updated | NOT DONE, the file tracks planned tests, not executed ones; M01 adds no requirement |
| MILESTONES.md checklist fully checked | NO, by design: three rows stay unchecked, see the table at the top |
| Completion report in the Build Mode format | PASS, the session report holds functionality, files, database changes, tests, limitations and next step |
| No future-phase feature code reachable | PASS: navigation renders nothing, no product route exists, no module directory exists |
| Tag `m01-done` created | NOT DONE, the milestone is not done |

## Deviations and limitations

| Id | Deviation | Why it is not a pass |
|---|---|---|
| L1 | `GET /` returns the SY-1 page with status 404 | NAVIGATION-STRUCTURE line 158 routes `/` to `/dashboard` or `/login`, both M02. The wordmark is text, not a link, so no dead destination is offered |
| L2 | Stage 7 image never built | No Docker on this machine; `Dockerfile` and the CI job are written but unexecuted |
| L3 | SY-1 and SY-2 omit their Dashboard link | The target route arrives in M02. Adding it now would be a link to a 404, which A11Y-BASE and NAVIGATION-STRUCTURE rule 2 forbid |
| L4 | Overall coverage floors not claimed | M01 has no module code; the shell and worker are exercised by the browser and integration checks instead of unit tests |
| L5 | axe not run | Needs a browser automation dependency that is not installed, and SY pages are not the whole page set |
| L6 | Boundary checker resolves imports textually | Barrels other than `<module>/public` are not followed; acceptable while no module directory exists |
| L7 | Icons (Phosphor, U-D11), shadcn components, palette (U-D2) and typeface (U-D3) are absent | U-D2, U-D3 and U-D11 have no owner decision. Tokens use the documented values with the documented fallback typeface stack |
| L8 | Stage 8 staging deploy absent | No host, no vendor, no public URL (U-A1) |
| L9 | `idempotency_keys` not created | Its primary key carries a foreign key to `users` (B-06); the table ships in M02 with the user tables. M01 ships `outbox_events`, `rate_limit_counters` and the in-memory idempotency contract |

## What this does not prove

- Nothing about a real vendor-managed PostgreSQL, a managed queue, or any deployment target.
- Nothing about concurrency at NFR-070 volume: the relay test is single-process with a small batch.
- Nothing about Firefox, Safari, iOS or Android rendering (NFR-080, NFR-081): only Chromium was used.
- Nothing about authentication, ownership or authorization: no user table exists yet.
- Nothing about the email, storage or payment integrations.

## Files added by M01

Application and tooling: `src/kernel/{config,env,errors,idempotency,logger,outbox,registries,time}.ts`, `src/app/{layout.tsx,error.tsx,not-found.tsx,globals.css}`, `src/app/api/health/route.ts`, `src/app/unsupported-browser/page.tsx`, `src/ui/shell.tsx`, `src/ui/focus-heading.tsx`, `src/ui/nav.ts`, `src/worker/index.ts`, `tools/boundaries.ts`, `scripts/{check-boundaries,apply-migrations}.ts`, `db/migrations/0001_shared_kernel.sql`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `vitest.config.ts`, `Dockerfile`, `.github/workflows/ci.yml`, `.env.example`, `README.md`, `package.json`.

Tests: `tests/unit/*.test.ts` (10 files), `tests/integration/{outbox,worker}.test.ts`, `tests/integration/support/database.ts`, `tests/fixtures/boundary/**`.

## Documentation changed by M01

| Document | Change |
|---|---|
| [07-roadmap/MILESTONES.md](../07-roadmap/MILESTONES.md) | M01 rows proven here are checked; M11, M14, M02 and M05 dependency and scope corrections |
| [03-architecture/MODULE-BOUNDARIES.md](../03-architecture/MODULE-BOUNDARIES.md) | Section 7 heading no longer claims no files exist; section 8 records the implemented checker |
| [04-database/DATA-DICTIONARY.md](../04-database/DATA-DICTIONARY.md) | `idempotency_keys` records that it ships in M02 with the `users` foreign key |
| [08-build/M01-EVIDENCE.md](M01-EVIDENCE.md) | This file |
| [DOCUMENTATION-INDEX.md](../DOCUMENTATION-INDEX.md), [README.md](../README.md), [CHANGELOG.md](../CHANGELOG.md), [IMPLEMENTATION-READINESS.md](../IMPLEMENTATION-READINESS.md), [OPEN-DECISIONS.md](../OPEN-DECISIONS.md) | Inventory, authorization record and change log |
