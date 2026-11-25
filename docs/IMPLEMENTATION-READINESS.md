# Implementation Readiness

> Status: Phase 8 final gate. **Not ready for Build Mode.** The planning baseline is unapproved, traceability is incomplete, and critical product, security, timer, deletion, recovery and milestone contracts conflict. No product implementation may start without owner-approved corrections and explicit authorization.

## 1. Verdict

| Measure | Verified result |
|---|---|
| Documentation inventory | 83 Markdown documents: 73 baseline, 7 Phase 8 and 3 build records |
| Owner approval evidence | 1 / 83: M00 charter only; the product baseline remains 0 / 80 |
| Functional requirements | 164 total; 98 MVP |
| Functional acceptance criteria | 595 identifiers; several criteria remain cross-phase, qualitative or semantically inconsistent |
| Planned test identifiers | 667 including NFR and E2E aliases; executable test specifications: 0 |
| Strict Flow00 trace completeness | 654 / 984 dimension cells, 66.5% |
| Critical gate | FAIL |
| Build Mode | Not authorized |

The strict trace denominator is `164 FRs x 6 required dimensions`: design document, database entity or reasoned `N/A`, API or mechanism, UI page or reasoned `N/A`, milestone, and planned test. Current explicit coverage is 0, 0, 164, 162, 164 and 164 respectively. Module-level inheritance is useful navigation, but is not counted as requirement-specific design or entity evidence.

## 2. Readiness checklist

Every MVP FR is blocked by the missing approved baseline. The table records additional evidence defects; it does not override the per-FR rows in [TRACEABILITY-MATRIX.md](TRACEABILITY-MATRIX.md).

| Attribute | Evidence | State | Blocking defects |
|---|---|---|---|
| Clear specification | PRD, FUNCTIONAL-REQUIREMENTS, NON-FUNCTIONAL-REQUIREMENTS | Fail | Day boundary, Pomodoro lifecycle, plan status, export scope, group week and future-feature dependencies conflict |
| Owner module | MODULE-BOUNDARIES | Partial | Candidate owners exist for 164 FRs; registration orchestration, plan actuals, timer auto-close and group aggregates violate or lack module contracts |
| Defined data model | DATA-DICTIONARY, ERDs, constraints | Fail | Timer phase state, deletion intent, queue replay, XP compensation, ownership FKs and ERD relationships are incomplete or contradictory |
| UI/UX specification | PAGE-SPECIFICATIONS and supporting UI documents | Fail | Missing required controls and states; timer, auth and settings disagree with APIs; antislop hard gates R-03, R-23, R-25, R-26, R-27, R-32, R-34, R-38 and R-39 fail |
| Acceptance criteria | ACCEPTANCE-CRITERIA | Partial | Formal IDs cover all FRs, but MVP criteria depend on later phases, journey targets are untraced and several criteria are not measurable |
| Testing approach | TESTING-STRATEGY and planned TC aliases | Fail | No executable cases; critical auth, timer, deletion, restore, isolation, browser and load scenarios are missing |
| Implementation milestone | MILESTONES and roadmap | Fail | M01 FK ordering, M02 onboarding/goal work, M05 actuals, CI ownership and dependency edges cannot satisfy their own gates |
| Approval and authorization | ADR headers, document headers, owner record | Fail | All evidence remains proposed; no owner/date/baseline approval record exists |

## 3. Build blockers

| ID | Blocker | Minimum correction | Earliest gate |
|---|---|---|---|
| B-01 | No approved product, requirements or architecture baseline | Record owner, date, baseline version and decisions; accept corrected ADRs | Global |
| B-02 | Core requirements conflict on study-day rollover, cross-day allocation, Pomodoro sessions, planning priority and Phase 2 readiness | Resolve the rules once, then align PRD, FRs, ACs, journeys and downstream designs | Global |
| B-03 | Same-email Google linking permits account pre-hijack | Require verified ownership or an explicit secure merge that revokes credential sessions | M02 |
| B-04 | A 30-day purge delay plus 30-day backups violates the 35-day promise; pending deletion can reappear after restore | Persist deletion intent at request time and cap live purge at 5 days or revise the requirement | M14, release |
| B-05 | Timer phase advancement, paused state, lazy idle closure, terminal idempotency and shared locking are incomplete | Define one server state machine and lock protocol before schema freeze | M07 |
| B-06 | M01 creates an FK-bearing idempotency table before users; registration writes a Goals table delivered in M08 | Move the table to M02; derive the default goal until Goals exists | M01, M02 |
| B-07 | M05 promises FR-036 actuals before sessions exist and against dependency rank | Move actual composition and AC ownership to M06 or Analytics | M05 |
| B-08 | Traceability lacks explicit per-FR design/entity links, has two unsupported UI homes, truncated EC rows and an undefined FR-063 citation | Repair source trace tables and add reasoned `N/A` where applicable; the Phase 8 index already corrected its initial FR-201 grouping | Global |
| B-09 | UI hard gates and API contracts disagree on OAuth, timers, CRUD controls, contrast, semantics, live regions and data states | Correct specifications and re-run the UI audit before implementation | M01 onward |
| B-10 | CSRF, shared rate limiting, push SSRF, one-time email secrets, Google reauthentication and AI spend controls are incomplete | Select one mechanism per control and add threat-focused tests | M02, Phase 2/3 |
| B-11 | Restore replay can lose relayed jobs; restore drills conflict with staging privacy; restore-only recovery cannot support the stated availability | Define durable completion/replay, isolated recovery and production HA | M01, M15 |
| B-12 | Critical workflows have planned IDs but no executable test designs | Add named tests with owner, level, fixture and milestone evidence | Before each owning milestone closes |

