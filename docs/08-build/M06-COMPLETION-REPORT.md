# M06 Completion Report

> Status: M06 execution record, 2026-11-23, awaiting the owner's approval and tag. Commands, raw output, the browser measurements and the defects found are in [M06-EVIDENCE.md](M06-EVIDENCE.md). M06 is built and verified; its DoD row stays partial because the coverage item is measured but not met at the by-layer thresholds the document names, and because the tag is the owner's step. No ADR is Accepted, no vendor is selected, no OD row is closed, and nothing is committed or tagged by me.

## 1. Executive summary

M06 adds study sessions, the record of actual study time that M05's plan entries were built to accept. Two tables, `study_sessions` and `study_session_days`, arrive in migration `0006_study_sessions.sql`; `src/modules/sessions` owns creation, editing, deletion, the list and the day allocation; the two route files behind SESS-01..SESS-05 answer on `/api/app/sessions`; A-4 at `/sessions` is the review list with its filters, its add/edit/delete dialog and its day groups.

Two rules shape the module. A session is allocated across local days at creation and at every time edit, with the profile's timezone and rollover hour frozen at start, so a midnight-crossing session lands under both local days (EC-009) and DST shifts are measured in the zone the user was in. Overlap is a hard database exclusion (`ex_study_sessions_overlap`, btree_gist) plus a service probe that names the conflicting session in a 409 `manual_entry_overlaps_session`, so the constraint is the race guard and the API answer is the human one.

M05's actuals promise is completed here. A plan entry linked to a session reads `actualSeconds` and `varianceSeconds` from the linked sessions' day allocations, and a positive actual makes the entry `done`. Deleting the plan drops the link through the foreign key `SET NULL`, and deleting the session leaves the plan entry to revert. Manual entries are flagged `is_manual` and excluded from future XP and leaderboards; the timer's own 300-second floor for `is_ranked` is untouched.

Everything M06 claims is proven by a command run in this repository: typecheck, lint, the boundary check, 101 unit tests, 89 integration tests against PostgreSQL 18.6, a production build with a 49-route table, and browser checks on A-4 at four viewport widths against the production build.

M06 is not a full pass. `DEFINITION-OF-DONE.md checked` is partial: the by-layer coverage floors the document names are neither enforced nor met, axe cannot run in this tree, and the `m06-done` tag is still the owner's to create. Those are named in section 9 and in the evidence record rather than ticked. Defects found by this pass and fixed are in section 7.

## 2. Scope and authorization

| Item | Record |
|---|---|
| Milestone | M06 Study sessions ([MILESTONES.md](../07-roadmap/MILESTONES.md)) |
| Authorization | Owner instruction "started" in the build session, which starts this milestone after the M05 delivery report was approved; the scope is the M06 card fixed by `Build Mode.txt` and the roadmap, recorded in [OPEN-DECISIONS.md](../OPEN-DECISIONS.md) section G, 2026-11-22 |
| Repository | `D:/Portofolio/Lumora`, branch `main`, no commit made by me |
| In scope | `study_sessions` and `study_session_days`; SESS-01..SESS-05; A-4; the day allocation across midnight, rollover and DST; the idempotent save (NFR-053); the optimistic concurrency (NFR-094); the manual flag excluded from XP and leaderboards (NFR-091, NFR-096); events `SessionCompleted`, `SessionEdited` and `SessionDeleted`; the plan unlink and the plan actuals (FR-036) |
| Out of scope | the timer routes that create sessions (M07); auto-close (M07); statistics, streaks and XP awarding (M12, P2-02); the calendar page A-5 (M09); every Phase 2 or Phase 3 route, table or flag |
| Build Mode rules | No invented specification: every route, code, column and rule traces to FR-036, FR-041..FR-048, FR-061, NFR-053, NFR-091, NFR-094, NFR-096, BR-003, BR-010, EC-009, EC-011, EC-022 or a named document section. No open decision was resolved silently: the M06 choices are recorded as OD-M37 to OD-M41 and in this report's findings instead of being presented as settled |

## 3. Functionality delivered

