# Lumora Milestones

> Status: Proposal, pending approval. Source of truth: Phase 2 PRD and Phase 1 docs.

This file is the single source of milestone facts. [DEVELOPMENT-ROADMAP.md](DEVELOPMENT-ROADMAP.md) explains why the order is what it is, [IMPLEMENTATION-PLAN.md](IMPLEMENTATION-PLAN.md) explains how one milestone is executed, and [DEFINITION-OF-DONE.md](DEFINITION-OF-DONE.md) defines "done". Milestones carry no dates. Complexity is relative size only:

| Size | Meaning |
|---|---|
| S | One module slice, few endpoints, no new cross-module contract |
| M | One module, one table group, several endpoints and one or two pages |
| L | One or two modules, several tables, a rules-heavy domain or a large page set |
| XL | Security-sensitive or multi-module, concurrency or external-vendor risk |

## 1. ID scheme

| Pattern | Meaning |
|---|---|
| `M00`..`M15` | MVP milestones, executed in this order (except the M10/M11 freedom below) |
| `P2-01`..`P2-07` | Phase 2 milestones; each ships dark behind configuration flags (DEPLOYMENT-ARCHITECTURE section 3) |
| `P3-01`..`P3-03` | Phase 3 milestones |

Acceptance criteria are in [ACCEPTANCE-CRITERIA.md](../02-requirements/ACCEPTANCE-CRITERIA.md). Each FR has criteria `AC-FR-<nnn>-<k>`; the implementer opens the file and takes every `AC-FR-<nnn>-*` row for each FR in the milestone scope. Non-functional criteria are `AC-NFR-*`; end-to-end scenarios are `AC-E2E-01..10`.

Endpoint ids (`AUTH-01`, `SESS-03`) are from [API-ENDPOINTS.md](../06-api-integrations/API-ENDPOINTS.md); page ids (`A-3`, `PU-2`) from [PAGE-SPECIFICATIONS.md](../05-ui-ux/PAGE-SPECIFICATIONS.md); tables from [DATA-DICTIONARY.md](../04-database/DATA-DICTIONARY.md); module ranks from [MODULE-BOUNDARIES.md](../03-architecture/MODULE-BOUNDARIES.md) section 4.

## 2. Master table

| ID | Name | Size | Depends on | Module rank(s) | Notes on placement |
|---|---|---|---|---|---|
| M00 | Technical spike and decisions | S | none | none | Throwaway branch; outcomes recorded as ADR amendments |
| M01 | Project foundation | L | M00 | shared kernel | Boundary tooling and CI first (MODULE-BOUNDARIES section 8) |
| M02 | Authentication and profile | XL | M01 | 1, 2, notifications email port | Ownership contract test pattern is created here |
| M03 | Subjects and topics | M | M02 | 3, 4 | |
| M04 | Exams (basic) | M | M03 | 5 | Moved before Study plans: FR-038 and BR-025 need the exam date |
| M05 | Study plans | M | M04 | 6 | |
| M06 | Study sessions | L | M05 | 7 | |
| M07 | Timer: Pomodoro and stopwatch | XL | M06 | 8 | Moved up directly after sessions: highest-risk MVP item and the core loop |
| M08 | Daily and subject goals | M | M07 | 12 | After Timer so progress is verified against real timer sessions |
| M09 | Calendar | M | M08 | 14 | Read-only over sessions and plans |
| M10 | Tasks and priorities | M | M03 | 9 | Only needs Topics; may be built any time after M03 (see section 3) |
| M11 | Notes | L | M03, M07 | 10 | Only needs Topics; FR-049 note prompt needs Timer (M07) |
| M12 | Statistics | L | M08, M09 | 13 | Before Dashboard: FR-024 reads STAT-04 |
| M13 | Dashboard and onboarding | M | M07, M08, M10, M12 | adapter composition | Composition over Goals, Timer, Plans, Tasks, Analytics |
| M14 | Data export and account deletion | L | M13, M10, M11 | 2 | Last, because every module (including Tasks and Notes) must have registered its purge and export hooks |
| M15 | MVP hardening and release | L | M14 | all | Release gate |
| P2-01 | Reminders and notifications | L | M15 | 16 | First in Phase 2 for retention (R9) |
| P2-02 | Habit streak | M | M15; sequenced after P2-01 | 15 | Streak first, XP second |
| P2-03 | XP and levels | M | P2-02 | 15 | Gate G3 (owner decision) |
| P2-04 | Revision: flashcards | L | M15 | 11 | |
| P2-05 | Exam readiness score | S | M15 | 5 | Labelled "topic coverage" (R15, FR-128) |
| P2-06 | Drag-and-drop calendar | L | M09, M05 | 6 (rules), calendar UI | |
| P2-07 | Focus audio | S | M07 | 8 | Moved from MVP position 16 to Phase 2 |
| P3-01 | AI study scheduling | L to XL | P2-06, M12, M04 | 17 | Gate G4 |
| P3-02 | Study groups and leaderboards | XL | P2-03, P2-01 | 18 | |
| P3-03 | External REST API | XL | P3-01, P3-02, all earlier | 19 | Gate G5 |

Execution order is the table order, top to bottom. The only reorder freedom is M10 and M11, which depend only on M03 and may be built any time after it; the default is sequential. M12 requires M08 and M09 first.

### 2.1 Reordering decisions against the candidate sequence

| Decision | Reason |
|---|---|
| Exams before Study plans | FR-038 / BR-025 warn when a plan entry is after the exam date; Exams rank 5, Study plans rank 6 |
| Timer directly after Study sessions | Timer rank 8 depends only on sessions; it carries R1, R2, R16, NFR-051, NFR-052, NFR-090 and the core loop (AC-E2E-02..04) |
| Goals after Timer, Calendar after Goals | Goals need sessions (rank 12); Calendar is read-only over sessions and plans (rank 14) |
| Tasks and Notes after Calendar | Independent of the activity chain; parallel-capable from M03 only if a second developer exists |
| Statistics before Dashboard | FR-024 uses STAT-04 |
| Notes MVP, flashcards Phase 2 | ASSUMPTIONS-AND-RISKS ambiguity list |
| Ambient audio to Phase 2 | Needs only Timer; FEATURE-PRIORITIZATION marks it Phase 2 |
| Streak before XP | Dependency graph Goals -> Streak -> XP |
| Added items the candidate omitted | Foundation spike, onboarding, data export, account deletion and purge, notifications email port, hardening and release, flashcards, exam readiness, reminders, drag-and-drop calendar |
| AI after drag-and-drop calendar and Statistics | Dependency graph DnD -> AI; AI reads statistics |
| Groups after Gamification; external API last | Groups need XP rules and the notifications module; API (rank 19) depends on all |

## 3. Rules that apply to every milestone

