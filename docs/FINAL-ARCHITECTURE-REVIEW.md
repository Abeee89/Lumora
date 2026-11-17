# Final Architecture Review

> Audit date: 2026-11-17. Basis: commit `8e9ef3c` plus the working-tree documentation state. Planning mode only. No application code, migration, requirement decision or architecture decision was implemented or approved.

## 1. Scope and method

- Audited 80 Markdown documents: 73 baseline planning documents and 7 Phase 8 governance documents.
- Reviewed product discovery, PRD, FR/NFR/AC coverage, architecture, ADRs, ERDs, data lifecycle, UI/UX, API contracts, security, roadmap, testing and release gates.
- Ran six independent read-only domain reviews: requirements, architecture/data, UI, API, security/roadmap and final-deliverable traceability.
- Cross-checked 164 FRs, 62 NFRs, 32 BRs, 28 ECs, 595 functional ACs, 164 API operations, 19 modules, 41 tables and 26 milestones.
- Verified every repository-relative Markdown link under `docs/`; no target file was missing at audit time.
- Severity: Critical blocks baseline approval, creates a security/privacy failure, or makes a milestone impossible. High must close before its owning milestone. Medium is consistency or evidence debt.

## 2. Documentation completeness

### 2.1 Result

**Documentation completeness: 66.5%** against the six Flow00 trace dimensions.

Formula: `654 explicit requirement-specific cells / (164 FRs x 6 dimensions) = 66.5%`.

| Dimension | Coverage | Qualification |
|---|---:|---|
| Design document | 0 / 164 | Capability-level inheritance exists; no per-FR evidence |
| Database entity or reasoned `N/A` | 0 / 164 | Capability-level candidate sets exist; no per-FR validation |
| API endpoint or mechanism | 164 / 164 | Structural only; several contracts conflict |
| UI page or reasoned `N/A` | 162 / 164 | FR-073 and FR-139 have no source-backed page mapping |
| Milestone | 164 / 164 | Several assignments cannot meet their ACs |
| Planned test identifier | 164 / 164 | Aliases only; executable test specifications: 0 |

The seven required Phase 8 files exist. Their existence is 100%; their trace content is not. Approval evidence is `0 / 80`, so no percentage can make the project implementation-ready.

### 2.2 Verified structural counts

| Item | Result |
|---|---:|
| Unique FRs | 164, including 98 MVP |
| MVP priority split | 54 Must, 44 Should |
| Functional ACs | 595, exact ID coverage for all FRs |
| NFRs / NFR AC rows | 62 / 62 |
| Planned TC aliases | 667 including 10 E2E aliases |
| Internal / public API operations | 125 / 39 |
| Milestones | 16 MVP, 7 Phase 2, 3 Phase 3 |
| Approved documents | 0 |

### 2.3 Completeness by artifact

| Audit question | Result | Basis |
|---|---|---|
| Product vision aligns with PRD | Fail | Planned-versus-actual is central in the vision but optional in the MVP requirements |
| Every approved feature has requirements | Blocked | No feature baseline is approved; proposed PWA and backward planning lack FRs |
| Every FR has acceptance criteria | Structural pass | All 164 FRs have AC IDs; semantic and phase defects remain |
| Requirements map to architecture/milestones | Partial | Candidate owners/milestones exist; dependency direction and milestone timing conflict |
| Database entities and ERDs support requirements | Fail | Missing state, relationships, ownership constraints and restore semantics |
| UI pages support journeys | Fail | Missing controls/states and interaction-target contradictions |
| API operations match functionality | Fail | Auth, timer, AI, groups and public API contracts drift from FRs/UI/data |
| Security requirements are covered | Fail | Critical auth, deletion, CSRF, limiter, SSRF and secret-flow gaps |
| Testing covers critical workflows | Fail | Planned aliases exist; executable critical-path designs do not |

## 3. Critical inconsistencies

