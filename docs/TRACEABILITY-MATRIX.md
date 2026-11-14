# Lumora Requirement Traceability Matrix

> Status: Generated in Phase 8 from the planning documents (still pending owner approval). It links every functional requirement to its design documents, owning module, database tables, API endpoints, UI pages, implementation milestone, acceptance criteria and planned test cases.

## How to read this matrix

- One row per functional requirement (164 rows, FR-001 to FR-226; FR-133 does not exist by design).
- **Module** comes from the FR range in [MODULE-BOUNDARIES.md](03-architecture/MODULE-BOUNDARIES.md) section 2. **Tables** are the tables the owning module owns ([DATA-DICTIONARY.md](04-database/DATA-DICTIONARY.md) section 19). Mapping is at module level: a requirement may read tables owned by other modules through their public interfaces.
- **Endpoints** come from [API-ENDPOINTS.md](06-api-integrations/API-ENDPOINTS.md) section 2. `server component`, `client only`, `job` and `composition` mean the requirement has no dedicated endpoint by design.
- **Pages** come from the `Requirements` and `Phase` lines of [PAGE-SPECIFICATIONS.md](05-ui-ux/PAGE-SPECIFICATIONS.md) and the table in [INFORMATION-ARCHITECTURE.md](05-ui-ux/INFORMATION-ARCHITECTURE.md). Page lists are expanded from FR ranges, so a page may be listed for a requirement where only a neighbouring requirement in the same range applies (for example FR-004 on sign-up). FR-073 (goal-met chip on A-2) and FR-139 (app shell) are not cited by any page spec; they were placed by this audit.
- **Milestone** comes from the `Scope (FR/NFR)` line of [MILESTONES.md](07-roadmap/MILESTONES.md). A second milestone in brackets completes a later part of the same requirement (for example the endpoint side in M02 and the wizard UI in M13).
- **AC / TC**: acceptance criteria are in [ACCEPTANCE-CRITERIA.md](02-requirements/ACCEPTANCE-CRITERIA.md); test case IDs are planned, named after the criterion (`AC-FR-001-1` becomes `TC-FR-001-1`). No test code exists yet.
- Requirement text: [FUNCTIONAL-REQUIREMENTS.md](02-requirements/FUNCTIONAL-REQUIREMENTS.md). Product goal and user need links, and the NFR to AC to TC chain, stay in [REQUIREMENT-TRACEABILITY.md](02-requirements/REQUIREMENT-TRACEABILITY.md).
- Regenerated checks run in Phase 8: all 164 FRs have at least one AC, endpoint-coverage row, module, page and milestone; no FR is mapped to a milestone of a different phase.

## Summary by module

