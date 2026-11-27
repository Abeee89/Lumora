# M10 Completion Report

> Status: M10 execution record, 2026-11-27, awaiting the owner's approval and tag. Commands, raw output, the browser measurements and the defects found are in [M10-EVIDENCE.md](M10-EVIDENCE.md). M10 is built and verified; its DoD row stays partial because the by-layer coverage floors the document names are still not enforced beyond the module floor M10 added, axe cannot run in this tree and no screen reader was driven, and the tag is the owner's step. No ADR is Accepted, no vendor is selected, no OD row is closed, and nothing is committed, staged or tagged by me.

## 1. Executive summary

M10 adds tasks with priorities: a to-do list with create, read, edit, delete and an idempotent done toggle, a set of four filters that combine with AND, and the FR-095 order (priority rank, then due date ascending with null last, then age). The table `todos` arrives in `0009_todos.sql`, with NO ACTION composite keys to `subjects` and `topics` so a purge removes the to-dos first and an archive never deletes history. The module lives at rank 9 and imports `../topics/public` and `../subjects/public`; it publishes `TodoCompleted` in process, the same contract the earlier milestones use, so the Phase 2 outbox has to carry it before a consumer needs delivery across a restart.

The API is TODO-01 to TODO-06 under `/api/app/todos`. `TODO-02` runs through `runIdempotent` on the `todo.create` scope. `TODO-04` and `TODO-06` require `If-Match` and answer `stale_version` with `details.current`. `TODO-05` is idempotent without a key: sending the current state changes nothing, bumps no version and publishes no event, and only the false-to-true transition writes `completed_at` and publishes `TodoCompleted` after the write commits. The cursor is a keyset over `(priority rank, due date null-last, id)` plus the open/done group; `id` stands in for `created_at` because a UUIDv7 embeds the millisecond timestamp and a Postgres timestamp's microseconds cannot round-trip through a JS `Date`.

The face is A-9: a server-rendered page at `/todos` with a quick-add row (title, priority, and a "More fields" disclosure for due date and subject), a Status/Subject/Priority/Due filter row, and a list whose rows carry a checkbox, the subject dot and name, the due text, a priority chip and an actions menu. Every mutation announces through a polite live region, a failed toggle keeps the row in place with an inline error and a Retry, an empty title is caught before any request, and focus returns to the title input after an add. The order and filters are proven by 26 integration cases; the pure helpers by 8 unit cases; the page by a browser pass at four widths.

Everything M10 claims is proven by a command run in this repository: typecheck, lint, the boundary check, 151 unit tests, 169 integration tests against PostgreSQL 18.6, a production build, the coverage run with the tasks module at 90.05% statements and 91.71% lines against the floor M10 added, and browser checks at four viewport widths against the production build.

M10 is not a full pass. `DEFINITION-OF-DONE.md checked` is partial for the same three reasons every milestone since M01 has recorded. Seven defects were found and fixed in this pass, including one the browser pass exposed and the unit tests could not: a due date read back one day early under a positive-offset process. All seven are in section 7 with the case that now pins each.

## 2. Scope and authorization

| Item | Record |
|---|---|
| Milestone | M10 Tasks and priorities ([MILESTONES.md](../07-roadmap/MILESTONES.md)) |
| Authorization | Owner instruction "started" in the build session, which starts this milestone after the M09 delivery record; the scope is the M10 card fixed by `Build Mode.txt` and the roadmap, recorded in [OPEN-DECISIONS.md](../OPEN-DECISIONS.md) section G, 2026-11-27 |
| Repository | `D:/Portofolio/Lumora`, branch `main`; no commit, stage or tag was made by me |
| In scope | TODO-01 to TODO-06 at `/api/app/todos`; A-9 at `/todos`; priority, due date and subject on create and edit (FR-090, FR-091, FR-096); delete (FR-092); the idempotent done toggle and `TodoCompleted` (FR-093, FR-172, EC-017); the four filters (FR-094); the FR-095 order; the purge handler and export contributor (NFR-031, FR-130, FR-131) |
| Out of scope | Notes (M11), the dashboard (M13), any reminder or recurring to-do (no FR), any Phase 2 or Phase 3 task feature, and any topic picker in the A-9 dialogs, since FR-090 names a subject and topic but no picker is specified; the topic is preserved on edit when the subject is unchanged and cleared when it changes |
| Build Mode rules | No invented specification: every route, filter, order, label and message traces to FR-090 to FR-096, NFR-031, NFR-043, BR-029, BR-031 or a named document section. No open decision was resolved silently: M10 records its choices in section 7 and in [OPEN-DECISIONS.md](../OPEN-DECISIONS.md) and closes none |