- One milestone at a time; no milestone starts before every dependency meets [DEFINITION-OF-DONE.md](DEFINITION-OF-DONE.md).
- Each milestone migrates only its own tables.
- Each milestone that adds a table with `user_id` also registers that module's purge handler and export contributor (MODULE-BOUNDARIES section 3) and adds an ownership contract test (NFR-016, AC-E2E-10).
- The last checklist item of every milestone is "DEFINITION-OF-DONE.md checked".
- Where an endpoint prefix mixes phases, only rows whose Phase column matches the milestone are in scope.

---

## 4. MVP milestones

### M00 Technical spike and decisions

- **ID:** M00
- **Name:** Technical spike and decisions
- **Phase:** MVP (pre-build)
- **Complexity:** S
- **Objective:** Resolve the open technology risks before any production code. Time-boxed; the output is recorded decisions, not merged code.
- **Outcome (2026-11-18):** Evidence and teardown complete. (a) PASS, (b) PASS for app ids with the auth-table mapping open, (c) PASS, (d) PARTIAL without a pooler, (e) open. The full record is [08-build/M00-COMPLETION-REPORT.md](../08-build/M00-COMPLETION-REPORT.md).
- **Scope (FR/NFR):** NFR-011, NFR-012, NFR-013 (proof only); no FR.
- **Dependencies:** none
- **Modules:** none (throwaway branch)
- **Database changes:** none committed
- **UI pages:** none
- **API:** none
- **Jobs:** none
- **Spike items:**
  - (a) Better Auth proves NFR-012 lockout (5 failures lock for 15 min), NFR-013 session revocation within 60 s and 30-day inactivity expiry, and confirms the `/api/auth/callback/google` path. Fail: adopt Auth.js with custom lockout per ADR-004.
  - (b) Better Auth UUIDv7 id generation (DATABASE-DESIGN conventions). Fail: the app generates ids in the adapter.
  - (c) The Zod major version works with `@asteasolutions/zod-to-openapi` and emits valid OpenAPI 3.1 (OPENAPI-PLAN section 8). Also pick the diff tool and reference page, or decide on none.
  - (d) pg-boss on the chosen pooler mode (DATABASE-DESIGN unresolved item 3).
  - (e) Close U-A1 PaaS vendor, U-A2 email provider, U-A7 error-tracking vendor (needed before M02 deploy and M15 release). Close by amending ADR-009 and the EXTERNAL-INTEGRATIONS.md status lines when executed.
- **Deliverables:** ADR amendments with pass/fail and the fallback decision for (a) to (d); vendor decisions for (e).
- **Tests:** throwaway scripts on the spike branch, deleted afterwards.
- **Acceptance criteria:** each of (a)-(d) has a recorded pass/fail and a fallback decision. No AC ids; no merged code.
- **Completion checklist:**
  - [x] Spike (a) recorded, fallback chosen if failed (PASS/PARTIAL; live Google U-03)
  - [x] Spike (b) recorded (PASS for app ids; native auth-table `uuid` mapping open)
  - [x] Spike (c) recorded, diff tool and reference page decided (oasdiff 1.39.0; no MVP page)
  - [x] Spike (d) recorded (PARTIAL; local no-pooler path only)
  - [ ] U-A1, U-A2, U-A7 closed or owner has set the needed-by milestone (not closed; no needed-by set; see OPEN-DECISIONS)
  - [x] Spike branch deleted
  - [x] DEFINITION-OF-DONE.md checked (spike level; code-dependent items N/A with reasons in the completion report)

M00 close-out is complete for evidence and teardown, but M00 is not a full pass because item (e) is open. M01 remains blocked by U-06 and U-07.

### M01 Project foundation

- **ID:** M01
- **Name:** Project foundation
- **Phase:** MVP
- **Complexity:** L
- **Objective:** A deployable skeleton that enforces the architecture mechanically so later milestones cannot violate it.
- **Scope (FR/NFR):** FR-139 (responsive layout shell); NFR-050 (health endpoint, uptime hook), NFR-061 (traceability tooling), NFR-062 (configuration defaults in one place), NFR-063 (structured logs with scrubbing), NFR-080, NFR-081, NFR-085, NFR-086 (browser and viewport targets in the shell). Decisions: ADR-001, ADR-003, ADR-005, ADR-006, ADR-011.
- **Dependencies:** M00
- **Modules:** shared kernel, worker entry point
- **Database changes:** `outbox_events`, `rate_limit_counters`. `idempotency_keys` moves to M02: its primary key carries a foreign key to `users` (B-06).
- **UI pages:** SY-1, SY-2, SY-3, app shell and navigation (NAVIGATION-STRUCTURE)
- **API:** SYS-01 (`GET /api/health`)
- **Jobs:** outbox dispatcher (pg-boss)
- **Deliverables:**
  - dependency-cruiser or ESLint-boundaries configuration encoding the 19-module rank table (MODULE-BOUNDARIES sections 4 and 8, first build requirement)
  - CI stages 1, 2, 3, 4, 7, 8 from DEPLOYMENT-ARCHITECTURE section 4
  - time module (ADR-006); configuration module holding every numeric default (NFR-062)
  - error envelope (ERROR-HANDLING.md); pino logging with request ids and scrubbing (NFR-063)
  - Phosphor icon swap (U-D11); design tokens (COLOR-TYPOGRAPHY); shadcn base components from COMPONENT-INVENTORY
  - preview environments per pull request
  - purge-handler, export-contributor and archive-guard registration contracts (MODULE-BOUNDARIES section 3) defined as empty registries
  - idempotency and concurrency helpers (ADR-011)
- **Tests:** boundary violation fixture, outbox dispatch integration test, config-module test, scrub test, health endpoint test, axe on SY-1..SY-3.
- **Acceptance criteria:** a deliberate upward import fails CI; `GET /api/health` returns `{"status":"ok"}` on staging; an outbox row written in a transaction is dispatched by the worker exactly once. AC-FR-139-*; AC-NFR for NFR-050, NFR-062, NFR-063 as listed in the file.
- **Completion checklist:**
  - [x] Boundary tooling fails on an upward import
  - [ ] CI stages 1, 2, 3, 4, 7, 8 run on every merge
  - [ ] Staging deploy from the single image; health check passes
  - [x] Outbox dispatch once-only test passes
  - [x] Error envelope, logging and configuration module in place
  - [x] Empty purge, export and archive-guard registries defined
  - [x] App shell responsive at 360 px and 1280 px
  - [ ] DEFINITION-OF-DONE.md checked
- **As built (2026-11-19, report 2026-11-20):** evidence, per-row proof and the open rows are in [08-build/M01-EVIDENCE.md](../08-build/M01-EVIDENCE.md); the record is [08-build/M01-COMPLETION-REPORT.md](../08-build/M01-COMPLETION-REPORT.md). Deferred from the deliverable list because their inputs are undecided or absent: Phosphor icons (U-D11), palette and typeface decisions (U-D2, U-D3), shadcn components, preview environments and the staging deploy (U-A1), axe (no browser automation dependency installed), and stage 5 and stage 8 of CI. `idempotency_keys` ships in M02.

