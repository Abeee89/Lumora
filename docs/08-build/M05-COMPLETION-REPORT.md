# M05 Completion Report

> Status: M05 execution record, 2026-11-22. Commands, raw output, the browser measurements and the three fixed defects are in [M05-EVIDENCE.md](M05-EVIDENCE.md). M05 is built and verified; its DoD row stays partial because the coverage item is measured but not met at the by-layer thresholds the document names, and because the tag is the owner's step. No ADR is Accepted, no vendor is selected, no OD row is closed, and nothing is committed or tagged by me.

## 1. Executive summary

M05 adds study plans, the layer that turns the taxonomy M03 built and the exam dates M04 stored into intended study time. One table, `plan_entries`, arrives in migration `0005_plan_entries.sql`; `src/modules/plans` owns creation, editing, deletion, the missed mark and the two advisory warnings; the three route files behind PLAN-01..PLAN-06 answer on `/api/app/plan-entries`; A-6 at `/plan` is the list with its filters and its dialog.

Two rules shape the module. Overlap is advisory and user-wide (BR-026), so a save that intersects an existing entry is refused once with `overlap_confirmation_required` and goes through when the caller repeats it with `confirmedWarnings: ["overlap"]`. An entry that starts after one of the subject's exam dates is refused the same way with `exam_date_warning_confirmation_required`, and when both apply the refusal carries both warnings with the overlap code first, so one confirm clears both. Past entries are read-only (FR-035, BR-028) except for the missed mark (FR-033).

Actual time is deliberately absent. FR-036 and AC-FR-036-* belong to M06 under B-07, because the actual value is the sum of linked sessions and no session table exists yet: PLAN-01 and PLAN-03 answer planned values and a `status` derived from `missed_at` alone, so `done` is unreachable until M06 rather than faked as zero.

Everything M05 claims is proven by a command run in this repository: typecheck, lint, the boundary check, 95 unit tests, 79 integration tests against PostgreSQL 18.6, a production build with a 46-route table, and browser checks on A-6 at four viewport widths against the production build.

M05 is not a full pass. `DEFINITION-OF-DONE.md checked` is partial: the by-layer coverage floors the document names are neither enforced nor met, axe cannot run in this tree, and the `m05-done` tag needs the owner's commit. Those are named in section 9 and in the evidence record rather than ticked. Three defects were found by this pass and fixed; they are in section 7.

## 2. Scope and authorization

| Item | Record |
|---|---|
| Milestone | M05 Study plans ([MILESTONES.md](../07-roadmap/MILESTONES.md)) |
| Authorization | Owner instruction "started" in the build session, which starts this milestone after the M04 delivery report was approved; the scope is the M05 card fixed by `Build Mode.txt` and the roadmap, recorded in [OPEN-DECISIONS.md](../OPEN-DECISIONS.md) section G, 2026-11-22 |
| Repository | `D:/Portofolio/Lumora`, branch `main`, no commit made by me |
| In scope | `plan_entries`; PLAN-01..PLAN-06; A-6; the overlap warning with `confirmedWarnings`; the exam-date warning (FR-038, BR-025); the past-entry read-only rule (FR-035, BR-028); the missed mark (FR-033); the purge handler and the export contributor for the table |
| Out of scope | actual values and variance on a plan entry, the `done` status and the session link (FR-036, AC-FR-036-*, M06 under B-07); plan generation and the calendar page A-5 (M09); drag, resize and keyboard editing of PLAN-04 (Phase 2, P2-06); to-dos (M08); statistics (M12); every Phase 2 or Phase 3 route, table or flag |
| Build Mode rules | No invented specification: every route, code, column and rule traces to FR-030..FR-038, NFR-016, NFR-092, NFR-094, BR-001, BR-002, BR-025, BR-026, BR-028, BR-030, EC-003 or a named document section. No open decision was resolved silently: the M05 choices are recorded as OD-M36 and in this report's findings instead of being presented as settled |

## 3. Functionality delivered

