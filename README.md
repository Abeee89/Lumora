# Lumora

Study planning, a server-authoritative timer, and planned-versus-actual tracking.
The product, architecture, database, UI and API contracts live in [`docs/`](docs/README.md);
[`docs/DOCUMENTATION-INDEX.md`](docs/DOCUMENTATION-INDEX.md) is the entry list.

## Build state

M07 (timer) is built and verified on the M06 foundation. The timer is server-authoritative: the
row stores the phase and the instant it ends, and the state is advanced lazily on read, so a
refresh, a second tab or a second device agree without a socket. A Pomodoro walks focus to break
and to a long break every fourth focus; a stopwatch has no phase clock. Pausing closes the running
focus interval and stops the phase clock, so paused minutes never count. A heartbeat every 60 s
keeps the run alive, and a run whose last heartbeat is 30 minutes old is closed by a cron job and
written as a session. One timer runs at a time: a second start is refused with the running one
attached, and replacing it saves the time it collected. A stop under a minute is discarded, a
stopwatch from a minute is saved with no Pomodoro, and a Pomodoro is saved once it has banked a
Pomodoro or five minutes of focus. Underneath sit the sessions of M06, the plans and warnings of
M05, the exams, checklists and the derived archive rule of M04, the subjects, topics and bulk paste
of M03, the accounts, sign-in, profile and appearance work of M02, and the shell, the shared kernel,
the boundary checker, the outbox relay and the three scheduled jobs of M01. Readiness scoring is
Phase 2 and is not in this build. Google sign-in needs an OAuth client (U-5) and the reset email
needs a provider (U-A2); no staging host exists (U-A1). The navigation carries the shipped pages
only: Calendar, Exams, Subjects, Sessions, Timer and Settings, where Calendar opens the plan list
until the calendar page ships ([NAVIGATION-STRUCTURE](docs/05-ui-ux/NAVIGATION-STRUCTURE.md) rule 2,
OD-M36). Evidence and the open rows are in [M07-EVIDENCE](docs/08-build/M07-EVIDENCE.md) and
[M07-COMPLETION-REPORT](docs/08-build/M07-COMPLETION-REPORT.md).

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