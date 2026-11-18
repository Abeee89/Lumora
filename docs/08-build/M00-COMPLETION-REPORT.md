# M00 Completion Report

> Status: M00 close-out record, 2026-11-18. Evidence only. No ADR is Accepted, no vendor is selected, no production schema or code is merged, and M01 is not authorized.

## 1. Executive summary

M00 executed the nine evidence protocols in the approved charter, recorded the results in [M00-EVIDENCE.md](M00-EVIDENCE.md), amended the four ADRs named by the charter, and tore down the spike worktree and branch. The core local behaviors that the spike was created to test are proven: lockout, session revocation, inactivity expiry, password hashing, UUIDv7 generation, atomic queue enqueue with an idempotent effect, and OpenAPI generation with a breaking-change gate.

M00 is not a full pass. Live Google OAuth, a managed PostgreSQL pooler, a transactional email provider, error tracking, the PaaS vendor and the timer calibration were not observed. The vendor item (e) is open, the timer evidence is deferred under U-01, and the owner has not accepted the amendments. Every ADR remains Proposed. M01 and Build Mode remain blocked.

## 2. Scope and authorization

| Item | Record |
|---|---|
| Charter | [M00-IMPLEMENTATION-PLAN.md](M00-IMPLEMENTATION-PLAN.md), approved 2026-11-18 |
| Authorization | [OPEN-DECISIONS.md](../OPEN-DECISIONS.md) section G, 2026-11-18 |
| Worktree | `D:/Portofolio/Lumora-m00`, branch `spike/m00`, commit `73a39b1` |
| Main checkout | `D:/Portofolio/Lumora`, branch `main`, now `c8f151e` |
| Scope | Evidence only; no production schema, migration, seed, user-facing code or merge |
| Out of scope | M01, product features, vendor contracts, owner acceptance of ADRs |

The main commit advanced from `73a39b1` to `c8f151e` during the spike. The new commit contains the evidence file, `Flow01.5.txt` and `.artifacts/oasdiff-release.json`. It contains no spike source code.

## 3. Protocol results

| Protocol | Charter item | Result | What was observed | What remains open |
|---|---|---|---|---|
| TS-01 Lockout | (a) | PASS | Five failures locked the account; a correct password was refused while locked; the counter cleared on success; audit rows were written | Real 15-minute wait not performed; controlled timestamps used |
| TS-02 Revocation and expiry | (a) | PASS | Revocation observed at 9.97 ms; next session lookup returned `null`; 30-day lifetime was 2,592,000,000 ms; a backdated session was rejected | Real 30-day wait not performed; single-process test |
| TS-03 OAuth and linking | (a) | PARTIAL | Callback route, state, PKCE S256, replay rejection and same-email refusal passed; a new provider identity created one user, one link and one session | Live Google token exchange and Google claims not tested (U-03) |
| TS-04 UUIDv7 | (b) | PASS | 10,000 valid unique ids; native `uuid` round trip; Better Auth ids are `text` | Native `uuid` storage for the auth tables is not proven |
| TS-05 OpenAPI | (c) | PASS | Valid OpenAPI 3.1, deterministic output, Redocly lint passed, oasdiff detected a removed required property and `--fail-on ERR` exited 1 | Two-schema sample only; no route parity or reference page |
| TS-06 Queue and pooler | (d) | PARTIAL | Atomic enqueue, outbox coupling, duplicate dispatch suppression and idempotent retry passed without a pooler | Pooler mode, PITR, dead-letter, worker service and vendor operations not tested (U-02) |
| TS-07 Email and secrets | Email one-time secret | PARTIAL | Local sink stored a SHA-256 hash and AES-256-GCM ciphertext, used an idempotency key and kept the plaintext token out of the database and log | No provider sandbox, signed webhook, bounce payload or deliverability test (U-05) |
| TS-08 Timer calibration | T11 | DEFERRED | U-01 default applied; no timer measurement was run | NFR-052 and NFR-090 are not claimed; M07 keeps its evidence block |
| TS-09 Vendor checklist | (e) | PARTIAL | Local PostgreSQL 18.6 and `btree_gist` 1.8 observed | Every vendor row blocked by U-02; email row blocked by U-05; error tracking blocked by U-A7 |

Exact commands, raw output, UTC timestamps and residual risks are in [M00-EVIDENCE.md](M00-EVIDENCE.md).

## 4. Technical findings

### 4.1 Authentication