| ID | Finding | Evidence | Required correction |
|---|---|---|---|
| C-01 | No approved baseline exists. PRD calls Phase 1 approved while every source remains proposed; all ADRs are Proposed. | [PRD](02-requirements/PRD.md), [SDD](03-architecture/SDD.md), [ADRs](adr/) | Create an owner decision record; correct findings first; record owner, date, baseline and accepted ADRs. |
| C-02 | Core product rules conflict. Planning is the primary differentiator but FR-030..038 are waivable. Study-day rollover conflicts with midnight splitting and frozen local dates. MVP topic-weight ACs require Phase 2 readiness. | [PRODUCT-VISION](01-product-discovery/PRODUCT-VISION.md), [BUSINESS-RULES](01-product-discovery/BUSINESS-RULES.md), [FUNCTIONAL-REQUIREMENTS](02-requirements/FUNCTIONAL-REQUIREMENTS.md) | Decide MVP identity, one day-boundary model and one phase-correct exam model; align PRD, FRs, ACs and journeys. |
| C-03 | Pomodoro has no coherent lifecycle. Documents disagree whether a focus end saves a session, starts a break or waits for user input. No server phase-advance command or paused remaining time exists. | [USER-JOURNEYS](01-product-discovery/USER-JOURNEYS.md), [APPLICATION-FLOWS](03-architecture/APPLICATION-FLOWS.md), [API-ENDPOINTS](06-api-integrations/API-ENDPOINTS.md), [DATA-DICTIONARY](04-database/DATA-DICTIONARY.md) | Define one server-authoritative state machine, waiting states, phase advancement, pause persistence and session creation boundary. |
| C-04 | Same-email Google linking permits account pre-hijack. Password registration does not verify email; AUTH-03 signs into an existing same-email account. OAuth age proof, signup display name and Google deletion reauthentication are also incomplete. | FR-003 in [FUNCTIONAL-REQUIREMENTS](02-requirements/FUNCTIONAL-REQUIREMENTS.md), AUTH-01/03 and PROF-04 in [API-ENDPOINTS](06-api-integrations/API-ENDPOINTS.md), [API-SCHEMAS](06-api-integrations/API-SCHEMAS.md) | Require verified ownership or a secure explicit merge; define age proof, required profile fields and single-use deletion reauthentication. |
| C-05 | Deletion and backup promises cannot both hold. A 30-day purge delay plus 30-day backup retention can retain data about 60 days. A pending request can disappear on restore because durable intent is written only after purge. | NFR-031 in [NON-FUNCTIONAL-REQUIREMENTS](02-requirements/NON-FUNCTIONAL-REQUIREMENTS.md), [DATA-LIFECYCLE](04-database/DATA-LIFECYCLE.md), [BACKUP-RESTORE](04-database/BACKUP-RESTORE.md) | Write durable deletion intent at request time; cap live purge at 5 days or change the stated backup deadline; test restore at all request/purge boundaries. |
| C-06 | Timer/session concurrency can lose or inflate data. Lazy idle close, shared locks, discarded-stop replay, break pause state and edited-timer ranking are undefined. | [DATABASE-DESIGN](04-database/DATABASE-DESIGN.md), [ADR-011](adr/ADR-011-idempotency-and-concurrency.md), [BACKGROUND-JOBS](03-architecture/BACKGROUND-JOBS.md) | Use one per-user lock for all time mutations, lazily expire stale runs, persist every terminal outcome and define immutable ranked duration. |
| C-07 | Milestones cannot satisfy their own gates. M01 creates an FK-bearing table before users, M02 claims onboarding/dashboard ACs delivered in M13 and writes a Goals table delivered in M08, and M05 claims actuals before sessions exist. | [MILESTONES](07-roadmap/MILESTONES.md), [MODULE-BOUNDARIES](03-architecture/MODULE-BOUNDARIES.md), [DEFINITION-OF-DONE](07-roadmap/DEFINITION-OF-DONE.md) | Move schema and AC ownership to the milestone where dependencies exist; derive default goal; repair dependency edges. |
| C-08 | Recovery can lose already-relayed jobs. Logical fallback excludes queue data, replay selects only unrelayed rows and outbox rows expire before the backup horizon. Ordinary staging is also specified for production restore drills. | [BACKUP-RESTORE](04-database/BACKUP-RESTORE.md), [DATA-LIFECYCLE](04-database/DATA-LIFECYCLE.md), [DEPLOYMENT-ARCHITECTURE](03-architecture/DEPLOYMENT-ARCHITECTURE.md) | Back up queue state or retain durable completion records; use an isolated recovery environment; require HA if 99.5% remains. |
| C-09 | UI specifications fail required functional and accessibility gates. Auth, timer, CRUD, settings and AI screens disagree with APIs; controls/states are missing; dark destructive contrast, sticky focus clearance, heading semantics, live regions and affordances fail. | [PAGE-SPECIFICATIONS](05-ui-ux/PAGE-SPECIFICATIONS.md), [INTERACTION-SPECIFICATIONS](05-ui-ux/INTERACTION-SPECIFICATIONS.md), [ACCESSIBILITY](05-ui-ux/ACCESSIBILITY.md), [DESIGN-SYSTEM](05-ui-ux/DESIGN-SYSTEM.md) | Correct the named page contracts and re-run R-03, R-23, R-25, R-26, R-27, R-32, R-34, R-38 and R-39 checks. |
| C-10 | Security contracts are incomplete or contradictory. CSRF docs name different mechanisms; in-memory limits conflict with two web instances; queued one-time email links have no recoverable secret design; push accepts arbitrary HTTPS targets; AI failures can spend without quota. | [SECURITY-ARCHITECTURE](03-architecture/SECURITY-ARCHITECTURE.md), [API-SECURITY](06-api-integrations/API-SECURITY.md), [EXTERNAL-INTEGRATIONS](06-api-integrations/EXTERNAL-INTEGRATIONS.md), [AI-INTEGRATION](06-api-integrations/AI-INTEGRATION.md) | Select one tested CSRF protocol, shared limiter, encrypted outbox secret flow, push SSRF guard and AI attempt/global spend ceilings. |
| C-11 | Traceability overclaims completeness. Design/entity evidence is inherited rather than per-FR, FR-063 is undefined, two UI homes lack source support and nine EC rows are truncated. The Phase 8 matrix now marks these gaps and corrected its initial FR-201 grouping. | [TRACEABILITY-MATRIX](TRACEABILITY-MATRIX.md), [REQUIREMENT-TRACEABILITY](02-requirements/REQUIREMENT-TRACEABILITY.md), [PAGE-SPECIFICATIONS](05-ui-ux/PAGE-SPECIFICATIONS.md) | Add per-FR evidence or reasoned `N/A`; repair source references and regenerate counts. |
| C-12 | Critical workflows lack executable test designs. TC IDs are aliases, not cases; timer accuracy, hostile linking, deletion/restore, tenant isolation, browser/device and full-capacity evidence is absent. | [TESTING-STRATEGY](07-roadmap/TESTING-STRATEGY.md), [ACCEPTANCE-CRITERIA](02-requirements/ACCEPTANCE-CRITERIA.md) | Add named cases with level, fixture, owner, milestone and evidence artifact before each owning milestone closes. |

