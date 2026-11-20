# M02 Completion Report

> Status: M02 execution record, 2026-11-20. Commands, raw output and residual risk are in [M02-EVIDENCE.md](M02-EVIDENCE.md). M02 is built and verified; it is not closed, because three checklist rows need inputs that do not exist yet (section 9). No ADR is Accepted, no open-decision row is closed, no vendor is selected, and M03 is not authorized by this report.

## 1. Executive summary

M02 turned the M01 foundation into an account system. The kernel gained cryptography, HTTP plumbing, rate limiting and a scheduled-job contract; `src/modules/auth` owns registration, sign-in, sessions, revocation, password reset, the Google start and callback routes behind ADR-004's port, audit events and the retention cleanup; `src/modules/profile` owns the profile document, onboarding steps, theme and rollover context; `src/modules/notifications` holds the email port with a file-sink adapter. On top of those, the app ships PU-1 to PU-6 and the three settings pages, ten AUTH routes and two PROF routes, migration `0002_auth_and_profile.sql` with seven tables, and the first scheduled job in the product (daily auth cleanup).

Everything M02 claims is proven by a command run in this repository: typecheck, lint, boundary check, 59 unit tests, 27 integration tests against PostgreSQL 18.6, a production build with a 24-route table, browser checks on every shipped page, and a scheduled job whose cron, queue policy and effect are asserted by test.

M02 is not a full pass. Google sign-in has no credentials, the reset email never reaches a provider because there is no provider decision and no host, and the ownership contract helper is proven for sign-in management only because that is the only user-owned resource M02 ships. Those rows stay unchecked or partial in [MILESTONES.md](../07-roadmap/MILESTONES.md), so no milestone-done tag exists.

## 2. Scope and authorization

| Item | Record |
|---|---|
| Milestone | M02 Authentication and profile ([MILESTONES.md](../07-roadmap/MILESTONES.md)) |
| Authorization | Owner instruction to execute M02 in the build session; the scope is the M02 card fixed by `Build Mode.txt` and the roadmap, recorded in [OPEN-DECISIONS.md](../OPEN-DECISIONS.md) section G, 2026-11-20 |
| Repository | `D:/Portofolio/Lumora`, branch `main`, `d2b3435` at start, no commit made by me |
| In scope | `users`, `auth_accounts`, `auth_sessions`, `auth_verifications`, `auth_audit_events`, `user_profiles`, `idempotency_keys`; AUTH-01 to AUTH-09 and PROF-01 to PROF-03; PU-1 to PU-6 and the profile, appearance and security sections of A-15; the auth cleanup job; the ownership contract helper; the notification email port |
| Out of scope | PROF-04 to PROF-08 (M14), the onboarding wizard UI (M13), the dashboard (M04), subjects and topics (M03), the navigation shell, any deployment, any vendor selection |
| Build Mode rules | No invented specification; no milestone beyond M02; palette, typeface and icon decisions left to the owner (U-D2, U-D3, U-D11); Google credentials and the email provider left to the owner (U-5, U-A2) |

## 3. Functionality delivered