| Module | FRs | Milestone(s) | Design documents |
|---|---|---|---|
| Authentication | 6 | M02 | [MODULE-BOUNDARIES](03-architecture/MODULE-BOUNDARIES.md), [DATA-DICTIONARY](04-database/DATA-DICTIONARY.md), [API-ENDPOINTS](06-api-integrations/API-ENDPOINTS.md), [PAGE-SPECIFICATIONS](05-ui-ux/PAGE-SPECIFICATIONS.md) |
| User profile | 12 | M01, M02, M13, M14 | [MODULE-BOUNDARIES](03-architecture/MODULE-BOUNDARIES.md), [DATA-DICTIONARY](04-database/DATA-DICTIONARY.md), [API-ENDPOINTS](06-api-integrations/API-ENDPOINTS.md), [PAGE-SPECIFICATIONS](05-ui-ux/PAGE-SPECIFICATIONS.md) |
| Subjects | 5 | M03 | [MODULE-BOUNDARIES](03-architecture/MODULE-BOUNDARIES.md), [DATA-DICTIONARY](04-database/DATA-DICTIONARY.md), [API-ENDPOINTS](06-api-integrations/API-ENDPOINTS.md), [PAGE-SPECIFICATIONS](05-ui-ux/PAGE-SPECIFICATIONS.md) |
| Topics | 5 | M03 | [MODULE-BOUNDARIES](03-architecture/MODULE-BOUNDARIES.md), [DATA-DICTIONARY](04-database/DATA-DICTIONARY.md), [API-ENDPOINTS](06-api-integrations/API-ENDPOINTS.md), [PAGE-SPECIFICATIONS](05-ui-ux/PAGE-SPECIFICATIONS.md) |
| Dashboard (composition) | 4 | M13 | [MODULE-BOUNDARIES](03-architecture/MODULE-BOUNDARIES.md), [DATA-DICTIONARY](04-database/DATA-DICTIONARY.md), [API-ENDPOINTS](06-api-integrations/API-ENDPOINTS.md), [PAGE-SPECIFICATIONS](05-ui-ux/PAGE-SPECIFICATIONS.md) |
| Analytics | 11 | M12, M13 | [MODULE-BOUNDARIES](03-architecture/MODULE-BOUNDARIES.md), [DATA-DICTIONARY](04-database/DATA-DICTIONARY.md), [API-ENDPOINTS](06-api-integrations/API-ENDPOINTS.md), [PAGE-SPECIFICATIONS](05-ui-ux/PAGE-SPECIFICATIONS.md) |
| Study plans | 14 | M05, M06, P2-06 | [MODULE-BOUNDARIES](03-architecture/MODULE-BOUNDARIES.md), [DATA-DICTIONARY](04-database/DATA-DICTIONARY.md), [API-ENDPOINTS](06-api-integrations/API-ENDPOINTS.md), [PAGE-SPECIFICATIONS](05-ui-ux/PAGE-SPECIFICATIONS.md) |
| Study sessions | 10 | M06, M07, M11 | [MODULE-BOUNDARIES](03-architecture/MODULE-BOUNDARIES.md), [DATA-DICTIONARY](04-database/DATA-DICTIONARY.md), [API-ENDPOINTS](06-api-integrations/API-ENDPOINTS.md), [PAGE-SPECIFICATIONS](05-ui-ux/PAGE-SPECIFICATIONS.md) |
| Timer | 15 | M07, P2-07 | [MODULE-BOUNDARIES](03-architecture/MODULE-BOUNDARIES.md), [DATA-DICTIONARY](04-database/DATA-DICTIONARY.md), [API-ENDPOINTS](06-api-integrations/API-ENDPOINTS.md), [PAGE-SPECIFICATIONS](05-ui-ux/PAGE-SPECIFICATIONS.md) |
| Calendar | 3 | M06, M09 | [MODULE-BOUNDARIES](03-architecture/MODULE-BOUNDARIES.md), [DATA-DICTIONARY](04-database/DATA-DICTIONARY.md), [API-ENDPOINTS](06-api-integrations/API-ENDPOINTS.md), [PAGE-SPECIFICATIONS](05-ui-ux/PAGE-SPECIFICATIONS.md) |
| Goals | 5 | M08 | [MODULE-BOUNDARIES](03-architecture/MODULE-BOUNDARIES.md), [DATA-DICTIONARY](04-database/DATA-DICTIONARY.md), [API-ENDPOINTS](06-api-integrations/API-ENDPOINTS.md), [PAGE-SPECIFICATIONS](05-ui-ux/PAGE-SPECIFICATIONS.md) |
| Tasks | 7 | M10 | [MODULE-BOUNDARIES](03-architecture/MODULE-BOUNDARIES.md), [DATA-DICTIONARY](04-database/DATA-DICTIONARY.md), [API-ENDPOINTS](06-api-integrations/API-ENDPOINTS.md), [PAGE-SPECIFICATIONS](05-ui-ux/PAGE-SPECIFICATIONS.md) |
| Notes | 5 | M11 | [MODULE-BOUNDARIES](03-architecture/MODULE-BOUNDARIES.md), [DATA-DICTIONARY](04-database/DATA-DICTIONARY.md), [API-ENDPOINTS](06-api-integrations/API-ENDPOINTS.md), [PAGE-SPECIFICATIONS](05-ui-ux/PAGE-SPECIFICATIONS.md) |
| Flashcards | 6 | P2-04 | [MODULE-BOUNDARIES](03-architecture/MODULE-BOUNDARIES.md), [DATA-DICTIONARY](04-database/DATA-DICTIONARY.md), [API-ENDPOINTS](06-api-integrations/API-ENDPOINTS.md), [PAGE-SPECIFICATIONS](05-ui-ux/PAGE-SPECIFICATIONS.md) |
| Exams | 9 | M04, P2-05 | [MODULE-BOUNDARIES](03-architecture/MODULE-BOUNDARIES.md), [DATA-DICTIONARY](04-database/DATA-DICTIONARY.md), [API-ENDPOINTS](06-api-integrations/API-ENDPOINTS.md), [PAGE-SPECIFICATIONS](05-ui-ux/PAGE-SPECIFICATIONS.md) |
| Notifications | 6 | P2-01, P3-02 | [MODULE-BOUNDARIES](03-architecture/MODULE-BOUNDARIES.md), [DATA-DICTIONARY](04-database/DATA-DICTIONARY.md), [API-ENDPOINTS](06-api-integrations/API-ENDPOINTS.md), [PAGE-SPECIFICATIONS](05-ui-ux/PAGE-SPECIFICATIONS.md) |
| Gamification | 13 | P2-02, P2-03 | [MODULE-BOUNDARIES](03-architecture/MODULE-BOUNDARIES.md), [DATA-DICTIONARY](04-database/DATA-DICTIONARY.md), [API-ENDPOINTS](06-api-integrations/API-ENDPOINTS.md), [PAGE-SPECIFICATIONS](05-ui-ux/PAGE-SPECIFICATIONS.md) |
| AI scheduling | 9 | P3-01 | [MODULE-BOUNDARIES](03-architecture/MODULE-BOUNDARIES.md), [DATA-DICTIONARY](04-database/DATA-DICTIONARY.md), [API-ENDPOINTS](06-api-integrations/API-ENDPOINTS.md), [PAGE-SPECIFICATIONS](05-ui-ux/PAGE-SPECIFICATIONS.md) |
| Study groups | 12 | P3-02 | [MODULE-BOUNDARIES](03-architecture/MODULE-BOUNDARIES.md), [DATA-DICTIONARY](04-database/DATA-DICTIONARY.md), [API-ENDPOINTS](06-api-integrations/API-ENDPOINTS.md), [PAGE-SPECIFICATIONS](05-ui-ux/PAGE-SPECIFICATIONS.md) |
| API integrations | 7 | P3-03 | [MODULE-BOUNDARIES](03-architecture/MODULE-BOUNDARIES.md), [DATA-DICTIONARY](04-database/DATA-DICTIONARY.md), [API-ENDPOINTS](06-api-integrations/API-ENDPOINTS.md), [PAGE-SPECIFICATIONS](05-ui-ux/PAGE-SPECIFICATIONS.md) |

## Matrix

### Authentication

Tables: users, auth_accounts, auth_sessions, auth_verifications, auth_audit_events

| FR | Requirement | Priority / Phase | Endpoints or mechanism | Pages | Milestone | AC | Planned TC |
|---|---|---|---|---|---|---|---|
| FR-001 | Register with email and password | Must / MVP | AUTH-01 | PU-1, PU-2, PU-6, A-1 | M02 | AC-FR-001-1..3 | TC-FR-001-1..3 |
| FR-002 | Log in with email and password | Must / MVP | AUTH-02 | PU-1, PU-3, C-5 | M02 | AC-FR-002-1..4 | TC-FR-002-1..4 |
| FR-003 | Sign in with Google | Must / MVP | AUTH-03 | PU-2, PU-6 | M02 | AC-FR-003-1..3 | TC-FR-003-1..3 |
| FR-004 | Log out | Must / MVP | AUTH-04 | PU-2, PU-3, PU-5 | M02 | AC-FR-004-1..3 | TC-FR-004-1..3 |
| FR-005 | Reset a forgotten password | Must / MVP | AUTH-05, AUTH-06 | PU-3, PU-4, PU-5 | M02 | AC-FR-005-1..3 | TC-FR-005-1..3 |
| FR-008 | View and revoke active sign-ins | Should / MVP | AUTH-07, AUTH-08, AUTH-09 | A-15 | M02 | AC-FR-008-1..3 | TC-FR-008-1..3 |

