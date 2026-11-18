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

## M00 evidence update

Date: 2026-11-18. Status stays Proposed. The spike record is [M00-EVIDENCE](../08-build/M00-EVIDENCE.md). It used pg-boss 12.38.2 on a scratch PostgreSQL 18.6 database with no connection pooler.

| Claim | Observation | State |
|---|---|---|
| Atomic enqueue | `boss.send(..., { db: { executeSql } })` inside a manual transaction: rollback left 0 `pgboss.job` rows; commit left exactly 1 | PASS |
| Outbox coupling | A rollback left 0 `outbox_events` rows; a commit left 1; a dispatcher called twice created 1 job, with 0 on the second call | PASS |
| At-least-once delivery | A handler that threw once was attempted twice; the idempotent effect row stayed at 1 and `retry_count` was 1 | PASS for a thrown error |
| Pooler mode | No managed pooler and no vendor trial existed; transaction and session modes were not exercised | NOT TESTED |
| Operational controls | No dead-letter test, backoff schedule, queue-age alert, PITR, restore drill, worker service or SLA observation | NOT TESTED |

The local evidence supports the outbox-based enqueue and an idempotent handler. It does not select a pooler mode. The fallback remains a direct or session-mode connection for the worker and a transaction-mode pooler with prepared statements disabled for web traffic. The spike does not prove vendor behavior or production readiness.

## Alternatives

- BullMQ with Redis: higher throughput, extra infrastructure to host, secure and back up.
- Platform cron calling HTTP endpoints: no retries or back-pressure, endpoints must be secured.
- Serverless schedulers: vendor lock-in.
- In-process timers: lost on restart, duplicated across instances. Rejected.
