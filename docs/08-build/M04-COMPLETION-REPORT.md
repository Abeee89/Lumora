# M04 Completion Report

> Status: M04 execution record, 2026-11-21. Commands, raw output and the browser measurements are in [M04-EVIDENCE.md](M04-EVIDENCE.md). M04 is built and verified; one of its four checklist rows stays partial because the acceptance criteria it names need the Phase 2 readiness feature. No ADR is Accepted, no vendor is selected, no OD row is closed, and nothing is committed or tagged by me.

## 1. Executive summary

M04 adds the exam layer the roadmap puts between the study taxonomy and study plans. Two tables, `exams` and `exam_topics`, arrive in migration `0004_exams_and_checklists.sql`; `src/modules/exams` owns the exam rules, the countdown, the checklist and the archive rule; the four route files behind EXAM-01..EXAM-06 answer on `/api/app/exams`; A-12 lists exams under Upcoming and Archived tabs and A-13 is the exam workspace with its checklist and its topic picker. The worker gains its second recurring job, `exam_auto_archive`, which runs hourly and publishes `ExamArchived` for the exams whose date crossed the user's local today. Exams also registers the `TopicArchived` subscriber that M03's contract was built for: archiving a topic removes it from every checklist (EC-008). Both new tables register a purge handler and an export contributor.

The archive state is derived, not stored. There is no `archived_at` on `exams`: an exam is archived when its `exam_date` is before the user's local today, so exam day is still upcoming, both lists are plain queries, and a profile timezone change takes effect on the next read. The hourly job therefore changes no row; it exists to publish the event FR-124 and EC-008 need.

Everything M04 claims is proven by a command run in this repository: typecheck, lint, the boundary check, 76 unit tests, 59 integration tests against PostgreSQL 18.6, a production build with a 43-route table, and browser checks on both pages at four viewport widths against the production build.

M04 is not a full pass. `DEFINITION-OF-DONE.md checked` is partial: AC-FR-126-*, AC-FR-127-* and AC-FR-128-* are readiness criteria and readiness is Phase 2 (P2-05), the coverage floors have no command to run them, axe cannot run in this tree, and the `m04-done` tag needs the owner's commit. Those are named in section 9 and in the evidence record rather than ticked. Four defects were found by the runtime pass and fixed; they are in section 7.

## 2. Scope and authorization

| Item | Record |
|---|---|
| Milestone | M04 Exams (basic) ([MILESTONES.md](../07-roadmap/MILESTONES.md)) |
| Authorization | Owner instruction "ready" in the build session, which starts this milestone after the M03 delivery was approved the same day; the scope is the M04 card fixed by `Build Mode.txt` and the roadmap, recorded in [OPEN-DECISIONS.md](../OPEN-DECISIONS.md) section G, 2026-11-21 |
| Repository | `D:/Portofolio/Lumora`, branch `main`, no commit made by me |
| In scope | `exams`, `exam_topics`; EXAM-01..EXAM-06; A-12 and A-13; the countdown; the checklist and the EC-008 subscriber; the hourly auto-archive job; the purge handlers and export contributors for both tables |
| Out of scope | the readiness score, its weight input and its label (FR-126..FR-128, Phase 2 P2-05); study plans and plan generation (M05); sessions, timers and streaks (M06/M07); statistics (M12); every Phase 2 or Phase 3 route, table or flag |
| Build Mode rules | No invented specification: every route, code, column and rule traces to FR-120..FR-125, NFR-016, NFR-053, NFR-094, BR-025, EC-008, EC-013 or a named document section. No open decision was resolved silently: the three M04 choices are recorded as OD-M33, OD-M34 and OD-M35 instead of being presented as settled |

## 3. Functionality delivered

