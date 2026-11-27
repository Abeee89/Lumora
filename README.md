# Lumora

Study planning, a server-authoritative timer, and planned-versus-actual tracking.
The product, architecture, database, UI and API contracts live in [`docs/`](docs/README.md);
[`docs/DOCUMENTATION-INDEX.md`](docs/DOCUMENTATION-INDEX.md) is the entry list.

## Build state

M10 (tasks and priorities) is built on the subjects and topics of M03 and needs nothing newer: the
A-9 list at `/todos` creates, edits, deletes and completes to-dos, filters by status, subject,
priority and due state with AND, and orders by priority rank, then due date with null last, then age
(FR-095). Completion is idempotent and only the false-to-true transition publishes `TodoCompleted`.
The calendar at `/calendar` is the M09 month heatmap over the frozen day allocations of the M06
sessions, which stores no rows of its own: each local date sums into one of four intensity buckets
with the minute figure printed in every non-zero cell, so the fill is never the only carrier
(NFR-043), and the day panel answers the sessions and the planned entries of a day. Underneath sit
the daily and subject goals of M08, the timer of M07, the sessions of M06, the plans and warnings of
M05, the exams, checklists and the derived archive rule of M04, the subjects, topics and bulk paste
of M03, the accounts, sign-in, profile and appearance work of M02, and the shell, the shared kernel,
the boundary checker, the outbox relay and the three scheduled jobs of M01. Readiness scoring is
Phase 2 and is not in this build. Google sign-in needs an OAuth client (U-5) and the reset email
needs a provider (U-A2); no staging host exists (U-A1).
The navigation carries the shipped pages only: Calendar, Exams, Subjects, Sessions, Timer, To-dos
and Settings ([NAVIGATION-STRUCTURE](docs/05-ui-ux/NAVIGATION-STRUCTURE.md) rule 2, OD-M36).
Evidence and the open rows are in [M10-EVIDENCE](docs/08-build/M10-EVIDENCE.md) and
[M10-COMPLETION-REPORT](docs/08-build/M10-COMPLETION-REPORT.md).

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Next.js development server |
| `npm run build` | Production build of the single image |
| `npm run typecheck` | Stage 1, strict TypeScript |
| `npm run lint` | Stage 2, ESLint |
| `npm run boundaries` | Stage 2, module rank and public-interface check |
| `npm test` | Stage 3, unit tests |
| `npm run test:integration` | Stage 4, PostgreSQL integration tests (embedded server unless `DATABASE_URL` is set) |
| `npm run worker` | Outbox relay worker; needs `DATABASE_URL` |
| `npm run verify` | Everything above, in CI order |

## Environment

Copy [`.env.example`](.env.example) to `.env.local`. Numeric product defaults are not
environment variables: they live in [`src/kernel/config.ts`](src/kernel/config.ts) (NFR-062).