### User profile

Tables: user_profiles, data_exports, account_deletion_log

| FR | Requirement | Priority / Phase | Endpoints or mechanism | Pages | Milestone | AC | Planned TC |
|---|---|---|---|---|---|---|---|
| FR-006 | Edit profile display name and timezone | Must / MVP | PROF-01, PROF-02 | A-15 | M02 | AC-FR-006-1..4 | TC-FR-006-1..4 |
| FR-007 | Delete account with 30-day purge | Must / MVP | PROF-04 | A-15 | M14 | AC-FR-007-1..4 | TC-FR-007-1..4 |
| FR-009 | Configure day rollover hour | Should / MVP | PROF-01, PROF-02 | A-15 | M02 | AC-FR-009-1..4 | TC-FR-009-1..4 |
| FR-130 | Export data as CSV | Should / MVP | PROF-05, PROF-08 | A-15 | M14 | AC-FR-130-1..4 | TC-FR-130-1..4 |
| FR-131 | Export data as JSON | Should / MVP | PROF-05, PROF-08 | A-15 | M14 | AC-FR-131-1..4 | TC-FR-131-1..4 |
| FR-132 | Export progress and failure handling | Should / MVP | PROF-05, PROF-06, PROF-07, PROF-08 | A-15 | M14 | AC-FR-132-1..4 | TC-FR-132-1..4 |
| FR-134 | Onboarding wizard | Should / MVP | PROF-01, PROF-03 | A-1, A-15 | M02 (+M13) | AC-FR-134-1..4 | TC-FR-134-1..4 |
| FR-135 | Skip onboarding steps | Should / MVP | PROF-03 | A-1, A-15 | M02 (+M13) | AC-FR-135-1..4 | TC-FR-135-1..4 |
| FR-136 | Guided first session | Should / MVP | composition: PROF-03 plus TIM-02 and TIM-05 | A-1 | M13 | AC-FR-136-1..4 | TC-FR-136-1..4 |
| FR-137 | Choose primary goal in onboarding | Should / MVP | PROF-01, PROF-02, PROF-03 | A-1 | M02 (+M13) | AC-FR-137-1..4 | TC-FR-137-1..4 |
| FR-138 | Light, dark and system theme | Should / MVP | PROF-01, PROF-02 | A-15 | M02 | AC-FR-138-1..4 | TC-FR-138-1..4 |
| FR-139 | Responsive layout | Should / MVP | client only: No data contract | App shell | M01 | AC-FR-139-1..4 | TC-FR-139-1..4 |

### Subjects

Tables: subjects

| FR | Requirement | Priority / Phase | Endpoints or mechanism | Pages | Milestone | AC | Planned TC |
|---|---|---|---|---|---|---|---|
| FR-010 | Create a subject | Must / MVP | SUBJ-01, SUBJ-02, SUBJ-03 | A-1, A-7, A-8 | M03 | AC-FR-010-1..4 | TC-FR-010-1..4 |
| FR-011 | Edit subject name and color | Must / MVP | SUBJ-04 | A-7, A-8 | M03 | AC-FR-011-1..3 | TC-FR-011-1..3 |
| FR-012 | Reorder subjects | Should / MVP | SUBJ-05 | A-7, A-8 | M03 | AC-FR-012-1..3 | TC-FR-012-1..3 |
| FR-013 | Archive (soft-delete) a subject | Must / MVP | SUBJ-06 | A-7, A-8 | M03 | AC-FR-013-1..3 | TC-FR-013-1..3 |
| FR-014 | Restore an archived subject | Must / MVP | SUBJ-07 | A-7, A-8 | M03 | AC-FR-014-1..3 | TC-FR-014-1..3 |

### Topics

Tables: topics

| FR | Requirement | Priority / Phase | Endpoints or mechanism | Pages | Milestone | AC | Planned TC |
|---|---|---|---|---|---|---|---|
| FR-015 | Create a topic with optional weight | Must / MVP | TOP-01, TOP-02, TOP-04 | A-7, A-8 | M03 | AC-FR-015-1..3 | TC-FR-015-1..3 |
| FR-016 | Edit and reorder topics | Must / MVP | TOP-05, TOP-06 | A-7, A-8 | M03 | AC-FR-016-1..3 | TC-FR-016-1..3 |
| FR-017 | Bulk paste a topic list | Should / MVP | TOP-03 | A-8, A-7 | M03 | AC-FR-017-1..3 | TC-FR-017-1..3 |
| FR-018 | Archive and restore a topic | Must / MVP | TOP-07, TOP-08 | A-8, A-7 | M03 | AC-FR-018-1..3 | TC-FR-018-1..3 |
| FR-019 | Set topic status | Must / MVP | TOP-05 | A-8, A-7 | M03 | AC-FR-019-1..3 | TC-FR-019-1..3 |

### Dashboard (composition)

Tables: none (reads goals, timer, plans, todos, analytics)