## 4. Gate model

| Gate | Required evidence | State |
|---|---|---|
| Documentation correction | Owner approves which recommended corrections may be applied | Open |
| M00 spike charter | Explicit scope, throwaway-output rule, acceptance evidence and authorization; hosting choice only for vendor-dependent checks | Approved and executed 2026-11-18; evidence recorded; teardown complete. Item (e) vendors and U-06 acceptance remain open |
| M01 product foundation | Corrected and approved baseline; B-06, CI ownership, retention ownership and production platform decisions resolved; M00 amendments accepted (U-06) | Blocked |
| M02 authentication | B-03 plus provider, email, age, CSRF, limiter, audit-event and reauthentication decisions resolved | Blocked |
| M05/M06 planning and sessions | B-02 and B-07 resolved | Blocked |
| M07 timer | B-05 and timer accuracy test design resolved | Blocked |
| M14 deletion/export | B-04 and one export lifetime/snapshot contract resolved | Blocked |
| M15 release | Isolated restore drill, privacy/incident runbook, legal pages, security tests and release evidence complete | Blocked |
| G2 release approval | Result of M15, not an M15 start condition | Open |

M00 may produce evidence used to settle later decisions. It does not require approval of the entire product baseline, but it does require its own approved charter and explicit authorization. This removes the prior D-01/D-02/M00 cycle.

The charter in [08-build/M00-IMPLEMENTATION-PLAN.md](08-build/M00-IMPLEMENTATION-PLAN.md) was approved and executed on 2026-11-18. Evidence and teardown are recorded in [08-build/M00-COMPLETION-REPORT.md](08-build/M00-COMPLETION-REPORT.md); item (e) and owner acceptance (U-06) remain open. No other gate changed.

## 5. Corrected implementation sequence

1. Approve documentation corrections and repair traceability.
2. M00 was authorized, executed and torn down under its charter; its evidence is recorded.
3. Resolve global product rules and accept the corrected baseline.
4. M01: foundation, complete CI stages, retention jobs, secrets inventory and platform controls.
5. M02 to M06: authentication/profile, catalog, exams, plans and sessions with corrected milestone ownership.
6. M07: timer only after the state machine, locking and accuracy tests are fixed.
7. M08 to M12: goals, calendar, tasks, notes and statistics.
8. M13: dashboard and onboarding; do not route users to pages before they exist.
9. M14: export and deletion after every contributing module and recovery rule exists.
10. M15: hardening, isolated restore drill and release evidence; G2 is its completion gate.
11. Phase 2 and Phase 3 only after their own product, privacy, security and cost decisions.

## 6. Milestone sequence and next step

**M00 Technical spike** was executed and torn down on 2026-11-18. Local evidence supports the auth, queue and OpenAPI directions; live Google, the vendor platform, the email provider, error tracking and timer calibration remain open. The full record is [08-build/M00-COMPLETION-REPORT.md](08-build/M00-COMPLETION-REPORT.md).

**M01 Project foundation** was authorized on 2026-11-19 (approval record row in [OPEN-DECISIONS.md](OPEN-DECISIONS.md) section G) and executed the same day; the evidence, the unchecked rows and the nine limitations are in [08-build/M01-EVIDENCE.md](08-build/M01-EVIDENCE.md). Three M01 rows stay open because their inputs are absent: the staging deploy and CI stages 5 and 8 (U-A1), and the DoD accessibility item that needs axe. The C-07 milestone-gate corrections are applied: `idempotency_keys` moved to M02 (B-06), FR-036 actuals moved to M06 (B-07), M02 endpoint rows separated from M13 wizard rows, and the M11/M14 dependency edges repaired (OD-M20). B-01, B-02, B-09 and the OD rows remain unresolved by that authorization, and vendor decisions carry needed-by milestones: U-A1 before the M01 staging deploy, U-A2 before M02 close, U-A7 at M15.

