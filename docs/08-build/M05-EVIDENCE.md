# M05 Evidence

> Status: executed 2026-11-22 on `main`; build work tree `D:/Portofolio/Lumora`. Every command below was run in this session and outputs are pasted as observed. The milestone record is [M05-COMPLETION-REPORT.md](M05-COMPLETION-REPORT.md); the milestone card is [MILESTONES.md](../07-roadmap/MILESTONES.md) M05.

## Rules

- One section per checkpoint. Paste the exact command and the observed output.
- Record runtime, library and database versions.
- State pass or fail against the M05 checklist row. On fail or partial, name the cause and the row that stays unchecked.
- A row with no evidence stays unchecked in [MILESTONES.md](../07-roadmap/MILESTONES.md).
- No secret, token or personal data appears here.

## Checklist status

| M05 completion row | State | Evidence |
|---|---|---|
| Create, edit, delete, missed and list work with warnings requiring confirmation | PASS | E03: PLAN-01..PLAN-06 answer through the integration suite, including both warning refusals and the confirmed replay; E05: the same paths were driven in the browser on A-6, including a two-warning save and an overlap-only save |
| Past entries are read-only (FR-035) | PASS | E03: PLAN-04 answers `past_entry_read_only` and PLAN-06 refuses a future entry with `not_started_yet`; E05: a backdated row renders read only and its menu holds only "Mark as missed" |
| Purge handler and export contributor registered | PASS | E07: `purgeHandlers.keys()` is `["profile", "auth", "exams", "plans", "topics", "subjects"]` and `exportContributors.keys()` is `["profile", "exams", "plans", "subjects", "topics"]`; the plans contributor returns its section with `local_date` as text |
| DEFINITION-OF-DONE.md checked | PARTIAL | E09: every milestone-level item evaluated; the coverage row is partial with the numbers in E10 and the tag row stays unchecked because the owner tags |

## Environment and versions

| Item | Observed value |
|---|---|
| Runner | Windows 10.0.26200, x64 |
| Node.js | v24.13.1 |
| npm | 11.8.0 |
| Repository | `D:/Portofolio/Lumora`, branch `main` |
| Next.js | 16.4.6 |
| React and React DOM | 19.3.1 |
| TypeScript | 6.0.3 |
| vitest | 5.1.1 |
| ESLint | 10.15.0 (flat config, `typescript-eslint` 8.73.0) |
| Tailwind CSS | 4.3.5 |
| pg | 8.23.1 |
| zod | 4.6.7 |
| embedded-postgres | 18.6.0-beta.19 |
| PostgreSQL | 18.6, embedded; the integration suite starts it on a free ephemeral port, the browser run used port 55433 through `.artifacts/pg-dev.ts` with all five migrations applied |
| Browser used for the runtime checks | managed Chromium through the omp browser device, viewport 360, 768, 1280 and 2560 wide |
| Browser account | `plan-check@example.com` with the profile zone `UTC`, created through the signup form; the subject `Algebra` with the topic `Quadratics`, the subject `Physics` with no topic, and the exam `Midterm` on 2026-11-24 |

Host clock is UTC+07. The browser profile zone is UTC, so every date in E05 is the UTC date.

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

Observed: all three stages exit 0 with no diagnostic. The full log is `.artifacts/verify-m05.log`.

## E02 Unit tests

- Command: `npm run test` inside `npm run verify`.
- Raw summary:

```
 Test Files  18 passed (18)
      Tests  95 passed (95)
   Duration  5.03s
```

Observed: 19 of the 95 tests are `tests/unit/plans.test.ts`. They cover the 93-day span bound at 93 and 94 days, the reversed range, an unreal and a malformed date, no plan read when the user has no active subject, the `America/New_York` window `05:00Z-05:00Z` and the rollover-4 window `04:00Z-04:00Z`, the status filter, the create order and insert payload, the warning echo, the exam-date filter (`exam_date < local_date`, so the fake exam date is the day before), the edit/missed/delete check order and the delete event publication.

## E03 Integration tests

- Command: `npm run test:integration` inside `npm run verify`.
- Raw summary:

```
 Test Files  9 passed (9)
      Tests  79 passed (79)
   Duration  144.05s
```

Observed: 20 of the 79 tests are `tests/integration/plans.test.ts`. Against embedded PostgreSQL 18.6 they prove:

| Area | Cases |
|---|---|
| PLAN-01 list | range bounds, subject filter, status filter, a 93-day span accepted and 94 rejected, archived subjects hidden, the range frozen to the profile zone at request time |
| PLAN-02 create | 201 with `Location` and `ETag`, the idempotency replay answering `Idempotent-Replay: true`, an archived subject refused with `subject_archived`, a topic of another subject and an archived topic refused |
| Warnings | the overlap refusal listing the existing entry, touching intervals accepted with no warning, the exam-date refusal naming the exam date, the overlap code first when both apply, an unknown `confirmedWarnings` code rejected |
| PLAN-04 edit | `version_required` without `If-Match`, `stale_version` with the current row, a re-run of the overlap check on save, `past_entry_read_only` once the start has passed |
| PLAN-05 delete, PLAN-06 missed | 204 on delete with the row gone; missed marks only a started entry, an already missed entry answers 200 without a write, `not_started_yet` refuses a future one |
| Ownership | another user's entry is hidden behind `not_found` on read, edit, delete and missed |
| Registries | the purge handler removes the rows and the export contributor returns `local_date` as `YYYY-MM-DD` text |

## E04 Production build

- Command: `npx next build`
- Observed: exit 0, compiled successfully, TypeScript finished with no diagnostics, 46 routes (`45` plus a last `└`), of which 29 are under `/api/app`. The new rows:

```
├ ƒ /api/app/plan-entries
├ ƒ /api/app/plan-entries/[entryId]
├ ƒ /api/app/plan-entries/[entryId]/missed
├ ƒ /plan
```

No static and dynamic sibling conflict. The route table holds no M06 or later route. Log: `.artifacts/build-m05.log` (the run after the two E08 fixes is `.artifacts/build-m05b.log`).

## E05 Browser checks, A-6 Plan

Driven against the production build (`npx next start -p 3000`) on the database at `localhost:55433/lumora_test`.

| Check | Observation |
|---|---|
| Navigation | the header's Calendar item links to `/plan` and marks itself current; the page renders the h1 "Plan" (this link is the deferred A-5 decision, OD-M36) |
| Empty state | filters From `2026-11-22`, To `2026-12-05`, Subject "All subjects", Status "All statuses", the line "No planned sessions" and an "Add plan entry" button |
| Exam warning | an Algebra entry on 2026-11-25 at 10:00 for 60 minutes answers the dialog "Save anyway? / This is after the exam on 24 Nov 2026. / Save anyway / Change time" (AC-FR-038-1) |
| Change time | reopening through "Change time" restores subject, topic, date, time and duration, so the warning is recoverable without retyping (AC-FR-034-4) |
| Two warnings, one confirm | a second entry at 10:30 for 30 minutes lists "This overlaps Algebra at 10:00." and "This is after the exam on 24 Nov 2026." behind one Save anyway |
| Day group | the header reads "Wednesday 25 November · 90 min planned" after both saves, so the group sums the day |
| Overlap only | on Physics, which has no exam, the entry 14:00-15:00 saved with no dialog and 14:30-15:00 raised "This overlaps Physics at 14:00." alone |
| Touching intervals | the Physics entry 15:00-15:30 saved with no dialog although it touches both existing intervals (AC-FR-034-3) |
| Decline | after "Change time" and Cancel, the list was unchanged and no row had been written (AC-FR-034-4) |
| Edit | the row menu's Edit opens "Edit plan entry" prefilled with 25 Nov 14:30 and 30 minutes; saving 90 minutes raises the overlap refusal and saves on confirmation (AC-FR-031-1) |
| Delete | the row menu's Delete opens "Delete this entry? / The planned time is removed. Sessions already recorded stay and still count. / Delete / Cancel"; confirming removes the row |
| Subject filter | selecting Physics leaves its three rows and the group header "Wednesday 25 November · 120 min planned" (AC-FR-037-1) |
| Status filter | Missed shows the marked row alone, Upcoming shows the future rows, Done shows the empty state (AC-FR-037-2) |
| Date filter | From `2026-11-25` leaves the Wednesday group; From `2026-11-22` to `2026-11-23` leaves the Sunday row; each change issues one `GET /api/app/plan-entries` with the expected query |
| Clear filters | with Status Done the state reads "No planned sessions match these filters" and offers "Clear filters"; the action resets the select to "All statuses" and restores both rows (AC-FR-037-3) |
| Past entry | a row backdated to three hours ago through SQL renders "10:52 · 30 min planned · Read only", its menu holds "Mark as missed" only, with no Edit and no Delete (FR-035, AC-FR-035-1, AC-FR-035-3) |
| Mark missed | the action flips the row to "Missed", removes the Read-only suffix and the Actions button, and the `status=missed` filter finds it (AC-FR-033-1) |
| Loading | with the list request delayed by four seconds, the region shows `aria-busy="true"`, five skeleton rows and the screen-reader text "Loading plan entries" |
| Error and retry | with the list request aborted, the panel reads "Could not load planned sessions / We could not reach the server. Check your connection and try again. / Try again"; the action reloads both rows |
| Keyboard | Tab reaches the Actions button, Enter opens the menu, Tab moves to Edit and then Delete, and tabbing out closes the menu |
| Dialog keyboard | the dialog opens with focus on the Subject select, Tab runs through the five fields to Save and Cancel and wraps to the select, and Escape closes it |
| Dialog sheet | at 360 px the dialog fills the viewport (see E06) |

