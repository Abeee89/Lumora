# Open Decisions

> Status: Phase 8 decision register. Every row is **OPEN**, except OD-S01 which section G records as approved for M00 execution. Recommendations are audit proposals, not approved requirements. A decision closes only when the named owner, approval date, baseline version and evidence link are recorded.

Priority rules:

- Global: blocks approval of the planning baseline or any product implementation.
- Spike: blocks the named M00 experiment, not unrelated documentation work.
- Before Mx: blocks only that milestone and anything that depends on it.
- Future: may wait until its release phase.

Source identifiers below resolve within [PRD](02-requirements/PRD.md), [functional requirements](02-requirements/FUNCTIONAL-REQUIREMENTS.md), [non-functional requirements](02-requirements/NON-FUNCTIONAL-REQUIREMENTS.md), [acceptance criteria](02-requirements/ACCEPTANCE-CRITERIA.md), [SDD](03-architecture/SDD.md), [module boundaries](03-architecture/MODULE-BOUNDARIES.md), [database documents](04-database/DATA-DICTIONARY.md), [UI specifications](05-ui-ux/PAGE-SPECIFICATIONS.md), [API endpoints](06-api-integrations/API-ENDPOINTS.md), [API security](06-api-integrations/API-SECURITY.md), [milestones](07-roadmap/MILESTONES.md) and the [documentation index](DOCUMENTATION-INDEX.md).

## A. Global baseline decisions

| ID | Decision | Recommended correction | Owner / gate | Source |
|---|---|---|---|---|
| OD-G01 | Approval framework and baseline | Approve only a corrected versioned baseline; record owner, date and accepted ADRs | Product owner / Global | PRD section 10; SDD section 13; ADR headers |
| OD-G02 | MVP identity: planning plus planned-versus-actual is central or optional | Make FR-030..038 Must, or remove the differentiator from the MVP vision | Product owner / Global | PRODUCT-VISION; FEATURE-PRIORITIZATION; FR-030..038 |
| OD-G03 | Study-day boundary | Simplest MVP: fixed midnight boundary; defer configurable rollover, or define allocation against rollover consistently | Product owner / Global | BR-014; FR-009; FR-047; EC-009 |
| OD-G04 | Pomodoro focus interval versus saved study session | Save one session per focus interval; keep breaks and cycle count in timer state | Product owner / Global | USER-JOURNEYS journey 4; PRD timer state; FR-050 |
| OD-G05 | Phase boundaries for topic weight and exam coverage | Move weight/readiness effects to Phase 2; use one source of topic coverage | Product owner / Global | FR-016; FR-019; FR-122; FR-126..128 |
| OD-G06 | Owner-approved defaults and thresholds | Replace unsupported settled wording with proposed defaults; approve each registered default or an explicit bulk set | Product owner / Global | PRD U-1..U-9; all NFR thresholds |
| OD-G07 | Trace evidence standard | Require explicit per-FR design and entity links or reasoned `N/A`; repair FR-063, unsupported UI homes and truncated EC rows | Architecture owner / Global | TRACEABILITY-MATRIX; REQUIREMENT-TRACEABILITY |
| OD-G08 | Product name | Use Lumora; update prompt-derived references when owner approves | Product owner / Global wording | Build Mode.txt; README |

## B. M00 spike decisions

