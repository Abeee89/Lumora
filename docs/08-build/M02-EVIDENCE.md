# M02 Evidence

> Status: executed 2026-11-20 on `main` at `d2b3435` plus the uncommitted work listed at the end; build work tree `D:/Portofolio/Lumora`. Every command below was run in this session and outputs are pasted as observed. The milestone record is [M02-COMPLETION-REPORT.md](M02-COMPLETION-REPORT.md).

## Rules

- One section per checkpoint. Paste the exact command and the observed output.
- Record runtime, library and database versions.
- State pass or fail against the M02 checklist row. On fail or partial, name the cause and the row that stays unchecked.
- A row with no evidence stays unchecked in [MILESTONES.md](../07-roadmap/MILESTONES.md).
- No secret, token or personal data appears here.

## Checklist status

| M02 completion row | State | Evidence |
|---|---|---|
| Register, sign in, sign out, Google sign-in, reset, sign-in management work end to end | PARTIAL | E04, E08: register, sign in, sign out, reset and sign-in management are exercised end to end through the API and through the browser; **Google sign-in has no credentials** (U-5), so only its start route, its state signature and its unconfigured answer are proven. See L1 |
| Lockout, revocation and age confirmation verified (NFR-012, NFR-013, NFR-035) | PASS | E04: fifth failure locks for 15 minutes, a completed reset clears the lock and revokes every session, sign-out ends one session, revoke-all ends the others, age confirmation is refused when unchecked and required once by AUTH-03 |
| Audit events written and retention job runs | PASS | E04 (audit list over the API), E06 (retention rule and the scheduled tick that runs it) |
| Ownership contract test helper documented and used | PASS | E09 |
| Purge handler and export contributor registered for the new tables | PASS | E04: `purgeHandlers.keys()` is `["profile", "auth"]`, `exportContributors.keys()` is `["profile"]`, both entries execute; the `users` account columns have no contributor yet (L8) |
| Password-reset email delivered through the notification port in staging | NOT DONE | There is no staging host (U-A1) and no provider decision (U-A2). The port, the adapter and the inline send are proven locally in E04 and E08; nothing was delivered by a provider. Row stays unchecked |
| DEFINITION-OF-DONE.md checked | PARTIAL | Section "Definition of Done check": every item evaluated; the unmet ones name their cause |

## Environment and versions

| Item | Observed value |
|---|---|
| Runner | Windows 10.0.26200, x64 |
| Node.js | v24.13.1 |
| npm | 11.8.0 |
| git | 2.53.0.windows.1 |
| Repository | `D:/Portofolio/Lumora`, branch `main`, head `d2b3435` throughout this close-out, no commit made by me |
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
| Browser used for the runtime checks | Chromium, through the omp browser relay |

Host clock is UTC+07. Timestamps below are local unless stated.

## E01 Typecheck, CI stage 1

- Requirement: DEPLOYMENT-ARCHITECTURE section 4 stage 1; NFR-061.
- Command: `npm run verify` (`npm run typecheck && npm run lint && npm run boundaries && npm run test && npm run test:integration`).

Raw output, stages 1 and 2:

```
> lumora@0.1.0 typecheck
> tsc --noEmit

> lumora@0.1.0 lint
> eslint .

> lumora@0.1.0 boundaries
> tsx scripts/check-boundaries.ts

Boundary check passed.
```

- Result: PASS. `tsc --noEmit` and `eslint .` exit 0 with no output, and both ran after every M02 file existed.

## E02 Boundary check, CI stage 2

- Requirement: MODULE-BOUNDARIES sections 4 and 8.
- Command: `npm run boundaries` (`tsx scripts/check-boundaries.ts`).

```
Boundary check passed.
```

- Result: PASS with the three M02 module directories in place. The rank table now resolves `Authentication` (rank 1), `User profile` (rank 2) and `Notifications` (rank 7), each import goes through `<module>/public.ts`, and no kernel file imports a module. `tests/unit/boundaries.test.ts` still fails the four fixtures, so the checker is exercised in both directions.