## 4. Missing and undefined requirements

| Gap | Effect | Recommendation |
|---|---|---|
| PWA is committed to Phase 2 but has no requirement | Scope cannot be accepted or tested | Add FR/NFR/ACs or remove PWA from committed scope |
| Backward planning from exams appears in discovery/journeys but has no FR | Journey has no implementable contract | Add a requirement or mark the journey future/out of scope |
| Success metrics lack event definitions, formulas, owners and retention | D7 retention, activation and adherence cannot be measured | Add a privacy-reviewed analytics requirement or remove the metrics |
| Group moderation has no role, triage owner, access rule, SLA or sanction flow | Abuse reports are stored but unoperated | Define the workflow before P3-02 or remove reporting |
| Plan local-time DST gaps/overlaps and timezone changes are undefined | Plans/reminders can move or duplicate | Define anchored versus moving plans and gap/overlap behavior |
| Timer server-offset, paused heartbeat, lazy close and phase-advance rules are absent | Core loop can drift, overcount or stall | Add normative rules and timer ACs |
| Export does not enumerate all owned profile/settings/goal/consent data | NFR-032 and BR-032 are not met | Create a versioned exhaustive export manifest |
| Incident response and processor retention/region/DPA rules are absent | Privacy and breach operations are undefined | Add an operational privacy/security runbook before release |
| Streak opt-out exists only in roadmap | Milestone promises unrequired UI | Add FR/UI/ACs or remove it |
| External-image consent behavior for note preview is missing | Markdown preview can leak IP/referrer data | Block external images by default and require explicit load action |

