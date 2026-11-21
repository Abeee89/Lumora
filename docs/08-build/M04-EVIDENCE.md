# M04 Evidence

> Status: executed 2026-11-21 on `main` plus the uncommitted work listed at the end; build work tree `D:/Portofolio/Lumora`. Every command below was run in this session and outputs are pasted as observed. The milestone record is [M04-COMPLETION-REPORT.md](M04-COMPLETION-REPORT.md); the milestone card is [MILESTONES.md](../07-roadmap/MILESTONES.md) M04.

## Rules

- One section per checkpoint. Paste the exact command and the observed output.
- Record runtime, library and database versions.
- State pass or fail against the M04 checklist row. On fail or partial, name the cause and the row that stays unchecked.
- A row with no evidence stays unchecked in [MILESTONES.md](../07-roadmap/MILESTONES.md).
- No secret, token or personal data appears here.

## Checklist status

| M04 completion row | State | Evidence |
|---|---|---|
| Create, edit, checklist, countdown, archive list work | PASS | E03: EXAM-01..EXAM-06 answer through the integration suite; E05 and E06: the same paths were driven in the browser on A-12 and A-13 |
| No readiness UI or field visible in the MVP build | PASS | E06, E10: the exam payload holds no readiness field, A-13 shows only "Checklist · N topics, M done" text, and the production route table holds no readiness route |
| Purge handler and export contributor registered | PASS | E08: `purgeHandlers.keys()` is `["profile", "auth", "exams", "topics", "subjects"]` and `exportContributors.keys()` is `["profile", "exams", "subjects", "topics"]`; the exams purge handler removes its rows and both contributors return their section |
| DEFINITION-OF-DONE.md checked | PARTIAL | E11: every milestone-level item evaluated; the ones that need the Phase 2 readiness score are named there and nothing was ticked on their behalf |

## Environment and versions

| Item | Observed value |
|---|---|
| Runner | Windows 10.0.26200, x64 |
| Node.js | v24.13.1 |
| npm | 11.8.0 |
| Repository | `D:/Portofolio/Lumora`, branch `main`, no commit made by me |
| Next.js | 16.4.6 |
| React and React DOM | 19.3.1 |
| TypeScript | 6.0.3 |
| vitest | 5.1.1 |
| ESLint | 10.15.0 (flat config, `typescript-eslint` 8.73.0) |
| Tailwind CSS | 4.3.5 |
| pg | 8.23.1 |
| zod | 4.6.7 |
| embedded-postgres | 18.6.0-beta.19 |
| PostgreSQL | 18.6, embedded; the integration suite starts it on a free ephemeral port, the browser run used port 55433 through `.artifacts/pg-dev.ts` with all four migrations applied |
| Browser used for the runtime checks | managed Chromium through the omp browser device, viewport 360, 768, 1280 and 2560 wide, height 900 |

Host clock is UTC+07. Timestamps below are local unless stated.

## E01 Typecheck, lint, boundary check

- Requirement: DEPLOYMENT-ARCHITECTURE section 4 stages 1 and 2; NFR-061.
- Command: `npm run verify` (`npm run typecheck && npm run lint && npm run boundaries && npm run test && npm run test:integration`).

Raw output, stages 1 to 3:

```
> lumora@0.1.0 typecheck
> tsc --noEmit

> lumora@0.1.0 lint
> eslint .

> lumora@0.1.0 boundaries
> tsx scripts/check-boundaries.ts

Boundary check passed.
```

Observed: typecheck exits 0 with no diagnostics, `eslint .` exits 0 with no output, the boundary check passes. The boundary check proves Exams reaches Subjects and Topics only through `src/modules/subjects/public.ts` and `src/modules/topics/public.ts`, and that no UI file imports a module service.

## E02 Unit tests

- Requirement: TESTING-STRATEGY section 11; MILESTONES M04 test list ("countdown across timezone; archive at user-local today").
- Command: `npm run verify` stage 4, plus the M04 file run alone for its name and count.

Raw output:

```
> lumora@0.1.0 test
> vitest run --project unit

 Test Files  17 passed (17)
      Tests  76 passed (76)
   Duration  4.38s

$ npx vitest run --project unit tests/unit/exams.test.ts
 Test Files  1 passed (1)
      Tests  7 passed (7)
```

M04 coverage inside that run:

| Test file | What it proves |
|---|---|
| `tests/unit/exams.test.ts` (7 cases) | `daysBetween` returns whole calendar days and never a negative; `countdownOf` answers `{daysRemaining, isToday}` with `isToday` only on the exam day; the archived-list cursor round-trips through `base64url` and a tampered tail is rejected with `invalid_cursor`; the config bounds hold (`titleMaxLength` 200, `archivePageSize` 50, `archiveMaxPageSize` 100); the auto-archive job's cron is hourly and its queue name is `exam_auto_archive` |

The archive-at-local-today rule and the checklist replace semantics are SQL behaviour (a `date` comparison and a delete/insert pair), so they are proved end to end in E03.

## E03 Integration tests

- Requirement: TESTING-STRATEGY section 11; NFR-016 (ownership contract); NFR-053 and NFR-094 (idempotency, optimistic concurrency); EC-008, EC-013.
- Command: `npm run verify` stage 5, plus the M04 file run alone for its names and count.

Raw output of the M04 file alone:

```
$ npx vitest run --project integration tests/integration/exams.test.ts
 Test Files  1 passed (1)
      Tests  12 passed (12)
```

Raw output of the whole integration stage:

```
> vitest run --project integration

[10:36:32] INFO: job.ran
    job: "auth_cleanup"
    result: { "sessions": 1, "resetTokens": 1, "auditEvents": 0 }

 Test Files  8 passed (8)
      Tests  59 passed (59)
   Duration  140.70s (tests 85%, import 14%)
```

The M04 cases and what each proves:

| Case | Behaviour proved | Requirement |
|---|---|---|
| creates an exam with location, etag and countdown, and rejects a past date | 201 with `Location` and `ETag: "1"`; `state` upcoming, `countdown.daysRemaining` exact; a past date answers 400 `exam_date_in_past` with `details.examDate` | FR-120, AC-FR-120-*, EC-013 |
| rejects an archived subject and out-of-range titles | 409 `subject_archived` for an archived subject; 400 `validation_failed` for a 201-character title | FR-120, FR-013 |
| replays a keyed create and rejects a reused key with a different payload | the same `Idempotency-Key` returns the stored response with `Idempotent-Replay: true`; a different payload on that key answers 409 `idempotency_key_reused` | NFR-053 |
| lists upcoming first, archived last, and paginates the archived list | upcoming ordered `examDate` ascending with `isToday` on the exam-day row; archived ordered `examDate` descending with a `nextCursor` and `hasMore`; the second page arrives through the cursor | FR-125, AC-FR-125-* |
| answers the list counts as numbers, not the driver's bigint strings | a checklist row's `topicCount` and `completedCount` parse as integers, not the `count(*)` text the driver returns | FR-125 (regression for the defect in E10) |
| rejects limit or cursor on the upcoming list and bad page sizes | 400 `validation_failed` for `limit` or `cursor` with `state=upcoming`; 400 `invalid_page_size` outside 1..100 and for a non-integer | API-CONVENTIONS section 4 |
| edits under If-Match, reloads on a stale version, clears the checklist on a subject change | 200 with a bumped `ETag`; 409 `stale_version` with `details.current`; changing `subjectId` deletes the `exam_topics` rows in the same transaction | FR-121, AC-FR-121-*, NFR-094 |
| replaces the checklist and toggles a single topic | EXAM-05 stores exactly the sent set and keeps `completed` for retained topics; EXAM-06 sets one flag; a foreign topic answers 400 `validation_failed`; an empty set is valid | FR-122, FR-123, AC-FR-122-*, AC-FR-123-* |
| drops a checklist row when its topic is archived (EC-008) | archiving a topic removes its `exam_topics` row and the exam then reports it absent | EC-008 |
| keeps an archived exam read-only except the date, and restores it with a later date | an archived exam answers 400 `validation_failed` for a title or a checklist change and 200 for a date that is today or later, after which `state` is upcoming again | FR-124, AC-FR-124-* |
| answers not_found for malformed, unknown and foreign exam ids | 404 `not_found` for a non-uuid and an unknown uuid, and for every read and write another user attempts through `expectHiddenFromOtherUser` | NFR-016 |
| purges exams before topics and exports both | both registry keys and their order; the exams export contributor returns its section and the purge handler leaves no `exams` rows | NFR-031, FR-130 |

Error codes answered by the M04 routes, as observed in that run: `validation_failed`, `exam_date_in_past`, `subject_archived`, `not_found`, `idempotency_key_reused`, `stale_version`, `invalid_page_size`, `invalid_cursor`, `unauthenticated`. `invalid_page_size` and `invalid_cursor` are new and were added to the [ERROR-HANDLING.md](../03-architecture/ERROR-HANDLING.md) section 4 catalog by this milestone.