| Area | What exists now | Proof |
|---|---|---|
| Registration | AUTH-01 creates the user, the credential account and the profile row in one transaction, validates the password rule, the age gate, the timezone and the e-mail uniqueness | `tests/integration/auth.test.ts` |
| Sign-in | AUTH-02 verifies the stored scrypt hash, answers a wrong password exactly like an unknown account, and stores only a hash of the session token | `tests/integration/auth.test.ts` |
| Lockout | Five failures lock the account for 15 minutes; the correct password is refused while locked and the remaining wait is reported | `tests/integration/auth.test.ts` |
| Sessions | AUTH-06 lists the sign-ins with their device label and marks the current one; AUTH-07 revokes one; AUTH-08 revokes the others; AUTH-03 ends the asking session | `tests/integration/auth.test.ts`, browser checks |
| Password reset | AUTH-04 answers identically for a known and an unknown address, AUTH-05 consumes the token once, clears the lock and revokes every session | `tests/integration/auth.test.ts` |
| Google sign-in | AUTH-09 starts the flow inside an HMAC-signed state that carries the age confirmation and timezone, the callback re-enters AUTH-01 with `ageConfirmed`, and an unconfigured deployment answers `unavailable` | `tests/unit/auth-google-state.test.ts`, browser check on the unconfigured path (L1) |
| Age confirmation | The sign-up form asks for it, the server refuses an unconfirmed sign-up, and the OAuth path carries the answer in the signed state so it is asked once | `tests/integration/auth.test.ts`, browser check |
| Audit | Six event types (`sign_in`, `sign_in_failed`, `lockout`, `password_reset`, `session_revoked`, `account_deleted`) are written with the actor, the address and the time | `tests/integration/auth.test.ts`, `tests/integration/profile.test.ts` |
| Profile | PROF-01 reads, PROF-02 patches under `If-Match` with the version reported in `ETag`, PROF-03 records onboarding steps and the complete/reopen transitions | `tests/integration/profile.test.ts` |
| Appearance | Theme is a non-HttpOnly cookie plus the profile column, applied by `globals.css` through `light-dark()` tokens and `:root[data-theme=...]` | browser checks, six of six switches |
| Security page | Sign-in management, sign-out and the reset entry point in one place | browser checks |
| Notification port | `src/modules/notifications/public.ts` exposes the email port; the reset message is rendered and either sent or written to `EMAIL_SINK_DIR` | `tests/integration/auth.test.ts` |
| Rate limiting | Fixed windows per address for sign-in, sign-up and reset, plus a per-e-mail window for reset; ordinary reads and writes fail open, the three sensitive routes fail closed | `tests/unit/rate-limit.test.ts`, `tests/integration/auth.test.ts` |
| CSRF | Mutations require the exact origin; a foreign origin is refused | `tests/integration/auth.test.ts` |
| Cleanup job | `authCleanupJob` deletes expired sessions, expired and spent reset tokens and audit events past the 90-day retention, on the `auth_cleanup` queue, cron `0 3 * * *` UTC | `tests/integration/auth-cleanup.test.ts` |
| Ownership contract | `expectHiddenFromOtherUser` and `signInIds` in `tests/integration/support/ownership.ts`, used for sign-in management | `tests/integration/profile.test.ts` |
| Purge and export | `purgeHandlers` carries `profile` and `auth`; `exportContributors` carries `profile`; both are executed by test | `tests/integration/profile.test.ts` |

## 4. Files

| Group | Files |
|---|---|
| Kernel | `src/kernel/crypto.ts`, `http.ts`, `rate-limit.ts`, `jobs.ts`; changes in `config.ts`, `db.ts`, `env.ts`, `errors.ts` |
| Auth module | `src/modules/auth/service.ts`, `sessions.ts`, `password.ts`, `google.ts`, `audit.ts`, `cleanup.ts`, `email-port.ts`, `public.ts` |
| Profile and notifications | `src/modules/profile/service.ts`, `public.ts`, `src/modules/notifications/public.ts` |
| Server | `src/server/container.ts`, `request-context.ts`, `session.ts` |
| Routes | `src/app/api/app/auth/**` (9 files), `src/app/api/app/profile/**` (2), `src/app/api/auth/callback/google/route.ts` |
| Pages | `src/app/page.tsx`, `login`, `signup`, `forgot-password`, `reset-password`, `welcome`, `settings/{layout,profile,appearance,security}` |
| UI | `src/ui/api-client.ts`, `control.tsx`, `combobox.tsx`, `password-field.tsx`, `guest-nav.tsx`, `settings-nav.tsx`, `sign-out-button.tsx`, `theme.ts`, `format.ts`, `messages.ts`, `src/ui/forms/**` (9 files) |
| Database | `db/migrations/0002_auth_and_profile.sql` |
| Worker | `src/worker/index.ts` (queue, worker and schedule registration) |
| Tests | `tests/unit/**` (15 files), `tests/integration/{auth,profile,auth-cleanup}.test.ts`, `tests/integration/support/{api,environment,ownership,database}.ts` |
| Configuration | `.env.example` (email sink, Google variables, proxy hops), `.gitignore` (local run output) |

## 5. Database changes

| Object | Definition | Applied |
|---|---|---|
| `users` | Identity row: normalised unique e-mail, display name, `age_confirmed_at NOT NULL`, `timezone`, `password_hash` for the owned credential path | `db/migrations/0002_auth_and_profile.sql`, applied to an empty database by the integration harness |
| `auth_accounts` | One credential row per `(user, provider)`, carrying the provider subject and the hashed secret material | same migration |
| `auth_sessions` | Session rows with the hashed token, the device label, the address, `last_active_at` and the expiry the cleanup job reads | same migration |
| `auth_verifications` | Reset tokens with `consumed_at` and the expiry; single use | same migration |
| `auth_audit_events` | The six event types with `occurred_at` as the retention key; the row survives account deletion with `user_id` null | same migration |
| `user_profiles` | The profile document: display name, timezone, rollover hour, theme, primary goal, onboarding timestamps, the step map and the `version` column ADR-011 needs | same migration |
| `idempotency_keys` | The table M01 deferred (B-06): its primary key carries the `users` foreign key | same migration |
| Indexes and constraints | Unique e-mail per normalised address, unique session token hash, unique `(user, provider)`, cascading deletes from `users`, the retention index on `auth_audit_events.occurred_at` | same migration |