| FR | Requirement | Priority / Phase | Endpoints or mechanism | Pages | Milestone | AC | Planned TC |
|---|---|---|---|---|---|---|---|
| FR-020 | Dashboard today's progress against goal | Should / MVP | server component: Dashboard page; client refresh via GOAL-05 | A-2 | M13 | AC-FR-020-1..3 | TC-FR-020-1..3 |
| FR-021 | Dashboard running timer card | Should / MVP | server component: Dashboard page; client refresh via TIM-01 | A-2 | M13 | AC-FR-021-1..3 | TC-FR-021-1..3 |
| FR-022 | Dashboard next three planned entries | Should / MVP | server component: Dashboard page; client refresh via PLAN-01 | A-2 | M13 | AC-FR-022-1..3 | TC-FR-022-1..3 |
| FR-023 | Dashboard due and overdue to-dos | Should / MVP | server component: Dashboard page; client refresh via TODO-01 | A-2 | M13 | AC-FR-023-1..3 | TC-FR-023-1..3 |

### Analytics

Tables: none (reads study_sessions, study_session_days, topics)

| FR | Requirement | Priority / Phase | Endpoints or mechanism | Pages | Milestone | AC | Planned TC |
|---|---|---|---|---|---|---|---|
| FR-024 | Dashboard seven-day minutes by subject | Should / MVP | server component: Dashboard page; client refresh via STAT-04 | A-2 | M13 | AC-FR-024-1..3 | TC-FR-024-1..3 |
| FR-080 | Daily study totals | Must / MVP | STAT-01 | A-14 | M12 | AC-FR-080-1..4 | TC-FR-080-1..4 |
| FR-081 | Weekly study totals | Must / MVP | STAT-02 | A-14 | M12 | AC-FR-081-1..4 | TC-FR-081-1..4 |
| FR-082 | Monthly study totals | Must / MVP | STAT-03 | A-14 | M12 | AC-FR-082-1..4 | TC-FR-082-1..4 |
| FR-083 | Study totals by subject | Must / MVP | STAT-04 | A-14 | M12 | AC-FR-083-1..4 | TC-FR-083-1..4 |
| FR-084 | Goal-hit rate | Must / MVP | STAT-05 | A-14 | M12 | AC-FR-084-1..4 | TC-FR-084-1..4 |
| FR-085 | Planned versus actual statistics | Must / MVP | STAT-06 | A-14 | M12 | AC-FR-085-1..4 | TC-FR-085-1..4 |
| FR-086 | Date ranges up to 24 months | Must / MVP | STAT-01 to STAT-06 (`invalid_date_range`) | A-14 | M12 | AC-FR-086-1..4 | TC-FR-086-1..4 |
| FR-087 | Statistics empty state | Must / MVP | STAT-01 to STAT-06 (zero-filled or `noData`) | A-14 | M12 | AC-FR-087-1..4 | TC-FR-087-1..4 |
| FR-088 | Show manual entries distinctly in statistics | Must / MVP | STAT-01 | A-4, A-14 | M12 | AC-FR-088-1..4 | TC-FR-088-1..4 |
| FR-089 | Correct day buckets across timezone and DST | Must / MVP | STAT-01 to STAT-06 (frozen `localDate`) | A-14 | M12 | AC-FR-089-1..4 | TC-FR-089-1..4 |

### Study plans

Tables: plan_entries

| FR | Requirement | Priority / Phase | Endpoints or mechanism | Pages | Milestone | AC | Planned TC |
|---|---|---|---|---|---|---|---|
| FR-030 | Create a plan entry | Should / MVP | PLAN-02 | A-6 | M05 | AC-FR-030-1..4 | TC-FR-030-1..4 |
| FR-031 | Edit an upcoming plan entry | Should / MVP | PLAN-04 | A-6, B-1 | M05 | AC-FR-031-1..3 | TC-FR-031-1..3 |
| FR-032 | Delete a plan entry | Should / MVP | PLAN-05 | A-6 | M05 | AC-FR-032-1..3 | TC-FR-032-1..3 |
| FR-033 | Mark a past plan entry as missed | Should / MVP | PLAN-06 | A-6 | M05 | AC-FR-033-1..3 | TC-FR-033-1..3 |
| FR-034 | Overlap warning and confirmation for plan entries | Should / MVP | PLAN-02, PLAN-04 (`confirmedWarnings`) | A-6 | M05 | AC-FR-034-1..4 | TC-FR-034-1..4 |
| FR-035 | Past plan entries are read-only | Should / MVP | PLAN-04 (`past_entry_read_only`) | A-6 | M05 | AC-FR-035-1..3 | TC-FR-035-1..3 |
| FR-036 | Planned versus actual display | Should / MVP | PLAN-01, PLAN-03 | A-6 | M05 (+M06) | AC-FR-036-1..3 | TC-FR-036-1..3 |
| FR-037 | List and filter plan entries | Should / MVP | PLAN-01 | A-6 | M05 | AC-FR-037-1..3 | TC-FR-037-1..3 |
| FR-038 | Warn when planning after an exam date | Should / MVP | PLAN-02, PLAN-04 | A-6, A-12, A-13, A-2 | M05 | AC-FR-038-1..3 | TC-FR-038-1..3 |
| FR-065 | Create a plan entry by dragging | Could / 2 | PLAN-02 | B-1, A-7 | P2-06 | AC-FR-065-1..4 | TC-FR-065-1..4 |
| FR-066 | Move a plan entry by dragging | Could / 2 | PLAN-04 | B-1, A-7 | P2-06 | AC-FR-066-1..4 | TC-FR-066-1..4 |
| FR-067 | Resize a plan entry on the 15-minute grid | Could / 2 | PLAN-04 | B-1, A-7 | P2-06 | AC-FR-067-1..4 | TC-FR-067-1..4 |
| FR-068 | Keyboard alternative for calendar planning | Could / 2 | PLAN-02, PLAN-04 | B-1, A-7 | P2-06 | AC-FR-068-1..4 | TC-FR-068-1..4 |
| FR-069 | Overlap confirmation on drag-and-drop | Could / 2 | PLAN-04 (`confirmedWarnings`) | B-1, A-7 | P2-06 | AC-FR-069-1..4 | TC-FR-069-1..4 |

