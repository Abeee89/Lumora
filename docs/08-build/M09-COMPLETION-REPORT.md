# M09 Completion Report

> Status: M09 execution record, 2026-11-27, awaiting the owner's approval and tag. Commands, raw output, the browser measurements and the defects found are in [M09-EVIDENCE.md](M09-EVIDENCE.md). M09 is built and verified; its DoD row stays partial because the by-layer coverage floors the document names are still not enforced beyond the module floor M09 added, axe cannot run in this tree and no screen reader was driven, and the tag is the owner's step. No ADR is Accepted, no vendor is selected, no OD row is closed, and nothing is committed, staged or tagged by me.

## 1. Executive summary

M09 adds the study calendar: a read-only month heatmap and a day detail. No table arrives, because the milestone reads the rows M05 and M06 already write. The heatmap sums `study_session_days` for the month asked for, groups by the frozen `local_date`, zero-fills every day and classifies each day into one of the four buckets of AC-FR-060-1 (`0`, `1_59`, `60_119`, `120_plus`); the minute figure is printed in every non-zero cell, so the fill is never the only carrier (NFR-043). The day detail answers the sessions of a day with their own seconds, the subject name and the archived label, the `dayAllocations` of a midnight-crossing session split across the days it belongs to (AC-E2E-05), and the plan entries of the day with their derived status, planned and actual minutes (FR-062).

The face is A-5: a server-rendered page at `/calendar` with a month tab strip (Month, Plan list), Previous/Next/Today controls, a polite live-region month label, the timezone line, a Monday-first 7 by 6 grid, a text legend and a day panel. The grid carries exactly one tab stop; the arrows, Home, End, PageUp and PageDown move the selection and the focus together, and under 900 px the day panel heading takes the focus when a day is selected. The module lives at rank 14 and reads through `../plans/public`, `../sessions/public` (types only) and `../subjects/public`; no container wiring and no registry entry was added, because there is nothing to own or purge.

Everything M09 claims is proven by a command run in this repository: typecheck, lint, the boundary check, 143 unit tests, 143 integration tests against PostgreSQL 18.6, a production build, the coverage run with the calendar module at 100% statements and 100% lines against the floor M09 added, and browser checks at four viewport widths against the production build, including two manual sessions, the day totals, the planned entry with its status chip, the empty day, the 2 px today outline, the full keyboard pass and the 44 px cells at 360.

M09 is not a full pass. `DEFINITION-OF-DONE.md checked` is partial: the by-layer coverage floors are neither enforced nor met beyond the per-module floor M09 added, axe cannot run, no screen reader was driven, and the `m09-done` tag is the owner's to create. Those are named in section 8 and in the evidence record rather than ticked. Three defects were found and fixed in this pass, and all three are in section 7 with the case that now pins each.

## 2. Scope and authorization

| Item | Record |
|---|---|
| Milestone | M09 Calendar ([MILESTONES.md](../07-roadmap/MILESTONES.md)) |
| Authorization | Owner instruction "started" in the build session, which starts this milestone after the M08 delivery report was approved; the scope is the M09 card fixed by `Build Mode.txt` and the roadmap, recorded in [OPEN-DECISIONS.md](../OPEN-DECISIONS.md) section G, 2026-11-27 |
| Repository | `D:/Portofolio/Lumora`, branch `main`; the owner committed the M09 work in three commits mid-session (`9c01d9c`, `0b6a8eb`, `1157b6d`), no commit was made by me |
| In scope | CAL-01 (the month heatmap) and CAL-02 (the day detail) at `/api/app/calendar`; A-5 at `/calendar`; the four buckets and the minute figure (AC-FR-060-1, AC-FR-060-2, NFR-043); the day total and the midnight split (AC-FR-061-1, AC-FR-061-2, AC-E2E-05); the archived label and the hidden plan entries of an archived subject (AC-FR-061-3, FR-062); the empty day answer (AC-FR-061-4); the planned statuses (AC-FR-062-1 to AC-FR-062-3); the timezone-aware server today; the single-tab-stop keyboard grid |
| Out of scope | M12 statistics (FR-024 reads STAT-04, a later milestone); P2-06 drag-and-drop; a week view (A-5 names it Phase 2, B-1); tasks, notes, reminders and any Phase 2 or Phase 3 table, route or flag; any calendar write: "Add plan entry for this day" links to the A-6 plan list at `/plan`, because creating plan entries is FR-030..FR-038, which M05 owns |
| Build Mode rules | No invented specification: every route, bucket, label, rule and sentence traces to FR-060 to FR-062, NFR-043, U-D9, AC-E2E-05 or a named document section. No open decision was resolved silently: the M09 choices are recorded in section 7 and in [OPEN-DECISIONS.md](../OPEN-DECISIONS.md) (OD-M46 to OD-M49 stay open; M09 makes none of its own) |