**M02 Authentication and profile** was executed on 2026-11-20 (approval record row in [OPEN-DECISIONS.md](OPEN-DECISIONS.md) section G); the evidence, the unchecked rows and the eleven limitations are in [08-build/M02-EVIDENCE.md](08-build/M02-EVIDENCE.md) and the record is [08-build/M02-COMPLETION-REPORT.md](08-build/M02-COMPLETION-REPORT.md). Shipped: the seven M02 tables, ten AUTH routes, two PROF routes, PU-1 to PU-6, the three settings pages, the notification email port and the daily `auth_cleanup` job. Rows open because their inputs are absent: Google sign-in has no OAuth client (U-5, with the ADR-004 amendment tracked as OD-M26), the reset email reaches no provider and no staging host exists (U-A2, U-A1, OD-M24), the export contributor does not cover the account columns (OD-M25), the ownership helper is used for the one user-owned resource M02 ships, and axe still needs a browser automation dependency.
**M03 Subjects and topics** was executed on 2026-11-21 (approval record row in [OPEN-DECISIONS.md](OPEN-DECISIONS.md) section G); the evidence, the unchecked rows and the five deviations are in [08-build/M03-EVIDENCE.md](08-build/M03-EVIDENCE.md) and the record is [08-build/M03-COMPLETION-REPORT.md](08-build/M03-COMPLETION-REPORT.md). Shipped: the `subjects` and `topics` tables, the eleven SUBJ and TOP routes, A-7 and A-8, the archive-guard verdict contract, the topic-event contract, bulk paste with preview and a 200 non-blank line cap, the PostgreSQL idempotency store, and the purge handlers and export contributors for both tables. `npm run verify` passes with 69 unit and 47 integration tests and `npx next build` produces 37 routes. The Definition of Done row stays partial because three acceptance criteria need sessions (M05/M06), plans and to-dos (M08/M09) and a picker (M05); the coverage floors have no command, axe cannot run, and the tag needs the owner's commit. Open decisions it raises: OD-M27 (the two SUBJ-01 topic counts), OD-M28 (the M05 archive guard), OD-M29 (pointer drag), OD-M30 (the archived-subject read-only rule), OD-M31 (coverage floors) and OD-M32 (durable topic events).

**M04 Exams (basic)** was executed on 2026-11-21 (approval record row in [OPEN-DECISIONS.md](OPEN-DECISIONS.md) section G); the evidence, the unchecked rows and the defects found are in [08-build/M04-EVIDENCE.md](08-build/M04-EVIDENCE.md) and the record is [08-build/M04-COMPLETION-REPORT.md](08-build/M04-COMPLETION-REPORT.md). Shipped: the `exams` and `exam_topics` tables, the four route files behind EXAM-01..EXAM-06, A-12 and A-13, the derived archive state, the hourly `exam_auto_archive` job that only publishes `ExamArchived`, the EC-008 subscriber that drops an archived topic from every checklist, and the purge handler and export contributor for both tables. `npm run verify` passes with 76 unit and 59 integration tests and `npx next build` produces 43 routes. The Definition of Done row stays partial because AC-FR-126-*, AC-FR-127-* and AC-FR-128-* need the Phase 2 readiness score (P2-05); axe cannot run and the tag needs the owner's commit. Open decisions it raises: OD-M33 (the derived archive state), OD-M34 (the archived-exam date-only edit) and OD-M35 (the unpaginated upcoming list).

**M05 Study plans** was executed on 2026-11-22 (approval record row in [OPEN-DECISIONS.md](OPEN-DECISIONS.md) section G); the evidence, the unchecked rows and the defects found are in [08-build/M05-EVIDENCE.md](08-build/M05-EVIDENCE.md) and the record is [08-build/M05-COMPLETION-REPORT.md](08-build/M05-COMPLETION-REPORT.md). Shipped: the `plan_entries` table, the three route files behind PLAN-01..PLAN-06, A-6 at `/plan`, the advisory user-wide overlap warning and the exam-date warning behind one `confirmedWarnings` confirmation, the past-entry read-only rule, the missed mark, and the purge handler and export contributor for the table. `npm run verify` passes with 95 unit and 79 integration tests and `npx next build` produces 46 routes. The Definition of Done row stays partial: the configured floors pass but the by-layer coverage set the document names is neither enforced nor met (measured in M05-EVIDENCE E10), and axe cannot run. FR-036 actuals and the `done` status stay with M06 under B-07, so PLAN-01 and PLAN-03 answer planned values only. The open decision it raises is OD-M36 (the Calendar item pointing at `/plan`).