### Study sessions

Tables: study_sessions, study_session_days

| FR | Requirement | Priority / Phase | Endpoints or mechanism | Pages | Milestone | AC | Planned TC |
|---|---|---|---|---|---|---|---|
| FR-040 | Save a timer session when it stops | Must / MVP | TIM-05 | A-3, A-4 | M07 | AC-FR-040-1..3 | TC-FR-040-1..3 |
| FR-041 | Link a session to subject, topic and plan entry | Must / MVP | TIM-02, SESS-03, SESS-04 | A-3, A-4 | M06 (+M07) | AC-FR-041-1..3 | TC-FR-041-1..3 |
| FR-042 | Add a manual session entry | Must / MVP | SESS-03 | A-4 | M06 | AC-FR-042-1..4 | TC-FR-042-1..4 |
| FR-043 | Edit a session | Must / MVP | SESS-02, SESS-04 | A-4 | M06 | AC-FR-043-1..3 | TC-FR-043-1..3 |
| FR-044 | Delete a session | Must / MVP | SESS-05 | A-4 | M06 | AC-FR-044-1..3 | TC-FR-044-1..3 |
| FR-045 | Discard sessions shorter than one minute | Must / MVP | TIM-05 (`outcome: discarded`) | A-4 | M07 | AC-FR-045-1..3 | TC-FR-045-1..3 |
| FR-046 | Auto-close an idle session | Must / MVP | job: Idle-session auto-close job; late stop returns `session_already_closed` on TIM-05 | A-4 | M07 | AC-FR-046-1..3 | TC-FR-046-1..3 |
| FR-047 | Split a session at the day boundary | Must / MVP | SESS-02 (`dayAllocations`), computed on write by SESS-03, SESS-04, TIM-05 | A-4 | M06 | AC-FR-047-1..3 | TC-FR-047-1..3 |
| FR-048 | Idempotent session save | Must / MVP | SESS-03, TIM-05 (`Idempotency-Key`) | A-4 | M06 | AC-FR-048-1..3 | TC-FR-048-1..3 |
| FR-049 | Post-session topic status and note prompt | Should / MVP | composition: TIM-05 result, then TOP-05 and NOTE-02 | A-3, A-4 | M07 (+M11) | AC-FR-049-1..3 | TC-FR-049-1..3 |

### Timer

Tables: timer_runs, timer_run_segments, timer_settings

| FR | Requirement | Priority / Phase | Endpoints or mechanism | Pages | Milestone | AC | Planned TC |
|---|---|---|---|---|---|---|---|
| FR-050 | Start a Pomodoro timer | Must / MVP | TIM-02 | A-3 | M07 | AC-FR-050-1..4 | TC-FR-050-1..4 |
| FR-051 | Start a stopwatch | Must / MVP | TIM-02, TIM-05 | A-3 | M07 | AC-FR-051-1..4 | TC-FR-051-1..4 |
| FR-052 | Pause and resume a timer | Must / MVP | TIM-03, TIM-04, TIM-06 | A-3 | M07 | AC-FR-052-1..4 | TC-FR-052-1..4 |
| FR-053 | Allow only one running timer | Must / MVP | TIM-02 | A-2, A-3 | M07 | AC-FR-053-1..4 | TC-FR-053-1..4 |
| FR-054 | Recover a running timer after refresh or network loss | Must / MVP | TIM-01 | A-3 | M07 | AC-FR-054-1..4 | TC-FR-054-1..4 |
| FR-055 | Interval-end notification | Must / MVP | client only: Browser notification from `phaseEndsAt` | A-3 | M07 | AC-FR-055-1..4 | TC-FR-055-1..4 |
| FR-056 | Tab title countdown | Should / MVP | client only: Derived from TIM-01 state | A-3 | M07 | AC-FR-056-1..4 | TC-FR-056-1..4 |
| FR-057 | Configure timer durations | Must / MVP | TIM-07, TIM-08 | A-3, A-15 | M07 | AC-FR-057-1..4 | TC-FR-057-1..4 |
| FR-058 | Stop a Pomodoro and classify the result | Must / MVP | TIM-05 | A-3 | M07 | AC-FR-058-1..4 | TC-FR-058-1..4 |
| FR-059 | Converge timer state across devices | Must / MVP | TIM-01 | A-3 | M07 | AC-FR-059-1..4 | TC-FR-059-1..4 |
| FR-180 | Choose an ambient loop | Could / 2 | TIM-07, TIM-08 (`audioLoop`) | A-3 | P2-07 | AC-FR-180-1..3 | TC-FR-180-1..3 |
| FR-181 | Ambient volume | Could / 2 | TIM-07, TIM-08 (`audioVolume`) | A-3 | P2-07 | AC-FR-181-1..3 | TC-FR-181-1..3 |
| FR-182 | Play audio only while a session runs | Could / 2 | client only: Derived from TIM-01 state | A-3 | P2-07 | AC-FR-182-1..3 | TC-FR-182-1..3 |
| FR-183 | Remember last audio choice | Could / 2 | TIM-08 | A-3 | P2-07 | AC-FR-183-1..3 | TC-FR-183-1..3 |
| FR-184 | Mute audio on pause | Could / 2 | client only: Derived from TIM-01 state | A-3 | P2-07 | AC-FR-184-1..3 | TC-FR-184-1..3 |

### Calendar

Tables: none (reads study_sessions, plan_entries)

| FR | Requirement | Priority / Phase | Endpoints or mechanism | Pages | Milestone | AC | Planned TC |
|---|---|---|---|---|---|---|---|
| FR-060 | Month heatmap of study minutes | Should / MVP | CAL-01 | A-5 | M09 | AC-FR-060-1..4 | TC-FR-060-1..4 |
| FR-061 | Calendar day detail | Should / MVP | CAL-02, SESS-01 | A-5 | M06 (+M09) | AC-FR-061-1..4 | TC-FR-061-1..4 |
| FR-062 | Planned entries on the calendar | Should / MVP | CAL-02, PLAN-01 | A-5 | M09 | AC-FR-062-1..4 | TC-FR-062-1..4 |

