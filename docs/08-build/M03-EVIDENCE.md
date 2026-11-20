# M03 Evidence

> Status: executed 2026-11-21 on `main` at `69a8d39` plus the uncommitted work listed at the end; build work tree `D:/Portofolio/Lumora`. Every command below was run in this session and outputs are pasted as observed. The milestone record is [M03-COMPLETION-REPORT.md](M03-COMPLETION-REPORT.md); the milestone card is [MILESTONES.md](../07-roadmap/MILESTONES.md) M03.

## Rules

- One section per checkpoint. Paste the exact command and the observed output.
- Record runtime, library and database versions.
- State pass or fail against the M03 checklist row. On fail or partial, name the cause and the row that stays unchecked.
- A row with no evidence stays unchecked in [MILESTONES.md](../07-roadmap/MILESTONES.md).
- No secret, token or personal data appears here.

## Checklist status

| M03 completion row | State | Evidence |
|---|---|---|
| All SUBJ and TOP endpoints implemented with documented error codes | PASS | E03, E04: SUBJ-01..07 and TOP-01..08 answer through the integration suite and appear in the production route table; every code they answer is listed in the E03 table and catalogued in ERROR-HANDLING section 4 |
| Keyboard equivalent for reorder | PASS | E05, E06: subject rows and topic rows were reordered with keyboard input only (focus the row's Actions button, Enter, Move up or Move down) |
| Empty, loading and error states on A-7, A-8 | PASS | E05, E06: empty ("No subjects yet", "No archived subjects", "No topics yet"), loading (5 skeleton rows, `aria-busy`, "Loading subjects" / "Loading topics") and error (panel with the failure body, Retry, request id) were observed in the browser |
| Purge handler and export contributor registered | PASS | E08: `purgeHandlers.keys()` is `["profile", "auth", "topics", "subjects"]` and `exportContributors.keys()` is `["profile", "subjects", "topics"]`; both M03 handlers run in registration order and remove child rows before parents |
| DEFINITION-OF-DONE.md checked | PARTIAL | E11: every milestone-level item evaluated; the ones that need an input M03 does not have are named there and nothing was ticked on their behalf |

## Environment and versions

| Item | Observed value |
|---|---|
| Runner | Windows 10.0.26200, x64 |
| Node.js | v24.13.1 |
| npm | 11.8.0 |
| Repository | `D:/Portofolio/Lumora`, branch `main`, head `69a8d39`, no commit made by me |
| Next.js | 16.4.6 |
| React and React DOM | 19.3.1 |
| TypeScript | 6.0.3 |
| vitest | 5.1.1 |
| ESLint | 10.15.0 (flat config, `typescript-eslint` 8.73.0) |
| Tailwind CSS | 4.3.5 |
| pg | 8.23.1 |
| zod | 4.6.7 |
| embedded-postgres | 18.6.0-beta.19 |
| PostgreSQL | 18.6, embedded; the integration suite starts it on a free ephemeral port, the browser run used port 55433 through `.artifacts/pg-dev.ts` |
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

Observed: typecheck exits 0 with no diagnostics, `eslint .` exits 0 with no output, the boundary check passes. The boundary check is the one that proves Topics only reaches Subjects through `src/modules/subjects/public.ts` and that no UI file imports a module service.

## E02 Unit tests

- Requirement: TESTING-STRATEGY section 11; MILESTONES M03 test list ("unit (ordering, weights, archive rules, BR-029)").
- Command: `npm run verify` stage 4.

Raw output:

```
> lumora@0.1.0 test
> vitest run --project unit

 Test Files  16 passed (16)
      Tests  69 passed (69)
   Start at  01:59:22
   Duration  4.95s (import 84%, tests 12%, transform 3%, worker 1%)
```

M03 coverage inside that run:

| Test file | What it proves |
|---|---|
| `tests/unit/subjects-topics.test.ts` (7 cases) | the palette is exactly the ten documented keys with their labels in COLOR-TYPOGRAPHY order, `isSubjectColor` accepts only those keys, bulk normalisation trims, drops blanks, reports duplicates and flags a line over 150 characters, weight 1..5 bounds, the three topic statuses |
| `tests/unit/idempotency.test.ts` (7 cases) | reserve, commit and release of an `Idempotency-Key`; a replay returns the stored response; a different payload on the same key answers `idempotency_key_reused`; a live reservation answers `request_in_progress`; an abandoned reservation is reclaimed after `idempotency.reservationSeconds` |

The ordering and archive rules of the two tables are proved end to end in E03, because they are SQL behaviour (position allocation, the partial unique index, the archive guard) rather than pure functions.

## E03 Integration tests

- Requirement: TESTING-STRATEGY section 11; NFR-016 (ownership contract); NFR-053 and NFR-094 (idempotency, optimistic concurrency).
- Command: `npm run verify` stage 5, plus the two M03 files run alone for their names and counts.

Raw output of the M03 files alone:

```
$ npx vitest run --project integration tests/integration/subjects.test.ts
 Test Files  1 passed (1)
      Tests  11 passed (11)

$ npx vitest run --project integration tests/integration/topics.test.ts
 Test Files  1 passed (1)
      Tests  9 passed (9)
```

Raw output of the whole integration stage, 2026-11-21 01:59:

```
> vitest run --project integration

[02:00:27] INFO: job.ran
    job: "auth_cleanup"
    result: { "sessions": 1, "resetTokens": 1, "auditEvents": 0 }

 Test Files  7 passed (7)
      Tests  47 passed (47)
   Duration  132.69s (tests 87%, import 13%)
```

The two suites and what each case proves:

| Suite | Case | Behaviour proved | Requirement |
|---|---|---|---|
| subjects | creates subjects last in the order and lists them with their topic counts | 201, `Location`, `ETag: "1"`, `position 0` then 1, `topicCount` and `doneTopicCount` on the list | FR-010, FR-011, AC-FR-010-1 |
| subjects | rejects a name that is empty, too long, or already used by an active subject | 400 `validation_failed`, then 409 `name_conflict` with the clashing `conflictingId`; a case-only difference still clashes | AC-FR-010-2, AC-FR-010-3 |
| subjects | edits name and colour under If-Match and reloads on a stale version | 200 with a bumped `ETag`, 400 `version_required` without the header, 409 `stale_version` with `details.current` | FR-011, EC-020, NFR-094 |
| subjects | renames an archived subject before a conflicting restore | archived subject takes a rename while its colour is locked, then restores | AC-FR-014-3 |
| subjects | reorders only a complete set of active subjects | 200 with positions 0..n in the sent order; a partial set answers 400 with `fields` carrying `path: "subjectIds"` and `rule: "full_set"`; the previous order is intact after a failure | FR-012, AC-FR-012-1, AC-FR-012-2 |
| subjects | archives a subject, keeps it out of the active list and restores it last | 200 with `archivedAt`, absent from the default list, present with `includeArchived=true`, readable by id while archived, restore appends at the end; archiving twice is a no-op on `version` | FR-013, FR-014, AC-FR-013-3, AC-FR-014-1, EC-007, EC-008 |
| subjects | blocks an archive while a guard reports a running session | 409 `subject_has_running_session` with `details.timerRunId`, the subject stays active, the same archive succeeds once the guard clears | FR-013, AC-FR-013-2, BR-029 |
| subjects | answers not_found for malformed, unknown and foreign ids | 404 `not_found` for a non-uuid and an unknown uuid, and for every read and write another user attempts through `expectHiddenFromOtherUser` | NFR-016 |
| subjects | rejects a non-boolean includeArchived | 400 `validation_failed` | NFR-053 |
| subjects | purges topics before subjects and exports both | both export contributors return their section, both purge handlers run and leave no rows | NFR-031, FR-130 |
| topics | creates topics last in order with the documented defaults | 201, `ETag: "1"`, weight 1, status `not_started`, position appended | FR-015, AC-FR-015-1 |
| topics | rejects names, weights and statuses outside the documented rules | 400 `validation_failed` for 151 characters, weight 0, 6 and 2.5, status `later`, and an empty patch | FR-015, FR-016 |
| topics | edits name, weight and status, publishing the status change once | 200 with a bumped `ETag`; exactly one `TopicStatusChanged` with `previousStatus` and `status`; 409 `stale_version` carries the current row; 400 `version_required` without If-Match | FR-016, NFR-094 |
| topics | reorders only a complete set of active topics | same shape as the subject reorder; the previous order survives a rejected call | FR-016, AC-FR-012-2 |
| topics | archives a topic, keeps it readable, and restores it with its state | 200 with `archivedAt`, one `TopicArchived` event, hidden from the default list, readable by id, second archive is a no-op, restore keeps weight and status | FR-018, FR-019, EC-008 |
| topics | previews a paste, then saves it in input order | dry run reports `valid`, `duplicates` and `tooLong`; a save carrying a long line answers 400 and creates nothing; the clean save is 201 with `Location` and the replay of the same `Idempotency-Key` answers `Idempotent-Replay: true` without creating a second set; a save without the header answers 400 `idempotency_key_required` | FR-017, AC-FR-017-1, AC-FR-017-3, NFR-053 |
| topics | caps a paste at 200 non-blank lines | 400 `input_too_large` with `{ limit: 200, actual: 201 }`; 400 input lines of which 200 are non-blank save 200 topics | AC-FR-017-2 |
| topics | refuses new topics and pastes on an archived subject | 409 `subject_archived` for TOP-02 and TOP-03 while the archived subject still lists and edits its topics | FR-013, EC-008 |
| topics | answers not_found for malformed, unknown and foreign ids | 404 for a non-uuid and an unknown uuid, and for every read and write another user attempts | NFR-016 |

Error codes answered by the M03 routes, as observed in that run: `validation_failed`, `version_required`, `idempotency_key_required`, `not_found`, `stale_version`, `name_conflict`, `subject_archived`, `subject_has_running_session`, `input_too_large`, `unauthenticated`. Each one is in the [ERROR-HANDLING.md](../03-architecture/ERROR-HANDLING.md) section 4 catalog, which this milestone extended with `name_conflict`, `subject_archived`, `idempotency_key_reused`, `request_in_progress`, `version_required`, `idempotency_key_required` and `csrf_rejected`.

The ownership contract itself is one helper, `expectHiddenFromOtherUser` in `tests/integration/support/ownership.ts`, extended in M03 with a `headers` field so a write under `If-Match` reaches the ownership check instead of failing on `version_required` first. It is used by nine M03 cases (five subjects, four topics) and by the M02 sign-in cases.

## E04 Production build

- Requirement: DEPLOYMENT-ARCHITECTURE section 4 stage 6; the milestone deliverable is a buildable route inventory.
- Command: `npx next build`.

Raw output, head and route table:

```
▲ Next.js 16.4.6 (Turbopack)
- Environments: .env.local
✓ Running next.config.ts took 51ms

  Creating an optimized production build ...
✓ Compiled successfully in 5.8s
  Running TypeScript ...
  Finished TypeScript in 12.7s ...
  Collecting page data using 7 workers ...
✓ Generating static pages using 7 workers (26/26) in 1139ms

Route (app)
┌ ƒ /
├ ƒ /_not-found
...
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
...
├ ƒ /subjects
├ ƒ /subjects/[subjectId]
└ ƒ /unsupported-browser
```

Observed: no warning, no lint error, no type error, `ƒ (Dynamic) server-rendered on demand` for every route. The table holds 37 routes, 22 of them under `/api/app`, 11 of which M03 adds, plus the two pages `/subjects` and `/subjects/[subjectId]`. The static/dynamic sibling pair `/api/app/subjects/order` and `/api/app/subjects/[subjectId]` compiles without a conflict, which was the reason this check was on the list.

## E05 Browser checks, A-7 Subjects

- Requirement: PAGE-SPECIFICATIONS A-7; NFR-040, NFR-042; the milestone row "Empty, loading and error states on A-7, A-8".
- Method: the managed Chromium tab driven through the omp browser device against `npm run dev` on `http://localhost:3000`, with a seeded account (three subjects; topics only on the first).

Observed, in the order the checks ran:

| Check | Observed value |
|---|---|
| Row rendering | three rows, each with the name, the topic count and an Actions button: Mathematics with "4 topics, 0 done", Physics with "0 topics, 0 done", Literature with "0 topics, 0 done" |
| Tabs | `Active` selected, `Archived` not, both 44 px tall |
| Add-subject dialog | opens with `role="dialog"`, title "Add subject", focus lands in the name field, Escape closes it; the colour picker is a radio group of exactly ten swatches with the visible names Teal, Red, Blue, Brown, Violet, Green, Plum, Slate, Rust, Cyan, in the COLOR-TYPOGRAPHY section 6 order, Teal preselected |
| Creating from the dialog | "Chemistry" with the Green swatch returns 201 and the row appears with `0 topics, 0 done` |
| Duplicate name | a second dialog submitted with "chemistry" stays open, marks the field `aria-invalid="true"`, points `aria-describedby` at `#subject-name-error` and prints "An active subject already uses that name. Choose another one." |
| Keyboard reorder | focus `button[aria-label="Actions for Mathematics"]`, Enter opens the menu, Move down moves it; the row order became Physics, Mathematics, Literature, and Chemistry was created afterwards |
| Archive | the confirm dialog reads "Archive Mathematics? ... Archive subject / Cancel"; confirming removes the row from Active |
| Archived tab | lists the archived subject with the menu limited to Edit and Restore; Restore returns it to the Active list; the empty archived tab reads "No archived subjects" |
| Empty state | with all subjects archived the Active tab reads "No subjects yet" and offers "Add subject" |
| Loading state | with the list request delayed 2.5 s the page renders 5 skeleton rows inside an `aria-busy="true"` region and the text "Loading subjects" |
| Error state | with the list request answered 500 the page renders "We could not load your subjects" with the failure body "Something went wrong on our side. Try again.", a Retry button and "Request ID req-test"; Retry after the fault cleared loaded the four rows again |
| Colour dot | 12 x 12 px, `aria-hidden="true"`, background `rgb(141, 184, 230)` = `#8DB8E6` = the documented dark Blue token |
| Action buttons | each row's button is named `Actions for <subject>`; four identical "Actions" buttons existed before E10 fixed the component |

## E06 Browser checks, A-8 Subject workspace

- Requirement: PAGE-SPECIFICATIONS A-8; NFR-042, NFR-094; AC-FR-016-*.

| Check | Observed value |
|---|---|
| Page metadata and header | `document.title` "Mathematics · Lumora", `<h1>` "Mathematics", breadcrumb "Subjects / Mathematics", buttons "Edit subject" and "Archive subject" |
| Topic rows | name, `Weight 5` chip, a status select named "Status for Kinematics", and an Actions button per row |
| Status change | selecting Done through the select updates the Summary aside to "Topics 4 ... Done 1" and the value survives a reload |
| Topic edit dialog | opens from Actions, Edit; changing the name to "Kinematics of a point" and the weight to 4 returns 200 and the row shows the new name and chip |
| Keyboard reorder | focus `button[aria-label="Actions for Kinematics"]`, Enter, Move up moved it above the first row; nothing but keyboard input was used |
| Topic archive | the confirm dialog reads "Archive Optics? ... Archive topic / Cancel"; after confirming, the row leaves the list, the Summary shows "Topics 5 ... Archived 1" and a collapsed `<details>` appears with the summary "Archived topics (1)" holding "Optics, Weight 1, Restore" |
| Topic restore | Restore inside the details section closes it and returns the topic to the active list |
| Paste preview | for `Kinematics, Projectiles, Projectiles, (blank), (spaces), z*151` the dry run renders `New (1) Projectiles`, `Already there (2) Kinematics, Projectiles`, `Too long (1)` with "Shorten these to 150 characters or fewer, then preview again." and the save button is disabled |
| Paste save | for two new lines the button reads `Add 2 topics`, the save returns 201, the status region reads "Added 2 topics", both rows appear last and the Summary count rises to 6 |
| Paste cap | 201 lines answer the alert "You pasted 201 lines. One paste holds up to 200." and the button reads `Save`, disabled |
| Save button states | disabled with no preview, enabled after a clean preview, disabled again while a line is too long |
| Archived subject | the header switches to "Restore subject", the banner reads "This subject is archived. Its topics stay readable and read only until you restore it.", "Paste a list" and the New-topic form are gone, every row Actions button and every status select is disabled; restoring all four subjects through the API returned them to Active |

## E07 Responsive and target-size measurements

- Requirement: NFR-087 (44 x 44 px hit area under 1024 px, 40 px controls on fine-pointer desktop); NFR-040; the DoD item "no horizontal scroll at 360 px".
- Method: for each width, `document.documentElement.scrollWidth` against `window.innerWidth`, plus every visible `a[href], button, input, select, textarea, summary` measured with `getBoundingClientRect`.

| Page | Width | `scrollWidth` | Horizontal overflow | Interactive targets | Targets under 44 x 44 |
|---|---|---|---|---|---|
| A-7 | 360 | 360 | no | 16 | 1: the skip link, 1 x 1 px until focused |
| A-7 | 768 | 768 | no | 16 | 1: the skip link |
| A-7 | 1280 | 1280 | no | 16 | 1: the skip link |
| A-7 | 2560 | 2560 | no | 16 | 1: the skip link |
| A-8 | 360 | 360 | no | 23 | 1: the skip link |
| A-8 | 768 | 768 | no | 23 | 1: the skip link |
| A-8 | 1280 | 1280 | no | 23 | 1: the skip link |
| A-8 | 2560 | 2560 | no | 23 | 1: the skip link |

No element crossed the viewport edge at any width (the overflowing list was empty for all eight measurements). The skip link is the documented "Skip to main content" element hidden until focus; focused it measures 180 x 44 px, so it satisfies the rule the moment it is reachable. The header navigation links measured 44 px high, and no target on either page is between 24 and 44 px.

The first measurement of A-8 was a failure and is worth recording: the breadcrumb link measured 101 x 18 px and the desktop breadcrumb link 51 x 18 px, both under the 44 px rule for narrow viewports. E10 records the fix.

## E08 Registry contributions

- Requirement: NFR-031, BR-032, FR-130, EC-019, EC-027.
- Proof: `tests/integration/subjects.test.ts` "purges topics before subjects and exports both".

Observed through the containers registries:

```
purgeHandlers.keys()      = ["profile", "auth", "topics", "subjects"]
exportContributors.keys() = ["profile", "subjects", "topics"]
```

Both export contributors were called and returned `{ section: "subjects", rows: [1 row] }` and `{ section: "topics", rows: [1 row] }`. Every purge handler was then run and left `SELECT id FROM topics WHERE user_id = $1` and the same query on `subjects` empty.

Registration order is the purge order and it is deliberate: Topics registers before Subjects because the composite foreign key `fk_topics_subject_user` is `ON DELETE NO ACTION`, so deleting a subject before its topics would be blocked. The comment in `registerContributions` states that reason and the test asserts the last two handler keys are `["topics", "subjects"]`.

## E09 Archive guard contract

- Requirement: EC-007, BR-029, MODULE-BOUNDARIES section 3.
- Proof: `tests/integration/subjects.test.ts` "blocks an archive while a guard reports a running session", plus the wording recorded in MODULE-BOUNDARIES section 3.

The integration suite registers `integration-test-timer`, which blocks exactly one subject id and returns `{ blocked: true, details: { timerRunId: "run-integration-1" } }`. With that guard in place the archive answered 409 `subject_has_running_session` with `details.timerRunId` and the subject stayed in the list; after clearing the guard the identical request answered 200. A verdict of `{ blocked: false }`, and the absence of any registered guard, both let the archive proceed, which is the documented default while M05 has not registered the real timer check.

## E10 Defects found and fixed during this pass

The browser pass found five defects in code written earlier in this milestone; each was fixed and re-observed, and the fixes are part of the uncommitted work listed below.

| Defect | Evidence before | Fix and re-observation |
|---|---|---|
| Every row menu button was named "Actions" | `$$eval("button", …)` showed `["Sign out","Active","Archived","Add subject","Actions","Actions","Actions","Actions"]` and no `aria-label` in the DOM | `Button` now forwards `ariaLabel`; re-observed `Actions for Mathematics`, `Actions for Physics`, ... on A-7 and per topic on A-8 |
| `Button` dropped `disabled` | the paste dialog's save button reported `disabled: false` with no preview, and `blocked` was true in the source | attribute restored; re-observed disabled with no preview, disabled while a line is too long, enabled after a clean preview |
| A-8 breadcrumb and back links were 18 px high | E07 first measurement: 51 x 18 and 101 x 18 px | both links now carry `inline-flex min-h-11 items-center`; re-measured, only the focused-when-needed skip link is under 44 px |
| An archived subject's status selects stayed editable while the banner said read-only | 6 selects reported `disabled: false` on `/subjects/{archived id}` | `SelectInput` gained `disabled` and the status select uses it; re-observed all six disabled on an archived subject |
| Arrow keys changed the subject tab without moving focus | after ArrowRight the selected tab was Archived while `document.activeElement` stayed Active, so a second ArrowRight did nothing | focus now follows the selection; re-observed both directions with `aria-selected` and focus agreeing |

Two earlier defects in the same milestone were fixed before this pass and are recorded in the completion report: `createSubject` answered 500 instead of 409 on a duplicate name because it re-queried inside the aborted transaction, and the paste dialog matched an error code of `fields` that no longer exists.

## E11 DEFINITION-OF-DONE check

Milestone level, [DEFINITION-OF-DONE.md](../07-roadmap/DEFINITION-OF-DONE.md) section 2:

| Item | Result |
|---|---|
| All acceptance criteria ids listed for the milestone pass | PARTIAL. The subject side of AC-E2E-10 (create a subject, add topics, archive it) is proved in E03 and E05. In the AC-FR-010..019 set, the criteria that need a feature M03 does not ship cannot pass yet: AC-FR-013-1 (40 sessions stay in statistics) needs sessions (M05/M06), AC-FR-014-2 (hidden plan entries and to-dos reappear) needs plans and to-dos (M08/M09), and the picker half of AC-FR-013-3 needs a picker, which first exists in M05. Everything else in the set is covered by E03 |
| Every FR in scope has implemented behavior | PASS for FR-010..FR-019 as the M03 card scopes them; no stub, placeholder, mock or `TODO` exists in `src/modules/subjects`, `src/modules/topics`, the eleven routes, the two pages or their forms |
| Tests per TESTING-STRATEGY section 11 are written and green | PASS for unit, integration and the ownership contract helper; the axe item is a documented deviation (no browser-automation dependency is installed, the same gap M01 and M02 recorded) |
| Typecheck, lint and boundary check pass | PASS, E01 |
| Coverage floors met and not lower than before | NOT MEASURED. `@vitest/coverage-v8` is installed but no coverage command and no floor check exists in `package.json`, so there is no before value to compare against. Recorded as an open item rather than claimed |
| An ownership contract test exists for each new resource | PASS, E03 |
| A purge handler and an export contributor are registered for each new user-data table | PASS, E08 |
| Idempotency and concurrency requirements from the endpoint specs are verified | PASS, E03 (replay, `idempotency_key_required`, `idempotency_key_reused` in unit tests, `request_in_progress` reservation) |
| Migrations apply from an empty database and from the previous schema | PASS: the integration suite applies `0001`, `0002`, `0003` in filename order against a fresh embedded cluster before every run, and the browser run applied the same three to a new cluster through `scripts/apply-migrations.ts` |
| Accessibility: axe zero serious or critical; manual keyboard pass; no horizontal scroll at 360 px | PARTIAL: the keyboard pass and the 360 px measurement pass (E05, E06, E07); axe cannot run in this tree |
| Error, empty and loading states from PAGE-SPECIFICATIONS are implemented | PASS, E05 and E06 |
| Structured logs carry no secrets or note content | PASS by inspection of the M03 logging: the routes log request ids and error codes, the events log ids and types, and the new code adds no payload logging. M01's scrubber is unchanged |
| Docs updated: SDD, DATA-DICTIONARY, API-ENDPOINTS, PAGE-SPECIFICATIONS as affected | PARTIAL: ERROR-HANDLING section 4 and MODULE-BOUNDARIES section 3 changed with this milestone, and the M03 documents listed at the end are new. DATA-DICTIONARY, API-ENDPOINTS and PAGE-SPECIFICATIONS already describe both tables and all fifteen endpoints as built, with the two exceptions recorded under Deviations |
| REQUIREMENT-TRACEABILITY updated | Not applicable: the file is a Phase 1 planning document whose header states "Test cases are planned only", and it carries no per-milestone rows. M01 and M02 did not touch it either |
| MILESTONES.md checklist fully checked | PARTIAL by design: four of five rows are checked, `DEFINITION-OF-DONE.md checked` stays partial because of the items above |
| Completion report produced in the Build Mode format | PASS, [M03-COMPLETION-REPORT.md](M03-COMPLETION-REPORT.md) |
| No future-phase feature code is reachable | PASS: M03 adds no Phase 2 or Phase 3 route, table or flag; pointer drag reorder, which PAGE-SPECIFICATIONS lists for A-7 and A-8, is Phase 2 and is absent |
| Tag `m03-done` created | NOT DONE: the owner commits and tags, and nothing is committed by me. This row stays unchecked |

## Deviations

1. **`SubjectListItem` gains two fields on SUBJ-01.** API-SCHEMAS section 5 defines `Subject` without a topic count, and A-7 needs both counts. SUBJ-01 therefore answers rows of `{ ...Subject, topicCount, doneTopicCount }`, the same shape decision M02 made for `ExamListItem`. SUBJ-05 keeps bare `Subject` rows, and the integration schemas assert both shapes.
2. **The archive guard is not registered in production.** `archiveGuards` is empty until M05 registers the real timer check. Archiving therefore proceeds after its own checks, and EC-007's running-session block is proved against a test guard (E09).
3. **No pointer drag reorder.** PAGE-SPECIFICATIONS lists a drag handle for A-7 and A-8. M03 ships Move up and Move down for both, which satisfies NFR-042 and the keyboard half of NFR-041; pointer drag is Phase 2 and the milestone test list asks only for "keyboard reorder".
4. **No axe run.** No browser-automation dependency is installed, the same deviation M01 and M02 recorded. The manual keyboard pass and the measurement in E07 are the substitute.
5. **Topic events are in-process.** `TopicArchived` and `TopicStatusChanged` are delivered to subscribers registered in the same process; no queue is involved. Durable delivery belongs to the Phase 2 readiness job, and the module comment says so.

## Uncommitted work at the end of this checkpoint

`git status` reports the M03 code as untracked or modified and the eight M02 document files as modified. No file was staged, committed or tagged by me. Expected M03 additions: `db/migrations/0003_subjects_and_topics.sql`; `src/modules/subjects/**`, `src/modules/topics/**`; `src/app/api/app/subjects/**`, `src/app/api/app/topics/**`; `src/app/subjects/**`; `src/ui/subject-dot.tsx`, `src/ui/dialog.tsx`, `src/ui/forms/subject-*.tsx`, `src/ui/forms/topic-*.tsx`; `tests/unit/subjects-topics.test.ts`, `tests/integration/subjects.test.ts`, `tests/integration/topics.test.ts`; modifications to `src/kernel/{errors,config,registries,idempotency}.ts`, `src/server/{request-context,container}.ts`, `src/ui/{control,format,messages,nav,api-client}.ts(x)`, `src/ui/forms/feedback.ts`, `src/app/globals.css`, `tests/integration/support/{api,ownership}.ts`.