## 6. Tests executed and results

| Command | Result |
|---|---|
| `npm run typecheck` | exit 0, strict settings |
| `npm run lint` | exit 0 (`eslint .`, flat config) |
| `npm run boundaries` | `Boundary check passed.` with the three new module directories |
| `npm run test` | 15 files, 59 tests, all pass |
| `npm run test:integration` | 5 files, 27 tests, all pass against PostgreSQL 18.6, embedded or `DATABASE_URL` |
| `npm run verify` | the five above in CI order, exit 0 |
| `npm run build` | standalone output, 24 route entries, every route dynamic |
| Browser checks | sign-up, sign-in, sign-out, profile save, six theme switches, sign-in management, age gate, three guard redirects, 44 px targets and no horizontal overflow on eight pages at four widths, no console errors |

The M02 acceptance assertions: an expired session, an expired token, a spent token and a 91-day-old audit event are deleted by one job run while fresh rows survive; the job is registered on the `stately` queue with cron `0 3 * * *` and one dispatched tick deletes a row; the fifth failed sign-in locks for 15 minutes and the correct password is refused until the window ends; a reset completes once, clears the lock and revokes sessions; `If-Match` is required and a stale version is answered with the current profile; `purgeHandlers` reports `["profile", "auth"]` and `exportContributors` reports `["profile"]`, and both entries execute.

## 7. Technical findings

1. **Reading cookies in the root layout makes every page dynamic.** `docs` allow a static shell, but the theme and session read happen above the page, so the build reports `ƒ` for all 24 routes. Accepted for M02 and recorded (L4); a static shell would need the theme to be resolved on the client or in a middleware.
2. **A named reader paid for the second connection path.** The integration harness needs a `Pool` and the request path needs a request-scoped `Queryable`; `src/kernel/db.ts` now exposes `poolQueryable(pool)` so both use the same interface without a cast.
3. **A wrapping `<label htmlFor>` around its own input fires the click twice.** The appearance radios and the shared `Checkbox` lost their `change` events. The fix is implicit association plus `pointer-events-none` on the input; a browser test would have caught this, unit tests could not.
4. **`window.location.assign` beats `router.push` after sign-in.** The App Router served the cached guest layout, so the header kept the guest navigation until a full navigation happened.
5. **A bad `enum` value is caught by Zod before the service runs.** The onboarding step test had to assert the Zod `invalid_value` path rather than the service's own `enum` rule, which is the intended precedence.
6. **A ghost listener on port 55432 broke `npm run verify`.** The integration suite pinned that port for its embedded server; a socket with no live process held it and connections timed out. The harness now reserves a free ephemeral port and `LUMORA_TEST_PG_PORT` can pin one.
7. **Rate-limit windows make unrelated assertions flaky.** The tests encode the process id in the address and use fresh e-mails per run so a fixed window never turns a later unrelated assertion into a 429.
8. **pg-boss 12 deduplicates a queued key only on key-aware policies**, as M01 found for the outbox. The cleanup job uses `stately` with `retryLimit: 0` and a daily `singletonKey`.

## 8. Known limitations

| Id | Limitation | Cause |
|---|---|---|
| L1 | Google sign-in is unexercised | No OAuth client (U-5); only the start route, the signed state, the callback handler and the unconfigured answer are proven |
| L2 | The reset email is sent inline, not from a queue job | BACKGROUND-JOBS section 3 and OD-S05 forbid secrets in a queue payload and the stored hash cannot rebuild the link; the send runs in the request scope |
| L3 | No provider ever delivered a message | No provider decision (U-A2) and no host; the adapter writes to `EMAIL_SINK_DIR` |
| L4 | Every route is dynamic | The root layout reads the session and theme cookies |
| L5 | The navigation shell is deferred | The sidebar, rail and tab bar arrive with the first MVP destinations; no empty shell ships |
| L6 | axe was not run | No browser automation dependency is installed |
| L7 | No coverage floor for `src/modules/auth/**` | Floors still cover `src/kernel/**` only |
| L8 | The export contributor covers `user_profiles` only | The `users` account columns have no contributor; M14 must add one before an export is complete |
| L9 | UI components are hand-built, without icons | `COMPONENT-INVENTORY.md` names shadcn/ui and U-D2, U-D3 and U-D11 are undecided |
| L10 | `.artifacts/` was tracked up to `d2b3435` | A previous commit captured local run output, including a PostgreSQL data directory; `.gitignore` now prevents a repeat and the tracked copies are deleted in the working tree |
| L11 | Chromium only | No Firefox, WebKit, iOS or Android run |

