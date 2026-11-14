# Final Architecture Review (Phase 8 Documentation Audit)

> Status: Audit result. Planning mode only: no application code, no migrations, and no approved document was edited. Corrections are recommendations that need owner approval (see [OPEN-DECISIONS.md](OPEN-DECISIONS.md)).

## 1. Method and scope

- 73 planning documents under `docs/` were audited (PROJECT-BRIEF, FEATURE-PRIORITIZATION, 01 to 07 folders, ADR-001 to ADR-011).
- Mechanical checks (scripted, repeatable) covered every requirement ID, business rule, edge case, NFR, endpoint ID, page ID and milestone scope line.
- Five read-only reviewers audited slices in parallel: requirements, database, API, UI/UX, architecture and roadmap. Each finding cites `file:line` from the reviewer. The author spot-checked the critical items against the sources (results in section 3).
- Findings are labelled CRITICAL (blocks Build Mode or makes an approved milestone impossible or unsafe), MAJOR (wrong implementation likely unless fixed before the owning milestone), MINOR (wording, count or citation drift).

## 2. Completeness metrics

| Check | Result | Basis |
|---|---|---|
| Functional requirements with acceptance criteria | 164 / 164 | `AC-FR-xxx-n` present for every FR (595 criteria) |
| FRs in REQUIREMENT-TRACEABILITY | 164 / 164 | |
| FRs with an API-ENDPOINTS coverage row | 164 / 164 | 137 endpoint, 15 job, 5 server component, 5 client only, 2 composition |
| FRs assigned to a module | 164 / 164 | MODULE-BOUNDARIES section 2 (FR-020 to FR-023 are dashboard composition) |
| FRs assigned to a milestone | 164 / 164 | MILESTONES scope lines; no FR sits in a milestone of a different phase |
| FRs with a page or UI home | 164 / 164 | FR-073 and FR-139 are not cited by any page spec; placement given in the matrix |
| Business rules BR-001..BR-032 defined and cited | 32 / 32 | no undefined citations |
| Edge cases EC-001..EC-028 defined and cited | 28 / 28 | |
| NFRs with an acceptance row | 62 / 62 | NFR-033, 082, 100, 101, 102 are cited by no FR or milestone scope line (architecture docs cover them) |
| Endpoints with a spec block | 164 / 164 | 125 internal (83 MVP, 16 Phase 2, 26 Phase 3) and 39 public |
| FR-063 | cited, not defined | PAGE-SPECIFICATIONS line 240 cites a requirement that does not exist (FR-133 is absent by design; FR-063 is not noted as such) |

Linkage completeness is 100% for the items above. That is a structural measure only. It is not a readiness measure: 13 of 164 FRs (92% clean; MVP 85 of 98, 87% clean) sit under a CRITICAL finding (section 3), and all 73 documents still carry "Proposal, pending approval".

## 3. Critical findings (block Build Mode)

