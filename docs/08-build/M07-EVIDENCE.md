# M07 Evidence

> Status: executed 2026-11-25 on `main`; build work tree `D:/Portofolio/Lumora`. Every command below was run in this session and outputs are pasted as observed. The milestone record is [M07-COMPLETION-REPORT.md](M07-COMPLETION-REPORT.md); the milestone card is [MILESTONES.md](../07-roadmap/MILESTONES.md) M07.

## Rules

- One section per checkpoint. Paste the exact command and the observed output.
- Record runtime, library and database versions.
- State pass or fail against the M07 checklist row. On fail or partial, name the cause and the row that stays unchecked.
- A row with no evidence stays unchecked in [MILESTONES.md](../07-roadmap/MILESTONES.md).
- No secret, token or personal data appears here.

## Checklist status

| M07 completion row | State | Evidence |
|---|---|---|
| Start, pause, resume, stop, discard under one minute, auto-close all work | PASS | E03: the service state machine and the pure helpers answer 15 unit cases. E04: TIM-02, TIM-03, TIM-04, TIM-05 and the BR-006 idle close answer 30 integration cases, including the 409 with `details.current`, the atomic replace, the pause that excludes paused minutes from `durationSeconds`, the three stop outcomes, the replay of a stop by its request key and the idle write that finalizes the run and then refuses. E06: the same verbs were driven on A-3 in a production build, including the replace dialog from a second tab and a one minute interval that advanced itself to the break |
| Refresh recovery and cross-device convergence verified | PASS | E06: a running Pomodoro survived a full reload (24:51 before, 24:47 after) and two tabs of the same account read the same 1:35 at the same instant. E04: TIM-01 answers the stored run and the ETag moves with the version, so a second reader cannot act on a stale copy |
| Archive guard registered and tested | PASS | E04: archiving a subject with a running run answers 409 `subject_has_running_session` with `details.timerRunId`; E07: `container.ts` registers `timer.registerTimerArchiveGuard` between plans and sessions |
| Screen-reader pass with two readers recorded | PARTIAL | Not performed. No screen reader was driven in this session, so AC-FR-050-* and NFR-044 are proven at the markup level only (E06 records `role="timer"` with `aria-live="off"`, the polite live region that announces started, paused, resumed, interval ended and stopped, and the visible control labels). The row stays unchecked until two readers are recorded |
| Purge handler and export contributor registered | PASS | E07: `purgeHandlers.keys()` is `["profile", "auth", "exams", "plans", "timer", "sessions", "topics", "subjects"]` and `exportContributors.keys()` is `["profile", "exams", "plans", "timer", "sessions", "subjects", "topics"]`; E04: purge returns 1 and the export section is `"timer"` |
| DEFINITION-OF-DONE.md checked | PARTIAL | E08: every milestone-level item is evaluated. The tag row stays unchecked because the owner tags, and the screen-reader row above stays partial. Coverage clears the floor in E05 |

## Environment and versions

| Item | Observed value |
|---|---|
| Runner | Windows 10.0.26200, x64 |
| Node.js | v24.13.1 |
| npm | 11.8.0 |
| Repository | `D:/Portofolio/Lumora`, branch `main`, HEAD `e8dd6b6` |
| Next.js | 16.4.6 |
| React and React DOM | 19.3.1 |
| TypeScript | 6.0.3 |
| vitest | 5.1.1 |
| ESLint | 10.15.0 (flat config, `typescript-eslint` 8.73.0) |
| Tailwind CSS | 4.3.5 |
| pg | 8.23.1 |
| zod | 4.6.7 |
| embedded-postgres | 18.6.0-beta.19 |
| PostgreSQL | 18.6, embedded. The integration suite starts its own instance on a free ephemeral port; the browser run used port 55433 through `.artifacts/pg-dev.ts` with all seven migrations applied, including `0007_timer.sql` |
| Browser used for the runtime checks | managed Chromium through the omp browser device, viewport 360, 768, 1280 and 2560 wide |
| Browser account | `timer-check@example.com` with the profile zone `UTC`, created through the signup form; the subject `Algebra` with the topic `Quadratics` |

Host clock is UTC+07. The browser profile zone is UTC, so every instant in E06 is the UTC instant.

## E01 Verify