## 3. Functionality delivered

| Area | What exists now | Proof |
|---|---|---|
| Create | TODO-02 inserts a to-do that is not done, defaults to Medium and accepts a due date and a subject (AC-FR-090-1, AC-FR-090-2, AC-FR-096-1); the title is 1 to 200 characters, trimmed; the call is idempotent on `Idempotency-Key` | `tests/integration/tasks.test.ts`, browser check in E06 |
| Read | TODO-01 lists with the four filters and the keyset cursor; TODO-03 reads one by id, both scoped by `user_id` | `tests/integration/tasks.test.ts` |
| Edit | TODO-04 requires `If-Match` and a changed field; `dueDate: null` clears the date and `subjectId: null` clears the subject and topic (AC-FR-091-2); a stale version answers the current to-do (EC-020); an archived subject is refused with `subject_archived` | `tests/integration/tasks.test.ts`, browser check in E06 |
| Delete | TODO-06 requires `If-Match`, hard-deletes and answers 204; a retry after success is 404 (AC-FR-092-3) | `tests/integration/tasks.test.ts`, browser check in E06 |
| Complete | TODO-05 sets done without a key, records `completed_at` on true and clears it on false (AC-FR-093-1, AC-FR-093-2); a repeat of the current state changes nothing (AC-FR-093-3); `TodoCompleted` publishes on the false-to-true transition only (FR-172, EC-017) | `tests/integration/tasks.test.ts`, browser check in E06 |
| Filters | `status`, `subjectId`, `priority` and `due` (`overdue`, `today`, `within7`, `none`) combine with AND (AC-FR-094-1, AC-FR-094-2); the due states are computed against the profile zone and `overdue` never matches a done row (AC-FR-094-3); an empty match is an empty page (AC-FR-094-4); an archived subject's to-dos still answer by explicit `subjectId` (FR-094) | `tests/integration/tasks.test.ts` |
| Order | priority rank (high 0, medium 1, low 2), then due date ascending with null last, then `id`; `status=all` puts open before done (FR-095, BR-031) | `tests/unit/tasks.test.ts`, `tests/integration/tasks.test.ts` |
| Cursor | a keyset page with a base64url cursor that round-trips and rejects a tampered value with `invalid_cursor` | `tests/unit/tasks.test.ts`, `tests/integration/tasks.test.ts` |
| A-9 page | quick add with a More-fields disclosure, a four-filter row, rows with checkbox, subject, due text, priority chip and an actions menu, a delete confirm naming the task, an edit dialog, a polite live region, an inline error with Retry, and the empty state | `src/ui/forms/todo-list.tsx`, browser check in E06 |
| Data ownership | every read and write is scoped by `user_id`; a foreign to-do is 404 and never appears in a list | `tests/integration/tasks.test.ts` |
| Rate limit | the routes use the existing `standard` and `heavy` kinds; no new config key beyond `config.todos` | `src/app/api/app/todos/**` |
| Registries | a purge handler and an export contributor on `section: "tasks"`, registered before `topics` and `subjects` | E07 in `M10-EVIDENCE.md` |

## 4. Files

New:

| Path | Role |
|---|---|
| `src/modules/tasks/service.ts` | `createTodo`, `getTodo`, `listTodos`, `editTodo`, `setTodoCompletion`, `deleteTodo`, `purgeTodos`, `exportTodos`, `priorityRank`, `sortKey`, `encodeCursor`, `decodeCursor` |
| `src/modules/tasks/events.ts` | `TodoCompleted` and the in-process publisher |
| `src/modules/tasks/public.ts` | the module's public surface: the service and event exports and the wire types |
| `src/app/api/app/todos/route.ts` | TODO-01 GET and TODO-02 POST |
| `src/app/api/app/todos/[todoId]/route.ts` | TODO-03 GET, TODO-04 PATCH and TODO-06 DELETE |
| `src/app/api/app/todos/[todoId]/completion/route.ts` | TODO-05 PUT |
| `src/app/todos/page.tsx` | A-9, server component with the session guard and the initial open list |
| `src/ui/forms/todo-list.tsx` | the client: quick add, filters, rows, the edit dialog, the delete confirm and the live region |
| `db/migrations/0009_todos.sql` | the `todos` table, its checks, its composite keys and its indexes |
| `tests/unit/tasks.test.ts` | 8 cases over `priorityRank`, `sortKey` and the cursor |
| `tests/integration/tasks.test.ts` | 26 cases over TODO-01 to TODO-06, ownership, purge and export |
| `docs/08-build/M10-EVIDENCE.md` | the checkpoint record: E01 to E08 with the commands and the observed output |

Modified:

| Path | Change |
|---|---|
| `src/ui/nav.ts` | the `Plan` group gains `To-dos` at `/todos`; `shippedRoutes` gains `/todos` |
| `src/kernel/config.ts` | the `todos` block (`titleMaxLength` 200, `pageSize` 50, `maxPageSize` 100) |
| `src/server/request-context.ts` | `createTodoSchema`, `updateTodoSchema`, `setTodoCompletionSchema` and `todoListQuery` |
| `src/server/container.ts` | the `tasks` purge handler and export contributor, registered before `topics` and `subjects` |
| `src/ui/control.tsx` | `TextInput` forwards `ref` to the `<input>` |
| `tests/integration/support/api.ts` | the three to-do routes in the harness dispatch and the `todoSchema` and `todoListSchema` wire schemas |
| `tests/integration/profile.test.ts` | `tasks` added to both pinned registry key lists |
| `vitest.config.ts` | the `src/modules/tasks/**` coverage floor |
| `tests/unit/tasks.test.ts` | the dated cursor case passes a date string, matching the wire form |

## 5. Database changes

`0009_todos.sql` creates `todos`:

- columns `id` (uuid), `user_id` (uuid, cascade on delete), `title` (text, 1 to 200), `subject_id` (uuid, nullable), `topic_id` (uuid, nullable), `due_date` (`date`, nullable), `priority` (`text` with a check on `high`/`medium`/`low`), `done` (boolean, default false), `completed_at` (timestamptz, nullable), `version` (integer, default 1), `created_at` and `updated_at`.
- `chk_todos_done_completed_at` keeps `completed_at` consistent with `done`.
- composite NO ACTION keys `(subject_id, user_id)` to `subjects` and `(topic_id, user_id)` to `topics`, so a subject or topic purge is blocked until the to-dos are gone and an archive never cascades a delete (BR-029).
- `ix_todos_user_list`, `ix_todos_open_due`, `ix_todos_subject` and `ix_todos_topic` back the list order, the due filters and the subject filter.

The integration environment migrates an empty database through all nine migrations on every run. The purge order in `container.ts` places `tasks` before `topics` and `subjects` for the NO ACTION keys.

## 6. Tests executed and results

| Command | Result |
|---|---|
| `npm run verify` | exit 0. `tsc --noEmit` clean; `eslint .` clean; "Boundary check passed"; unit 23 files / 151 tests passed; integration 14 files / 169 tests passed |
| `npx vitest run --project unit tests/unit/tasks.test.ts` | 8 tests passed |
| `npx vitest run --project integration tests/integration/tasks.test.ts` | 26 tests passed against PostgreSQL 18.6 |
| `npx next build` | exit 0, compiled successfully, 48 of 48 static pages generated, 69 route lines of which four are new in M10 (`/api/app/todos`, `/api/app/todos/[todoId]`, `/api/app/todos/[todoId]/completion` and `/todos`) |
| `npm run test:coverage` | exit 0, 37 files / 320 tests; `src/modules/tasks` at 90.05% statements, 85.79% branches, 100% functions and 91.71% lines against the 80 / 70 / 70 / 80 floor; the six earlier floors pass |
| Browser checks | every check in the evidence record E06 passed, including quick add, the due text, the AND filters, the in-place done toggle, the priority chips, the empty state, the edit dialog, the delete confirm, the empty-title guard, focus return, the simulated failure with Retry, and the four-width layout pass |