| ID | Decision | Recommended correction | Owner / gate | Source |
|---|---|---|---|---|
| OD-S01 | M00 charter and authorization | Approve a throwaway evidence-only charter with no production schema or user-facing code | Product owner / M00 | MILESTONES M00; IMPLEMENTATION-READINESS section 6 |
| OD-S02 | Authentication library | Accept Better Auth only if the spike proves callback, lockout, UUID and session requirements; otherwise use the documented fallback | Architecture owner / M00 | U-A4; ADR-004 |
| OD-S03 | Same-email account linking | Require verified ownership, or explicit merge with session revocation and credential recovery | Security owner / M00, M02 | FR-003; AUTH-03; finding C-03 |
| OD-S04 | Hosting and PostgreSQL platform | Select a vendor supporting PostgreSQL 15+, `btree_gist`, HA, PITR, pooler mode and worker connections | Operations owner / vendor-dependent M00 checks, M01 | U-A1; ADR-009; DEPLOYMENT-ARCHITECTURE |
| OD-S05 | Transactional email provider and one-time secret delivery | Select provider/region/DPA; place encrypted short-lived link payloads in the outbox and erase after delivery | Product and security owners / M00, M02 | U-A2; EXTERNAL-INTEGRATIONS; AUTH-05; GRP-07 |
| OD-S06 | Timer calibration evidence | Measure server offset, background throttling and wrong-clock behavior; record an explicit client algorithm | Architecture owner / M00 evidence, M07 contract | NFR-052; NFR-090; U-A5 |

OD-S01 is approved for execution by the record in section G, dated 2026-11-18. The row stays in the register as decision history. OD-S02..OD-S06 remain open until evidence exists.

## C. MVP milestone decisions

| ID | Decision | Recommended correction | Owner / gate | Source |
|---|---|---|---|---|
| OD-M01 | Signup profile fields | Add validated display name to signup or define a nullable/initial-value policy | Product owner / M02 | SignUpInput; user_profiles.display_name |
| OD-M02 | Minimum age and Google age confirmation | Confirm 16+; use a same-origin POST or post-callback confirmation before account creation | Product and legal owners / M02 | U-6; FR-003; AUTH-03 |
| OD-M03 | Default daily goal | Missing goal row means 120; create the first row only when Goals ships | Product owner / M02, M08 | BR-013; AUTH-01; daily_goal_history |
| OD-M04 | `idempotency_keys` migration placement | Move table creation to M02, or add its user FK only after users exist | Architecture owner / M01 | MILESTONES M01/M02; DATA-DICTIONARY |
| OD-M05 | CSRF and cookies | Use exact Origin plus `Sec-Fetch-Site` fallback, define SameSite explicitly and test that mechanism | Security owner / M02 | API-SECURITY; SECURITY-ARCHITECTURE; TESTING-STRATEGY |
| OD-M06 | Shared rate limiting and proxy trust | Use PostgreSQL from MVP; settle trusted proxy hops and failure behavior | Security and operations owners / M01, M02 | API-SECURITY; ADR-008; U-A1 |
| OD-M07 | Audit-event and secret operations | Finalize event types before the CHECK; add rotation, revocation and leak-response ownership | Security owner / M01, M02 | API-SECURITY CR-1; SECURITY-ARCHITECTURE |
| OD-M08 | Plan actuals owner | Compose in Analytics or an adapter read model; move FR-036 completion to M06 or M12 | Architecture owner / M05 | MODULE-BOUNDARIES; MILESTONES M05 |
| OD-M09 | Plan status and history | Restrict deletion to upcoming entries; define `done`; use end time for missed and start time for edit lock | Product owner / M05 | BR-028; FR-032..036 |
| OD-M10 | Future-plan timezone and DST input | Choose anchored or moving plans; define gap shift/rejection and repeated-hour offset | Product owner / M05 | ADR-006; FR-037; EC-006 |
| OD-M11 | Plan warning concurrency | Recompute under one per-user lock and require a conflict fingerprint | Architecture owner / M05 | APPLICATION-FLOWS; DATABASE-DESIGN |
| OD-M12 | Timer phase state machine | Define atomic lazy `AdvancePhase`, waiting states and paused remaining time | Product and architecture owners / M07 | FR-050..059; TIM-01..08; timer tables |
| OD-M13 | Timer heartbeat and idle closure | Define paused heartbeat; lazily close stale runs before every read/command at the authoritative timestamp | Architecture owner / M07 | FR-046; FR-052; TIM-06 |
| OD-M14 | Timer/session locking and terminal idempotency | Use one per-user lock for timer and session mutations; persist discarded stop outcomes | Architecture owner / M06, M07 | ADR-011; DATABASE-DESIGN |
| OD-M15 | Offline timer commands | Do not queue Pause/Stop without a trusted event-time protocol; retry reads/heartbeats only | Product owner / M07 | INTERACTION-SPECIFICATIONS; FR-054; EC-028 |
| OD-M16 | Export manifest, snapshot and lifetime | Export all owned data using a versioned manifest; snapshot at job start; expire after one consistent 48-hour window | Product and privacy owners / M14 | FR-130..132; NFR-032; export docs |
| OD-M17 | Account purge and durable deletion intent | Write external durable intent at request time; purge live data within 5 days or revise NFR-031 | Privacy owner / M14 | NFR-031; DATA-LIFECYCLE; BACKUP-RESTORE |
| OD-M18 | Queue backup and restore replay | Back up queue state or retain durable incomplete-effect records through the recovery horizon | Operations owner / M01, M15 | ADR-005; BACKUP-RESTORE; outbox lifecycle |
| OD-M19 | Recovery environment and availability | Use an isolated production-controlled recovery environment; require HA/failover or lower 99.5% | Operations owner / M01, M15 | DEPLOYMENT-ARCHITECTURE; BACKUP-RESTORE; U-5 |
| OD-M20 | CI, cleanup jobs and dependency graph | Assign all CI stages and one cleanup job/index per retention rule; add M07 to M11 and M10/M11 to M14 edges | Architecture owner / M01 | BACKGROUND-JOBS; DATA-LIFECYCLE; roadmap |
| OD-M21 | Critical test evidence | Add named auth, timer, deletion, restore, isolation, browser, breakpoint and load tests with owners | QA owner / each milestone | TESTING-STRATEGY; ACCEPTANCE-CRITERIA |
| OD-M22 | Incident, privacy and processor rules | Define breach response, staff access, processor region/DPA/retention and report retention | Privacy and operations owners / M15 | SECURITY-ARCHITECTURE; DATA-LIFECYCLE |
| OD-M23 | Error-tracking and backup operators | Select U-A7; name backup provider and two operators; test secret and PII scrubbing | Operations owner / M15 | U-A7; BACKUP-RESTORE section 8 |