### M02 Authentication and profile

- **ID:** M02
- **Name:** Authentication and profile
- **Phase:** MVP
- **Complexity:** XL
- **Objective:** Accounts, sign-in, sessions, password reset, profile settings and the reusable ownership contract test.
- **Scope (FR/NFR):** FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-008, FR-009, FR-134, FR-135, FR-137, FR-138 (endpoint side; wizard UI is M13); NFR-010 to NFR-016, NFR-020, NFR-035. Age confirmation (NFR-035, U-6 wording), password of at least 10 characters (NFR-011), lockout (NFR-012), revocation (NFR-013), CSRF (NFR-014), audit events (NFR-020).
- **Dependencies:** M01
- **Modules:** Authentication (rank 1), User profile (rank 2), Notifications email port
- **Database changes:** `users`, `auth_accounts`, `auth_sessions`, `auth_verifications`, `auth_audit_events`, `user_profiles`, `idempotency_keys` (moved from M01, B-06)
- **UI pages:** PU-1, PU-2, PU-3, PU-4, PU-5, PU-6; A-15 (profile, sign-ins, appearance, rollover sections only)
- **API:** AUTH-01..AUTH-09; PROF-01, PROF-02, PROF-03 (profile, settings, onboarding step). PROF-04..PROF-08 belong to M14.
- **Jobs:** password-reset email (event), auth audit retention cleanup (daily, 90 days), password-reset token and expired-session cleanup (daily)
- **Deliverables:** email adapter behind the notification port (provider from U-A2); Google sign-in; rollover hour and timezone context (`GetUserClockContext`); theme preference; the reusable ownership contract test helper.
- **Tests:** unit (lockout, password rules); integration (token single use, revoke-all on reset); API for every AUTH and PROF row; AC-E2E-10 cross-user pattern established as the reusable ownership contract test (NFR-016) that every later milestone's resources must adopt; CSRF; axe on PU-1..PU-6 and A-15.
- **Acceptance criteria:** AC-FR-001-* to AC-FR-006-*, AC-FR-008-*, AC-FR-009-*; endpoint rows only: AC-FR-134-3, AC-FR-134-4, AC-FR-135-2, AC-FR-137-4, AC-FR-138-1 to AC-FR-138-4; AC-E2E-10 (partial: unauthenticated redirect and pattern); AC-E2E-06 (timezone change, profile part). The wizard and dashboard rows (AC-FR-134-1, AC-FR-134-2, AC-FR-135-1, AC-FR-135-3, AC-FR-135-4, AC-FR-136-*, AC-FR-137-1 to AC-FR-137-3) are owned by M13 (B-07/C-07).
- **Completion checklist:**
  - [ ] Register, sign in, sign out, Google sign-in, reset, sign-in management work end to end
  - [x] Lockout, revocation and age confirmation verified (NFR-012, NFR-013, NFR-035)
  - [x] Audit events written and retention job runs
  - [x] Ownership contract test helper documented and used
  - [x] Purge handler and export contributor registered for the new tables
  - [ ] Password-reset email delivered through the notification port in staging
  - [ ] DEFINITION-OF-DONE.md checked
- **As built (2026-11-20, report 2026-11-20):** evidence, per-row proof and the open rows are in [08-build/M02-EVIDENCE.md](../08-build/M02-EVIDENCE.md); the record is [08-build/M02-COMPLETION-REPORT.md](../08-build/M02-COMPLETION-REPORT.md). Shipped: the seven tables, ten AUTH routes, two PROF routes, PU-1 to PU-6, the profile, appearance and security pages of A-15, the notification email port with a file-sink adapter, and the daily `auth_cleanup` job on the `stately` queue at cron `0 3 * * *` UTC. Rows open because their inputs are absent or undecided: Google sign-in has no OAuth client (U-5), so only its start route, its signed state, its callback and its "unavailable" answer are proven; the reset email reaches no provider and there is no staging host (U-A2, U-A1); the ownership helper is used for sign-in management only, which is the only user-owned resource M02 ships, and every later milestone's resources adopt it; the export contributor covers `user_profiles` while the `users` account columns wait for M14; the Definition of Done was evaluated item by item and is partial, so that row stays unchecked as it did in M01. Deviations: the reset email is sent inside the request scope instead of from a queue job because BACKGROUND-JOBS section 3 and OD-S05 forbid secrets in a queue payload and the stored hash cannot rebuild the link; the UI is hand-built and icon-free (U-D2, U-D3, U-D11); the navigation shell waits for the first MVP destinations; the signed-in landing is `/settings/profile` because `/dashboard` is M04 and `/onboarding` is A-1; reading the session and theme cookies in the root layout makes every route dynamic.
  The delivery report was approved on 2026-11-20 ([OPEN-DECISIONS.md](../OPEN-DECISIONS.md) section G), which accepts this record without closing M02; the unchecked rows above are what M02 still needs.

### M03 Subjects and topics

- **ID:** M03
- **Name:** Subjects and topics
- **Phase:** MVP
- **Complexity:** M
- **Objective:** The study taxonomy every later feature links to.
- **Scope (FR/NFR):** FR-010 to FR-019; NFR-016, NFR-053 where an endpoint requires it.
- **Dependencies:** M02
- **Modules:** Subjects (rank 3), Topics (rank 4)
- **Database changes:** `subjects`, `topics`
- **UI pages:** A-7, A-8
- **API:** SUBJ-01..SUBJ-07, TOP-01..TOP-08
- **Jobs:** none
- **Deliverables:** archive and restore with the archive-guard contract owned by Subjects; events TopicArchived, TopicStatusChanged; bulk paste preview and save.
- **Tests:** unit (ordering, weights, archive rules, BR-029); ownership contract tests for subjects and topics; bulk paste edge cases; axe and keyboard reorder.
- **Acceptance criteria:** AC-FR-010-* to AC-FR-019-*; AC-E2E-10 (subject part).
- **Completion checklist:**
  - [x] All SUBJ and TOP endpoints implemented with documented error codes
  - [x] Keyboard equivalent for reorder
  - [x] Empty, loading and error states on A-7, A-8
  - [x] Purge handler and export contributor registered
  - [ ] DEFINITION-OF-DONE.md checked
