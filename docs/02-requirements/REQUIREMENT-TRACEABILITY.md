# Lumora Requirement Traceability

> Status: Proposal, pending approval. Source of truth: Phase 1 docs.

Planned test case IDs are named after the acceptance criterion they verify: `AC-FR-XXX-n` -> `TC-FR-XXX-n`; `AC-NFR-XXX` -> `TC-NFR-XXX`; `AC-E2E-nn` -> `TC-E2E-nn`. Ranges such as `1..3` expand to every number in the range. Test cases are planned only; no test code exists.

## (a) Product goal -> user need -> functional requirements

| PG | UN | FR list |
|---|---|---|
| PG-1 | UN-1 | FR-010..FR-014, FR-024, FR-040..FR-044, FR-048, FR-061, FR-080..FR-083, FR-086, FR-088 |
| PG-1 | UN-3 | FR-045, FR-046, FR-051..FR-054, FR-058, FR-059 |
| PG-1 | UN-4 | FR-015, FR-016, FR-018, FR-100, FR-102 |
| PG-2 | UN-1 | FR-041 |
| PG-2 | UN-8 | FR-022, FR-030..FR-037, FR-062, FR-065..FR-069, FR-085 |
| PG-3 | UN-2 | FR-006, FR-009, FR-020, FR-047, FR-070..FR-074, FR-084, FR-089 |
| PG-3 | UN-3 | FR-021, FR-050, FR-055..FR-057, FR-180..FR-184 |
| PG-3 | UN-6 | FR-060, FR-160..FR-164, FR-170..FR-177 |
| PG-3 | UN-9 | FR-023, FR-090..FR-096 |
| PG-4 | UN-4 | FR-015, FR-019 |
| PG-4 | UN-5 | FR-038, FR-120..FR-128 |
| PG-4 | UN-8 | FR-190, FR-191, FR-193..FR-198 |
| PG-5 | UN-4 | FR-049 |
| PG-5 | UN-6 | FR-150, FR-152..FR-154 |
| PG-5 | UN-7 | FR-200..FR-205, FR-207, FR-208, FR-210..FR-212 |
| PG-5 | UN-8 | FR-151 |
| PG-5 | UN-10 | FR-107..FR-112 |
| PG-5 | UN-12 | FR-001, FR-003, FR-017, FR-087, FR-134..FR-139 |
| PG-6 | UN-1 | FR-013, FR-014 |
| PG-6 | UN-4 | FR-101, FR-103, FR-104 |
| PG-6 | UN-5 | FR-128 |
| PG-6 | UN-7 | FR-206, FR-209 |
| PG-6 | UN-11 | FR-004, FR-005, FR-007, FR-008, FR-130..FR-132, FR-192, FR-220..FR-226 |
| PG-6 | UN-12 | FR-001, FR-002 |

## (b) Functional requirements