| Area | What exists now | Proof |
|---|---|---|
| Create an exam | EXAM-02 stores subject, title and date for one user, answers 201 with `Location` and `ETag`, trims the title, refuses a past date with `exam_date_in_past` and an archived subject with `subject_archived` | `tests/integration/exams.test.ts`, browser check on A-12 |
| Read one exam | EXAM-03 answers the exam with the subject, the derived `state`, the checklist counts and a `countdown` that is null when archived | `tests/integration/exams.test.ts` |
| Edit an exam | EXAM-04 edits the title, the subject or the date under `If-Match`, answers 400 `version_required` without the header and 409 `stale_version` with the current row when the version moved; changing the subject clears the checklist in the same transaction | `tests/integration/exams.test.ts`, browser check on A-12 |
| Countdown | `countdownOf` answers `{daysRemaining, isToday}` from the profile zone and rollover, exam day included; the list and the detail page read the same value | `tests/unit/exams.test.ts`, `tests/integration/exams.test.ts`, browser checks |
| Checklist | EXAM-05 replaces the whole set, keeping `completed` for the topics that stay; EXAM-06 sets one flag; a topic from another subject answers `validation_failed`; an empty set is a valid checklist | `tests/integration/exams.test.ts`, browser check on A-13 |
| Lists and paging | EXAM-01 answers the upcoming list unpaginated and ordered by date, and the archived list ordered newest first with `limit` 1..100 and an opaque cursor | `tests/integration/exams.test.ts`, browser check on A-12 |
| Archive rule | An exam whose date is before local today is archived: it shows no countdown, accepts only a date change (FR-124), and returns to upcoming when that date is today or later | `tests/integration/exams.test.ts`, browser check on A-12 |
| Auto-archive job | `exam_auto_archive` runs hourly on the `stately` queue, selects the exams past local today through the profile zone, and publishes one `ExamArchived` per row without writing | `tests/unit/exams.test.ts`, `src/modules/exams/job.ts` |
| EC-008 subscriber | Archiving a topic deletes its `exam_topics` row, so no checklist keeps an archived topic | `tests/integration/exams.test.ts`, MODULE-BOUNDARIES section 3 |
| Idempotency | Every write requires `Idempotency-Key`; a replay answers the stored response with `Idempotent-Replay: true` and a reused key with a different payload answers `idempotency_key_reused` | `tests/integration/exams.test.ts` |
| A-12 | Upcoming and Archived tabs with arrow-key navigation, rows with the subject dot, the title link, the subject and date, the countdown and the checklist counts for upcoming rows, the Add-exam dialog, the date-only Change-date dialog, and the empty, loading and error states | browser checks in the evidence record |
| A-13 | Breadcrumb, title, subject and date with the countdown, the checklist with per-topic checkboxes and the "N topics, M done" summary, the Edit-topics picker, and read-only behaviour on an archived exam | browser checks in the evidence record |
| Data ownership | A purge handler and an export contributor for both tables, registered in an order that respects the `exam_topics` foreign keys | `tests/integration/exams.test.ts`, `tests/integration/profile.test.ts` |
| Ownership contract | Every EXAM route hides another user's exam behind `not_found` | `tests/integration/exams.test.ts` |
| Error copy | The UI maps the M04 codes to sentences, including the past date, the archived subject, the stale version and the two paging failures | `src/ui/messages.ts`, browser checks |

## 4. Files

New:

| Path | Role |
|---|---|
| `db/migrations/0004_exams_and_checklists.sql` | both tables, both foreign keys and two indexes |
| `src/modules/exams/service.ts` | the exam rules: create, read, edit, the two lists, the checklist replace and set, the countdown and the derived state |
| `src/modules/exams/{events,public,subscribe,job}.ts` | the `ExamArchived` event and its publisher, the module's public surface, the EC-008 `TopicArchived` subscriber, and the hourly job |
| `src/app/api/app/exams/route.ts` | EXAM-01 and EXAM-02 |
| `src/app/api/app/exams/[examId]/route.ts` | EXAM-03 and EXAM-04 |
| `src/app/api/app/exams/[examId]/topics/route.ts` | EXAM-05 |
| `src/app/api/app/exams/[examId]/topics/[topicId]/route.ts` | EXAM-06 |
| `src/app/exams/page.tsx` | A-12 with its metadata |
| `src/app/exams/[examId]/page.tsx` | A-13 with its metadata and the not-found panel |
| `src/ui/forms/exam-dialog.tsx` | the Add-exam and Change-date dialog |
| `src/ui/forms/exam-list.tsx` | the A-12 list, its tabs and its row actions |
| `src/ui/forms/exam-workspace.tsx` | the A-13 workspace, the checklist and the topic picker |
| `tests/unit/exams.test.ts` | the countdown, the cursor, the limits and the job schedule |
| `tests/integration/exams.test.ts` | the twelve EXAM cases |

