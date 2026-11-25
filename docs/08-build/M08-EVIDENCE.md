# M08 Evidence

> Status: executed 2026-11-25 on `main`; build work tree `D:/Portofolio/Lumora`. Every command below was run in this session and outputs are pasted as observed. The milestone record is [M08-COMPLETION-REPORT.md](M08-COMPLETION-REPORT.md); the milestone card is [MILESTONES.md](../07-roadmap/MILESTONES.md) M08.

## Rules

- One section per checkpoint. Paste the exact command and the observed output.
- Record runtime, library and database versions.
- State pass or fail against the M08 checklist row. On fail or partial, name the cause and the row that stays unchecked.
- A row with no evidence stays unchecked in [MILESTONES.md](../07-roadmap/MILESTONES.md).
- No secret, token or personal data appears here.

## Checklist status

| M08 completion row | State | Evidence |
|---|---|---|
| Set, change, remove goals; progress and goal-met reflect real sessions | PASS | E03: the pure rules answer 20 unit cases: the row in force for a day, the earliest row before the history starts, the configured default on an empty history, whole percent, the met boundary and the crossing rule. E04: 15 integration cases over GOAL-01..GOAL-05, including the 120-minute row AUTH-01 seeds (AC-FR-070-1), the range refusal (EC-023), subject targets with the archived suspension (AC-FR-071-4), progress from a midnight-crossing session and from a live timer run (AC-FR-072-2, AC-FR-072-4), the once-per-day `GoalMet` (AC-FR-073-1..4) and the purge and export registries. E06: the goal line on A-3 and the goal controls on A-15 and A-8 were driven in a production build |
| Changes apply from today forward only | PASS | E04: a change written after a session on a past day leaves that day's target alone and answers the new target from today; a second change on the same day upserts the same history row rather than leaking an entry into the past (AC-FR-074-3, EC-005); raising the target re-evaluates today at once (AC-FR-074-2). E03 pins `targetForDay` against unsorted history |
| Purge handler and export contributor registered | PASS | E07: `purgeHandlers.keys()` is `["profile", "auth", "exams", "plans", "timer", "sessions", "goals", "topics", "subjects"]` and `exportContributors.keys()` is `["profile", "exams", "plans", "timer", "sessions", "goals", "subjects", "topics"]`; E04 asserts the handler's row count and the `"goals"` export section with its daily and subject rows |
| DEFINITION-OF-DONE.md checked | PARTIAL | E08: every milestone-level item is evaluated. Two rows stay partial and one is the owner's: the by-layer coverage floors (OD-M31, unchanged since M01), the axe and screen-reader half of the accessibility row because no browser-automation dependency is installed in this tree, and the `m08-done` tag, which the owner creates. M08 adds no new page and no new live region |

## Environment and versions

| Item | Observed value |
|---|---|
| Runner | Windows 10.0.26200, x64 |
| Node.js | v24.13.1 |
| npm | 11.8.0 |
| Repository | `D:/Portofolio/Lumora`, branch `main`, HEAD `178208d` (`push Migrate goals M08`), with the M08 remainder uncommitted; nothing in this session was committed, staged or tagged |
| Next.js | 16.4.6 |
| React and React DOM | 19.3.1 |
| TypeScript | 6.0.3 |
| vitest | 5.1.1 |
| ESLint | 10.15.0 (flat config, `typescript-eslint` 8.73.0) |
| Tailwind CSS | 4.3.5 |
| pg | 8.23.1 |
| zod | 4.6.7 |
| embedded-postgres | 18.6.0-beta.19 |
| PostgreSQL | 18.6, embedded. The integration suite starts its own instance on a free ephemeral port; the browser run used port 55433 through `.artifacts/pg-dev.ts` with all eight migrations applied, `0008_goals.sql` included |
| Browser used for the runtime checks | managed Chromium through the omp browser device, viewport 360, 768, 1280 and 2560 wide |
| Browser account | `goals-check@example.com` with the profile zone `UTC`, created through the signup form; the subject `Algebra` with the topic `Quadratics` |

Host clock is UTC+07. The browser profile zone is UTC, so every instant in E06 is the UTC instant.

## E01 Typecheck, lint, boundaries and the full suite

