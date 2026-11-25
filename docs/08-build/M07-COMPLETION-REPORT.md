# M07 Completion Report

> Status: M07 execution record, 2026-11-25, awaiting the owner's approval and tag. Commands, raw output, the browser measurements and the defects found are in [M07-EVIDENCE.md](M07-EVIDENCE.md). M07 is built and verified; its DoD row stays partial because the screen-reader pass with two readers was not run, the by-layer coverage floors the document names are still not enforced beyond the module floor M07 added, axe cannot run in this tree, and the tag is the owner's step. No ADR is Accepted, no vendor is selected, no OD row is closed, and nothing is committed or tagged by me.

## 1. Executive summary

M07 adds the timer, the surface the product is named around. Three tables arrive in migration `0007_timer.sql`: `timer_runs` holds at most one run per user with the phase and the instant that phase ends, `timer_run_segments` holds the focus intervals as a ledger with a partial unique index that allows one open interval per run, and `timer_settings` holds the durations the next run is copied from. `src/modules/timer` owns the state machine and its operations; seven route files behind TIM-01..TIM-08 answer on `/api/app/timer`; A-3 at `/timer` is the face, the controls, the post-session panel and the recent list.

The state machine is server-authoritative and lazy. Nothing ticks on the server: a row stores `phase` and `phase_ends_at`, and every read walks the phases forward until the clock is inside the current one, so a run advances across a refresh, a closed tab, a second device and any amount of time without a scheduler and without drift. Focus time is measured by the segment ledger rather than by the phase clock, so paused minutes never count, a reload never loses a second, and the answer is the same on every device. A 60 s heartbeat keeps the run alive; a run whose last heartbeat is 30 minutes old is closed by a cron job and written as a session, which is BR-006 and EC-028.

One timer runs at a time. The unique key on `timer_runs (user_id)` is the race guard and the service probe is the human answer: a second start is refused with `timer_already_running` and the running run attached, and `replaceRunning` closes the previous run in the same transaction, saving the time it collected. A stop under a minute is discarded, a stopwatch from a minute is saved with no Pomodoro, and a Pomodoro is saved once it has banked a Pomodoro or five minutes of open focus, which is the BR-007 and BR-008 line. The topics archive guard of M03 gains its first real caller: a subject with a running timer cannot be archived, and the refusal names the run.

Everything M07 claims is proven by a command run in this repository: typecheck, lint, the boundary check, 116 unit tests, 119 integration tests against PostgreSQL 18.6, a production build with 58 route lines, the coverage run with the timer module at 87.78% statements and 90.56% lines, and browser checks on A-3 at four viewport widths against the production build, including a reload, a pause, a resume, a heartbeat, an interval that advanced itself, the replace dialog from a second tab, the three stop outcomes, the durations dialog, the archive guard and the no-subject empty state.

M07 is not a full pass. `DEFINITION-OF-DONE.md checked` is partial: no screen reader was driven, the by-layer coverage floors are neither enforced nor met beyond the per-module floor M07 added, axe cannot run, the audio chime could not be heard in this environment, and the `m07-done` tag is the owner's to create. Those are named in section 8 and in the evidence record rather than ticked. The defects this pass found and fixed are in section 7.

## 2. Scope and authorization

