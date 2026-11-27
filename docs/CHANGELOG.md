# Changelog

Documentation changes and build evidence. M01 application code is tracked from 2026-11-19, M02 from 2026-11-20, M03 and M04 from 2026-11-21, M05 from 2026-11-22, M06 from 2026-11-23, M07 and M08 from 2026-11-25, and M09 from 2026-11-27.

## 2026-11-27, M09 calendar

### Added
- [08-build/M09-EVIDENCE.md](08-build/M09-EVIDENCE.md): environment and versions, one section per checkpoint with the command and raw output, per-row checklist status, the browser measurements at four widths, the unchanged registry keys, the coverage measurement and the Definition of Done check.
- [08-build/M09-COMPLETION-REPORT.md](08-build/M09-COMPLETION-REPORT.md): functionality, files, database changes (none), tests executed, technical findings, known limitations, remaining tasks, documents updated, Definition of Done level and recommended next milestone.
- [OPEN-DECISIONS.md](OPEN-DECISIONS.md) section G: the 2026-11-27 M09 execution row, limited to M09 records and stating that M09 stays open.
- Application and tooling: `src/modules/calendar/**` (service, public); `src/app/api/app/calendar/{heatmap,days/[date]}/route.ts` covering CAL-01 and CAL-02; `src/app/calendar/page.tsx` (A-5); `src/ui/forms/calendar-month.tsx`; the Calendar nav entry; the `--bucket-*` theme variables; the `monthQuerySchema` in `src/server/request-context.ts`.
- Tests: `tests/integration/calendar.test.ts` (9 cases) and `tests/unit/calendar.test.ts` (7 cases), taking the unit tier to 22 files and 143 tests and the integration tier to 13 files and 143 tests, plus the calendar entries in `tests/integration/support/api.ts`.

### Changed
- [07-roadmap/MILESTONES.md](07-roadmap/MILESTONES.md): three M09 rows checked, the Definition of Done row left unchecked, and an "As built" note recording what shipped.
- [IMPLEMENTATION-READINESS.md](IMPLEMENTATION-READINESS.md) sections 6 and 7: the M09 execution paragraph and the authorization sentence naming M10 as the next step.
- [OPEN-DECISIONS.md](OPEN-DECISIONS.md), [README.md](../README.md), [docs/README.md](README.md), [DOCUMENTATION-INDEX.md](DOCUMENTATION-INDEX.md): build state, the M09 execution row and the inventory at 101 documents (21 build records).
- `vitest.config.ts`: the `src/modules/calendar/**` coverage floor.

### Fixed
- The keyboard moved the selection but not the focus: the arrow handler only set the selected date and the cells had no tab order, so the ARIA grid pattern held a single tab stop in name only. The selected cell is now `tabIndex={0}` with the rest `-1`, the handler moves the date, and an effect focuses the matching cell on `[loading, month, selected]`, so PageUp and PageDown keep selection and focus on the same day of the neighbouring month; the browser pass drives arrows, Home, End, PageUp and PageDown.
- The today outline never rendered: the cell used `outline: 2px solid var(--fg)`, and `--fg` is not defined in this theme (the foreground variable is `--ink`), so at computed-value time the declaration was dropped and the outline stayed `none`. The style uses `var(--ink)` and the browser pass reads `2px solid` on the today cell.
- The heatmap month upper bound was a `YYYY-MM` string, which PostgreSQL rejected as "invalid input syntax for type date"; the bound is now the first of the following month and the October integration case pins it.

## 2026-11-25, M08 daily and subject goals

### Added
- [08-build/M08-EVIDENCE.md](08-build/M08-EVIDENCE.md): environment and versions, one section per checkpoint with the command and raw output, per-row checklist status, the browser measurements at four widths, the registry contributions, the coverage measurement and the Definition of Done check.
- [08-build/M08-COMPLETION-REPORT.md](08-build/M08-COMPLETION-REPORT.md): functionality, files, database changes, tests executed, technical findings, known limitations, remaining tasks, documents updated, Definition of Done level and recommended next milestone.
- [OPEN-DECISIONS.md](OPEN-DECISIONS.md) section C: OD-M46 to OD-M49 (the subscriber that receives the writing connection, the derived target of a day, `GoalMet` in process with no MVP consumer, and the calendar-date check in the kernel). Section G: the 2026-11-25 M08 execution row, limited to M08 records and stating that M08 stays open.
- Application and tooling: `db/migrations/0008_goals.sql`; `src/modules/goals/**` (service, events, subscribe, public); `src/app/api/app/goals/**` (4 route files) covering GOAL-01..GOAL-05; `src/app/settings/study/page.tsx` (A-15); `src/ui/forms/{study-form,daily-goal-dialog,subject-goal-panel,goal-fields}.tsx`; the daily-goal panel and dialog on A-3; the goals block in the container; the request schemas, the error copy and the `/settings/study` nav entry.
- Tests: `tests/integration/goals.test.ts` (15 cases) and `tests/unit/goals.test.ts` (20 cases), taking the unit tier to 21 files and 136 tests and the integration tier to 12 files and 134 tests, plus the goals entries in `tests/integration/support/api.ts` and the registry keys in `tests/integration/profile.test.ts`.

