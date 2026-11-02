# ADR-001 Technology stack

> Status: Proposal, pending approval. Source of truth: Phase 2 PRD and Phase 1 docs.

## Status

Proposed.

## Context

Lumora needs a web application with an interactive timer, read-heavy statistics, accessible UI (NFR-040, NFR-041), shared validation between client and server (EC-023, FR-030), and a capacity of 10,000 users and 5 million sessions (NFR-070). The team is small. Candidate technologies were listed in the Phase 3 brief and were evaluated, not assumed. Full analysis is in `docs/03-architecture/TECHNOLOGY-DECISIONS.md`.

## Decision

Adopt this stack:

- TypeScript in strict mode end to end.
- React through Next.js App Router.
- Tailwind CSS with shadcn/ui components (Radix primitives).
- Drizzle ORM over PostgreSQL (see ADR-002).
- Zod for validation, shared by client and server.
- TanStack Query for server state, React state for local UI state, Zustand only for the timer store.
- Recharts for charts, always paired with numeric tables (NFR-043).
- Custom lightweight heatmap for the MVP calendar; dnd-kit with keyboard sensors for Phase 2 drag-and-drop (NFR-042).
- Native audio element with self-hosted CC0 loops for Phase 2 ambient audio.
- Vitest, Testing Library, Playwright and axe for tests.
- pino structured logging with request IDs; an error-tracking service with scrubbing (vendor U-A7).
- Other decisions have their own records: ADR-004 (authentication), ADR-005 (jobs), ADR-006 (time), ADR-007 (notes editor), ADR-008 (API), ADR-009 (deployment), ADR-010 (AI), ADR-011 (idempotency).

## Consequences

- One language and one validation source reduce drift and speed delivery.
- Dependencies that are young (Drizzle, Better Auth) need pinned versions and a Phase 7 spike for the riskiest assumptions.
- App Router conventions require a written server-versus-client component guideline.
- TipTap and FullCalendar are not adopted; reopening requires a new ADR.
- Changing the framework later affects adapters and UI, not domain modules (ADR-003).

## Alternatives

- Remix, SvelteKit, or a React single-page app with a separate API: smaller or simpler in places, but a smaller ecosystem or two deployables.
- MUI or Mantine instead of Tailwind and shadcn/ui: heavier bundles and harder accessibility control.
- Prisma or Kysely instead of Drizzle: Prisma is heavier with less query control; Kysely lacks a schema layer.
- Redux for state: more ceremony than required.
- Jest instead of Vitest, Cypress instead of Playwright: slower or weaker multi-tab and cross-browser coverage.