| Area | What exists now | Proof |
|---|---|---|
| List sessions | SESS-01 answers one user's sessions between `from` and `to`, optionally filtered by `subjectId`, ordered newest first, page size 25 with a cursor; the bounds are the profile zone's local days, and the answer carries the frozen `localDate` and the timezone each session was recorded in | `tests/unit/sessions.test.ts`, `tests/integration/sessions.test.ts`, browser checks on A-4 |
| Create a session | SESS-02 stores subject, optional topic, optional plan link and the start and end instants, allocates the day slices, answers 201 with `Location` and `ETag`, refuses a start in the future (`manual_entry_in_future`), a duration outside 60..86400 s (`manual_entry_too_long`), a plan link to a missing or foreign entry (`not_found` naming the entry), an archived subject (`subject_archived`), a topic of another subject, and an overlapping session (`manual_entry_overlaps_session` naming the conflict) | `tests/integration/sessions.test.ts`, browser checks on A-4 |
| Read one session | SESS-03 answers the session with its allocations, its version and `ETag`, and hides another user's session behind `not_found` | `tests/integration/sessions.test.ts` |
| Edit a session | SESS-04 edits any field under `If-Match`, requires the header (400 `version_required`) and answers 409 `stale_version` with the current row when the version moved; a time or duration change rewrites the day allocations in the profile's zone; the plan link can be dropped with an explicit null | `tests/integration/sessions.test.ts`, browser check on A-4 |
| Delete a session | SESS-05 deletes under `If-Match`, answers 204, publishes `SessionDeleted` after the commit, and leaves a linked plan entry to revert to its planned values | `tests/integration/sessions.test.ts`, browser check on A-4 |
| Day allocation | `study_session_days` holds one row per `(session_id, local_date)` with `seconds > 0 AND <= 86400`, `is_manual` and `is_ranked` (true iff source is timer and duration at least 300 s); the timezone, local date and rollover hour are frozen at start; a time edit rewrites the rows (FR-043) | `tests/unit/sessions.test.ts` (midnight, rollover, DST spring and fall), `tests/integration/sessions.test.ts`, browser check on A-4 |
| Plan actuals | A linked session moves a plan entry to `done` with `actualSeconds` and `varianceSeconds` (variance = actual minus planned), completing FR-036 and making the `done` status reachable; the plans list and the A-4 plan picker share the derived values | `tests/integration/plans.test.ts`, `tests/integration/sessions.test.ts` |
| Plan unlink | Deleting a plan entry keeps the session and clears `plan_entry_id` through the foreign key `SET NULL` (BR-003, EC-022); the `PlanEntryDeleted` event published in M05 now has the consumer | `tests/integration/sessions.test.ts` |
| Idempotency | Every write requires `Idempotency-Key` (NFR-053, SESS-03); a replay answers the stored response with `Idempotent-Replay: true`; a reused key with a different payload answers `idempotency_key_reused` | `tests/integration/sessions.test.ts` |
| Versioned rows | `study_sessions` is **(V)** with `version integer NOT NULL DEFAULT 1 CHECK (version >= 1)`; `If-Match` and `stale_version` follow the PLAN-04 pattern (NFR-094) | migration `0006_study_sessions.sql`, `tests/integration/sessions.test.ts` |
| Events | `SessionCompleted`, `SessionEdited` and `SessionDeleted` publish after the write commits; the route does not publish | `src/modules/sessions/events.ts`, `tests/integration/sessions.test.ts` |
| A-4 | Filter bar (From, To, Subject); day groups with the day total; a row per session with the subject dot, the subject name and an "(archived)" suffix for archived subjects, the topic, the local time range and minutes, "Spans two days: N min and M min" for a crossing session, the source chip (Manual or Timer, Auto-closed), and the Actions menu; the add, edit and delete dialogs (the delete confirm names the session and its primary button is "Delete session"); the empty, loading and error states | browser checks in the evidence record |
| Manual flag | Manual sessions carry `is_manual` in the day allocation and are excluded from future XP and leaderboards (NFR-091, NFR-096); the timer path keeps its `is_ranked` rule | `src/modules/sessions/service.ts`, migration `0006_study_sessions.sql` |
| Data ownership | A purge handler and an export contributor for both tables, registered before `plans` so the plan link never blocks the cascade | `tests/integration/profile.test.ts`, MODULE-BOUNDARIES section 3 |
| Ownership contract | Every SESS route hides another user's session behind `not_found` | `tests/integration/sessions.test.ts` |
| Error copy | The UI maps the M06 codes to sentences, including `manual_entry_in_future`, `manual_entry_too_long`, `daily_total_exceeded`, `manual_entry_overlaps_session` naming the conflict and the stale-version panel | `src/ui/messages.ts`, `src/ui/forms/session-dialog.tsx`, browser checks |