- Requirement: IMPLEMENTATION-READINESS section 6; DEFINITION-OF-DONE section 1.
- Command: `npm run verify`, which is `typecheck && lint && boundaries && test && test:integration`.
- Result: exit 0 on the frozen tree. Log: `.artifacts/verify-m07-final.log`.

| Stage | Observed |
|---|---|
| `tsc --noEmit` | no output, no diagnostics |
| `eslint .` | no output, no warnings |
| `tsx scripts/check-boundaries.ts` | `Boundary check passed.` |
| `vitest run --project unit` | 20 files passed, 116 tests passed, 11.53 s |
| `vitest run --project integration` | 11 files passed, 119 tests passed, 170.91 s, against PostgreSQL 18.6 |

The run happened after the last source edit of the milestone, so the numbers describe the tree this record describes.

## E02 Production build

- Requirement: DEPLOYMENT-ARCHITECTURE section 4 stage 3; NFR-001.
- Command: `npx next build`.
- Result: exit 0.

Tail of the observed output, showing `/timer` and the seven TIM routes among the built routes:

```
├ ƒ /api/app/timer
├ ƒ /api/app/timer/heartbeat
├ ƒ /api/app/timer/pause
├ ƒ /api/app/timer/resume
├ ƒ /api/app/timer/settings
├ ƒ /api/app/timer/start
├ ƒ /api/app/timer/stop
...
├ ƒ /timer
```
`✓ Compiled successfully` and `✓ Generating static pages using 7 workers (40/40)` both appear in the log. The build was rerun after every UI edit in E06, and the last rerun served the archived-subject check that closes E06, so the bundle driven there is the code recorded here.

## E03 Unit tests

- Requirement: the M07 card's test row (`state machine, classification, auto-close threshold`).
- Command: `npx vitest run --project unit tests/unit/timer.test.ts`. Log: `.artifacts/unit-m07-final.log`.
- Result: 1 file passed, 15 tests passed, 1.58 s. The suite drives the exported pure helpers with no database.

| Case | What it pins |
|---|---|
| reads the snapshot, so a settings change never moves a run in flight | the durations are copied onto the run at start (FR-046) |
| leaves the phase alone before its end, keeping the stored segment start | `advancePhases` is a no-op mid-interval |
| closes the focus interval at its end and opens the short break | the focus to break transition |
| counts every interval a backgrounded tab missed, and opens the one running now | the `while (phaseEndsAt <= limit)` walk (EC-001) |
| takes the long break after the fourth completed focus and restarts the cycle | `cycleIndex` resets when the long break ENDS |
| stops at the cap, which is where BR-006 takes over | the advance cap |
| keeps the caller's segment start for the first interval, because a resume shifts the clock | a resume mid-break |
| sums whole seconds across segments and floors a partial one | `focusSeconds` |
| discards under a minute of focus (BR-008, AC-FR-045-2) | `classifyStop` under 60 s |
| stores a stopwatch from exactly 60 s and never counts pomodoros for it | the boundary and `mode` |
| saves a Pomodoro whose open interval reached the five minute minimum (BR-007) | the 300 s rule |
| counts a focus interval that ran to its end plus minutes of a new one | pomodoros add on a completed interval, not on a single long one |
| saves time only when a long focus run collected no completed interval | the `time_only` outcome |
| ends thirty minutes after the last heartbeat (BR-006) | `idleDeadline` and `isIdle` |
| answers the configured defaults at version 0, so a first start needs no write | `defaultSettings` |

## E04 Integration tests

- Requirement: the M07 card's test row (`concurrent start, replace, late stop returns session_already_closed`) and the ownership contract.
- Command: `npx vitest run --project integration tests/integration/timer.test.ts`. Log: `.artifacts/integration-m07-final.log`.
- Result: 1 file passed, 30 tests passed, 20.93 s, against PostgreSQL 18.6 with the test database migrated through `0007_timer.sql`. The cases run inside transactions that are rolled back, so the suite leaves no rows.

What the 30 cases cover, by area:

| Area | Cases |
|---|---|
| TIM-01 state | nothing running answers 200 with the fixed `"timer:none"` tag and a null run; a run answers with `"<id>.<version>"` and a matching `ETag`, and `If-None-Match` answers 304; an idle run reads as absent and its row is left for the idle job |
| TIM-02 start | 201 with `Location` and `ETag`, a settings snapshot and one open focus interval; a stopwatch starts without a phase clock; a second start answers 409 `timer_already_running` with `details.current`; `replaceRunning: true` closes the previous run in the same transaction and answers 201, and `replaceRunning` with nothing running is a plain start; a foreign origin answers 403 `csrf_rejected`; a missing `Idempotency-Key` answers 400 `idempotency_key_required` and the replay of a used key answers the stored 201 with `Idempotent-Replay`; an archived subject answers 409 `subject_archived` (and its restore answers 200), a foreign topic or plan entry answers 404 `not_found`, and a topic that belongs to another subject answers 400 `validation_failed` |
| TIM-03 pause | pause answers 200 and closes the open focus interval; a missing `If-Match` answers 400 `version_required` and a stale one 409 `stale_version`; paused minutes stay out of `durationSeconds` (AC-FR-052-1, BR-012); the phase clock shifts by the paused wall time, so a break does not expire early |
| TIM-04 resume | a resume answers 200 and opens a new focus segment carrying the shifted `phaseEndsAt`, a repeated resume is a 200 no-op, and the resumed run keeps counting from where it stopped |
| TIM-05 stop | the four stop results: 200 `discarded` under a minute with no session written, 200 `saved` for a stopwatch from exactly 60 s with 0 Pomodoros, 200 `saved` for a Pomodoro that completed its interval (the Pomodoro is counted) and for a five-minute interval that never completed its phase, and 200 `time_only` when the interval never reached five minutes (the time is saved, no Pomodoro); the write goes through the sessions service as `source = 'timer'`; a stop is idempotent by request key, a replay answers 200, a stop with nothing running answers 409 `session_already_closed` and a missing key answers 400 |
| TIM-06 heartbeat | 200 with `lastHeartbeatAt` moved, `version` and `phaseEndsAt` untouched; a heartbeat with nothing running answers 409 `session_already_closed` |
| BR-006 auto-close | an abandoned run (last heartbeat 15 minutes back) is finalized by the first write verb, which then answers 409 while the run's session is written once as `autoClosed` with the abandoned duration and the run row is gone (EC-028); a run abandoned for 20 minutes and never touched is closed by `closeIdleRuns`, which answers the number it closed |
| TIM-07 and TIM-08 settings | the defaults answer at version 0 without creating a row; the first `PATCH` creates the row with or without `If-Match`; a stale `If-Match` answers 409 `stale_version` and a missing one on an existing row 400 `version_required`; the ranges are refused outside 1..120 / 1..60 / 1..60 / 2..8 with 400 `validation_failed` and an empty body is refused too; `audioLoop` and `audioVolume` are validated, so `audioLoop: "thunder"` is refused; a running timer keeps its snapshot after a settings change |
| Ownership | another account reading its own state sees nothing, its pause answers 409 with its own empty state, its settings answer version 0, and the owner's run is untouched |
| Archive guard | archiving the subject of a running run answers 409 `subject_has_running_session` with `details.timerRunId`, and the archive answers 200 once the run is stopped |
| Registries | the purge handler deletes the user's runs, segments and settings and answers the row count; the export contributor answers the `"timer"` section holding the runs |

Two gaps in this suite are stated rather than implied. The card's word `concurrent` is met by the sequential refusal plus the database guard: `uq_timer_runs_user` is the unique key on `timer_runs (user_id)`, and `startTimer` catches its `23505` (service lines 166 to 168) and converts the losing race into the same 409 `timer_already_running` with `details.current`, so no test drives two starts in parallel. The idle job's own loop (`runTimerIdleClose` draining the queue) is exercised through `closeIdleRuns` rather than by running the cron entry point.

## E05 Coverage

- Requirement: the M07 card's DoD row; DEFINITION-OF-DONE section 2; the floors added to `vitest.config.ts`.
- Command: `npx vitest run --coverage`. Log: `.artifacts/coverage-m07-final.log`.
- Result: exit 0, 31 files passed, 235 tests passed (116 unit and 119 integration), 185.85 s. No threshold was reported as unmet.

| Scope | Statements | Branches | Functions | Lines | Floor |
|---|---|---|---|---|---|
| `src/modules/timer` | 87.78 | 80.86 | 94.33 | 90.56 | 80 / 70 / 70 / 80 (lines, functions, branches, statements) |
| `src/kernel` | 88.81 | 76.87 | 89.15 | 93.86 | the M01 floor, unchanged |
| All files | 49.02 | 37.48 | 46.29 | 50.06 | none |

