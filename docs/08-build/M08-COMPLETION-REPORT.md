# M08 Completion Report

> Status: M08 execution record, 2026-11-25, awaiting the owner's approval and tag. Commands, raw output, the browser measurements and the defects found are in [M08-EVIDENCE.md](M08-EVIDENCE.md). M08 is built and verified; its DoD row stays partial because the by-layer coverage floors the document names are still not enforced beyond the module floor M08 added, axe cannot run in this tree and no screen reader was driven, and the tag is the owner's step. No ADR is Accepted, no vendor is selected, no OD row is closed, and nothing is committed, staged or tagged by me.

## 1. Executive summary

M08 adds goals: the target a day is measured against. Two tables arrive in migration `0008_goals.sql`. `daily_goal_history` keys the overall target by `(user_id, effective_from)`, so a change is a dated row rather than a version column and past days keep the target that was in force on them (BR-015, FR-074, EC-005); `subject_goals` keys an optional per-subject target by `(user_id, subject_id)` and holds a composite foreign key to `subjects` with `ON DELETE NO ACTION`, so a target survives the archive of its subject and comes back on restore (FR-071, AC-FR-071-4). A backfill gives every account that predates the table the configured 120-minute start, and signup seeds the same row inside its own transaction.

`src/modules/goals` owns the rules and five endpoints across four route files answer GOAL-01 to GOAL-05 on `/api/app/goals`. The face is three surfaces rather than a page: the goal panel on A-15 at `/settings/study` (a page M02 already shipped, which M08 gives its first real section), the goal panel inside the A-8 subject workspace, and the goal line plus the Edit goal dialog on A-3. Progress is never stored. It is derived from the frozen local dates M06 writes into `study_session_days`, so a midnight-crossing session is split across the two days it belongs to, and today adds the measured focus of a running timer run, which is AC-FR-072-2 and the one edge that makes Goals depend on Timer.

Everything M08 claims is proven by a command run in this repository: typecheck, lint, the boundary check, 136 unit tests, 134 integration tests against PostgreSQL 18.6, a production build with 62 route lines of which five are new, the coverage run with the goals module at 94.17% statements and 96.73% lines against the floor M08 added, and browser checks at four viewport widths against the production build, including the default at 120, a change to 30, an out-of-range refusal, a subject target with the archived suspension, a manual 40-minute session, the goal-met line on both A-15 and A-3, and the dialog that changes the target from A-3.

M08 is not a full pass. `DEFINITION-OF-DONE.md checked` is partial: the by-layer coverage floors are neither enforced nor met beyond the per-module floor M08 added, axe cannot run, no screen reader was driven, and the `m08-done` tag is the owner's to create. Those are named in section 8 and in the evidence record rather than ticked. Two defects were found and fixed in this pass, together with one harness repair, and all three are in section 7 with the case that now pins each.

## 2. Scope and authorization

| Item | Record |
|---|---|
| Milestone | M08 Daily and subject goals ([MILESTONES.md](../07-roadmap/MILESTONES.md)) |
| Authorization | Owner instruction "started" in the build session, which starts this milestone after the M07 delivery report was approved; the scope is the M08 card fixed by `Build Mode.txt` and the roadmap, recorded in [OPEN-DECISIONS.md](../OPEN-DECISIONS.md) section G, 2026-11-25 |
| Repository | `D:/Portofolio/Lumora`, branch `main`; the owner committed the first half mid-session (`33334b4`, `178208d`), no commit was made by me |
| In scope | `daily_goal_history` and `subject_goals`; GOAL-01..GOAL-05; the goal panel on A-15, the goal panel on A-8 and the goal line with its dialog on A-3; the dated target that applies from the current local day forward (FR-074, EC-005); progress derived from the frozen local date (BR-014, NFR-091, AC-FR-072-4); the running run counted on today (AC-FR-072-2); the 5..1440 range (BR-013, EC-023); the met boundary and the once-per-day `GoalMet` crossing (FR-073, AC-FR-074-2); the archived suspension of a subject target (FR-071, AC-FR-071-4); the 120-minute default seeded at sign-up (AC-FR-070-1) and the backfill for older accounts; the purge handler and export contributor on `section: "goals"` |
| Out of scope | streaks, XP and statistics (M12, FR-090..FR-096); the calendar page A-5 (M09); the dashboard composition (M13); FR-180..FR-184 (AI review); notifications and reminders; any Phase 2 or Phase 3 table, route or flag; a version column or a conditional request on the GOAL writes, which API-ENDPOINTS does not ask for |
| Build Mode rules | No invented specification: every route, column, rule and sentence traces to FR-070 to FR-074, NFR-091, BR-013 to BR-015, EC-005, EC-023 or a named document section. No open decision was resolved silently: the four M08 choices are recorded as OD-M46 to OD-M49 and in section 7 instead of being presented as settled |