| FR | PG | UN | NFR(s) | AC IDs | Planned TC IDs | Phase | Priority |
|---|---|---|---|---|---|---|---|
| FR-001 Register with email and password | PG-5,PG-6 | UN-12 | NFR-010, NFR-011, NFR-030, NFR-035 | AC-FR-001-1..3 | TC-FR-001-1..3 | MVP | Must Have |
| FR-002 Log in with email and password | PG-6 | UN-12 | NFR-011, NFR-012, NFR-013 | AC-FR-002-1..4 | TC-FR-002-1..4 | MVP | Must Have |
| FR-003 Sign in with Google | PG-5 | UN-12 | NFR-010, NFR-013 | AC-FR-003-1..3 | TC-FR-003-1..3 | MVP | Must Have |
| FR-004 Log out | PG-6 | UN-11 | NFR-013 | AC-FR-004-1..3 | TC-FR-004-1..3 | MVP | Must Have |
| FR-005 Reset a forgotten password | PG-6 | UN-11 | NFR-011, NFR-012, NFR-020 | AC-FR-005-1..3 | TC-FR-005-1..3 | MVP | Must Have |
| FR-006 Edit profile display name and timezone | PG-3 | UN-2 | NFR-091 | AC-FR-006-1..4 | TC-FR-006-1..4 | MVP | Must Have |
| FR-007 Delete account with 30-day purge | PG-6 | UN-11 | NFR-031, NFR-104 | AC-FR-007-1..4 | TC-FR-007-1..4 | MVP | Must Have |
| FR-008 View and revoke active sign-ins | PG-6 | UN-11 | NFR-013, NFR-020 | AC-FR-008-1..3 | TC-FR-008-1..3 | MVP | Should Have |
| FR-009 Configure day rollover hour | PG-3 | UN-2 | NFR-091 | AC-FR-009-1..4 | TC-FR-009-1..4 | MVP | Should Have |
| FR-010 Create a subject | PG-1 | UN-1 | NFR-016 | AC-FR-010-1..4 | TC-FR-010-1..4 | MVP | Must Have |
| FR-011 Edit subject name and color | PG-1 | UN-1 | NFR-094 | AC-FR-011-1..3 | TC-FR-011-1..3 | MVP | Must Have |
| FR-012 Reorder subjects | PG-1 | UN-1 | NFR-041, NFR-042, NFR-094 | AC-FR-012-1..3 | TC-FR-012-1..3 | MVP | Should Have |
| FR-013 Archive (soft-delete) a subject | PG-1,PG-6 | UN-1 | NFR-093 | AC-FR-013-1..3 | TC-FR-013-1..3 | MVP | Must Have |
| FR-014 Restore an archived subject | PG-1,PG-6 | UN-1 | NFR-093 | AC-FR-014-1..3 | TC-FR-014-1..3 | MVP | Must Have |
| FR-015 Create a topic with optional weight | PG-1,PG-4 | UN-4 | NFR-016 | AC-FR-015-1..3 | TC-FR-015-1..3 | MVP | Must Have |
| FR-016 Edit and reorder topics | PG-1 | UN-4 | NFR-041, NFR-042, NFR-094 | AC-FR-016-1..3 | TC-FR-016-1..3 | MVP | Must Have |
| FR-017 Bulk paste a topic list | PG-5 | UN-12 | NFR-001 | AC-FR-017-1..3 | TC-FR-017-1..3 | MVP | Should Have |
| FR-018 Archive and restore a topic | PG-1 | UN-4 | NFR-093 | AC-FR-018-1..3 | TC-FR-018-1..3 | MVP | Must Have |
| FR-019 Set topic status | PG-4 | UN-4 | NFR-043, NFR-094 | AC-FR-019-1..3 | TC-FR-019-1..3 | MVP | Must Have |
| FR-020 Dashboard today's progress against goal | PG-3 | UN-2 | NFR-001 | AC-FR-020-1..3 | TC-FR-020-1..3 | MVP | Should Have |
| FR-021 Dashboard running timer card | PG-3 | UN-3 | NFR-004 | AC-FR-021-1..3 | TC-FR-021-1..3 | MVP | Should Have |
| FR-022 Dashboard next three planned entries | PG-2 | UN-8 | NFR-001 | AC-FR-022-1..3 | TC-FR-022-1..3 | MVP | Should Have |
| FR-023 Dashboard due and overdue to-dos | PG-3 | UN-9 | NFR-001 | AC-FR-023-1..3 | TC-FR-023-1..3 | MVP | Should Have |
| FR-024 Dashboard seven-day minutes by subject | PG-1 | UN-1 | NFR-001, NFR-043 | AC-FR-024-1..3 | TC-FR-024-1..3 | MVP | Should Have |
| FR-030 Create a plan entry | PG-2 | UN-8 | NFR-016 | AC-FR-030-1..4 | TC-FR-030-1..4 | MVP | Should Have |
| FR-031 Edit an upcoming plan entry | PG-2 | UN-8 | NFR-094 | AC-FR-031-1..3 | TC-FR-031-1..3 | MVP | Should Have |
| FR-032 Delete a plan entry | PG-2 | UN-8 | NFR-092 | AC-FR-032-1..3 | TC-FR-032-1..3 | MVP | Should Have |
| FR-033 Mark a past plan entry as missed | PG-2 | UN-8 | NFR-092 | AC-FR-033-1..3 | TC-FR-033-1..3 | MVP | Should Have |
| FR-034 Overlap warning and confirmation for plan entries | PG-2 | UN-8 | NFR-041 | AC-FR-034-1..4 | TC-FR-034-1..4 | MVP | Should Have |
| FR-035 Past plan entries are read-only | PG-2 | UN-8 | NFR-094 | AC-FR-035-1..3 | TC-FR-035-1..3 | MVP | Should Have |
| FR-036 Planned versus actual display | PG-2 | UN-8 | NFR-003 | AC-FR-036-1..3 | TC-FR-036-1..3 | MVP | Should Have |
| FR-037 List and filter plan entries | PG-2 | UN-8 | NFR-001 | AC-FR-037-1..3 | TC-FR-037-1..3 | MVP | Should Have |
| FR-038 Warn when planning after an exam date | PG-4 | UN-5 | NFR-041 | AC-FR-038-1..3 | TC-FR-038-1..3 | MVP | Should Have |
| FR-040 Save a timer session when it stops | PG-1 | UN-1 | NFR-051, NFR-090 | AC-FR-040-1..3 | TC-FR-040-1..3 | MVP | Must Have |
| FR-041 Link a session to subject, topic and plan entry | PG-1,PG-2 | UN-1 | NFR-092 | AC-FR-041-1..3 | TC-FR-041-1..3 | MVP | Must Have |
| FR-042 Add a manual session entry | PG-1 | UN-1 | NFR-090 | AC-FR-042-1..4 | TC-FR-042-1..4 | MVP | Must Have |
| FR-043 Edit a session | PG-1 | UN-1 | NFR-094, NFR-096 | AC-FR-043-1..3 | TC-FR-043-1..3 | MVP | Must Have |
| FR-044 Delete a session | PG-1 | UN-1 | NFR-096 | AC-FR-044-1..3 | TC-FR-044-1..3 | MVP | Must Have |
| FR-045 Discard sessions shorter than one minute | PG-1 | UN-3 | NFR-090 | AC-FR-045-1..3 | TC-FR-045-1..3 | MVP | Must Have |
| FR-046 Auto-close an idle session | PG-1 | UN-3 | NFR-051 | AC-FR-046-1..3 | TC-FR-046-1..3 | MVP | Must Have |
| FR-047 Split a session at the day boundary | PG-3 | UN-2 | NFR-091 | AC-FR-047-1..3 | TC-FR-047-1..3 | MVP | Must Have |
| FR-048 Idempotent session save | PG-1 | UN-1 | NFR-053 | AC-FR-048-1..3 | TC-FR-048-1..3 | MVP | Must Have |
| FR-049 Post-session topic status and note prompt | PG-5 | UN-4 | NFR-004 | AC-FR-049-1..3 | TC-FR-049-1..3 | MVP | Should Have |
| FR-050 Start a Pomodoro timer | PG-3 | UN-3 | NFR-004 | AC-FR-050-1..4 | TC-FR-050-1..4 | MVP | Must Have |
| FR-051 Start a stopwatch | PG-1 | UN-3 | NFR-004 | AC-FR-051-1..4 | TC-FR-051-1..4 | MVP | Must Have |
| FR-052 Pause and resume a timer | PG-1 | UN-3 | NFR-004, NFR-052 | AC-FR-052-1..4 | TC-FR-052-1..4 | MVP | Must Have |
| FR-053 Allow only one running timer | PG-1 | UN-3 | NFR-053 | AC-FR-053-1..4 | TC-FR-053-1..4 | MVP | Must Have |
| FR-054 Recover a running timer after refresh or network loss | PG-1 | UN-3 | NFR-051, NFR-052 | AC-FR-054-1..4 | TC-FR-054-1..4 | MVP | Must Have |
| FR-055 Interval-end notification | PG-3 | UN-3 | NFR-044 | AC-FR-055-1..4 | TC-FR-055-1..4 | MVP | Must Have |
| FR-056 Tab title countdown | PG-3 | UN-3 | NFR-044 | AC-FR-056-1..4 | TC-FR-056-1..4 | MVP | Should Have |
| FR-057 Configure timer durations | PG-3 | UN-3 | NFR-062 | AC-FR-057-1..4 | TC-FR-057-1..4 | MVP | Must Have |
| FR-058 Stop a Pomodoro and classify the result | PG-1 | UN-3 | NFR-090 | AC-FR-058-1..4 | TC-FR-058-1..4 | MVP | Must Have |
| FR-059 Converge timer state across devices | PG-1 | UN-3 | NFR-052 | AC-FR-059-1..4 | TC-FR-059-1..4 | MVP | Must Have |
| FR-060 Month heatmap of study minutes | PG-3 | UN-6 | NFR-003, NFR-043 | AC-FR-060-1..4 | TC-FR-060-1..4 | MVP | Should Have |
| FR-061 Calendar day detail | PG-1 | UN-1 | NFR-001 | AC-FR-061-1..4 | TC-FR-061-1..4 | MVP | Should Have |
| FR-062 Planned entries on the calendar | PG-2 | UN-8 | NFR-001 | AC-FR-062-1..4 | TC-FR-062-1..4 | MVP | Should Have |
| FR-065 Create a plan entry by dragging | PG-2 | UN-8 | NFR-087 | AC-FR-065-1..4 | TC-FR-065-1..4 | 2 | Could Have |
| FR-066 Move a plan entry by dragging | PG-2 | UN-8 | NFR-087 | AC-FR-066-1..4 | TC-FR-066-1..4 | 2 | Could Have |
| FR-067 Resize a plan entry on the 15-minute grid | PG-2 | UN-8 | NFR-087 | AC-FR-067-1..4 | TC-FR-067-1..4 | 2 | Could Have |
| FR-068 Keyboard alternative for calendar planning | PG-2 | UN-8 | NFR-041, NFR-042 | AC-FR-068-1..4 | TC-FR-068-1..4 | 2 | Could Have |
| FR-069 Overlap confirmation on drag-and-drop | PG-2 | UN-8 | NFR-041 | AC-FR-069-1..4 | TC-FR-069-1..4 | 2 | Could Have |
| FR-070 Set the daily goal | PG-3 | UN-2 | NFR-016, NFR-062 | AC-FR-070-1..4 | TC-FR-070-1..4 | MVP | Must Have |
| FR-071 Set per-subject daily goals | PG-3 | UN-2 | NFR-016 | AC-FR-071-1..4 | TC-FR-071-1..4 | MVP | Should Have |
| FR-072 Show daily goal progress | PG-3 | UN-2 | NFR-044, NFR-091 | AC-FR-072-1..4 | TC-FR-072-1..4 | MVP | Must Have |
| FR-073 Show goal-met state | PG-3 | UN-2 | NFR-043 | AC-FR-073-1..4 | TC-FR-073-1..4 | MVP | Must Have |
| FR-074 Apply goal changes from today forward | PG-3 | UN-2 | NFR-091 | AC-FR-074-1..4 | TC-FR-074-1..4 | MVP | Must Have |
| FR-080 Daily study totals | PG-1 | UN-1 | NFR-003, NFR-096 | AC-FR-080-1..4 | TC-FR-080-1..4 | MVP | Must Have |
| FR-081 Weekly study totals | PG-1 | UN-1 | NFR-003, NFR-096 | AC-FR-081-1..4 | TC-FR-081-1..4 | MVP | Must Have |
| FR-082 Monthly study totals | PG-1 | UN-1 | NFR-003, NFR-096 | AC-FR-082-1..4 | TC-FR-082-1..4 | MVP | Must Have |
| FR-083 Study totals by subject | PG-1 | UN-1 | NFR-003, NFR-096 | AC-FR-083-1..4 | TC-FR-083-1..4 | MVP | Must Have |
| FR-084 Goal-hit rate | PG-3 | UN-2 | NFR-003 | AC-FR-084-1..4 | TC-FR-084-1..4 | MVP | Must Have |
| FR-085 Planned versus actual statistics | PG-2 | UN-8 | NFR-003 | AC-FR-085-1..4 | TC-FR-085-1..4 | MVP | Must Have |
| FR-086 Date ranges up to 24 months | PG-1 | UN-1 | NFR-003, NFR-072 | AC-FR-086-1..4 | TC-FR-086-1..4 | MVP | Must Have |
| FR-087 Statistics empty state | PG-5 | UN-12 | NFR-044 | AC-FR-087-1..4 | TC-FR-087-1..4 | MVP | Must Have |
| FR-088 Show manual entries distinctly in statistics | PG-1 | UN-1 | NFR-096 | AC-FR-088-1..4 | TC-FR-088-1..4 | MVP | Must Have |
| FR-089 Correct day buckets across timezone and DST | PG-3 | UN-2 | NFR-091 | AC-FR-089-1..4 | TC-FR-089-1..4 | MVP | Must Have |
| FR-090 Create a to-do | PG-3 | UN-9 | NFR-016 | AC-FR-090-1..4 | TC-FR-090-1..4 | MVP | Must Have |
| FR-091 Edit a to-do | PG-3 | UN-9 | NFR-094 | AC-FR-091-1..4 | TC-FR-091-1..4 | MVP | Must Have |
| FR-092 Delete a to-do | PG-3 | UN-9 | NFR-092 | AC-FR-092-1..4 | TC-FR-092-1..4 | MVP | Must Have |
| FR-093 Mark a to-do done or undone | PG-3 | UN-9 | NFR-044, NFR-053 | AC-FR-093-1..4 | TC-FR-093-1..4 | MVP | Must Have |
| FR-094 Filter to-dos | PG-3 | UN-9 | NFR-001 | AC-FR-094-1..4 | TC-FR-094-1..4 | MVP | Must Have |
| FR-095 Sort to-dos by priority then due date | PG-3 | UN-9 | NFR-001, NFR-002 | AC-FR-095-1..4 | TC-FR-095-1..4 | MVP | Must Have |
| FR-096 Assign to-do priority | PG-3 | UN-9 | NFR-043 | AC-FR-096-1..4 | TC-FR-096-1..4 | MVP | Must Have |
| FR-100 Create and edit a markdown note | PG-1 | UN-4 | NFR-094 | AC-FR-100-1..4 | TC-FR-100-1..4 | MVP | Should Have |
| FR-101 Render notes with sanitization | PG-6 | UN-4 | NFR-014, NFR-015 | AC-FR-101-1..4 | TC-FR-101-1..4 | MVP | Should Have |
| FR-102 Autosave notes | PG-1 | UN-4 | NFR-054 | AC-FR-102-1..4 | TC-FR-102-1..4 | MVP | Should Have |
| FR-103 Resolve note version conflicts | PG-6 | UN-4 | NFR-094 | AC-FR-103-1..4 | TC-FR-103-1..4 | MVP | Should Have |
| FR-104 Delete a note | PG-6 | UN-4 | NFR-093 | AC-FR-104-1..4 | TC-FR-104-1..4 | MVP | Should Have |
| FR-107 Create a flashcard | PG-5 | UN-10 | NFR-016 | AC-FR-107-1..4 | TC-FR-107-1..4 | 2 | Could Have |
| FR-108 Edit and delete a flashcard | PG-5 | UN-10 | NFR-094 | AC-FR-108-1..4 | TC-FR-108-1..4 | 2 | Could Have |
| FR-109 Daily review queue | PG-5 | UN-10 | NFR-001 | AC-FR-109-1..4 | TC-FR-109-1..4 | 2 | Could Have |
| FR-110 Rate a reviewed flashcard | PG-5 | UN-10 | NFR-053 | AC-FR-110-1..4 | TC-FR-110-1..4 | 2 | Could Have |
| FR-111 Daily review limit | PG-5 | UN-10 | NFR-062 | AC-FR-111-1..4 | TC-FR-111-1..4 | 2 | Could Have |
| FR-112 Spaced-repetition scheduling | PG-5 | UN-10 | NFR-062 | AC-FR-112-1..4 | TC-FR-112-1..4 | 2 | Could Have |
| FR-120 Create an exam | PG-4 | UN-5 | NFR-016 | AC-FR-120-1..4 | TC-FR-120-1..4 | MVP | Should Have |
| FR-121 Edit an exam | PG-4 | UN-5 | NFR-094 | AC-FR-121-1..4 | TC-FR-121-1..4 | MVP | Should Have |
| FR-122 Exam topic checklist | PG-4 | UN-5 | NFR-094 | AC-FR-122-1..4 | TC-FR-122-1..4 | MVP | Should Have |
| FR-123 Exam countdown | PG-4 | UN-5 | NFR-001 | AC-FR-123-1..4 | TC-FR-123-1..4 | MVP | Should Have |
| FR-124 Archive exams after the exam date | PG-4 | UN-5 | NFR-093 | AC-FR-124-1..4 | TC-FR-124-1..4 | MVP | Should Have |
| FR-125 View archived exams | PG-4 | UN-5 | NFR-001 | AC-FR-125-1..4 | TC-FR-125-1..4 | MVP | Should Have |
| FR-126 Exam readiness score | PG-4 | UN-5 | NFR-003 | AC-FR-126-1..4 | TC-FR-126-1..4 | 2 | Could Have |
| FR-127 Weighted topics in readiness | PG-4 | UN-5 | NFR-003 | AC-FR-127-1..4 | TC-FR-127-1..4 | 2 | Could Have |
| FR-128 Label readiness as topic coverage | PG-4,PG-6 | UN-5 | NFR-044 | AC-FR-128-1..4 | TC-FR-128-1..4 | 2 | Could Have |
| FR-130 Export data as CSV | PG-6 | UN-11 | NFR-005, NFR-032 | AC-FR-130-1..4 | TC-FR-130-1..4 | MVP | Should Have |
| FR-131 Export data as JSON | PG-6 | UN-11 | NFR-005, NFR-032 | AC-FR-131-1..4 | TC-FR-131-1..4 | MVP | Should Have |
| FR-132 Export progress and failure handling | PG-6 | UN-11 | NFR-005, NFR-054 | AC-FR-132-1..4 | TC-FR-132-1..4 | MVP | Should Have |
| FR-134 Onboarding wizard | PG-5 | UN-12 | NFR-001 | AC-FR-134-1..4 | TC-FR-134-1..4 | MVP | Should Have |
| FR-135 Skip onboarding steps | PG-5 | UN-12 | NFR-041 | AC-FR-135-1..4 | TC-FR-135-1..4 | MVP | Should Have |
| FR-136 Guided first session | PG-5 | UN-12 | NFR-004 | AC-FR-136-1..4 | TC-FR-136-1..4 | MVP | Should Have |
| FR-137 Choose primary goal in onboarding | PG-5 | UN-12 | NFR-030 | AC-FR-137-1..4 | TC-FR-137-1..4 | MVP | Should Have |
| FR-138 Light, dark and system theme | PG-5 | UN-12 | NFR-040, NFR-045 | AC-FR-138-1..4 | TC-FR-138-1..4 | MVP | Should Have |
| FR-139 Responsive layout | PG-5 | UN-12 | NFR-085, NFR-086, NFR-087, NFR-088 | AC-FR-139-1..4 | TC-FR-139-1..4 | MVP | Should Have |
| FR-150 Daily study reminder | PG-5 | UN-6 | NFR-034 | AC-FR-150-1..3 | TC-FR-150-1..3 | 2 | Could Have |
| FR-151 Plan entry reminder | PG-5 | UN-8 | NFR-034 | AC-FR-151-1..3 | TC-FR-151-1..3 | 2 | Could Have |
| FR-152 In-app notifications | PG-5 | UN-6 | NFR-044 | AC-FR-152-1..3 | TC-FR-152-1..3 | 2 | Could Have |
| FR-153 Browser push opt-in | PG-5 | UN-6 | NFR-030 | AC-FR-153-1..3 | TC-FR-153-1..3 | 2 | Could Have |
| FR-154 Reminder preferences | PG-5 | UN-6 | NFR-030 | AC-FR-154-1..3 | TC-FR-154-1..3 | 2 | Could Have |
| FR-160 Current streak | PG-3 | UN-6 | NFR-091 | AC-FR-160-1..3 | TC-FR-160-1..3 | 2 | Could Have |
| FR-161 Streak reset after a missed day | PG-3 | UN-6 | NFR-091 | AC-FR-161-1..3 | TC-FR-161-1..3 | 2 | Could Have |
| FR-162 Weekly streak freeze | PG-3 | UN-6 | NFR-091 | AC-FR-162-1..3 | TC-FR-162-1..3 | 2 | Could Have |
| FR-163 Longest streak | PG-3 | UN-6 | NFR-091 | AC-FR-163-1..3 | TC-FR-163-1..3 | 2 | Could Have |
| FR-164 Streak stability across timezone change | PG-3 | UN-6 | NFR-091 | AC-FR-164-1..3 | TC-FR-164-1..3 | 2 | Could Have |
| FR-170 Award XP for focused minutes | PG-3 | UN-6 | NFR-095 | AC-FR-170-1..3 | TC-FR-170-1..3 | 2 | Could Have |
| FR-171 Award XP for meeting the daily goal | PG-3 | UN-6 | NFR-095 | AC-FR-171-1..3 | TC-FR-171-1..3 | 2 | Could Have |
| FR-172 Award XP for completed High-priority to-dos | PG-3 | UN-6 | NFR-095 | AC-FR-172-1..3 | TC-FR-172-1..3 | 2 | Could Have |
| FR-173 Daily XP cap | PG-3 | UN-6 | NFR-062 | AC-FR-173-1..3 | TC-FR-173-1..3 | 2 | Could Have |
| FR-174 XP exclusions | PG-3 | UN-6 | NFR-095 | AC-FR-174-1..3 | TC-FR-174-1..3 | 2 | Could Have |
| FR-175 Levels | PG-3 | UN-6 | NFR-062 | AC-FR-175-1..3 | TC-FR-175-1..3 | 2 | Could Have |
| FR-176 Idempotent XP ledger | PG-3 | UN-6 | NFR-053, NFR-095 | AC-FR-176-1..3 | TC-FR-176-1..3 | 2 | Could Have |
| FR-177 XP adjustment on session edit or delete | PG-3 | UN-6 | NFR-095 | AC-FR-177-1..3 | TC-FR-177-1..3 | 2 | Could Have |
| FR-180 Choose an ambient loop | PG-3 | UN-3 | NFR-041 | AC-FR-180-1..3 | TC-FR-180-1..3 | 2 | Could Have |
| FR-181 Ambient volume | PG-3 | UN-3 | NFR-041 | AC-FR-181-1..3 | TC-FR-181-1..3 | 2 | Could Have |
| FR-182 Play audio only while a session runs | PG-3 | UN-3 | NFR-044 | AC-FR-182-1..3 | TC-FR-182-1..3 | 2 | Could Have |
| FR-183 Remember last audio choice | PG-3 | UN-3 | NFR-030 | AC-FR-183-1..3 | TC-FR-183-1..3 | 2 | Could Have |
| FR-184 Mute audio on pause | PG-3 | UN-3 | NFR-044 | AC-FR-184-1..3 | TC-FR-184-1..3 | 2 | Could Have |
| FR-190 AI schedule inputs | PG-4 | UN-8 | NFR-036 | AC-FR-190-1..4 | TC-FR-190-1..4 | 3 | Won't Have |
| FR-191 Request an AI schedule | PG-4 | UN-8 | NFR-036 | AC-FR-191-1..4 | TC-FR-191-1..4 | 3 | Won't Have |
| FR-192 Consent to share study data with the AI provider | PG-6 | UN-11 | NFR-030, NFR-036 | AC-FR-192-1..4 | TC-FR-192-1..4 | 3 | Won't Have |
| FR-193 Preview an AI schedule | PG-4 | UN-8 | NFR-001, NFR-043 | AC-FR-193-1..4 | TC-FR-193-1..4 | 3 | Won't Have |
| FR-194 Validate AI-proposed entries | PG-4 | UN-8 | NFR-054 | AC-FR-194-1..4 | TC-FR-194-1..4 | 3 | Won't Have |
| FR-195 Accept or discard an AI schedule | PG-4 | UN-8 | NFR-053, NFR-092 | AC-FR-195-1..4 | TC-FR-195-1..4 | 3 | Won't Have |
| FR-196 AI generation daily limit | PG-4 | UN-8 | NFR-062 | AC-FR-196-1..4 | TC-FR-196-1..4 | 3 | Won't Have |
| FR-197 AI provider failure handling | PG-4 | UN-8 | NFR-054 | AC-FR-197-1..4 | TC-FR-197-1..4 | 3 | Won't Have |
| FR-198 AI schedule prerequisites | PG-4 | UN-8 | NFR-030 | AC-FR-198-1..4 | TC-FR-198-1..4 | 3 | Won't Have |
| FR-200 Create a study group | PG-5 | UN-7 | NFR-035, NFR-037 | AC-FR-200-1..3 | TC-FR-200-1..3 | 3 | Won't Have |
| FR-201 Invite members to a group | PG-5 | UN-7 | NFR-037 | AC-FR-201-1..4 | TC-FR-201-1..4 | 3 | Won't Have |
| FR-202 Join a group | PG-5 | UN-7 | NFR-035, NFR-037 | AC-FR-202-1..3 | TC-FR-202-1..3 | 3 | Won't Have |
| FR-203 Leave a group | PG-5 | UN-7 | NFR-037 | AC-FR-203-1..4 | TC-FR-203-1..4 | 3 | Won't Have |
| FR-204 Remove a group member | PG-5 | UN-7 | NFR-016 | AC-FR-204-1..4 | TC-FR-204-1..4 | 3 | Won't Have |
| FR-205 Transfer group administration | PG-5 | UN-7 | NFR-016 | AC-FR-205-1..4 | TC-FR-205-1..4 | 3 | Won't Have |
| FR-206 Per-user sharing setting | PG-6 | UN-7 | NFR-037 | AC-FR-206-1..4 | TC-FR-206-1..4 | 3 | Won't Have |
| FR-207 Weekly leaderboard | PG-5 | UN-7 | NFR-003 | AC-FR-207-1..4 | TC-FR-207-1..4 | 3 | Won't Have |
| FR-208 Group size cap | PG-5 | UN-7 | NFR-070 | AC-FR-208-1..3 | TC-FR-208-1..3 | 3 | Won't Have |
| FR-209 Report a group member | PG-6 | UN-7 | NFR-020 | AC-FR-209-1..4 | TC-FR-209-1..4 | 3 | Won't Have |
| FR-210 Dissolve a group | PG-5 | UN-7 | NFR-016 | AC-FR-210-1..4 | TC-FR-210-1..4 | 3 | Won't Have |
| FR-211 View group members | PG-5 | UN-7 | NFR-037 | AC-FR-211-1..4 | TC-FR-211-1..4 | 3 | Won't Have |
| FR-212 Rename a group | PG-5 | UN-7 | NFR-094 | AC-FR-212-1..4 | TC-FR-212-1..4 | 3 | Won't Have |
| FR-220 Create an API key | PG-6 | UN-11 | NFR-019, NFR-021 | AC-FR-220-1..4 | TC-FR-220-1..4 | 3 | Won't Have |
| FR-221 API key scopes | PG-6 | UN-11 | NFR-016, NFR-021 | AC-FR-221-1..4 | TC-FR-221-1..4 | 3 | Won't Have |
| FR-222 API rate limit | PG-6 | UN-11 | NFR-002 | AC-FR-222-1..4 | TC-FR-222-1..4 | 3 | Won't Have |
| FR-223 Versioned API | PG-6 | UN-11 | NFR-060 | AC-FR-223-1..4 | TC-FR-223-1..4 | 3 | Won't Have |
| FR-224 JSON responses and pagination | PG-6 | UN-11 | NFR-002 | AC-FR-224-1..4 | TC-FR-224-1..4 | 3 | Won't Have |
| FR-225 Standard API error format | PG-6 | UN-11 | NFR-063 | AC-FR-225-1..4 | TC-FR-225-1..4 | 3 | Won't Have |
| FR-226 Revoke an API key | PG-6 | UN-11 | NFR-021 | AC-FR-226-1..4 | TC-FR-226-1..4 | 3 | Won't Have |

