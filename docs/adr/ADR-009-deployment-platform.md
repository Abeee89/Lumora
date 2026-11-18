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

## M00 evidence update

Date: 2026-11-18. Status stays Proposed. The spike record is [M00-EVIDENCE](../08-build/M00-EVIDENCE.md).

| Claim | Observation | State |
|---|---|---|
| Local PostgreSQL | Embedded PostgreSQL 18.6 on Windows; `btree_gist` 1.8 installed; `version()` reported the x86_64-windows build | PASS for the local floor |
| Vendor PostgreSQL | No vendor instance, no TLS, no pooler | NOT TESTED |
| Backups and PITR | No backup, restore, PITR or restore drill | NOT TESTED |
| Worker service | No vendor worker service was deployed | NOT TESTED |
| Region, SLA, price, DPA | No contract, quote, SLA, region or DPA was read | NOT TESTED |
| Error tracking | No vendor project and no token/email scrub test | NOT TESTED |
| Email provider | Local sink only; no provider sandbox (U-05) | NOT TESTED |

The embedded PostgreSQL 18.6 beta satisfies the local version floor but is not a vendor-managed service and is not a production baseline. Every vendor row in `DEPLOYMENT-ARCHITECTURE.md` section 8 remains blocked by U-02. No vendor is recommended and no platform is accepted. The next action is an owner-approved shortlist and trial account, not more local testing.

## Alternatives

- Serverless-first platform: cold starts and database connection storms.
- Kubernetes or self-managed virtual machines: control at a cost not justified at this size.
- Single VPS: cheapest but weakest availability and recovery.