Modified:

| Path | Change |
|---|---|
| `src/kernel/errors.ts` | `invalid_page_size` and `invalid_cursor` |
| `src/kernel/config.ts` | `exams.titleMaxLength`, `exams.archivePageSize`, `exams.archiveMaxPageSize`, `jobs.examAutoArchiveQueue`, `jobs.examAutoArchiveCron` |
| `src/server/request-context.ts` | `createExamSchema`, `updateExamSchema`, `examListQuery`, `setExamTopicsSchema`, `setExamTopicSchema` |
| `src/server/container.ts` | the exams module in the export order and its purge handler between `auth` and `topics` |
| `src/worker/index.ts` | `examAutoArchiveJob` added to the scheduled jobs |
| `src/ui/{control,messages,nav}.ts(x)` | the `date` input type, the M04 error copy, the Exams entry in the shipped-route map |
| `tests/integration/support/api.ts` | the four M04 endpoints and their schemas |
| `tests/integration/profile.test.ts` | the registry assertions now list the M04 keys |
| `vitest.config.ts` | the `src/modules/exams/**` coverage floor beside the kernel one |

## 5. Database changes

| Object | Detail |
|---|---|
| `exams` | `id` uuid primary key, `user_id` uuid `ON DELETE CASCADE`, `subject_id` uuid, `title` text with a 1..200 trimmed check, `exam_date` `date` (no time, so no zone is stored), `version` integer `>= 1` default 1, `created_at`, `updated_at`, `UNIQUE (id, user_id)` and `UNIQUE (id, subject_id)`, and `(subject_id, user_id) -> subjects (id, user_id) ON DELETE CASCADE` |
| `exam_topics` | `exam_id`, `topic_id`, `subject_id`, `completed` boolean default false, `weight` smallint 1..5 default 1, `created_at`, `updated_at`, primary key `(exam_id, topic_id)`, `(exam_id, subject_id) -> exams (id, subject_id) ON DELETE CASCADE` and `(topic_id, subject_id) -> topics (id, subject_id) ON DELETE CASCADE` |
| Indexes | `ix_exams_user_date (user_id, exam_date, id)` serves both lists; `ix_exam_topics_exam (exam_id)` serves the checklist read |
| Deletion model | Both tables cascade from `users`. `exam_topics` carries both parent keys, which is what makes the composite foreign keys possible and what lets one `DELETE FROM users` reach the whole graph; the purge handlers exist for the NFR-031 contract and the export manifest |
| No archive column | `archived_at` is deliberately absent (BR-025). The `exam_topics.weight` column exists for the Phase 2 readiness weighting (FR-127); M04 writes the default and never reads it |
| Why the subject FK cascades | M03 made `topics -> subjects` `NO ACTION` because an archived subject keeps its topics. An exam cannot outlive its subject: a subject is only ever hard-deleted by account deletion, which cascades to its exams anyway, so `CASCADE` here changes nothing observable and keeps the deletion graph single-statement |

## 6. Tests executed and results
| Command | Result |
|---|---|
| `npm run verify` | exit 0. `tsc --noEmit` clean; `eslint .` clean; "Boundary check passed"; unit 17 files / 76 tests passed; integration 8 files / 59 tests passed in 140.70 s |
| `npx vitest run --project integration tests/integration/exams.test.ts` | 12 tests passed |
| `npx vitest run --project unit tests/unit/exams.test.ts` | 7 tests passed |
| `npx next build` | compiled successfully, TypeScript finished with no diagnostics, 28 static pages generated, 43 routes of which 26 are under `/api/app` (4 new in M04) plus the two new pages, no static/dynamic sibling conflict |
| Browser checks on A-12 and A-13 | every check in the evidence record E05 and E06 passed after the four fixes in E10 of the evidence record; the measurements in E07 show no horizontal overflow at 360, 768, 1280 or 2560 px and no interactive target under 44 px other than the two checklist checkboxes whose 44 px labels are the real hit area |

