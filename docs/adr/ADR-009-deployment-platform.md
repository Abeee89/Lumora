# ADR-009 Deployment platform

> Status: Proposal, pending approval. Source of truth: Phase 2 PRD and Phase 1 docs.

## Status

Proposed. Managed PaaS with managed PostgreSQL was confirmed by the product owner; the vendor is open (U-A1).

## Context

Targets: 99.5% monthly availability (NFR-050, U-5), TLS 1.2+ (NFR-010), daily backups kept 30 days, RPO 24 h and RTO 8 h with quarterly restore drills (NFR-100..103), growth by adding resources (NFR-071), capacity 1,000 concurrent users (NFR-070). The team is small and operating servers is not a goal.

## Decision

Deploy on a managed PaaS with: a stateless web service (at least two instances), a worker service from the same build, managed PostgreSQL with a pooler, CDN for static assets, a private file store for exports, a secrets store, and preview environments per pull request. Environments: local, preview, staging, production. The vendor is chosen against the checklist in `DEPLOYMENT-ARCHITECTURE.md` section 8 and recorded by amending this ADR. Application and images stay container-portable and avoid proprietary runtime features.

## Consequences

- Low operations load, quick restores and preview deployments.
- Availability depends on the vendor's SLA; it must be reviewed against NFR-050 before selection.
- Platform request time limits and connection limits constrain design; long work runs in the worker.
- Cost grows with instances; staging load tests (NFR-002, NFR-003, NFR-072) set the sizing.
- Vendor migration is bounded work thanks to standard Postgres and containers.

## Alternatives

- Serverless-first platform: cold starts and database connection storms.
- Kubernetes or self-managed virtual machines: control at a cost not justified at this size.
- Single VPS: cheapest but weakest availability and recovery.