## E03 Unit tests, CI stage 3

- Command: `npx vitest run --project unit`, run by `npm run verify`.

Raw output:

```
 Test Files  15 passed (15)
      Tests  59 passed (59)
   Duration  7.76s
```

| File | Covers |
|---|---|
| `tests/unit/auth-password.test.ts` | scrypt hashing, per-hash salt, verification of a wrong password (NFR-011) |
| `tests/unit/auth-device-label.test.ts` | user-agent to device label, "Unknown device" fallback (PU-5) |
| `tests/unit/auth-google-state.test.ts` | signed OAuth state: round trip, tamper, expiry, wrong secret, `ageConfirmed` and `timezone` carriage (FR-003) |
| `tests/unit/rate-limit.test.ts` | fixed window counting, limit boundary, window expiry (NFR-012) |
| `tests/unit/profile-defaults.test.ts` | profile defaults, display-name derivation, timezone validation (PROF-01, PU-4) |
| `tests/unit/config.test.ts` | every numeric default in one module, including the auth limits and cron (NFR-062) |
| `tests/unit/env.test.ts` | environment schema, including `EMAIL_SINK_DIR`, `GOOGLE_*` and `TRUSTED_PROXY_HOPS` |
| `tests/unit/errors.test.ts` | error catalog and envelope shape (ERROR-HANDLING section 4) |
| `tests/unit/registries.test.ts` | registry contract: duplicate key, empty key |
| `tests/unit/idempotency.test.ts` | replay once, payload-hash equality, per-user scope (ADR-011) |
| `tests/unit/logger.test.ts` | scrubbing of password, token, cookie and body keys (NFR-063) |
| `tests/unit/time.test.ts` | zone conversion, rollover day, DST-length day (ADR-006) |
| `tests/unit/health.test.ts` | `GET /api/health` (NFR-050) |
| `tests/unit/nav.test.ts` | navigation order and the guest/signed-in split (NAVIGATION-STRUCTURE section 2) |
| `tests/unit/boundaries.test.ts` | E02 |

- Result: PASS. Coverage floors in `vitest.config.ts` still apply where M01 owns logic (`src/kernel/**`), which now includes `crypto.ts`, `http.ts` and `rate-limit.ts`; `src/modules/auth/**` has no floor yet (L7).

## E04 Integration suite against PostgreSQL, CI stage 4

- Requirement: TESTING-STRATEGY section 11 at the integration tier; ADR-004, ADR-005, ADR-011; NFR-010 to NFR-020, FR-001 to FR-009.
- Command: `npm run test:integration` (`vitest run --project integration`), run by `npm run verify`. The harness starts its own embedded PostgreSQL 18.6 on a free ephemeral port unless `DATABASE_URL` is set, applies `db/migrations/0001_shared_kernel.sql` and `0002_auth_and_profile.sql`, then boots the real route handlers through `startApiEnvironment()`.

Raw output:

```
 Test Files  5 passed (5)
      Tests  27 passed (27)
   Duration  87.40s
```

| File | Tests | What it proves |
|---|---|---|
| `tests/integration/auth.test.ts` | 12 | sign-up writes user, credential account and profile row; validation refusals (short password, unconfirmed age gate, unknown zone, duplicate email); sign-in with the stored password; identical answer for a wrong password and an unknown account; lockout on the fifth failure with the reported wait; sign-out ends exactly the asking session; sign-in list, current marker, single revoke and revoke-others; identical reset answer for known and unknown address; reset completes once, clears the lock, revokes sessions and accepts the new password; a never-issued reset token is rejected; cross-origin mutation refused; unauthenticated read answered and no raw session token stored; responses stay out of every cache |
| `tests/integration/profile.test.ts` | 7 | profile read and one-version-at-a-time patch; `If-Match` required and a stale one answered with the current profile (EC-020, ADR-011); every patchable field validated before writing; onboarding steps, complete and reopen (FR-134..FR-137); cross-user sign-in hidden (E09); registration and execution of the M02 purge handlers and export contributor; unauthenticated profile read |
| `tests/integration/auth-cleanup.test.ts` | 2 | E06 |
| `tests/integration/outbox.test.ts` | 4 | unchanged from M01 |
| `tests/integration/worker.test.ts` | 2 | unchanged from M01 |