| ID | Finding | Evidence | Recommended correction |
|---|---|---|---|
| C-1 | No approval is recorded. Build Mode says planning is "completed and approved"; every ADR is `Proposed`, every document header says "Proposal, pending approval", and SDD.md line 10 says nothing is final until the owner approves. PRD U-1 (approve I-1..I-8) is open. | ADR-001..011 lines 3 and 7; SDD.md:10, :178; PRD.md:289-308; Build Mode.txt line 3 | Owner records approval of the corrected set. Then mark ADRs Accepted and change document headers to Approved with a date. Not done by this audit. |
| C-2 | Account pre-hijack. AUTH-01 creates an account with no email-ownership check (`email_verified` stays false and no endpoint sets it). Google sign-in then signs in to an existing account with the same email "regardless" and keeps its password. An attacker who registers a victim's email retains access after the victim uses Google. Verified by the author. | API-ENDPOINTS.md:265; FUNCTIONAL-REQUIREMENTS.md:58 (AC-FR-003-2); API-STRATEGY.md:119 (no verification endpoint); DATA-DICTIONARY.md:26 | Decide linking policy before M02: require verified email before linking, or on link revoke existing password sessions and require password reset. Record in ADR-004 and amend FR-003 and AUTH-03. |
| C-3 | M05 cannot pass its acceptance criteria. M05 scope includes FR-036 (actuals from linked sessions, AC-FR-036-1 needs 75 linked minutes) but sessions arrive in M06. Study plans (rank 6) may not depend on Study sessions (rank 7). PLAN-01 and PLAN-03 return `actualSeconds`. The composition direction is deferred to the SDD and is still open. | MILESTONES.md:241-243; MODULE-BOUNDARIES.md:37; API-ENDPOINTS.md:945-946, :973; IMPLEMENTATION-PLAN.md:114 | Decide the composition owner (adapter or Analytics read model). Move FR-036 actuals and the `done` status into M06 (or M12) in the scope lists. |
| C-4 | Migration order is impossible. M01 migrates `idempotency_keys` with `user_id -> users(id)`; `users` is created in M02. Milestones must apply from an empty database. | MILESTONES.md:129, :164; DATA-DICTIONARY.md:624-628; DEFINITION-OF-DONE.md:30 | Move `idempotency_keys` to M02 or add its FK in M02. Check `outbox_events` and `rate_limit_counters` carry no user FK (they do not). |
| C-5 | The deletion privacy promise cannot be met with the configurable purge window. NFR-031 requires live purge within 30 days and backups within 35 days. Backups are kept 30 days. IMPLEMENTATION-PLAN and BACKGROUND-JOBS allow a 30-day grace, which leaves data in backups for up to about 60 days. DATABASE-DESIGN and DATA-LIFECYCLE default to 24 hours and call a longer window schema-free. Reported independently by three reviewers. | NON-FUNCTIONAL-REQUIREMENTS.md:39; BACKUP-RESTORE.md:15-19; BACKGROUND-JOBS.md:25, :48; IMPLEMENTATION-PLAN.md:108; DATABASE-DESIGN.md:217; DATA-LIFECYCLE.md:67 | Cap the purge delay at 5 days or less, or restate NFR-031 as grace period plus 30 days. Needed before M14. |
| C-6 | Registration writes data owned by a later milestone. AUTH-01 "creates the default daily goal of 120 minutes", but `daily_goal_history` arrives in M08 and Authentication (rank 1) cannot call Goals (rank 12). | API-ENDPOINTS.md:210, :224; MILESTONES.md:~306-313; DATA-DICTIONARY.md:403-413; DATA-LIFECYCLE.md:28 | Specify a derived default (no row means 120, BR-013) and remove the insert from AUTH-01 and the dictionary note. |

## 4. Major findings

### Requirements and product

| ID | Finding | Evidence | Correction |
|---|---|---|---|
| M-1 | Topic weight is an MVP Must (FR-015), AC-FR-016-1 asserts readiness uses it, but readiness is Phase 2. Weight is stored twice (`topics.weight`, `exam_topics.weight`) and it is undefined which feeds readiness. | FUNCTIONAL-REQUIREMENTS.md:255, :274, :1726, :1735; DATA-DICTIONARY.md:161, :193; MILESTONES.md:223 | Keep one weight column; drop the readiness clause from the MVP AC. |
| M-2 | MVP end-to-end scenarios omit goals, plan overlap, manual entry, idle auto-close, lockout, account deletion and purge, to-dos and note sanitization. AC-E2E-02 needs M12 statistics but TESTING-STRATEGY places it fully at M07. | ACCEPTANCE-CRITERIA.md:689-698; TESTING-STRATEGY.md:129, :134; MILESTONES.md:290, :407 | Add scenarios; assign AC-E2E-02 completion to M12. |
| M-3 | NFR-061 requires a test for every BR; the MVP definition of done excludes only BR-017..BR-022, though BR-024 and BR-027 are Phase 2. | NON-FUNCTIONAL-REQUIREMENTS.md:73; ACCEPTANCE-CRITERIA.md:659, :708 | Scope NFR-061 to applicable rules. |
| M-4 | Heartbeat during pause: FR-052 says "while running"; TIM-06 says "while a timer exists". A pause over 30 minutes either auto-closes at pause start or never. | FUNCTIONAL-REQUIREMENTS.md:779; API-ENDPOINTS.md:1238; APPLICATION-FLOWS.md:215 | Decide and state in FR-052, TIM-06 and the flow. |
| M-5 | "Past" plan entry: FR-035 uses start time, FR-033 implies end time. An in-progress entry can be marked missed. | FUNCTIONAL-REQUIREMENTS.md:476-480, :509-514 | Missed uses end time; edit lock uses start time. |
| M-6 | XP compensation after a capped award is undefined (could deduct more than was awarded). | FUNCTIONAL-REQUIREMENTS.md:2229 (FR-177), FR-173 | Compensate only the amount actually awarded. Phase 2. |
| M-7 | Group week boundary defined three ways (group week by UTC, member zone, "group-agreed"). | BACKGROUND-JOBS.md:64; DATABASE-DESIGN.md R5; FUNCTIONAL-REQUIREMENTS.md:2610 | Use each session's frozen `local_date` (API-CONVENTIONS section 15 already says so); edit FR-207 and BACKGROUND-JOBS. |
| M-8 | PROJECT-BRIEF and FEATURE-PRIORITIZATION omit Dashboard, Study planning, onboarding and PWA that the PRD scopes; PWA has no FR. | FEATURE-PRIORITIZATION.md:7-30; PROJECT-BRIEF.md; PRD.md:59-60, :84 | Align the brief or mark PRD I-1 and I-7 approved. |