## (c) Non-functional requirements

| NFR | PG | Related FRs | AC-NFR | TC-NFR |
|---|---|---|---|---|
| NFR-001 | PG-5, PG-1 | FR-017, FR-020, FR-022..FR-024, FR-037, FR-061, FR-062, FR-094, FR-095, FR-109, FR-123, FR-125, FR-134, FR-193 | AC-NFR-001 | TC-NFR-001 |
| NFR-002 | PG-5, PG-1 | FR-095, FR-222, FR-224 | AC-NFR-002 | TC-NFR-002 |
| NFR-003 | PG-5, PG-1 | FR-036, FR-060, FR-080..FR-086, FR-126, FR-127, FR-207 | AC-NFR-003 | TC-NFR-003 |
| NFR-004 | PG-5, PG-1 | FR-021, FR-049..FR-052, FR-136 | AC-NFR-004 | TC-NFR-004 |
| NFR-005 | PG-5, PG-1 | FR-130..FR-132 | AC-NFR-005 | TC-NFR-005 |
| NFR-010 | PG-6 | FR-001, FR-003 | AC-NFR-010 | TC-NFR-010 |
| NFR-011 | PG-6 | FR-001, FR-002, FR-005 | AC-NFR-011 | TC-NFR-011 |
| NFR-012 | PG-6 | FR-002, FR-005 | AC-NFR-012 | TC-NFR-012 |
| NFR-013 | PG-6 | FR-002..FR-004, FR-008 | AC-NFR-013 | TC-NFR-013 |
| NFR-014 | PG-6 | FR-101 | AC-NFR-014 | TC-NFR-014 |
| NFR-015 | PG-6 | FR-101 | AC-NFR-015 | TC-NFR-015 |
| NFR-016 | PG-6 | FR-010, FR-015, FR-030, FR-070, FR-071, FR-090, FR-107, FR-120, FR-204, FR-205, FR-210, FR-221 | AC-NFR-016 | TC-NFR-016 |
| NFR-017 | PG-6 | Cross-cutting (all FRs) | AC-NFR-017 | TC-NFR-017 |
| NFR-018 | PG-6 | Cross-cutting (all FRs) | AC-NFR-018 | TC-NFR-018 |
| NFR-019 | PG-6 | FR-220 | AC-NFR-019 | TC-NFR-019 |
| NFR-020 | PG-6 | FR-005, FR-008, FR-209 | AC-NFR-020 | TC-NFR-020 |
| NFR-021 | PG-6 | FR-220, FR-221, FR-226 | AC-NFR-021 | TC-NFR-021 |
| NFR-030 | PG-6 | FR-001, FR-137, FR-153, FR-154, FR-183, FR-192, FR-198 | AC-NFR-030 | TC-NFR-030 |
| NFR-031 | PG-6 | FR-007 | AC-NFR-031 | TC-NFR-031 |
| NFR-032 | PG-6 | FR-130, FR-131 | AC-NFR-032 | TC-NFR-032 |
| NFR-033 | PG-6 | Cross-cutting (all FRs) | AC-NFR-033 | TC-NFR-033 |
| NFR-034 | PG-6 | FR-150, FR-151 | AC-NFR-034 | TC-NFR-034 |
| NFR-035 | PG-6 | FR-001, FR-200, FR-202 | AC-NFR-035 | TC-NFR-035 |
| NFR-036 | PG-6 | FR-190..FR-192 | AC-NFR-036 | TC-NFR-036 |
| NFR-037 | PG-6 | FR-200..FR-203, FR-206, FR-211 | AC-NFR-037 | TC-NFR-037 |
| NFR-040 | PG-5 | FR-138 | AC-NFR-040 | TC-NFR-040 |
| NFR-041 | PG-5 | FR-012, FR-016, FR-034, FR-038, FR-068, FR-069, FR-135, FR-180, FR-181 | AC-NFR-041 | TC-NFR-041 |
| NFR-042 | PG-5 | FR-012, FR-016, FR-068 | AC-NFR-042 | TC-NFR-042 |
| NFR-043 | PG-5 | FR-019, FR-024, FR-060, FR-073, FR-096, FR-193 | AC-NFR-043 | TC-NFR-043 |
| NFR-044 | PG-5 | FR-055, FR-056, FR-072, FR-087, FR-093, FR-128, FR-152, FR-182, FR-184 | AC-NFR-044 | TC-NFR-044 |
| NFR-045 | PG-5 | FR-138 | AC-NFR-045 | TC-NFR-045 |
| NFR-050 | PG-1, PG-3 | Cross-cutting (all FRs) | AC-NFR-050 | TC-NFR-050 |
| NFR-051 | PG-1, PG-3 | FR-040, FR-046, FR-054 | AC-NFR-051 | TC-NFR-051 |
| NFR-052 | PG-1, PG-3 | FR-052, FR-054, FR-059 | AC-NFR-052 | TC-NFR-052 |
| NFR-053 | PG-1, PG-3 | FR-048, FR-053, FR-093, FR-110, FR-176, FR-195 | AC-NFR-053 | TC-NFR-053 |
| NFR-054 | PG-1, PG-3 | FR-102, FR-132, FR-194, FR-197 | AC-NFR-054 | TC-NFR-054 |
| NFR-060 | PG-5 | FR-223 | AC-NFR-060 | TC-NFR-060 |
| NFR-061 | PG-5 | Cross-cutting (all FRs) | AC-NFR-061 | TC-NFR-061 |
| NFR-062 | PG-5 | FR-057, FR-070, FR-111, FR-112, FR-173, FR-175, FR-196 | AC-NFR-062 | TC-NFR-062 |
| NFR-063 | PG-5 | FR-225 | AC-NFR-063 | TC-NFR-063 |
| NFR-070 | PG-5 | FR-208 | AC-NFR-070 | TC-NFR-070 |
| NFR-071 | PG-5 | Cross-cutting (all FRs) | AC-NFR-071 | TC-NFR-071 |
| NFR-072 | PG-5 | FR-086 | AC-NFR-072 | TC-NFR-072 |
| NFR-080 | PG-5 | Cross-cutting (all FRs) | AC-NFR-080 | TC-NFR-080 |
| NFR-081 | PG-5 | Cross-cutting (all FRs) | AC-NFR-081 | TC-NFR-081 |
| NFR-082 | PG-5 | Cross-cutting (all FRs) | AC-NFR-082 | TC-NFR-082 |
| NFR-085 | PG-5 | FR-139 | AC-NFR-085 | TC-NFR-085 |
| NFR-086 | PG-5 | FR-139 | AC-NFR-086 | TC-NFR-086 |
| NFR-087 | PG-5 | FR-065..FR-067, FR-139 | AC-NFR-087 | TC-NFR-087 |
| NFR-088 | PG-5 | FR-139 | AC-NFR-088 | TC-NFR-088 |
| NFR-090 | PG-1 | FR-040, FR-042, FR-045, FR-058 | AC-NFR-090 | TC-NFR-090 |
| NFR-091 | PG-1 | FR-006, FR-009, FR-047, FR-072, FR-074, FR-089, FR-160..FR-164 | AC-NFR-091 | TC-NFR-091 |
| NFR-092 | PG-1 | FR-032, FR-033, FR-041, FR-092, FR-195 | AC-NFR-092 | TC-NFR-092 |
| NFR-093 | PG-1 | FR-013, FR-014, FR-018, FR-104, FR-124 | AC-NFR-093 | TC-NFR-093 |
| NFR-094 | PG-1 | FR-011, FR-012, FR-016, FR-019, FR-031, FR-035, FR-043, FR-091, FR-100, FR-103, FR-108, FR-121, FR-122, FR-212 | AC-NFR-094 | TC-NFR-094 |
| NFR-095 | PG-1 | FR-170..FR-172, FR-174, FR-176, FR-177 | AC-NFR-095 | TC-NFR-095 |
| NFR-096 | PG-1 | FR-043, FR-044, FR-080..FR-083, FR-088 | AC-NFR-096 | TC-NFR-096 |
| NFR-100 | PG-6 | Cross-cutting (all FRs) | AC-NFR-100 | TC-NFR-100 |
| NFR-101 | PG-6 | Cross-cutting (all FRs) | AC-NFR-101 | TC-NFR-101 |
| NFR-102 | PG-6 | Cross-cutting (all FRs) | AC-NFR-102 | TC-NFR-102 |
| NFR-103 | PG-6 | Cross-cutting (all FRs) | AC-NFR-103 | TC-NFR-103 |
| NFR-104 | PG-6 | FR-007 | AC-NFR-104 | TC-NFR-104 |