## 3. Functionality delivered

| Area | What exists now | Proof |
|---|---|---|
| Heatmap | CAL-01 answers the month's days, zero-filled, each with its bucket and the minute figure; `YYYY-MM` is the exact accepted shape | `tests/integration/calendar.test.ts`, browser checks in E06 |
| Buckets | `bucketOf` classifies 0, 1 to 59, 60 to 119 and 120+ minutes (AC-FR-060-1) | `tests/unit/calendar.test.ts` |
| Today | the server computes today from the profile zone through `getUserClockContext` and `localDateOf`, and the cell carries the 2 px outline and the word "today" in its label (NFR-043) | `src/app/calendar/page.tsx`, browser check in E06 |
| Day detail | CAL-02 answers the sessions of a day with their own seconds, the subject name, the archived label and the day total (AC-FR-061-1); a midnight-crossing session splits into two day allocations (AC-FR-061-2, AC-E2E-05) | `tests/integration/calendar.test.ts`, browser checks in E06 |
| Planned entries | the day panel lists the planned entries with the derived upcoming/done/missed status, planned and actual minutes, and the subject name; an archived subject's entries are hidden and its sessions are labelled `(archived)` (AC-FR-061-3, FR-062) | `tests/integration/calendar.test.ts`, browser check in E06 |
| Empty and foreign days | a day without the caller's data answers 200 with `0`, `[]` and `[]` (AC-FR-061-4) and renders "No sessions or plans on this day"; another user's day is the same empty shape, never the owner's rows | `tests/integration/calendar.test.ts` |
| A-5 grid | Monday-first 42-slot grid (U-D9), four text legend rows, a single tab stop, roving focus, arrows/Home/End/PageUp/PageDown, Enter and Space | `src/ui/forms/calendar-month.tsx`, `tests/unit/calendar.test.ts`, browser check in E06 |
| A-5 panel | day heading, total line, sessions and plan sections, and "Add plan entry for this day" linking to `/plan` | browser check in E06 |
| Data ownership | every read is scoped by `user_id`; no cross-user leak | `tests/integration/calendar.test.ts` |
| Rate limit | CAL-01 and CAL-02 use the existing `heavy` kind (30 per user per minute); no new config key | `src/app/api/app/calendar/**` |
| Registries | no purge handler and no export contributor, because M09 owns no table; both pinned key lists are unchanged | E07 in `M09-EVIDENCE.md` |

## 4. Files

New:

| Path | Role |
|---|---|
| `src/modules/calendar/service.ts` | `bucketOf`, `calendarDay`, `monthGrid`, `getMonthHeatmap`, `getDayDetail` |
| `src/modules/calendar/public.ts` | the module's public surface: the five functions and the wire types |
| `src/app/api/app/calendar/heatmap/route.ts` | CAL-01 |
| `src/app/api/app/calendar/days/[date]/route.ts` | CAL-02 |
| `src/app/calendar/page.tsx` | A-5, server component with the session guard and the initial month |
| `src/ui/forms/calendar-month.tsx` | the client: month state, heatmap fetch, day selection, the grid and the day panel |
| `tests/unit/calendar.test.ts` | 7 cases over `bucketOf`, `calendarDay` and `monthGrid` |
| `tests/integration/calendar.test.ts` | 9 cases over CAL-01 and CAL-02 |
| `docs/08-build/M09-EVIDENCE.md` | the checkpoint record: E01 to E08 with the commands and the observed output |

Modified:

| Path | Change |
|---|---|
| `src/ui/nav.ts` | the `Plan` group gains `Calendar` at `/calendar`; `shippedRoutes` gains `/plan` and `/calendar` |
| `src/app/globals.css` | the `--bucket-0..3` variables (light-dark) and their `--color-bucket-*` theme entries, with a comment tying them to A-5 and NFR-043 |
| `src/server/request-context.ts` | the `monthQuerySchema` the heatmap route validates against |
| `tests/integration/support/api.ts` | the two calendar route GETs in the harness dispatch and the section-15 wire schemas and types |
| `vitest.config.ts` | the `src/modules/calendar/**` coverage floor |