| Area | What exists now | Proof |
|---|---|---|
| List plan entries | PLAN-01 answers one user's entries between `from` and `to`, optionally filtered by `subjectId` and `status`, ordered by start time; the bounds are the profile zone's local days, the span is capped at 93 days, archived subjects are hidden, and the answer carries the frozen `localDate` and the timezone each entry was planned in | `tests/unit/plans.test.ts`, `tests/integration/plans.test.ts`, browser checks on A-6 |
| Create a plan entry | PLAN-02 stores subject, optional topic, start and duration 5..480, answers 201 with `Location` and `ETag`, refuses a start that is not in the future, an archived subject, a topic of another subject and an archived topic, and honours `confirmedWarnings` | `tests/integration/plans.test.ts`, browser check on A-6 |
| Read one entry | PLAN-03 answers the entry with its version and `ETag`, and hides another user's entry behind `not_found` | `tests/integration/plans.test.ts` |
| Edit an entry | PLAN-04 edits any field under `If-Match`, requires at least one field, answers 400 `version_required` without the header and 409 `stale_version` with the current row when the version moved, refuses an entry that has started with `past_entry_read_only`, and re-runs both warnings | `tests/integration/plans.test.ts`, browser check on A-6 |
| Delete an entry | PLAN-05 deletes under `If-Match` and answers 204; a session that pointed at the row would keep its duration and lose its link (BR-003, EC-022), and `PlanEntryDeleted` is published after the commit for M06 | `tests/integration/plans.test.ts`, browser check on A-6 |
| Mark missed | PLAN-06 sets `missed_at` for an entry that has started, answers 200 without a write when it is already missed, refuses a future entry with `not_started_yet`, and keeps the entry in every list | `tests/integration/plans.test.ts`, browser check on A-6 |
| Overlap warning | A save that intersects another entry of the same user in `[start, start + duration)` is refused with `overlap_confirmation_required` and one warning per intersecting entry, naming its subject, start and duration; intervals that only touch do not overlap | `tests/unit/plans.test.ts`, `tests/integration/plans.test.ts`, browser checks |
| Exam-date warning | A save whose local date is after one of the subject's exams that is still ahead of today is refused with `exam_date_warning_confirmation_required` and the exam date; a save on the exam day itself is not warned | `tests/unit/plans.test.ts`, `tests/integration/plans.test.ts`, browser checks |
| Past entries are read-only | An entry whose start has passed refuses every edit with `past_entry_read_only`, and the only write it accepts is the missed mark | `tests/integration/plans.test.ts`, browser check on A-6 |
| Idempotency | Every write requires `Idempotency-Key`; a replay answers the stored response with `Idempotent-Replay: true` and a reused key with a different payload answers `idempotency_key_reused` | `tests/integration/plans.test.ts` |
| A-6 | Filters for the range, the subject and the status; day groups with the planned minutes per day; a row per entry with the subject dot, the topic, the local start time, the planned minutes and the status; a read-only past row; the Actions menu with Edit and Delete, or Mark as missed; the add, edit and delete dialogs; the "Save anyway?" dialog for one or two warnings; the empty, filtered-empty, loading and error states | browser checks in the evidence record |
| Data ownership | A purge handler and an export contributor for `plan_entries`, registered before `topics` so the child rows go first | `tests/integration/profile.test.ts`, MODULE-BOUNDARIES section 3 |
| Ownership contract | Every PLAN route hides another user's entry behind `not_found` | `tests/integration/plans.test.ts` |
| Error copy | The UI maps the M05 codes to sentences, including the duration range, the 93-day span, the past entry, the stale version and the two warning refusals | `src/ui/messages.ts`, `src/ui/forms/plan-dialog.tsx`, browser checks |

## 4. Files

New:

| Path | Role |
|---|---|
| `db/migrations/0005_plan_entries.sql` | the table, its three foreign keys and four indexes |
| `src/modules/plans/service.ts` | the rules: create, read, edit, delete, missed, the list, the overlap check, the exam-date warning and the frozen local date |
| `src/modules/plans/{events,public}.ts` | `PlanEntryDeleted` with its publisher, and the module's public surface for the container and M06 |
| `src/app/api/app/plan-entries/route.ts` | PLAN-01 and PLAN-02 |
| `src/app/api/app/plan-entries/[entryId]/route.ts` | PLAN-03, PLAN-04 and PLAN-05 |
| `src/app/api/app/plan-entries/[entryId]/missed/route.ts` | PLAN-06 |
| `src/app/plan/page.tsx` | A-6 with its metadata |
| `src/ui/forms/plan-dialog.tsx` | the add and edit dialog, its field messages and the mobile sheet |
| `src/ui/forms/plan-list.tsx` | the A-6 list, its filters, its rows, its menus and the confirm dialogs |
| `tests/unit/plans.test.ts` | the range, the zone windows, the filters, the create order, the warning echo and the check order |
| `tests/integration/plans.test.ts` | the PLAN-01..PLAN-06 cases, the warnings, ownership, the registries and the idempotency replay |

Modified:

| Path | Change |
|---|---|
| `src/kernel/errors.ts` | `invalid_date_range`, `past_entry_read_only`, `not_started_yet`, `overlap_confirmation_required`, `exam_date_warning_confirmation_required` |
| `src/kernel/config.ts` | `plans.maxRangeDays`, `plans.minDurationMin`, `plans.maxDurationMin` |
| `src/modules/exams/{service,public}.ts` | `upcomingExamsBySubject`, so the exam-date warning reads exam dates through the exams interface rather than its tables |
| `src/server/request-context.ts` | the plan query and body schemas |
| `src/server/container.ts` | the plans module in the export order and its purge handler between `exams` and `topics` |
| `src/ui/{messages,nav}.ts` | the M05 error copy and the Calendar entry pointing at `/plan` |
| `src/ui/format.ts` | the local-date, local-time and instant helpers the page and the forms share |
| `src/ui/dialog.tsx` | the `className` pass-through the mobile sheet needs |
| `src/ui/forms/exam-workspace.tsx` | `ButtonLink`, so the plans empty state and the exam page share one control |
| `tests/integration/support/api.ts` | the three M05 endpoints, their schemas and the wire types |
| `tests/integration/exams.test.ts` | the export assertion that pins `exam_date` as text |
| `tests/integration/profile.test.ts` | the registry assertions now list the M05 keys |
| `vitest.config.ts` | the `src/modules/plans/**` coverage floor beside the kernel and exams ones |

## 5. Database changes

| Object | Detail |
|---|---|
| `plan_entries` | `id` uuid primary key, `user_id` uuid `ON DELETE CASCADE`, `subject_id` uuid, `topic_id` uuid null, `starts_at` timestamptz, `duration_min` smallint with `CHECK (duration_min BETWEEN 5 AND 480)`, `timezone` text, `local_date` date, `missed_at` timestamptz null, `version` integer `>= 1` default 1, `created_at`, `updated_at`, `UNIQUE (id, user_id)`, `(subject_id, user_id) -> subjects (id, user_id) ON DELETE NO ACTION` and `(topic_id, subject_id) -> topics (id, subject_id) ON DELETE NO ACTION` |
| Indexes | `ix_plan_entries_user_starts (user_id, starts_at)` serves the range read and the overlap check; `ix_plan_entries_user_date (user_id, local_date)` serves the per-day grouping; `ix_plan_entries_subject (subject_id)` and a partial `ix_plan_entries_topic (topic_id) WHERE topic_id IS NOT NULL` serve the foreign keys |
| No exclusion constraint | Overlap is advisory (BR-026, EC-003), so the constraint would be wrong as well as expensive: the API must be able to store a second entry after the user confirms, which an exclusion constraint forbids |
| Frozen columns | `timezone` and `local_date` are written once and never recomputed, so a later profile timezone change re-displays the entry in the new zone while the planned day it was made for stays (EC-006, the same rule sessions follow) |
| Why both edges are `NO ACTION` | Subjects and topics are archived, never deleted (BR-029), and account deletion removes the rows through the `users` cascade; `CASCADE` on the subject edge would silently delete a user's plan when a subject was hard-deleted, which no route does |

## 6. Tests executed and results

| Command | Result |
|---|---|
| `npm run verify` | exit 0. `tsc --noEmit` clean; `eslint .` clean; "Boundary check passed"; unit 18 files / 95 tests passed in 5.03 s; integration 9 files / 79 tests passed in 144.05 s |
| `npx vitest run --project unit tests/unit/plans.test.ts` | 19 tests passed |
| `npx vitest run --project integration tests/integration/plans.test.ts` | 20 tests passed |
| `npx next build` | compiled successfully, TypeScript finished with no diagnostics, 46 routes of which 29 are under `/api/app` (3 new in M05) plus `/plan`, no static/dynamic sibling conflict |
| Browser checks on A-6 | every check in the evidence record E05 and E06 passed after the three fixes in E08; the measurements in E06 show no horizontal overflow at 360, 768, 1280 or 2560 px and a full-height sheet at 360 px |

Full commands, raw output and the measurement tables are in [M05-EVIDENCE.md](M05-EVIDENCE.md).

## 7. Technical findings