Full commands, raw output and the measurement tables are in [M04-EVIDENCE.md](M04-EVIDENCE.md).

## 7. Technical findings

1. **A Postgres `date` is not a calendar date in JavaScript.** `pg` returns a `date` column as a `Date` at local midnight, so `toISOString().slice(0, 10)` moved `2026-11-28` to `2026-11-27` at UTC+07 and every countdown read one day short. All five exam reads now select `e.exam_date::text` and use the string. The general rule for this repository: never round-trip a business date through `Date`.
2. **`count(*)` comes back as a string.** The exam list answered `"topicCount": "2"` on the wire, while API-SCHEMAS section 7 says integer, because the driver returns `bigint` as text to avoid a precision loss. Both count expressions now cast `::int`, which is safe here because a user's checklist is orders of magnitude below `int4`.
3. **A roving tabindex without arrow handling is a keyboard trap.** The tabs use `tabIndex` 0 and -1, so Tab reaches only the selected tab; with no `onKeyDown` the Archived tab was unreachable by keyboard. Both tablists now implement the ARIA arrow pattern with focus following the selection.
4. **A missing loading state is a false statement.** The first render, before the list answered, told the user "No upcoming exams". A `loading` branch now renders five skeletons in an `aria-busy` region with a `role="status"` label, so the empty state appears only for an empty list.
5. **The archive state had to be derived to keep one source of truth.** With no `archived_at` column the state is a comparison in SQL, so the list query, the detail route and the job all agree by construction, an archive needs no write, and a zone change is picked up on the next read. The job still publishes `ExamArchived` because EC-008 and FR-124 need a moment in time, and it is idempotent in effect because the state it reports is derivable.
6. **`exam_date::text` and the cursor had to agree on one date format.** The archived cursor is `base64url("exam|<date>|<id>")` where `<date>` is the same `YYYY-MM-DD` text the wire carries. A decode that re-encodes and compares rejects a tampered cursor with `invalid_cursor` before any query runs, so a forged cursor costs one string comparison rather than a scan.
7. **The checklist replace is a delete and insert inside one transaction, and it keeps `completed`.** EXAM-05 reads the current flags, deletes, and inserts the set with the retained flags, so a picker save does not reset ticks; EXAM-06 is a single `UPDATE` because the row is unversioned. Both run inside the idempotency effect's transaction, so a replay cannot double-apply.
8. **The Exams module is the first cross-module consumer inside a write path.** EC-008 forced the decision: the drop is a delete in the exams schema triggered by a topics event, and it goes through `topics.topicEventSubscribers` rather than a direct read, which keeps the boundary check satisfied and means the failure of one subscriber cannot fail a committed archive.

## 8. Known limitations

1. Readiness does not exist, so A-13 shows "N topics, M done" instead of a score, and `exam_topics.weight` is always its default. This is the Phase 2 boundary, not an omission, and it is why the DoD row is partial (AC-FR-126-*, AC-FR-127-* and AC-FR-128-*).
2. The archived list has no jump-to-page control, only a cursor and a "Load more" button. AC-FR-125 needs the page and the order, not a pager widget; a pager is a UI decision that belongs with the design owner.
3. The upcoming list is unpaginated, so a user with hundreds of future exams pays for all of them on one request. Recorded as OD-M35.
4. Two exams may share a title under one subject; there is no unique index, which matches exams in real use (two quizzes with the same name on different dates).
5. A checklist topic can be ticked and then archived; the tick disappears with the row because EC-008 removes the row. There is no per-topic completion history to preserve in the MVP.
6. The topic-event registry is in process, so a restart loses an unprocessed `TopicArchived`. The same limitation M03 recorded (OD-M32): the subscriber is correct, delivery is not durable.
7. The auto-archive job publishes an event each hour for the same already-archived exam, because the state is derived and nothing marks it as reported. A consumer must therefore be idempotent; the readiness job (P2-05) will be the first real one, and this is recorded with the derived-state decision in OD-M33.

## 9. Remaining tasks

