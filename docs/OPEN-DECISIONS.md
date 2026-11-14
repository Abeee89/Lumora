# Open Decisions

> Status: Created in Phase 8. Each item needs an explicit owner decision. "Recommended" is this audit's proposal, not an approved decision. Nothing here was applied to the approved documents.

Priority: **Blocker** stops Build Mode or a named milestone. **Before Mx** must be settled before that milestone starts. **Later** can wait for its phase.

## A. Blockers before any build

| ID | Decision | Recommended | Blocks | Source |
|---|---|---|---|---|
| D-01 | Approve the planning set and PRD resolutions I-1..I-8 (U-1); record approval and date; mark ADR-001..011 Accepted | Approve after the corrections in D-02 to D-07 are applied | Build Mode | PRD.md:289-308; SDD.md:178; ADR headers |
| D-02 | Google account linking policy (finding C-2): link only to an email-verified account, or on link force sign-out of password sessions and a password reset | Require verified email before linking; add an email verification step or treat Google as the verifier and revoke existing password sessions | M02 | API-ENDPOINTS.md:265; ADR-004 |
| D-03 | Plan actuals composition (C-3): who joins sessions to plan entries | Adapter or Analytics read model; FR-036 actuals and `done` move to M06 | M05 | IMPLEMENTATION-PLAN.md:114; MILESTONES.md:241 |
| D-04 | Account purge delay (C-5) | 24 hours as in DATABASE-DESIGN, hard cap 5 days; restate backup bound as delay plus 30 days if the cap is raised | M14 | NFR-031; DATABASE-DESIGN.md:217 |
| D-05 | Default daily goal (C-6) and `idempotency_keys` placement (C-4) | Derived default at read time (no row means 120); create `idempotency_keys` in M02 | M01, M02 | MILESTONES.md:129; API-ENDPOINTS.md:210 |
| D-06 | Hosting vendor U-A1 (gate G1); PostgreSQL 15+ with `btree_gist` and pooler mode must be criteria | Choose against DEPLOYMENT-ARCHITECTURE section 8 plus those two criteria | M00(d), M01 | DEVELOPMENT-ROADMAP.md:188 |
| D-07 | Product name: planning prompts say "Study Tracker", documents say Lumora | Lumora | Build Mode wording | Build Mode.txt |

## B. Before the owning MVP milestone

| ID | Decision | Recommended | Before | Source |
|---|---|---|---|---|
| D-08 | Email provider U-A2; minimum age U-6 (16+); auth library spike U-A4 (Better Auth callback path, UUIDv7) | Keep 16+; run the spike in M00 | M02 | IMPLEMENTATION-PLAN.md:120-128 |
| D-09 | CSRF mechanism wording and rate-limit backend in SECURITY-ARCHITECTURE, ADR-008, TECHNOLOGY-DECISIONS | Origin check with `Sec-Fetch-Site` fallback; Postgres limiter from MVP | M02 | M-16, M-17 |
| D-10 | Audit event types CR-1 (keys, AI consent, export) so the M02 CHECK is final | Add the event types now | M02 | API-SECURITY.md:156-164 |
| D-11 | Topic weight: MVP or Phase 2; single weight column | One column on topics; readiness reads it in Phase 2 | M03 | M-1 |
| D-12 | Exam archive: automatic only (remove "archive" from A-13) or add FR and endpoint; job wording | Automatic, derived state | M04 | M-11 |
| D-13 | "Past" plan entry definition; heartbeat during pause; late-stop lazy close | End time for missed, start time for edit lock; pause keeps heartbeats; add lazy close | M05, M07 | M-4, M-5, M-13 |
| D-14 | Offline timer behaviour (queue vs retry); Pomodoro break start; mini-bar Stop; desktop mini-bar; tab title cadence; drag reorder in MVP | Retry only, no queue; break starts after explicit tap; no Stop on mini-bar; one-line desktop mini-bar rule; per-second title; buttons in MVP | M07 | M-28, M-29, M-31 |
| D-15 | Pomodoro pause per phase (store remaining time or tag segments) | Add `phase_remaining_seconds` | M07 | M-12 |
| D-16 | Export lifetime and snapshot time | 48 h, snapshot at job start | M14 | M-9 |
| D-17 | Retention jobs ownership (M-10) and CI stages 5, 6, 9, 10, 11 (M-25) | Assign to M01 (stages and cleanup for its tables) and M14 | M01 | M-10, M-25 |
| D-18 | DST gap and overlap rule for plan entries and reminders | Non-existent local times shift forward; repeated hour uses the first occurrence | M05 | EC-006 |
| D-19 | Incident and privacy runbook; legal pages (U-D5); error tracking U-A7; backup second provider | Draft before release | M15 | M-24 |
| D-20 | Calendar goal-met flag and A-5 label (FR-073); streak opt-out FR or removal | Add flag to day payloads; add FR for opt-out or drop it | M08, M09 | M-31 |
| D-21 | Dependency graph edges M10, M11 to M14; E2E scenarios list; timer accuracy tests; NFR-061 scope | Apply | M01 planning | M-2, M-3, M-26, M-27 |

## C. Phase 2 and Phase 3

| ID | Decision | Recommended | Before | Source |
|---|---|---|---|---|
| D-22 | Gate G3 owner decision, level formula U-2 | Use PRD default | P2-03 | DEVELOPMENT-ROADMAP.md:190 |
| D-23 | XP compensation after a capped award; `user_gamification` creation and backfill | Compensate awarded amount only; create at registration, backfill in P2-02 | P2-02 | M-6, M-14 |
| D-24 | NOTIF-05 push endpoint SSRF guard | Host allow-list | P2-01 | M-20 |
| D-25 | G4 and AI: attempts ceiling, global monthly spend ceiling, terminal status for timeouts, `proposal_stale` reasons, consent wording U-4 (legal), provider U-A3, AI request columns | Add ceilings; `failed` with `ai_provider_timeout`; legal wording | P3-01 | M-21 |
| D-26 | Group privacy: opaque `memberId`, admin step-down, leaderboard history clamp, admin concurrency lock, week boundary, cap U-3, invite email binding | As in M-22 and M-7 | P3-02 | M-22 |
| D-27 | Public API: PUB-01..PUB-37 scope and 39 operations, wire code fixes, OpenAPI tooling, G5, rate limit U-9 | Edit documents; choose tooling | P3-03 | M-18, M-19 |

## D. Proposals awaiting default approval

PRD U-2 (level formula), U-3 (50 reviews per day, group cap 20), U-4 (5 AI generations per day), U-5 (99.5% availability, RPO 24 h, RTO 8 h), U-7 (manual entry overlap rejected), U-8 (notes conflict UX), U-9 (60 requests per minute per key). Every NFR threshold is "proposed". Approving the defaults in bulk is acceptable if the owner agrees.