| Item | Record |
|---|---|
| Milestone | M07 Timer: Pomodoro and stopwatch ([MILESTONES.md](../07-roadmap/MILESTONES.md)) |
| Authorization | Owner instruction "started" in the build session, which starts this milestone after the M06 delivery report was approved; the scope is the M07 card fixed by `Build Mode.txt` and the roadmap, recorded in [OPEN-DECISIONS.md](../OPEN-DECISIONS.md) section G, 2026-11-25 |
| Repository | `D:/Portofolio/Lumora`, branch `main`, no commit made by me |
| In scope | `timer_runs`, `timer_run_segments`, `timer_settings`; TIM-01..TIM-08; A-3; the server-authoritative phase machine (NFR-090); the heartbeat (FR-046); one running timer and the replace promise (BR-011, AC-E2E-04); refresh recovery (AC-E2E-03); the stop classification (BR-007, BR-008, AC-FR-045-2); the pause that excludes paused minutes (AC-FR-052-1, BR-012); the idle auto-close job and its 30 minute threshold (BR-006, EC-028); the archive guard on Subjects (EC-007, AC-E2E-07); the topic-status prompt (FR-049); the tab title countdown and the interval-end alert (NFR-044, client only); the purge handler and export contributor on `section: "timer"` |
| Out of scope | FR-180..FR-184 (AI review); the TIM-08 audio fields as a Phase 2 feature, kept in the schema and validated but with no library; statistics, streaks and XP awarding (M12, P2-02); the goal controls of M08; the calendar page A-5 (M09); the review prompt that completes in M11; every other Phase 2 or Phase 3 route, table or flag |
| Build Mode rules | No invented specification: every route, code, column and rule traces to FR-040 to FR-059, NFR-004, NFR-044, NFR-051, NFR-052, NFR-090, BR-006, BR-007, BR-008, BR-011, BR-012, EC-001, EC-002, EC-007, EC-012, EC-024, EC-028 or a named document section. No open decision was resolved silently: the three M07 choices are recorded as OD-M42 to OD-M44 and in section 7 instead of being presented as settled |

## 3. Functionality delivered

| Area | What exists now | Proof |
|---|---|---|
| Server-authoritative state | TIM-01 answers the run, the phase, `phaseEndsAt`, the cycle position, the banked focus seconds, the durations copied onto the run, `serverTime` and the version; the phases are advanced lazily on read, so a stale client cannot report a phase the clock has left | `tests/unit/timer.test.ts`, `tests/integration/timer.test.ts`, browser reload check in E06 |
| Start | TIM-02 starts a Pomodoro with a settings snapshot and one open focus interval, or a stopwatch with no phase clock; requires `Idempotency-Key` and the same origin; refuses a second start with 409 `timer_already_running` and `details.current`; `replaceRunning` closes the previous run in the same transaction and saves its time; refuses an archived subject (409 `subject_archived`), a foreign topic or plan entry (404 `not_found`) and a topic of another subject (400 `validation_failed`) | `tests/integration/timer.test.ts`, browser checks in E06 |
| Pause and resume | TIM-03 closes the open focus interval at the pause instant, shifts the phase clock by the paused wall time and answers 200; TIM-04 opens a new focus interval and shifts the clock back; both are idempotent and both require `If-Match`, answering 400 `version_required` or 409 `stale_version`; paused minutes stay out of `durationSeconds` | `tests/unit/timer.test.ts`, `tests/integration/timer.test.ts`, browser checks in E06 |
| Stop | TIM-05 finalizes the run, writes the session through the sessions service as `source = 'timer'`, and answers one of `discarded`, `saved` or `time_only` with the created session id; a stop is idempotent by request key; a stop with nothing running answers 409 `session_already_closed` | `tests/integration/timer.test.ts`, browser checks in E06 |
| Heartbeat | TIM-06 moves `last_heartbeat_at` and nothing else, so a beat never makes the client's `If-Match` stale and never disturbs the pause instant | `tests/integration/timer.test.ts`, browser heartbeat check in E06 |
| Idle auto-close | `closeIdleRuns` finalizes every run whose last heartbeat is older than 30 minutes, writes each session once with `autoClosed` true, and is idempotent; every write verb calls `settleIdleRun` first, so a late action sees the closed run and answers 409 while the auto-close stays committed | `tests/integration/timer.test.ts`, cron registration in `src/worker/index.ts` |
| Settings | TIM-07 and TIM-08 read and patch the durations (focus 1..120, break 1..60, long break 1..60, cycles 2..8) and the Phase 2 audio fields; the row is created on the first save with or without `If-Match` and is versioned thereafter; a running timer keeps the snapshot it started with (FR-057) | `tests/integration/timer.test.ts`, browser durations check in E06 |
| A-3 | The face with its arc, `role="timer"` and `aria-live="off"`, the polite live region, the phase and cycle text, the collapsible setup row with Subject, Topic, Mode and the plan entry, the Start button at 56 px and Stop at 48 px, the tab title countdown, the interval-end alert with Dismiss, the post-session panel with the topic-status prompt, the EC-007 auto-close panel, the retryable inline error, the Recent sessions list and the empty, loading and error states | browser checks in E06 |
| Archive guard | A subject with a running timer cannot be archived; the 409 `subject_has_running_session` carries `details.timerRunId` and the A-7 panel names it | `tests/integration/timer.test.ts`, browser check in E06 |
| Data ownership | A purge handler and an export contributor on `section: "timer"`, registered between plans and sessions | `tests/integration/profile.test.ts`, `tests/integration/timer.test.ts` |
| Ownership contract | Every timer operation is scoped by `user_id`; another account reads no run, and its verbs answer from its own empty state | `tests/integration/timer.test.ts` |
| Error copy | The UI maps the M07 codes to sentences: `timer_already_running` opens the replace dialog, `session_already_closed` explains the auto-close, `idempotency_key_required` and `request_in_progress` explain a dropped or repeated submission, and `subject_has_running_session` appends the running session to the M03 refusal | `src/ui/messages.ts`, browser checks in E06 |