### Goals

Tables: daily_goal_history, subject_goals

| FR | Requirement | Priority / Phase | Endpoints or mechanism | Pages | Milestone | AC | Planned TC |
|---|---|---|---|---|---|---|---|
| FR-070 | Set the daily goal | Must / MVP | GOAL-01, GOAL-02 | A-1, A-15 | M08 | AC-FR-070-1..4 | TC-FR-070-1..4 |
| FR-071 | Set per-subject daily goals | Should / MVP | GOAL-01, GOAL-03, GOAL-04 | A-8 | M08 | AC-FR-071-1..4 | TC-FR-071-1..4 |
| FR-072 | Show daily goal progress | Must / MVP | GOAL-05 | A-2, A-5 | M08 | AC-FR-072-1..4 | TC-FR-072-1..4 |
| FR-073 | Show goal-met state | Must / MVP | GOAL-05 | A-2 | M08 | AC-FR-073-1..4 | TC-FR-073-1..4 |
| FR-074 | Apply goal changes from today forward | Must / MVP | GOAL-01, GOAL-02 | A-2, A-15 | M08 | AC-FR-074-1..4 | TC-FR-074-1..4 |

### Tasks

Tables: todos

| FR | Requirement | Priority / Phase | Endpoints or mechanism | Pages | Milestone | AC | Planned TC |
|---|---|---|---|---|---|---|---|
| FR-090 | Create a to-do | Must / MVP | TODO-02 | A-9 | M10 | AC-FR-090-1..4 | TC-FR-090-1..4 |
| FR-091 | Edit a to-do | Must / MVP | TODO-03, TODO-04 | A-9 | M10 | AC-FR-091-1..4 | TC-FR-091-1..4 |
| FR-092 | Delete a to-do | Must / MVP | TODO-06 | A-9 | M10 | AC-FR-092-1..4 | TC-FR-092-1..4 |
| FR-093 | Mark a to-do done or undone | Must / MVP | TODO-05 | A-9 | M10 | AC-FR-093-1..4 | TC-FR-093-1..4 |
| FR-094 | Filter to-dos | Must / MVP | TODO-01 | A-9 | M10 | AC-FR-094-1..4 | TC-FR-094-1..4 |
| FR-095 | Sort to-dos by priority then due date | Must / MVP | TODO-01 | A-9 | M10 | AC-FR-095-1..4 | TC-FR-095-1..4 |
| FR-096 | Assign to-do priority | Must / MVP | TODO-02 | A-9 | M10 | AC-FR-096-1..4 | TC-FR-096-1..4 |

### Notes

Tables: notes

| FR | Requirement | Priority / Phase | Endpoints or mechanism | Pages | Milestone | AC | Planned TC |
|---|---|---|---|---|---|---|---|
| FR-100 | Create and edit a markdown note | Should / MVP | NOTE-01, NOTE-02, NOTE-03, NOTE-04 | A-10, A-11 | M11 | AC-FR-100-1..4 | TC-FR-100-1..4 |
| FR-101 | Render notes with sanitization | Should / MVP | NOTE-05 | A-8, A-10, A-11 | M11 | AC-FR-101-1..4 | TC-FR-101-1..4 |
| FR-102 | Autosave notes | Should / MVP | NOTE-04 | A-11 | M11 | AC-FR-102-1..4 | TC-FR-102-1..4 |
| FR-103 | Resolve note version conflicts | Should / MVP | NOTE-02, NOTE-04 (`stale_version`) | A-11 | M11 | AC-FR-103-1..4 | TC-FR-103-1..4 |
| FR-104 | Delete a note | Should / MVP | NOTE-06 | A-10, A-11 | M11 | AC-FR-104-1..4 | TC-FR-104-1..4 |

### Flashcards

Tables: flashcards, card_reviews, flashcard_settings

| FR | Requirement | Priority / Phase | Endpoints or mechanism | Pages | Milestone | AC | Planned TC |
|---|---|---|---|---|---|---|---|
| FR-107 | Create a flashcard | Could / 2 | FLASH-01, FLASH-02 | B-2, B-3 | P2-04 | AC-FR-107-1..4 | TC-FR-107-1..4 |
| FR-108 | Edit and delete a flashcard | Could / 2 | FLASH-03, FLASH-04 | B-2, B-3 | P2-04 | AC-FR-108-1..4 | TC-FR-108-1..4 |
| FR-109 | Daily review queue | Could / 2 | FLASH-05 | B-2, B-3 | P2-04 | AC-FR-109-1..4 | TC-FR-109-1..4 |
| FR-110 | Rate a reviewed flashcard | Could / 2 | FLASH-06 | B-2, B-3 | P2-04 | AC-FR-110-1..4 | TC-FR-110-1..4 |
| FR-111 | Daily review limit | Could / 2 | FLASH-05, FLASH-07, FLASH-08 | B-2, B-3 | P2-04 | AC-FR-111-1..4 | TC-FR-111-1..4 |
| FR-112 | Spaced-repetition scheduling | Could / 2 | FLASH-06 | B-2, B-3 | P2-04 | AC-FR-112-1..4 | TC-FR-112-1..4 |

### Exams

Tables: exams, exam_topics