`tests/integration/support/database.ts` was touched during the session and restored to its committed state (the UTC-pin experiment, see section 7); it is not part of the diff.

## 5. Database changes

None. M09 owns no table and adds no migration. The calendar reads `study_session_days` (M06) through a `GROUP BY local_date` query and `plan_entries` through `plans.listPlanEntries` (M05); both stay as the milestones that wrote them defined them.

## 6. Tests executed and results

| Command | Result |
|---|---|
| `npm run verify` | exit 0. `tsc --noEmit` clean; `eslint .` clean; "Boundary check passed"; unit 21 files / 143 tests passed; integration 13 files / 143 tests passed |
| `npx vitest run --project unit tests/unit/calendar.test.ts` | 7 tests passed |
| `npx vitest run --project integration tests/integration/calendar.test.ts` | 9 tests passed against PostgreSQL 18.6 |
| `npx vitest run --project integration tests/integration/plans.test.ts` | 20 tests passed (the suite the harness fix protects, rerun after the UTC-pin removal) |
| `npx next build` | exit 0, compiled successfully, 46 of 46 static pages generated, 71 route lines of which two are new (the two calendar route files and `/calendar`) |
| `npm run test:coverage` | exit 0, 35 files / 286 tests; `src/modules/calendar` at 100% statements, 83.33% branches, 100% functions and 100% lines against the 80 / 70 / 70 / 80 floor; the plans and goals floors pass at 95.27 / 88.98 / 100 / 94.53 and 94.17 / 84.48 / 94.11 / 96.73 |
| Browser checks | every check in the evidence record E06 passed, including the two-day data grid, the legend, the day totals, the planned entry with its chip, the empty day, the today outline, the keyboard pass at 360 and 1280, the mobile panel focus and the four-width layout pass |

Full commands, raw output and the measurement tables are in [M09-EVIDENCE.md](M09-EVIDENCE.md).

## 7. Technical findings and defects fixed

1. **The heatmap month bound is a date, not a string.** The first build compared `local_date` against the `YYYY-MM` upper bound and PostgreSQL rejected it with "invalid input syntax for type date". The bound is now the first of the following month (`YYYY-MM-01` of `nextOf`), and the integration case that reads October across the boundary pins it (E04).
2. **A filled day must never stay bucket `"0"`.** The first build classified from the row's bucket only, so a day whose minute count changed kept its old bucket. The service recomputes `bucketOf(minutes)` from the filled figure and the integration case that zero-fills while a 45-minute day reads `1_59` pins both directions (E04).
3. **`subject_archived` must be a boolean on the wire.** The first query selected the raw `archived_at` timestamp, which failed the strict `z.boolean()` wire schema. The SQL now selects `(subj.archived_at IS NOT NULL) AS subject_archived` and the archived-subject case pins it (E04).
4. **The keyboard moved the selection but not the focus.** The arrow handler only set the selected date and the cells had no tab order, so the ARIA grid pattern held a single tab stop in name only. The selected cell is now `tabIndex={0}` with the rest `-1`, the handler moves the date, and an effect focuses the matching cell on `[loading, month, selected]`, so PageUp and PageDown keep selection and focus on the same day of the neighbouring month. The browser pass drives arrows, Home, End, PageUp and PageDown (E06).
5. **The today outline never rendered.** The cell used `outline: 2px solid var(--fg)`, and `--fg` is not defined in this theme (the foreground variable is `--ink`), so at computed-value time the declaration was dropped and the outline stayed `none`. The style uses `var(--ink)` and the browser pass reads `2px solid` on the today cell (E06).
6. **A pinned cluster timezone broke the plans suite.** A mid-session experiment pinned the embedded cluster to UTC (`postgresFlags: ["-c", "timezone=UTC"]`); under that pin, `now()::date` in the plans suite's `backdate` helper landed a day behind the host zone and the `status=missed` filter answered empty. The pin was removed, `tests/integration/support/database.ts` is byte-identical to its committed state, the plans suite passes again, and the calendar suite never needed the pin (it signs up in UTC and uses fixed 2026-10 dates). Recorded here as the M09 harness repair.
7. **The status chip colors exist and are used.** `--color-success-soft` and `--color-error-soft` are both in the theme, so the Done and Missed chips use them; the planned-versus-actual line and the status word stay text, so color is never the only carrier (FR-062, NFR-043).