## 4. Files

New:

| Path | Role |
|---|---|
| `db/migrations/0007_timer.sql` | the three tables, `uq_timer_runs_user`, the partial unique open-segment index, the checks and the heartbeat index |
| `src/modules/timer/service.ts` | the rules: the pure helpers, the state machine, start, pause, resume, stop, heartbeat, settings, the idle close, purge and export |
| `src/modules/timer/{job,public}.ts` | the cron registration for the idle close, and the module's public surface for the container and the page |
| `src/app/api/app/timer/route.ts` | TIM-01 |
| `src/app/api/app/timer/{start,pause,resume,stop,heartbeat,settings}/route.ts` | TIM-02 to TIM-08 |
| `src/app/timer/page.tsx` | A-3 with its metadata, the subjects (archived included for names), today's open plan entries, the settings and the last five sessions |
| `src/ui/forms/timer-screen.tsx` | the A-3 face, the controls, the heartbeat, the live region, the outcome panel, the auto-close panel and the recent list |
| `src/ui/forms/timer-dialogs.tsx` | the durations dialog with its ranges and the replace dialog |
| `tests/integration/timer.test.ts` | the 30 cases across TIM-01..TIM-08, the archive guard, the registries and the auto-close |
| `docs/08-build/M07-EVIDENCE.md` | the checkpoint record: E01 to E08 with the commands and the observed output |

Modified:

| Path | Change |
|---|---|
| `src/modules/timer/service.ts` | the idle close now commits through `settleIdleRun` before the caller's transaction |
| `src/modules/timer/{public,service}.ts` | `settleIdleRun` exported; `TimerSegmentsSummary` carries `focusSeconds` |
| `src/app/api/app/timer/{pause,resume,stop,heartbeat}/route.ts` | each calls `settleIdleRun` before its transaction |
| `src/server/container.ts` | the timer block between plans and sessions, plus `registerTimerArchiveGuard` |
| `src/kernel/config.ts` | `timerIdleCloseQueue`, the `timerIdleCloseCron` schedule and `rateLimit.timerPerUserPerMinute` |
| `src/worker/index.ts` | the idle-close cron |
| `src/server/request-context.ts` | the timer body and query schemas, and the `"timer"` rate kind |
| `src/ui/{messages,nav}.ts` | the M07 error copy and the Timer nav entry |
| `src/ui/control.tsx` | `Button` gained an optional `className`, used for the 56 px and 48 px targets |
| `tests/integration/support/api.ts` | the timer endpoints, their strict schemas and the wire types |
| `tests/integration/profile.test.ts` | the registry assertions now list the timer keys |
| `vitest.config.ts` | `"src/modules/timer/**": { lines: 80, functions: 70, branches: 70, statements: 80 }` |

`db/migrations/0007_timer.sql` and `tests/unit/timer.test.ts` were already tracked in the parent commit.

## 5. Database changes