## 9. Remaining tasks

| Task | Blocked by | What unblocks it |
|---|---|---|
| Google sign-in exercised end to end | U-5 (OAuth client and consent screen) | Credentials in the environment; then the exchange, the age gate and the replay rejection can be tested |
| Password-reset delivery through a provider | U-A2 (provider) and U-A1 (host) | A provider decision; then staging |
| Export contributor for the account columns | M14 | The export format |
| Coverage floor for `src/modules/auth/**` | Nothing but a decision | A floor in `vitest.config.ts` plus the tests to hold it |
| axe report with zero serious or critical findings | A browser automation dependency | Playwright-class tooling; the page set now exists |
| Firefox, WebKit and mobile rendering | CI stage 5 | U-A1 and the E2E runner |
| Card in [MILESTONES.md](../07-roadmap/MILESTONES.md) to close M02 | The rows above | Their evidence |

## 10. Docs updated

| Document | Change |
|---|---|
| [08-build/M02-EVIDENCE.md](M02-EVIDENCE.md) | New: environment, one section per checkpoint with raw output, checklist status, Definition of Done evaluation, eleven limitations |
| [08-build/M02-COMPLETION-REPORT.md](M02-COMPLETION-REPORT.md) | This file |
| [07-roadmap/MILESTONES.md](../07-roadmap/MILESTONES.md) | M02 proven rows checked, the open rows marked, "As built" note under the M02 card |
| [OPEN-DECISIONS.md](../OPEN-DECISIONS.md) | OD-M24, OD-M25 and OD-M26 in section C, and the M02 execution row in section G |
| [IMPLEMENTATION-READINESS.md](../IMPLEMENTATION-READINESS.md) | Sections 6 and 7 carry the M02 state and the M03 gate |
| [DOCUMENTATION-INDEX.md](../DOCUMENTATION-INDEX.md) | Two build records added, count 87 |
| [README.md](../README.md), [docs/README.md](../README.md) | Build state and the reading order cover M02 |
| [CHANGELOG.md](../CHANGELOG.md) | M02 section |

## 11. Definition of Done at M02 level

The item-by-item evaluation is in [M02-EVIDENCE.md](M02-EVIDENCE.md) section "Definition of Done check". Met: typecheck, lint and boundary check; unit and integration tiers; server-side validation with documented error codes; the migration applies from an empty database; the ownership contract test; idempotency and concurrency through `If-Match`; structure without secrets; error, empty and loading states on every shipped form; no reachable future-phase code. Partially met: acceptance criteria that need Google credentials or a staging host, the coverage floor for the new module, the export contributor for the account columns, axe, and a fully checked milestone list. Not met: the E2E tier, cross-browser rendering, and a `m02-done` tag.

## 12. Recommended next milestone

M03 Subjects and topics, on its own authorization. M03 is the first milestone that consumes the ownership helper (`expectHiddenFromOtherUser`), the session context and the profile timezone the timer will need; it adds no new infrastructure, so it can be built without any of the open M02 decisions.

Before M03 code, one input would remove rework: whether the profile timezone and rollover hour are read per request from `user_profiles` (as M02 does) or cached in the session, because M03's archive and restore endpoints will read them in the same way. The milestone itself is sequenced by [MILESTONES.md](../07-roadmap/MILESTONES.md): `subjects`, `topics`, SUBJ-01 to SUBJ-07 and TOP-01 to TOP-08, pages A-7 and A-8, the archive-guard contract owned by Subjects, and the `TopicArchived` and `TopicStatusChanged` events.

## 13. Not done, and not claimed

- No ADR is Accepted; ADR-004 stays provisional because the owned auth implementation is an amendment awaiting U-A4, and OD-S02 to OD-S06 stay open.
- No vendor is selected, no provider is chosen, no requirement baseline is approved.
- Google sign-in was never completed against Google's endpoints; no provider delivered a reset message.
- M03 to M15 are unauthorized, and Build Mode beyond M02 rests on the M02 authorization recorded in [OPEN-DECISIONS.md](../OPEN-DECISIONS.md) section G.
- Nothing was committed by me. The owner's commit `d2b3435` contains the M02 implementation; this session's fixes, the job code and the new tests are in the working tree.