## 3. Functionality delivered

| Area | What exists now | Proof |
|---|---|---|
| Target in force | GOAL-01 answers the target of today with the effective date it started on, derived from the history rather than stored as a version | `tests/unit/goals.test.ts`, `tests/integration/goals.test.ts`, browser checks in E06 |
| Change from today forward | GOAL-02 upserts the row of the current local day inside 5..1440, answers the new target and its effective date, and leaves every past day on the target it had (FR-074, EC-005); raising the target re-evaluates today at once (AC-FR-074-2) | `tests/integration/goals.test.ts`, browser checks in E06 |
| Subject targets | GOAL-03 sets or updates and GOAL-04 removes a target for one subject, leaving the overall goal untouched (AC-FR-071-2); an archived subject refuses the write with 409 `subject_archived` while the target it holds is reported suspended (AC-FR-071-4) and returns on restore | `tests/integration/goals.test.ts`, browser checks in E06 |
| Progress | GOAL-05 derives the day's minutes from `study_session_days` on the frozen local date, splits a session that crosses local midnight across the two days (BR-014), answers whole percent without clamping, and adds the measured focus of a running run to today only (AC-FR-072-2) | `tests/unit/goals.test.ts`, `tests/integration/goals.test.ts` |
| Goal met | `isGoalMet` is met at exactly the target and not one minute short (AC-FR-073-1, AC-FR-073-2); `GoalMet` is published by the write that crosses the target, at most once a day, also when a lowered target is already reached (AC-FR-074-2), never on a delete and never on a later write on a met day | `tests/unit/goals.test.ts`, `tests/integration/goals.test.ts` |
| Sign-up default | The 120-minute row is inserted inside the signup transaction from the registration local date and guarded so a returning account never has an edited target reset (AC-FR-070-1); the migration backfills the accounts that predate the table | `tests/integration/goals.test.ts`, the probe in E08 |
| A-15 | The Daily goal panel: the minutes field with its hint, the "Today: X of Y min, Z%" line with "Goal met", an in-place refusal, and the saved sentence naming the effective date | browser checks in E06 |
| A-8 | The goal panel in the subject workspace: the empty line, set, update and remove, and the suspended sentence with no controls while the subject is archived | browser checks in E06 |
| A-3 | The goal line and the Edit goal dialog, which writes through GOAL-02 and leaves both A-3 and A-15 showing the new target | browser checks in E06 |
| Data ownership | A purge handler and an export contributor on `section: "goals"`, registered between sessions and topics because `subject_goals` holds a NO ACTION key to `subjects` | E07, `tests/integration/profile.test.ts` |
| Ownership contract | Every GOAL read and write is scoped by `user_id`; another account sees neither the daily history nor a subject target | `tests/integration/goals.test.ts` |
| Error copy | The range refusal reads "Choose a whole number of minutes from 5 to 1440." from the field error mapping, and each new form surface carries a form-level `role="alert"` for a failed write | `src/ui/forms/{goal-fields,study-form,subject-goal-panel,daily-goal-dialog}.tsx`, browser check in E06 |

## 4. Files

New:

| Path | Role |
|---|---|
| `db/migrations/0008_goals.sql` | the two tables, the 5..1440 checks, the composite foreign key with `ON DELETE NO ACTION`, the subject index and the backfill INSERT |
| `src/modules/goals/service.ts` | the rules: `targetForDay`, `percentOf`, `isGoalMet`, `goalMetCrossed`, `assertTargetMinutes`, `getGoalSet`, `setDailyGoal`, `setSubjectGoal`, `removeSubjectGoal`, `getGoalProgress`, `seedDailyGoal`, `purgeGoals`, `exportGoals` |
| `src/modules/goals/{events,subscribe,public}.ts` | the `GoalMet` event registry, the session-event subscriber that publishes on the write's connection, and the module's public surface |
| `src/app/api/app/goals/route.ts` | GOAL-01 |
| `src/app/api/app/goals/daily/route.ts` | GOAL-02 |
| `src/app/api/app/goals/progress/route.ts` | GOAL-05 |
| `src/app/api/app/goals/subjects/[subjectId]/route.ts` | GOAL-03 and GOAL-04 |
| `src/app/settings/study/page.tsx` | A-15 with its metadata, the daily goal and the timer durations |
| `src/ui/forms/study-form.tsx` | the A-15 daily goal panel |
| `src/ui/forms/goal-fields.ts` | the shared minutes field, its hint and the range constants the two panels use |
| `src/ui/forms/subject-goal-panel.tsx` | the A-8 panel, its empty line and the suspended sentence |
| `src/ui/forms/daily-goal-dialog.tsx` | the A-3 dialog |
| `tests/unit/goals.test.ts` | the 20 cases over the pure rules |
| `tests/integration/goals.test.ts` | the 15 cases over GOAL-01..GOAL-05, the registries and the ownership contract |
| `docs/08-build/M08-EVIDENCE.md` | the checkpoint record: E01 to E08 with the commands and the observed output |

Modified:

| Path | Change |
|---|---|
| `src/modules/goals/{service,subscribe}.ts` | the sub-read of the running run, the re-read before a target change, and the subscriber's crossing guard |
| `src/modules/sessions/{events,service}.ts` | a session-event subscriber now receives the connection the write used (`publishSessionEvent(event, database)`), because the event is published inside the write's transaction (OD-M46) |
| `src/modules/sessions/service.ts` | `daySeconds` and `sessionDaySeconds` exported, so progress reads the same day arithmetic the session list uses |
| `src/modules/timer/service.ts` | `measuredFocusSeconds` and `runningFocus` exported; the subscriber call sites pass the write's connection |
| `src/modules/plans/service.ts` | the private date check removed in favour of the kernel's `isRealLocalDate` |
| `src/kernel/time.ts` | `isRealLocalDate`, which rejects a well-shaped date the calendar does not have (OD-M49) |
| `src/server/container.ts` | the goals purge handler, the export contributor and the subscriber registration |
| `src/server/request-context.ts` | the goals body and query schemas |
| `src/app/api/app/goals/route.ts` | the GOAL-01 handler body |
| `src/app/subjects/[subjectId]/page.tsx` | the goal panel's data, loaded with the subject |
| `src/app/timer/page.tsx` | the goal for today, loaded with the timer state |
| `src/ui/forms/subject-workspace.tsx` | the panel slot |
| `src/ui/forms/timer-screen.tsx` | the goal line and the dialog on A-3 |
| `src/ui/forms/topic-list.tsx` | the shared list behaviour the panel's layout follows |
| `src/ui/nav.ts` | `/settings/study` in the shipped routes |
| `tests/integration/support/api.ts` | the GOAL endpoints, their strict schemas and the wire types |
| `tests/integration/profile.test.ts` | both registry key lists include `goals` |
| `vitest.config.ts` | `"src/modules/goals/**": { lines: 80, functions: 70, branches: 70, statements: 80 }` |

`db/migrations/0008_goals.sql`, the four GOAL route files and `src/modules/goals/{events,public}.ts` were already tracked when this session's work ended: the owner committed the first half of M08 mid-session. The remainder is the list above, and the documents of section 10.

## 5. Database changes

