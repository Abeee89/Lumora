# M10 Evidence

> Status: executed 2026-11-27 on `main`; build work tree `D:/Portofolio/Lumora`. Every command below was run in this session and outputs are pasted as observed. The milestone record is [M10-COMPLETION-REPORT.md](M10-COMPLETION-REPORT.md); the milestone card is [MILESTONES.md](../07-roadmap/MILESTONES.md) M10.

## Rules

- One section per checkpoint. Paste the exact command and the observed output.
- Record runtime, library and database versions.
- State pass or fail against the M10 checklist row. On fail or partial, name the cause and the row that stays unchecked.
- A row with no evidence stays unchecked in [MILESTONES.md](../07-roadmap/MILESTONES.md).
- No secret, token or personal data appears here.

## Checklist status

| M10 completion row | State | Evidence |
|---|---|---|
| CRUD, filter, sort and done toggle work | PASS | E03 pins `priorityRank`, `sortKey` and the cursor round-trip; E04 runs 26 integration cases over TODO-01 to TODO-06, including the FR-095 order, the AND filters, the `overdue`/`today`/`within7`/`none` predicates, the version guard and the idempotent completion; E06 drove the production build and added, filtered, toggled, edited and deleted real to-dos |
| Purge handler and export contributor registered | PASS | E07: `tasks` is registered in both registries before `topics` and `subjects`; the profile registry test that pins both key lists names `tasks` and is green in E01 |
| DEFINITION-OF-DONE.md checked | PARTIAL | E08: every milestone-level item is evaluated. Three rows stay partial or open and are the same three records since M01: the by-layer coverage floors (OD-M31), the axe and screen-reader half of the accessibility row because no browser-automation dependency is installed in this tree, and the `m10-done` tag, which the owner creates |

## Environment and versions

| Item | Observed value |
|---|---|
| Runner | Windows 10.0.26200, x64 |
| Node.js | v24.13.1 |
| npm | 11.8.0 |
| Repository | `D:/Portofolio/Lumora`, branch `main`. Nothing here was committed, staged or tagged by me |
| Next.js | 16.4.6 |
| React and React DOM | 19.3.1 |
| TypeScript | 6.0.3 |
| vitest | 5.1.1 |
| ESLint | 10.15.0 (flat config, `typescript-eslint` 8.73.0) |
| Tailwind CSS | 4.3.5 |
| pg | 8.23.1 |
| zod | 4.6.7 |
| embedded-postgres | 18.6.0-beta.19 |
| PostgreSQL | 18.6, embedded. The integration suite starts its own instance on a free ephemeral port; the browser run used port 55433 through `.artifacts/pg-dev.ts` with all nine migrations applied (`0001` to `0009`) |
| Browser used for the runtime checks | managed Chromium through the omp browser device, viewport 360, 768, 1280 and 2560 wide |
| Browser account | `todo-check-<nonce>@example.com` with the profile zone UTC, created through the signup form; the subject `Algebra` and five to-dos: `Read chapter 1` (high, due 2026-11-28), `Problem set 3` (medium, due 2026-12-03), `Old essay` (high, due 2026-11-20), `Review notes` (low, no due date) and `Lab report` (medium, due 2026-12-10, done) |

Host clock is UTC+07. The browser profile zone is UTC, so every instant in E06 is the UTC instant; the app's today during the browser pass was 2026-11-27, which is why a to-do due 2026-11-20 reads "Overdue by 7 days".

## E01 Typecheck, lint, boundaries and the full suite

- Requirement: the tree proves itself (DEFINITION-OF-DONE section 2) and the M10 card's test row.
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

 Test Files  23 passed (23)
      Tests  151 passed (151)

> lumora@0.1.0 test:integration
> vitest run --project integration

 Test Files  14 passed (14)
      Tests  169 passed (169)