- Requirement: the tree proves itself (DEFINITION-OF-DONE section 2) and the M08 card's test row.
- Command: `npm run verify`, which is `npm run typecheck && npm run lint && npm run boundaries && npm run test && npm run test:integration`.
- Result: exit 0. Output as observed:

```
> lumora@0.1.0 typecheck
> tsc --noEmit

> lumora@0.1.0 lint
> eslint .

> lumora@0.1.0 boundaries
> tsx scripts/check-boundaries.ts

Boundary check passed.

> lumora@0.1.0 test
> vitest run --project unit

 Test Files  21 passed (21)
      Tests  136 passed (136)
   Start at  21:33:18
   Duration  20.33s (import 87%, tests 9%, transform 3%, worker 1%)

> lumora@0.1.0 test:integration
> vitest run --project integration

 Test Files  12 passed (12)
      Tests  134 passed (134)
   Start at  21:33:42
   Duration  411.42s (tests 78%, import 21%)
```

- Log: `.artifacts/verify-m08-final.log`. The M08 additions inside those counts are `tests/unit/goals.test.ts` (20 cases, E03) and `tests/integration/goals.test.ts` (15 cases, E04); the other 251 cases are the M01 to M07 suites, unchanged.
- The boundary check passed with the new `GOAL --> TIM` edge that `src/modules/goals/service.ts` needs for AC-FR-072-2: the goals module reads the running run's measured focus to answer today's progress, and Timer is rank 8, so the module-boundaries table allows the edge rather than reporting it.
- One earlier run of the same command (`.artifacts/verify-m08.log`) was green through every suite and then exited non-zero on the embedded PostgreSQL teardown (`EBUSY ... rmdir ...lumora-pg-*` on Windows); the rerun recorded here passed, and no test or check differs between the two runs.

## E02 Production build

- Requirement: the milestone ships in a production build (DEFINITION-OF-DONE section 2).
- Command: `npx next build`.
- Result: exit 0. Output as observed:

```
▲ Next.js 16.4.6 (Turbopack)
- Environments: .env.local
✓ Running next.config.ts took 406ms
✓ Compiled successfully in 14.6s
  Finished TypeScript in 24.9s
✓ Generating static pages using 7 workers (44/44) in 1653ms
```

- Log: `.artifacts/build-m08.log`; wall time 66.43 s. The route table holds 62 lines, five of them new in M08: `ƒ /api/app/goals`, `ƒ /api/app/goals/daily`, `ƒ /api/app/goals/progress`, `ƒ /api/app/goals/subjects/[subjectId]` and `ƒ /settings/study`. No warning line other than the standard build output.
- The build turns the browser checks in E06 into checks against the production server: the same artifacts were served by `npx next start -p 3000`, not by `next dev`.

## E03 Unit tests

- Requirement: the M08 card's test row (`effective-date lookup, goal-met`).
- Command: `npx vitest run --project unit tests/unit/goals.test.ts`.
- Result: 1 file passed, 20 tests passed. The suite drives the exported pure helpers with no database.

| Case | What it pins |
|---|---|
| takes the last row on or before the day, whatever order the rows arrive in | `targetForDay` scans rather than assuming ordered history (BR-015) |
| keeps the earliest row for a day before the history starts | a past day falls back to the earliest target its history knows |
| answers the configured default for an empty history, without writing one | no lazy row is created on read; config supplies 120 |
| answers the effective date of the row in force, not the day asked for | GOAL-01 names the date the target started |
| rounds to whole percent, so 30 of 80 minutes reads 38 | `percentOf` rounds half up |
| never clamps above 100 | a day past its target answers more than 100 (FR-072) |
| is 0 before any minute is recorded | the empty day |
| is met at exactly the target (AC-FR-073-1) | `isGoalMet` at the boundary |
| is not met one minute short (AC-FR-073-2) | `isGoalMet` one below |
| publishes on the write that reaches the target | `goalMetCrossed` true when the total lands at the target |
| does not publish on a later write on an already met day | the once-per-day rule (FR-073) |
| publishes when a lowered target makes the day met (AC-FR-074-2) | a target change is a crossing too |
| does not publish when a raised target un-meets the day | raising the target is not a crossing |
| accepts the bounds (AC-FR-070-3) | 5 and 1440 are whole minutes inside the range |
| refuses 4, 1441, 0, -1, 1.5 and NaN with `goal_out_of_range` | six table cases over `assertTargetMinutes`, with `details` naming 5 and 1440 |