- Result: PASS. The suite ends with `database().end()` before `environment.stop()` in every file, so the embedded server is released; the run leaves no listener behind.
- Harness change forced by this session: `tests/integration/support/database.ts` reserved fixed port 55432 and a ghost listener on that port (a socket with no live process, connections timing out) made the stage hang. The harness now asks the operating system for a free ephemeral port, and `LUMORA_TEST_PG_PORT` pins one when a caller needs a known port.

## E05 Migration 0002 on an empty database

- Requirement: DATA-DICTIONARY; the M02 database row; "Migrations apply from an empty database" in DEFINITION-OF-DONE.
- Method: every integration file calls `applyMigrations` on an empty embedded cluster, so E04 is the proof. A direct check of the resulting schema:

```
CREATE TABLE IF NOT EXISTS users
CREATE TABLE IF NOT EXISTS auth_accounts
CREATE TABLE IF NOT EXISTS auth_sessions
CREATE TABLE IF NOT EXISTS auth_verifications
CREATE TABLE IF NOT EXISTS auth_audit_events
CREATE TABLE IF NOT EXISTS user_profiles
CREATE TABLE IF NOT EXISTS idempotency_keys
```

- Result: PASS, seven tables, applied from empty in each of the five integration files. Constraints carried by the migration and exercised by E04 and E06: `users.email` unique on the normalized address, `users.age_confirmed_at NOT NULL`, cascading deletes from `users`, one credential row per `(user, provider)`, `auth_audit_events.occurred_at` as the retention key, and the `idempotency_keys` foreign key that kept the table out of M01 (B-06).

## E06 Scheduled cleanup job, M02 "Jobs" deliverable

- Requirement: BACKGROUND-JOBS sections 1 and 2; M02 Jobs row ("password-reset token and expired-session cleanup (daily)", "auth audit retention cleanup (daily, 90 days)"); NFR-020.
- Command: `npx vitest run --project integration tests/integration/auth-cleanup.test.ts`.

Raw output, from the `npm run verify` run:

```
[23:20:29] INFO: worker.started
    intervalMs: 60000
[23:20:31] INFO: job.ran
    job: "auth_cleanup"
    result: {
      "sessions": 1,
      "resetTokens": 1,
      "auditEvents": 0
    }
[23:20:31] INFO: worker.stopped
```

| Assertion | Result |
|---|---|
| An expired session, an expired reset token, a spent reset token and a 91-day-old audit event are deleted; fresh rows of each kind are kept | PASS |
| A second run in the same state reports zeros (the work is idempotent) | PASS |
| `pgboss.queue` carries the declared policy and retry limit, `pgboss.schedule` carries the cron and the timezone | PASS |
| One dispatched tick of the queue deletes the row the rule targets | PASS |

- Registration (`src/worker/index.ts`): `scheduledJobs = [authCleanupJob]`, `boss.createQueue(name, { policy: "stately", retryLimit: 0 })`, `boss.work(name, …)` logging `job.ran` and `job.failed`, and `boss.schedule(name, cron, null, { key: "daily", singletonKey: "<name>:daily" })`. Queue `auth_cleanup`, cron `0 3 * * *`, timezone UTC.
- Result: PASS. `stately` rather than `singleton` because pg-boss 12 deduplicates a queued key only on the key-aware policies, the same finding M01 recorded for the outbox (E04 of [M01-EVIDENCE.md](M01-EVIDENCE.md)).
- Not proven: the job never ran against a vendor-managed queue, and no handler consumes the reset-email event (L2).

