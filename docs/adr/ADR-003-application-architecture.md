# ADR-003 Application architecture

> Status: Proposal, pending approval. Source of truth: Phase 2 PRD and Phase 1 docs.

## Status

Proposed. The modular monolith choice was confirmed by the product owner.

## Context

The product has 19 areas of behaviour (Authentication through Notifications) with tightly connected business rules (BR-001..BR-032). A session save touches goals, statistics and XP and must be atomic where a ledger entry is involved (EC-017). One small team, one database, capacity target NFR-070. Microservices would add distributed consistency problems with no scale or team justification.

## Decision

1. Build a modular monolith inside the Next.js codebase with two runtime processes (web and worker).
2. Organise code into 19 modules in five acyclic layers: foundation, catalog, activity, derived, composition. Each module has a rank and may depend only on lower ranks (`MODULE-BOUNDARIES.md` section 4).
3. Layers inside a module: adapter -> application service -> domain -> repository port -> repository adapter. Adapters (route handlers, server actions, job handlers) are thin. Application services own transactions. Domain code is pure and receives an injected clock and configuration.
4. Modules interact through public interfaces and domain events. Events that start asynchronous work also write an outbox record in the same transaction.
5. Lower layers react to upper layers only through inversion points (archive guard, purge handler, export contributor, notification port).
6. Boundary rules are enforced by tooling (dependency-cruiser or ESLint boundaries), a Phase 7 requirement.
7. Extraction triggers are named in `SYSTEM-ARCHITECTURE.md` section 3.

## Consequences

- Cross-module effects can be atomic; local development and testing are simple.
- Boundaries are only convention until tooling exists, so the Phase 7 setup is mandatory early work.
- A single deployable shares memory and failure with all modules.
- Extraction of Analytics, AI scheduling or the public API is feasible later because of public interfaces and events.

## Alternatives

- Microservices: rejected for operational cost and consistency complexity.
- Serverless functions per route: rejected for cold starts against NFR-004 and connection management.
- Separate API service (NestJS or Express): clearer split but a second deployable and duplicated typing.
- Unlayered monolith: rejected because boundaries cannot be checked and circular dependencies are likely.