1. **A Postgres `date` is not a calendar date in JavaScript, and the export path proved it twice.** `pg` returns a `date` column as a `Date` at local midnight, so the plans export serialized `local_date` as `2026-11-22T17:00:00.000Z` for the row planned on `2026-11-23`. `exportPlans` now selects `local_date::text`, and because `exportExams` had the same defect with `exam_date`, it selects `e.exam_date::text` too and the M04 test pins the text shape. The rule for this repository, now applied in three modules: never round-trip a business date through `Date`.
2. **`local_date` is frozen, so it is not the filter.** PLAN-01 derives its bounds from `localDayRange(from, to, ctx.timezone, ctx.rolloverHour)` rather than comparing the stored column, which keeps a range filter correct after a timezone change and lets one query serve every zone. The 93-day cap is counted in UTC day numbers, so a range crossing a DST switch is measured in days rather than in 23-hour and 25-hour spans.
3. **Two warnings, one confirmation, two refusal codes.** `refuseUnconfirmed` throws `overlap_confirmation_required` when any overlap is unconfirmed and `exam_date_warning_confirmation_required` otherwise, and lists every unconfirmed warning in `details.warnings`. The split exists because the two causes need different sentences in the UI while the user needs one confirm: the dialog lists both lines, and both codes are confirmed by sending both codes back.
4. **Overlap is user-wide, so a Physics entry can warn about Algebra.** BR-026 says overlapping entries "for the same user", and the resource being double-booked is the user's time, not the subject's. The warning carries the intersecting entry's `subjectId`, and A-6 renders its name, which is why the dialog reads "This overlaps Algebra at 10:00." while the entry being saved is Physics. Confining the check to the subject would be a different product rule.
5. **The check order in PLAN-04 is part of the contract.** `version_required`, then `at_least_one_field`, then `not_found`, then `stale_version`, then `past_entry_read_only`, then field validation, then warnings, then the update. A caller learns the cheapest actionable failure first, and `not_found` before any content check means the past-entry rule cannot leak the existence of another user's row.
6. **FR-036 actuals were omitted rather than stubbed.** No `actualSeconds` and no `varianceSeconds` exist; `status` is `upcoming` or `missed` from `missed_at` alone. A field that can only ever read zero is a false statement on the wire, and B-07 assigns the actual value and `done` to M06 with the session link they need. The test schema is `.strict()`, so the day M06 adds the field a forgotten mapping fails the parse.
7. **`not_started_yet` is reported on `body`, not on `startsAt`.** PLAN-06 is a route without a body, so an error path naming a field the request cannot carry would be unusable by the form; the code keeps the rule and the path stays `body`, which is the same convention `at_least_one_field` uses on PLAN-04.
8. **The interval comparison is strict at both ends.** `p.starts_at < $3 AND $2 < p.starts_at + duration` makes 10:00-11:00 and 11:00-12:00 non-overlapping, which is AC-FR-034-3 and the behaviour the browser pass re-observed. A `<=` on either side would have produced a warning for a back-to-back schedule, the most common plan there is.
9. **The empty state needed a second sentence and an action.** The browser pass found AC-FR-037-3 unimplemented: a filtered list that matched nothing said "No planned sessions" and offered no way back. The branch now distinguishes a filtered result and offers Clear filters, which resets the range, the subject and the status.
10. **`PlanEntryDeleted` is published after the commit with no consumer.** M06's session link needs the event (BR-003, EC-022), and publishing it now keeps the delete path single and testable, exactly as M04 did with `ExamArchived`. Until M06 registers a subscriber, the event has no effect, which is recorded rather than hidden.

## 8. Known limitations

1. Actual planned-versus-actual display does not exist, so A-6 shows planned minutes only and the `done` status is unreachable. This is the B-07 boundary, not an omission; FR-036 and AC-FR-036-* are M06's.
2. The row Actions menu closes when focus leaves it but not on Escape. The M02 and M03 list menus behave the same way, and a per-list handler would introduce a second convention; the fix belongs with the M10 accessibility pass.
3. PLAN-01 is unpaginated. A user with hundreds of entries inside a 93-day window receives all of them; the cap on the window is the current bound, and paging is an API decision for the calendar consumer in M09.
4. The range filter defaults to today plus 13 days, so an entry outside that window is invisible until the range is widened. The default is a UI choice, not a server rule, and the clear-filters action returns to it.
5. `PlanEntryDeleted` has no consumer and the event registry is in process, so a restart loses an unpublished event. The same limitation M03 and M04 recorded (OD-M32); delivery becomes durable with the outbox.
6. The Calendar navigation item points at `/plan` because A-5 does not exist yet. The label and the target need the calendar before they agree; recorded as OD-M36.
7. Two entries may overlap without any record of the confirmation: the API warns, the user confirms, and nothing stores that they did. A later reader cannot tell a deliberate overlap from an accidental one, which matches BR-026's advisory wording.