## E04 Integration tests

- Requirement: the M08 card's test rows, AC-E2E-06 and the ownership contract.
- Command: `npx vitest run --project integration tests/integration/goals.test.ts`.
- Result: 1 file passed, 15 tests passed, against PostgreSQL 18.6 with the test database migrated through `0008_goals.sql`. The cases run inside transactions that are rolled back, so the suite leaves no rows.

What the 15 cases cover, by area:

| Area | Cases |
|---|---|
| AUTH-01 starting goal | a new account answers `{ targetMinutes: 120, effectiveFrom: <registration local date> }` and holds exactly one history row (AC-FR-070-1); signing up again with the same user in a new transaction does not reset an edited target, so the seed is guarded by `WHERE NOT EXISTS` |
| GOAL-01 read | the daily target is the row in force today; subject goals answer in the caller's subject order with `subjectArchived` |
| GOAL-02 write | a change answers `{ targetMinutes, effectiveFrom: today }`, today reads the new target, a past day keeps the target in force on it (AC-FR-074-3) and a second change on the same day rewrites that day's row instead of adding one (EC-005); 4, 1441, 0 and a decimal answer 400 `goal_out_of_range` with `details` naming 5 and 1440, a string answers 400 `validation_failed`; a foreign origin answers 403 `csrf_rejected` |
| GOAL-03 and GOAL-04 | setting, listing and removing a target per subject, with the overall goal unchanged (AC-FR-071-2); a 409 `subject_archived` on an archived subject while the target it kept is suspended from `GoalProgress.subjects` (AC-FR-071-4) and comes back on restore; a foreign subject answers 404 `not_found`; the range is refused |
| GOAL-05 progress | a midnight-crossing session is split across the two frozen local dates (AC-FR-072-4, BR-014); a running stopwatch counts its measured focus and stops double counting once it is closed (AC-FR-072-2, AC-FR-073-1); a profile zone change leaves past dates frozen and moves "today" to the new zone; `2026-13-01`, `yesterday` and a full instant answer 400 `validation_failed` |
| GoalMet | the write that crosses the target publishes one `GoalMet` with the day, the minutes and the target in force, a later write on a met day publishes nothing, a delete publishes nothing (AC-FR-073-4) and the day reads as not met again, and lowering the target to a reached value publishes at once (AC-FR-074-2) |
| Ownership and registries | every read and write is scoped by `user_id`; the purge handler deletes the user's history and subject goals and answers the row count; the export contributor answers the `"goals"` section with a `daily` row and a `subject` row |

## E05 Coverage

- Requirement: DEFINITION-OF-DONE section 2 ("Coverage floors met ... and not lower than before"); the M08 card adds the `src/modules/goals/**` floor.
- Command: `npm run test:coverage` (`vitest run --coverage`, both projects).
- Result: exit 0, 33 test files / 270 tests in 442.85 s, so all five per-path floors (kernel, exams, plans, timer, goals) were met. Log: `.artifacts/coverage-m08.log`.

| Scope | % Stmts | % Branch | % Funcs | % Lines | Floor | State |
|---|---|---|---|---|---|---|
| `src/modules/goals/**` | 94.17 | 84.48 | 94.11 | 96.73 | 80 / 70 / 70 / 80 | PASS |
| `src/kernel/**` | 88.95 | 77.16 | 89.28 | 93.92 | 80 / 70 / 70 / 80 | PASS |
| All files | 49.25 | 37.58 | 47.58 | 50.25 | none | recorded |

Per file in the goals module:

| File | % Stmts | % Branch | % Funcs | % Lines | Uncovered |
|---|---|---|---|---|---|
| `src/modules/goals/service.ts` | 96.2 | 88.63 | 93.33 | 98.61 | line 343 |
| `src/modules/goals/subscribe.ts` | 94.11 | 90 | 100 | 100 | line 23 |
| `src/modules/goals/events.ts` | 71.42 | 25 | 100 | 71.42 | lines 38-39 |
| `src/modules/goals/public.ts` | 100 | 100 | 100 | 100 | none |