| Object | Detail |
|---|---|
| `timer_runs` | `id` uuid primary key, `user_id` uuid `ON DELETE CASCADE` with `CONSTRAINT uq_timer_runs_user UNIQUE (user_id)` (the one-running-timer guard, BR-011), `subject_id` uuid, `topic_id` uuid null, `plan_entry_id` uuid null, `mode` text check in (`stopwatch`, `pomodoro`), `started_at`, `phase` text check in (`focus`, `break`, `long_break`) null, `phase_ends_at` timestamptz null, `cycle_index` integer, `pomodoros_completed` integer `>= 0`, `focus_min`, `break_min`, `long_break_min`, `cycles_before_long_break` (the snapshot of FR-046), `paused_at` timestamptz null, `last_heartbeat_at` timestamptz, `timezone`, `local_date` date, `rollover_hour`, `request_key` text with `UNIQUE (user_id, request_key)`, `version` integer `>= 1` default 1, `created_at`, `updated_at` |
| `timer_run_segments` | `id` uuid primary key, `run_id` uuid `ON DELETE CASCADE`, `kind` text check in (`focus`), `started_at`, `ended_at` null, with `CREATE UNIQUE INDEX uq_timer_run_segments_open ON timer_run_segments (run_id) WHERE ended_at IS NULL` so a run has at most one open interval |
| `timer_settings` | one row per user, `focus_min` 1..120, `break_min` 1..60, `long_break_min` 1..60, `cycles_before_long_break` 2..8, defaults 25 / 5 / 15 / 4, `audio_loop`, `audio_volume`, `version` integer `>= 1` default 1, timestamps; **(V)** with `If-Match` and `stale_version` on TIM-08 |
| Frozen columns | the durations are copied onto the run at start, so a settings change never moves a run in flight (FR-046); the timezone, local date and rollover hour are written at start so the session is allocated in the zone the user was in |
| Indexes | `ix_timer_runs_heartbeat (last_heartbeat_at)` serves the idle job's scan (BR-006); `ix_timer_runs_subject (subject_id)` serves the archive guard and the subject cascade |

## 6. Tests executed and results

| Command | Result |
|---|---|
| `npm run verify` | exit 0. `tsc --noEmit` clean; `eslint .` clean; "Boundary check passed"; unit 20 files / 116 tests passed in 11.53 s; integration 11 files / 119 tests passed in 170.91 s |
| `npx vitest run --project unit tests/unit/timer.test.ts` | 15 tests passed in 1.58 s |
| `npx vitest run --project integration tests/integration/timer.test.ts` | 30 tests passed in 20.93 s |
| `npx next build` | exit 0, compiled successfully in 1632 ms, 58 route lines of which 8 are new in M07 (the seven TIM route files and `/timer`), 40 of 40 static pages generated |
| `npx vitest run --coverage` | exit 0, 31 files / 235 tests; `src/modules/timer` at 87.78% statements, 80.86% branches, 94.33% functions, 90.56% lines against the 80 / 70 / 70 / 80 floor |
| Browser checks on A-3 | every check in the evidence record E06 passed, including the four-width layout pass, the reload, the pause and resume, the heartbeat, the self-advancing interval, the three stop outcomes, the durations dialog, the replace dialog from a stale tab, the cross-tab agreement, the archive guard and the no-subject empty state |

Full commands, raw output and the measurement tables are in [M07-EVIDENCE.md](M07-EVIDENCE.md).

## 7. Technical findings

