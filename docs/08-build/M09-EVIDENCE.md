# M09 Evidence

> Status: executed 2026-11-27 on `main`; build work tree `D:/Portofolio/Lumora`. Every command below was run in this session and outputs are pasted as observed. The milestone record is [M09-COMPLETION-REPORT.md](M09-COMPLETION-REPORT.md); the milestone card is [MILESTONES.md](../07-roadmap/MILESTONES.md) M09.

## Rules

- One section per checkpoint. Paste the exact command and the observed output.
- Record runtime, library and database versions.
- State pass or fail against the M09 checklist row. On fail or partial, name the cause and the row that stays unchecked.
- A row with no evidence stays unchecked in [MILESTONES.md](../07-roadmap/MILESTONES.md).
- No secret, token or personal data appears here.

## Checklist status

| M09 completion row | State | Evidence |
|---|---|---|
| Heatmap and day detail match session data | PASS | E03 pins `bucketOf` and `calendarDay` and the Monday-first 42-slot `monthGrid`; E04 runs 9 integration cases over CAL-01 and CAL-02, including the buckets, the midnight split, the archived label and the plan entries; E06 drove the production build with a real account and two manual sessions and read the 45-minute and 150-minute days from the grid and the panel |
| Keyboard-operable at 360 px and 1280 px | PASS | E06: the grid is a single tab stop with roving focus, the arrows, Home, End, PageUp and PageDown move the selection and focus together at both widths, and the 44 px cells and the panel-below layout hold at 360 |
| No table owned, nothing to purge (documented) | PASS | E07: no calendar key was added to `purgeHandlers` and `exportContributors`; the profile registry test that pins both key lists is unchanged and green in E01 |
| DEFINITION-OF-DONE.md checked | PARTIAL | E08: every milestone-level item is evaluated. Three rows stay partial or open and are the same three M08 records: the by-layer coverage floors (OD-M31, unchanged since M01), the axe and screen-reader half of the accessibility row because no browser-automation dependency is installed in this tree, and the `m09-done` tag, which the owner creates |

## Environment and versions

| Item | Observed value |
|---|---|
| Runner | Windows 10.0.26200, x64 |
| Node.js | v24.13.1 |
| npm | 11.8.0 |
| Repository | `D:/Portofolio/Lumora`, branch `main`. The owner committed the M09 work in three commits during the session (`9c01d9c`, `0b6a8eb`, `1157b6d`); the remaining fixes of this session are uncommitted and nothing here was committed, staged or tagged by me |
| Next.js | 16.4.6 |
| React and React DOM | 19.3.1 |
| TypeScript | 6.0.3 |
| vitest | 5.1.1 |
| ESLint | 10.15.0 (flat config, `typescript-eslint` 8.73.0) |
| Tailwind CSS | 4.3.5 |
| pg | 8.23.1 |
| zod | 4.6.7 |
| embedded-postgres | 18.6.0-beta.19 |
| PostgreSQL | 18.6, embedded. The integration suite starts its own instance on a free ephemeral port; the browser run used port 55433 through `.artifacts/pg-dev.ts` with all nine migrations applied |
| Browser used for the runtime checks | managed Chromium through the omp browser device, viewport 360, 768, 1280 and 2560 wide |
| Browser account | `cal-check-<nonce>@example.com` with the profile zone UTC, created through the signup form; the subject `Algebra` with two manual sessions: 45 minutes on 2026-10-09 and 150 minutes on 2026-10-12 |

Host clock is UTC+07. The browser profile zone is UTC, so every instant in E06 is the UTC instant.

## E01 Typecheck, lint, boundaries and the full suite

- Requirement: the tree proves itself (DEFINITION-OF-DONE section 2) and the M09 card's test row.
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

 Test Files  22 passed (22)
      Tests  143 passed (143)

> lumora@0.1.0 test:integration
> vitest run --project integration

 Test Files  13 passed (13)
      Tests  143 passed (143)