## (d) Business rule -> functional requirements and test cases

| BR | FRs that implement it | Planned TC IDs |
|---|---|---|
| BR-001 | FR-022, FR-030, FR-036, FR-062, FR-085, FR-151 | TC-FR-022-1..3, TC-FR-030-1..4, TC-FR-036-1..3, TC-FR-062-1..4, TC-FR-085-1..4, TC-FR-151-1..3 |
| BR-002 | FR-030, FR-036, FR-085 | TC-FR-030-1..4, TC-FR-036-1..3, TC-FR-085-1..4 |
| BR-003 | FR-032, FR-036, FR-041 | TC-FR-032-1..3, TC-FR-036-1..3, TC-FR-041-1..3 |
| BR-004 | FR-036, FR-085 | TC-FR-036-1..3, TC-FR-085-1..4 |
| BR-005 | FR-033 | TC-FR-033-1..3 |
| BR-006 | FR-040, FR-046, FR-052, FR-054 | TC-FR-040-1..3, TC-FR-046-1..3, TC-FR-052-1..4, TC-FR-054-1..4 |
| BR-007 | FR-058 | TC-FR-058-1..4 |
| BR-008 | FR-045, FR-051, FR-058, FR-136 | TC-FR-045-1..3, TC-FR-051-1..4, TC-FR-058-1..4, TC-FR-136-1..4 |
| BR-009 | FR-050, FR-055, FR-057 | TC-FR-050-1..4, TC-FR-055-1..4, TC-FR-057-1..4 |
| BR-010 | FR-042, FR-043, FR-088, FR-174, FR-207 | TC-FR-042-1..4, TC-FR-043-1..3, TC-FR-088-1..4, TC-FR-174-1..3, TC-FR-207-1..4 |
| BR-011 | FR-021, FR-053, FR-059 | TC-FR-021-1..3, TC-FR-053-1..4, TC-FR-059-1..4 |
| BR-012 | FR-040, FR-043, FR-051, FR-052, FR-054 | TC-FR-040-1..3, TC-FR-043-1..3, TC-FR-051-1..4, TC-FR-052-1..4, TC-FR-054-1..4 |
| BR-013 | FR-020, FR-070, FR-071, FR-134 | TC-FR-020-1..3, TC-FR-070-1..4, TC-FR-071-1..4, TC-FR-134-1..4 |
| BR-014 | FR-009, FR-020, FR-024, FR-047, FR-060, FR-072, FR-080, FR-081, FR-082, FR-089 | TC-FR-009-1..4, TC-FR-020-1..3, TC-FR-024-1..3, TC-FR-047-1..3, TC-FR-060-1..4, TC-FR-072-1..4, TC-FR-080-1..4, TC-FR-081-1..4, TC-FR-082-1..4, TC-FR-089-1..4 |
| BR-015 | FR-020, FR-073, FR-074, FR-084 | TC-FR-020-1..3, TC-FR-073-1..4, TC-FR-074-1..4, TC-FR-084-1..4 |
| BR-016 | FR-047, FR-061 | TC-FR-047-1..3, TC-FR-061-1..4 |
| BR-017 | FR-170, FR-171, FR-172 | TC-FR-170-1..3, TC-FR-171-1..3, TC-FR-172-1..3 |
| BR-018 | FR-173, FR-174 | TC-FR-173-1..3, TC-FR-174-1..3 |
| BR-019 | FR-175, FR-176, FR-177 | TC-FR-175-1..3, TC-FR-176-1..3, TC-FR-177-1..3 |
| BR-020 | FR-160 | TC-FR-160-1..3 |
| BR-021 | FR-161, FR-162 | TC-FR-161-1..3, TC-FR-162-1..3 |
| BR-022 | FR-163, FR-164 | TC-FR-163-1..3, TC-FR-164-1..3 |
| BR-023 | FR-120, FR-121, FR-122 | TC-FR-120-1..4, TC-FR-121-1..4, TC-FR-122-1..4 |
| BR-024 | FR-126, FR-127, FR-128 | TC-FR-126-1..4, TC-FR-127-1..4, TC-FR-128-1..4 |
| BR-025 | FR-038, FR-123, FR-124, FR-125, FR-190, FR-194 | TC-FR-038-1..3, TC-FR-123-1..4, TC-FR-124-1..4, TC-FR-125-1..4, TC-FR-190-1..4, TC-FR-194-1..4 |
| BR-026 | FR-034, FR-065, FR-193, FR-194, FR-195 | TC-FR-034-1..4, TC-FR-065-1..4, TC-FR-193-1..4, TC-FR-194-1..4, TC-FR-195-1..4 |
| BR-027 | FR-066, FR-067, FR-068, FR-069 | TC-FR-066-1..4, TC-FR-067-1..4, TC-FR-068-1..4, TC-FR-069-1..4 |
| BR-028 | FR-031, FR-033, FR-035, FR-066 | TC-FR-031-1..3, TC-FR-033-1..3, TC-FR-035-1..3, TC-FR-066-1..4 |
| BR-029 | FR-010, FR-013, FR-014, FR-018, FR-083, FR-104 | TC-FR-010-1..4, TC-FR-013-1..3, TC-FR-014-1..3, TC-FR-018-1..3, TC-FR-083-1..4, TC-FR-104-1..4 |
| BR-030 | FR-001, FR-006, FR-037, FR-060, FR-086, FR-089, FR-109, FR-112, FR-123, FR-150 | TC-FR-001-1..3, TC-FR-006-1..4, TC-FR-037-1..3, TC-FR-060-1..4, TC-FR-086-1..4, TC-FR-089-1..4, TC-FR-109-1..4, TC-FR-112-1..4, TC-FR-123-1..4, TC-FR-150-1..3 |
| BR-031 | FR-023, FR-090, FR-091, FR-094, FR-095, FR-096 | TC-FR-023-1..3, TC-FR-090-1..4, TC-FR-091-1..4, TC-FR-094-1..4, TC-FR-095-1..4, TC-FR-096-1..4 |
| BR-032 | FR-007, FR-130, FR-131, FR-132 | TC-FR-007-1..4, TC-FR-130-1..4, TC-FR-131-1..4, TC-FR-132-1..4 |