## E04 Production build

- Requirement: DEPLOYMENT-ARCHITECTURE section 4 stage 6; the milestone deliverable is a buildable route inventory.

Command: `npx next build`.

Raw output, head and route table:

```
Route (app)
┌ ƒ /
├ ƒ /_not-found
├ ƒ /api/app/auth/google
├ ƒ /api/app/auth/password-reset/complete
├ ƒ /api/app/auth/password-reset/request
├ ƒ /api/app/auth/sign-in
├ ƒ /api/app/auth/sign-ins
├ ƒ /api/app/auth/sign-ins/[signInId]
├ ƒ /api/app/auth/sign-ins/revoke-others
├ ƒ /api/app/auth/sign-out
├ ƒ /api/app/auth/sign-up
├ ƒ /api/app/exams
├ ƒ /api/app/exams/[examId]
├ ƒ /api/app/exams/[examId]/topics
├ ƒ /api/app/exams/[examId]/topics/[topicId]
├ ƒ /api/app/profile
├ ƒ /api/app/profile/onboarding
├ ƒ /api/app/subjects
├ ƒ /api/app/subjects/[subjectId]
├ ƒ /api/app/subjects/[subjectId]/archive
├ ƒ /api/app/subjects/[subjectId]/restore
├ ƒ /api/app/subjects/[subjectId]/topics
├ ƒ /api/app/subjects/[subjectId]/topics/bulk
├ ƒ /api/app/subjects/[subjectId]/topics/order
├ ƒ /api/app/subjects/order
├ ƒ /api/app/topics/[topicId]
├ ƒ /api/app/topics/[topicId]/archive
├ ƒ /api/app/topics/[topicId]/restore
├ ƒ /api/auth/callback/google
├ ƒ /api/health
├ ƒ /exams
├ ƒ /exams/[examId]
├ ƒ /forgot-password
├ ƒ /login
├ ƒ /reset-password
├ ƒ /settings/appearance
├ ƒ /settings/profile
├ ƒ /settings/security
├ ƒ /signup
├ ƒ /subjects
├ ƒ /subjects/[subjectId]
├ ƒ /unsupported-browser
└ ƒ /welcome

ƒ  (Dynamic)  server-rendered on demand
```

Header lines as printed above the table: `Finished TypeScript in 3.0s` and `✓ Generating static pages using 7 workers (28/28) in 380ms`.

Observed: no warning, no lint error, no type error, `ƒ (Dynamic) server-rendered on demand` for every route. The table holds 43 routes, 26 of them under `/api/app`, four of which M04 adds (`/api/app/exams`, `/api/app/exams/[examId]`, `/api/app/exams/[examId]/topics`, `/api/app/exams/[examId]/topics/[topicId]`), plus the two new pages `/exams` and `/exams/[examId]`. M03 built 37 routes and 26 static pages; M04 adds six. The static/dynamic sibling pair `/api/app/exams/[examId]/topics` and `/api/app/exams/[examId]/topics/[topicId]` compiles without a conflict.

## E05 Browser checks, A-12 Exams

- Requirement: PAGE-SPECIFICATIONS A-12; NFR-040, NFR-042.
- Method: the managed Chromium tab driven through the omp browser device against `npx next start` on `http://localhost:3000` (the production build, not `next dev`), with a seeded account: two subjects, six topics, five exams of which one is archived.

Observed, in the order the checks ran:

| Check | Observed value |
|---|---|
| Page metadata and header | `document.title` "Exams · Lumora", `<h1>` "Exams", both tabs 44 px tall, the "Upcoming" tab selected with `tabIndex` 0 and "Archived" with -1 |
| Row rendering | three upcoming rows reading "Algebra finals | Mathematics: 21 Nov 2026 · Today · 2 topics, 1 done", "Kinematics midterm | Mathematics: 24 Nov 2026 · 3 days to go · 1 topic, 0 done" and "World War II essay | History: 12 Dec 2026 · 21 days to go · 0 topics, 0 done" |
| Countdown text | "Today" on the exam-day row, then "N days to go" for later dates; the counts are numbers, not strings |
| Add-exam dialog | opens with `role="dialog"`, 480 x 374 px, focus in the Subject select; the Subject select is preselected to the first subject, Title and Exam date are 44 px tall text inputs; Escape closed it and returned focus to the "Add exam" button |
| Past-date rejection | a 2026-01-05 date returned "Choose an exam date that is today or later." in the dialog and in the `role="alert"` live region; the dialog stayed open |
| Creating from the dialog | "Optics quiz" with a 2026-12-20 date created the exam; the dialog closed and the row appeared with "29 days to go" |
| Archived tab | the archived exam shows without a countdown and with a single "Change date" button; the empty archived state reads "No archived exams" |
| Change date | the date-only dialog opens with only the Exam date field, prefilled with the archived date and the copy "An archived exam only accepts a date change."; a 2026-12-01 date returned it to Upcoming with "10 days to go" |
| Empty state | a fresh account's Upcoming tab reads "No upcoming exams" with an "Add exam" button; Archived reads "No archived exams" |
| Loading state | with the list request delayed 2.5 s the page renders five skeleton rows inside an `aria-busy="true"` region with the text "Loading exams" and does not show the empty state |
| Error state | with the list request answered 500 the page renders "Could not load exams" with the failure body "Something went wrong on our side. Try again." and the request id |
| Keyboard tabs | with focus on the selected tab, ArrowRight selects and focuses "Archived" (`tabIndex` 0) and ArrowLeft moves back, so the roving-tabindex tablist is reachable without a pointer |
| Foreign exam | opening another account's exam id renders the not-found panel "We could not find that page" with "The exam may have been deleted, or the link may belong to another account." |

## E06 Browser checks, A-13 Exam detail

- Requirement: PAGE-SPECIFICATIONS A-13; FR-122, FR-123, FR-125.

| Check | Observed value |
|---|---|
| Page metadata and header | `document.title` "Algebra finals · Lumora", `<h1>` "Algebra finals", the sub-line "Mathematics · 21 Nov 2026 · Today", an "Edit topics" button and the summary "Checklist · 2 topics, 1 done" |
| Checklist rows | Kinematics (checked) and Algebra (not checked); each checkbox is a 24 x 24 px input inside a 44 px label inside a 52 px row |
| Ticking a topic | clicking the Algebra checkbox returned 200, the row showed checked and the summary read "Checklist · 2 topics, 2 done" |
| Edit topics dialog | lists all four subject topics with the two checklist members preselected; Save topics and Cancel are 44 px tall; Escape cancelled |
| Archived exam detail | the archived "Optics quiz" page shows the title, "Mathematics · 10 Nov 2026", a single "Change date" button and "This exam has no topics on its checklist."; no checkbox and no "Edit topics" button exists, so the page is read only |
| No readiness surface | neither page renders a readiness score, percentage, label or field; the only summary is the "N topics, M done" count |

## E07 Responsive and target-size measurements

- Requirement: NFR-087 (44 x 44 px hit area under 1024 px); NFR-040; the DoD item "no horizontal scroll at 360 px".
- Method: for each width, `document.documentElement.scrollWidth` against `window.innerWidth`, plus every visible `a[href], button, input, select, textarea, summary` measured with `getBoundingClientRect`.

| Page | Width | `scrollWidth` | Horizontal overflow | Interactive targets | Targets under 44 x 44 |
|---|---|---|---|---|---|
| A-12 | 360 | 360 | no | 13 | none |
| A-12 | 768 | 768 | no | 13 | none |
| A-12 | 1280 | 1280 | no | 13 | none |
| A-12 | 2560 | 2560 | no | 13 | none |
| A-13 | 360 | 360 | no | 9 | the two checklist checkboxes (24 x 24 px; their labels measure 44 x 107 px and 44 x 88 px, inside 52 px rows) |
| A-13 | 768 | 768 | no | 9 | the two checklist checkboxes |
| A-13 | 1280 | 1280 | no | 9 | the two checklist checkboxes |
| A-13 | 2560 | 2560 | no | 9 | the two checklist checkboxes |

No element crossed the viewport edge at any width on either page. The only sub-44 px elements are the two native checkboxes; each sits inside a 44 px `label` that is the real hit area and inside a 52 px row, so the pointer target satisfies NFR-087 the way the A-8 template does. At the two widest viewports the page is the shell's centred `max-w-6xl` column (1152 px, `src/ui/shell.tsx:69`), which is why the rightmost interactive element measured 1192 px at 1280 and 1832 px at 2560 and `scrollWidth` still equals `innerWidth`.

The keyboard-tab row in E05 is the state after the arrow-key fix recorded in E10; the same check before the fix is what found the defect.