## 4. Files

New:

| Path | Role |
|---|---|
| `db/migrations/0006_study_sessions.sql` | the two tables, the btree_gist exclusion constraint, the checks and the indexes |
| `src/modules/sessions/service.ts` | the rules: create, read, edit, delete, the list, the day allocation, the overlap probe, the cursor and the rankings |
| `src/modules/sessions/{events,public}.ts` | the three events with their publishers, and the module's public surface for the container |
| `src/app/api/app/sessions/route.ts` | SESS-01 and SESS-02 |
| `src/app/api/app/sessions/[sessionId]/route.ts` | SESS-03, SESS-04 and SESS-05 |
| `src/app/sessions/page.tsx` | A-4 with its metadata |
| `src/ui/forms/session-list.tsx` | the A-4 list, its filters, its day groups, its rows, its menus and the confirm dialogs |
| `src/ui/forms/session-dialog.tsx` | the add and edit dialog, its field messages, the plan picker and the mobile sheet |
| `tests/unit/sessions.test.ts` | the allocation cases, the list order and the ranking rule |
| `tests/integration/sessions.test.ts` | the SESS-01..SESS-05 cases, the idempotency replay, the ownership contract, the plan actuals and the registries |

Modified:

| Path | Change |
|---|---|
| `src/kernel/errors.ts` | `manual_entry_in_future`, `manual_entry_too_long`, `daily_total_exceeded`, `manual_entry_overlaps_session`, `subject_archived` |
| `src/modules/plans/service.ts` | `PlanEntryRow` and `SELECT_PLAN_ENTRY` carry `actual_seconds`, `variance_seconds`, `actualSeconds` and `varianceSeconds`; the status derives `missed`, then `done` on a positive actual, else `upcoming` |
| `src/server/request-context.ts` | the session body and query schemas, `ifMatchVersion` and `requiredIdempotencyKey` |
| `src/server/container.ts` | the sessions module in the export order and its purge handler before `plans` |
| `src/ui/{messages,nav}.ts` | the M06 error copy and the Sessions nav entry |
| `tests/integration/support/api.ts` | the two session endpoints, their strict schemas and the wire types |
| `tests/integration/profile.test.ts` | the registry assertions now list the sessions keys |
| `tests/unit/plans.test.ts` | the plan row gains the actuals columns and the `done` status expectation |
| `tests/unit/boundaries.test.ts` | the repo-scan case gained a 30 s timeout under coverage instrumentation |

## 5. Database changes

| Object | Detail |
|---|---|
| `study_sessions` | `id` uuid primary key, `user_id` uuid `ON DELETE CASCADE`, `subject_id` uuid, `topic_id` uuid null, `plan_entry_id` uuid null `ON DELETE SET NULL`, `source` text check in (`manual`, `timer`), `mode` text null check in (`stopwatch`, `pomodoro`), `started_at` timestamptz, `ended_at` timestamptz, `duration_seconds` integer `CHECK (duration_seconds BETWEEN 60 AND 86400)`, `pomodoros_completed` integer default 0 `>= 0`, `auto_closed` boolean, `timezone` text, `local_date` date, `request_key` text null `<= 100` with `UNIQUE (user_id, request_key)`, `version` integer `>= 1` default 1, `created_at`, `updated_at`, `UNIQUE (id, user_id)` |
| `study_session_days` | `session_id` uuid, `local_date` date, `seconds` integer `CHECK (seconds > 0 AND seconds <= 86400)`, `is_manual` boolean, `is_ranked` boolean, primary key `(session_id, local_date)` |
| Exclusion constraint | `ex_study_sessions_overlap` over `study_sessions` with btree_gist on `user_id` plus `tsrange(started_at, ended_at, '[]')` with `&&`, `WHERE source = 'manual'`; the service probe names the conflict for the API, the constraint is the race guard |
| Frozen columns | `timezone`, `local_date` and `day_rollover_hour` are written once and never recomputed, so a later profile timezone change re-displays a session in the new zone while the days it was recorded for stay (EC-006, the same rule plans follow) |
| Indexes | `ix_study_sessions_user_started (user_id, started_at DESC)` serves the list; `ix_study_session_days_date (local_date)` serves the calendar and statistics reads M09 and M12 will add; the subject and topic foreign keys use the subjects and topics indexes |