Full commands, raw output and the measurement tables are in [M10-EVIDENCE.md](M10-EVIDENCE.md).

## 7. Technical findings and defects fixed

1. **A due date read back one day early under a positive-offset process.** The `due_date` column is a `DATE`, which node-postgres parses into a `Date` at local midnight; `present` formatted it with `toISOString().slice(0, 10)`, so a process at UTC+07 shifted every date back a day on read while the database held the right value. The unit and integration suites did not catch it because they never compared a returned date to the one sent, and the browser pass did: a to-do created with 2026-11-28 read "Overdue" as 2026-11-27. The select now casts `t.due_date::text AS due_date`, `TodoRow.due_date` is a string, `encodeCursor` takes the date string and `decodeCursor` re-encodes the same string, and the integration case reads `medium-may3` back as `2026-05-03`.
2. **The title input never regained focus.** `titleRef` was declared and both `focus()` calls were written, but no input bound the ref and `TextInput` did not accept one, so the calls were no-ops. `TextInput` now forwards `ref` to the `<input>` (React 19 ref-as-prop) and the quick-add title passes `ref={titleRef}`; the browser pass reads `document.activeElement` on the title input after an empty submit and after a successful add.
3. **The keyset dropped rows on every page.** The row comparison `(priority, due_date, ...) > (...)` returns NULL when a row's `due_date` is NULL, and a NULL predicate drops the row, so a page stopped at the first dateless to-do. Both keysets compare `COALESCE(t.due_date, 'infinity')` in the predicate and the ORDER BY, and the cursor and first page carry the matching sentinels. The integration cursor case walks the full list without repeating or dropping a row.
4. **The first page of a list was empty.** The first page used `infinity` as the due sentinel, and `(0, realDate, ...) > (0, infinity, ...)` is false, so every real-dated row was excluded. The first page uses `-infinity`, which sorts below any date; the cursor branch keeps `"infinity"` so a decoded null compares equal to the COALESCE'd null.
5. **`created_at` in the keyset repeated the cursor row.** Postgres timestamps hold microseconds and a JS `Date` holds milliseconds, so a cursor carrying `createdAtMs` never matched the stored row and the page repeated it. `created_at` left both keysets and both ORDER BY lists; the UUIDv7 `id` embeds the millisecond timestamp, so ordering by `id` alone reproduces `(created_at, id)` exactly, and the integration cursor case pins one visit per row.
6. **The list route answered the bare page object.** The first build returned the page object, which the wire schema `{ data, page }` rejected with "invalid_type path: page". The GET now wraps the page as `{ data: page.data, page: { nextCursor, hasMore } }`, and every integration list case parses it through `todoListSchema`.
7. **A unit cursor case passed a `Date`.** With `encodeCursor` retyped to a date string the dated round-trip case still passed a `Date`; it now passes `2026-05-01`, which is the wire form, and the round-trip assertion is unchanged.

Two process findings also belong here. The edit tool clobbered the service and the list route mid-session when a body was shorter than its selected range; both were re-read and rewritten, and the final files typecheck and pass. And the error and Retry path was exercised by intercepting the completion `PUT` and answering 500, because no real server failure was induced; the row stayed in place and Retry re-sent the request successfully.

## 8. Known limitations