The milestone floor is the per-path entry M07 added: `"src/modules/timer/**": { lines: 80, functions: 70, branches: 70, statements: 80 }`, the same shape M01 gave the kernel and M04 and M05 gave their modules. The timer numbers clear every one of them.

The `All files` row is low for the same reason M01 to M06 recorded: `src/app/**` and `src/ui/**` are covered by the browser pass in E06 rather than by the automated tiers, so `src/app/timer/page.tsx` and `src/ui/forms/timer-screen.tsx` report 0 in this table while every one of their behaviours was driven in a real browser. The by-layer floors DEFINITION-OF-DONE names (domain 90%, application 80%, overall 80%) are still neither enforced nor met; that gap is OD-M31 and did not change in M07.

## E06 A-3 Timer in a production build

- Requirement: FR-040..FR-059, A-3 in PAGE-SPECIFICATIONS, NFR-004, NFR-044, EC-001, EC-002, EC-007, EC-012, EC-024, EC-028.
- Setup: `npx next build`, then `npx next start -p 3000`, driven through the managed Chromium tab. The account was created through `/signup` with the profile zone `UTC`, then `Algebra` was added on A-7 and `Quadratics` on A-8.
- Why the browser rather than the suite: NFR-004, NFR-044 and the A-3 states are about what a person sees and hears; only a rendered page proves them.

**Layout at four widths while a run was active.** Measured from bounding boxes, because reading a PNG of the page is not reliable in this environment:

| Viewport | Face | Columns | Pause / Resume | Stop | Horizontal overflow |
|---|---|---|---|---|---|
| 360 x 640 | 240 x 240 | one, 328 wide | 56 high | 48 high | 0 |
| 768 x 1024 | 280 x 280 | one, 720 wide | 56 high | 48 high | 0 |
| 1280 x 900 | 280 x 280 | `480px 520px` | 56 high | 56 high (the row stretches) | 0 |
| 2560 x 1440 | 280 x 280 | `480px 520px` | 56 high | 56 high | 0 |

The two-column breakpoint is 900 (`min-[900px]` grid rule) and the content stops widening at 1024, so 2560 shows the same 480 and 520 columns centred. `document.documentElement.scrollWidth` equalled `innerWidth` at every width, and no element in `main` reached past the right edge.

**Idle with subjects.** Subject `Algebra`, Topic (`No topic` plus `Quadratics`), Mode (`Pomodoro` pressed, `Stopwatch`), one Start button, then the `Timer durations` and `Enable alerts` links and the Recent sessions panel reading "No sessions yet". No plan entry select appeared because that day had no open plan entries.

**Idle with no active subject** (after archiving `Algebra`, at 360): the panel read "Add a subject to start a session." with an "Add subject" link, and no Start button and no setup fields rendered. Recent sessions still read `Algebra` for the five sessions behind the archived subject, which is the EC-007 rule for history. Restoring the subject brought the setup back.

**Start.** `POST /api/app/timer/start` answered 201. The face read `24:57`, the state text `Focus`, the cycle text `Focus 1 of 4` with four dots, and the setup collapsed to `Algebra · Pomodoro · Quadratics`. The controls became Pause and Stop. `document.title` became `24:57 · Focus · Lumora`.

**Arc.** `<svg role="img" aria-label="25 of 25 minutes remaining">` with a `stroke-line` track and a `stroke-primary` progress circle carrying `stroke-dasharray="287.3 289.02"` at full width, both at `stroke-width="3.5"` in a 100-unit viewBox (about 10 px at the 280 px face).

**Refresh recovery (EC-001, AC-E2E-03).** The face read `24:51`; a full reload of `/timer` was performed; 3 s later the face read `24:47` and the run was still `Focus`, so the countdown continued from the stored `phase_ends_at` rather than restarting.

**Pause and resume.** `POST /pause` answered 200, the live region said "Paused.", the face froze at `24:41` across a 3 s wait, the controls became Resume and Stop, and the tab title reverted to `Timer · Lumora`. Resume answered 200 and the face moved `24:40` to `23:50` over 50 s.

**Heartbeats.** `POST /heartbeat` answered 200 three times across the first two minutes of the run: one immediately after the start, then the 60 s cadence, then one at the interval boundary. A request failed while the server was being rebuilt and the clock kept counting locally; the inline note "The server is unreachable. The timer keeps its place and syncs when the connection returns." appeared, and the next successful beat cleared it.