## D. UI direction decisions

These source IDs remain open and must be recorded individually. Navigation and assets cannot be treated as approved defaults.

| ID | Decision | Recommended correction | Owner / gate | Source |
|---|---|---|---|---|
| U-D1 | App logo and icon | Keep text wordmark and honest placeholder until supplied | Product owner / M01 | DESIGN-PRINCIPLES section 5 |
| U-D2 | Brand palette | Approve or replace; rerun contrast checks | Product owner / M01 | DESIGN-PRINCIPLES section 5 |
| U-D3 | Typeface and licensing | Approve self-hosted Atkinson or system fallback | Product owner / M01 | DESIGN-PRINCIPLES section 5 |
| U-D4 | Pomodoro auto-start and sound | No auto-start; approve one licensed chime and mute behavior | Product owner / M07 | DESIGN-PRINCIPLES section 5 |
| U-D5 | Terms, privacy and AI consent copy | Supply legally reviewed pages/copy before links or AI consent ship | Legal owner / M15, P3-01 | DESIGN-PRINCIPLES section 5 |
| U-D6 | Help/contact channel | Omit from MVP unless an operated channel exists | Product owner / M13 | DESIGN-PRINCIPLES section 5 |
| U-D7 | Landing-page depth | Keep minimal entry page; no fabricated marketing content | Product owner / M13 | DESIGN-PRINCIPLES section 5 |
| U-D8 | Additional routes | Approve only routes backed by pages and milestones | Product owner / M01 | DESIGN-PRINCIPLES section 5 |
| U-D9 | Week start | Monday, aligned across calendar/statistics/group rules | Product owner / M09 | DESIGN-PRINCIPLES section 5 |
| U-D10 | Mobile tab bar | Approve after navigation ordering and destination audit | Product owner / M01 | DESIGN-PRINCIPLES section 5 |
| U-D11 | Icon library dependency | Approve Phosphor only if relevant icons and bundle/license checks pass | Product owner / M01 | DESIGN-PRINCIPLES section 5 |
| U-D12 | Subject colors | Approve values/names after contrast verification | Product owner / M03 | DESIGN-PRINCIPLES section 5 |
| U-D13 | Notes search/tagging | Exclude; no requirement exists | Product owner / M11 | DESIGN-PRINCIPLES section 5 |
| U-D14 | PWA install UI | Exclude until a PWA requirement is approved | Product owner / Phase 2 | DESIGN-PRINCIPLES section 5 |

