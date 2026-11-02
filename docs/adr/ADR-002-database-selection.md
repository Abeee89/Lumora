# ADR-002 Database selection

> Status: Proposal, pending approval. Source of truth: Phase 2 PRD and Phase 1 docs.

## Status

Proposed.

## Context

Study data is relational and ownership-scoped. Requirements include referential integrity with no dangling links (NFR-092), soft-delete rules (NFR-093), UTC timestamps with a frozen local date (NFR-091), overlap detection for plan entries and manual sessions (EC-003, EC-011), optimistic versions (NFR-094), unique XP awards (NFR-095), statistics over 24 months in p95 1 s (NFR-003), 5 million sessions (NFR-070), and backups with 30-day retention (NFR-100). The job queue is decided as Postgres-backed (ADR-005).

## Decision

Use PostgreSQL as a managed service on the chosen PaaS (U-A1). The application and the job queue share one database. No schema is defined here; Phase 4 designs it.

## Consequences

- Constraints, transactions and range operations are available in the database, so integrity does not depend only on application code.
- Growth path: larger instance, read replica for statistics, pre-computed aggregates and partitioning of session data, with no redesign of the model (NFR-071, NFR-072).
- App and queue share a failure domain and connection budget; a pooler is required.
- Vendor change between managed Postgres offerings is a dump-and-restore, so U-A1 is low regret.
- Backup restores must replay account deletions (NFR-104).

## Alternatives

- MySQL: viable but weaker for range and constraint features.
- SQLite: no multi-instance managed story for 1,000 concurrent users.
- MongoDB: moves relational integrity into application code, risking NFR-092.
- A separate store for the queue (Redis): rejected for the MVP (ADR-005).