| Object | Detail |
|---|---|
| `daily_goal_history` | `user_id` uuid `ON DELETE CASCADE`, `effective_from` date, `target_minutes` smallint with `CHECK (target_minutes BETWEEN 5 AND 1440)` (BR-013, EC-023), `created_at`, `updated_at`, `PRIMARY KEY (user_id, effective_from)` so a change on the current local day upserts that day's row and never leaks a row into the past (FR-074, EC-005) |
| `subject_goals` | `user_id` uuid `ON DELETE CASCADE`, `subject_id` uuid, `target_minutes` smallint with the same check, timestamps, `PRIMARY KEY (user_id, subject_id)`, and `CONSTRAINT fk_subject_goals_subject FOREIGN KEY (subject_id, user_id) REFERENCES subjects (id, user_id) ON DELETE NO ACTION`: subjects are archived, never deleted (BR-029), so a target survives an archive and returns on restore (FR-071, AC-FR-071-4) |
| `ix_subject_goals_subject` | serves the foreign-key check on subject (INDEXING-STRATEGY section 2, rule R4) |
| Backfill | `INSERT INTO daily_goal_history (user_id, effective_from, target_minutes) SELECT u.id, (u.created_at AT TIME ZONE p.timezone)::date, 120 FROM users u JOIN user_profiles p ON p.user_id = u.id ON CONFLICT (user_id, effective_from) DO NOTHING`, so an account that predates the table starts on the documented default and a re-run changes nothing (proved in E08) |
| Derived, never stored | There is no progress column. Minutes come from the frozen local days of `study_session_days` (M06) and, for today only, from the running run (M07); M08 writes to no session, day row or timer row |

## 6. Tests executed and results

| Command | Result |
|---|---|
| `npm run verify` | exit 0. `tsc --noEmit` clean; `eslint .` clean; "Boundary check passed"; unit 21 files / 136 tests passed in 20.33 s; integration 12 files / 134 tests passed in 411.42 s |
| `npx vitest run --project unit tests/unit/goals.test.ts` | 20 tests passed |
| `npx vitest run --project integration tests/integration/goals.test.ts` | 15 tests passed against PostgreSQL 18.6 |
| `npx next build` | exit 0, compiled successfully in 14.6 s, 44 of 44 static pages generated, 62 route lines of which five are new in M08 (the four GOAL route files and `/settings/study`) |
| `npm run test:coverage` | exit 0, 33 files / 270 tests; `src/modules/goals` at 94.17% statements, 84.48% branches, 94.11% functions and 96.73% lines against the 80 / 70 / 70 / 80 floor |
| Migration from the previous schema | a scratch database was migrated through `0001` to `0007`, given a user dated before M08, then migrated with `0008` three times: one backfilled row, no duplicate on a re-run, an edited target untouched (E08) |
| Browser checks | every check in the evidence record E06 passed, including the four-width layout pass, the default at 120, the change to 30, the out-of-range refusal, the subject target, the archived suspension and its restore, a manual 40-minute session, the met line on A-15 and A-3, and the A-3 dialog lowering the target |

| Scope | % Stmts | % Branch | % Funcs | % Lines | Floor |
|---|---|---|---|---|---|
| `src/modules/goals/**` | 94.17 | 84.48 | 94.11 | 96.73 | 80 / 70 / 70 / 80 |
| `src/kernel/**` | 88.95 | 77.16 | 89.28 | 93.92 | 80 / 70 / 70 / 80 |
| All files | 49.25 | 37.58 | 47.58 | 50.25 | none |

Full commands, raw output and the measurement tables are in [M08-EVIDENCE.md](M08-EVIDENCE.md).

## 7. Technical findings