The four GOAL route files, measured by name from a JSON summary run of the goals suite
(`npx vitest run tests/integration/goals.test.ts --coverage --coverage.reporter=json-summary --coverage.reportsDirectory=.artifacts/cov-goals-json`;
that run exits 1 on purpose, because the isolated suite leaves the other modules' floors unmet and it is not the gate):

| Route | % Stmts | % Branch | % Funcs | % Lines |
|---|---|---|---|---|
| `src/app/api/app/goals/route.ts` (GOAL-01) | 100 | 100 | 100 | 100 |
| `src/app/api/app/goals/daily/route.ts` (GOAL-02) | 100 | 100 | 100 | 100 |
| `src/app/api/app/goals/progress/route.ts` (GOAL-05) | 100 | 83.33 | 100 | 100 |
| `src/app/api/app/goals/subjects/[subjectId]/route.ts` (GOAL-03, GOAL-04) | 95.23 | 75 | 100 | 100 |

The text report of the full run lists the `progress` and `subjects/[subjectId]` rows and drops the
other two names, which the JSON summary shows at 100%; the routes are proven either way, and the
gate is the module floor above, not the per-route row. The unanswered branch in GOAL-05 is the
`isRealLocalDate` rejection already covered from the unit side, and the missing line in GOAL-03/04
is the same-day rewrite the integration suite reaches through GOAL-02.

## E06 Browser pass

- Requirement: the milestone ships on a production build, the goal controls work in a real browser and no surface scrolls sideways at 360 px (DEFINITION-OF-DONE section 2, NFR-051).
- Environment: `npx next start -p 3000` serving the E02 build, against the development PostgreSQL on port 55433 with all eight migrations applied. Managed Chromium through the omp browser device at 360x640, 768x1024, 1280x900 and 2560x1440. Account `goals-check@example.com`, created through the signup form, profile time zone set to `UTC` on `/settings/profile` before any goal was set. Host clock UTC+07.

| Step | Observed |
|---|---|
| A-15 default | `/settings/study` renders the Daily goal panel with 120 in the minutes field (the row AUTH-01 seeds, AC-FR-070-1) and "Today: 0 of 120 min, 0%" |
| A-15 change | 120 to 30 saves and the panel answers "Goal saved. It applies from today onward; past days keep the goal they had." with the line reading "Today: 0 of 30 min, 0%"; a reload keeps 30 in the field and in the line |
| A-15 refusal | 4 is refused in place with "Choose a whole number of minutes from 5 to 1440." on the field and no write |
| A-8 empty and set | the subject workspace answers "No goal for this subject."; 15 saves to "Goal 15 min, today 0 of 15 min, 0%" and the button becomes "Update goal" beside "Remove" |
| A-8 archived | archiving Algebra replaces the controls with "Goal 15 min. It is suspended while the subject is archived." and no field or button remains (AC-FR-071-4); the restore returns the controls and the goal reads "today 0 of 15 min, 0%" again |
| A-4 session | a manual session on Wednesday 25 November, 10:00 to 10:40, 40 minutes is recorded against Algebra |
| A-15 progress | the same panel now reads "Today: 40 of 30 min, 133% · Goal met" (percent not clamped, FR-072) |
| A-3 line | `/timer` shows the same line, "Today: 40 of 30 min, 133% · Goal met", beside "Edit goal" |
| A-3 dialog | the dialog opens with the target in its field; 5 saves and both A-3 and A-15 re-render to "Today: 40 of 5 min, 800% · Goal met" |
| A-8 progress | the subject panel reads "Goal 15 min, today 40 of 15 min, 267% · Goal met" |

Layout, `documentElement.scrollWidth` against `innerWidth`:

| Viewport | Surface | scrollWidth / innerWidth | `main` width | widest right edge |
|---|---|---|---|---|
| 360 | `/settings/study` | 360 / 360 | 360 | 360 |
| 360 | `/subjects/[subjectId]` | 360 / 360 | 360 | 344 |
| 360 | `/timer` | 360 / 360 | 360 | 344 |
| 768 | `/settings/study` | 768 / 768 | 768 | 760 |
| 768 | `/subjects/[subjectId]` | 768 / 768 | 768 | 744 |
| 768 | `/timer` | 768 / 768 | 768 | 744 |
| 1280 | `/settings/study` | 1280 / 1280 | 1152 | 1192 |
| 1280 | `/subjects/[subjectId]` | 1280 / 1280 | 1152 | 1120 |
| 1280 | `/timer` | 1280 / 1280 | 1152 | 1192 |
| 2560 | `/settings/study` | 2560 / 2560 | 1152 | 1832 |
| 2560 | `/subjects/[subjectId]` | 2560 / 2560 | 1152 | 1760 |
| 2560 | `/timer` | 2560 / 2560 | 1152 | 1832 |

No width scrolls sideways. The widest edge at 2560 belongs to the two-column shell the M02 settings
layout and the M03 workspace share (`lg:flex lg:gap-10`), measured on `/settings/study` as spanning
728 to 1832 inside a `main` that spans 704 to 1856, so it is inside the page and not a goal control
overflowing.

Targets at 360 px (NFR-051, every value in CSS pixels):

| Control | Measured |
|---|---|
| A-15 minutes field | 286 x 44 |
| A-15 "Save goal" | 97 x 44 |
| A-15 "Edit timer durations" | 169 x 44 |
| A-8 minutes field | 286 x 44 |
| A-8 "Update goal" / "Remove" | 115 x 44 / 89 x 44 |
| A-3 "Edit goal" | 94 x 44 |

## E07 Registries

- Requirement: the M08 card's "Purge handler and export contributor registered" row and DEFINITION-OF-DONE section 2.
- Command and observed output:

```
node --env-file=.env.local --import tsx -e "import { container } from './src/server/container.ts'; import { purgeHandlers, exportContributors } from './src/kernel/registries.ts'; container(); console.log('purge', JSON.stringify([...purgeHandlers.keys()])); console.log('export', JSON.stringify([...exportContributors.keys()]));"
purge ["profile","auth","exams","plans","timer","sessions","goals","topics","subjects"]
export ["profile","exams","plans","timer","sessions","goals","subjects","topics"]
```

- `"goals"` sits between `sessions` and `topics` in both lists. The order is a rule, not a habit: `subject_goals` holds a composite foreign key to `subjects` with `ON DELETE NO ACTION`, so the goals purge must run before the topics and subjects purges on the same connection. `tests/integration/goals.test.ts` asserts the handler's row count and that the contributor answers a `"daily"` row and a `"subject"` row; `tests/integration/profile.test.ts` asserts both key lists in both orders.

## E08 Definition of Done

Milestone level, [DEFINITION-OF-DONE.md](../07-roadmap/DEFINITION-OF-DONE.md) section 2:

| Item | State | Evidence |
|---|---|---|
| All acceptance criteria ids pass | PASS | FR-070 to FR-074 and AC-E2E-06 are mapped to the 35 cases of E03 and E04 and to the ten browser steps of E06; each row of the M08 checklist names its criteria |
| Every FR in scope has implemented behavior | PASS | FR-070 to FR-074 across GOAL-01..GOAL-05, A-15, A-8 and A-3; no stub, placeholder, mock or `TODO` is left in `src/modules/goals/**`, `src/app/api/app/goals/**` or the four new form files |
| Tests per the TESTING-STRATEGY matrix are green | PASS | E01: unit 136 and integration 134, both green, of which 20 and 15 are M08 |
| Typecheck, lint and boundary check pass | PASS | E01 |
| Coverage floors met and not lower than before | PARTIAL | E05: the `src/modules/goals/**` floor (80 / 70 / 70 / 80) is met at 94.17 / 84.48 / 94.11 / 96.73 and the kernel floor still passes. The by-layer floors this item names (domain 90%, application 80%, overall 80%) are still neither enforced nor met, which is the OD-M31 gap M01 to M07 recorded and M08 did not close |
| Ownership contract test per new resource | PASS | E04: every GOAL read and write is scoped by `user_id`, and the daily history and subject goals of another account are invisible through GOAL-01 and GOAL-05 |
| Purge handler and export contributor per new user-data table | PASS | E07; one handler and one contributor cover both new tables under `section: "goals"` |
| Idempotency and concurrency requirements verified | PASS | API-ENDPOINTS names no `If-Match` and no `Idempotency-Key` for GOAL-01..GOAL-05, so there is no conditional request to test: the writes are last-write-wins, and E04 asserts that a second change on the same local day rewrites that day's row rather than adding one (EC-005) |
| Migrations apply from an empty database and from the previous schema | PASS | The integration environment migrates an empty database through all eight migrations on every run (E04). The previous-schema path was probed separately: `.artifacts/m08-backfill-probe.mjs` created a scratch database, applied `0001` to `0007`, inserted a user created `2026-11-20 18:30 UTC` with the zone `Asia/Jakarta`, then applied `0008_goals.sql` three times. Observed: the backfill wrote one row, `effective_from` `2026-11-21` with 120 minutes; a second run added no row; an edited target of 45 minutes survived a re-run. Log `.artifacts/m08-backfill.log`, scratch database dropped afterwards |
| Accessibility: axe zero serious or critical, manual keyboard pass, no horizontal scroll at 360 px | PARTIAL | No horizontal scroll at any of the four widths (E06). axe cannot run in this tree (no browser-automation dependency, the same gap M01 to M07 recorded) and no screen reader was driven; the new controls are native `input`, `button` and dialog controls with labels, hints and `role="alert"` errors, and A-3 adds no live region |
| Error, empty and loading states implemented | PASS | A-15 and A-8 each render a loading line, A-8 an empty line ("No goal for this subject."), and both refuse an out-of-range value on the field; each of the four new form surfaces carries a form-level `role="alert"` for a failed write (driven in the browser for the field refusal, present but not driven for the write failure) |
| Structured logs carry no secrets or note content | PASS | M08 adds no log line of its own; the goals service and subscriber log nothing, and the redaction tests of M01 are unchanged and green |
| Docs updated: SDD, DATA-DICTIONARY, API-ENDPOINTS, PAGE-SPECIFICATIONS as affected | PASS | The two tables implement DATA-DICTIONARY section 11 without changing it, and the routes implement API-ENDPOINTS GOAL-01..GOAL-05 as written; the documents M08 changed are listed in section 10 of the record |
| REQUIREMENT-TRACEABILITY updated | PASS | FR-070 to FR-074 were already mapped (section (a) under PG-3 / UN-2) and M08 changes no requirement, so the map needed no row |
| MILESTONES.md checklist fully checked | PARTIAL | Three of the four rows are checked; the Definition of Done row stays unchecked, which is what this table explains |
| Completion report produced in the Build Mode format | PASS | [M08-COMPLETION-REPORT.md](M08-COMPLETION-REPORT.md) |
| No future-phase feature code is reachable | PASS | M08 is MVP: both tables, both route groups and the goal UI are unconditional and reachable, and nothing of M09 or later is added or flagged |
| Tag `m08-done` created | NOT DONE | The owner commits and tags; nothing in this session was committed, staged or tagged |

Task level, [DEFINITION-OF-DONE.md](../07-roadmap/DEFINITION-OF-DONE.md) section 1: the change stays inside M08, stage 1 to stage 4 pass (E01), inputs are validated on the server with the documented codes (`goal_out_of_range`, `validation_failed`, `subject_archived`, `not_found`, `csrf_rejected`, all asserted in E04), no secret or personal data reaches a log or a fixture, no `TODO` or stub is left, the touched documents are updated, and the milestone record was written for review. Stage 5, the squash merge, is the owner's.

## Defects found and fixed in this pass

Two defects and one harness repair; each is described with its cause and the case that now pins it in section 7 of [M08-COMPLETION-REPORT.md](M08-COMPLETION-REPORT.md).

| Defect | Cause | Fix and the case that pins it |
|---|---|---|
| `GoalMet` never fired from a session write | the event is published inside the route's transaction, and the container's Goals subscriber read `study_session_days` on its own connection, which could not see the uncommitted rows, so it returned early | the subscriber receives the write's connection (`publishSessionEvent(event, database)`, OD-M46) and the container forwards `writeDatabase`; the integration case that crosses a target through POST `/api/app/sessions` is the regression |
| GOAL-05 answered 500 for `2026-13-01` | `isLocalDate` matches the shape of a date only, so the value reached PostgreSQL and failed there | the kernel's `isRealLocalDate` rejects a date the calendar does not have, GOAL-05 uses it and Study plans dropped its private copy (OD-M49); the integration case asserts the 400 |
| Three integration cases did not compile against the M07 contracts | the cases were written before the harness followed `stopTimer`'s five arguments, the sessions list schema or the list's paging | `stopTimer(..., started.version, { ...context, now }, null)`, `sessionListSchema` for the list, and `?limit=25`; no product code changed |