## 6. Tests executed and results

| Command | Result |
|---|---|
| `npm run verify` | exit 0. `tsc --noEmit` clean; `eslint .` clean; "Boundary check passed"; unit 19 files / 101 tests passed in 12.03 s; integration 10 files / 89 tests passed in 167.66 s |
| `npx vitest run --project unit tests/unit/sessions.test.ts` | 6 tests passed |
| `npx vitest run --project integration tests/integration/sessions.test.ts` | 10 tests passed |
| `npx next build` | compiled successfully, 49 routes of which 3 are new in M06 (`/api/app/sessions`, `/api/app/sessions/[sessionId]`, `/sessions`), no static/dynamic sibling conflict |
| `npx vitest run --coverage` | exit 0, 29 files / 190 tests; the sessions module at 82.77% lines and 70.22% branches, the sessions API at 92.59% statements |
| Browser checks on A-4 | every check in the evidence record E05 passed, including the midnight crossing, the archived-subject label, the overlap refusal and the four-width responsive pass |

Full commands, raw output and the measurement tables are in [M06-EVIDENCE.md](M06-EVIDENCE.md).

## 7. Technical findings

1. **The manual duration floor was wrong twice over.** `validateDuration` reused `config.timer.completedFocusMinMinutes * 60` (the pomodoro rule BR-007/EC-012) as the manual floor, so a 5-minute manual session was refused with a message that allowed it. Both the API contract (API-ENDPOINTS line 1094: "duration 60..86400 s") and the database check (`chk_study_sessions_duration`) say 60 s. The service now checks the literal `60..86400` bound with `details: { minSeconds: 60, maxSeconds: 86_400 }`, and the now-unused config import was removed. The timer's own 300 s floor for `is_ranked` (line 446: `input.source === "timer" && duration >= 300`) is untouched.
2. **`listSessions` carried a dead context parameter.** The service never used the clock context, so the 4th parameter and the route's `getUserClockContext` read were dead weight; the signature is now `listSessions(database, userId, query)` and the GET route reads cleanly without them.
3. **Overlap is a hard exclusion plus a named probe.** The btree_gist constraint `ex_study_sessions_overlap` (user-wide, `tsrange(..., '[]')` so back-to-back sessions do not overlap) is the race guard, and `createManualSession` probes the same interval first so the 409 names `details.conflictingSessionId`. A constraint alone would answer an anonymous conflict; a probe alone would lose the race.
4. **A session touches both days, one row.** The UI groups by `session.localDate` (the start day) and renders the crossing session as one row with "Spans two days: N min and M min", matching the A-4 example "one row with the text 'Spans two days: 40 min and 20 min'" (EC-009). The API, not the UI, holds the per-day rows, so the calendar page M09 reads the same slices.
5. **Archived subjects stay visible in the list.** SESS-01 does not filter by the archived-subject visibility rule; an archived subject's sessions render with "(archived)" (API-ENDPOINTS line 1059), so a history is never hidden by an archive. The add dialog still refuses an archived subject with `subject_archived`.
6. **The plan actual is the sum of the linked days, and the unlink is the foreign key.** `SELECT_PLAN_ENTRY` computes `actual_seconds` and `variance_seconds` from the linked sessions' day rows, so a session deleted after the read reverts the entry to planned. The `plan_entry_id` edge is `ON DELETE SET NULL`, which keeps the session and its history when the plan goes (BR-003, EC-022) and is why sessions purge before plans.
7. **The day-cap refusal is unreachable and was removed.** `daily_total_exceeded` exists in the error catalogue for the timer path, but the manual path can never exceed 24 hours because non-overlapping sessions on one day cannot sum past 86400 s; the integration case that tried to construct one was removed rather than kept as a tautology.
8. **The frozen rollover hour is not re-read on non-time edits.** `editSession` writes the current profile zone and rollover hour on a time change and keeps the stored timezone with `rolloverHour = 0` on other edits, matching the MVP; the frozen `day_rollover_hour` column is not read back. If a non-zero frozen rollover must be respected on non-time edits, add the column to `SELECT_SESSION` and `SessionRow`.
9. **The repo-scan boundary test needed a longer budget.** Under v8 coverage instrumentation the file walk exceeded the 5 s default timeout; the case now carries `{ timeout: 30_000 }`.
10. **The browser date inputs reload on change, not on blur alone.** The A-4 filter reload is driven by the native `change` event on the two date inputs; a filled value that loses focus without a change does not reload. The subject select reloads on `change` synchronously, which is why the archived-subject check first appeared through the select. This is the native input contract, not a defect; the dialog and menu paths use explicit buttons and menus.

