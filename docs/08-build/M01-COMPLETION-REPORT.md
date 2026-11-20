# M01 Completion Report

> Status: M01 execution record, 2026-11-20. Commands, raw output and residual risk are in [M01-EVIDENCE.md](M01-EVIDENCE.md). M01 is built and verified; it is not closed, because three checklist rows need inputs that do not exist yet (section 9). No ADR is Accepted, no open-decision row is closed, no vendor is selected, and M02 remains unauthorized.

## 1. Executive summary

M01 built the foundation the later milestones cannot violate: a strict TypeScript monolith on Next.js 16 with a shared kernel (configuration, time, errors, logging, idempotency, outbox, registries, environment), a mechanical module-boundary checker over the 19-rank table, a transactional outbox relayed by a worker with a once-only guarantee, the health endpoint, the system pages SY-1 to SY-3 inside the responsive shell, a CI workflow for stages 1 to 4 and 7, and the first migration.

Everything M01 claims is proven by a command run in the repository: typecheck, lint, boundary check, 35 unit tests, 6 integration tests against PostgreSQL 18.6, a production build, and browser checks at 360 px and 1280 px. Everything M01 does not claim is listed in section 8 with the reason.

M01 is not a full pass. The staging deploy, CI stages 5 and 8, and the axe accessibility report need inputs that are absent: no host or vendor (U-A1), no browser automation dependency, and no product page set to scan. Those three rows stay unchecked in [MILESTONES.md](../07-roadmap/MILESTONES.md), so no milestone-done tag exists and M02 is not authorized by this report.

## 2. Scope and authorization

| Item | Record |
|---|---|
| Milestone | M01 Project foundation ([MILESTONES.md](../07-roadmap/MILESTONES.md)) |
| Authorization | Owner instruction "approved" answering the M01 delivery report; recorded in [OPEN-DECISIONS.md](../OPEN-DECISIONS.md) section G, 2026-11-20. The earlier row, 2026-11-19, authorized M01 after the M00 amendments |
| Repository | `D:/Portofolio/Lumora`, branch `main`, `eca6091` at start, `9a84d8a` committed mid-session by the owner |
| In scope | Shared kernel, boundary tooling, CI stages 1 to 4 and 7, first migration, health endpoint, shell and SY pages, outbox and worker entry point, empty registries, README and docs updates |
| Out of scope | Every product module and page, authentication, any deployment, preview environments, icons and component library, `idempotency_keys` (M02) |
| Build Mode rules | No invented specification; no milestone beyond M01; palette, typeface and logo decisions left to the owner (U-D2, U-D3, U-D11) |

## 3. Functionality delivered