1. **The idle close had to commit before the action's transaction.** The first build finalized an idle run inside the same transaction as the action that discovered it. When the action then raised `session_already_closed`, the rollback took the auto-close with it, so the run stayed open, the session was never written and the client was told the run was closed. `settleIdleRun` now finalizes and commits in its own transaction, and the four write routes call it before opening theirs. The integration case that abandons a run for 15 minutes and then pauses asserts both halves: the 409 the caller sees and the committed session the abandoned run produced. Recorded as OD-M44.
2. **A heartbeat must not move `updated_at`.** `pauseTimer` writes `updated_at` as the pause instant and `resumeTimer` reads it to shift the phase clock. A heartbeat that used the ordinary update path would have bumped that column once a minute and silently extended every paused run, and it would also have moved the version, turning every client's `If-Match` stale. TIM-06 writes `last_heartbeat_at` alone and leaves the version alone; the integration case asserts both. Recorded as OD-M43.
3. **The segment summary carries `focusSeconds`, not the documented `count` and `openSegmentStartedAt`.** API-SCHEMAS documents a count and the start of the open interval. The pause path must split the live interval (AC-FR-052-1), the client must know how much focus is banked to warn before it is lost (AC-FR-045-2) and to name the break branch, and the classification needs the same number, so TIM-01 answers `{ count, focusSeconds, openSegmentStartedAt }` where `focusSeconds` sums the closed intervals plus the open one. Recorded as OD-M42.
4. **Phase advance is a walk, not a tick.** `advancePhases` steps while `phaseEndsAt <= limit`, so a boundary exactly at `now` is processed rather than deferred by a second, and a tab that was closed for three hours is corrected in one read instead of three hours of catch-up. The long break ends by resetting `cycleIndex`, which is what makes "every fourth focus" count from the break rather than from the focus. The unit suite pins the missed-interval walk and the long-break reset.
5. **Focus seconds come from the ledger, not from the clock.** `focusSeconds` sums the segments and floors a partial second. The phase clock and the measured time are therefore independent: a pause stops both, a resume restarts both, and a server that is late by a second cannot invent focus time. The unit case that sums across segments and floors a partial one is the boundary.
6. **The stop classification is a three-way line with an OR.** `discarded` below 60 s (BR-008); `saved` for a stopwatch at or above 60 s with no Pomodoro; for a Pomodoro, `saved` when a completed interval was banked or the open focus interval reached 300 s (BR-007), and `time_only` otherwise, which means the session is written with the time and no Pomodoro. The integration suite asserts all four results, including a five-minute interval that never completed its phase, which is the case where a naive phase check would have said `time_only`.
7. **Replace is one transaction, and the discarded replacement is honest.** `replaceRunning` closes the previous run through the same classification the stop path uses, so a stopwatch replaced after 4 s is dropped as a discard rather than silently saved as zero minutes. The integration case asserts the saved time of a replaced run, and the browser case asserts the dialog naming the run that will be replaced.
8. **A read must not finalize an idle run.** TIM-01 answers an idle run as absent and leaves the row for the job, so a page load cannot write a session; the session is created by the idle close. The integration case asserts the read leaves the row in place and the job case asserts the write.
9. **The archive guard is a verdict plus a service probe.** M03's guard contract asks a registered guard for a verdict; the timer registers one that answers with the running run id, which A-7 renders as "Running session ...". The service also refuses a start on an archived subject, so the rule holds from both ends and neither depends on the other.
10. **Archived subjects are still loaded for A-3.** The first build loaded active subjects only, so Recent sessions printed "Subject" for a session whose subject had since been archived. The page now loads every subject and marks each `archived`, the face filters the picker to the unarchived ones (which is also the A-3 empty-state rule from the archived subjects case), and the session names resolve from the full list. The same shape M06's A-4 uses.
11. **`Button` needed a `className` escape hatch.** The 56 px Start and the 48 px Stop do not fit the shared variant scale, and the A-3 targets are a measured requirement (NFR-051). Rather than add two variants, `Button` gained an optional `className` that appends to the variant classes; the parameter had to be destructured as well as typed, which was the one build break of the milestone.
12. **The controls row was gated on the wrong list.** The first build gated the Start row on any subject existing, so a user whose only subject was archived saw a disabled Start under "Add a subject to start a session." The gate is now the same `choosable` list the picker uses.

## 8. Known limitations