**M06 Study sessions** was executed on 2026-11-23 (execution record row in [OPEN-DECISIONS.md](OPEN-DECISIONS.md) section G); the evidence, the unchecked rows and the defects found are in [08-build/M06-EVIDENCE.md](08-build/M06-EVIDENCE.md) and the record is [08-build/M06-COMPLETION-REPORT.md](08-build/M06-COMPLETION-REPORT.md). Shipped: the `study_sessions` and `study_session_days` tables, the two route files behind SESS-01..SESS-05, A-4 at `/sessions`, the day allocation across midnight, rollover and DST with the timezone frozen at start, the idempotent save by request key, the optimistic concurrency, the hard overlap exclusion naming the conflicting session, the manual flag excluded from future XP and leaderboards, the events SessionCompleted, SessionEdited and SessionDeleted, and the plan unlink via the foreign key. FR-036 is complete: a linked session moves a plan entry to `done` with `actualSeconds` and `varianceSeconds`. `npm run verify` passes with 101 unit and 89 integration tests and `npx next build` produces 49 routes. The Definition of Done row stays partial: the configured floors pass but the by-layer coverage set the document names is neither enforced nor met (measured in M06-EVIDENCE E07), and axe cannot run. The open decisions it raises are OD-M37 to OD-M41 (the overlap exclusion, the manual duration floor, the archived-subject visibility, the `is_ranked` rule and the plan unlink).

**M07 Timer** was executed on 2026-11-25 (execution record row in [OPEN-DECISIONS.md](OPEN-DECISIONS.md) section G); the evidence, the unchecked rows and the findings are in [08-build/M07-EVIDENCE.md](08-build/M07-EVIDENCE.md) and the record is [08-build/M07-COMPLETION-REPORT.md](08-build/M07-COMPLETION-REPORT.md). Shipped: the `timer_runs`, `timer_run_segments` and `timer_settings` tables, the seven route files behind TIM-01..TIM-08, A-3 at `/timer`, the server-authoritative phase machine that stores only the phase and the instant it ends and advances lazily on read, the focus-only segment ledger that keeps paused minutes out of the measured time, the 60 s heartbeat, the idle auto-close cron at a 30 minute threshold, the one-running-timer rule with the replace promise, the stop classification (discarded, saved, time only), the topic-status prompt, the tab title countdown and the interval alert, the topics archive guard, and the purge handler and export contributor on `section: "timer"`. `npm run verify` passes with 116 unit and 119 integration tests and `npx next build` produces 58 route lines. The Definition of Done row stays partial: the timer module clears the per-path floor M07 added (87.78% statements, 90.56% lines) but the by-layer coverage the document names is still neither enforced nor met, the screen-reader pass with two readers was not run, and axe cannot run. The open decisions it raises are OD-M42 to OD-M45 (the segment summary shape, the heartbeat that never moves `updated_at`, the idle close that commits in its own transaction, and the timer write that skips the manual-path probes).

## 7. Authorization
Build Mode is authorized for **M01, M02, M03, M04, M05, M06 and M07**. M00 was executed and torn down on 2026-11-18 under [08-build/M00-IMPLEMENTATION-PLAN.md](08-build/M00-IMPLEMENTATION-PLAN.md); M01 was authorized on 2026-11-19, M02 was executed on 2026-11-20, M03 and M04 on 2026-11-21, M05 on 2026-11-22 after the M04 delivery report was approved, M06 on 2026-11-23 after the M05 delivery report was approved, and M07 on 2026-11-25 after the M06 delivery report was approved. The M03 approval (section G row in [OPEN-DECISIONS.md](OPEN-DECISIONS.md)) accepted the M03 record without closing it; the M04, M05, M06 and M07 execution records are recorded in the same section. All seven milestones stay open until their unchecked rows have evidence. The next step is M08 Daily and subject goals, which depends on M07 for the frozen local date every run and session carries and counts its progress from the sessions the timer writes. M08..M15 remain unauthorized and are blocked by the owner decisions named in [OPEN-DECISIONS.md](OPEN-DECISIONS.md).
The M05 execution record was accepted on 2026-11-22: the section G row answers the M05 delivery report, the three checked rows and the unchecked Definition of Done row, and the M05 card's "As built" note.