## 8. Known limitations

1. The Definition of Done row stays partial for three named reasons: the by-layer coverage floors (domain 90%, application 80%, overall 80%) are still neither enforced nor met, which is OD-M31 and unchanged since M01; axe cannot run in this tree because no browser-automation dependency is installed, and no screen reader was driven; and the `m09-done` tag is the owner's step.
2. The day panel heading takes the focus on selection only under 900 px (`(min-width: 900px)` matchMedia), which is the A-5 responsive reading. The two-column layout above 1024 keeps the grid and the panel in view together, so the focus move would be a jump; if A-5 is later read as requiring the move at every width, the guard is a one-line change.
3. The heatmap and the day detail agree with the session data through the fixed 2026-10 dates of the integration suite and the browser account; a DST boundary month is covered by the unit grid shape (E03) but the browser run did not drive one.
4. The calendar reads `subjectName` from the subjects block list (`blocks.find(...)?.name ?? "another subject"`), the same fallback the plans list uses; a subject deleted from the list while its sessions remain would render the fallback string, which the data model already prevents (subjects are archived, never deleted, BR-029).
5. "Add plan entry for this day" links to the plain plan list at `/plan`. A-6 already accepts `presetSubjectId`, and passing the selected day's first session's subject would be the refinement, but the spec asks only for the action; the handoff is a one-line change if the browser pass of A-6 wants it.
6. Nothing is committed, staged or tagged by me. The owner made three commits mid-session and decides what happens to the remainder.

## 9. Remaining tasks

- Owner: review this report and [M09-EVIDENCE.md](M09-EVIDENCE.md), commit the uncommitted remainder, approve or correct the record, and create the `m09-done` tag.
- The Definition of Done row stays unchecked in [MILESTONES.md](../07-roadmap/MILESTONES.md) until the by-layer floors have a command and axe can run (OD-M31).
- Owner decision: OD-M46 to OD-M49 are recorded and none is closed; M09 makes none of its own.
- No follow-up code is deferred: the M09 card's deliverable rows are complete, and the open rows are evidence gaps and the tag rather than work items.

## 10. Documents updated

| Document | Change |
|---|---|
| [MILESTONES.md](../07-roadmap/MILESTONES.md) M09 | three rows checked, the Definition of Done row left unchecked, and an "As built" note recording what shipped and which row stays open |
| [IMPLEMENTATION-READINESS.md](../IMPLEMENTATION-READINESS.md) sections 6 and 7 | the M09 execution paragraph and the authorization sentence naming M10 as the next step |
| [DOCUMENTATION-INDEX.md](../DOCUMENTATION-INDEX.md) | the two M09 build records and the inventory count |
| [README.md](../README.md), [docs/README.md](../README.md) | build state, the reading order and the build records |
| [CHANGELOG.md](../CHANGELOG.md) | the 2026-11-27 M09 entry, with the three defects and the harness repair under "Fixed" |
| [OPEN-DECISIONS.md](../OPEN-DECISIONS.md) section G | the 2026-11-27 M09 execution row |

DATA-DICTIONARY and API-ENDPOINTS are unchanged: M09 reads the tables M05 and M06 own and implements CAL-01 and CAL-02 exactly as written.

## 11. Definition of Done level

The milestone-level check is in [M09-EVIDENCE.md](M09-EVIDENCE.md) E08. FR-060 to FR-062 are delivered with no stub or placeholder, typecheck, lint and the boundary check pass, 143 unit and 143 integration tests pass, the production build succeeds with the two new routes and `/calendar`, the calendar module clears the floor M09 added at 100 / 83.33 / 100 / 100, no registry key was added and both pinned lists are unchanged, the ownership contract holds, the empty day answers 200 (AC-FR-061-4), the four-width browser pass shows no horizontal scroll, 44 px cells and a full keyboard pass, and the states of E06 (loading, empty, error, data) all exist. Three rows are not fully checked: the by-layer coverage floors, the axe and screen-reader half of the accessibility row, and the `m09-done` tag.

## 12. Recommended next milestone

M10 Tasks and priorities. It is the next card in the roadmap execution order (M09 to M10), and the calendar page already links to it through "Add plan entry for this day" at `/plan`, which M05 owns and M10 extends. M05, M06, M07, M08 and M09 stay open on their Definition of Done rows until the coverage, screen-reader and axe gaps are closed and the owner has tagged each one.