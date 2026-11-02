# ADR-005 Background jobs

> Status: Proposal, pending approval. Source of truth: Phase 2 PRD and Phase 1 docs.

## Status

Proposed. The Postgres-backed queue was confirmed by the product owner.

## Context

Scheduled and asynchronous work: idle-session auto-close at 30 min without heartbeat (BR-006, FR-046), account purge within 30 days and re-purge after restore (NFR-031, NFR-104), exam auto-archive (EC-013), export generation and expiry (FR-130..132), audit retention of 90 days (NFR-020), and later reminders, streak evaluation, AI generation (30 s timeout) and weekly leaderboards. Jobs must be enqueued atomically with the data they depend on and must be safe to repeat (NFR-053).

## Decision

Use pg-boss on the application's PostgreSQL database, with consumers in a separate worker process built from the same repository. Jobs are enqueued through an outbox record written in the business transaction. Every job has an idempotency key; recurring jobs use singleton keys. Handlers are adapters that call application services. The catalog, retry policies and dead-letter handling are in `BACKGROUND-JOBS.md`.

## Consequences

- No additional infrastructure; jobs are covered by backups and restore drills (NFR-103).
- Queue load shares the database; polling overhead is monitored against NFR-002.
- Delivery is at least once, so every handler must be idempotent.
- Worker and web must always run the same build.
- If the queue becomes a bottleneck, it can move to a dedicated store behind the job interface (extraction trigger).
- Daily statistics rollups are deferred until p95 for statistics exceeds 700 ms.

## Alternatives

- BullMQ with Redis: higher throughput, extra infrastructure to host, secure and back up.
- Platform cron calling HTTP endpoints: no retries or back-pressure, endpoints must be secured.
- Serverless schedulers: vendor lock-in.
- In-process timers: lost on restart, duplicated across instances. Rejected.