1. **A subscriber must read through the connection the write used.** `GoalMet` never fired from a session write in the first build: the write publishes its event inside the route's transaction, and the container's Goals subscriber read `study_session_days` on its own connection, which could not see the uncommitted rows, so it returned early. `publishSessionEvent` and `SessionEventSubscriber` now carry the writing connection (OD-M46) and the container forwards `writeDatabase`. The integration case that crosses a target through POST `/api/app/sessions` is the regression, and the unit and integration cases that publish directly were green either way, which is why the defect survived the first pass.
2. **A date that is well shaped is not a date that exists.** GOAL-05 answered 500 for `2026-13-01`: `isLocalDate` matches the shape only, so the value reached PostgreSQL and failed there. The kernel gained `isRealLocalDate`, which rejects a date the calendar does not have, GOAL-05 uses it, and Plans dropped its private copy of the check in favour of it (OD-M49). The integration case asserts the 400 on `2026-13-01`, `yesterday` and a full instant.
3. **A live run is counted once, and only on today.** `dayState` adds the running run's measured focus only when the day asked for is today and the run's own frozen local date is that same day, so a day that is past, or a run that started in another zone, cannot move the figure (AC-FR-072-2). The subscriber holds the other half: it sums the seconds a single write recorded per local date and skips a day whose written total already reaches the target, which is what makes a day produce one `GoalMet` however many sessions it takes to get there, and what stops the time of a run from being counted a second time when it is closed into a session (AC-FR-073-1).
4. **The new integration cases had to be written against the contracts M07 shipped.** Three repairs were needed while the cases were being written, none of them a product rule: `stopTimer` takes the version and its context and then the idempotency key (`stopTimer(database, userId, started.version, { ...context, now }, null)`), the sessions list is parsed with `sessionListSchema` rather than a hand-rolled shape, and the day-allocation assertions ask for `?limit=25` because the list pages. The harness is the only thing that changed.
5. **Progress is derived from the frozen local date, not from a clock.** GOAL-05 sums `study_session_days` for the day asked for, which M06 wrote from the zone the session was recorded in, so a profile zone change leaves past days where they were and moves only "today" (BR-014, NFR-091, AC-FR-072-4). Today also adds the running run's measured focus, which is the one edge that makes Goals depend on Timer; the boundary check allows `GOAL --> TIM` because Timer is rank 8.
6. **The target is a dated history, not a version column.** A change writes the row of the current local day, so "changes apply from today forward" needs no backfill and no migration of past days (FR-074, EC-005). `targetForDay` scans for the latest row on or before the day so an unordered read cannot pick the wrong one, falls back to the earliest row a day before the history starts, and answers `config.goal.defaultMinutes` on an empty history without writing a row: a read never creates data (OD-M47).
7. **`GoalMet` is published in process and has no MVP consumer.** The event exists because the card asks for it (FR-073), the crossing rule is unit tested, and the integration suite observes it through the container's registry; nothing subscribes in the MVP, and the notification that will consume it is a later milestone. Recorded as OD-M48 rather than left as an unexplained registry entry.
8. **The crossing has one definition and four cases.** It is the write that takes the day to its target; a write on an already met day publishes nothing; a delete publishes nothing; and a lowered target that is already reached publishes at once, because the change itself is what makes the day met (FR-073, AC-FR-074-2). `setDailyGoal` re-reads the day state before it writes so the third case cannot be missed, and the once-per-day rule is what makes a day produce one event however many sessions it takes.
9. **The sign-up default is seeded inside the sign-up transaction and guarded.** `seedDailyGoal` inserts the row of the registration local date with `INSERT ... SELECT ... WHERE NOT EXISTS`, so a new account has a target from its first day (AC-FR-070-1) and a returning account never has an edited target reset. The migration carries the same default for the accounts that predate the table, and the probe in E08 shows the backfill, its idempotence and the survival of an edited value.
10. **The `subject_goals` key is NO ACTION, which makes the purge order a rule.** Subjects are archived rather than deleted, so the composite foreign key must not cascade and the goal has to outlive an archive; the consequence is that the goals purge has to run before the topics and subjects purges on the same connection, which is why `"goals"` sits between `"sessions"` and `"topics"` in both registries (E07).
11. **Whole percent, unclamped, is the honest answer.** `percentOf` rounds half up and caps at nothing, so 40 minutes against a 5-minute target reads 800% and the line still says "Goal met". Clamping would hide a day that beat its target, and the card's only threshold is the met boundary, which `isGoalMet` owns.
12. **The `from`/`to` ranges outside GOAL-05 are still shape-only.** `sessionListQuery` and its neighbours validate the shape of a date without asking the calendar, which M08 leaves as it was and names in section 8; GOAL-05 is the one range M08 owns and it uses `isRealLocalDate`.

## 8. Known limitations

