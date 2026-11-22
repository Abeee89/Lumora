# Lumora

Study planning, a server-authoritative timer, and planned-versus-actual tracking.
The product, architecture, database, UI and API contracts live in [`docs/`](docs/README.md);
[`docs/DOCUMENTATION-INDEX.md`](docs/DOCUMENTATION-INDEX.md) is the entry list.

## Build state

M05 (study plans) is built and verified on the M04 foundation. A plan entry is a subject, an
optional topic, a start and a duration of 5 to 480 minutes, stored as intended time; saving one
warns when it overlaps another entry of the same user (BR-026) or falls after one of the subject's
exam dates (FR-038) and goes through on confirmation, an entry that has started is read-only apart
from being marked missed (FR-035, FR-033), and the list filters by date range, subject and status.
Planned versus actual and the `done` status arrive with M06, because the actual value is the sum of
the sessions M06 records (B-07). Underneath sit the exams, checklists and the derived archive rule
of M04, the subjects, topics and bulk paste of M03, the accounts, sign-in, profile and appearance
work of M02, and the shell, the shared kernel, the boundary checker, the outbox relay and the two
scheduled jobs of M01. Readiness scoring is Phase 2 and is not in this build. Google sign-in needs
an OAuth client (U-5) and the reset email needs a provider (U-A2); no staging host exists (U-A1).
The navigation carries the shipped pages only: Calendar, Exams, Subjects and Settings, where
Calendar opens the plan list until the calendar page ships ([NAVIGATION-STRUCTURE](docs/05-ui-ux/NAVIGATION-STRUCTURE.md) rule 2, OD-M36).
Evidence and the open rows are in [M05-EVIDENCE](docs/08-build/M05-EVIDENCE.md) and
[M05-COMPLETION-REPORT](docs/08-build/M05-COMPLETION-REPORT.md).

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