Better Auth 1.7.25 supports the application-owned lockout wrapper, database-backed revocation and 30-day expiry. The stored password was a 161-character `node:crypto` scrypt value. The Google callback route exists and the authorization URL used PKCE S256 and a state cookie; a replayed callback returned `state_mismatch`. Implicit same-email linking was disabled and both verified and unverified same-email identities were refused with `account_not_linked` and zero sessions.

Two findings constrain M02. Better Auth created `user.id` and `session.id` as `text`, and the native `uuid` column was proven only in a separate probe table. The scratch schema also had no unique `(providerId, accountId)` constraint or index. M02 must either keep the text mapping with an adapter cast or pre-create `uuid` auth columns, and must add the uniqueness guard. The live Google exchange, Google claim shapes, CSRF checks and production HTTPS cookie behavior were not exercised.

### 4.2 Background jobs

`boss.send(..., { db: { executeSql } })` inside a manual transaction rolled back to zero `pgboss.job` rows and committed exactly one. An outbox row and a dispatcher produced one job; a second dispatch produced zero. A handler that threw once ran twice, kept one idempotent effect and recorded `retry_count` 1. This supports the outbox design for the local no-pooler path. Pooler mode, prepared statements through a pooler, dead-letter handling, worker deployment, PITR and restore were not tested.

### 4.3 OpenAPI

`@asteasolutions/zod-to-openapi` 9.1.0 with zod 4.6.7 emitted `openapi: "3.1.0"` and two generations were byte-identical. Redocly CLI 2.79.0 lint exited 0. oasdiff 1.39.0 reported `response-required-property-removed` for a removed required property and exited 1 only with `--fail-on ERR`; without the flag it exited 0. The MVP will not ship a public reference page. Scalar is the first Phase 3 candidate and Redoc is the fallback.

### 4.4 Email one-time secret

The local sink path generated a 43-character token, stored a 64-character SHA-256 hash and a 158-character AES-256-GCM ciphertext, enqueued only the request id, sent one message per idempotency key, cleared the payload after send and recorded one bounce. The plaintext token appeared in none of the six queried database locations or the notification log. Provider behavior, signed webhooks, deliverability and key rotation were not tested.

### 4.5 Database and platform

The local server was PostgreSQL 18.6 from the `embedded-postgres` 18.6.0-beta.19 package with `btree_gist` 1.8. This satisfies the local version floor and the extension requirement. It is not a vendor-managed service and does not prove backups, PITR, failover, pooler mode, TLS, region, SLA, price or a DPA. No vendor was selected.

## 5. Database changes

No production schema, migration or seed was committed. The scratch schema existed only in the deleted worktree and contained Better Auth `user`, `session`, `account` and `verification` tables, plus `auth_lockouts`, `auth_audit_events`, `outbox_events`, `email_sink`, `email_bounces`, `password_reset_requests`, `uuid_probe`, `job_effects` and the `pgboss` schema. It was deleted with the worktree.

The findings that must reach M02 are in [DATABASE-DESIGN.md](../04-database/DATABASE-DESIGN.md): the `text` versus `uuid` identifier decision and the missing unique `(providerId, accountId)` constraint.

## 6. Tests executed and results

All tests were local, single-process and run on 2026-11-18. Times are UTC from the recorded logs.

| Test | Result | Time | Notes |
|---|---|---|---|
| `scripts/test-auth.ts` | 22/22 checks; `"failures": []` | 02:22:52Z | Lockout, revocation, expiry, hash and audit |
| `scripts/test-oauth-http.ts` | 8/8 checks | 02:12:28Z | Callback route, state, PKCE, replay |
| `scripts/test-oauth-link.ts` | 9/9 checks | 02:13:44Z | Same-email refusal and new identity link |
| `scripts/test-uuid.ts` | 8/8 checks | 02:11:33Z | 10,000 ids in 24.07 ms; native `uuid` round trip |
| `scripts/test-queue.ts` | 8/8 checks | 02:15:45Z | Atomic enqueue, outbox, retry |
| `scripts/test-email.ts` | 11/11 checks | 02:17:21Z | Local sink, hash, ciphertext, idempotency |
| `scripts/openapi.ts`, Redocly 2.79.0, oasdiff 1.39.0 | Generated, linted, diffed | 02:20:54Z to 02:21:26Z | Valid 3.1; breaking change detected; `--fail-on ERR` exit 1 |
| `pg-facts.log` | PostgreSQL 18.6; `btree_gist` 1.8 | 02:22:22Z | Local server only |
| `versions.log` | Runtime and package versions | 02:21:59Z | Node 24.13.1, Better Auth 1.7.25, pg-boss 12.38.2, zod 4.6.7 |