## (e) Edge case -> functional requirements

| EC | FRs that reference it | Planned TC IDs |
|---|---|---|
| EC-001 | FR-021, FR-040, FR-046, FR-052, FR-054 | TC-FR-021-1..3, TC-FR-040-1..3, TC-FR-046-1..3, TC-FR-052-1..4 ... |
| EC-002 | FR-053, FR-059 | TC-FR-053-1..4, TC-FR-059-1..4 |
| EC-003 | FR-030, FR-031, FR-034, FR-065..FR-067, FR-069 | TC-FR-030-1..4, TC-FR-031-1..3, TC-FR-034-1..4, TC-FR-065-1..4 ... |
| EC-004 | FR-020, FR-073, FR-074, FR-084, FR-160..FR-162 | TC-FR-020-1..3, TC-FR-073-1..4, TC-FR-074-1..4, TC-FR-084-1..4 ... |
| EC-005 | FR-074, FR-084 | TC-FR-074-1..4, TC-FR-084-1..4 |
| EC-006 | FR-001, FR-006, FR-009, FR-020, FR-024, FR-037, FR-047, FR-060, FR-072, FR-080..FR-082, FR-086, FR-089, FR-109, FR-112, FR-123, FR-134, FR-150, FR-160, FR-164 | TC-FR-001-1..3, TC-FR-006-1..4, TC-FR-009-1..4, TC-FR-020-1..3 ... |
| EC-007 | FR-013, FR-014, FR-083, FR-104 | TC-FR-013-1..3, TC-FR-014-1..3, TC-FR-083-1..4, TC-FR-104-1..4 |
| EC-008 | FR-018, FR-122, FR-126 | TC-FR-018-1..3, TC-FR-122-1..4, TC-FR-126-1..4 |
| EC-009 | FR-047, FR-061 | TC-FR-047-1..3, TC-FR-061-1..4 |
| EC-010 | FR-040, FR-054 | TC-FR-040-1..3, TC-FR-054-1..4 |
| EC-011 | FR-042, FR-043, FR-088 | TC-FR-042-1..4, TC-FR-043-1..3, TC-FR-088-1..4 |
| EC-012 | FR-045, FR-058 | TC-FR-045-1..3, TC-FR-058-1..4 |
| EC-013 | FR-038, FR-120, FR-121, FR-124 | TC-FR-038-1..3, TC-FR-120-1..4, TC-FR-121-1..4, TC-FR-124-1..4 |
| EC-014 | FR-122, FR-126, FR-127 | TC-FR-122-1..4, TC-FR-126-1..4, TC-FR-127-1..4 |
| EC-015 | FR-190, FR-193..FR-196, FR-198 | TC-FR-190-1..4, TC-FR-193-1..4, TC-FR-194-1..4, TC-FR-195-1..4 ... |
| EC-016 | FR-191, FR-196, FR-197 | TC-FR-191-1..4, TC-FR-196-1..4, TC-FR-197-1..4 |
| EC-017 | FR-170..FR-174, FR-176, FR-177 | TC-FR-170-1..3, TC-FR-171-1..3, TC-FR-172-1..3, TC-FR-173-1..3 ... |
| EC-018 | FR-202..FR-205, FR-210, FR-211 | TC-FR-202-1..3, TC-FR-203-1..4, TC-FR-204-1..4, TC-FR-205-1..4 ... |
| EC-019 | FR-007 | TC-FR-007-1..4 |
| EC-020 | FR-011, FR-016, FR-031, FR-043, FR-044, FR-059, FR-091, FR-100, FR-102, FR-103, FR-108, FR-121, FR-212 | TC-FR-011-1..3, TC-FR-016-1..3, TC-FR-031-1..3, TC-FR-043-1..3 ... |
| EC-021 | FR-048, FR-110 | TC-FR-048-1..3, TC-FR-110-1..4 |
| EC-022 | FR-032, FR-041 | TC-FR-032-1..3, TC-FR-041-1..3 |
| EC-023 | FR-070, FR-071 | TC-FR-070-1..4, TC-FR-071-1..4 |
| EC-024 | FR-055, FR-150..FR-153, FR-182 | TC-FR-055-1..4, TC-FR-150-1..3, TC-FR-151-1..3, TC-FR-152-1..3 ... |
| EC-025 | FR-207 | TC-FR-207-1..4 |
| EC-026 | FR-222, FR-225, FR-226 | TC-FR-222-1..4, TC-FR-225-1..4, TC-FR-226-1..4 |
| EC-027 | FR-130..FR-132 | TC-FR-130-1..4, TC-FR-131-1..4, TC-FR-132-1..4 |
| EC-028 | FR-046, FR-054 | TC-FR-046-1..3, TC-FR-054-1..4 |

## (f) End-to-end scenarios

| AC | TC |
|---|---|
| AC-E2E-01 | TC-E2E-01 |
| AC-E2E-02 | TC-E2E-02 |
| AC-E2E-03 | TC-E2E-03 |
| AC-E2E-04 | TC-E2E-04 |
| AC-E2E-05 | TC-E2E-05 |
| AC-E2E-06 | TC-E2E-06 |
| AC-E2E-07 | TC-E2E-07 |
| AC-E2E-08 | TC-E2E-08 |
| AC-E2E-09 | TC-E2E-09 |
| AC-E2E-10 | TC-E2E-10 |

## (g) Coverage summary

| Item | Count |
|---|---|
| Functional requirements | 164 |
| Non-functional requirements | 62 |
| Functional acceptance criteria | 595 |
| NFR acceptance criteria | 62 |
| End-to-end scenarios | 10 |
| Planned test cases (functional + NFR + E2E) | 667 |
| Business rules covered by >= 1 FR | 32 of 32 |
| Edge cases referenced by >= 1 FR | 28 of 28 |
| Orphans (FR without AC or TC) | 0 |