### Data and jobs

| ID | Finding | Evidence | Correction |
|---|---|---|---|
| M-9 | Export file lifetime: 24 h in BACKGROUND-JOBS, SYSTEM-ARCHITECTURE, SECURITY-ARCHITECTURE, DEPLOYMENT-ARCHITECTURE and MILESTONES; 48 h in DATA-DICTIONARY, DATA-LIFECYCLE and API-SCHEMAS. The expiry job could delete a file the API still lists. Also `snapshot_at` is set at request time (API) or job start (jobs, lifecycle). | DATA-DICTIONARY.md:119; DATA-LIFECYCLE.md:18, :96; BACKGROUND-JOBS.md:29, :50; API-ENDPOINTS.md:467 | Choose 48 h and snapshot at job start; edit the others. |
| M-10 | Retention cleanups have no owning job or milestone: `idempotency_keys`, `outbox_events`, `rate_limit_counters` (all created in M01 and unbounded from then), `notifications`, `group_invites`, `data_exports`, `ai_generation_requests`, deletion-log and mirror age-out. | DATA-LIFECYCLE.md:7, :40-42; BACKGROUND-JOBS.md:24-43; MILESTONES.md:132, :450, :713 | Add each job to the catalog and assign to M01, M14 or the owning phase. |
| M-11 | Exam auto-archive job: BACKGROUND-JOBS, ADR-005 and FR-124 still say the job archives; the database design derives archived state and MILESTONES says the job only emits `ExamArchived`. A-13 also offers "archive" with no FR or endpoint. | BACKGROUND-JOBS.md:27, :65; DATABASE-DESIGN.md R4; PAGE-SPECIFICATIONS.md:351 | Align wording; remove "archive" from A-13 or add an FR. |
| M-12 | Pomodoro pause and resume during a break would open a focus segment: break phases have no segment, `phase_ends_at` is absolute and no remaining time is stored. | DATABASE-DESIGN.md R2; API-ENDPOINTS.md:1204; DATA-DICTIONARY.md:280 | Define pause per phase; add `phase_remaining_seconds` or tag segments. |
| M-13 | Auto-close ownership breaks the rank rule: Study sessions (rank 7) owns `AutoCloseIdleSessions`, Timer (rank 8) owns heartbeats and runs. A late stop depends only on the reaper job, so a stop after 30 min silence could record the idle gap if the single worker is down. | MODULE-BOUNDARIES.md:38-39; BACKGROUND-JOBS.md:24; API-STRATEGY.md:35; API-ENDPOINTS.md:1160, :1229 | Move the use case to Timer or invert via an inversion point; add a lazy close-at-last-heartbeat check on read and stop. |
| M-14 | AI request fields `errorCode` and `removedByReason` have no columns. `user_gamification` has no creation rule while locking depends on the row. `card_reviews.card_id` is a plain FK that breaks the composite ownership pattern. | API-SCHEMAS ScheduleRequest; DATA-DICTIONARY.md:429, :531-548, ~375-390; DATABASE-CONSTRAINTS section 2.2 | Add columns; create the row at registration with a P2-02 backfill; use `(card_id, user_id)` composite FK. |
| M-15 | A restore can drop a pending deletion request (the mirror is written only after purge). | DATA-LIFECYCLE.md section 3 step 5; BACKUP-RESTORE.md sections 2, 6 | Write the request to the mirror at request time. |

