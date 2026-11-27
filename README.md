# Lumora

Study planning, a server-authoritative timer, and planned-versus-actual tracking.
The product, architecture, database, UI and API contracts live in [`docs/`](docs/README.md);
[`docs/DOCUMENTATION-INDEX.md`](docs/DOCUMENTATION-INDEX.md) is the entry list.

## Build state

M09 (calendar) is built on the M08 goals and reads the frozen day allocations of the M06
sessions, never storing its own rows. The month heatmap at `/calendar` sums each local date into
one of the four intensity buckets with the minute figure printed in every non-zero cell, so the
fill is never the only carrier (NFR-043); the day panel answers the sessions of a day with their
own minutes, the archived label, the midnight split and the planned entries of the day with their
derived status, and "Add plan entry for this day" hands off to the plan list. The grid is one tab
stop with roving focus and full keyboard travel, and the server computes today from the profile
timezone. Underneath sit the daily and subject goals of M08, the timer of M07, the sessions of M06,
the plans and warnings of M05, the exams, checklists and the derived archive rule of M04, the
subjects, topics and bulk paste of M03, the accounts, sign-in, profile and appearance work of M02,
and the shell, the shared kernel, the boundary checker, the outbox relay and the three scheduled
jobs of M01. Readiness scoring is Phase 2 and is not in this build. Google sign-in needs an OAuth
client (U-5) and the reset email needs a provider (U-A2); no staging host exists (U-A1).
The navigation carries the shipped pages only: Calendar, Exams, Subjects, Sessions, Timer and
Settings ([NAVIGATION-STRUCTURE](docs/05-ui-ux/NAVIGATION-STRUCTURE.md) rule 2, OD-M36).
Evidence and the open rows are in [M09-EVIDENCE](docs/08-build/M09-EVIDENCE.md) and
[M09-COMPLETION-REPORT](docs/08-build/M09-COMPLETION-REPORT.md).

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