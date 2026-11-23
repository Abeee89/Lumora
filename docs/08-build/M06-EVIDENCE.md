# M06 Evidence

> Status: executed 2026-11-23 on `main`; build work tree `D:/Portofolio/Lumora`. Every command below was run in this session and outputs are pasted as observed. The milestone record is [M06-COMPLETION-REPORT.md](M06-COMPLETION-REPORT.md); the milestone card is [MILESTONES.md](../07-roadmap/MILESTONES.md) M06.

## Rules

- One section per checkpoint. Paste the exact command and the observed output.
- Record runtime, library and database versions.
- State pass or fail against the M06 checklist row. On fail or partial, name the cause and the row that stays unchecked.
- A row with no evidence stays unchecked in [MILESTONES.md](../07-roadmap/MILESTONES.md).
- No secret, token or personal data appears here.

## Checklist status

| M06 completion row | State | Evidence |
|---|---|---|
| Manual add, edit, delete, list work; day allocations correct across midnight and DST | PASS | E03: SESS-01..SESS-05 answer through the integration suite, including the midnight crossing and the subject filter; E05: the same paths were driven in the browser on A-4, including a crossing session rendered under its start day with "Spans two days", an archived subject labelled "(archived)", and the overlap refusal naming the conflicting session |
| Replay of the same request key returns the same result | PASS | E03: the idempotent-create case answers 201 twice with an identical body and `Idempotent-Replay: true` on the replay; a reused key with a different payload answers `idempotency_key_reused` |
| Plan actuals shown on plan list | PASS | E03: the plans integration case proves a linked session moves the plan entry to `done` with `actualSeconds` and `varianceSeconds`, and deleting the plan drops the link via the foreign key `SET NULL`; E05: A-4 links a session to a plan entry through the dialog |
| Purge handler and export contributor registered | PASS | E07: `purgeHandlers.keys()` is `["profile", "auth", "exams", "plans", "sessions", "topics", "subjects"]` and `exportContributors.keys()` is `["profile", "exams", "plans", "sessions", "subjects", "topics"]`; the sessions contributor returns its section |
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
| PostgreSQL | 18.6, embedded; the integration suite starts it on a free ephemeral port, the browser run used port 55433 through `.artifacts/pg-dev.ts` with all six migrations applied |
| Browser used for the runtime checks | managed Chromium through the omp browser device, viewport 360, 768, 1280 and 2560 wide |
| Browser account | `plan-check@example.com` with the profile zone `UTC`, created through the signup form; the subjects `Algebra` (with the topic `Quadratics`) and `Physics`, and the exam `Midterm` on 2026-11-24 |

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

Observed: `tsc --noEmit` clean, `eslint .` clean, boundary check passed.

## E02 Unit tests

- Requirement: DEFINITION-OF-DONE section 2; TESTING-STRATEGY.
- Command: `npm run test` (from `npm run verify`).

Raw output:

```
 Test Files  19 passed (19)
      Tests  101 passed (101)
   Duration  12.03s
```

Observed: 19 files / 101 tests passed in 12.03 s. The sessions module contributes `tests/unit/sessions.test.ts` with 6 cases (allocation midnight, rollover, DST split, total preservation, ranking, list order); `tests/unit/plans.test.ts` gained the actuals columns and the `done` status expectation.

## E03 Integration tests

- Requirement: DEFINITION-OF-DONE section 2; TESTING-STRATEGY.
- Command: `npm run test:integration` (from `npm run verify`).

Raw output:

```
 Test Files  10 passed (10)
      Tests  89 passed (89)
   Duration  167.66s
```