No production test suite, browser test, load test, vendor trial, restore drill or error-tracking scrub test was run. The absence of a result is recorded as a limitation, not a pass.

## 7. ADR status

| ADR | Status after M00 | Evidence added | Owner action |
|---|---|---|---|
| [ADR-004 Authentication](../adr/ADR-004-authentication.md) | Proposed | Lockout, revocation, expiry, hash, callback, linking, id mapping, uniqueness and cookie limits | Accept, reject or amend after U-03 and the M02 id test |
| [ADR-005 Background jobs](../adr/ADR-005-background-jobs.md) | Proposed | Atomic enqueue, outbox, duplicate dispatch, retry; pooler and operations gaps | Accept the local direction and keep the pooler open, or amend |
| [ADR-008 API strategy](../adr/ADR-008-api-strategy.md) | Proposed | Generator, lint, diff and reference-page decision | Accept the tooling and the no-reference-page MVP decision, or amend |
| [ADR-009 Deployment platform](../adr/ADR-009-deployment-platform.md) | Proposed | Local PostgreSQL only; every vendor row blocked | Select a shortlist and trial before accepting |

No ADR was marked Accepted. The amendments are evidence, not approval. Acceptance is U-06.

## 8. Open decisions and vendor gaps

| Decision | State | Evidence | Next action |
|---|---|---|---|
| OD-S02 Authentication library | OPEN, partially evidenced | Lockout, revocation and expiry passed; live Google and id mapping remain | Live Google U-03; M02 `uuid` test |
| OD-S03 Same-email linking | OPEN, partially evidenced | Refusal passed for verified and unverified identities | Security owner accepts refusal or defines a merge |
| OD-S04 Hosting and PostgreSQL | OPEN, not evidenced | No vendor instance | Vendor shortlist and trial |
| OD-S05 Email provider and one-time secret | OPEN, partially evidenced | Local sink passed; no provider | Provider sandbox and signed webhook |
| OD-S06 Timer calibration | OPEN, deferred | No measurement | M07 evidence block |
| U-A1 PaaS vendor | OPEN | No vendor | Owner shortlist and trial |
| U-A2 Email provider | OPEN | No provider | Owner selection before MVP release |
| U-A7 Error tracking | OPEN | No vendor, no scrub test | Owner sets needed-by; default M15 |
| U-03 Google test project | OPEN | Live path blocked | Two verified test accounts |
| U-05 Email provider sandbox | OPEN | Provider path blocked | Provider sandbox |
| U-06 ADR acceptance | OPEN | Amendments drafted | Owner accepts or rejects |
| U-07 Baseline corrections | OPEN | M00 does not change the baseline | Owner resolves B-01, B-02, B-06 and B-09 |

No open row was closed silently. [OPEN-DECISIONS.md](../OPEN-DECISIONS.md) section B.1 records the evidence and the closure proposals. Every OD-S row remains OPEN.

## 9. Known limitations

1. The database was embedded PostgreSQL 18.6 beta, not a vendor-managed service.
2. No pooler, prepared-statement or pool-exhaustion behavior was tested.
3. No backup, PITR, restore, failover, SLA, price, region, DPA or worker service was observed.
4. The live Google token exchange and Google-specific claims were not tested.
5. Timer calibration was deferred; NFR-052 and NFR-090 are unproven.
6. No transactional email provider, signed webhook, bounce payload or deliverability test exists.
7. The OpenAPI document is a two-schema sample; route parity and spec-to-server validation are absent.
8. Better Auth ids are `text`; native `uuid` auth storage is unproven.
9. No unique `(providerId, accountId)` constraint exists; duplicate-link insertion was not exercised.
10. Lockout and expiry used controlled timestamps or database backdating, not real waits.
11. All tests were local, single-process and small; concurrency, crashes, network loss and load were not tested.
12. `tsx` failed in the Next app; scripts ran through Node 24 type stripping. This is a spike workaround, not a product decision.
13. CSRF checks and `Secure` cookie behavior on production HTTPS were not exercised.
14. No reference page was rendered; the no-page MVP decision is a recommendation, not a rendered result.

## 10. Teardown