One behaviour is recorded rather than fixed: Escape does not close the row menu. The menu closes on focus leaving it, which is how the M02 and M03 list menus behave, and changing it would introduce a second convention for one list; it is named in the completion report's known limitations.

## E06 Responsive and sheet measurements

`document.documentElement.scrollWidth` against `window.innerWidth` on `/plan`, plus a scan for any element past either viewport edge:

| Viewport width | `scrollWidth` | Elements past the edge |
|---|---|---|
| 360 | 360 | none |
| 768 | 768 | none |
| 1280 | 1280 | none |
| 2560 | 2560 | none |

The add dialog, measured through `getBoundingClientRect()` at a 720 px viewport height:

| Viewport width | Dialog box | Note |
|---|---|---|
| 360 | x 0, y 0, 360 × 720 | full-height sheet, the `max-sm:` set on `PlanDialog` |
| 768 | x 144, y 121, 480 × 478 | centred card, `w-[min(30rem,calc(100vw-2rem))]` |
| 1280 | x 400, y 121, 480 × 478 | centred card |

The row menu at 360 px sits at x 139 to 331, inside the 360 px viewport, so it is not clipped.

## E07 Registry contributions

From `tests/integration/profile.test.ts`:

```
expect(purgeHandlers.keys()).toEqual(["profile", "auth", "exams", "plans", "topics", "subjects"]);
expect(exportContributors.keys()).toEqual(["profile", "exams", "plans", "subjects", "topics"]);
```

Observed: the plans purge handler sits before `topics`, because a `plan_entries` row references both `subjects` and `topics` and the child must go first. The export contributor returns `section: "plans"` with the raw snake_case columns, and `local_date` is selected as text, the defect and fix recorded in E08.

## E08 Defects found and fixed during this pass

| Defect | Evidence before | Fix and re-observation |
|---|---|---|
| A Postgres `date` was shifted by the host offset on export | the plans export answered `"local_date": "2026-11-22T17:00:00.000Z"` for a row whose `local_date` is `2026-11-23`, because `pg` returns `date` as a `Date` at local midnight and the host is UTC+07 | `exportPlans` and `exportExams` now select `local_date::text` and `e.exam_date::text`; the M04 test gained an assertion that the exams export ships `exam_date` as `YYYY-MM-DD` text, and the plans contributor is asserted the same way |
| AC-FR-037-3 had no clear-filter action | a filtered list that matched nothing read "No planned sessions" and offered only "Add plan entry", so no action cleared the filters | the empty branch now distinguishes a filtered result ("No planned sessions match these filters") and renders a secondary "Clear filters" button that resets the date range, the subject and the status; re-observed in E05, including the reset select value |
| The mobile sheet stopped 38 px short of the viewport | at 360 × 720 the dialog measured 682 px high at y 0, because the user-agent `max-height` for `dialog` capped `max-sm:h-dvh` | `PlanDialog` gained `max-sm:max-h-dvh max-sm:overflow-y-auto`; re-measured at 360 × 720 exactly |

No defect was found in the plans service, the three routes or the database constraints after the above; the API behaviour in E03 was written and green before this pass.

## E09 DEFINITION-OF-DONE check

Milestone level, [DEFINITION-OF-DONE.md](../07-roadmap/DEFINITION-OF-DONE.md) section 2:

| Item | Result |
|---|---|
| All acceptance criteria ids listed for the milestone pass | PASS for AC-FR-030-1..4, AC-FR-031-1..3, AC-FR-032-1..3, AC-FR-033-1..3, AC-FR-034-1..4, AC-FR-035-1..3, AC-FR-037-1..3 and AC-FR-038-1..3, proved in E03 and E05. AC-FR-036-* is not this milestone's: B-07 moved it to M06 with the session links it needs |
| Every FR in scope has implemented behavior | PASS for FR-030..FR-035, FR-037 and FR-038 as the M05 card scopes them; no stub, placeholder, mock or `TODO` exists in `src/modules/plans`, the three routes, `/plan` or its two forms |
| Typecheck, lint and boundary check pass | PASS, E01 |
| Unit and integration tests pass | PASS, E02 (95 unit) and E03 (79 integration) |
| Every new table has a purge handler and an export contributor | PASS, E07 |
| Ownership contract applied to the new resources | PASS, E03: another user's entry is `not_found` on read, edit, delete and missed |
| Migration applies on an empty database | PASS: `0005_plan_entries.sql` applied through `scripts/apply-migrations` when the browser database was created (see the environment table) |
| No horizontal scroll at 360 px; interactive targets meet NFR-087 | PASS, E06 for the scroll and the sheet; the controls reuse the shared Button and field components measured in M02 and M03 |
| Empty, loading and error states exist | PASS, E05 |
| Browser checks on the milestone's pages | PASS, E05 and E06 on the production build |
| Coverage floors met and not lower than before | PARTIAL, measured. E10: `npm run test:coverage` exits 0 and all three configured floors pass. The by-layer floors this row names (domain 90%, application 80%, overall 80%) are neither enforced nor met, because `src/ui/**` and `src/app/**` are exercised by the browser pass rather than the automated tiers |
| Logs carry no secret or personal content | PASS: the M05 code logs no payload; the plans writes log through the shared idempotency and event paths that M02 and M04 reviewed |
| axe accessibility run | NOT RUN: no browser-automation dependency is installed in the tree; the same gap M01 to M04 recorded |
| Completion report written | PASS: [M05-COMPLETION-REPORT.md](M05-COMPLETION-REPORT.md) |
| No future-phase behaviour shipped | PASS: no actual or variance field, no session link, no `done` status, no generator, no calendar or to-do route; the route table in E04 holds none |
| Tag `m05-done` created | NOT DONE: the owner tags. The build is committed (`900a90b`, `1931a0b`, `51958f1`, `aff79f9`) and no tag exists, so this row stays unchecked |

## E10 Coverage floors

- Requirement: DEFINITION-OF-DONE section 2 ("Coverage floors met (domain 90%, application 80%, overall 80%) and not lower than before").
- Command: `npm run test:coverage` (`vitest run --coverage`, both projects).

Raw output, the module rows and the summary:

```
All files          |   49.11 |    37.23 |   46.57 |   49.96 |
 kernel            |   89.75 |     77.5 |   91.56 |   94.94 |
 modules/exams     |    87.5 |    86.72 |   91.42 |   90.41 |
 modules/plans     |    95.3 |    88.98 |     100 |   94.57 |
 modules/profile   |   91.66 |    78.68 |     100 |   96.05 |
 modules/subjects  |   85.59 |    79.45 |   90.47 |   86.11 |
 modules/topics    |   90.25 |    83.87 |     100 |   92.25 |
-------------------|---------|----------|---------|---------|
Statements   : 49.11% ( 1728/3518 )
Branches     : 37.23% ( 789/2119 )
Functions    : 46.57% ( 367/788 )
Lines        : 49.96% ( 1588/3178 )
```

Observed: exit 0, 27 test files and 174 tests, no threshold error, 250.68 s. All three enforced floors pass with room, each measured against `lines: 80, functions: 70, branches: 70, statements: 80`: the kernel at 94.94% lines and 77.5% branches, the exams module at 90.41% lines and 86.72% branches, and the plans module at 94.57% lines and 88.98% branches. The plans floor is new in this milestone; inside the module the only weak file is `events.ts` at 71.42%, whose subscriber path no consumer reaches until M06.

The exams module moved from 89.93% to 90.41% lines because the export assertion E08 added exercises its contributor, and the kernel is unchanged at 94.94%. The overall figure fell from 50.12% to 49.96% lines, not because less is covered but because the denominator grew faster than the numerator: lines went from 1384 of 2761 to 1588 of 3178, so 204 more lines are covered and the executable denominator grew by 417, dominated by `plan-list.tsx` and `plan-dialog.tsx`, which only the browser pass exercises. That is the same by-layer gap M04 recorded, so the Definition of Done row stays partial: domain 90%, application 80% and overall 80% are named by the document and no threshold enforces them.

## E11 Working tree

The M05 build is committed by the owner: `900a90b push profile` carries `0005_plan_entries.sql`, the three route files, `src/kernel/{config,errors}.ts` and the exams `upcomingExamsBySubject` lookup; `1931a0b push ui modules` carries `src/modules/plans/{service,events,public}.ts`, `/plan`, the two forms, the container and request-context registrations, the UI copy, the nav entry, `tests/unit/plans.test.ts`, `tests/integration/plans.test.ts`, the harness block in `tests/integration/support/api.ts` and the coverage floor in `vitest.config.ts`; `51958f1 update architecture` carries the ERROR-HANDLING edit.

The two E08 UI fixes and every document in this milestone were left uncommitted in the working tree by me, because the owner commits and tags. The owner then committed them in `aff79f9 update ui forms` (2026-11-22 21:16), which carries `src/ui/forms/plan-list.tsx` with the filter defaults and the clear-filters branch, `src/ui/forms/plan-dialog.tsx` with the mobile sheet height, and the M05 documents. `git status` is clean at that commit, no milestone tag exists, and the `m05-done` tag is the only step left to the owner.