1. The Definition of Done row stays partial for three named reasons: the by-layer coverage floors (domain 90%, application 80%, overall 80%) are still neither enforced nor met, which is OD-M31 and unchanged since M01; axe cannot run in this tree because no browser-automation dependency is installed, and no screen reader was driven; and the `m10-done` tag is the owner's step.
2. A-9 does not carry a topic picker. FR-090 names a subject and a topic, and the table and the API accept `topicId`, but the page sets only the subject. On edit the topic is preserved when the subject is unchanged and cleared when the subject changes, and the API validates a topic against its subject. If the owner wants a topic chosen in the UI, it is a field on the edit dialog plus the same `resolveTopic` guard the API already runs.
3. The quick-add due date is sent as the raw `YYYY-MM-DD` the input produced, which is the correct local-date form and needs no timezone conversion. The consequence is that a date typed for a past day is not "overdue" until that day is before the profile-zone today, which is the BR-030 reading.
4. The FR-095 tie-break uses `id` in place of `created_at` in the keyset and the ORDER BY. This is exact for UUIDv7, which embeds the millisecond timestamp and is the only id this table writes; a non-UUIDv7 id inserted by hand would order by its own bytes rather than by age.
5. The cursor and the due filters assume a `DATE` column and a `YYYY-MM-DD` string contract. The cast to text is deliberate and documented here so a later reader does not "restore" the `toISOString` form and reintroduce the off-by-one.
6. The browser pass proved layout by DOM measurement (`scrollWidth` against `clientWidth`, computed colors, focus) and recorded screenshots, because the model driving the pass could not view images. The screenshots are in `.artifacts/`.
7. Nothing is committed, staged or tagged by me. The owner decides what happens to the working tree.

## 9. Remaining tasks

- Owner: review this report and [M10-EVIDENCE.md](M10-EVIDENCE.md), commit the working tree, approve or correct the record, and create the `m10-done` tag.
- The Definition of Done row stays unchecked in [MILESTONES.md](../07-roadmap/MILESTONES.md) until the by-layer floors have a command and axe can run (OD-M31).
- Owner decision: whether A-9 should choose a topic (limitation 2); the API already supports it.
- No follow-up code is deferred: the M10 card's deliverable rows are complete, and the open rows are evidence gaps and the tag rather than work items.

## 10. Documents updated

| Document | Change |
|---|---|
| [MILESTONES.md](../07-roadmap/MILESTONES.md) M10 | two rows checked, the Definition of Done row left unchecked, and an "As built" note recording what shipped and which row stays open |
| [IMPLEMENTATION-READINESS.md](../IMPLEMENTATION-READINESS.md) sections 6 and 7 | the M10 execution paragraph and the authorization sentence naming M10 and the next step |
| [DOCUMENTATION-INDEX.md](../DOCUMENTATION-INDEX.md) | the two M10 build records and the inventory count |
| [README.md](../README.md), [docs/README.md](../README.md) | build state, the navigation line, the reading order and the build records |
| [CHANGELOG.md](../CHANGELOG.md) | the 2026-11-27 M10 entry, with the seven defects under "Fixed" |
| [OPEN-DECISIONS.md](../OPEN-DECISIONS.md) section G | the 2026-11-27 M10 execution row |

DATA-DICTIONARY and API-ENDPOINTS are unchanged: M10 implements `todos`, TODO-01 to TODO-06 and A-9 as those documents already write them.

## 11. Definition of Done level

The milestone-level check is in [M10-EVIDENCE.md](M10-EVIDENCE.md) E08. FR-090 to FR-096 are delivered with no stub or placeholder, typecheck, lint and the boundary check pass, 151 unit and 169 integration tests pass, the production build succeeds with the three new route files and `/todos`, the tasks module clears the floor M10 added at 90.05 / 85.79 / 100 / 91.71, both registries carry `tasks` and both pinned lists are updated, the ownership contract holds, idempotency and `If-Match` are verified, and the four-width browser pass shows no horizontal scroll with every state (loading, empty, error, data) present. Three rows are not fully checked: the by-layer coverage floors, the axe and screen-reader half of the accessibility row, and the `m10-done` tag. The card's two functional rows are checked on the evidence above.

## 12. Recommended next milestone

M11 Notes. It is the other milestone that depends only on M03 and can be built after it, and the roadmap places it next in the default sequential order. It owns the `notes` table at rank 10 and adds a purge handler and an export contributor, and it completes the note prompt of FR-049 that M07 left open. M05 through M10 stay open on their Definition of Done rows until the coverage, screen-reader and axe gaps are closed and the owner has tagged each one.