### API and security

| ID | Finding | Evidence | Correction |
|---|---|---|---|
| M-16 | CSRF: SECURITY-ARCHITECTURE describes a token; API-SECURITY and API-CONVENTIONS decide an origin check with `Sec-Fetch-Site` fallback and no token. ADR-008 still names server actions that the API docs say are not used. | SECURITY-ARCHITECTURE.md:43, :125, :217; API-SECURITY.md:150; API-CONVENTIONS.md:171; ADR-008 decision 1 | Rewrite SECURITY-ARCHITECTURE and ADR-008 to the origin-check decision. Needed before M02. |
| M-17 | Rate limiter: ADR-008 says Postgres "in Phase 3", MVP needs it for sign-in (M01 creates the table); SECURITY-ARCHITECTURE and TECHNOLOGY-DECISIONS allow in-memory, which breaks per-IP limits with two web instances. | ADR-008 decision 5; SECURITY-ARCHITECTURE.md:181; TECHNOLOGY-DECISIONS.md:317; API-SECURITY.md:102 | State Postgres-backed from MVP everywhere. |
| M-18 | Wire codes wrong in requirements: AC-FR-221-1 says `insufficient_scope` (wire code `scope_missing`); AC-FR-223-2 says `unknown_version` (wire code `unsupported_api_version`). Phase 3. | FUNCTIONAL-REQUIREMENTS.md:2725, :2760; ACCEPTANCE-CRITERIA.md:591, :600; API-ERRORS.md:96, :158 | Edit both files. |
| M-19 | Public API count: milestone P3-03 says PUB-01..PUB-35 and the roadmap "35 endpoints"; the inventory has 39 operations including PUB-36 and PUB-37. API-STRATEGY and OPENAPI-PLAN say "37 rows". | API-ENDPOINTS.md:2607-2647; MILESTONES.md:712; DEVELOPMENT-ROADMAP.md:172 | Use PUB-01..PUB-37, 39 operations. |
| M-20 | NOTIF-05 stores any HTTPS push endpoint and the worker POSTs to it: SSRF path. | API-ENDPOINTS.md:2038; EXTERNAL-INTEGRATIONS.md section 2.5 | Allow-list push-service hosts or guard resolved addresses at send time. Phase 2. |
| M-21 | AI cost: quota counts only responses received; timeouts and errors are uncounted and retried (second billed call). No attempts ceiling and no global spend ceiling, though R13 promises cost caps. Also a 30 s timeout is `timed_out` in one place and `failed` in another; `proposal_stale` has no reasons for accept-time failures. | AI-INTEGRATION.md sections 7, 8, 10; API-ENDPOINTS.md:2160-2189; API-ERRORS.md:165; ASSUMPTIONS-AND-RISKS.md:40 | Add per-user attempts and monthly global ceilings; fix terminal state; extend reasons. Before P3-01 (gate G4). |
| M-22 | Group privacy (Phase 3): responses expose `userId` to all members against the "never include user_id" rule; no admin step-down call although FR-205 and the role diagram imply it; leaderboard `weekStart` reveals weeks before join or opt-in; concurrent admin leave or remove can break the one-admin invariant. | API-SCHEMAS.md:17, :883; API-ENDPOINTS.md:2213, :2319-2333, :2404-2449, :2472-2486; FUNCTIONAL-REQUIREMENTS.md:2569 | Opaque `memberId`; add step-down; clamp `weekStart`; lock GRP-11 and GRP-12. Before P3-02. |
| M-23 | Audit gaps CR-1 (API keys, AI consent, export events), CR-2 (AI cost columns), CR-3 (bounce suppression) are open; the `event_type` CHECK that M02 migrates has six values. | API-SECURITY.md:156-164; DATA-DICTIONARY.md:668 | Decide CR-1 before M02 so the CHECK is right the first time. |
| M-24 | No personal-data incident procedure and no privacy-law statement (breach, GDPR, DPA). Legal pages are deferred to M15. A weekly dump goes to a second provider that is unnamed. | DEPLOYMENT-ARCHITECTURE.md:133; BACKUP-RESTORE.md section 8; DESIGN-PRINCIPLES.md U-D5 | Write an incident and privacy runbook before M15 and name the provider. |