**Stop after two minutes (EC-012).** `POST /stop` answered 200 with `outcome = "time_only"`. The post-session panel read "Saved as time only (under 5 minutes of focus)" and offered "Topic status for Quadratics" with Save and Skip. Save sent `PATCH /api/app/topics/<topicId>` with `If-Match`, answered 200, closed the panel and announced "Topic status saved." Recent sessions gained `Algebra · 24 Nov · 17:43 · 1 min`.

**Timer durations.** The dialog opened with 25 / 5 / 15 / 4 and the four ranges as hints. A focus of 0 and 12 cycles were refused in place with "Choose 1 to 120." and "Choose 2 to 8." and no request was sent. Saving 1 / 1 / 1 / 2 sent `PATCH /api/app/timer/settings` without `If-Match` (the first save creates the row) and answered 200.

**Interval end, one-minute focus.** About 60 s after the start the phase moved on its own: the live region said "Focus interval ended. Break started.", a persistent alert region said "Focus interval ended. Break: 1 minute." with a Dismiss button, the face read `0:52` under the state text `Break`, the cycle text stayed `Focus 1 of 2`, and the tab title became `0:52 · Break · Lumora`.

**Stop outcomes.** Stopping after one completed interval reported "Saved: Algebra, 1 min · 1 Pomodoro". A stopwatch stopped after 4 s opened the panel under the heading "Not saved" with "Not saved: shorter than 1 minute." A stopwatch stopped after 3 min reported "Saved: Algebra, 3 min" with no Pomodoro count.

**EC-002 replace.** A second tab loaded while idle, a run was started in the first, then Start was pressed in the stale tab: `POST /start` answered 409, the page opened the dialog "A timer is already running" naming "Algebra, Stopwatch", and Replace sent `POST /start` again with `replaceRunning` true, which answered 201 and left one running Pomodoro. The replaced stopwatch was dropped as a 4 s discard.

**Cross-tab convergence.** With one run active, both tabs read `1:35` at the same moment, and the tab that had been idle caught up when it became visible again.

**EC-007 archive guard from the UI.** With a run active, A-7's Archive was confirmed and `POST /subjects/<id>/archive` answered 409; the error panel read "A session is running on this subject. Stop the timer first. Running session <run id>." After the run was stopped the same action answered 200.

**Sound and notifications (EC-024).** `Enable alerts` appears only because `Notification.permission` was `default`; the interval end calls the Web Audio chime and, when permission is granted, `new Notification`. Chromium in this environment grants nothing on its own, so the audible result was not observed; the in-app alert region is the record that was observed.

**Defects found and fixed in this pass.** The controls row rendered a disabled Start under the no-subject empty state; the row is now gated on a choosable subject. The durations dialog printed the range twice, once as a hint and once as the error; it now prints one message. The run summary line took the topic from the form rather than the run, so a reload dropped it; it now reads the run. A discarded stop titled its panel "Session saved"; it now reads "Not saved". The break alert said "1 minutes". Recent sessions showed "Subject" for an archived subject; the page now loads archived subjects for names while the picker still excludes them.

## E07 Purge handler and export contributor

- Requirement: NFR-074, DATA-RETENTION; M07 card row.
- Evidence: `tests/integration/profile.test.ts` asserts the exact registry order, and the suite passes inside E01. The timer block in `src/server/container.ts` registers the purge handler and the export contributor with `section: "timer"` between plans and sessions, and calls `timer.registerTimerArchiveGuard(database)`.
- Keys as asserted: `purgeHandlers.keys()` is `["profile", "auth", "exams", "plans", "timer", "sessions", "topics", "subjects"]`; `exportContributors.keys()` is `["profile", "exams", "plans", "timer", "sessions", "subjects", "topics"]`.
- E04 also asserts the behaviour: purge returns 1 row and the export section is `"timer"` with its runs.

## E08 DEFINITION-OF-DONE

| Item | State | Note |
|---|---|---|
| Every checklist row above has evidence | PARTIAL | Five of six rows are PASS in this document; the two-reader row is the one that does not |
| `npm run verify` exits 0 | PASS | E01 |
| Production build succeeds | PASS | E02 |
| Coverage floor for the milestone's module | PASS | E05 |
| Screen reader pass with two readers | NOT DONE | No reader was driven; the row stays unchecked |
| Owner tags the milestone | NOT DONE | The owner commits and tags; nothing was committed or tagged in this session |