## E07 Build, CI stage 7 evidence

- Command: `npx next build` (same as `npm run build`, `output: "standalone"`).

Raw output (route table):

```
▲ Next.js 16.4.6 (Turbopack)
✓ Compiled successfully in 1121ms
  Running TypeScript ...
✓ Generating static pages using 7 workers (23/23) in 1725ms

Route (app)
┌ ƒ /
├ ƒ /_not-found
├ ƒ /api/app/auth/google
├ ƒ /api/app/auth/password-reset/complete
├ ƒ /api/app/auth/password-reset/request
├ ƒ /api/app/auth/sign-in
├ ƒ /api/app/auth/sign-ins
├ ƒ /api/app/auth/sign-ins/[signInId]
├ ƒ /api/app/auth/sign-ins/revoke-others
├ ƒ /api/app/auth/sign-out
├ ƒ /api/app/auth/sign-up
├ ƒ /api/app/profile
├ ƒ /api/app/profile/onboarding
├ ƒ /api/auth/callback/google
├ ƒ /api/health
├ ƒ /forgot-password
├ ƒ /login
├ ƒ /reset-password
├ ƒ /settings/appearance
├ ƒ /settings/profile
├ ƒ /settings/security
├ ƒ /signup
├ ƒ /unsupported-browser
└ ƒ /welcome

ƒ  (Dynamic)  server-rendered on demand
```

- Result: PASS for the build. Every route is dynamic because the root layout reads the session and theme cookies (L4).
- Not proven: the `Dockerfile` was not built (no Docker on this machine), so the single-image stage is still unexecuted, as in M01.

## E08 Runtime checks in a browser

Tooling: Chromium through the omp browser relay, `next dev` against embedded PostgreSQL on `http://localhost:3000`. Guest state was reached by clearing the relay tab's cookies.

| Check | Method | Observed | Result |
|---|---|---|---|
| PU-1 sign-up | form filled and submitted | account created, session cookie set, landing page reached, guest header replaced by the signed-in header | PASS (FR-001) |
| PU-2 sign-in | form filled and submitted | signed in, `window.location.assign` used so the App Router layout is not served from cache | PASS (FR-002) |
| Sign-out | button on `/settings/security` | redirect to `/login?notice=signedout`, session row gone | PASS |
| PU-4 profile save | display name and timezone changed, submitted | `Saved` announcement, values persisted across a reload, `version` advanced | PASS (PROF-01, FR-138) |
| PU-4 theme switch | six switches across system, light and dark | six of six applied `data-theme` on `documentElement`, set the `lumora_theme` cookie and announced `Theme set to ...`; no reload needed | PASS |
| PU-5 sign-in management | `/settings/security` with two sessions | both listed, current one marked, single revoke and revoke-others work | PASS (FR-004, FR-005) |
| PU-6 age gate | `/welcome` reached from the sign-up answer | age confirmation asked once, unchecked submit refused, checked submit completes onboarding | PASS (NFR-035) |
| Guest guard | `/settings/profile` with cookies cleared | redirected to `/login?notice=expired` | PASS (AC-E2E-10) |
| Google guard | `/welcome` with no cookie | redirected to `/login?notice=google` | PASS |
| Google unconfigured | `GET /api/app/auth/google` with no `GOOGLE_*` environment | redirected to `/login?notice=unavailable` instead of failing | PASS for the unconfigured path only (L1) |
| Target size | `getBoundingClientRect` of every interactive element on `/`, `/signup`, `/login`, `/forgot-password`, `/reset-password`, `/settings/profile`, `/settings/appearance`, `/settings/security` at 360, 768, 1280 and 2560 px | zero elements under 44 by 44 px on every page at every width | PASS (NFR-087) |
| Horizontal overflow | `documentElement.scrollWidth` against `clientWidth` at the same four widths | zero overflow on every page at every width | PASS (NFR-085, NFR-086, R-03) |
| Console | console capture on every page above | no error entries | PASS |

