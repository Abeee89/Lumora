# Lumora

Study planning, a server-authoritative timer, and planned-versus-actual tracking.
The product, architecture, database, UI and API contracts live in [`docs/`](docs/README.md);
[`docs/DOCUMENTATION-INDEX.md`](docs/DOCUMENTATION-INDEX.md) is the entry list.

## Build state

M03 (subjects and topics) is built and verified on the M02 foundation. Subjects with their
colour, order and archive state, the topics under each with weight and status, the duplicate-name
and running-session rules, and the bulk paste path sit under the accounts, sign-in, profile and
appearance work, with the shell, the shared kernel, the boundary checker, the outbox relay and one
scheduled cleanup job beneath them. Google sign-in needs an OAuth client (U-5) and the reset email
needs a provider (U-A2); no staging host exists (U-A1). The navigation carries the shipped pages
only, which is now Subjects beside Settings ([NAVIGATION-STRUCTURE](docs/05-ui-ux/NAVIGATION-STRUCTURE.md)
rule 2). Evidence and the open rows are in [M03-EVIDENCE](docs/08-build/M03-EVIDENCE.md) and
[M03-COMPLETION-REPORT](docs/08-build/M03-COMPLETION-REPORT.md).

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