| Area | What exists now | Proof |
|---|---|---|
| Configuration | `src/kernel/config.ts` holds every numeric product default in one place, each unapproved value marked `PROPOSED` | `tests/unit/config.test.ts` |
| Time | `src/kernel/time.ts` converts instants to a local date under an IANA zone and a rollover hour, returns the local-day bounds (23, 24 or 25 hours across DST), and floors elapsed minutes from timestamps only | `tests/unit/time.test.ts` |
| Errors | `src/kernel/errors.ts` mirrors the ERROR-HANDLING code catalog and builds the response envelope with a stable status mapping | `tests/unit/errors.test.ts` |
| Logging | `src/kernel/logger.ts` writes structured lines, carries a request id, and redacts password, token, cookie, secret, note and body keys at any depth | `tests/unit/logger.test.ts` |
| Idempotency | `src/kernel/idempotency.ts` hashes a request deterministically, re-runs the effect at most once per key, replays the stored result, refuses the same key with a different payload, and scopes keys per user | `tests/unit/idempotency.test.ts` |
| Outbox | `src/kernel/outbox.ts` appends inside the caller's transaction and relays to pg-boss under `FOR UPDATE SKIP LOCKED` with `relayed_at` set in the same transaction | `tests/integration/outbox.test.ts`, `tests/integration/worker.test.ts` |
| Registries | `src/kernel/registries.ts` defines the purge-handler, export-contributor and archive-guard contracts, empty in M01, rejecting duplicates and empty keys | `tests/unit/registries.test.ts` |
| Environment | `src/kernel/env.ts` validates the deployment variables and names the offending one | `tests/unit/env.test.ts` |
| Boundary tooling | `tools/boundaries.ts` encodes the 19 module ranks and fails an upward import, a deep cross-module import and a kernel import of a module | `tests/unit/boundaries.test.ts`, `npm run boundaries` |
| Health endpoint | `GET /api/health` returns `{"status":"ok"}` with `cache-control: no-store` and echoes a caller request id | `tests/unit/health.test.ts`, browser probe |
| Shell | `src/ui/shell.tsx` renders the skip link, the wordmark, the content column, one polite live region and the focus-on-navigation move; the navigation renders nothing because no route ships | `tests/unit/nav.test.ts`, browser checks |
| System pages | SY-1 not found, SY-2 error boundary with one alert region and a Retry button, SY-3 unsupported browser listing the NFR-080 and NFR-081 browsers | browser checks, including with JavaScript disabled |
| Worker | `src/worker/index.ts` starts pg-boss, relays every configured interval with one immediate pass, never overlaps passes, and shuts down on SIGTERM or SIGINT | `tests/integration/worker.test.ts` |
| Delivery | `Dockerfile` (multi-stage, non-root, one image for web and worker), `.github/workflows/ci.yml` (stages 1 to 4, 7), `npm run verify` | workflow file; image build not executed (section 8) |

## 4. Files