## E08 Registry contributions

- Requirement: NFR-031, BR-032, FR-130, EC-019, EC-027.
- Proof: `tests/integration/exams.test.ts` "purges exams before topics and exports both", plus the registry assertions in `tests/integration/profile.test.ts`.

Observed through the container registries:

```
purgeHandlers.keys()      = ["profile", "auth", "exams", "topics", "subjects"]
exportContributors.keys() = ["profile", "exams", "subjects", "topics"]
```

Both exams functions run: the export contributor returns `{ section: "exams", rows: [...] }` and the purge handler runs between `auth` and `topics`. Registration order is the purge order and it is deliberate: exams registers before topics because `exam_topics` carries a foreign key to `topics`; both foreign keys are `ON DELETE CASCADE`, so the single `DELETE FROM users` reaches `exam_topics` and the named handlers exist for the NFR-031 contract and the export manifest.

## E09 Auto-archive job and the derived archive state

- Requirement: FR-125, BR-025; ADR-005 (jobs), ADR-006 (time).
- Proof: `tests/unit/exams.test.ts` (the cron and queue name), `src/modules/exams/job.ts`, and the integration cases that read an archived exam back.

The job `exam_auto_archive` runs on the `stately` queue at cron `0 * * * *`. Its query selects the exams whose `exam_date` is before the user's local today, computed as `(now() AT TIME ZONE p.timezone)::date` from `user_profiles`, and publishes one `ExamArchived {examId, subjectId, userId, occurredAt}` per row; it updates no column, so the archive state stays derived and a profile zone change takes effect on the next read without a migration. In the test tree the hourly cron and the queue name are asserted directly, and every archived read in E03 proves the derivation (`state` and a null `countdown`).

## E10 Defects found and fixed during this pass

The browser and API pass found four defects in code written earlier in this milestone; each was fixed, and the fix was re-observed.

| Defect | Evidence before | Fix and re-observation |
|---|---|---|
| The list counts shipped as strings | the live `GET /api/app/exams?state=upcoming` answered `"topicCount": "2"`, `"completedCount": "1"` | `countByExam` gained `::int` on both `count(...)` expressions (Subjects already cast); re-observed as `"topicCount": 2`; the regression case in E03 fails without the cast |
| The Archived tab was unreachable by keyboard | with the roving `tabIndex` (`0`/`-1`), ArrowRight on the Upcoming tab changed nothing, so no keyboard path reached Archived | `ExamList` gained the same `onKeyDown` arrow handler as `SubjectList`; re-observed ArrowRight selecting and focusing Archived and ArrowLeft returning |
| The list showed the empty state while loading | the first render, before the list request resolved, read "No upcoming exams" | a `loading` branch renders five skeleton rows in an `aria-busy="true"` region with `role="status"` "Loading exams"; re-observed with a delayed request |
| A Postgres `date` was shifted by the server timezone | `exam_date` came back as a JS `Date` at local midnight and `toISOString().slice(0,10)` moved `2026-11-28` to `2026-11-27`, so a 7-day countdown read 6 | every exam read now selects `e.exam_date::text` and uses the string directly; re-observed exact countdowns in E03 and E05 |

Two earlier defects were fixed before this pass and are recorded in the completion report section 7: the exam list's duplicated imports and dead state left by an interrupted edit, and a corrupted render block in the same file.

## E11 DEFINITION-OF-DONE check

Milestone level, [DEFINITION-OF-DONE.md](../07-roadmap/DEFINITION-OF-DONE.md) section 2:

| Item | Result |
|---|---|
| All acceptance criteria ids listed for the milestone pass | PARTIAL. AC-FR-120-* to AC-FR-125-* and AC-E2E-08 are proved in E03, E05 and E06. AC-FR-126-* (readiness score), AC-FR-127-* (topic weight in readiness) and AC-FR-128-* (readiness label) need the Phase 2 readiness feature (P2-05), which M04 deliberately does not ship, so they cannot pass yet and are left unchecked |
| Every FR in scope has implemented behavior | PASS for FR-120..FR-125 as the M04 card scopes them; no stub, placeholder, mock or `TODO` exists in `src/modules/exams`, the four routes, the two pages or their forms |
| Typecheck, lint and boundary check pass | PASS, E01 |
| Unit and integration tests pass | PASS, E02 (76 unit) and E03 (59 integration) |
| Every new table has a purge handler and an export contributor | PASS, E08 |
| Ownership contract applied to the new resources | PASS, E03: `expectHiddenFromOtherUser` covers the exam read, edit and checklist routes |
| Migration applies on an empty database | PASS: `0004_exams_and_checklists.sql` applied through `scripts/apply-migrations` when the browser database was created (see the environment table) |
| No horizontal scroll at 360 px; interactive targets meet NFR-087 | PASS, E07 |
| Empty, loading and error states exist | PASS, E05 |
| Browser checks on the milestone's pages | PASS, E05 and E06 |
| Coverage floors met and not lower than before | PARTIAL, measured. E12: `npm run test:coverage` exits 0 and both configured floors pass, the kernel at 94.94% lines and the exams module at 89.93% lines, which M04 added as a threshold. The by-layer floors this row names (domain 90%, application 80%, overall 80%) are neither enforced nor met: overall lines measure 50.12%, because `src/ui/**` and `src/app/**` are exercised by the browser pass rather than the automated tiers. No before value was ever recorded, so "not lower than before" is not claimable |
| Logs carry no secret or personal content | PASS: the M04 job logs `exam.event.failed` with the exam id only |
| axe accessibility run | NOT RUN: no browser-automation dependency is installed in the tree; the same gap M01, M02 and M03 recorded |
| Completion report written | PASS: [M04-COMPLETION-REPORT.md](M04-COMPLETION-REPORT.md) |
| No future-phase behaviour shipped | PASS: no readiness field, no topic weight input, no statistics, plans or sessions route; the production route table in E04 holds none |
| Tag `m04-done` created | NOT DONE: the owner commits and tags, and nothing is committed by me. This row stays unchecked |

## E12 Coverage floors

- Requirement: DEFINITION-OF-DONE section 2 ("Coverage floors met (domain 90%, application 80%, overall 80%) and not lower than before").
- Command: `npm run test:coverage` (`vitest run --coverage`, both projects).

Raw output, the two project rows and the summary:

```
File               | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
-------------------|---------|----------|---------|---------|-------------------
kernel             |   89.75 |     77.5 |   91.56 |   94.94 |
modules/exams      |   87.42 |    87.15 |   91.17 |   89.93 |
-------------------|---------|----------|---------|---------|-------------------
Statements   : 49.19% ( 1499/3047 )
Branches     : 37.51% ( 667/1778 )
Functions    : 46.91% ( 319/680 )
Lines        : 50.12% ( 1384/2761 )
```

Observed: the command exits 0 and prints no threshold error. Both enforced floors pass with room: the kernel at 94.94% lines and 77.5% branches, the exams module at 89.93% lines and 87.15% branches, each measured against `lines: 80, functions: 70, branches: 70, statements: 80`. M04 added the `src/modules/exams/**` threshold in `vitest.config.ts`, which until now enforced only `src/kernel/**` although its own comment promised that each module carries a floor; the module was measured before the threshold was added, so this is a new guard rather than a lowered bar. Inside the module the two low files are `events.ts` and `job.ts`, whose subscriber and scheduled-run branches the integration tier reaches through the container rather than directly.

What is not met is the by-layer set the Definition of Done names: domain 90%, application 80% and overall 80%. Overall lines measure 50.12% because `src/ui/**` and `src/app/**` are covered by the browser pass and by no automated tier, and no per-layer threshold exists to enforce them. That is why the E11 row stays partial with these numbers. It also corrects the answer M03's E11 gave for the same row, which said that no coverage command and no floor check exist in `package.json`: `test:coverage` and the kernel threshold both predate M03, and the correction is recorded here rather than by editing the approved M03 record.

The owner committed the M04 build in this session's tree: `1b96cc9 push exam feature` carries the migration, the module, the four route files, the two pages, the three forms and the kernel, container, worker and UI edits, and `93018cf push exam list` carries the lint cleanup. Left uncommitted in the working tree by me, because the owner commits and tags: this document and [M04-COMPLETION-REPORT.md](M04-COMPLETION-REPORT.md), plus the three code and test files that hold the last three fixes from E10, namely `src/modules/exams/service.ts` (the two `::int` casts, +2 -2), `src/ui/forms/exam-list.tsx` (the arrow-key handler and the loading branch, +22 -1) and `tests/integration/exams.test.ts` (the count regression case, +25 -3). `git status --porcelain` at the end of the pass reported those three files plus the document edits and no other M04 work. No file was staged, committed or tagged by me. The `m04-done` tag does not exist: `git tag -l` returns nothing.