1. The Definition of Done row stays partial for three named reasons: the by-layer coverage floors (domain 90%, application 80%, overall 80%) are still neither enforced nor met, which is OD-M31 and unchanged since M01; axe cannot run in this tree because no browser-automation dependency is installed, and no screen reader was driven; and the `m08-done` tag is the owner's step.
2. The GOAL writes carry no `If-Match` and no `Idempotency-Key`. API-ENDPOINTS does not ask for either: the set is last-write-wins and a repeat on the same day rewrites one row. A client that sends two different targets at once gets one of them, which the primary key orders but does not arbitrate, and a version column is the change if a later milestone wants optimistic concurrency here.
3. The form-level `role="alert"` that reports a failed write exists on all four new form surfaces and was not driven in the browser; the field refusal was. The copy comes from the shared error mapping, so the wording is the same sentence the M02 forms show.
4. `sessionListQuery` and the other `from`/`to` ranges validate the shape of a date only, so a value such as `2026-13-01` reaches PostgreSQL on those routes and answers an internal error rather than a 400. The gap predates M08, is not reachable from the shipped UI, and is named here with GOAL-05 as the one range that does ask the calendar.
5. A subject target has no history: FR-071 asks for a target per subject, not for the dated record the overall goal needs, so `subject_goals` holds the current target only and `GoalProgress.subjects` reports it suspended while the subject is archived.
6. The widest measured element at 2560 px belongs to the shared two-column shell of the settings and subject layouts rather than to a goal control; it was measured inside `main` (728 to 1832 against a `main` spanning 704 to 1856), so no goal control overflows at any of the four widths.
7. Nothing is committed, staged or tagged by me. The owner made two commits mid-session and decides what happens to the remainder.

## 9. Remaining tasks

- Owner: review this report and [M08-EVIDENCE.md](M08-EVIDENCE.md), commit the uncommitted remainder, approve or correct the record, and create the `m08-done` tag.
- The Definition of Done row stays unchecked in [MILESTONES.md](../07-roadmap/MILESTONES.md) until the by-layer floors have a command and axe can run (OD-M31).
- Owner decision: OD-M46 to OD-M49 are recorded and none is closed; the two that change a contract other modules use are OD-M46 (the subscriber's connection) and OD-M49 (the kernel's `isRealLocalDate`, which Plans now imports).
- No follow-up code is deferred: the M08 card's deliverable rows are complete, and the open rows are evidence gaps and the tag rather than work items.

## 10. Documents updated

| Document | Change |
|---|---|
| [MILESTONES.md](../07-roadmap/MILESTONES.md) M08 | three rows checked, the Definition of Done row left unchecked, and an "As built" note recording what shipped and which row stays open |
| [MODULE-BOUNDARIES.md](../03-architecture/MODULE-BOUNDARIES.md) | the Goals dependency row, the layer table, the delivery paragraph and the `GOAL --> TIM` rank edge the running-run read needs |
| [OPEN-DECISIONS.md](../OPEN-DECISIONS.md) section C | OD-M46 to OD-M49 (the subscriber's connection, the dated target with no lazy write, `GoalMet` with no MVP consumer, and `isRealLocalDate` in the kernel); section G: the 2026-11-25 M08 execution row |
| [IMPLEMENTATION-READINESS.md](../IMPLEMENTATION-READINESS.md) sections 6 and 7 | the M08 execution paragraph and the authorization sentence naming M09 as the next step |
| [DOCUMENTATION-INDEX.md](../DOCUMENTATION-INDEX.md) | the two M08 build records and the inventory count |
| [README.md](../README.md), [docs/README.md](../README.md) | build state, the reading order and the build records |
| [CHANGELOG.md](../CHANGELOG.md) | the 2026-11-25 M08 entry, with the two defects and the harness repair under "Fixed" |

The migration implements DATA-DICTIONARY section 11 and API-ENDPOINTS GOAL-01..GOAL-05 as written; both stay as they are, and the dictionary was not modified.

## 11. Definition of Done level

The milestone-level check is in [M08-EVIDENCE.md](M08-EVIDENCE.md) E08. FR-070 to FR-074 are delivered with no stub or placeholder, typecheck, lint and the boundary check pass, 136 unit and 134 integration tests pass, the production build succeeds with the five new routes, the goals module clears the floor M08 added, the purge and export registries are asserted in both lists, the ownership contract holds, the migration applies from an empty database and from the previous schema with its backfill, the four-width browser pass shows no horizontal scroll and 44 px targets, and the states of E06 (empty, loading, refusal, suspended, met) all exist. Three rows are not fully checked: the by-layer coverage floors, the axe and screen-reader half of the accessibility row, and the tag. The M08 card therefore stays open on its Definition of Done row, which is the same level M04 to M07 reached.

## 12. Recommended next milestone

M09 Calendar. It depends on M08 for the progress it reads alongside planned time, and it is read-only over the sessions M06 writes and the plans M05 writes, so it needs no new table and no new rule. M05, M06, M07 and M08 stay open on their Definition of Done rows until the coverage, screen-reader and axe gaps are closed and the owner has tagged each one.