| FR | Requirement | Priority / Phase | Endpoints or mechanism | Pages | Milestone | AC | Planned TC |
|---|---|---|---|---|---|---|---|
| FR-120 | Create an exam | Should / MVP | EXAM-02 | A-12, A-13 | M04 | AC-FR-120-1..4 | TC-FR-120-1..4 |
| FR-121 | Edit an exam | Should / MVP | EXAM-04 | A-12, A-13 | M04 | AC-FR-121-1..4 | TC-FR-121-1..4 |
| FR-122 | Exam topic checklist | Should / MVP | EXAM-03, EXAM-05, EXAM-06 | A-13, A-12 | M04 | AC-FR-122-1..4 | TC-FR-122-1..4 |
| FR-123 | Exam countdown | Should / MVP | EXAM-01, EXAM-03 | A-2, A-12, A-13 | M04 | AC-FR-123-1..4 | TC-FR-123-1..4 |
| FR-124 | Archive exams after the exam date | Should / MVP | job: Exam auto-archive job; result visible in EXAM-01 `state=archived` | A-12, A-13 | M04 | AC-FR-124-1..4 | TC-FR-124-1..4 |
| FR-125 | View archived exams | Should / MVP | EXAM-01 | A-12, A-13 | M04 | AC-FR-125-1..4 | TC-FR-125-1..4 |
| FR-126 | Exam readiness score | Could / 2 | EXAM-03 | A-13 | P2-05 | AC-FR-126-1..4 | TC-FR-126-1..4 |
| FR-127 | Weighted topics in readiness | Could / 2 | EXAM-06 | A-13 | P2-05 | AC-FR-127-1..4 | TC-FR-127-1..4 |
| FR-128 | Label readiness as topic coverage | Could / 2 | EXAM-03 | A-13 | P2-05 | AC-FR-128-1..4 | TC-FR-128-1..4 |

### Notifications

Tables: notification_preferences, notifications, push_subscriptions

| FR | Requirement | Priority / Phase | Endpoints or mechanism | Pages | Milestone | AC | Planned TC |
|---|---|---|---|---|---|---|---|
| FR-150 | Daily study reminder | Could / 2 | NOTIF-03, NOTIF-04; delivery by reminder job | B-4 | P2-01 | AC-FR-150-1..3 | TC-FR-150-1..3 |
| FR-151 | Plan entry reminder | Could / 2 | NOTIF-04; delivery by reminder job | B-4 | P2-01 | AC-FR-151-1..3 | TC-FR-151-1..3 |
| FR-152 | In-app notifications | Could / 2 | NOTIF-01, NOTIF-02 | B-4 | P2-01 | AC-FR-152-1..3 | TC-FR-152-1..3 |
| FR-153 | Browser push opt-in | Could / 2 | NOTIF-05, NOTIF-06, NOTIF-07; delivery by push job | B-4 | P2-01 | AC-FR-153-1..3 | TC-FR-153-1..3 |
| FR-154 | Reminder preferences | Could / 2 | NOTIF-03, NOTIF-04 | B-4 | P2-01 | AC-FR-154-1..3 | TC-FR-154-1..3 |
| FR-201 | Invite members to a group | Won't / 3 | GRP-07, GRP-08, GRP-09 | C-3, C-5 | P3-02 | AC-FR-201-1..4 | TC-FR-201-1..4 |

### Gamification

Tables: user_gamification, daily_evaluations, xp_ledger

| FR | Requirement | Priority / Phase | Endpoints or mechanism | Pages | Milestone | AC | Planned TC |
|---|---|---|---|---|---|---|---|
| FR-160 | Current streak | Could / 2 | job: Streak evaluation job; read through GAME-01 | A-2 | P2-02 | AC-FR-160-1..3 | TC-FR-160-1..3 |
| FR-161 | Streak reset after a missed day | Could / 2 | job: Streak evaluation job; read through GAME-01 | A-2 | P2-02 | AC-FR-161-1..3 | TC-FR-161-1..3 |
| FR-162 | Weekly streak freeze | Could / 2 | job: Streak evaluation job; `freezeAvailable` in GAME-01 | A-2 | P2-02 | AC-FR-162-1..3 | TC-FR-162-1..3 |
| FR-163 | Longest streak | Could / 2 | job: Streak evaluation job; read through GAME-01 | A-2 | P2-02 | AC-FR-163-1..3 | TC-FR-163-1..3 |
| FR-164 | Streak stability across timezone change | Could / 2 | job: Streak evaluation job; read through GAME-01 | A-2 | P2-02 | AC-FR-164-1..3 | TC-FR-164-1..3 |
| FR-170 | Award XP for focused minutes | Could / 2 | job: Event-driven XP award; total in GAME-01 | A-2 | P2-03 | AC-FR-170-1..3 | TC-FR-170-1..3 |
| FR-171 | Award XP for meeting the daily goal | Could / 2 | job: Event-driven XP award; total in GAME-01 | A-2 | P2-03 | AC-FR-171-1..3 | TC-FR-171-1..3 |
| FR-172 | Award XP for completed High-priority to-dos | Could / 2 | job: Event-driven XP award; total in GAME-01 | A-2 | P2-03 | AC-FR-172-1..3 | TC-FR-172-1..3 |
| FR-173 | Daily XP cap | Could / 2 | job: XP rule; total in GAME-01 | A-2 | P2-03 | AC-FR-173-1..3 | TC-FR-173-1..3 |
| FR-174 | XP exclusions | Could / 2 | job: XP rule; total in GAME-01 | A-2 | P2-03 | AC-FR-174-1..3 | TC-FR-174-1..3 |
| FR-175 | Levels | Could / 2 | job: Level computed from XP; `level` and `xpToNextLevel` in GAME-01 | A-2 | P2-03 | AC-FR-175-1..3 | TC-FR-175-1..3 |
| FR-176 | Idempotent XP ledger | Could / 2 | job: Ledger uniqueness; no endpoint writes it | A-2 | P2-03 | AC-FR-176-1..3 | TC-FR-176-1..3 |
| FR-177 | XP adjustment on session edit or delete | Could / 2 | job: Event-driven compensation; total in GAME-01 | A-2 | P2-03 | AC-FR-177-1..3 | TC-FR-177-1..3 |

### AI scheduling