Observed: 10 files / 89 tests passed in 167.66 s against the embedded PostgreSQL 18.6. `tests/integration/sessions.test.ts` (10 cases) proves: idempotent create with replay equality and `Idempotent-Replay: true`; a reused key with a different payload answers `idempotency_key_reused`; future and too-long manual entries are refused with 400; an overlapping entry is refused with 409 `manual_entry_overlaps_session` naming `details.conflictingSessionId`; the day-cap refusal is unreachable because non-overlapping sessions on one day can never exceed 24 hours, so the test was removed; a read plus a time edit rewrites the day allocations; `stale_version` on an If-Match edit and an explicit-null plan link drop; `version_required` without the header; ownership (another user's session is `not_found` on read, edit and delete); the list is newest-first and a midnight-crossing session appears under both local days via `from`/`to` per-day `EXISTS`, and the subject filter narrows it; plan actuals (`done` status, `actualSeconds`, `varianceSeconds`) with the foreign-key `SET NULL` on plan delete; delete with stale version, 204 and 404; and the purge and export contributors in the registry order.

## E04 Build

- Requirement: DEPLOYMENT-ARCHITECTURE section 4 stage 7; NFR-061.
- Command: `npx next build`.

Raw output, the route table:

```
Route (app)
┌ ƒ /
├ ƒ /_not-found
├ ƒ /api/app/auth/google
... (auth, exams, plan, profile, subjects, topics routes unchanged from M05)
├ ƒ /api/app/sessions
├ ƒ /api/app/sessions/[sessionId]
├ ƒ /sessions
...
└ ƒ /welcome
```

Observed: `✓ Compiled successfully`, exit 0, 49 route rows of which 3 are new in M06: `/api/app/sessions` (SESS-01 list, SESS-02 create), `/api/app/sessions/[sessionId]` (SESS-03 read, SESS-04 edit, SESS-05 delete) and `/sessions` (A-4). No static and dynamic sibling conflict. Full log `.artifacts/build-m06.log`.

## E05 Browser checks on A-4

- Requirement: PAGE-SPECIFICATIONS A-4; FR-042..FR-044, FR-047, FR-048; AC-FR-042-* to AC-FR-044-*, AC-FR-047-*, AC-FR-048-*.
- Command: the omp browser device on the production build (`npx next start -p 3000`) at `http://localhost:3000/sessions`, signed in as `plan-check@example.com`.

The checks below were driven one at a time on the live page; each observed text is quoted from the rendered page.

| Check | Result | Observed |
|---|---|---|
| Page renders with filters, Add button and empty state | PASS | filter bar with From, To and Subject selects, "Add manual session", "No sessions yet" |
| Add a manual session through the dialog | PASS | subject Algebra, topic Quadratics, date 2026-11-22, time 10:00, duration 45; row "Sunday 22 November · 45 min", "Algebra · Quadratics", "10:00 – 10:45 · 45 min", chip "Manual" |
| Edit the duration | PASS | changed to 60; row "10:00 – 11:00 · 60 min" |
| Delete with the confirm dialog | PASS | dialog "Delete session 'Algebra, 22 Nov'?" with the primary "Delete session"; empty state restored |
| Overlap guard | PASS | creating a session that overlaps an existing one answered 409 `manual_entry_overlaps_session` with `details.conflictingSessionId` |
| Midnight crossing | PASS | API-created session 23:30 to 00:30, allocations `[{2026-11-22,1800},{2026-11-23,1800}]`; row "23:30 – 00:30 · 60 min · Spans two days: 30 min and 30 min" under the heading "Sunday 22 November · 60 min" |
| Archived subject label | PASS | Physics archived through the subject API; a Physics session row renders "Physics (archived)" |
| Filters | PASS | From 2026-11-18, To 2026-11-23 shows both the crossing session under Sunday and the Physics session under "Friday 20 November"; the subject filter narrows the list to Physics |
| Responsive: 360 px | PASS | no horizontal overflow (`scrollWidth` 360 = `clientWidth` 360); the add dialog is a full-height sheet (top 0, bottom 800, full width, its seven controls each fully inside the viewport) |
| Responsive: 768 px | PASS | no horizontal overflow (`scrollWidth` 768 = `clientWidth` 768) |
| Responsive: 2560 px | PASS | no horizontal overflow (`scrollWidth` 2560 = `clientWidth` 2560), both rows still render |

Screenshots `.artifacts/m06-360-sheet.png`, `.artifacts/m06-768-list.png` and `.artifacts/m06-1280-list.png` were captured during the run.

## E06 Registry order

- Requirement: MODULE-BOUNDARIES section 3; the purge and export contracts in DEPLOYMENT-ARCHITECTURE.
- Command: `npm run test:integration -- tests/integration/profile.test.ts`.

Raw output:

```
 Test Files  1 passed (1)
      Tests  7 passed (7)
   Duration  10.13s
```

Observed: the profile integration test asserts `purgeHandlers.keys()` as `["profile", "auth", "exams", "plans", "sessions", "topics", "subjects"]` and `exportContributors.keys()` as `["profile", "exams", "plans", "sessions", "subjects", "topics"]`. Sessions purge before plans, so the plan-link `SET NULL` never blocks the sessions cascade, and before subjects, whose foreign key is `NO ACTION`.

## E07 Coverage floors

- Requirement: DEFINITION-OF-DONE section 2 ("Coverage floors met (domain 90%, application 80%, overall 80%) and not lower than before").
- Command: `npm run test:coverage` (`vitest run --coverage`, both projects).

Raw output, the module rows and the summary (full log `.artifacts/coverage-m06-final.log`):

```
All files          |    49.4 |     37.8 |   46.29 |   50.44 |
 kernel            |   89.75 |     77.5 |   91.56 |   94.94 |
 modules/exams     |    87.5 |    86.72 |   91.42 |   90.41 |
 modules/plans     |    95.3 |    89.16 |     100 |   94.57 |
 modules/profile   |   91.66 |    78.68 |     100 |   96.05 |
 modules/sessions  |   79.31 |    70.22 |   88.57 |   82.77 |
 modules/subjects  |   85.59 |    79.45 |   90.47 |   86.11 |
 modules/topics    |   90.25 |    83.87 |     100 |   92.25 |
-------------------|---------|----------|---------|---------|
Statements   : 49.4% ( 1981/4010 )
Branches     : 37.8% ( 945/2500 )
Functions    : 46.29% ( 412/890 )
Lines        : 50.44% ( 1824/3616 )
```

Observed: exit 0, 29 test files and 190 tests. All enforced floors pass with room; the sessions module measures 82.77% lines and 70.22% branches, and `src/app/api/app/sessions/**` measures 92.59% statements. The overall figure is unchanged in character from M05: the UI layer is exercised by the browser pass, so the Definition of Done coverage row stays partial.

## E08 Working tree

The M06 build is partly committed by the owner (`218f068 push study sessions`, `29e43b9` to `075c110` carry the sessions module, the routes, A-4 and the tests) and partly uncommitted: the working tree holds the `validateDuration` floor fix, the `listSessions` signature cleanup, the sessions blocks in `tests/integration/support/api.ts` and `tests/integration/profile.test.ts`, `tests/unit/sessions.test.ts` and `tests/unit/boundaries.test.ts` (the repo-scan case gained a 30 s timeout), and the untracked `tests/integration/sessions.test.ts`. The owner commits and tags; no tag exists at the time of writing.