- **As built (2026-11-21):** evidence, per-row proof and the open rows are in [08-build/M03-EVIDENCE.md](../08-build/M03-EVIDENCE.md); the record is [08-build/M03-COMPLETION-REPORT.md](../08-build/M03-COMPLETION-REPORT.md). Shipped: both tables, the eleven SUBJ and TOP routes, A-7 and A-8, the archive-guard verdict contract, the topic-event contract, bulk paste with preview and a 200-line cap, the PostgreSQL idempotency store, and the purge handlers and export contributors for both tables. The `DEFINITION-OF-DONE.md` row stays partial: AC-FR-013-1, AC-FR-014-2 and the picker half of AC-FR-013-3 need sessions, plans and to-dos, and a picker, none of which M03 ships; the coverage floors have no command; axe has no browser-automation dependency (the M01 and M02 gap); and the `m03-done` tag needs the owner's commit. Deviations: `SubjectListItem` gains both topic counts on SUBJ-01, no production archive guard until M05, keyboard and button reorder instead of pointer drag, and in-process topic events. Test and build numbers: 69 unit tests, 47 integration tests, 37 routes, no horizontal overflow at 360, 768, 1280 or 2560 px.
  The delivery report was approved on 2026-11-21 ([OPEN-DECISIONS.md](../OPEN-DECISIONS.md) section G), which accepts this record without closing M03; the unchecked row above is what M03 still needs.

### M04 Exams (basic)

- **ID:** M04
- **Name:** Exams (basic)
- **Phase:** MVP
- **Complexity:** M
- **Objective:** Exam dates with topic checklist and countdown. Readiness is Phase 2 (P2-05).
- **Scope (FR/NFR):** FR-120, FR-121, FR-122, FR-123, FR-124, FR-125. Not in scope: FR-126, FR-127, FR-128.
- **Dependencies:** M03
- **Modules:** Exams (rank 5)
- **Database changes:** `exams`, `exam_topics`
- **UI pages:** A-12, A-13
- **API:** EXAM-01..EXAM-06 (MVP behavior only; the readiness field in EXAM-03 and the topic weight in EXAM-06 are Phase 2)
- **Jobs:** exam auto-archive (hourly). Archive state is derived per DATABASE-DESIGN unresolved item 6; the job only emits `ExamArchived`. See Open items in IMPLEMENTATION-PLAN.md.
- **Deliverables:** Topics event subscription to drop archived topics from the checklist (EC-008).
- **Tests:** countdown across timezone; archive at user-local today; ownership contract; checklist replace semantics.
- **Acceptance criteria:** AC-FR-120-* to AC-FR-125-*; AC-E2E-08.
- **Completion checklist:**
  - [x] Create, edit, checklist, countdown, archive list work
  - [x] No readiness UI or field visible in the MVP build
  - [x] Purge handler and export contributor registered
  - [ ] DEFINITION-OF-DONE.md checked