### Roadmap, testing and UI

| ID | Finding | Evidence | Correction |
|---|---|---|---|
| M-25 | CI stages 5, 6, 9, 10, 11 (preview E2E, dependency scan, migration, deploy) are built by no milestone; TESTING-STRATEGY expects preview E2E from M02 and SECURITY-ARCHITECTURE requires the dependency scan on every PR. | MILESTONES.md:135, :146; TESTING-STRATEGY.md:122-124; SECURITY-ARCHITECTURE.md:185 | Assign stages to M01. |
| M-26 | Dependency graph lets M10 and M11 be skipped; M14 needs every purge handler. M11 completes FR-049 but lists only M03. M00 spike (d) needs a vendor choice that gate G1 can defer. | DEVELOPMENT-ROADMAP.md section 5, :188; MILESTONES.md:44, :105-106; IMPLEMENTATION-PLAN.md:120 | Add edges M10, M11 to M14 and M07, M11 for FR-049; require U-A1 before M00(d). |
| M-27 | Timer accuracy tests (AC-NFR-052, AC-NFR-090: 1, 25, 120 min runs, throttled tab, wrong client clock) are absent from the M07 test list and fault injection. | ACCEPTANCE-CRITERIA.md:655, :672; MILESTONES.md:289; TESTING-STRATEGY.md:61 | Add to M07 and section 5. |
| M-28 | Offline timer: the UI spec queues Pause and Stop as "Waiting to sync"; FR-054, EC-028 and the architecture only retry heartbeats, and the server is the time authority (actions carry no durations). A queued Stop would be timestamped at reconnect. | INTERACTION-SPECIFICATIONS.md:141; PAGE-SPECIFICATIONS.md:208; EDGE-CASES.md:36; SYSTEM-ARCHITECTURE.md:78 | Remove queuing, or add a client-timestamp rule to FR-054, EC-028 and ADR-011. |
| M-29 | Timer UI contradictions: tab title cadence (once per minute vs about once per second in FR-056); Pomodoro focus-end goes to break automatically but an alert offers "Start break"; mini-bar Stop flow is described but the mini-bar and dashboard card have no Stop; desktop mini-bar specified three ways. | INTERACTION-SPECIFICATIONS.md:98-117, :139, :184, :196, :200; FUNCTIONAL-REQUIREMENTS.md:829-841; NAVIGATION-STRUCTURE.md:71, :81; RESPONSIVE-DESIGN.md:29 | Pick one behaviour per item; edit the others. Before M07. |
| M-30 | Accessibility: heatmap Today outline measures about 1.6:1 (light) and 1.06:1 (dark) against the darkest fills, below the claimed 3:1; mobile bottom padding reserves 88 px but tab bar plus mini-bar is 112 px plus safe area; 8 px target gaps need 356 px in a 360 px calendar grid with 16 px gutters. Reviewer calculation by hand from hex values; recompute before relying on it. | COLOR-TYPOGRAPHY.md section 1, section 4; ACCESSIBILITY.md SC 1.4.11, 2.4.11; RESPONSIVE-DESIGN.md section 4 | Offset the outline outside the cell; set padding to 112 px plus safe area; revisit gap or gutter. |
| M-31 | FR-073 AC-3 needs a "goal not met" label on past days in the calendar or statistics, but A-5 has none and CAL-01 and CAL-02 return no goal field. Drag reorder is both MVP (A-7, A-8, accessibility names) and Phase 2 (reorder by buttons in MVP). Streak opt-out appears in milestones but in no FR or page. | PAGE-SPECIFICATIONS.md:228-241, :265, :271; API-ENDPOINTS.md:1771-1808; MILESTONES.md:534, :541 | Add goal-met flag to calendar day payloads and the day panel; settle drag; add an FR or remove opt-out. |