## 9. Remaining tasks

| Item | Why it is open | Where it is recorded |
|---|---|---|
| `DEFINITION-OF-DONE.md checked` row | The by-layer coverage floors the document names have no threshold and are not met; axe cannot run; the tag needs the owner's commit | E09, E10, this section |
| Coverage floors | `npm run test:coverage` exits 0 with the kernel at 94.94% lines, the exams module at 90.41% and the plans module at 94.57% against the configured floors, but overall lines measure 49.96%, below the 80% the document names and 0.16 points under M04 because the two new forms are covered only by the browser pass | E10, OD-M31 |
| Actual values and `done` | M06 owns FR-036 with the session link (B-07) | MILESTONES M05 card, MILESTONES M06 card |
| Escape on the row menu | One accessibility handler for every list menu is the M10 pass, not a per-list divergence | section 8, item 2 |
| Calendar label and target | A-5 ships in M09 | OD-M36 |
| `m05-done` tag | The owner commits and tags; nothing was committed by me | E09, E11 |

## 10. Docs updated

| Document | Change |
|---|---|
| [08-build/M05-EVIDENCE.md](M05-EVIDENCE.md) | new: commands, raw output, the browser measurements, the three defects found and fixed, the registry contributions and the DoD check |
| [08-build/M05-COMPLETION-REPORT.md](M05-COMPLETION-REPORT.md) | this file |
| [07-roadmap/MILESTONES.md](../07-roadmap/MILESTONES.md) | three checklist rows ticked and an "As built" note on the M05 card |
| [OPEN-DECISIONS.md](../OPEN-DECISIONS.md) | the M05 execution record in section G and the OD-M36 row in section C |
| [03-architecture/ERROR-HANDLING.md](../03-architecture/ERROR-HANDLING.md) | section 4 gains `invalid_date_range`, and the M05 note confirms `duration_out_of_range`, `subject_archived`, `past_entry_read_only` and the two warning codes on the plan routes, with the malformed-date rule stated |
| [IMPLEMENTATION-READINESS.md](../IMPLEMENTATION-READINESS.md) | sections 6 and 7 record the M05 status and the authorization |
| [CHANGELOG.md](../CHANGELOG.md), [README.md](../../README.md), [docs/README.md](../README.md), [DOCUMENTATION-INDEX.md](../DOCUMENTATION-INDEX.md) | the milestone entry, the document counts and the build-status line |

## 11. Definition of Done at M05 level

Item-by-item record in [M05-EVIDENCE.md](M05-EVIDENCE.md) E09, with the coverage measurement in E10. Summary: typecheck, lint, the boundary check, unit tests, integration tests, the ownership contract, the registry contributions, idempotency and concurrency, the migration path, the three configured coverage floors, the four-viewport measurement, the dialog sheet, the empty, filtered, loading and error states, the keyboard paths, the completion report and the no-future-phase check all pass. The coverage item is partial because the by-layer floors the Definition of Done names are neither enforced nor met; axe cannot run; the tag is the owner's step.

## 12. Recommended next milestone

M06 Study sessions. It is the consumer this milestone prepared: `plan_entries` is the planned half of planned versus actual, `PlanEntryDeleted` is published for the link rule, and the `status` field already carries the shape the actual value completes. M06 adds FR-036, closes AC-FR-036-* and makes `done` reachable, and it is the first milestone whose day allocation depends on the same frozen `local_date` and `timezone` columns M05 writes.

## 13. Not done, and not claimed

1. Nothing is staged, committed or tagged by me. The owner committed the M05 build in `900a90b push profile` and `1931a0b push ui modules`; the three fixes in E08 and both documents were written after that, so `src/ui/forms/plan-list.tsx`, `src/ui/forms/plan-dialog.tsx`, [M05-EVIDENCE.md](M05-EVIDENCE.md) and this report sit uncommitted in the working tree.
2. No axe run, no load test and no staging deploy: M05 claims none of them. The coverage command was run and its result is in E10.
3. Three defects were found and fixed in this pass: the `date` cast in both exports, the missing clear-filters action and the 38 px short mobile sheet. No other defect is known as of this record.
4. The overlap rule being user-wide, the omitted actual fields, the `body` path on `not_started_yet` and the Calendar item pointing at `/plan` are decisions, not gaps: the first three are argued in section 7 and the fourth is OD-M36, and any of them can be reversed cheaply if the owner disagrees.