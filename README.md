# Lumora

Study planning, a server-authoritative timer, and planned-versus-actual tracking.
The product, architecture, database, UI and API contracts live in [`docs/`](docs/README.md);
[`docs/DOCUMENTATION-INDEX.md`](docs/DOCUMENTATION-INDEX.md) is the entry list.

## Build state

M06 (study sessions) is built and verified on the M05 foundation. A session records subject,
optional topic, optional plan link and a start and end as instants; the day slices are allocated
across local days with the timezone frozen at start, so a midnight-crossing session counts on both
days and DST shifts do not distort it. Manual sessions require a duration of 1 minute to 24 hours,
refuse a future start and an overlap with an existing session, and are flagged `is_manual`, excluded
from future XP and leaderboards. Plan entries now read the actual value of their linked sessions:
an entry with a positive actual is `done` with `actualSeconds` and `varianceSeconds` (FR-036), and
deleting a plan keeps the sessions and drops the link. Underneath sit the plan list and its warnings
of M05, the exams, checklists and the derived archive rule of M04, the subjects, topics and bulk
paste of M03, the accounts, sign-in, profile and appearance work of M02, and the shell, the shared
kernel, the boundary checker, the outbox relay and the two scheduled jobs of M01. Readiness scoring
is Phase 2 and is not in this build. Google sign-in needs an OAuth client (U-5) and the reset email
needs a provider (U-A2); no staging host exists (U-A1). The navigation carries the shipped pages
only: Calendar, Exams, Subjects, Sessions and Settings, where Calendar opens the plan list until
the calendar page ships ([NAVIGATION-STRUCTURE](docs/05-ui-ux/NAVIGATION-STRUCTURE.md) rule 2, OD-M36).
Evidence and the open rows are in [M06-EVIDENCE](docs/08-build/M06-EVIDENCE.md) and
[M06-COMPLETION-REPORT](docs/08-build/M06-COMPLETION-REPORT.md).

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