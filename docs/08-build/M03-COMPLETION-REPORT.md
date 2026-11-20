# M03 Completion Report

> Status: M03 execution record, 2026-11-21, approved by the owner the same day ([OPEN-DECISIONS.md](../OPEN-DECISIONS.md) section G). Commands, raw output and the browser measurements are in [M03-EVIDENCE.md](M03-EVIDENCE.md). M03 is built and verified; one of its five checklist rows stays partial because it depends on milestones that are not built yet. No ADR is Accepted, no vendor is selected, nothing is committed or tagged by me, and M04 is not authorized by this report.

## 1. Executive summary

M03 turned the M01/M02 foundation into the study taxonomy every later feature links to. Two tables, `subjects` and `topics`, arrive in migration `0003_subjects_and_topics.sql`; `src/modules/subjects` owns subjects, their order, the archive guard and the active-name rule; `src/modules/topics` owns topics, their weight and status, the bulk paste path and the topic-event contract that Exams will subscribe to in M04. The kernel gained a working idempotency store on `idempotency_keys` (reserve, commit inside the effect's transaction, release on failure), an archive-guard verdict, and seven error codes; the server gained the `If-Match` and `Idempotency-Key` readers, the `includeArchived` query rule and the per-user heavy rate limit. On top of that the app ships A-7 and A-8, eleven API routes (SUBJ-01..07, TOP-01..08) and two pages.

Everything M03 claims is proven by a command run in this repository: typecheck, lint, the boundary check, 69 unit tests, 47 integration tests against PostgreSQL 18.6, a production build with a 37-route table, and browser checks on both pages at four viewport widths.

M03 is not a full pass. `DEFINITION-OF-DONE.md checked` is partial: three acceptance criteria in the M03 set need a feature M03 does not ship (sessions, plans and to-dos, and a picker), the coverage floors have no command to run them, axe cannot run in this tree, and the `m03-done` tag needs the owner's commit. Those are named in section 9 and in the evidence record rather than ticked.

## 2. Scope and authorization

| Item | Record |
|---|---|
| Milestone | M03 Subjects and topics ([MILESTONES.md](../07-roadmap/MILESTONES.md)) |
| Authorization | Owner instruction to execute M03 in the build session; the scope is the M03 card fixed by `Build Mode.txt` and the roadmap, recorded in [OPEN-DECISIONS.md](../OPEN-DECISIONS.md) section G, 2026-11-21 |
| Repository | `D:/Portofolio/Lumora`, branch `main`, head `69a8d39`, no commit made by me |
| In scope | `subjects`, `topics`; SUBJ-01..SUBJ-07 and TOP-01..TOP-08; A-7 and A-8; the archive-guard contract; the topic-event contract; the bulk paste preview and save; the purge handlers and export contributors for both tables |
| Out of scope | any session, timer, plan, to-do, note or exam behaviour (M04 onward); the pointer drag reorder; the readiness job that will consume archived topics; every Phase 2 or Phase 3 route, table or flag |
| Build Mode rules | No invented specification: every route, code, column and rule traces to FR-010..FR-019, NFR-016, NFR-042, NFR-053, BR-029, EC-007, EC-008 or a named document section. No decision left open was resolved silently; the palette hexes come from COLOR-TYPOGRAPHY section 6 and the palette order matches it |

## 3. Functionality delivered

| Area | What exists now | Proof |
|---|---|---|
| Create and list subjects | SUBJ-01 lists active subjects ordered by position with a topic count and a done count per row; SUBJ-02 creates last in the order, answers 201 with `Location` and `ETag`, and trims the name | `tests/integration/subjects.test.ts`, browser check on A-7 |
| Name rule | The active-name index is the referee: a second active subject with the same name (case-insensitive, trimmed) answers 409 `name_conflict` with the ids; an archived subject never blocks a name | `tests/integration/subjects.test.ts` |
| Read and edit | SUBJ-03 reads one subject with its `ETag`; SUBJ-04 edits the name and colour under `If-Match`, answers 400 `version_required` without the header and 409 `stale_version` with the current row when the version moved | `tests/integration/subjects.test.ts` |
| Reorder | SUBJ-05 takes the complete active set and stores a contiguous order; a partial set is refused | `tests/integration/subjects.test.ts` |
| Archive and restore | SUBJ-06 archives after the guard verdict and keeps history; SUBJ-07 restores last among active subjects and supports the rename-first flow when a name clashes | `tests/integration/subjects.test.ts`, browser checks |
| Archive guard | Subjects asks a registered contract whether a subject may be archived and can name the blocking timer run; with no guard registered the archive proceeds | `tests/integration/subjects.test.ts`, MODULE-BOUNDARIES section 3 |
| Topics | TOP-01 to TOP-08 cover list, create, bulk preview, bulk save, read, edit, reorder, archive and restore, with weight 1..5 and the three statuses | `tests/integration/topics.test.ts` |
| Bulk paste | A dry run reports the lines that are new, the lines already present and the lines over 150 characters; a save carrying a long line creates nothing; 201 non-blank lines answer `input_too_large` with the limit and the actual count; the save is one keyed request | `tests/integration/topics.test.ts`, browser checks |
| Idempotency | The `idempotency_keys` store reserves a key, commits the stored response inside the effect's transaction, replays a stored 2xx with `Idempotent-Replay: true` and answers `request_in_progress` while an identical request runs | `tests/unit/idempotency.test.ts`, `tests/integration/topics.test.ts` |
| Events | Topics publishes `TopicArchived` and `TopicStatusChanged` after the write, to subscribers registered in process | `tests/integration/topics.test.ts` |
| A-7 | Active and Archived tabs, rows with the colour dot, the name link, both counts and a per-row menu, the Add-subject dialog with the ten-swatch radio group, the archive confirm dialog, and the empty, loading and error states | browser checks in the evidence record |
| A-8 | Breadcrumb, colour dot and name header with Edit and Archive or Restore, the topic list with weight chip and status select, the new-topic row, the paste dialog, the topic edit dialog, the archived-topics disclosure, the summary aside, and read-only behaviour on an archived subject | browser checks in the evidence record |
| Data ownership | Purge handlers and export contributors for both tables, registered in an order that respects the composite foreign key | `tests/integration/subjects.test.ts`, `tests/integration/profile.test.ts` |
| Error copy | The UI maps every M03 code to a sentence, including the running-session block, the archived-subject refusal, the duplicate name and the paste limit with its numbers | `src/ui/messages.ts`, `src/ui/forms/feedback.ts`, browser checks |

## 4. Files

New:

| Path | Role |
|---|---|
| `db/migrations/0003_subjects_and_topics.sql` | both tables, the partial active-name index, four indexes, the composite foreign key and the column checks |
| `src/modules/subjects/{service,public}.ts` | subject rules and the module's public surface |
| `src/modules/topics/{service,public,events}.ts` | topic rules, bulk normalisation, the event contract and its subscriber registry |
| `src/app/api/app/subjects/**` (8 route files) | SUBJ-01..SUBJ-07 |
| `src/app/api/app/topics/**` (3 route files) | TOP-04..TOP-08 |
| `src/app/subjects/page.tsx` | A-7 |
| `src/app/subjects/[subjectId]/page.tsx` | A-8 with its metadata and the not-found panel |
| `src/ui/subject-dot.tsx`, `src/ui/dialog.tsx`, `src/ui/forms/subject-{dialog,list,workspace}.tsx`, `src/ui/forms/topic-{list,edit-dialog,paste-dialog}.tsx` | the M03 UI |
| `tests/unit/subjects-topics.test.ts`, `tests/integration/subjects.test.ts`, `tests/integration/topics.test.ts` | the M03 tests |

Modified:

| Path | Change |
|---|---|
| `src/kernel/errors.ts` | seven codes: `name_conflict`, `subject_archived`, `idempotency_key_required`, `idempotency_key_reused`, `request_in_progress`, `subject_has_running_session`, `version_required`, plus `csrf_rejected` |
| `src/kernel/config.ts` | `subjects.nameMaxLength`, `subjects.palette`, `topics.nameMaxLength`, `topics.weightMin` and `weightMax`, `topics.bulkMaxLines`, `idempotency.reservationSeconds`, `rateLimit.heavyPerUserPerMinute` |
| `src/kernel/registries.ts` | `ArchiveCheck` and `ArchiveGuard` |
| `src/kernel/idempotency.ts` | rewritten around a store with an in-process and a PostgreSQL implementation |
| `src/server/request-context.ts` | `ifMatchVersion`, `requiredIdempotencyKey`, `includeArchivedQuery`, the M03 request schemas and the third rate-limit class |
| `src/server/container.ts` | the idempotency store and the two new purge handlers and export contributors |
| `src/ui/{control,format,messages,nav}.ts(x)`, `src/ui/forms/feedback.ts` | `Textarea`, `countText`, the M03 error copy and the failure body, the Subjects entry in the shipped-route map |
| `tests/integration/support/{api,ownership}.ts` | the eleven M03 endpoints and their schemas, and the ownership case's `headers` field |
| `tests/integration/profile.test.ts` | the registry assertion now lists the M03 keys |
| `src/app/globals.css` | the ten `--subject-*` tokens from COLOR-TYPOGRAPHY section 6 |

## 5. Database changes

| Object | Detail |
|---|---|
| `subjects` | `id` uuid primary key, `user_id` uuid `ON DELETE CASCADE`, `name` text with a 1..100 trimmed check, `color` text checked against the ten keys, `position` integer `>= 0`, `archived_at` timestamptz, `version` integer `>= 1` default 1, `created_at`, `updated_at`, and `uq_subjects_id_user UNIQUE (id, user_id)` |
| `topics` | the same shape plus `subject_id`, `weight` smallint 1..5 default 1, `status` text in `('not_started','in_progress','done')` default `not_started`, a 1..150 name check, `fk_topics_subject_user (subject_id, user_id) -> subjects (id, user_id) ON DELETE NO ACTION` and `uq_topics_id_subject UNIQUE (id, subject_id)` |
| Indexes | `uq_subjects_active_name` unique partial on `(user_id, lower(btrim(name))) WHERE archived_at IS NULL`; `ix_subjects_user_position`; `ix_topics_subject_position`; `ix_topics_user` |
| Deletion model | Both tables cascade from `users`, so account deletion removes them in one statement. The child foreign key is `NO ACTION` on purpose: BR-029 keeps archived subjects and their topics, a hard delete happens only through account deletion, and the purge handlers therefore remove topics before subjects |

## 6. Tests executed and results

| Command | Result |
|---|---|
| `npm run verify` | exit 0. `tsc --noEmit` clean; `eslint .` clean; "Boundary check passed"; unit 16 files / 69 tests passed; integration 7 files / 47 tests passed in 132.69 s |
| `npx vitest run --project integration tests/integration/subjects.test.ts` | 11 tests passed |
| `npx vitest run --project integration tests/integration/topics.test.ts` | 9 tests passed |
| `npx next build` | compiled successfully, TypeScript finished with no diagnostics, 26 pages generated, 37 routes of which 22 are API routes (11 new in M03) plus the two new pages, no static/dynamic sibling conflict |
| Browser checks on A-7 and A-8 | every check in the evidence record E05 and E06 passed after the five fixes in E10; the measurements in E07 show no horizontal overflow at 360, 768, 1280 or 2560 px and no interactive target between 24 and 44 px |

Full commands, raw output and the measurement tables are in [M03-EVIDENCE.md](M03-EVIDENCE.md).

## 7. Technical findings

1. **A unique violation aborts its transaction.** `createSubject` originally caught `23505` and re-queried the clashing row inside the same transaction, which answered 500 instead of 409 because the transaction was already aborted. It now inserts with `ON CONFLICT DO NOTHING RETURNING id` and, on an empty result, selects the clashing id, so the answer is a correct 409 with `details.conflictingId` and the transaction stays usable. The edit and restore paths map the same violation without querying.
2. **The idempotency store had to be real from M03.** The write routes require a key, so the store reserves a row, stores only 2xx responses, and marks a live reservation with a sentinel status and a 30 second reservation window that `request_in_progress` reports. The record is committed inside the effect's transaction, so a rollback also releases the claim.
3. **The archive guard returns a verdict, not a boolean.** The refusal message has to name the timer run (FR-013), so the contract returns `{ blocked, details }`. An integration subscriber that blocks one subject id proves the whole path, and the absence of a registered guard is the documented default while M05 is unbuilt.
4. **`Button` silently dropped two props, and one of them hid a regression.** `aria-label` was not forwarded, so every row menu button was named "Actions"; `disabled` had been lost from the component while it was edited, so no button on any page was ever disabled. Both were found by the browser pass, fixed and re-observed. The same pass found the `SelectInput` gap for read-only rows.
5. **The picker shape decision.** A-7 needs a topic count per subject, which the `Subject` schema does not carry, so SUBJ-01 answers rows with two extra fields while SUBJ-05 keeps bare rows. This follows the `ExamListItem` precedent from M02 and is recorded as a deviation.
6. **Positions are per parent and contiguous.** Subjects order within a user, topics within a subject, both allocated as `MAX(position) + 1` for inserts and rewritten as a whole set by the reorder route, which is what makes a partial reorder a validation failure instead of a silent gap.
7. **Events are published after the write and their failures are logged, not raised.** A subscriber that throws cannot turn a committed archive into an error response, which is why the publisher collects results with `Promise.allSettled` and logs `topic.event.failed`.

## 8. Known limitations

1. The archive guard has no production subscriber until M05 registers the timer check.
2. Reorder is keyboard and button only; pointer drag is Phase 2.
3. Duplicate names are allowed for topics (there is no unique index on `topics`), so two identical pasted lines create two topics; the preview labels them so the outcome is visible before saving.
4. The archived-subject view is read only apart from the name edit and Restore, so a user cannot change a topic's status until the subject is restored. The API allows the edit; the UI does not offer it. The banner states the rule, and if the owner prefers the opposite the change is a one-line prop.
5. `input_too_large` on the bulk route counts non-blank lines, so 200 topics plus any number of blank lines passes, which matches AC-FR-017-2's wording about non-empty lines.
6. The topic-event registry is in process, so events are not durable across a restart; the Phase 2 readiness job will need a queue.

## 9. Remaining tasks

| Item | Why it is open | Where it is recorded |
|---|---|---|
| `DEFINITION-OF-DONE.md checked` row | Three acceptance criteria in the M03 set need sessions (M05/M06), plans and to-dos (M08/M09), and a picker (M05); the coverage floors have no command; axe cannot run; the tag needs the owner's commit | E11 and this section |
| Coverage floors | `@vitest/coverage-v8` is installed but no coverage script and no floor check exist in `package.json` | E11 |
| axe | No browser-automation dependency is installed, the same gap M01 and M02 recorded | E11 |
| `m03-done` tag | The owner commits and tags; nothing was committed by me | E11 |
| API-SCHEMAS and API-ENDPOINTS note for the `SubjectListItem` fields | The two documents are still accurate for the routes but do not yet carry the M03 as-built note | Deviations, section 1 |

## 10. Docs updated

| Document | Change |
|---|---|
| [08-build/M03-EVIDENCE.md](M03-EVIDENCE.md) | new: commands, raw output, the browser measurements, the five defects found and fixed, and the DoD check |
| [08-build/M03-COMPLETION-REPORT.md](M03-COMPLETION-REPORT.md) | this file |
| [07-roadmap/MILESTONES.md](../07-roadmap/MILESTONES.md) | four checklist rows ticked with an "As built" note on the M03 card |
| [OPEN-DECISIONS.md](../OPEN-DECISIONS.md) | the M03 authorization row in section G and the M03 deviation rows in section C |
| [03-architecture/ERROR-HANDLING.md](../03-architecture/ERROR-HANDLING.md) | section 4 gains `version_required`, `idempotency_key_required`, `csrf_rejected`, `name_conflict`, `subject_archived`, `idempotency_key_reused` and `request_in_progress`, plus the note on the one retryable conflict |
| [03-architecture/MODULE-BOUNDARIES.md](../03-architecture/MODULE-BOUNDARIES.md) | section 3 states the archive guard's verdict shape and the no-guard default |
| [IMPLEMENTATION-READINESS.md](../IMPLEMENTATION-READINESS.md) | sections 6 and 7 record the M03 status |
| [CHANGELOG.md](../CHANGELOG.md), [README.md](../../README.md), [docs/README.md](../README.md), [DOCUMENTATION-INDEX.md](../DOCUMENTATION-INDEX.md) | the milestone entry, the document counts and the build-status line |

## 11. Definition of Done at M03 level

Full item-by-item record in [M03-EVIDENCE.md](M03-EVIDENCE.md) E11. Summary: typecheck, lint, boundary check, unit tests, integration tests, the ownership contract, the registry contributions, idempotency and concurrency, the migration path, the manual keyboard pass, the 360 px measurement, the error/empty/loading states, the log review, the completion report and the no-future-phase check all pass. The acceptance-criteria item is partial because three criteria need features M03 does not ship; the coverage-floor item is not measured because no command exists; axe cannot run; the docs item is partial for the `SubjectListItem` note; the tag is the owner's step.

## 12. Recommended next milestone

M04 Exams (basic), FR-120..FR-125 only. It is the milestone M03's contracts were built for: Exams registers the `TopicArchived` subscriber to drop an archived topic from the readiness denominator (EC-008), reuses the ownership contract helper and the idempotency store unchanged, and adds the Exams entry to the header navigation beside Subjects. Readiness itself (P2-05) stays out.

## 13. Not done, and not claimed

1. Nothing is committed, staged or tagged; the working tree carries the M03 code and documents and the eight modified M02 documents.
2. No axe run, no coverage report, no load test, no staging deploy: M03 claims none of them.
3. The five defects in E10 were found and fixed in this pass, and the two earlier ones in the completion report's section 7; no other defect is known as of this record.
4. The archived-subject read-only rule and the missing pointer drag are decisions, not gaps: both are recorded as deviations with their reasons, and either can be reversed cheaply if the owner disagrees.