1. The Definition of Done row stays partial: no screen reader was driven, so NFR-044 and AC-FR-050-* are proven at the markup level (`role="timer"`, `aria-live="off"`, the polite live region, the labelled controls) rather than by two readers.
2. The by-layer coverage floors DEFINITION-OF-DONE names (domain 90%, application 80%, overall 80%) are still neither enforced nor met; M07 added the per-module floor for `src/modules/timer/**` and cleared it, which is the same shape M01, M04 and M05 used. The gap is OD-M31.
3. axe cannot run in this tree: no browser-automation dependency is installed, the same gap M01 to M06 recorded.
4. The audio chime and the browser notification were not heard: Chromium in this environment grants no notification permission and plays no audio to the recorder, so the audible half of EC-024 is unverified and the in-app alert region is the record. The tab title countdown was observed.
5. The card's word `concurrent` for the two-start race is proven by the sequential 409 plus the unique key that guards the race, not by two parallel requests; the losing insert is converted to the same refusal in `startTimer`. The idle job's queue loop is exercised through `closeIdleRuns` rather than through the cron entry point.
6. The offline fault injection the card asks for ("offline up to 30 min") was exercised as a server restart and a visibility change rather than as a 30 minute offline hold; the run is server-authoritative, so the outcome is the same answer on the next successful read.
7. A plan entry can be linked to a run, and the link is copied onto the created session; the plan entry's actual then comes from the session (M06). A run that is discarded writes no session and therefore moves no plan actual, which is the intended reading of BR-008 but is not asserted by a named acceptance criterion.
8. The Phase 2 audio fields (`audioLoop`, `audioVolume`) are stored and validated but drive nothing; the one chime is bundled client behaviour (U-D4, one chime, no mute setting).
9. A Pomodoro's auto-start of the next focus interval is off by design (U-D4); the user starts each interval.
10. The timer's session write does not run the manual-path probes. `insertSession` is shared with the manual path but only the manual path calls `validateWrite`, so the 60 s floor and the local-day total are manual-only. The timer needs neither for its own invariants, which `classifyStop` and the bounded focus interval already guarantee, but the day total is therefore unguarded on the timer path and `daily_total_exceeded` has no producer, contrary to what the M06 report expected of M07. Named as OD-M45 with the narrow worst case (a day allocation past 86400 s reaches the unnamed `study_session_days.seconds` check and answers an internal error rather than a 400). This is the one place where M07 leaves a known rule unguarded by choice, and the owner can decide to route the timer write through the same probe.
11. No `m07-done` tag exists; the owner commits and tags.

## 9. Remaining tasks

- Owner: review this report and [M07-EVIDENCE.md](M07-EVIDENCE.md), commit the uncommitted remainder, approve or correct the record, and create the `m07-done` tag.
- The screen-reader row stays unchecked in [MILESTONES.md](../07-roadmap/MILESTONES.md) until two readers are run against A-3.
- The Definition of Done row stays partial until the by-layer floors have a command and axe can run.
- Owner decision: OD-M45, whether the timer's session write should run the same 60 s floor and day-total probes the manual path runs.
- No follow-up code is deferred: the M07 card's deliverable rows are complete, and the two unchecked rows are evidence gaps rather than work items.

## 10. Documents updated

| Document | Change |
|---|---|
| [MILESTONES.md](../07-roadmap/MILESTONES.md) M07 | four rows checked, the screen-reader row and the Definition of Done row left unchecked, and an "As built" note recording what shipped and why the two rows stay open |
| [OPEN-DECISIONS.md](../OPEN-DECISIONS.md) section C | OD-M42 to OD-M45 (the segment summary shape, the heartbeat that never moves `updated_at`, the idle close that commits in its own transaction, and the timer write that skips the manual-path probes); section G: the 2026-11-25 M07 execution row |
| [IMPLEMENTATION-READINESS.md](../IMPLEMENTATION-READINESS.md) sections 6 and 7 | the M07 execution paragraph and the authorization sentence |
| [DOCUMENTATION-INDEX.md](../DOCUMENTATION-INDEX.md) | the two M07 build records and the inventory count |
| [README.md](../README.md), [docs/README.md](README.md) | build state and the M07 build records |
| [CHANGELOG.md](../CHANGELOG.md) | the 2026-11-25 M07 entry |

The migration and the DATA-DICTIONARY stay as they are; the dictionary is the source of truth and was not modified.

## 11. Definition of Done level

The milestone-level check is in [M07-EVIDENCE.md](M07-EVIDENCE.md) E08: FR-040 to FR-059 are delivered with no stub or placeholder, typecheck, lint and the boundary check pass, 116 unit and 119 integration tests pass, the production build succeeds with the eight new routes, the timer module clears the coverage floor M07 added, the purge and export registries are asserted, the ownership contract holds, the migration applies on an empty database, the four-width browser pass shows no horizontal scroll with the measured control heights, and the states of E06 (empty, running, paused, auto-close, refusals, the post-session panel) all exist. The screen-reader row is not run, axe cannot run, the audible half of the alert was not observed, and the tag is the owner's step.

## 12. Recommended next milestone

M08 Daily and subject goals. It depends on M07 for the frozen local date this module writes onto every run and session, and its AC-E2E-06 counts progress from the sessions M07 now creates; the goal-met state and the default 120 minute goal created at sign-up are the next step the roadmap names. M05, M06 and M07 stay open on their Definition of Done rows until the coverage, screen-reader and axe gaps are closed.