## 5. Minor findings

Consolidated; each is a wording, count or citation fix.

- Landmark name "Primary" vs "Main"; mini-bar link punctuation; A-3 and A-5 layouts split at 900 px, a width absent from the breakpoint table (768 and 1024).
- Locked-account message "updates on submit only" while the submit button is disabled until the lock ends.
- Timezone is asked in sign-up and again in onboarding step 3 against the "not asked twice" claim; statistics journey says at most 2 clicks but needs 3 taps on mobile; calendar called read-only yet has "Add plan entry"; journey 7 promises readiness in the MVP.
- ERROR-HANDLING section 5 is cited for rules it does not contain; five settings routes share the page name A-15 so titles are not unique; tab-title wording (elapsed vs remaining); COMPONENT-INVENTORY lacks a disclosure component; A-14 view switch called tabs and segmented control; PAGE-SPECIFICATIONS cites no endpoint IDs.
- Routes reference `/onboarding` and `/dashboard` from M02 sign-up, but A-1 and A-2 are built in M13.
- AUTH common error set omits `session_expired`, `session_revoked`; `csrf_rejected` also applies to guest endpoints AUTH-01, 02, 05, 06; FR-208 coverage row names `group_full` for GRP-15, which never emits it; RL-RESET per-email bucket cannot apply to AUTH-06 (no email in the body); RL-TIMER 120/min fails with about 5 tabs; lockout is a denial-of-service vector and per-IP limits will throttle campus NAT users; invite email binding is unspecified; FR-198 allows empty history while R13 and G4 require 4 weeks; PROF-08 streams from storage inside the request against the EXTERNAL-INTEGRATIONS rule.
- ADR-006 and SYSTEM-ARCHITECTURE say day allocation at read time, but `study_session_days` is stored on write. ADR-011 key lifetime differs from the 7 days in DATABASE-DESIGN. INDEXING cites a group cap of 100 where FR-208 says 20. DATABASE-DESIGN says `user_id` and `created_at` are on every table; `exam_topics` and `timer_run_segments` have no `user_id` and three tables have no `created_at`.
- `UNIQUE (lower(email))` is invalid as a table constraint (needs a unique index); `uq_exams_id_user` has no referencing FK; CONCEPTUAL-ERD omits five entities and two cardinality notations contradict the text; LOGICAL-ERD lacks five attribute blocks.
- Exam readiness MVP/Phase 2 wording; NFR-042 (Phase 2) is cited by MVP FR-012 and FR-016; NFR-002 measures at 500 concurrent users while NFR-070 sets capacity at 1,000; AC-E2E-01 times register plus wizard plus first session at 3 minutes while FR-134 times the wizard only; FEATURE-ANALYSIS asks 4 weeks of data, FR-198 does not.
- U-2 and U-3 are "default used" in SDD but owner gates elsewhere; P3-02 depends on P2-03 although groups do not use XP and the leaderboard shows minutes; P3-02 tests omit EC-025; rolling deploy says "web then worker" while ADR-005 requires one version at all times; no version pins; no DST gap or overlap rule for plan entries and reminders (EC-006 covers durations only); no hosting budget figure.
- MVP stop transaction writes XP while `xp_ledger` is Phase 2: state the write is a no-op until P2-03. Timer stop idempotency has no mechanism (a `discarded` stop has no `request_key` row). Deletion request steps differ between API (revokes sessions and API keys) and DATA-LIFECYCLE (sessions only).

## 6. Technical risk assessment