- Result: PASS for the shipped page set in Chromium.
- Defect found and fixed by this audit: several controls were below 44 px (the shared `controlClass`, the password field, the combobox input, the password toggle's hit area, the navigation links, the wordmark, the guest navigation, the `TextLink` call sites and the appearance radios). All were raised to a 44 px minimum and re-measured.
- Regression found and fixed by this audit: wrapping a checkbox or radio in a `<label htmlFor>` that points at its own input fires the click twice and the `change` event never arrives. Final markup uses implicit association (no `htmlFor`) with `pointer-events-none` on the input.
- Not proven: no Firefox, WebKit, iOS or Android run (NFR-080, NFR-081); axe was not run; the audit is DOM measurement, not a visual inspection.

## E09 Ownership contract helper

- Requirement: NFR-016; MODULE-BOUNDARIES section 6; M02 tests row "AC-E2E-10 cross-user pattern established as the reusable ownership contract test".
- File: `tests/integration/support/ownership.ts`, two exports: `signInIds(user)` reads the actor's own sign-in ids, `expectHiddenFromOtherUser(actor, { label, method, path, body? })` asserts the four-way contract for one resource (a foreign id answers 404, a foreign id never mutates, a foreign id never appears in a list, the owner's row is untouched).

Raw output from the profile suite:

```
 ✓ tests/integration/profile.test.ts (7 tests)
```

- Result: PASS. Used by `tests/integration/profile.test.ts` for `auth_sessions` through AUTH-07 and AUTH-08, and documented in the completion report. Every later milestone that ships a user-owned resource must adopt it.

## Definition of Done check

DEFINITION-OF-DONE section 1, task level, for this change:

| Item | State |
|---|---|
| Change within one milestone and its scope | PASS, M02 only; the endpoint side of FR-134, FR-135 and FR-137 only, the wizard rows stay with M13 |
| Typecheck, lint and boundary check pass | PASS, E01, E02 |
| Unit and integration tests pass | PASS, E03, E04 |
| Inputs validated on the server, error codes from API-ERRORS | PASS: every AUTH and PROF body and query is parsed by Zod at the boundary, and the API test asserts the envelope code and `details` for each refusal |
| No secrets or personal data in logs or fixtures | PASS: the logger scrubs password, token, cookie and body keys (E03); the Google client secret and the session secret are read from the environment and never logged; fixtures use synthetic addresses |
| No `TODO`, stub, placeholder, mock data or dead code | PASS; the only markers are the `PROPOSED` comments M01 left on unapproved numeric defaults |
| Docs touched by the change are updated | PASS: this file, the completion report, MILESTONES, OPEN-DECISIONS, IMPLEMENTATION-READINESS, DOCUMENTATION-INDEX, README and CHANGELOG |
| Reviewed and squash merged | NOT DONE, no review and no commit by me |

DEFINITION-OF-DONE section 2, milestone level:

| Item | State |
|---|---|
| All acceptance criteria ids pass | PARTIAL: AC-FR-001-* to AC-FR-009-*, AC-FR-138-* and the endpoint rows of AC-FR-134, AC-FR-135 and AC-FR-137 are covered by E04 and E08; the Google criteria need credentials (L1); AC-E2E-06 is proven for the timezone change through the profile part only |
| Every FR in scope implemented, no stubs | PASS for the endpoint rows; Google sign-in answers "unavailable" while unconfigured, which is the documented state rather than a stub (L1) |
| Tests per TESTING-STRATEGY section 11 matrix | PARTIAL: unit, integration and API tiers exist; the E2E tier needs stage 5 (U-A1) |
| Typecheck, lint, boundary check pass | PASS |
| Coverage floors met | PARTIAL: the configured floors cover `src/kernel/**` and pass; `src/modules/auth/**` has no floor yet (L7) |
| Ownership contract test for each new resource | PASS, E09 |
| Purge handler and export contributor per new user-data table | PARTIAL: `auth_sessions`, `auth_verifications`, `auth_accounts` and `user_profiles` are covered by the two handlers; the `users` account columns are not (L8) |
| Idempotency and concurrency verified | PASS: profile versioning with `If-Match` and EC-020 in E04; the idempotency helper is proven by M01's tests and now sits behind the AUTH routes |
| Migrations apply from an empty database | PASS, E05 |
| axe reports zero serious or critical issues, manual keyboard pass, no horizontal scroll at 360 | PARTIAL: manual keyboard pass and the four-width overflow measurement pass (E08); axe is not installed (L6) |
| Error, empty and loading states from PAGE-SPECIFICATIONS implemented | PASS for PU-1 to PU-6: every form renders its field errors from the envelope and its submit button shows the pending label |
| Structured logs carry no secrets or note content | PASS, E03 |
| Docs updated: SDD, DATA-DICTIONARY, API-ENDPOINTS, PAGE-SPECIFICATIONS as affected | PARTIAL: the seven tables match [DATA-DICTIONARY](../04-database/DATA-DICTIONARY.md) as planned and no column moved, so nothing there needed an edit; the routes and pages match API-ENDPOINTS and PAGE-SPECIFICATIONS; the account-column export gap is recorded in L8 |
| REQUIREMENT-TRACEABILITY updated | NOT DONE, the file tracks planned tests, not executed ones; the M02 rows are unchanged from the plan |
| MILESTONES.md checklist fully checked | NO, by design: four rows stay unchecked or partial, see the table at the top |
| Completion report in the Build Mode format | PASS, [M02-COMPLETION-REPORT.md](M02-COMPLETION-REPORT.md) |
| No future-phase feature code reachable | PASS: no dashboard, no onboarding wizard and no M03+ route exists; the navigation shell is deferred (L5) |
| Tag `m02-done` created | NOT DONE, the milestone is not done |

## Deviations and limitations

| Id | Deviation | Why it is not a pass |
|---|---|---|
| L1 | Google sign-in has no credentials | U-5 is undecided and no OAuth client exists. The start route, the signed state, the callback handler and the "unavailable" answer are proven; a real token exchange is not |
| L2 | Password-reset email is sent inline, not through a queue job | BACKGROUND-JOBS section 3 and OD-S05 forbid secrets in a queue payload and the link cannot be rebuilt from the stored hash, so the send happens inside the request scope with `after()`. Awaiting U-A2 and OD-S05 |
| L3 | Password-reset email never reaches a provider | No provider decision (U-A2) and no staging host (U-A1); the adapter writes to `EMAIL_SINK_DIR` locally |
| L4 | Every route is dynamic | The root layout reads the session and theme cookies, so nothing prerenders. Accepted for M02 and recorded |
| L5 | The navigation shell is deferred | PU-1 to PU-6 use the M01 header. The sidebar, rail and tab bar arrive with the first MVP destinations, so no empty shell is shipped (NAVIGATION-STRUCTURE rule 2) |
| L6 | axe not run | It needs a browser automation dependency that is not installed; the checks are DOM-level |
| L7 | No coverage floor for `src/modules/auth/**` | `vitest.config.ts` sets floors for `src/kernel/**` only; M01's reasoning still holds |
| L8 | The export contributor covers `user_profiles` only | The account columns (`users.email`, `users.age_confirmed_at`) have no contributor, so an export is incomplete until M14 adds one |
| L9 | UI components are hand-built | `COMPONENT-INVENTORY.md` names shadcn/ui, and U-D2, U-D3 and U-D11 are undecided; the components live in `src/ui/**` with the documented token fallbacks |
| L10 | `.artifacts/` was committed up to `d2b3435` | A previous commit tracked local run output, including a PostgreSQL data directory (1406 files). `.gitignore` now ignores `.artifacts/*` except the M00 OpenAPI diff, and the tracked copies are deleted in the working tree |
| L11 | Native-styled tokens, no icon set | Phosphor (U-D11) is undecided, so the UI uses text and the documented fallback typeface stack |