### Changed
- `src/modules/sessions/{events,service}.ts` and `src/modules/timer/service.ts`: a session-event subscriber now receives the connection the write used (`publishSessionEvent(event, database)`), because the event is published inside the write's transaction (OD-M46); the container's Goals subscriber forwards it.
- `src/kernel/time.ts` and `src/modules/plans/service.ts`: `isRealLocalDate` joins the kernel and Study plans uses it instead of its private copy (OD-M49).
- [07-roadmap/MILESTONES.md](07-roadmap/MILESTONES.md): three M08 rows checked, the Definition of Done row left unchecked, and an "As built" note recording what shipped.
- [03-architecture/MODULE-BOUNDARIES.md](03-architecture/MODULE-BOUNDARIES.md): Goals now depends on Timer for the run in flight (rank row `2, 3, 7, 8`, the diagram edge and the section 6 note that a subscriber reads through the write's connection).
- [IMPLEMENTATION-READINESS.md](IMPLEMENTATION-READINESS.md) sections 6 and 7: the M08 execution paragraph and the authorization sentence naming M09 as the next step.
- [OPEN-DECISIONS.md](OPEN-DECISIONS.md), [README.md](../README.md), [docs/README.md](README.md), [DOCUMENTATION-INDEX.md](DOCUMENTATION-INDEX.md): build state, the M08 execution row and the inventory at 99 documents (19 build records).
- `vitest.config.ts`: the `src/modules/goals/**` coverage floor.

### Fixed
- `GoalMet` never fired from a session write: the Goals subscriber read through the container's connection while the route's transaction was still open, so it saw no day rows and returned early. The subscriber now receives the write's connection (OD-M46), and the integration case that crosses a target through POST `/api/app/sessions` is the regression.
- GOAL-05 answered 500 for `2026-13-01`: `isLocalDate` matches the shape only, so the value reached Postgres. The query now uses `isRealLocalDate` and answers 400 `validation_failed` (OD-M49).

## 2026-11-25, M07 timer

### Added
- [08-build/M07-EVIDENCE.md](08-build/M07-EVIDENCE.md): environment and versions, one section per checkpoint (E01 to E08) with the command and raw output, per-row checklist status, the browser measurements at four widths, the twelve findings and fixed defects, the coverage measurement and the Definition of Done check.
- [08-build/M07-COMPLETION-REPORT.md](08-build/M07-COMPLETION-REPORT.md): functionality, files, database changes, tests executed, technical findings, known limitations, remaining tasks, documents updated, Definition of Done level and recommended next milestone.
- [OPEN-DECISIONS.md](OPEN-DECISIONS.md) section C: OD-M42 to OD-M45 (the segment summary shape, the heartbeat that never moves `updated_at`, the idle close that commits in its own transaction, and the timer write that skips the manual-path probes). Section G: the 2026-11-25 M07 execution row, limited to M07 records and stating that M07 stays open.
- Application and tooling: `db/migrations/0007_timer.sql`; `src/modules/timer/**` (3 files); `src/app/api/app/timer/**` (7 route files) covering TIM-01..TIM-08; `src/app/timer/page.tsx` (A-3); `src/ui/forms/timer-{screen,dialogs}.tsx`; the timer block in the container, the `timerIdleClose` cron in the worker, the request schemas, the rate kind, the error copy and the nav entry.
- Tests: `tests/integration/timer.test.ts` (30 cases) and the tracked `tests/unit/timer.test.ts` (15 cases), taking the unit tier to 20 files and 116 tests and the integration tier to 11 files and 119 tests, plus the timer block in `tests/integration/support/api.ts` and the registry keys in `tests/integration/profile.test.ts`.

### Changed
- [07-roadmap/MILESTONES.md](07-roadmap/MILESTONES.md): four M07 rows with evidence checked, the screen-reader row and the Definition of Done row left unchecked, and an "As built" note recording what shipped and why those two rows stay open.
- [IMPLEMENTATION-READINESS.md](IMPLEMENTATION-READINESS.md) sections 6 and 7: the M07 execution paragraph and the authorization sentence naming M08 as the next step.
- [OPEN-DECISIONS.md](OPEN-DECISIONS.md), [README.md](../README.md), [docs/README.md](README.md), [DOCUMENTATION-INDEX.md](DOCUMENTATION-INDEX.md): build state, the M07 execution row and the inventory at 97 documents (17 build records).
- Application and tooling: `src/modules/timer/{service,public}.ts` (the idle close that commits through `settleIdleRun` and the `focusSeconds` segment summary); the four timer action routes; `src/server/{container,request-context}.ts`; `src/kernel/config.ts`; `src/worker/index.ts`; `src/ui/{control,messages,nav}.ts(x)`; `vitest.config.ts` (the timer module floor).

### Fixed
- The idle close ran inside the action's transaction, so a late stop that answered 409 rolled the auto-close back and left the run open; `settleIdleRun` now finalizes and commits in its own transaction before the four write routes open theirs (OD-M44).
- A heartbeat moved the row the ordinary way, which would have bumped `updated_at` (the pause instant `resumeTimer` reads) and the version every 60 s; TIM-06 now writes `last_heartbeat_at` alone (OD-M43).
- A-3 rendered a disabled Start under the "Add a subject to start a session." empty state, because the controls row was gated on any subject rather than on a choosable one.
- The durations dialog printed its range twice, once as a hint and once as the error; the form now prints one message per field.
- The post-session summary took the mode from the run and the topic from the form, so a reload dropped the topic; it reads the run.
- A discarded stop titled its panel "Session saved"; it now reads "Not saved" and names the one-minute rule.
- The interval alert read "1 minutes"; the copy is now singular at one minute.
- Recent sessions printed "Subject" for a session whose subject had since been archived; the page now loads archived subjects for the names while the picker still excludes them.

### Results
- `npm run verify` exit 0: typecheck, `eslint .`, `Boundary check passed.`, 20 unit files and 116 tests in 11.53 s, 11 integration files and 119 tests in 170.91 s.
- `npx next build`: 58 route lines, 8 new in M07 (the seven TIM route files and `/timer`); no static and dynamic sibling conflict.
- `npx vitest run --coverage` exit 0: 31 files and 235 tests; the timer module measures 87.78% statements, 80.86% branches, 94.33% functions and 90.56% lines against the floor M07 added; overall lines measure 50.06% because the UI layer is covered by the browser pass.
- Browser checks in Chromium at 360, 768, 1280 and 2560 px on the production build: A-3 with the start, the reload that continued from the stored phase end, the pause and resume, the heartbeats at 60 s and at the interval boundary, the interval that advanced itself to the break with the alert, the three stop outcomes, the topic-status prompt, the durations dialog, the replace dialog from a stale tab, the two-tab agreement, the archive guard refusal that names the run, the auto-close panel and the no-subject empty state, with no horizontal overflow at any width.

### Not changed
- No statistics, streak or XP awarding, no goal control, no calendar page, no AI review; FR-060 and later and the Phase 2 work stay with their milestones, and nothing is committed or tagged by the build session.

## 2026-11-23, M06 study sessions

### Added
- [08-build/M06-EVIDENCE.md](08-build/M06-EVIDENCE.md): environment and versions, one section per checkpoint (E01 to E08) with the command and raw output, per-row checklist status, the browser measurements, the three defects found and fixed, the registry order and the Definition of Done check.
- [08-build/M06-COMPLETION-REPORT.md](08-build/M06-COMPLETION-REPORT.md): functionality, files, database changes, tests executed, technical findings, known limitations, remaining tasks, documents updated, Definition of Done level and recommended next milestone.
- [OPEN-DECISIONS.md](OPEN-DECISIONS.md) section C: OD-M37 to OD-M41 (the session overlap exclusion, the manual duration floor, the archived-subject visibility, the `is_ranked` rule and the plan unlink). Section G: the 2026-11-23 M06 execution row, limited to M06 records and stating that M06 stays open.
- Application and tooling: `db/migrations/0006_study_sessions.sql`; `src/modules/sessions/**` (3 files); `src/app/api/app/sessions/**` (2 route files) covering SESS-01..SESS-05; `src/app/sessions/page.tsx` (A-4); `src/ui/forms/session-{list,dialog}.tsx`; the sessions entries in the container, the request schemas, the error catalogue, the UI copy and the nav.
- Tests: `tests/unit/sessions.test.ts` (6 cases) and `tests/integration/sessions.test.ts` (10 cases), taking the unit tier to 19 files and 101 tests and the integration tier to 10 files and 89 tests, plus the session block in `tests/integration/support/api.ts` and the plans actuals assertions.

### Changed
- [07-roadmap/MILESTONES.md](07-roadmap/MILESTONES.md): four M06 rows with evidence checked, the Definition of Done row left partial, and an "As built" note recording what shipped, the archived-subject rule, the duration floor and the open rows.
- [IMPLEMENTATION-READINESS.md](IMPLEMENTATION-READINESS.md) sections 6 and 7: the M06 execution paragraph and the authorization sentence naming M07 as the next step.
- [OPEN-DECISIONS.md](OPEN-DECISIONS.md), [README.md](../README.md), [docs/README.md](README.md), [DOCUMENTATION-INDEX.md](DOCUMENTATION-INDEX.md): build state, the M06 execution row and the inventory at 95 documents (15 build records).
- Application and tooling: `src/modules/plans/service.ts` (the actuals columns and the `done` status); `src/server/{container,request-context}.ts`; `src/ui/{messages,nav}.ts`; `tests/integration/{profile,api}.ts` and `tests/unit/{plans,boundaries}.test.ts`.

### Fixed
- The manual duration floor reused the timer's 300-second rule, refusing valid 1- to 5-minute sessions against a contract that allows 60..86400 s; `validateDuration` now checks the literal bound with `details: { minSeconds: 60, maxSeconds: 86_400 }` (API-ENDPOINTS line 1094, `chk_study_sessions_duration`).
- `listSessions` carried an unused clock context parameter and the route read the clock for it; the signature is now `listSessions(database, userId, query)` and the GET route's dead read is gone.
- The repo-scan boundary test exceeded the 5-second default under v8 coverage instrumentation; the case now carries `{ timeout: 30_000 }`.

### Results
- `npm run verify` exit 0: typecheck, `eslint .`, `Boundary check passed.`, 19 unit files and 101 tests in 12.03 s, 10 integration files and 89 tests in 167.66 s.
- `npx next build`: 49 routes, 3 new in M06 (`/api/app/sessions`, `/api/app/sessions/[sessionId]`, `/sessions`); no static and dynamic sibling conflict.
- `npm run test:coverage` exit 0: all configured floors pass; the sessions module measures 82.77% lines and 70.22% branches, the sessions API 92.59% statements; overall lines measure 50.44% because the UI layer is covered by the browser pass.
- Browser checks in Chromium at 360, 768, 1280 and 2560 px on the production build: A-4 with the add, edit and delete dialogs, the overlap refusal naming the conflicting session, the midnight-crossing row "Spans two days: 30 min and 30 min", the archived-subject "(archived)" label, the three filters, the empty and loading states, the full-height mobile sheet and no horizontal overflow at any width.

### Not changed
- No auto-close, no timer route, no XP or leaderboard awarding, no calendar heatmap, no statistics; FR-040..FR-059 stay with M07 and later milestones, and nothing is committed or tagged by the build session.

## 2026-11-22, M05 study plans

### Added
- [08-build/M05-EVIDENCE.md](08-build/M05-EVIDENCE.md): environment and versions, one section per checkpoint (E01 to E11) with the command and raw output, per-row checklist status, the browser measurements, the four defects found and fixed, the registry order and the Definition of Done check.
- [OPEN-DECISIONS.md](OPEN-DECISIONS.md) section G: the 2026-11-22 M05 approval row answering the delivery report, limited to M05 records and stating that M05 stays open.
- [08-build/M05-COMPLETION-REPORT.md](08-build/M05-COMPLETION-REPORT.md): functionality, files, database changes, tests executed, technical findings, known limitations, remaining tasks, documents updated, Definition of Done level and recommended next milestone.
- [OPEN-DECISIONS.md](OPEN-DECISIONS.md) section C: OD-M36 (the header's Calendar item pointing at `/plan` until A-5 ships).
- Application and tooling: `db/migrations/0005_plan_entries.sql`; `src/modules/plans/**` (3 files); `src/app/api/app/plan-entries/**` (3 route files) covering PLAN-01..PLAN-06; `src/app/plan/page.tsx` (A-6); `src/ui/forms/plan-{dialog,list}.tsx`; the plans entries in the container, the request schemas, the error catalogue, the UI copy, the nav and the coverage config.
- Tests: `tests/unit/plans.test.ts` (19 cases) and `tests/integration/plans.test.ts` (20 cases), taking the unit tier to 18 files and 95 tests and the integration tier to 9 files and 79 tests, plus the plan block in `tests/integration/support/api.ts` and an exams export assertion.

### Changed
- [07-roadmap/MILESTONES.md](07-roadmap/MILESTONES.md): three M05 rows with evidence checked, the Definition of Done row left partial, and an "As built" note recording what shipped, the two warning rules and the open rows.
- [03-architecture/ERROR-HANDLING.md](03-architecture/ERROR-HANDLING.md) section 4: `invalid_date_range` and the note that confirms the plan codes on the plan routes.
- [OPEN-DECISIONS.md](OPEN-DECISIONS.md), [IMPLEMENTATION-READINESS.md](IMPLEMENTATION-READINESS.md) sections 6 and 7, [README.md](../README.md), [docs/README.md](README.md), [DOCUMENTATION-INDEX.md](DOCUMENTATION-INDEX.md): build state, the M05 gate, the M05 execution row and the inventory at 93 documents (13 build records).
- Application and tooling: `src/kernel/{config,errors}.ts` (the plan limits and the five codes); `src/modules/exams/{public,service}.ts` (`upcomingExamsBySubject`); `src/server/{container,request-context}.ts` (the module and the schemas); `src/ui/{format,messages,nav}.ts`, `src/ui/dialog.tsx` and `src/ui/forms/exam-workspace.tsx`; `vitest.config.ts` (the plans floor).

### Fixed
- A `date` column returned as a JavaScript `Date` shifted the exported dates by the host offset in both contributors; `exportPlans` and `exportExams` now select `local_date::text` and `exam_date::text`, and the exams test pins the text shape.
- The filtered list had no way back: an empty result now reads "No planned sessions match these filters" and offers "Clear filters" (AC-FR-037-3).
- The mobile dialog stopped 38 px short of the viewport because the user-agent `max-height` capped the sheet; `PlanDialog` now sets `max-sm:max-h-dvh` with `max-sm:overflow-y-auto`.
- Tailwind v4 removed the pointer cursor that v3 put on buttons, so every enabled control read as non-interactive; a base rule now covers `button:not(:disabled)` and `[role="button"]:not([aria-disabled="true"])`, leaving disabled buttons and native selects alone.

### Results
- `npm run verify` exit 0: typecheck, `eslint .`, `Boundary check passed.`, 18 unit files and 95 tests, 9 integration files and 79 tests in 144.05 s.
- `npx next build`: 46 routes, 29 under `/api/app` of which 3 are M05's, plus `/plan`; no static and dynamic sibling conflict.
- `npm run test:coverage` exit 0: all three configured floors pass, the kernel at 94.94% lines, the exams module at 90.41% and the plans module at 94.57%; overall lines measure 49.96% because the UI layer is covered by the browser pass.
- Browser checks in Chromium at 360, 768, 1280 and 2560 px on the production build: A-6 with both warnings behind one confirmation, the overlap-only warning, the touching-interval case, the read-only past row, the missed mark, the three filters, the clear-filters action, the loading skeleton, the error panel with its retry, the keyboard paths and the full-height mobile sheet; no horizontal overflow at any of the four widths.
- A second `npm run verify` on the owner's commit `aff79f9` exited 0: 18 unit files and 95 tests in 12.12 s and 9 integration files and 79 tests in 204.14 s; the cursor rule above came after that commit and `npx next build` on it exited 0 in 37.93 s.

### Not changed
- No actual value, no `done` status, no session link, no plan generation, no calendar page, no to-do and no statistics behaviour; FR-036 and AC-FR-036-* stay with M06 (B-07), and nothing is committed or tagged by the build session.

## 2026-11-21, M04 exams (basic)

### Added
- [08-build/M04-EVIDENCE.md](08-build/M04-EVIDENCE.md): environment and versions, one section per checkpoint (E01 to E11) with the command and raw output, per-row checklist status, the browser measurements at four widths, the four defects found and fixed, the registry order, the derived archive state and the Definition of Done check.
- [08-build/M04-COMPLETION-REPORT.md](08-build/M04-COMPLETION-REPORT.md): functionality, files, database changes, tests executed, technical findings, known limitations, remaining tasks, documents updated, Definition of Done level and recommended next milestone.
- [OPEN-DECISIONS.md](OPEN-DECISIONS.md) section C: OD-M33 to OD-M35 (the derived archive state, the date-only edit on an archived exam and the unpaginated upcoming list). Section G: the 2026-11-21 M04 execution row, limited to M04 records and stating that M04 stays open.
- Application and tooling: `db/migrations/0004_exams_and_checklists.sql`; `src/modules/exams/**` (5 files); `src/app/api/app/exams/**` (4 routes); `src/app/exams/**` (2 pages); `src/ui/forms/exam-{dialog,list,workspace}.tsx`; the `exam_auto_archive` scheduled job registered in `src/worker/index.ts`.
- Tests: `tests/unit/exams.test.ts` (7 cases) and `tests/integration/exams.test.ts` (12 cases), taking the unit tier to 17 files and 76 tests and the integration tier to 8 files and 59 tests.

### Changed
- [07-roadmap/MILESTONES.md](07-roadmap/MILESTONES.md): three M04 rows with evidence checked, the Definition of Done row left partial, and an "As built" note recording what shipped, the derived archive rule and the open rows.
- [03-architecture/ERROR-HANDLING.md](03-architecture/ERROR-HANDLING.md) section 4: `invalid_page_size` and `invalid_cursor`, and the EC-008 row now names the checklist drop rather than a readiness note.
- [OPEN-DECISIONS.md](OPEN-DECISIONS.md), [IMPLEMENTATION-READINESS.md](IMPLEMENTATION-READINESS.md) sections 6 and 7, [README.md](../README.md), [docs/README.md](README.md), [DOCUMENTATION-INDEX.md](DOCUMENTATION-INDEX.md): build state, the M05 gate and the inventory at 91 documents (11 build records).
- Application and tooling: `src/kernel/{config,errors}.ts` (the exams limits, the queue name, the cron and two codes), `src/server/{container,request-context}.ts`, `src/ui/{control,messages,nav}.ts(x)`, `vitest.config.ts` (a `src/modules/exams/**` coverage floor beside the kernel one), `tests/integration/support/api.ts` and `tests/integration/profile.test.ts`.

### Fixed
- The exam list answered `topicCount` and `completedCount` as the driver's bigint strings; both counts now cast `::int`, with a regression case.
- A `date` column returned as a JavaScript `Date` shifted every countdown by one day outside UTC; every exam read now selects `exam_date::text`.
- The A-12 tablist used a roving tabindex with no arrow handler, so the Archived tab was unreachable by keyboard; both exam tabs now follow the ARIA arrow pattern.
- The exam list showed "No upcoming exams" during the request; a loading branch now renders five skeletons in an `aria-busy` region with a `role="status"` label.

### Results
- `npm run verify` exit 0: typecheck, `eslint .`, `Boundary check passed.`, 17 unit files and 76 tests, 8 integration files and 59 tests in 140.70 s against PostgreSQL 18.6.
- `npx next build`: 43 routes, 26 under `/api/app` of which 4 are M04's, plus `/exams` and `/exams/[examId]`; 28 static pages generated; no static and dynamic sibling conflict.
- `npm run test:coverage` exit 0: both configured floors pass, the kernel at 94.94% lines and 77.5% branches and the exams module at 89.93% lines and 87.15% branches; overall lines measure 50.12%, because the UI layer is covered by the browser pass, so the Definition of Done coverage item stays partial.
- Browser checks in Chromium at 360, 768, 1280 and 2560 px: A-12 and A-13 with their empty, loading and error states, the add, edit and change-date dialogs, the checklist tick, arrow-key tabs, the read-only archived exam and no horizontal overflow.

### Not changed
- No commit, no tag, no ADR Accepted, no vendor selected, no open-decision row closed and no requirement baseline approved.
- No readiness score, weight input or label (Phase 2), no plan, session, timer, statistic or note behaviour, and no paging widget on the archived list; M05 is not authorized.

## 2026-11-21, M03 subjects and topics

### Added
- [08-build/M03-EVIDENCE.md](08-build/M03-EVIDENCE.md): environment and versions, one section per checkpoint (E01 to E11) with the command and raw output, per-row checklist status, the browser measurements at four widths, the five defects found and fixed, five deviations and the Definition of Done check.
- [08-build/M03-COMPLETION-REPORT.md](08-build/M03-COMPLETION-REPORT.md): functionality, files, database changes, tests executed, technical findings, known limitations, remaining tasks, documents updated, Definition of Done level and recommended next milestone.
- [OPEN-DECISIONS.md](OPEN-DECISIONS.md) section C: OD-M27 to OD-M32 (the SUBJ-01 topic counts, the M05 archive guard, pointer drag, the archived-subject read-only rule, coverage floors and durable topic events). Section G: the 2026-11-21 M03 execution row, the same day's approval row answering the delivery report, both limited to M03 records and stating that M03 stays open.
- Application and tooling: `db/migrations/0003_subjects_and_topics.sql`; `src/modules/subjects/**` and `src/modules/topics/**`; `src/app/api/app/subjects/**` (8 routes) and `src/app/api/app/topics/**` (3); `src/app/subjects/**`; `src/ui/subject-dot.tsx`, `src/ui/dialog.tsx`, `src/ui/forms/subject-*.tsx` and `src/ui/forms/topic-*.tsx`.
- Tests: `tests/unit/subjects-topics.test.ts` (7 cases) and `tests/integration/subjects.test.ts` with `tests/integration/topics.test.ts` (11 and 9 cases), taking the unit tier to 16 files and 69 tests and the integration tier to 7 files and 47 tests.

### Changed
- [07-roadmap/MILESTONES.md](07-roadmap/MILESTONES.md): four M03 rows with evidence checked, the Definition of Done row left partial, an "As built" note recording what shipped, the deviations and the open rows, and the 2026-11-21 approval sentence answering the delivery report.
- [03-architecture/ERROR-HANDLING.md](03-architecture/ERROR-HANDLING.md) section 4 and [03-architecture/MODULE-BOUNDARIES.md](03-architecture/MODULE-BOUNDARIES.md) section 3: seven error codes, including the one retryable conflict, and the archive-guard verdict shape.
- [OPEN-DECISIONS.md](OPEN-DECISIONS.md), [IMPLEMENTATION-READINESS.md](IMPLEMENTATION-READINESS.md) sections 6 and 7, [README.md](../README.md), [docs/README.md](README.md), [DOCUMENTATION-INDEX.md](DOCUMENTATION-INDEX.md): build state, the M03 approval, the M04 gate and the inventory at 89 documents (9 build records).
- Application and tooling: `src/kernel/{config,errors,idempotency,registries}.ts` (the PostgreSQL idempotency store, the archive guard, the palette keys and limits), `src/server/{request-context,container}.ts`, `src/ui/{control,format,messages,nav}.ts(x)`, `src/ui/forms/feedback.ts`, `src/app/globals.css` (the ten subject tokens), `tests/integration/support/{api,ownership}.ts` and `tests/integration/profile.test.ts`.

### Results
- `npm run verify` exit 0: typecheck, `eslint .`, `Boundary check passed.`, 16 unit files and 69 tests, 7 integration files and 47 tests in 132.69 s against PostgreSQL 18.6.
- `npx next build`: 37 routes, 22 under `/api/app` of which 11 are M03's, plus `/subjects` and `/subjects/[subjectId]`; 26 pages generated; no static and dynamic sibling conflict.
- Browser checks in Chromium at 360, 768, 1280 and 2560 px: A-7 and A-8 with their empty, loading and error states, keyboard reorder, archive and restore, the paste preview and its 200-line cap, no horizontal overflow and no target between 24 and 44 px.

### Not changed
- No commit, no tag, no ADR Accepted, no vendor selected, no open-decision row closed and no requirement baseline approved.
- No session, timer, plan, to-do, note or exam behaviour, no pointer drag reorder and no readiness job; M04 is not authorized.

## 2026-11-20, M02 authentication and profile

### Added
- [08-build/M02-EVIDENCE.md](08-build/M02-EVIDENCE.md): environment and versions, one section per checkpoint with the command and raw output, per-row checklist status, eleven limitations and the Definition of Done check.
- [08-build/M02-COMPLETION-REPORT.md](08-build/M02-COMPLETION-REPORT.md): functionality, files, database changes, tests executed, technical findings, known limitations, remaining tasks, documents updated, Definition of Done level and recommended next milestone.
- [OPEN-DECISIONS.md](OPEN-DECISIONS.md) section C: OD-M24 (password-reset mail transport), OD-M25 (account-column export coverage) and OD-M26 (the ADR-004 amendment). Section G: the 2026-11-20 M02 execution row and the approval row answering the delivery report, both limited to M02 records and stating that M02 stays open.
- Application and tooling: `src/kernel/{crypto,http,rate-limit,jobs}.ts`; `src/modules/auth/**` (8 files), `src/modules/profile/**` (2), `src/modules/notifications/public.ts`; `src/server/{container,request-context,session}.ts`; `src/app/api/app/auth/**` (9 routes), `src/app/api/app/profile/**` (2), `src/app/api/auth/callback/google/route.ts`; `src/app/{page,login,signup,forgot-password,reset-password,welcome,settings}/**`; `src/ui/**` with `src/ui/forms/**`; `db/migrations/0002_auth_and_profile.sql`; the `auth_cleanup` scheduled job registered in `src/worker/index.ts`.
- Tests: five unit files (`auth-password`, `auth-device-label`, `auth-google-state`, `rate-limit`, `profile-defaults`), taking the unit tier to 15 files and 59 tests; three integration files (`auth`, `profile`, `auth-cleanup`) with `tests/integration/support/{api,environment,ownership}.ts`, taking the integration tier to five files and 27 tests.

### Changed
- [07-roadmap/MILESTONES.md](07-roadmap/MILESTONES.md): the four M02 rows with evidence checked, the three open rows left unchecked, and an "As built" note recording what shipped and what is deferred.
- [OPEN-DECISIONS.md](OPEN-DECISIONS.md), [IMPLEMENTATION-READINESS.md](IMPLEMENTATION-READINESS.md) sections 6 and 7: the M02 execution state, the open M02 rows and the M03 gate.
- [README.md](../README.md), [docs/README.md](README.md), [DOCUMENTATION-INDEX.md](DOCUMENTATION-INDEX.md): build state and the inventory at 87 documents (7 build records).
- `.env.example`: the email sink, the optional Google variables and the trusted proxy hops. `.gitignore`: local run output under `.artifacts/` is ignored, except the tracked M00 OpenAPI diff.

### Results
- `npm run verify` exit 0: typecheck, `eslint .`, `Boundary check passed.`, 15 unit files and 59 tests, 5 integration files and 27 tests against PostgreSQL 18.6.
- `npx next build`: 24 route entries; every route is dynamic because the root layout reads the session and theme cookies.
- Browser checks in Chromium: sign-up, sign-in, sign-out, profile save, six of six theme switches, sign-in management, the age gate, three guard redirects, zero targets under 44 px and zero horizontal overflow on eight pages at 360, 768, 1280 and 2560 px, no console errors.

## 2026-11-19, M01 project foundation

### Added
- [08-build/M01-EVIDENCE.md](08-build/M01-EVIDENCE.md): environment and versions, one section per CI stage and runtime check with the command and raw output, per-row checklist status, nine limitations and the Definition of Done check.
- [08-build/M01-COMPLETION-REPORT.md](08-build/M01-COMPLETION-REPORT.md): functionality, files, database changes, tests executed, technical findings, known limitations, remaining tasks, documents updated, Definition of Done level and recommended next milestone.
- [OPEN-DECISIONS.md](OPEN-DECISIONS.md) section G: the 2026-11-20 row recording the M01 execution and close-out, limited to M01 records and stating that M01 stays open.
- Application and tooling: `src/kernel/{config,env,errors,idempotency,logger,outbox,registries,time}.ts`, `src/app/{layout,error,not-found}.tsx` with `globals.css`, `src/app/api/health/route.ts`, `src/app/unsupported-browser/page.tsx`, `src/ui/shell.tsx`, `src/ui/focus-heading.tsx`, `src/ui/nav.ts`, `src/worker/index.ts`, `tools/boundaries.ts`, `scripts/{check-boundaries,apply-migrations}.ts`, `db/migrations/0001_shared_kernel.sql`, `Dockerfile`, `.github/workflows/ci.yml`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `vitest.config.ts`, `.env.example`, `README.md`.
- Tests: 10 unit files (35 tests) and two integration files (6 tests) plus the boundary fixtures.

### Changed
- [07-roadmap/MILESTONES.md](07-roadmap/MILESTONES.md): M01 rows with evidence are checked and an "As built" note records the deferred deliverables; M11 and M14 dependencies, the M02 database list and acceptance rows, and the M05 and M06 requirement split were corrected.
- [03-architecture/MODULE-BOUNDARIES.md](03-architecture/MODULE-BOUNDARIES.md): section 8 now records the implemented checker and its fixtures; section 7 no longer claims no files exist in the phase.
- [04-database/DATA-DICTIONARY.md](04-database/DATA-DICTIONARY.md): `idempotency_keys` records that it ships in M02 with the `users` foreign key.
- [README.md](README.md), [DOCUMENTATION-INDEX.md](DOCUMENTATION-INDEX.md), [IMPLEMENTATION-READINESS.md](IMPLEMENTATION-READINESS.md) and [OPEN-DECISIONS.md](OPEN-DECISIONS.md): inventory at 84 documents, M01 authorization and scope.

### Results
- Boundaries, typecheck, lint, 35 unit tests, 6 integration tests and the production build pass on Node 24.13.1, TypeScript 6.0.3, Next.js 16.4.6, pg-boss 12.38.2, PostgreSQL 18.6 (embedded).
- The worker dispatches a committed outbox row exactly once; a rollback leaves no row; a duplicate `idempotency_key` is rejected by the database.
- The shell and the three system pages answer in Chromium at 360 px and 1280 px with no horizontal scroll, contrast above 7:1, a working skip link and no console errors.

### Not changed
- No ADR is Accepted, no open-decision row is closed, no vendor is selected and no requirement baseline is approved.
- No product page, no module directory and no user table exists; M02 is not authorized.
- Stage 8 (staging deploy), stage 5 (preview environment), axe and the container image build are unexecuted; each names its cause in the evidence file.

## 2026-11-18, M00 close-out

### Added
- [08-build/M00-COMPLETION-REPORT.md](08-build/M00-COMPLETION-REPORT.md): M00 functionality, files, database changes, tests, results, limitations, remaining tasks and next milestone.
- [08-build/M00-EVIDENCE.md](08-build/M00-EVIDENCE.md): teardown results and the secret-scan record.

### Changed
- Added M00 evidence sections to [ADR-004](adr/ADR-004-authentication.md), [ADR-005](adr/ADR-005-background-jobs.md), [ADR-008](adr/ADR-008-api-strategy.md) and [ADR-009](adr/ADR-009-deployment-platform.md). Every status stays Proposed.
- Updated [DATABASE-DESIGN.md](04-database/DATABASE-DESIGN.md), [OPENAPI-PLAN.md](06-api-integrations/OPENAPI-PLAN.md), [EXTERNAL-INTEGRATIONS.md](06-api-integrations/EXTERNAL-INTEGRATIONS.md) and [TECHNOLOGY-DECISIONS.md](03-architecture/TECHNOLOGY-DECISIONS.md) with the local evidence and the vendor gaps.
- Added the OD-S02 to OD-S06 evidence table and the close-out record to [OPEN-DECISIONS.md](OPEN-DECISIONS.md); no row was closed.
- Updated [MILESTONES.md](07-roadmap/MILESTONES.md), [IMPLEMENTATION-READINESS.md](IMPLEMENTATION-READINESS.md), [README.md](README.md) and [DOCUMENTATION-INDEX.md](DOCUMENTATION-INDEX.md) for the results and the 83-document inventory.

### Results
- TS-01, TS-02, TS-04 and TS-05 PASS. TS-03, TS-06, TS-07 and TS-09 PARTIAL. TS-08 DEFERRED.
- The spike worktree and branch were deleted; the scratch database and local environment file were removed; the evidence survived.
- The secret scan found no environment secret value in tracked files. The main commit advanced to `c8f151e` and contains no spike source.

### Not changed
- No ADR is Accepted, no OD-S02 to OD-S06 row is closed, no vendor is selected, no requirement baseline is approved, and no production code, migration or seed exists. M01 and Build Mode remain unauthorized.

## 2026-11-18, M00 charter approved

### Added
- [08-build/M00-IMPLEMENTATION-PLAN.md](08-build/M00-IMPLEMENTATION-PLAN.md): approved M00 charter, requirements mapping, scope, 14-task checklist, order, test protocols, documentation changes and risks.
- [08-build/M00-EVIDENCE.md](08-build/M00-EVIDENCE.md): evidence template for the nine protocols.

### Changed
- Recorded M00 authorization in [OPEN-DECISIONS.md](OPEN-DECISIONS.md) section G and in the [IMPLEMENTATION-READINESS.md](IMPLEMENTATION-READINESS.md) gate model.
- Updated the inventory counts in README.md and DOCUMENTATION-INDEX.md for the new build record.

### Not changed
- No ADR is Accepted, no requirement or baseline is approved, no application code or migration exists, and no milestone other than M00 is authorized.

## 2026-11-17, Phase 8 audit refresh

Audit basis: commit `8e9ef3c` plus the working-tree documentation state.

### Changed
- Corrected the inventory to 80 Markdown documents: 73 baseline documents and 7 Phase 8 documents.
- Replaced unsupported 100% readiness and 92% clean-FR claims with a reproducible trace metric and categorical gate result.
- Reclassified global, M00 and milestone-specific blockers to remove the D-01/D-02/M00 authorization cycle.
- Expanded the final review and open-decision register with product, timer, privacy, recovery, UI, API, security and testing blockers found in the full audit.
- Marked unsupported and inherited trace links explicitly; no proposed requirement or architecture decision was approved or changed.

### Findings
- Verdict remains: not ready for Build Mode.
- The refreshed report consolidates blockers into 12 critical categories.
- Strict Flow00 trace completeness is 66.5% (`654 / 984`) before inherited design and entity context is accepted as row-level evidence.
- Approval evidence is `0 / 80`; critical product, security, timer, deletion/recovery and milestone-contract decisions remain open.

## Initial Phase 8 audit snapshot

### Added
- README.md, DOCUMENTATION-INDEX.md, IMPLEMENTATION-READINESS.md, FINAL-ARCHITECTURE-REVIEW.md, OPEN-DECISIONS.md, this CHANGELOG.md.
- TRACEABILITY-MATRIX.md: 164 requirements linked to module, tables, endpoints, pages, milestone, acceptance criteria and planned test cases.

### Changed
- None. No approved document was edited. All corrections are recommendations in FINAL-ARCHITECTURE-REVIEW.md and OPEN-DECISIONS.md awaiting owner approval.

### Findings
- Initial snapshot recorded 6 critical and 31 major findings. The 2026-11-17 full audit supersedes those counts and retains the same not-ready verdict.

## Earlier phases (from repository history)

| Phase | Content |
|---|---|
| 1 | Product discovery and requirement analysis |
| 2 | PRD, functional and non-functional requirements, acceptance criteria |
| 3 | SDD, system architecture, ADR-001..011 |
| 4 | Database design and ERDs |
| 5 | UI/UX and design system |
| 6 | API and external integration design |
| 7 | Development roadmap and implementation plan |