- **As built (2026-11-21):** evidence, per-row proof and the open rows are in [08-build/M04-EVIDENCE.md](../08-build/M04-EVIDENCE.md); the record is [08-build/M04-COMPLETION-REPORT.md](../08-build/M04-COMPLETION-REPORT.md). Shipped: `exams` and `exam_topics`, the four EXAM route files behind ids EXAM-01..EXAM-06, A-12 and A-13, the derived archive state (no `archived_at` column; an exam is archived when its date is before the user's local today), the hourly `exam_auto_archive` job that only publishes `ExamArchived`, the EC-008 subscriber that drops an archived topic from every checklist, and the purge handler and export contributor for both tables. The `DEFINITION-OF-DONE.md` row stays partial: AC-FR-126-*, AC-FR-127-* and AC-FR-128-* need the Phase 2 readiness score (P2-05), the by-layer coverage floors the Definition of Done names are neither enforced nor met although both configured floors pass (`npm run test:coverage` exit 0; the exams module floor is new in this milestone), axe has no browser-automation dependency, and the `m04-done` tag needs the owner's commit; nothing is marked done on the owner's behalf.

### M05 Study plans

- **ID:** M05
- **Name:** Study plans
- **Phase:** MVP
- **Complexity:** M
- **Objective:** Plan entries with overlap and exam-date warnings and past-entry rules. Form-based; drag-and-drop is P2-06.
- **Scope (FR/NFR):** FR-030 to FR-038; BR-025. Not in scope: FR-065..FR-069.
- **Dependencies:** M04
- **Modules:** Study plans (rank 6)
- **Database changes:** `plan_entries`
- **UI pages:** A-6
- **API:** PLAN-01..PLAN-06 (MVP behavior; the drag, resize and keyboard use of PLAN-04 is Phase 2)
- **Jobs:** none
- **Deliverables:** overlap detection with `confirmedWarnings`; exam-date warning; missed marking. FR-036 actual values and AC-FR-036-* are owned by M06, which is the first milestone with sessions: PLAN-01 and PLAN-03 return planned values only and their actual fields are added in M06 (B-07).
- **Tests:** unit (overlap, past read-only, exam warning); ownership contract; DST-day plan entry.
- **Acceptance criteria:** AC-FR-030-* to AC-FR-035-*, AC-FR-037-*, AC-FR-038-*. AC-FR-036-* moves to M06 (B-07).
- **Completion checklist:**
  - [x] Create, edit, delete, missed and list work with warnings requiring confirmation
  - [x] Past entries are read-only (FR-035)
  - [x] Purge handler and export contributor registered
  - [ ] DEFINITION-OF-DONE.md checked
- **As built (2026-11-22):** evidence, per-row proof and the open rows are in [08-build/M05-EVIDENCE.md](../08-build/M05-EVIDENCE.md); the record is [08-build/M05-COMPLETION-REPORT.md](../08-build/M05-COMPLETION-REPORT.md). Shipped: `plan_entries`, the three PLAN route files behind ids PLAN-01..PLAN-06, A-6 at `/plan`, the advisory user-wide overlap warning and the exam-date warning behind one `confirmedWarnings` confirmation, the past-entry read-only rule, the missed mark, and the purge handler and export contributor for the table. Two choices are recorded rather than assumed: actual values and the `done` status wait for M06 (B-07), so PLAN-01 and PLAN-03 answer planned values and a `status` derived from `missed_at`; and the Calendar navigation item points at `/plan` until A-5 ships (OD-M36). The `DEFINITION-OF-DONE.md` row stays partial: the by-layer coverage floors are neither enforced nor met, axe cannot run, and the `m05-done` tag is still to be created by the owner.
- **Approved (2026-11-22):** the owner answered the M05 delivery report with "approved"; the record is the section G row in [OPEN-DECISIONS.md](../OPEN-DECISIONS.md), and the completion report is [08-build/M05-COMPLETION-REPORT.md](../08-build/M05-COMPLETION-REPORT.md). Approval covers the execution record only: the Definition of Done row stays partial because the by-layer coverage floors are neither enforced nor met and axe cannot run, and the `m05-done` tag is still to be created by the owner.

### M06 Study sessions

- **ID:** M06
- **Name:** Study sessions
- **Phase:** MVP
- **Complexity:** L
- **Objective:** The core record: manual and timer-sourced sessions with correct day allocation.
- **Scope (FR/NFR):** FR-041 (SESS-03, SESS-04 side), FR-042, FR-043, FR-044, FR-047, FR-048, FR-061 (SESS-01 side); completes FR-036 actual values for plans; NFR-053, NFR-091, NFR-094, NFR-096.
- **Dependencies:** M05
- **Modules:** Study sessions (rank 7)
- **Database changes:** `study_sessions`, `study_session_days`
- **UI pages:** A-4
- **API:** SESS-01..SESS-05
- **Jobs:** none (auto-close is M07)
- **Deliverables:** day allocation across midnight and DST (AC-E2E-05, NFR-091); idempotent save by request key (NFR-053); optimistic concurrency (NFR-094); manual entries flagged and excluded from future XP and leaderboards; events SessionCompleted, SessionEdited, SessionDeleted; plan unlink on deletion via event.
- **Tests:** unit (allocation: midnight, DST spring and fall, rollover hour); integration (idempotent replay, concurrent edits); ownership contract; AC-E2E-05.
- **Acceptance criteria:** AC-FR-036-* (moved from M05, B-07), AC-FR-041-* (session side), AC-FR-042-* to AC-FR-044-*, AC-FR-047-*, AC-FR-048-*; AC-E2E-05, AC-E2E-06 (session part), AC-E2E-10 (session part).
- **Completion checklist:**
  - [x] Manual add, edit, delete, list work; day allocations correct across midnight and DST
  - [x] Replay of the same request key returns the same result
  - [x] Plan actuals shown on plan list
  - [x] Purge handler and export contributor registered
  - [ ] DEFINITION-OF-DONE.md checked
- **As built (2026-11-23):** evidence, per-row proof and the open rows are in [08-build/M06-EVIDENCE.md](../08-build/M06-EVIDENCE.md); the record is [08-build/M06-COMPLETION-REPORT.md](../08-build/M06-COMPLETION-REPORT.md). Shipped: `study_sessions` and `study_session_days`, the two SESS route files behind ids SESS-01..SESS-05, A-4 at `/sessions`, the day allocation across midnight, rollover and DST with the timezone frozen at start, the idempotent save by request key, the optimistic concurrency, the hard overlap exclusion that names the conflicting session, the manual flag excluded from future XP and leaderboards, the events SessionCompleted, SessionEdited and SessionDeleted, and the plan unlink via the foreign key. FR-036 is complete: a linked session moves a plan entry to `done` with `actualSeconds` and `varianceSeconds`. Two choices are recorded rather than assumed: archived subjects stay visible in the session list labelled "(archived)" (SESS-01 does not filter them), and the manual duration floor is 60 s per the API contract and the database check, not the timer's 300 s rule. The owner commits and tags; the `m06-done` tag does not exist at the time of writing.

### M07 Timer: Pomodoro and stopwatch

- **ID:** M07
- **Name:** Timer: Pomodoro and stopwatch
- **Phase:** MVP
- **Complexity:** XL
- **Objective:** Server-authoritative timer that survives refresh, devices and idle. Highest-risk MVP milestone (R1, R2, R16).
- **Scope (FR/NFR):** FR-040, FR-041 (TIM-02 side), FR-045, FR-046, FR-049 (topic-status prompt; note prompt completes in M11), FR-050 to FR-059; NFR-004, NFR-044, NFR-051, NFR-052, NFR-090; BR-006, BR-011. Not in scope: FR-180..FR-184.
- **Dependencies:** M06
- **Modules:** Timer (rank 8)
- **Database changes:** `timer_runs`, `timer_run_segments`, `timer_settings`
- **UI pages:** A-3
- **API:** TIM-01..TIM-08 (audio fields of TIM-08 are Phase 2)
- **Jobs:** idle-session auto-close (cron every minute)
- **Deliverables:** server-authoritative state with timestamps (NFR-090); heartbeat every 60 s; one running timer (BR-011, AC-E2E-04); refresh recovery within 2 s (AC-E2E-03); screen-reader announcements (NFR-044); action acknowledgement within 200 ms (NFR-004); interval-end browser notification and tab title countdown (client only); registers the archive guard on Subjects (EC-007). Pomodoro auto-start off, one chime, no mute setting (U-D4).
- **Tests:** unit (state machine, classification, auto-close threshold); integration (concurrent start, replace, late stop returns `session_already_closed`); E2E AC-E2E-02, AC-E2E-03, AC-E2E-04 with fault injection (refresh, tab close, offline up to 30 min); two-screen-reader pass; performance check on action acknowledgement.
- **Acceptance criteria:** AC-FR-040-*, AC-FR-041-*, AC-FR-045-* to AC-FR-059-*; AC-E2E-02 (planned side), AC-E2E-03, AC-E2E-04, AC-E2E-07 (archive guard).
- **Completion checklist:**
  - [ ] Start, pause, resume, stop, discard under one minute, auto-close all work
  - [ ] Refresh recovery and cross-device convergence verified
  - [ ] Archive guard registered and tested
  - [ ] Screen-reader pass with two readers recorded
  - [ ] Purge handler and export contributor registered
  - [ ] DEFINITION-OF-DONE.md checked

### M08 Daily and subject goals

- **ID:** M08
- **Name:** Daily and subject goals
- **Phase:** MVP
- **Complexity:** M
- **Objective:** Goal targets with history and progress.
- **Scope (FR/NFR):** FR-070 to FR-074; NFR-091 (frozen local date drives progress).
- **Dependencies:** M07
- **Modules:** Goals (rank 12)
- **Database changes:** `daily_goal_history`, `subject_goals`
- **UI pages:** goal controls inside A-15 and A-3 (no standalone page)
- **API:** GOAL-01..GOAL-05
- **Jobs:** none
- **Deliverables:** goal history with effective date; progress and goal-met state; event GoalMet; the default 120-minute goal created at sign-up (AUTH-01) is verified here.
- **Tests:** unit (effective-date lookup, goal-met); AC-E2E-06 (progress counts frozen local date); ownership contract.
- **Acceptance criteria:** AC-FR-070-* to AC-FR-074-*; AC-E2E-06.
- **Completion checklist:**
  - [ ] Set, change, remove goals; progress and goal-met reflect real sessions
  - [ ] Changes apply from today forward only
  - [ ] Purge handler and export contributor registered
  - [ ] DEFINITION-OF-DONE.md checked

### M09 Calendar

- **ID:** M09
- **Name:** Calendar
- **Phase:** MVP
- **Complexity:** M
- **Objective:** Read-only month heatmap and day detail.
- **Scope (FR/NFR):** FR-060, FR-061 (CAL-02 side), FR-062; NFR-043 (heatmap not color-only).
- **Dependencies:** M08
- **Modules:** Calendar (rank 14, read models only)
- **Database changes:** none
- **UI pages:** A-5
- **API:** CAL-01, CAL-02
- **Jobs:** none
- **Deliverables:** heatmap intensity buckets with non-color cue; day detail listing sessions and planned entries.
- **Tests:** timezone/DST month boundaries; keyboard navigation; grayscale review.
- **Acceptance criteria:** AC-FR-060-* to AC-FR-062-*; AC-E2E-05 (day totals).
- **Completion checklist:**
  - [ ] Heatmap and day detail match session data
  - [ ] Keyboard-operable at 360 px and 1280 px
  - [ ] No table owned, nothing to purge (documented)
  - [ ] DEFINITION-OF-DONE.md checked

### M10 Tasks and priorities

- **ID:** M10
- **Name:** Tasks and priorities
- **Phase:** MVP
- **Complexity:** M
- **Objective:** To-dos with priority, due date, filter and sort. Parallel-capable from M03 onward if a second developer exists; default sequential.
- **Scope (FR/NFR):** FR-090 to FR-096.
- **Dependencies:** M03
- **Modules:** Tasks (rank 9)
- **Database changes:** `todos`
- **UI pages:** A-9
- **API:** TODO-01..TODO-06
- **Jobs:** none
- **Deliverables:** priority-then-due ordering (FR-095); idempotent completion; event TodoCompleted.
- **Tests:** unit (ordering); ownership contract; cursor pagination.
- **Acceptance criteria:** AC-FR-090-* to AC-FR-096-*.
- **Completion checklist:**
  - [ ] CRUD, filter, sort and done toggle work
  - [ ] Purge handler and export contributor registered
  - [ ] DEFINITION-OF-DONE.md checked

### M11 Notes

- **ID:** M11
- **Name:** Notes
- **Phase:** MVP
- **Complexity:** L
- **Objective:** Basic Markdown notes per subject or topic with safe rendering. No search or tags (U-D13). Parallel-capable from M03 onward.
- **Scope (FR/NFR):** FR-100 to FR-104; completes the note prompt of FR-049 (after M07); NFR-015, NFR-054; ADR-007.
- **Dependencies:** M03
- **Modules:** Notes (rank 10)
- **Database changes:** `notes`
- **UI pages:** A-10, A-11
- **API:** NOTE-01..NOTE-06
- **Jobs:** none
- **Deliverables:** sanitization per ADR-007 with an XSS payload corpus (NFR-015); version conflict resolution with "keep both" (NOTE-02); local retention of unsaved content (NFR-054); autosave.
- **Tests:** XSS corpus; conflict integration test with two writers; offline-then-save; ownership contract.
- **Acceptance criteria:** AC-FR-100-* to AC-FR-104-*; AC-FR-049-* (note prompt part).
- **Completion checklist:**
  - [ ] Create, edit, autosave, render, delete work
  - [ ] XSS corpus passes with no script or event-handler survivors
  - [ ] Conflict resolution verified
  - [ ] Purge handler and export contributor registered
  - [ ] DEFINITION-OF-DONE.md checked

### M12 Statistics

- **ID:** M12
- **Name:** Statistics
- **Phase:** MVP
- **Complexity:** L
- **Objective:** Totals, goal-hit rate and planned versus actual, correct across timezone and DST.
- **Scope (FR/NFR):** FR-080 to FR-089; NFR-003, NFR-043, NFR-071, NFR-072, NFR-096.
- **Dependencies:** M08, M09
- **Modules:** Analytics (rank 13, read models only)
- **Database changes:** none
- **UI pages:** A-14
- **API:** STAT-01..STAT-06
- **Jobs:** none (rollups deferred until measured p95 exceeds 700 ms, ADR-005)
- **Deliverables:** zero-filled ranges up to 24 months; manual entries shown distinctly (FR-088); charts always paired with numeric tables (NFR-043).
- **Tests:** reconciliation test: totals equal session sums (NFR-096); seeded 10,000-session account p95 at most 1 s (NFR-003) with an EXPLAIN index check; DST bucket tests; AC-E2E-02, AC-E2E-07.
- **Acceptance criteria:** AC-FR-080-* to AC-FR-089-*; AC-E2E-02, AC-E2E-06, AC-E2E-07.
- **Completion checklist:**
  - [ ] All six statistics views correct on seeded data
  - [ ] Performance target measured and recorded
  - [ ] Empty state and invalid range errors implemented
  - [ ] DEFINITION-OF-DONE.md checked

### M13 Dashboard and onboarding

- **ID:** M13
- **Name:** Dashboard and onboarding
- **Phase:** MVP
- **Complexity:** M
- **Objective:** First-run wizard and the home page, composed from existing modules.
- **Scope (FR/NFR):** FR-020 to FR-024; FR-134 to FR-137 (wizard UI and guided first session; endpoint side done in M02); FR-136.
- **Dependencies:** M07, M08, M10, M12
- **Modules:** adapter-layer composition; User profile onboarding state
- **Database changes:** none (uses `user_profiles.onboarding_*`)
- **UI pages:** A-1, A-2
- **API:** no new endpoints; uses PROF-01..PROF-03 and existing reads (GOAL-05, TIM-01, PLAN-01, TODO-01, STAT-04)
- **Jobs:** none
- **Deliverables:** wizard with skippable steps (R14), guided first session, dashboard cards with empty states.
- **Tests:** AC-E2E-01 end to end within 3 minutes of user time; onboarding skip and reopen; dashboard states.
- **Acceptance criteria:** AC-FR-020-* to AC-FR-024-*, AC-FR-134-* to AC-FR-137-*; AC-E2E-01.
- **Completion checklist:**
  - [ ] AC-E2E-01 passes
  - [ ] Dashboard shows goal, timer, next three plan entries, due to-dos, seven-day minutes
  - [ ] No Phase 2 widget (streak, XP) present
  - [ ] DEFINITION-OF-DONE.md checked

### M14 Data export and account deletion

- **ID:** M14
- **Name:** Data export and account deletion
- **Phase:** MVP
- **Complexity:** L
- **Objective:** User data portability and deletion with purge from live data and backups.
- **Scope (FR/NFR):** FR-007, FR-130, FR-131, FR-132; BR-032; NFR-005, NFR-031, NFR-032, NFR-104; EC-019, EC-027.
- **Dependencies:** M13 (every purge handler and export contributor registered)
- **Modules:** User profile (rank 2)
- **Database changes:** `data_exports`, `account_deletion_log`
- **UI pages:** A-15 (export and delete sections)
- **API:** PROF-04..PROF-08
- **Jobs:** export generation, export file expiry (hourly, 24 h), account purge, backup re-purge after restore
- **Deliverables:** purge within 30 days and from backups within 35 days (NFR-031); export of 10,000 sessions within 60 s (NFR-005); CSV and JSON reconcile with statistics (AC-E2E-09); a test that fails if any table with `user_id` has no purge handler; re-authentication on deletion.
- **Tests:** purge completeness over every table; export reconciliation; expiry; deletion re-check after simulated restore; ownership contract on exports.
- **Acceptance criteria:** AC-FR-007-*, AC-FR-130-* to AC-FR-132-*; AC-E2E-09.
- **Completion checklist:**
  - [ ] Every module's purge handler and export contributor registered
  - [ ] Purge-coverage test present and passing
  - [ ] Export reconciles with statistics
  - [ ] Backup re-purge job runnable from the runbook
  - [ ] DEFINITION-OF-DONE.md checked

### M15 MVP hardening and release

- **ID:** M15
- **Name:** MVP hardening and release
- **Phase:** MVP
- **Complexity:** L
- **Objective:** Prove the whole MVP against the acceptance bar and release v1.0.0.
- **Scope (FR/NFR):** every MVP FR and NFR; ACCEPTANCE-CRITERIA section 5 (MVP Definition of Done).
- **Dependencies:** M14
- **Modules:** all
- **Database changes:** none
- **UI pages:** all MVP pages
- **API:** none new
- **Jobs:** none new
- **Deliverables / checks:**
  - AC-E2E-01..10 pass on Chrome, Firefox, WebKit at desktop and 360 px
  - axe plus manual keyboard and two screen readers; ACCESSIBILITY.md design acceptance checks
  - load tests NFR-002, NFR-003, NFR-070, NFR-072 in staging
  - ASVS L1 checklist (NFR-017); dependency scan (NFR-018); bundle secret scan (NFR-019)
  - first restore drill with deletion re-check (NFR-103, NFR-104)
  - uptime monitor (NFR-050)
  - legal pages exist or footer links hidden (U-D5, U-6 age wording)
  - error-tracking scrub test (U-A7)
  - no Phase 2 or Phase 3 behavior reachable in the build
- **Tests:** the full matrix in [TESTING-STRATEGY.md](TESTING-STRATEGY.md).
- **Acceptance criteria:** AC-E2E-01..AC-E2E-10; ACCEPTANCE-CRITERIA.md section 5 items 1 to 8.
- **Completion checklist:**
  - [ ] All release-level items in DEFINITION-OF-DONE.md section 4 met
  - [ ] Release gate in RELEASE-PLAN.md section 3 passed
  - [ ] Zero open severity-1 or severity-2 defects
  - [ ] Tag `v1.0.0`
  - [ ] DEFINITION-OF-DONE.md checked

---

## 5. Phase 2 milestones

Each ships dark behind configuration flags. Tables are migrated only in the milestone that needs them.

### P2-01 Reminders and notifications

- **ID:** P2-01
- **Name:** Reminders and notifications (in-app, email, web push)
- **Phase:** 2
- **Complexity:** L
- **Objective:** Retention aid (R9): daily study and plan-entry reminders.
- **Scope (FR/NFR):** FR-150 to FR-154.
- **Dependencies:** M15
- **Modules:** Notifications (rank 16)
- **Database changes:** `notification_preferences`, `notifications`, `push_subscriptions`
- **UI pages:** B-4
- **API:** NOTIF-01..NOTIF-07 (all Phase 2 rows)
- **Jobs:** reminders (delayed, user local time), push delivery
- **Deliverables:** service worker for push only; no install UI, no offline mode (U-D14).
- **Tests:** timezone-aware scheduling; push opt-in and removal; reminder idempotency; disabled-flag test.
- **Acceptance criteria:** AC-FR-150-* to AC-FR-154-*.
- **Completion checklist:**
  - [ ] Reminders fire at user-local time once
  - [ ] Push opt-in and revoke work
  - [ ] Purge handler and export contributor registered
  - [ ] DEFINITION-OF-DONE.md checked

### P2-02 Habit streak

- **ID:** P2-02
- **Name:** Habit streak
- **Phase:** 2
- **Complexity:** M
- **Objective:** Goal-based streak with weekly freeze and opt-out (R10).
- **Scope (FR/NFR):** FR-160 to FR-164.
- **Dependencies:** M15 (hard); sequenced after P2-01 for retention only. The swap with P2-01 is safe because streak evaluation does not need the notifications tables.
- **Modules:** Gamification (rank 15)
- **Database changes:** `user_gamification`, `daily_evaluations` (streak columns only used)
- **UI pages:** dashboard streak widget, settings opt-out
- **API:** GAME-01 (streak fields)
- **Jobs:** streak evaluation at local day end (cron every 15 minutes)
- **Tests:** timezone change stability (FR-164), freeze rules, idempotent evaluation.
- **Acceptance criteria:** AC-FR-160-* to AC-FR-164-*.
- **Completion checklist:**
  - [ ] Streak, reset, freeze, longest streak verified across DST and timezone change
  - [ ] Opt-out hides the widget
  - [ ] Purge handler and export contributor registered
  - [ ] DEFINITION-OF-DONE.md checked

### P2-03 XP and levels

- **ID:** P2-03
- **Name:** XP and levels
- **Phase:** 2
- **Complexity:** M
- **Objective:** Event-driven XP ledger and levels.
- **Scope (FR/NFR):** FR-170 to FR-177.
- **Dependencies:** P2-02. Gate G3: the owner confirms after P2-02 that gamification continues (R10, FEATURE-ANALYSIS "unnecessarily complex" list). Level table values need U-2.
- **Modules:** Gamification (rank 15)
- **Database changes:** `xp_ledger`
- **UI pages:** dashboard XP widget
- **API:** GAME-01 extended (XP and level fields); no new endpoint
- **Jobs:** none new
- **Tests:** ledger idempotency, daily cap, exclusions (manual entries), compensation on session edit and delete.
- **Acceptance criteria:** AC-FR-170-* to AC-FR-177-*.
- **Completion checklist:**
  - [ ] G3 decision recorded
  - [ ] Ledger uniqueness and compensation verified
  - [ ] Purge handler and export contributor registered for `xp_ledger`
  - [ ] DEFINITION-OF-DONE.md checked

### P2-04 Revision: flashcards

- **ID:** P2-04
- **Name:** Revision: flashcards
- **Phase:** 2
- **Complexity:** L
- **Objective:** Cards, daily review queue and spaced-repetition scheduling.
- **Scope (FR/NFR):** FR-107 to FR-112.
- **Dependencies:** M15
- **Modules:** Flashcards (rank 11)
- **Database changes:** `flashcards`, `card_reviews`, `flashcard_settings`
- **UI pages:** B-2, B-3
- **API:** FLASH-01..FLASH-08
- **Jobs:** none
- **Tests:** scheduling unit tests with fixed clock, daily limit, ownership contract.
- **Acceptance criteria:** AC-FR-107-* to AC-FR-112-*.
- **Completion checklist:**
  - [ ] Create, edit, delete, review and limit work
  - [ ] Purge handler and export contributor registered
  - [ ] DEFINITION-OF-DONE.md checked

### P2-05 Exam readiness score

- **ID:** P2-05
- **Name:** Exam readiness score (labelled "topic coverage", R15)
- **Phase:** 2
- **Complexity:** S
- **Objective:** Weighted topic-coverage figure on exams.
- **Scope (FR/NFR):** FR-126, FR-127, FR-128; remaining Phase 2 part of AC-E2E-08.
- **Dependencies:** M15
- **Modules:** Exams (rank 5)
- **Database changes:** none (derived)
- **UI pages:** A-13 addition
- **API:** EXAM-03 readiness field, EXAM-06 weight setting (Phase 2 parts of existing rows)
- **Jobs:** exam readiness refresh (event TopicStatusChanged, TopicArchived)
- **Tests:** weighted calculation, archived topics excluded (EC-008), label text.
- **Acceptance criteria:** AC-FR-126-* to AC-FR-128-*.
- **Completion checklist:**
  - [ ] Score labelled "topic coverage" everywhere
  - [ ] Refresh job idempotent
  - [ ] DEFINITION-OF-DONE.md checked

### P2-06 Drag-and-drop calendar

- **ID:** P2-06
- **Name:** Drag-and-drop calendar
- **Phase:** 2
- **Complexity:** L
- **Objective:** Week planner with drag, move and resize on a 15-minute grid.
- **Scope (FR/NFR):** FR-065 to FR-069; NFR-042; R7.
- **Dependencies:** M09, M05
- **Modules:** Study plans (rules), calendar UI
- **Database changes:** none
- **UI pages:** B-1
- **API:** PLAN-02 and PLAN-04 reuse (rows already in PLAN)
- **Jobs:** none
- **Deliverables:** dnd-kit with keyboard sensors; every drag has a keyboard equivalent (NFR-042); form fallback on touch.
- **Tests:** keyboard-only E2E, touch E2E at 360 px, overlap confirmation.
- **Acceptance criteria:** AC-FR-065-* to AC-FR-069-*.
- **Completion checklist:**
  - [ ] Drag, move, resize and keyboard equivalents work
  - [ ] Overlap confirmation shown
  - [ ] DEFINITION-OF-DONE.md checked

### P2-07 Focus audio

- **ID:** P2-07
- **Name:** Focus audio
- **Phase:** 2
- **Complexity:** S
- **Objective:** Ambient loops while a session runs.
- **Scope (FR/NFR):** FR-180 to FR-184; R12.
- **Dependencies:** M07
- **Modules:** Timer (rank 8)
- **Database changes:** none (preference stored in timer settings per DATA-DICTIONARY section 7)
- **UI pages:** A-3 addition
- **API:** TIM-07 and TIM-08 audio fields (Phase 2 parts of existing rows)
- **Jobs:** none
- **Deliverables:** self-hosted CC0 loops only (R12).
- **Tests:** play only while running, mute on pause, persisted choice.
- **Acceptance criteria:** AC-FR-180-* to AC-FR-184-*.
- **Completion checklist:**
  - [ ] Licence record for every audio file
  - [ ] Audio stops on pause and stop
  - [ ] DEFINITION-OF-DONE.md checked

---

## 6. Phase 3 milestones

### P3-01 AI study scheduling

- **ID:** P3-01
- **Name:** AI study scheduling
- **Phase:** 3
- **Complexity:** L to XL
- **Objective:** Consent-gated, validated, preview-first schedule proposals (ADR-010).
- **Scope (FR/NFR):** FR-190 to FR-198; R13.
- **Dependencies:** P2-06, M12, M04. Gates: U-A3 provider chosen, U-4 consent wording legal-reviewed; at least 4 weeks of user data per R13 (G4).
- **Modules:** AI scheduling (rank 17)
- **Database changes:** `ai_consents`, `ai_generation_requests`
- **UI pages:** C-1, C-2, C-6
- **API:** AI-01..AI-07
- **Jobs:** AI schedule generation, AI proposal expiry
- **Tests:** privacy contract (AI-INTEGRATION section 12), validation of proposed entries, quota, provider failure and timeout.
- **Acceptance criteria:** AC-FR-190-* to AC-FR-198-*.
- **Completion checklist:**
  - [ ] G4 recorded
  - [ ] No data sent without consent; privacy tests pass
  - [ ] Purge handler and export contributor registered
  - [ ] DEFINITION-OF-DONE.md checked

### P3-02 Study groups and leaderboards

- **ID:** P3-02
- **Name:** Study groups and leaderboards
- **Phase:** 3
- **Complexity:** XL
- **Objective:** Private groups with opt-in sharing and a weekly leaderboard.
- **Scope (FR/NFR):** FR-200 to FR-212; R11. The leaderboard excludes manual sessions.
- **Dependencies:** P2-03, P2-01. Gate: U-3 group cap.
- **Modules:** Study groups (rank 18)
- **Database changes:** `groups`, `group_members`, `group_invites`, `group_reports`
- **UI pages:** C-3, C-4, C-5
- **API:** GRP-01..GRP-16
- **Jobs:** weekly leaderboard compute, invite expiry, invite email
- **Tests:** membership and visibility matrix, account deletion removing membership (EC-018, EC-019), cap enforcement.
- **Acceptance criteria:** AC-FR-200-* to AC-FR-212-*.
- **Completion checklist:**
  - [ ] Sharing opt-in verified
  - [ ] Purge handler registered for membership
  - [ ] DEFINITION-OF-DONE.md checked

### P3-03 External REST API

- **ID:** P3-03
- **Name:** External REST API
- **Phase:** 3
- **Complexity:** XL
- **Objective:** Versioned public API with keys, scopes and rate limits, documented by OpenAPI per [OPENAPI-PLAN.md](../06-api-integrations/OPENAPI-PLAN.md).
- **Scope (FR/NFR):** FR-220 to FR-226; R17.
- **Dependencies:** P3-01, P3-02 and all MVP and Phase 2 modules. Gate G5: internal contracts stable.
- **Modules:** API integrations (rank 19)
- **Database changes:** `api_keys`
- **UI pages:** C-7
- **API:** KEY-01..KEY-03, PUB-01..PUB-35
- **Jobs:** rate-limit counter cleanup (only if counters are stored in the database)
- **Tests:** scope enforcement per endpoint, key revocation, rate limit class, OpenAPI parity check, error format.
- **Acceptance criteria:** AC-FR-220-* to AC-FR-226-*.
- **Completion checklist:**
  - [ ] G5 recorded
  - [ ] OpenAPI document generated and parity check green
  - [ ] Purge handler and export contributor registered for `api_keys`
  - [ ] DEFINITION-OF-DONE.md checked
