# Lumora

Study planning, a server-authoritative timer, and planned-versus-actual tracking.
The product, architecture, database, UI and API contracts live in [`docs/`](docs/README.md);
[`docs/DOCUMENTATION-INDEX.md`](docs/DOCUMENTATION-INDEX.md) is the entry list.

## Build state

M08 (daily and subject goals) is built on the M07 timer. A daily target lives in a dated history,
so raising or lowering it applies from the current local day forward and leaves past days with
the target they were measured against; each subject can carry its own target, and a target of an
archived subject is suspended until the subject is restored. Progress is derived, never stored: it
is the frozen day allocation of the sessions on that local date, split across midnight, rollover
and timezone changes, plus the measured focus of a run still in flight. The day's percent and
goal-met state come from the same numbers, and the write that pushes a day to its target publishes
one `GoalMet` for that day. The daily goal can be changed from the timer page, and A-15 at
`/settings/study` holds the goal and the timer durations. Underneath sit the timer of M07, the
sessions of M06, the plans and warnings of M05, the exams, checklists and the derived archive rule
of M04, the subjects, topics and bulk paste of M03, the accounts, sign-in, profile and appearance
work of M02, and the shell, the shared kernel, the boundary checker, the outbox relay and the three
scheduled jobs of M01. Readiness scoring is Phase 2 and is not in this build. Google sign-in needs
an OAuth client (U-5) and the reset email needs a provider (U-A2); no staging host exists (U-A1).
The navigation carries the shipped pages only: Calendar, Exams, Subjects, Sessions, Timer and
Settings, where Calendar opens the plan list until the calendar page ships
([NAVIGATION-STRUCTURE](docs/05-ui-ux/NAVIGATION-STRUCTURE.md) rule 2, OD-M36). Evidence and the
open rows are in [M08-EVIDENCE](docs/08-build/M08-EVIDENCE.md) and
[M08-COMPLETION-REPORT](docs/08-build/M08-COMPLETION-REPORT.md).

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