## E. Phase 2 and Phase 3 decisions

| ID | Decision | Recommended correction | Owner / gate | Source |
|---|---|---|---|---|
| OD-F01 | PWA scope and architecture U-A6 | Add requirements and acceptance criteria, or remove PWA from committed scope | Product owner / Phase 2 | PRODUCT-SCOPE; U-A6 |
| OD-F02 | Flashcard/reminder dependency and daily review counting | Align dependency; count distinct cards or attempts explicitly; return next due date | Product owner / P2-04 | FEATURE-ANALYSIS; FR-109..112 |
| OD-F03 | Streak opt-out and XP sequencing | Add an FR/UI if opt-out is required; define row creation, cross-day award and net compensation | Product owner / P2-02, P2-03 | roadmap; FR-160..177 |
| OD-F04 | Push delivery and SSRF defense | Approve Web Push/VAPID; allow-list providers and validate DNS/IP at send time | Security owner / P2-01 | Push approach; NOTIF-05..07 |
| OD-F05 | AI prerequisites and selected topics | Decide whether 28 days of history is required; add selected `topicIds` consistently | Product owner / P3-01 | FEATURE-ANALYSIS; FR-190/198; AI-04 |
| OD-F06 | AI provider, consent, attempt and spend limits | Select U-A3; legal review U-4; cap attempts and global spend; define one terminal-state table | Product, legal and finance owners / P3-01 | AI-INTEGRATION; U-A3; U-4 |
| OD-F07 | Group moderation and privacy | Name triage owner/workflow; expose opaque member IDs and aggregate-only study data | Product and privacy owners / P3-02 | FR-209; group API/security |
| OD-F08 | Group week, cap, invites and administration | Choose one timezone/week key; enforce cap 20; bind invites; lock role transitions | Product owner / P3-02 | FR-201..212; U-3 |
| OD-F09 | Public API operation matrix | Define exact write surface, pagination exception if any, and 39-operation PUB-01..37 inventory | Product owner / P3-03 | FR-220..226; OPENAPI-PLAN |
| OD-F10 | Public API wire codes and tooling | Choose canonical codes and OpenAPI generator/diff/reference tooling | Architecture owner / P3-03 | API-ERRORS; requirements; U-9 |

## F. Proposed defaults awaiting approval

PRD U-2 (level formula), U-3 (review limit 50 and group cap 20), U-4 (five AI generations per day plus legal consent), U-5 (99.5% availability, RPO 24 hours, RTO 8 hours), U-7 (manual overlap rejection), U-8 (notes conflict UX), U-9 (60 public requests per minute), all numeric NFR targets, and all I-1..I-8 resolutions remain proposed. Bulk approval is acceptable only when the approval record names the exact baseline and list.

## G. Approval record

| Date | Approved scope | Evidence | Limits |
|---|---|---|---|
| 2026-11-18 | M00 charter in [08-build/M00-IMPLEMENTATION-PLAN.md](08-build/M00-IMPLEMENTATION-PLAN.md): scope, throwaway-output rule, evidence rules, tasks M00-T01..M00-T14, timebox and spend limits | Owner instruction "approved" in the planning session; the plan file; this record | M00 only. No ADR is Accepted, no requirement baseline is approved, no other milestone and no Build Mode is authorized. OD-S02..OD-S06 close only on recorded evidence. |