Tables: ai_consents, ai_generation_requests

| FR | Requirement | Priority / Phase | Endpoints or mechanism | Pages | Milestone | AC | Planned TC |
|---|---|---|---|---|---|---|---|
| FR-190 | AI schedule inputs | Won't / 3 | AI-04 | C-1, C-6, C-2 | P3-01 | AC-FR-190-1..4 | TC-FR-190-1..4 |
| FR-191 | Request an AI schedule | Won't / 3 | AI-04, AI-05 | C-1, C-6, C-2 | P3-01 | AC-FR-191-1..4 | TC-FR-191-1..4 |
| FR-192 | Consent to share study data with the AI provider | Won't / 3 | AI-01, AI-02 | C-1, C-2, C-6 | P3-01 | AC-FR-192-1..4 | TC-FR-192-1..4 |
| FR-193 | Preview an AI schedule | Won't / 3 | AI-05 | C-2, C-1, C-6 | P3-01 | AC-FR-193-1..4 | TC-FR-193-1..4 |
| FR-194 | Validate AI-proposed entries | Won't / 3 | AI-05 (server-side validation result) | C-2, C-1, C-6 | P3-01 | AC-FR-194-1..4 | TC-FR-194-1..4 |
| FR-195 | Accept or discard an AI schedule | Won't / 3 | AI-06, AI-07 | C-2, C-1, C-6 | P3-01 | AC-FR-195-1..4 | TC-FR-195-1..4 |
| FR-196 | AI generation daily limit | Won't / 3 | AI-03, AI-04 | C-1, C-2, C-6 | P3-01 | AC-FR-196-1..4 | TC-FR-196-1..4 |
| FR-197 | AI provider failure handling | Won't / 3 | AI-05 | C-1, C-2, C-6 | P3-01 | AC-FR-197-1..4 | TC-FR-197-1..4 |
| FR-198 | AI schedule prerequisites | Won't / 3 | AI-04 | C-1, C-2, C-6 | P3-01 | AC-FR-198-1..4 | TC-FR-198-1..4 |

### Study groups

Tables: groups, group_members, group_invites, group_reports

| FR | Requirement | Priority / Phase | Endpoints or mechanism | Pages | Milestone | AC | Planned TC |
|---|---|---|---|---|---|---|---|
| FR-200 | Create a study group | Won't / 3 | GRP-01, GRP-02 | C-3 | P3-02 | AC-FR-200-1..3 | TC-FR-200-1..3 |
| FR-202 | Join a group | Won't / 3 | GRP-10 | C-5 | P3-02 | AC-FR-202-1..3 | TC-FR-202-1..3 |
| FR-203 | Leave a group | Won't / 3 | GRP-11 | C-4 | P3-02 | AC-FR-203-1..4 | TC-FR-203-1..4 |
| FR-204 | Remove a group member | Won't / 3 | GRP-12 | C-4 | P3-02 | AC-FR-204-1..4 | TC-FR-204-1..4 |
| FR-205 | Transfer group administration | Won't / 3 | GRP-13 | C-4 | P3-02 | AC-FR-205-1..4 | TC-FR-205-1..4 |
| FR-206 | Per-user sharing setting | Won't / 3 | GRP-14 | C-4 | P3-02 | AC-FR-206-1..4 | TC-FR-206-1..4 |
| FR-207 | Weekly leaderboard | Won't / 3 | GRP-15 | C-4 | P3-02 | AC-FR-207-1..4 | TC-FR-207-1..4 |
| FR-208 | Group size cap | Won't / 3 | GRP-10, GRP-15 (`group_full`) | C-4 | P3-02 | AC-FR-208-1..3 | TC-FR-208-1..3 |
| FR-209 | Report a group member | Won't / 3 | GRP-16 | C-3, C-4 | P3-02 | AC-FR-209-1..4 | TC-FR-209-1..4 |
| FR-210 | Dissolve a group | Won't / 3 | GRP-05 | C-4 | P3-02 | AC-FR-210-1..4 | TC-FR-210-1..4 |
| FR-211 | View group members | Won't / 3 | GRP-03, GRP-06 | C-4 | P3-02 | AC-FR-211-1..4 | TC-FR-211-1..4 |
| FR-212 | Rename a group | Won't / 3 | GRP-04 | C-4 | P3-02 | AC-FR-212-1..4 | TC-FR-212-1..4 |

### API integrations

Tables: api_keys

| FR | Requirement | Priority / Phase | Endpoints or mechanism | Pages | Milestone | AC | Planned TC |
|---|---|---|---|---|---|---|---|
| FR-220 | Create an API key | Won't / 3 | KEY-01, KEY-02 | C-7 | P3-03 | AC-FR-220-1..4 | TC-FR-220-1..4 |
| FR-221 | API key scopes | Won't / 3 | KEY-02; enforced on every PUB endpoint | C-7 | P3-03 | AC-FR-221-1..4 | TC-FR-221-1..4 |
| FR-222 | API rate limit | Won't / 3 | Every PUB endpoint (RL-PUBLIC) | C-7 | P3-03 | AC-FR-222-1..4 | TC-FR-222-1..4 |
| FR-223 | Versioned API | Won't / 3 | Every PUB endpoint (`/v1` prefix) | C-7 | P3-03 | AC-FR-223-1..4 | TC-FR-223-1..4 |
| FR-224 | JSON responses and pagination | Won't / 3 | Every PUB list endpoint | C-7 | P3-03 | AC-FR-224-1..4 | TC-FR-224-1..4 |
| FR-225 | Standard API error format | Won't / 3 | Every PUB endpoint (`PublicErrorEnvelope`) | C-7 | P3-03 | AC-FR-225-1..4 | TC-FR-225-1..4 |
| FR-226 | Revoke an API key | Won't / 3 | KEY-03 | C-7 | P3-03 | AC-FR-226-1..4 | TC-FR-226-1..4 |