Exact duplicate FR IDs were not found. Semantic overlap remains between FR-036 and FR-085. Terminology drift includes readiness/topic coverage, to-do/task, delete/archive, running/active timer and read-only calendar with mutation controls.

## 5. Data and ERD consistency

High-impact data defects:

- Conceptual cardinality shows optional user ownership for `timer_runs` although `user_id` is required.
- Plan entry to notification is modeled as many where the contract permits at most one plan reminder.
- Conceptual/logical diagrams omit relationships for timer segments, timer topic/plan links, to-do topic, flashcard subject/topic, card review user, gamification, AI consent, push subscription, group reports and invite actors.
- Conceptual ERD omits FR-backed `data_exports`; logical ERD omits five attribute blocks.
- `card_reviews.card_id` lacks composite user ownership; notification cross-field constraints are absent.
- `UNIQUE (lower(email))` is invalid PostgreSQL table-constraint syntax; use an expression unique index.
- Optimistic versions are absent from several editable settings, goals and membership records despite the architecture-wide promise.
- Cleanup indexes/jobs are missing for several retention rules.

See [CONCEPTUAL-ERD](04-database/CONCEPTUAL-ERD.md), [LOGICAL-ERD](04-database/LOGICAL-ERD.md), [DATA-DICTIONARY](04-database/DATA-DICTIONARY.md), [DATABASE-CONSTRAINTS](04-database/DATABASE-CONSTRAINTS.md) and [INDEXING-STRATEGY](04-database/INDEXING-STRATEGY.md).

## 6. Technical risk assessment

| Area | Risk | Main failure mode | Required control |
|---|---|---|---|
| Database complexity | High | Cross-module locks, ownership and retention are incomplete across 41 tables | Schema review after rule decisions; migration-from-empty test |
| AI cost/failure | High for Phase 3 | Failed/retried calls can be billed without user/global ceilings | Attempt quota, monthly spend cap, circuit breaker, kill switch |
| Timer reliability | Critical | Phase drift, stale worker, pause/resume and command races alter study time | Server state machine, lazy transitions, shared lock, deterministic-clock tests |
| Calendar conflicts | High | Warning-confirm flow races and subject archive races with creation/timer start | Lock/fingerprint protocol and subject-row locks |
| Time zones | High | Day totals, plans, reminders and group weeks use conflicting semantics | One frozen-allocation model plus DST input policy |
| XP/leaderboard abuse | High for future phases | Edited timer sessions remain ranked; cap compensation and cross-day awards are incomplete | Immutable competitive duration and net-award ledger rules |
| Study-group permissions | High for Phase 3 | Cross-user aggregates, role races and moderation data expose users | Aggregate capability, opaque IDs, group locks, moderation runbook |
| Performance | Medium to High | Test fixtures do not exercise one 100k-session user, 5m rows or 1k concurrent users | Correct fixtures, private/no-store timer reads and measured thresholds |
| Data privacy | Critical | Linking takeover, deletion resurrection, external images and processor gaps | Correct auth/deletion contracts, image consent, processor register |
| Backup/restore | Critical | Relayed jobs and deletion requests can vanish; ordinary staging receives production data | Durable replay, isolated recovery, alternate restore drills |