## What this does not prove

- Nothing about a vendor-managed PostgreSQL, a managed queue, a provider or any deployment target.
- Nothing about Google's token endpoint, an actual reset delivery, or any email rendering.
- Nothing about concurrency at NFR-070 volume: the rate limiter and the lockout are exercised single-process.
- Nothing about Firefox, Safari, iOS or Android rendering (NFR-080, NFR-081): only Chromium was used.
- Nothing about the M03+ modules, the dashboard, the wizard or the navigation shell: none of them exists.

## Work in the tree at the time of writing

`d2b3435` already contains the M02 implementation. This session added, on top of it:

- New: `src/kernel/jobs.ts` (the `ScheduledJob` contract), `tests/integration/auth-cleanup.test.ts`.
- Changed: `src/worker/index.ts` (queue, worker and schedule registration), `src/modules/auth/cleanup.ts` (the retention rule and the job), `src/modules/auth/public.ts`, `src/kernel/config.ts` (the job queue and cron), `src/kernel/db.ts` (`poolQueryable`), `src/ui/**` target-size fixes (control, combobox, password field, guest navigation, shell, the four auth forms, the appearance form), `tests/integration/support/database.ts` (free ephemeral port), `tests/integration/profile.test.ts` (the registration test), `.gitignore`.
- Deleted: the local run output under `.artifacts/` that `d2b3435` tracked, 1405 files; `.artifacts/oasdiff-release.json` is kept.

## Files added by M02

Application: `src/kernel/{crypto,http,rate-limit,jobs}.ts`; `src/modules/auth/{service,sessions,password,google,audit,cleanup,email-port,public}.ts`; `src/modules/profile/{service,public}.ts`; `src/modules/notifications/public.ts`; `src/server/{container,request-context,session}.ts`; `src/app/api/app/auth/**` (9 route files), `src/app/api/app/profile/**` (2), `src/app/api/auth/callback/google/route.ts`; `src/app/{page,login,signup,forgot-password,reset-password,welcome,settings}/**` with `src/app/settings/layout.tsx`; `src/ui/{api-client,control,combobox,password-field,guest-nav,settings-nav,sign-out-button,theme,format,messages}.tsx` and `src/ui/forms/**` (9 files); `db/migrations/0002_auth_and_profile.sql`.

Tests: `tests/unit/{auth-password,auth-device-label,auth-google-state,rate-limit,profile-defaults}.test.ts`; `tests/integration/{auth,profile,auth-cleanup}.test.ts` with `tests/integration/support/{api,environment,ownership}.ts`.

## Documentation changed by M02

| File | Change |
|---|---|
| [07-roadmap/MILESTONES.md](../07-roadmap/MILESTONES.md) | Four M02 rows with evidence checked, three left unchecked, and the "As built" note under the M02 card |
| [OPEN-DECISIONS.md](../OPEN-DECISIONS.md) | OD-M24, OD-M25 and OD-M26 in section C, and the M02 execution row in section G |
| [IMPLEMENTATION-READINESS.md](../IMPLEMENTATION-READINESS.md) | Sections 6 and 7 carry the M02 state and the M03 gate |
| [DOCUMENTATION-INDEX.md](../DOCUMENTATION-INDEX.md) | Two build records added, count 87 |
| [README.md](../../README.md), [docs/README.md](../README.md) | Build state and the reading order cover M02 |
| [CHANGELOG.md](../CHANGELOG.md) | M02 section |