| Action | Result |
|---|---|
| Stop `m00-pg` | Stopped; `exited` |
| Stop `m00-next` | Stopped; `exited` |
| Remove worktree `D:/Portofolio/Lumora-m00` | Removed with `--force`; exit 0 |
| Delete branch `spike/m00` | Deleted; was at `73a39b1` |
| Delete local `.env.local` and `.pgdata` | Removed with the worktree; `.pgdata-smoke` was absent |
| Temporary binary | No `oasdiff.exe`; the tracked `.artifacts/oasdiff-release.json` was retained |
| Spike code on `main` | `git ls-files spike` empty; no spike source or manifest tracked |
| Secret scan | 129 tracked files; no env secret value found; only the local `BETTER_AUTH_URL` matched |
| Main state | `main` at `c8f151e`; evidence tracked; no production code, migration or seed |

The worktree removal also removed the scratch database, logs, mock OAuth provider, spike scripts and local environment file. The evidence and this report are the surviving artifacts.

## 11. Definition of Done at spike level

| Level | Assessment |
|---|---|
| Task and pull request | Not applicable as written. M00 produced evidence scripts, not a production change; typecheck, lint, unit and integration suites, API error codes, review and squash merge are product-change gates. The applicable parts were met: no secret in evidence, no stub claimed as a result, and touched documents were updated |
| Milestone | Not applicable as written. M00 has no FR, AC, table, page, endpoint or migration. The applicable parts were met: checklist recorded, evidence linked, limitations explicit, completion report produced |
| Release | Not applicable. M00 is not a release and creates no tag |

The `m00-done` tag was not created: the milestone is not a full pass because item (e) is open and the owner has not accepted the amendments.

## 12. Remaining tasks and M01 readiness

M01 is not ready. The following owner actions are required before M01 planning can start:

1. Accept, reject or amend the four ADR amendments and the evidence in this report (U-06). Record the decision with owner, date, baseline version and evidence link.
2. Resolve the baseline corrections B-01, B-02, B-06 and B-09, and the linking decision OD-S03 (U-07 and security owner).
3. Set the needed-by milestone for U-A1, U-A2 and U-A7, or close each vendor decision. U-08 default is M15 for error tracking; U-A1 is needed before Phase 7 deployment and U-A2 before MVP release.
4. Start a vendor shortlist and trial for PostgreSQL and the worker service (U-02). No local test can replace this.
5. Grant the Google test project and two verified accounts (U-03), and the email provider sandbox (U-05), if those paths are to be proven before M02.
6. Carry the M02 schema actions: choose the `text` or `uuid` auth mapping, add the unique `(providerId, accountId)` constraint, and test duplicate-link behavior.

The recommended next milestone is **M01 Project foundation** after items 1 and 2, not M02. M00 does not unblock M01, and Build Mode remains stopped.

## 13. Documents updated

| Document | Change |
|---|---|
| [M00-EVIDENCE.md](M00-EVIDENCE.md) | Results, limitations and teardown record |
| [ADR-004](../adr/ADR-004-authentication.md), [ADR-005](../adr/ADR-005-background-jobs.md), [ADR-008](../adr/ADR-008-api-strategy.md), [ADR-009](../adr/ADR-009-deployment-platform.md) | Trailing M00 evidence sections; statuses stay Proposed |
| [DATABASE-DESIGN.md](../04-database/DATABASE-DESIGN.md) | Local platform facts, identifier finding, unresolved items 1 to 3 |
| [OPENAPI-PLAN.md](../06-api-integrations/OPENAPI-PLAN.md) | Generator, diff tool, reference page and remaining coverage |
| [EXTERNAL-INTEGRATIONS.md](../06-api-integrations/EXTERNAL-INTEGRATIONS.md) | Google, email, error tracking and PaaS status |
| [TECHNOLOGY-DECISIONS.md](../03-architecture/TECHNOLOGY-DECISIONS.md) | Evidence notes for D7, D14, D16, D17 and D21 |
| [OPEN-DECISIONS.md](../OPEN-DECISIONS.md) | Evidence table for OD-S02 to OD-S06; close-out approval row |
| [MILESTONES.md](../07-roadmap/MILESTONES.md) | M00 outcome and checklist |
| [IMPLEMENTATION-READINESS.md](../IMPLEMENTATION-READINESS.md) | Inventory, M00 gate state, sequence and authorization |
| [CHANGELOG.md](../CHANGELOG.md), [README.md](../README.md), [DOCUMENTATION-INDEX.md](../DOCUMENTATION-INDEX.md) | Close-out entry and inventory |

No requirement, traceability row, final architecture finding or production file was changed.