```

- The unit tier went from 21 files / 136 cases to 22 files / 143 cases: `tests/unit/calendar.test.ts` adds 7, the other suites are unchanged. The integration tier went from 12 files / 134 cases to 13 files / 143 cases: `tests/integration/calendar.test.ts` adds 9, the other suites are unchanged.
- One harness fix is folded into this run: the embedded Postgres instance runs with its original options (`databaseDir`, `user`, `password`, `port`, `persistent: false`). A temporary session change that pinned the cluster timezone (`postgresFlags: ["-c", "timezone=UTC"]`) shifted `now()::date` in the plans suite's `backdate` helper by a day relative to the host zone and pushed a missed entry out of its window on the UTC clock; the pin was removed and the plans suite (29 cases including the 9 calendar ones) passes again. The calendar suite does not need a timezone pin: it signs up in UTC and uses fixed 2026-10 dates.

## E02 Production build

- Requirement: the milestone ships in a production build (DEFINITION-OF-DONE section 2).
- Command: `npx next build`.
- Result: exit 0. Output as observed:

```
▲ Next.js 16.4.6 (Turbopack)
- Environments: .env.local
✓ Running next.config.ts took 45ms
✓ Compiled successfully in 1447ms
✓ Generating static pages using 7 workers (46/46) in 1266ms
```

- The route table now holds 65 lines: M08's 62 plus the three M09 routes, `ƒ /api/app/calendar/heatmap`, `ƒ /api/app/calendar/days/[date]` and `ƒ /calendar` (the `[date]` route appears under the dynamic section).
- The build turns the browser checks in E06 into checks against the production server: the same artifacts were served by `npx next start -p 3000`, not by `next dev`.

## E03 Unit tests

- Requirement: the M09 card's test row (`timezone/DST month boundaries; keyboard navigation; grayscale review`).
- Command: `npx vitest run --project unit tests/unit/calendar.test.ts`.
- Result: 1 file passed, 7 tests passed. The suite drives the exported pure helpers with no database.

| Case | What it pins |
|---|---|
| buckets the four ranges of AC-FR-060-1 | `bucketOf` answers `0`, `1_59`, `60_119` and `120_plus` at the boundaries (0, 1, 59, 60, 119, 120, 180) |
| fills a day, today flag | `calendarDay` carries the minutes, the recomputed bucket and `isToday` |
| 2024-07-01 is a Monday | `monthGrid` puts the 1st at index 0 (Monday first, U-D9) |
| November 2026 is a Sunday-start month | the 1st lands at index 6 under the same Monday-first order |
| every month answers 42 slots | the trailing cells are `""` and the count is fixed for a 31-day, a 30-day and a February (non-leap) month |
| 2024 is a leap year | `monthGrid` answers 29 days for February 2024 |
| a DST month keeps its day count | March 2027 (Europe transition months) and October 2026 answer their real day counts; the grid is a pure calendar shape independent of the host zone |

## E04 Integration tests

- Requirement: the M09 card's acceptance criteria, AC-E2E-05 and the ownership contract.
- Command: `npx vitest run --project integration tests/integration/calendar.test.ts`.
- Result: 1 file passed, 9 tests passed, against PostgreSQL 18.6 with the test database migrated through `0009_calendar.sql` (the file is name-only: M09 adds no migration). The cases run inside transactions that are rolled back, so the suite leaves no rows.

What the 9 cases cover, by area:

| Area | Cases |
|---|---|
| CAL-01 heatmap | the month zero-fills every day and the fixed 45-minute day answers bucket `1_59` with `isToday` false (AC-FR-060-1, AC-FR-060-2; 31 days in October 2026); `YYYY-MM` exactly is accepted, a missing or malformed month answers 400 `validation_failed` |
| CAL-02 day | the day lists the session with its own `daySeconds`, the subject name and 90 total minutes (AC-FR-061-1); a session that crosses local midnight splits into two day allocations and the two days answer their own 30-minute totals (AC-FR-061-2, AC-E2E-05) |
| CAL-02 labels | an archived subject's session is listed with `subjectArchived: true` and its planned entries are hidden (AC-FR-061-3, FR-062); a day with no data answers 200 with `0`, `[]` and `[]` (AC-FR-061-4); plan entries answer the derived status with `plannedMin` and `actualSeconds`, and the day total sums the actual minutes (AC-FR-062-1, AC-FR-062-2); the missed endpoint marks a started entry missed once and the calendar reads it (AC-FR-062-3) |
| Ownership | a foreign user answers 200 with the empty day rather than the owner's rows: a date is not a user-keyed resource, so the empty answer is the shape of a day without the caller's data, not a 404 (no leak) |

## E05 Coverage

- Requirement: DEFINITION-OF-DONE section 2 ("Coverage floors met ... and not lower than before"); the M09 card adds the `src/modules/calendar/**` floor.
- Command: `npm run test:coverage` (`vitest run --coverage`, both projects).
- Result: exit 0, 35 test files / 286 tests, so all six per-path floors (kernel, exams, plans, timer, goals, calendar) were met.

| Scope | % Stmts | % Branch | % Funcs | % Lines | Floor | State |
|---|---|---|---|---|---|---|
| `src/modules/calendar/**` | 100 | 83.33 | 100 | 100 | 80 / 70 / 70 / 80 | PASS |
| `src/modules/plans/**` | 95.27 | 88.98 | 100 | 94.53 | 80 / 70 / 70 / 80 | PASS |
| `src/modules/goals/**` | 94.17 | 84.48 | 94.11 | 96.73 | 80 / 70 / 70 / 80 | PASS |

The calendar module is a single service file plus a re-exporting public file; the 83.33 branch figure is the calendar-day detail's `blocks.find` fallback, which the integration suite exercises through the archived-subject case.

## E06 Browser pass

- Requirement: the milestone ships on a production build, A-5 is keyboard-operable and no surface scrolls sideways at 360 px (DEFINITION-OF-DONE section 2, NFR-051).
- Environment: `npx next start -p 3000` serving the E02 build, against the development PostgreSQL on port 55433 with all nine migrations applied. Managed Chromium through the omp browser device at 360x800, 768x900, 1280x900 and 2560x1440. Account `cal-check-<nonce>@example.com`, created through the signup form, profile time zone UTC, the subject `Algebra` and two manual sessions created through the API.

| Step | Observed |
|---|---|
| Grid data | October 2026 renders the 45-minute day (9th) and the 150-minute day (12th); the cells carry `bg-bucket-1` and `bg-bucket-3` respectively, the zero days carry `bg-bucket-0`, and the minute text is the non-color carrier (NFR-043) |
| Legend | the four ranges read "0 min", "1 to 59 min", "60 to 119 min", "120+ min" as text, each with a color swatch |
| Day panel 45 | selecting 9 October renders "45 minutes studied", the Algebra session "08:00 to 08:45" and "45 min", and "Add plan entry for this day" linking `/plan` |
| Day panel 150 | selecting 12 October renders "150 minutes studied" and the Algebra session "09:00 to 11:30", "150 min" |
| Plan entries | a plan entry created for 29 November renders "Algebra 04:40", "Planned 60 min" and the "Planned" chip; the planned-versus-actual line is text (FR-062) |
| Empty day | a day without data renders "0 minutes studied" and "No sessions or plans on this day" (AC-FR-061-4) |
| Today | 27 November carries the 2 px outline (`2px solid var(--ink)`) and the label "... no minutes studied, today"; the Today button returns the month and selects today |
| Keyboard | the grid is a single tab stop (selected cell `tabindex=0`, the rest `-1`); ArrowRight moves selection and focus to the next day, Home to the row start (a no-op on a Monday), End to the row end, PageUp to the same day of the previous month with selection and focus together, PageDown back |
| Mobile panel focus | under 900 px the panel h2 receives focus on selection, so a sighted keyboard user lands on the day detail after the grid |
| Layout | at 1280 the grid column is 672 wide at x=112 and the day panel 360 wide at x=808 (side by side); at 768 the grid is 672 wide and the panel sits below the grid; at 360 the cells measure 39 x 44 px with the minute figure at 12 px under the date; at 2560 the grid sits at x=752 and the panel at x=1448, both inside `main` |

Layout, `documentElement.scrollWidth` against `innerWidth`:

| Viewport | scrollWidth / innerWidth | grid width | panel position | horizontal overflow |
|---|---|---|---|---|
| 360 | 360 / 360 | 296 (cells 39 x 44) | below the grid | none |
| 768 | 768 / 768 | 672 | below the grid | none |
| 1280 | 1280 / 1280 | 672 at x=112 | 360 wide at x=808 | none |
| 2560 | 2560 / 2560 | 672 at x=752 | 360 wide at x=1448 | none |

Grayscale review: the minute figure is printed in every non-zero cell, the legend is text, and the today cell carries the outline and the word "today" in its label, so no carrier is color alone (NFR-043). The screenshots for the record are `.artifacts/m09-cal-{360,768,1280,2560}.png`.

## E07 Registries

- Requirement: the M09 card's "No table owned, nothing to purge (documented)" row and DEFINITION-OF-DONE section 2.
- Command and observed output:

```
node --env-file=.env.local --import tsx -e "import { container } from './src/server/container.ts'; import { purgeHandlers, exportContributors } from './src/kernel/registries.ts'; container(); console.log('purge', JSON.stringify([...purgeHandlers.keys()])); console.log('export', JSON.stringify([...exportContributors.keys()]));"
purge ["profile","auth","exams","plans","timer","sessions","goals","topics","subjects"]
export ["profile","exams","plans","timer","sessions","goals","subjects","topics"]
```

- The lists are byte-identical to M08's: M09 adds no `"calendar"` key to either registry, because the calendar owns no table. `tests/integration/profile.test.ts` pins both key lists in both orders and its suite is green in E01; no calendar row was added there. The card row is ticked on this documentation and the unchanged pins alone.

## E08 Definition of Done

Milestone level, [DEFINITION-OF-DONE.md](../07-roadmap/DEFINITION-OF-DONE.md) section 2:

| Item | State | Evidence |
|---|---|---|
| All acceptance criteria ids pass | PASS | AC-FR-060-1 to AC-FR-062-3 and AC-E2E-05 are mapped to the 7 unit and 9 integration cases of E03 and E04 and to the browser steps of E06; each row of the M09 checklist names its criteria |
| Every FR in scope has implemented behavior | PASS | FR-060 (heatmap buckets with the minute figure), FR-061 (day detail from sessions) and FR-062 (planned entries with status) across CAL-01, CAL-02 and A-5; no stub, placeholder, mock or `TODO` is left in `src/modules/calendar/**`, the two route files, `src/app/calendar/page.tsx` or the client |
| Tests per the TESTING-STRATEGY matrix are green | PASS | E01: unit 143 and integration 143, both green, of which 7 and 9 are M09 |
| Typecheck, lint and boundary check pass | PASS | E01 |
| Coverage floors met and not lower than before | PARTIAL | E05: the `src/modules/calendar/**` floor (80 / 70 / 70 / 80) is met at 100 / 83.33 / 100 / 100 and the plans and goals floors still pass. The by-layer floors this item names (domain 90%, application 80%, overall 80%) are still neither enforced nor met, which is the OD-M31 gap M01 to M08 recorded and M09 did not close |
| Ownership contract test per new resource | PASS | E04: every CAL read is scoped by `user_id`, and a foreign user answers the empty day rather than the owner's rows |
| Purge handler and export contributor per new user-data table | PASS | M09 owns no table, so no handler or contributor is due; E07 documents that nothing was registered and that the pinned key lists are unchanged |
| Idempotency and concurrency requirements verified | PASS | CAL-01 and CAL-02 are read-only, so there is no write, no `If-Match` and no `Idempotency-Key` to test; API-ENDPOINTS names none for them |
| Migrations apply from an empty database and from the previous schema | PASS | M09 adds no migration; the integration environment migrates an empty database through all nine migrations on every run (E04) and the browser environment applied the same set through `.artifacts/pg-dev.ts` |
| Accessibility: axe zero serious or critical, manual keyboard pass, no horizontal scroll at 360 px | PARTIAL | No horizontal scroll at any of the four widths and a full manual keyboard pass (E06). axe cannot run in this tree (no browser-automation dependency, the same gap M01 to M08 recorded) and no screen reader was driven; the grid follows the ARIA pattern with a single tab stop, roving focus, Home/End/PageUp/PageDown, Enter and Space on native buttons, a 2 px today outline and text labels that never rely on color (NFR-043) |
| Error, empty and loading states implemented | PASS | the grid skeleton of 42 cells covers a month refetch; a failed heatmap read replaces the grid with the ERR-SECTION panel and a Retry action while the tab strip and header stay; a failed day read shows the same panel in the day position; the empty day renders "No sessions or plans on this day" with the action (AC-FR-061-4) |
| Structured logs carry no secrets or note content | PASS | M09 adds no log line of its own; the calendar service logs nothing, and the redaction tests of M01 are unchanged and green |
| Docs updated: SDD, DATA-DICTIONARY, API-ENDPOINTS, PAGE-SPECIFICATIONS as affected | PASS | DATA-DICTIONARY names `study_session_days` and `plan_entries` as the model behind CAL-01 and CAL-02, which M09 reads and does not change; the routes implement API-ENDPOINTS CAL-01 and CAL-02 and the page implements PAGE-SPECIFICATIONS A-5 as written; the documents M09 changed are listed in section 10 of the record |
| REQUIREMENT-TRACEABILITY updated | PASS | FR-060 to FR-062 were already mapped and M09 changes no requirement, so the map needed no row |
| MILESTONES.md checklist fully checked | PARTIAL | Three of the four rows are checked; the Definition of Done row stays unchecked, which is what this table explains |
| Completion report produced in the Build Mode format | PASS | [M09-COMPLETION-REPORT.md](M09-COMPLETION-REPORT.md) |
| No future-phase feature code is reachable | PASS | M09 is MVP: the calendar is read-only and reachable at `/calendar`, and nothing of M12 (statistics), P2-06 (drag-and-drop calendar) or later is added or flagged |
| Tag `m09-done` created | NOT DONE | The owner commits and tags; nothing in this session was committed, staged or tagged |

Task level, [DEFINITION-OF-DONE.md](../07-roadmap/DEFINITION-OF-DONE.md) section 1: the change stays inside M09, stage 1 to stage 4 pass (E01), inputs are validated on the server with the documented codes (`validation_failed` for a malformed month, asserted in E04), no secret or personal data reaches a log or a fixture, no `TODO` or stub is left, the touched documents are updated, and the milestone record was written for review. Stage 5, the squash merge, is the owner's.

## Defects found and fixed in this pass

Three fixes landed after the first build; each is described with its cause and the case that now pins it in section 7 of [M09-COMPLETION-REPORT.md](M09-COMPLETION-REPORT.md).

| Defect | Cause | Fix and the case that pins it |
|---|---|---|
| The keyboard moved the selection but not the focus | the arrow handler only set the selected date and the cells had no tab order, so the ARIA grid pattern was a single tab stop in name only | the selected cell is now `tabIndex={0}` with the rest `-1`, the handler moves the date, and an effect focuses the matching cell on `[loading, month, selected]`, so PageUp and PageDown keep selection and focus on the same day of the neighbouring month; the browser pass drives arrows, Home, End, PageUp and PageDown |
| The today outline never rendered | the cell used `outline: 2px solid var(--fg)`, and `--fg` is not defined in this theme (the foreground variable is `--ink`), so at computed-value time the whole declaration was dropped and the outline stayed `none` | the style uses `var(--ink)`; the browser pass reads `2px solid` on the today cell (E06) |
| The 12 px mobile minute figure was 10 px | `text-[10px]` on the minutes span | the span is `text-xs` (12 px) at every width; the 360 px measurement in E06 confirms it |