| Area | Rating | Basis and mitigation in the documents | Residual gap |
|---|---|---|---|
| Database complexity | Medium | 41 tables, composite ownership FKs, `btree_gist`, PG 15 or newer; every FK indexed (reviewer verified) | C-4, M-12, M-14; vendor must support `btree_gist` and the pooler mode (not in the vendor checklist) |
| AI integration cost and failure | High until capped | Port and adapter (ADR-010), consent, per-user daily quota, kill switch, data minimisation | M-21: uncounted retries, no global ceiling; legal consent text pending (U-4) |
| Timer reliability | High (core loop) | Server authoritative time, heartbeat, idle auto-close, M07 is XL and moved early | M-4, M-12, M-13, M-27, M-28; spike M00 is the right control |
| Calendar scheduling conflicts | Medium | `btree_gist` overlap detection, confirmation flow (BR-026) | M-5; Phase 2 drag-and-drop concurrency; no DST gap rule |
| Time zones | High | UTC storage, frozen zone, local date and rollover hour per session (ADR-006, NFR-091) | DST gap and overlap rule; ADR-006 wording stale; FR-207 week boundary |
| XP and leaderboard abuse | Medium (Phase 2 and 3) | Daily cap, ledger, manual sessions excluded, 5-minute minimum | M-6, M-22; the XP row lock depends on an uncreated row |
| Study group permissions | Medium to High (Phase 3) | Role matrix, not-found on cross-user access, last-admin rule | M-22 |
| Performance | Low to Medium | Indexing strategy, read models, NFR targets | NFR-002 vs NFR-070 load figures; no hosting budget |
| Data privacy | High | 16 or older gate, deletion with purge, export, no tracking (NFR-033) | C-5, M-24, M-15; no breach or privacy statement |
| Backup and restore | Medium | Daily backups, RPO 24 h, RTO 8 h (6.9 h budget), restore drills | C-5, M-15; PITR availability and second provider unknown |

## 7. Security review

| Area | Documented control | Verdict |
|---|---|---|
| Authentication | Better Auth (Auth.js fallback), argon-class hash, 10 character minimum, lockout 5 per 15 min, 30-day idle expiry, revocation within 60 s | Gap C-2 (account linking). Lockout allows targeted lockout of known emails: accepted trade-off needs a written decision. Library choice is conditional on the M00 spike |
| Authorization and isolation | `user_id` ownership, composite FKs, not-found on cross-user access, ownership contract test pattern from M02, K scopes for the public API | Sound; one exception `card_reviews` (M-14), and group `userId` exposure (M-22) |
| Input validation | Zod at every handler, server-side limits, markdown sanitization (ADR-007) | Sound; sanitization has no dedicated E2E scenario (M-2) |
| API security | Origin check, cookie rules, rate-limit classes, idempotency, `If-Match` | CSRF wording conflict M-16; limiter backend M-17; NOTIF-05 SSRF M-20 |
| File upload | No upload surface (SYSTEM-ARCHITECTURE:173); export files are server-generated and stored | Not applicable for the MVP; export links need expiring access (documented) |
| Rate limiting | RL-* classes in Postgres | Cleanup job missing (M-10); shared-IP throttling of campus users noted |
| Secret management | Secrets store, bundle scan in CI, no secrets in logs | CI stage 6 and bundle scan not assigned to a milestone (M-25) |
| Data retention | DATA-LIFECYCLE per table | Cleanup jobs unowned (M-10); backup bound conflict (C-5) |
| Privacy | Minimisation, no ads or tracking, AI consent | No incident procedure or legal statement (M-24); consent text pending legal review |
| Logging | Request IDs, scrubbing of passwords, tokens, note content, AI text | Scrub test planned in M01 and M15 |
| Audit trail | `auth_audit_events` with six event types | CR-1 open (M-23) |

## 8. Cross-document consistency summary

- Terminology: "Lumora" in all documents; the planning prompts say "Study Tracker". Use Lumora and say so in the README.
- Duplicate requirements: none found by the scripted checks. FR ranges in module boundaries and milestones agree.
- Missing requirements: topic reorder keyboard path (NFR-042 scope), streak opt-out, exam manual archive (either remove or add), PWA (in scope text, no FR), incident procedure, DST rule, calendar goal-met flag.
- Undefined business rules: heartbeat during pause, "past" entry, XP compensation, group week boundary, default goal creation.
- Missing relationships: none missing from the dictionary; `card_reviews` ownership is the only weak one.
- Unspecified error handling: AI `proposal_stale` reasons, `session_expired` and `session_revoked` in the common set, queued offline commands.
- Priority inconsistencies: topic weight MVP vs readiness Phase 2; NFR-042; streak opt-out.