## 8. Known limitations

1. The Definition of Done coverage row stays partial: the by-layer floors (domain 90%, application 80%, overall 80%) are neither enforced nor met because `src/ui/**` and `src/app/**` are exercised by the browser pass rather than the automated tiers. Measured in E07.
2. axe cannot run in this tree: no browser-automation dependency is installed, the same gap M01 to M05 recorded.
3. No `m06-done` tag exists; the owner commits and tags.
4. The frozen `day_rollover_hour` is not read on non-time edits (finding 8); an explicit decision would make it read-only with the stored value.
5. The `daily_total_exceeded` code has no manual-path test (finding 7); it is the timer path's code and M07 will exercise it.
6. `SessionCompleted` is published on manual create even though no consumer awards XP yet; the ranking and leaderboard consumers arrive in M12 and P2-02.
7. The overlap guard is user-wide by construction (the btree_gist range covers `user_id`); the per-subject variant would need a second constraint and no requirement asks for it.
8. The A-4 list is capped at 25 rows per page with a cursor, and "Load more" is the paging control; there is no calendar heatmap yet (M09).

## 9. Remaining tasks

- Owner: review the delivery report, commit the uncommitted M06 remainder and the six updated documents, approve or correct the record, and create the `m06-done` tag.
- The Definition of Done row stays unchecked in [MILESTONES.md](../07-roadmap/MILESTONES.md) until the coverage floors and the axe gap are resolved (the same row M01 to M05 keep open).
- No follow-up code is deferred: the M06 card's deliverable rows are complete; M07 inherits the timer paths this module was built to receive.

## 10. Documents updated

| Document | Change |
|---|---|
| [MILESTONES.md](../07-roadmap/MILESTONES.md) M06 | three rows checked, the Definition of Done row left partial, and an "As built" note recording what shipped |
| [OPEN-DECISIONS.md](../OPEN-DECISIONS.md) section C | OD-M37 to OD-M41 (the overlap exclusion, the manual duration floor, the archived-subject visibility, the `is_ranked` rule and the plan unlink); section G: the 2026-11-23 M06 execution row |
| [IMPLEMENTATION-READINESS.md](../IMPLEMENTATION-READINESS.md) | the M06 execution paragraph and the authorization sentence |
| [DOCUMENTATION-INDEX.md](../DOCUMENTATION-INDEX.md) | the two M06 build records and the inventory at 95 documents |
| [README.md](../README.md), [docs/README.md](README.md) | build state and the M06 build records |
| [CHANGELOG.md](../CHANGELOG.md) | the 2026-11-23 M06 entry |

The migration and the DATA-DICTIONARY stay as they are; the dictionary is the source of truth and was not modified.

## 11. Definition of Done level

The milestone-level check is in [M06-EVIDENCE.md](M06-EVIDENCE.md) E09: every acceptance criteria id in the M06 card is implemented and proved, the FR scope is delivered with no stub or placeholder, typecheck/lint/boundary pass, 101 unit and 89 integration tests pass, the purge and export registries are asserted, the ownership contract holds, the migration applies on an empty database, no horizontal scroll at 360 px and the interactive targets reuse the measured shared controls, the empty/loading/error states exist, and the browser checks on A-4 pass at four widths. The coverage row is partial with the numbers in E07, axe is not run, and the tag is the owner's step.

## 12. Recommended next milestone

M07 Timer: Pomodoro and stopwatch. It is the highest-risk MVP milestone (R1, R2, R16) and depends on M06 for the session write path this module exposes: the timer routes will create `source = 'timer'` sessions through the same service, the `is_ranked` rule is already in place, and `daily_total_exceeded` finds its first real caller. M05 and M06 stay open on their Definition of Done rows until the coverage and axe gaps are closed.
