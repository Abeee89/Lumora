# Implementation Readiness

> Status: Phase 8 final gate. **Not ready for Build Mode.** The planning baseline is unapproved, traceability is incomplete, and critical product, security, timer, deletion, recovery and milestone contracts conflict. No product implementation may start without owner-approved corrections and explicit authorization.

## 1. Verdict

| Measure | Verified result |
|---|---|
| Documentation inventory | 80 Markdown documents: 73 baseline and 7 Phase 8 |
| Owner approval evidence | 0 / 80 |
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
| M00 spike charter | Explicit scope, throwaway-output rule, acceptance evidence and authorization; hosting choice only for vendor-dependent checks | Open |
| M01 product foundation | Corrected and approved baseline; B-06, CI ownership, retention ownership and production platform decisions resolved | Blocked |
| M02 authentication | B-03 plus provider, email, age, CSRF, limiter, audit-event and reauthentication decisions resolved | Blocked |
| M05/M06 planning and sessions | B-02 and B-07 resolved | Blocked |
| M07 timer | B-05 and timer accuracy test design resolved | Blocked |
| M14 deletion/export | B-04 and one export lifetime/snapshot contract resolved | Blocked |
| M15 release | Isolated restore drill, privacy/incident runbook, legal pages, security tests and release evidence complete | Blocked |
| G2 release approval | Result of M15, not an M15 start condition | Open |

M00 may produce evidence used to settle later decisions. It does not require approval of the entire product baseline, but it does require its own approved charter and explicit authorization. This removes the prior D-01/D-02/M00 cycle.

## 5. Corrected implementation sequence

1. Approve documentation corrections and repair traceability.
2. Authorize and run M00 only under an approved spike charter.
3. Resolve global product rules and accept the corrected baseline.
4. M01: foundation, complete CI stages, retention jobs, secrets inventory and platform controls.
5. M02 to M06: authentication/profile, catalog, exams, plans and sessions with corrected milestone ownership.
6. M07: timer only after the state machine, locking and accuracy tests are fixed.
7. M08 to M12: goals, calendar, tasks, notes and statistics.
8. M13: dashboard and onboarding; do not route users to pages before they exist.
9. M14: export and deletion after every contributing module and recovery rule exists.
10. M15: hardening, isolated restore drill and release evidence; G2 is its completion gate.
11. Phase 2 and Phase 3 only after their own product, privacy, security and cost decisions.

## 6. Recommended first milestone

**M00 Technical spike**, after explicit authorization. Minimum charter:

- Verify auth-library callback, UUID mapping and same-email linking behavior.
- Verify PostgreSQL 15+, `btree_gist`, pg-boss and the selected pooler only if a vendor is selected.
- Verify transactional email delivery without persisting plaintext one-time secrets.
- Measure timer drift under background throttling and wrong client clocks.
- Record evidence as proposed ADR amendments; do not create production schema or user-facing code.

## 7. Authorization

Build Mode remains stopped. Next owner action is to approve, reject or amend the blocker corrections in [OPEN-DECISIONS.md](OPEN-DECISIONS.md). Starting M00 still requires an explicit statement authorizing M00.