| Item | Why it is open | Where it is recorded |
|---|---|---|
| `DEFINITION-OF-DONE.md checked` row | AC-FR-126-*, AC-FR-127-* and AC-FR-128-* need the Phase 2 readiness feature (P2-05); the by-layer coverage floors have no threshold; axe cannot run; the tag needs the owner's commit | E11 and this section |
| Readiness score and label | Phase 2 by the roadmap; M04 stops at FR-125 | MILESTONES M04 card, OD-M33 |
| Coverage floors | The by-layer floors the Definition of Done names (domain 90%, application 80%, overall 80%) have no threshold and are not met: `npm run test:coverage` exits 0 with the kernel and exams floors passing, but overall lines measure 50.12% because the UI layer is covered by the browser pass | E11, E12, OD-M31 |
| `m04-done` tag | The owner commits and tags; nothing was committed by me | E11 |


## 10. Docs updated

| Document | Change |
|---|---|
| [08-build/M04-EVIDENCE.md](M04-EVIDENCE.md) | new: commands, raw output, the browser measurements, the four defects found and fixed, and the DoD check |
| [08-build/M04-COMPLETION-REPORT.md](M04-COMPLETION-REPORT.md) | this file |
| [07-roadmap/MILESTONES.md](../07-roadmap/MILESTONES.md) | three checklist rows ticked and an "As built" note on the M04 card |
| [OPEN-DECISIONS.md](../OPEN-DECISIONS.md) | the M04 execution record in section G and the three M04 rows OD-M33, OD-M34 and OD-M35 in section C |
| [03-architecture/ERROR-HANDLING.md](../03-architecture/ERROR-HANDLING.md) | section 4 gains `invalid_page_size` and `invalid_cursor`, and the EC-008 row now names the checklist drop |
| [IMPLEMENTATION-READINESS.md](../IMPLEMENTATION-READINESS.md) | sections 6 and 7 record the M04 status and the authorization |
| [CHANGELOG.md](../CHANGELOG.md), [README.md](../../README.md), [docs/README.md](../README.md), [DOCUMENTATION-INDEX.md](../DOCUMENTATION-INDEX.md) | the milestone entry, the document counts and the build-status line |

## 11. Definition of Done at M04 level

Full item-by-item record in [M04-EVIDENCE.md](M04-EVIDENCE.md) E11, with the coverage measurement in E12. Summary: typecheck, lint, the boundary check, unit tests, integration tests, the ownership contract, the registry contributions, idempotency and concurrency, the migration path, both configured coverage floors, the four-viewport measurement, the empty/loading/error states, the log review, the completion report and the no-future-phase check all pass. The acceptance-criteria item is partial because three of the milestone's criteria need a feature M04 does not ship; the coverage item is partial because the by-layer floors the Definition of Done names are neither enforced nor met; axe cannot run; the tag is the owner's step.

## 12. Recommended next milestone

M05 Study plans. It is the consumer M04's data was shaped for: a plan is generated around one exam, so the derived archive rule and `exam_date` become the boundary the generator clamps to (FR-038, BR-025), and the `ExamArchived` event gives it the trigger it needs. M05 also registers the production archive guard that M03 left open (OD-M28) and the first durable event consumer (OD-M32). Readiness (P2-05) stays out.

## 13. Not done, and not claimed

1. Nothing is staged, committed or tagged by me. The owner committed the M04 build in `push exam feature` and `push exam list`; the four defects in the evidence record's E10 were found after that, so the count casts, the arrow-key handler, the loading branch and one regression test sit uncommitted in the working tree together with these documents.
2. No axe run, no load test and no staging deploy: M04 claims none of them. The coverage command was run and its result is in E12.
3. The four defects in E10 were found and fixed in this pass. Two further defects in `exam-list.tsx` were fixed during the build after an interrupted edit duplicated imports, left dead state and corrupted a render block; the file's typecheck, lint and browser checks all pass afterwards. No other defect is known as of this record.
4. The derived archive state, the date-only edit on an archived exam and the unpaginated upcoming list are decisions, not gaps: all three are recorded as OD-M33, OD-M34 and OD-M35, and any of them can be reversed cheaply if the owner disagrees.