| Group | Files |
|---|---|
| Kernel | `src/kernel/config.ts`, `env.ts`, `errors.ts`, `idempotency.ts`, `logger.ts`, `outbox.ts`, `registries.ts`, `time.ts` |
| App and UI | `src/app/layout.tsx`, `error.tsx`, `not-found.tsx`, `globals.css`, `src/app/api/health/route.ts`, `src/app/unsupported-browser/page.tsx`, `src/ui/shell.tsx`, `src/ui/focus-heading.tsx`, `src/ui/nav.ts` |
| Worker and tooling | `src/worker/index.ts`, `tools/boundaries.ts`, `scripts/check-boundaries.ts`, `scripts/apply-migrations.ts` |
| Database | `db/migrations/0001_shared_kernel.sql` |
| Configuration | `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `vitest.config.ts`, `.env.example`, `.gitignore`, `public/.gitkeep` |
| Delivery | `Dockerfile`, `.github/workflows/ci.yml`, `README.md` |
| Tests | `tests/unit/*.test.ts` (10 files), `tests/integration/outbox.test.ts`, `tests/integration/worker.test.ts`, `tests/integration/support/database.ts`, `tests/fixtures/boundary/**` |

## 5. Database changes

| Object | Definition | Applied |
|---|---|---|
| `outbox_events` | Job name, payload, `idempotency_key` with a unique constraint, `relayed_at`, created and relayed timestamps; a partial index serves the relay query | `db/migrations/0001_shared_kernel.sql`, applied to an empty database by `applyMigrations` in the integration suite |
| `rate_limit_counters` | UNLOGGED counter table for the rate limiter that M15 and later use | same migration |
| `pgboss` schema | Created by pg-boss 12.38.2 at worker start | integration suite |

Not created in M01: `idempotency_keys`. Its primary key carries a foreign key to `users`, which M02 creates, so the table ships with the user tables (B-06). M01 ships the replay contract and an in-memory store instead.

## 6. Tests executed and results

| Command | Result |
|---|---|
| `npm run typecheck` | exit 0, strict settings |
| `npm run lint` | exit 0 (`eslint .`, flat config) |
| `npm run boundaries` | `Boundary check passed.` |
| `npm run test` | 10 files, 35 tests, all pass |
| `npm run test:coverage` | kernel 95.8% lines, 89.3% statements, 86.0% functions, 83.8% branches against floors 80/80/70/70; overall 78.7% lines (not claimed, section 8) |
| `npm run test:integration` | 2 files, 6 tests, all pass against PostgreSQL 18.6, embedded or `DATABASE_URL` |
| `npm run verify` | the five above in CI order, all pass |
| `npm run build` | standalone output, 3 routes, served with `next start` for the browser checks |
| Browser checks | health, SY-1, SY-2, SY-3, shell landmarks, skip link, 44 px target, no horizontal scroll at 360 px and 1280 px, contrast 7.63:1 to 15.3:1, no console errors, scriptless rendering |

The four integration assertions of the milestone acceptance: a committed outbox row is relayed once and a second pass sends nothing; a rollback leaves no row; a repeated singleton key stays one queued job; a duplicate `idempotency_key` is rejected by the database. The worker test drives the real entry point and observes one job, one `relayed_at`, and no second dispatch over four further intervals.

## 7. Technical findings

1. **pg-boss 12 queue policy decides deduplication.** A repeated `singletonKey` collapses only on `short`, `stately` or `exclusive` queues; `singleton` deduplicates active jobs alone. The first integration run with `singleton` queued two jobs and failed. The `JobQueue` contract now states the requirement.
2. **`date-fns-tz` 3.2.0 has no `TZDate`.** That class lives in `@date-fns/tz`. `time.ts` uses `toZonedTime` and `fromZonedTime`; DST behavior is asserted by test rather than assumed.
3. **Next 16 removed `next lint`.** The lint script calls ESLint on the same flat config. `next build` also rewrites `tsconfig.json` (`jsx: react-jsx`, a `.next/dev/types` include), which is expected and kept.
4. **Focus management is not automatic.** The skip link needed a focusable `main`, and A11Y-BASE's focus-on-navigation rule needed a small client component plus `tabIndex={-1}` on each page h1.
5. **pg-boss exports a named `PgBoss`**, and `stop()` takes `graceful`, not `wait`.
6. **The boundary checker resolves imports textually.** Barrels other than `<module>/public.ts` are not followed, which is acceptable while no module directory exists.

## 8. Known limitations

| Id | Limitation | Cause |
|---|---|---|
| L1 | `GET /` answers 404 | Its documented targets, `/dashboard` and `/login`, are M02 routes. The wordmark is text, so nothing links to a 404 |
| L2 | The container image was never built | Docker is absent on this machine; the `Dockerfile` and CI stage 7 job are unexecuted |
| L3 | SY-1 and SY-2 omit their Dashboard link | The target route arrives in M02; A11Y-BASE forbids a dead destination |
| L4 | Overall coverage floors (80%) are not claimed | M01 holds no module code; the shell and worker are covered by browser and integration checks instead |
| L5 | axe was not run | No browser automation dependency is installed and the scanned page set is incomplete |
| L6 | The boundary checker does not follow barrels | Textual resolution, see section 7, item 6 |
| L7 | Icons, component library, palette and typeface are absent | U-D11, U-D2 and U-D3 have no decision; tokens use the documented values and fallback typeface |
| L8 | No staging deploy and no preview environments | U-A1 |
| L9 | Only Chromium was exercised | AC-FR-139 needs Chrome, Firefox and WebKit; the latter two are unverified |

## 9. Remaining tasks

| Task | Blocked by | What unblocks it |
|---|---|---|
| Staging deploy from the single image with a health check | U-A1 (host and vendor) | A host decision; then CI stage 8 |
| CI stages 5 and 8 running on every merge | U-A1; stage 5 also needs a product page | As above; stage 5 follows the first product route |
| axe report with zero serious or critical findings | No browser automation dependency; incomplete page set | A Playwright-class dependency plus the M02 pages |
| Firefox, Safari, iOS and Android rendering of the shell | No cross-browser runner (part of stage 5) | As above |
| Card in [MILESTONES.md](../07-roadmap/MILESTONES.md) to close M01 | The three rows above | Their evidence |

## 10. Docs updated

| Document | Change |
|---|---|
| [08-build/M01-EVIDENCE.md](M01-EVIDENCE.md) | New: environment, one section per stage and runtime check with raw output, checklist status, nine limitations, Definition of Done evaluation |
| [08-build/M01-COMPLETION-REPORT.md](M01-COMPLETION-REPORT.md) | This file |
| [07-roadmap/MILESTONES.md](../07-roadmap/MILESTONES.md) | M01 proven rows checked, "As built" note with the deferred deliverables; M11, M14, M02, M05 and M06 corrections |
| [03-architecture/MODULE-BOUNDARIES.md](../03-architecture/MODULE-BOUNDARIES.md) | Section 8 describes the implemented checker; section 7 no longer says no files exist |
| [04-database/DATA-DICTIONARY.md](../04-database/DATA-DICTIONARY.md) | `idempotency_keys` records that it ships in M02 with the `users` foreign key |
| [OPEN-DECISIONS.md](../OPEN-DECISIONS.md) | Section G row for the M01 execution and close-out record |
| [IMPLEMENTATION-READINESS.md](../IMPLEMENTATION-READINESS.md) | Section 6 records M01 as executed with its open rows |
| [DOCUMENTATION-INDEX.md](../DOCUMENTATION-INDEX.md), [README.md](../README.md), [CHANGELOG.md](../CHANGELOG.md) | Inventory at 85 documents and the M01 change log |

## 11. Definition of Done at M01 level

The item-by-item evaluation is in [M01-EVIDENCE.md](M01-EVIDENCE.md) section "Definition of Done check". Met: typecheck, lint and boundary check; unit and integration tiers; the migration applies from an empty database; the registries exist as empty contracts; the shell and system pages with manual keyboard and contrast checks; structure without secrets; no reachable future-phase code. Not met: coverage floors overall, axe, the E2E tier, cross-browser rendering, a completed milestone checklist and a `m01-done` tag. Not applicable: ownership contract tests, endpoint idempotency, purge handlers for user-data tables, because M01 ships no resource.

## 12. Recommended next milestone

M02 Authentication and profile, on its own authorization. Before code, three inputs are needed, and two of them change what M02 can finish:

1. **Email provider (U-05).** AUTH-04, AUTH-05 and the verification mail in AUTH-01, AUTH-02 need a live provider or a recorded decision to build against a local sink first, as M00 did.
2. **Password policy wording (U-6) and age confirmation (NFR-035).** The signup copy cannot be written without it.
3. **Vendor and host (U-A1, U-A2).** U-A2 is needed by the M02 close, which is the first milestone whose acceptance includes a deployed endpoint.

The milestone itself is sequenced by [MILESTONES.md](../07-roadmap/MILESTONES.md): `users`, `auth_accounts`, `auth_sessions`, `auth_verifications`, `auth_audit_events`, `user_profiles` and `idempotency_keys`; AUTH-01 to AUTH-09 plus PROF-01 to PROF-03; pages PU-1 to PU-6 and the profile sections of A-15. The M00 findings that constrain it: Better Auth stores ids as `text` unless the columns are pre-created as `uuid`, and the auth schema needs the unique `(providerId, accountId)` guard that the spike lacked.

M02 also carries the first ownership contract test and the first purge handler and export contributor, so `src/modules/auth` and `src/modules/profile` are the first entries in a directory the boundary checker already polices.

## 13. Not done, and not claimed

- No ADR is Accepted; no OD-S02 to OD-S06 row and no B-01, B-02 or B-09 correction is approved.
- No vendor is selected, no requirement baseline is approved, and no owner acceptance of the M00 amendments is recorded.
- No product page, product route, module directory or user table exists. The navigation renders nothing by design.
- M02 to M15 are unauthorized, and Build Mode beyond M01 rests on the M01 authorization recorded in [OPEN-DECISIONS.md](../OPEN-DECISIONS.md) section G.
- Nothing was committed by me; the owner committed `9a84d8a` mid-session, and the later work is in the working tree.