## 7. Security review

| Control | Result | Gap |
|---|---|---|
| Authentication | Fail | Account pre-hijack, OAuth age proof, profile creation and Google reauthentication |
| Authorization/isolation | Partial | Strong repository scoping intent; list/aggregate/export tests and several composite FKs are missing |
| Input validation | Mostly specified | Zod, strict unknown fields and limits are strong; body-reference error maps and external-image behavior need correction |
| API security | Fail | CSRF drift, shared limiter/proxy trust, push SSRF and incomplete transport errors |
| File upload | Not applicable | No user upload surface is approved; exports are server generated |
| Rate limiting | Fail | In-memory fallback is incompatible with multi-instance deployment; failure behavior is unspecified |
| Secret management | Partial | Storage/scrubbing exists; rotation, incident response and queued one-time token handling do not |
| Data retention | Fail | Purge promise, cleanup ownership, processor retention and report retention conflict |
| Privacy | Fail | Deletion restore, moderation access, legal basis and processor rules are unresolved |
| Audit trail | Partial | Event set is incomplete and must be decided before the M02 CHECK constraint |

## 8. Recommended corrections

1. Approve the correction process, not Build Mode. Record an owner decision framework.
2. Resolve OD-G02 through OD-G06: MVP identity, day boundaries, Pomodoro/session model, phase boundaries and defaults.
3. Correct authentication and privacy contracts: linking, age proof, profile fields, reauthentication, durable deletion intent and purge deadline.
4. Define timer state, locking, idle closure and idempotency before schema freeze.
5. Repair milestone ownership, migration order and dependency graph.
6. Repair ERDs, ownership constraints, versions, cleanup jobs and recovery replay.
7. Correct UI/API mismatches and rerun accessibility/functional hard gates.
8. Add executable critical-path test designs and full-scale evidence requirements.
9. Repair per-FR trace evidence, undefined references and source status claims.
10. Re-audit the corrected baseline. Only then record approval and consider Build Mode.

## 9. Outstanding decisions

The authoritative register is [OPEN-DECISIONS.md](OPEN-DECISIONS.md). Highest-priority decisions are:

- OD-G01 through OD-G07: baseline, product rules and trace standard.
- OD-S01 through OD-S06: M00 charter, auth, hosting, email and timer evidence.
- OD-M01 through OD-M23: milestone-specific security, data, timer, deletion, recovery, CI and test contracts.
- U-D1 through U-D14: owner-controlled UI direction and assets.
- OD-F01 through OD-F10: Phase 2/3 scope, AI, groups, push and public API.

## 10. Final implementation sequence

1. Correct and re-audit documentation.
2. Authorize M00 under its own evidence-only charter.
3. Resolve global rules and approve a versioned baseline.
4. M01 foundation with full CI, cleanup ownership, secrets and platform controls.
5. M02 to M06 with corrected auth, catalog, exams, plans and session ownership.
6. M07 timer after state/locking/test contracts are final.
7. M08 to M12 goals, calendar, tasks, notes and statistics.
8. M13 dashboard/onboarding after routes and dependencies exist.
9. M14 export/deletion after purge and recovery rules are proven.
10. M15 hardening, isolated restore drill and release evidence; G2 is completion approval.
11. Phase 2 and Phase 3 only after their own gates close.

## 11. Final gate

**Project is not ready for Build Mode.** Critical issues remain. Stop after presenting this report and wait for owner approval of corrections. Do not start M00 or any implementation automatically.

Recommended first implementation milestone after explicit authorization: **M00 Technical spike**, limited to auth behavior, platform capabilities, transactional email and timer calibration evidence. It must not create production schema or user-facing features.

## 12. Audit limits

No runtime, SQL migration, restore drill, load test, provider capability or generated OpenAPI artifact exists to verify. Findings prove documentation inconsistency, not runtime behavior.