```

- The unit tier went from 22 files / 143 cases to 23 files / 151 cases: `tests/unit/tasks.test.ts` adds 8, the other suites are unchanged apart from the cursor-case input type described in section 7. The integration tier went from 13 files / 143 cases to 14 files / 169 cases: `tests/integration/tasks.test.ts` adds 26, the other suites are unchanged.

## E02 Production build

- Requirement: the milestone ships in a production build (DEFINITION-OF-DONE section 2).
- Command: `npx next build`.
- Result: exit 0. Output as observed:

```
▲ Next.js 16.4.6 (Turbopack)
- Environments: .env.local
✓ Compiled successfully in 3.1s
✓ Generating static pages using 7 workers (48/48) in 1398ms
```

- The route table now holds 69 lines: M09's 65 plus the four M10 routes, `ƒ /api/app/todos`, `ƒ /api/app/todos/[todoId]`, `ƒ /api/app/todos/[todoId]/completion` and the page `ƒ /todos`.
- The build turns the browser checks in E06 into checks against the production server: `npx next start -p 3000` served the same artifacts, not `next dev`.

## E03 Unit tests

- Requirement: the M10 card's test row (`unit (ordering); ownership contract; cursor pagination`).
- Command: `npx vitest run --project unit tests/unit/tasks.test.ts`.
- Result: 1 file passed, 8 tests passed. The suite drives the exported pure helpers with no database.

| Case | What it pins |
|---|---|
| priority rank | `priorityRank` answers `0`, `1`, `2` for high, medium, low (BR-031) |
| high before medium before low | `sortKey` orders by rank first, so a high to-do due later precedes a medium one due sooner (AC-FR-095-1) |
| earliest due first within a rank | two medium to-dos order by `dueDate` ascending (AC-FR-095-2) |
| a dated to-do before a dateless one | the empty due segment sorts before a date, so nulls go last (AC-FR-095-3) |
| creation time then id tie-break | equal rank and due fall back to `createdAt`, then `id` (FR-095) |
| round-trips a dated open cursor | `decodeCursor(encodeCursor(...))` returns the rank, the date, the creation ms, the id and the done flag unchanged |
| round-trips a dateless done cursor | the same with a null date and `done` true |
| rejects a tampered or malformed cursor | a truncated marker, a non-UUID id, a rank outside `0..2` and a non-base64 string each throw the wire message `page cursor is invalid` (`invalid_cursor`) |

## E04 Integration tests

- Requirement: the M10 card's acceptance criteria and the ownership contract.
- Command: `npx vitest run --project integration tests/integration/tasks.test.ts`.
- Result: 1 file passed, 26 tests passed, against PostgreSQL 18.6 with the test database migrated through `0009_todos.sql`. The cases run inside transactions that are rolled back, so the suite leaves no rows.

What the 26 cases cover, by area:

| Area | Cases |
|---|---|
| TODO-02 create | a new to-do is not done, defaults to Medium and carries no due date (AC-FR-090-1, AC-FR-096-1); a 200-character title is accepted and 201 is refused with `validation_failed` (AC-FR-090-2); a missing `Idempotency-Key` is refused with `idempotency_key_required`; the same key replays and the second answer is the same row |
| TODO-01 list and filters | the FR-095 order (rank, then due with null last, then age) with the date the client sent returning unchanged (AC-FR-095-1 to AC-FR-095-3); done to-dos follow open ones under `status=all` (FR-095); the subject and priority filters combine with AND (AC-FR-094-1, AC-FR-094-2); `overdue`/`today`/`within7`/`none` are computed against the profile zone and `overdue` never matches a done row (AC-FR-094-3); an empty match is an empty page (AC-FR-094-4); unknown enum values answer `validation_failed`; `limit` outside 1..100 answers `invalid_page_size` |
| TODO-03 read and TODO-04 edit | a to-do reads by id; the edit requires `If-Match` (`version_required` when absent) and answers `stale_version` with `details.current` on a mismatch (EC-020); `dueDate: null` clears the date and `subjectId: null` clears the subject and topic (AC-FR-091-2); an archived subject is refused with `subject_archived` |
| TODO-05 completion | setting done records `completedAt` and bumps `version`; a repeat of the same state changes nothing (AC-FR-093-3); `TodoCompleted` publishes only on the false-to-true transition (FR-172, EC-017) |
| TODO-06 delete | the delete requires `If-Match`, removes the row, and a retry after success answers 404 (AC-FR-092-3) |
| Ownership and cursor | a foreign user never sees the owner's rows; the cursor walks the full list without repeating or dropping a row across pages |
| Purge and export | `purgeTodos` removes the caller's rows and returns the count; `exportTodos` returns them with the `due_date` as a date string |

## E05 Coverage

- Requirement: DEFINITION-OF-DONE section 2 ("Coverage floors met ... and not lower than before"); the M10 card adds the `src/modules/tasks/**` floor.
- Command: `npm run test:coverage` (`vitest run --coverage`, both projects).
- Result: exit 0, 37 test files / 320 tests, so all seven per-path floors (kernel, exams, plans, timer, goals, calendar, tasks) were met.

| Scope | % Stmts | % Branch | % Funcs | % Lines | Floor | State |
|---|---|---|---|---|---|---|
| `src/modules/tasks/**` | 90.05 | 85.79 | 100 | 91.71 | 80 / 70 / 70 / 80 | PASS |
| `src/kernel/**` | 88.95 | 77.16 | 89.28 | 93.92 | 80 / 70 / 70 / 80 | PASS |
| `src/modules/calendar/**` | 100 | 83.33 | 100 | 100 | 80 / 70 / 70 / 80 | PASS |
| `src/modules/plans/**` | 95.27 | 88.98 | 100 | 94.53 | 80 / 70 / 70 / 80 | PASS |
| `src/modules/goals/**` | 94.17 | 84.48 | 94.11 | 96.73 | 80 / 70 / 70 / 80 | PASS |

The overall figure is 49.03% statements, 38.22% branches, 46.88% functions and 49.99% lines across `src/**`; the uncovered remainder is the UI components and screens, which no unit test renders. The by-layer floors the Definition of Done names (domain 90%, application 80%, overall 80%) are still neither enforced nor met, which is the OD-M31 gap M01 to M09 recorded.

## E06 Browser pass

- Requirement: the milestone ships on a production build, A-9 works end to end and no surface scrolls sideways at 360 px (DEFINITION-OF-DONE section 2, NFR-051).
- Environment: `npx next start -p 3000` serving the E02 build, against the development PostgreSQL on port 55433 with all nine migrations applied. Managed Chromium through the omp browser device at 360x900, 768x900, 1280x900 and 2560x1440. Account `todo-check-<nonce>@example.com`, created through the signup form, profile time zone UTC, the subject `Algebra` and five to-dos created through the API.

| Step | Observed |
|---|---|
| Quick add | a title, a priority defaulting to Medium and an "Add task" button; "More fields" reveals the due date and the subject combobox, and collapses after each add |
| Due text | `Old essay` due 2026-11-20 reads "Overdue by 7 days"; `Read chapter 1` due 2026-11-28 reads "Due today"; `Problem set 3` due 2026-12-03 reads "Due 3 Dec"; `Review notes` reads "No due date" |
| Filters | Status/Subject/Priority/Due combine with AND; selecting subject `Algebra` and priority `High` answers `Old essay` and `Read chapter 1` |
| Done toggle | under `status=All` the checkbox marks a row done in place: the title gains a line-through and a "Done" chip, the checkbox label flips to "Mark ... open", and the polite live region announces "Task marked done"; toggling back announces "Task marked open" |
| Priority chips | High renders in the error color, Medium in the primary color and Low in the neutral line/ink color; each chip carries its level as text, so color is never the only carrier (NFR-043) |
| Empty state | a filter that matches nothing renders "No tasks" and a "Clear filters" button; the button resets Status to Open and clears the other three |
| Edit dialog | the row menu opens an Edit dialog with Task title, Priority, Due date and Subject; saving renames the row, changes the priority and due date, re-sorts it and announces "Task updated" |
| Delete | the row menu's Delete opens a dialog naming the task ("Delete task 'Old essay'?") with the consequence text; confirming removes the row and announces "Task deleted" |
| Empty title | "Add task" with a blank title shows "Enter a task title" inline, sets `aria-invalid` and `aria-describedby`, makes no request, and returns focus to the title input |
| Focus | after an empty submit and after a successful add, `document.activeElement` is the title input |
| Failed toggle and Retry | a simulated 500 on the completion `PUT` leaves the row in place, shows "Something went wrong on our side. Try again." with a Retry button; Retry re-sends the request, succeeds and announces "Task marked done", clearing the error |

Layout, `documentElement.scrollWidth` against `clientWidth`, and the responsive grid:

| Viewport | scrollWidth / clientWidth | filters | More fields grid | horizontal overflow |
|---|---|---|---|---|
| 360 | 360 / 360 | one column, stacked | due above subject | none |
| 768 | 768 / 768 | two columns, two rows | side by side | none |
| 1280 | 1280 / 1280 | four columns, one row | side by side | none |
| 2560 | 2560 / 2560 | four columns, one row | side by side | none |

Grayscale review: the priority chip prints its level as text, the due line prints the status and the date as text, and the done state carries the word "Done" as a chip and a line-through, so no carrier is color alone (NFR-043). The screenshots for the record are `.artifacts/m10-todos-{360,768,1280,2560}.png`, `.artifacts/m10-delete-dialog-1280.png` and `.artifacts/m10-edit-dialog-1280.png`.

## E07 Registries

- Requirement: the M10 card's "Purge handler and export contributor registered" row and DEFINITION-OF-DONE section 2.
- Command and observed output:

```
node --env-file=.env.local --import tsx -e "import { container } from './src/server/container.ts'; import { purgeHandlers, exportContributors } from './src/kernel/registries.ts'; container(); console.log('purge', JSON.stringify([...purgeHandlers.keys()])); console.log('export', JSON.stringify([...exportContributors.keys()]));"
purge ["profile","auth","exams","plans","timer","sessions","goals","tasks","topics","subjects"]
export ["profile","exams","plans","timer","sessions","goals","tasks","subjects","topics"]
```

- `tasks` is registered in both lists before `topics` and `subjects`, because `todos` holds NO ACTION composite keys to both and a purge must remove the to-dos first (BR-029). `tests/integration/profile.test.ts` pins both key lists in both orders with `tasks` included and its suite is green in E01.

## E08 Definition of Done

Milestone level, [DEFINITION-OF-DONE.md](../07-roadmap/DEFINITION-OF-DONE.md) section 2:

| Item | State | Evidence |
|---|---|---|
| All acceptance criteria ids pass | PASS | AC-FR-090-1, AC-FR-090-2, AC-FR-091-2, AC-FR-092-3, AC-FR-093-1 to AC-FR-093-3, AC-FR-094-1 to AC-FR-094-4, AC-FR-095-1 to AC-FR-095-3 and AC-FR-096-1 are mapped to the 8 unit and 26 integration cases of E03 and E04 and to the browser steps of E06 |
| Every FR in scope has implemented behavior | PASS | FR-090 (create), FR-091 (edit and read), FR-092 (delete), FR-093 (idempotent completion), FR-094 (filters), FR-095 (order), FR-096 (priority default) across TODO-01 to TODO-06 and A-9; no stub, placeholder, mock or `TODO` is left in `src/modules/tasks/**`, the three route files, `src/app/todos/page.tsx` or the client |
| Tests per the TESTING-STRATEGY matrix are green | PASS | E01: unit 151 and integration 169, both green, of which 8 and 26 are M10 |
| Typecheck, lint and boundary check pass | PASS | E01 |
| Coverage floors met and not lower than before | PARTIAL | E05: the `src/modules/tasks/**` floor (80 / 70 / 70 / 80) is met at 90.05 / 85.79 / 100 / 91.71 and the six earlier floors still pass. The by-layer floors this item names (domain 90%, application 80%, overall 80%) are still neither enforced nor met, the OD-M31 gap unchanged since M01 |
| Ownership contract test per new resource | PASS | E04: every to-do read and write is scoped by `user_id`; a foreign user answers 404 on a read and never sees the owner's rows in a list |
| Purge handler and export contributor per new user-data table | PASS | E07: `tasks` is registered in both registries before `topics` and `subjects`, and both pinned key lists carry it |
| Idempotency and concurrency requirements verified | PASS | E04: TODO-02 replays on the same `Idempotency-Key`; TODO-04 and TODO-06 require `If-Match` and answer `stale_version` with `details.current`; TODO-05 changes nothing, bumps nothing and publishes nothing when the state is unchanged (AC-FR-093-3) |
| Migrations apply from an empty database and from the previous schema | PASS | M10 adds `0009_todos.sql`; the integration environment migrates an empty database through all nine migrations on every run (E04) and the browser environment applied the same set through `.artifacts/pg-dev.ts` |
| Accessibility: axe zero serious or critical, manual keyboard pass, no horizontal scroll at 360 px | PARTIAL | No horizontal scroll at any of the four widths (E06). axe cannot run in this tree (no browser-automation dependency, the same gap M01 to M09 recorded) and no screen reader was driven; the page uses native inputs, selects and buttons, an inline error wired through `aria-describedby`, a polite live region for every mutation, visible focus returned to the title input, and text carriers for priority, due state and done (NFR-043) |
| Error, empty and loading states implemented | PASS | E06: the unmatched filter renders "No tasks" with "Clear filters"; a failed toggle keeps the row, shows the ERR-SECTION message inline and offers Retry; the empty account shows the "Add your first task" placeholder; the add button carries a pending state |
| Structured logs carry no secrets or note content | PASS | M10 logs no note or title content; the redaction tests of M01 are unchanged and green |
| Docs updated: SDD, DATA-DICTIONARY, API-ENDPOINTS, PAGE-SPECIFICATIONS as affected | PASS | DATA-DICTIONARY names `todos`; the routes implement API-ENDPOINTS TODO-01 to TODO-06 and the page implements PAGE-SPECIFICATIONS A-9 as written; the documents M10 changed are listed in section 10 of the record |
| REQUIREMENT-TRACEABILITY updated | PASS | FR-090 to FR-096 were already mapped and M10 changes no requirement, so the map needed no row |
| MILESTONES.md checklist fully checked | PARTIAL | Two of the three rows are checked; the Definition of Done row stays unchecked, which is what this table explains |
| Completion report produced in the Build Mode format | PASS | [M10-COMPLETION-REPORT.md](M10-COMPLETION-REPORT.md) |
| No future-phase feature code is reachable | PASS | M10 is MVP: the to-do list is reachable at `/todos`, and nothing of M11 (notes), M13 (dashboard) or later is added or flagged |
| Tag `m10-done` created | NOT DONE | The owner commits and tags; nothing in this session was committed, staged or tagged |

Task level, [DEFINITION-OF-DONE.md](../07-roadmap/DEFINITION-OF-DONE.md) section 1: the change stays inside M10, stage 1 to stage 4 pass (E01), inputs are validated on the server with the documented codes (`validation_failed` for a bad enum or a bad date, `invalid_page_size` for a limit outside 1..100, `subject_archived` for an archived subject), no secret or personal data reaches a log or a fixture, no `TODO` or stub is left, the touched documents are updated, and the milestone record was written for review. Stage 5, the squash merge, is the owner's.

## Defects found and fixed in this pass

Each fix is described with its cause and the case that now pins it in section 7 of [M10-COMPLETION-REPORT.md](M10-COMPLETION-REPORT.md).

| Defect | Cause | Fix and the case that pins it |
|---|---|---|
| A due date read back one day early under a positive-offset process | the `due_date` column is a `DATE`, which node-postgres parses into a `Date` at local midnight; `present` formatted it with `toISOString().slice(0, 10)`, so a UTC+07 process shifted every date back a day on read | the select casts `t.due_date::text AS due_date` and `TodoRow.due_date` is a string, so the date travels as the database wrote it; `encodeCursor` takes the date string and `decodeCursor` re-encodes the same string. The integration case reads `medium-may3` back as `2026-05-03` and the browser pass reads 2026-11-20, 2026-11-28 and 2026-12-03 as entered |
| The title input never regained focus | `titleRef` was declared and focused, but no `TextInput` bound it, and `TextInput` did not accept a `ref` at all, so both `focus()` calls were no-ops | `TextInput` forwards `ref` to the `<input>` (React 19 ref-as-prop) and the quick-add title passes `ref={titleRef}`; the browser pass reads `activeElement` on the title input after an empty submit and after a successful add |
| The keyset dropped rows on every page | the row comparison `(priority, due_date, ...) > (...)` returned NULL when a row's `due_date` was NULL, so the first dated page stopped at the first dateless row | both keysets compare `COALESCE(t.due_date, 'infinity')` in the ORDER BY and the predicate; the cursor and the first page carry the matching sentinels. The integration cursor case walks the full list without repeating or dropping a row |
| The first page of a list was empty | the first page used `infinity` as the due sentinel, and `(0, realDate, ...) > (0, infinity, ...)` is false, so every real-dated row was excluded | the first page uses `-infinity`, which sorts below any real date; the cursor branch keeps `"infinity"` so a decoded null compares equal to the COALESCE'd null |
| `created_at` in the keyset repeated the cursor row | Postgres timestamps hold microseconds and a JS `Date` holds milliseconds, so a cursor carrying `createdAtMs` never matched the stored row and the page repeated it | `created_at` left both keysets and both ORDER BY lists; the UUIDv7 `id` embeds the millisecond timestamp, so ordering by `id` alone reproduces `(created_at, id)` exactly. The integration cursor case pins one visit per row |
| The list route answered the bare page object | the first build returned the page object, which the wire schema `{ data, page }` rejected with "invalid_type path: page" | the GET wraps the page as `{ data: page.data, page: { nextCursor, hasMore } }`; every integration list case parses it through `todoListSchema` |
| A unit cursor case passed a `Date` | `encodeCursor` still typed the date as `Date` | the case passes the date string `2026-05-01`, which is the wire form; the round-trip assertion is unchanged |