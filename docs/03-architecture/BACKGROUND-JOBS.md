# Lumora Background Jobs

> Status: Proposal, pending approval. Source of truth: Phase 2 PRD and Phase 1 docs.

Decision: a PostgreSQL-backed queue (pg-boss) executed by a separate worker process built from the same repository (D14, ADR-005). This document lists the jobs, how they are scheduled and retried, and how they are observed. It contains no schema and no code.

## 1. Mechanism

| Aspect | Design |
|---|---|
| Queue | pg-boss on the same managed PostgreSQL database as the application |
| Producers | Application services enqueue jobs inside the business transaction through an outbox record, so a job exists if and only if its data was committed (ADR-003) |
| Consumers | Worker service: same codebase, different entry point, no HTTP traffic. Handlers are adapters that call application services, the same as route handlers |
| Scheduling | pg-boss cron for recurring jobs; delayed jobs for one-offs (for example a reminder at a given instant) |
| Delivery | At least once. Every job carries an idempotency key and handlers are safe to run twice |
| Exclusivity | Recurring jobs use singleton keys so two worker instances never run the same tick concurrently |

## 2. Job catalog

Phase column shows when the job first runs. Triggers are cron (clock) or event (domain event / outbox). Retry policy abbreviations: standard = 3 attempts, exponential backoff starting at 30 s; patient = 8 attempts, backoff up to 1 h; none = next tick is the retry.

| Job | Trigger | Idempotency key | Retry policy | Owning module | Phase |
|---|---|---|---|---|---|
| Idle-session auto-close | Cron every minute | Run identifier + minute | none (next tick) | Timer / Study sessions | MVP |
| Account purge | Event on deletion request, plus daily sweep for accounts older than the grace period; completes within 30 days | User identifier + purge | patient | User profile (invokes purge handlers of all modules) | MVP |
| Backup re-purge after restore | Manual trigger by runbook after any restore, before service resumes | Restore identifier | patient | User profile | MVP |
| Exam auto-archive | Cron hourly; archives exams whose date is before the user's local today | Exam identifier + date | none (next tick) | Exams | MVP |
| Export generation | Event on export request | Export request identifier | standard | User profile (calls export contributors) | MVP |
| Export file expiry | Cron hourly; removes files older than 24 h | File identifier | none | User profile | MVP |
| Auth audit retention cleanup | Cron daily; deletes audit events older than 90 days | Date | none | Authentication | MVP |
| Password-reset token and expired-session cleanup | Cron daily | Date | none | Authentication | MVP |
| Password-reset email | Event on reset request | Reset request identifier | standard | Notifications | MVP |
| Daily rollups (statistics) | Not at MVP; added when statistics p95 exceeds 700 ms in load testing | User identifier + local date | standard | Analytics | Deferred |
| Reminders (daily study, plan entry) | Delayed jobs scheduled at the user's local reminder time; plan entry reminders 10 min before start | User identifier + reminder kind + local date or entry | standard | Notifications | 2 |
| Push delivery | Event from reminder job | Notification identifier | standard | Notifications | 2 |
| Streak and XP evaluation at local day end | Cron every 15 minutes finds users whose local day just ended | User identifier + local date | patient | Gamification | 2 |
| Exam readiness refresh | Event (TopicStatusChanged, TopicArchived) | Exam identifier + version | standard | Exams | 2 |
| AI schedule generation | Event on request; hard timeout 30 s on provider call | Generation request identifier | one retry only if no provider response received | AI scheduling | 3 |
| AI proposal expiry | Cron daily; removes unaccepted proposals older than 24 h | Proposal identifier | none | AI scheduling | 3 |
| Group leaderboard weekly compute | Cron weekly at each group's week boundary (Monday start, proposed) | Group identifier + week | standard | Study groups | 3 |
| Group invite expiry | Cron hourly; invalidates invites after 7 days | Invite identifier | none | Study groups | 3 |
| Invite email | Event on invite | Invite identifier | standard | Notifications | 3 |
| API rate limit counter cleanup | Cron every few minutes, only if counters are stored in the database | Window identifier | none | API integrations | 3 |

Notes:

- **Idle-session auto-close** closes runs with no heartbeat for more than 30 min at the last heartbeat and flags them auto-closed (BR-006, FR-046, EC-001). Running every minute bounds the late-close error to about 1 min after the 30 min threshold, which does not alter the recorded end time because it is the last heartbeat time.
- **Account purge** removes personal data within 30 days and from backups within 35 days (NFR-031) by retaining backups for 30 days and re-running purge after restores (NFR-104).
- **Daily rollups** are deliberately not part of the MVP. Statistics read sessions directly with efficient access by user and date (NFR-003, NFR-071). The trigger to add rollups is a measured p95 above 700 ms for the 24-month / 10,000-session case, leaving headroom to the 1 s target.
- **Export** runs in the worker because exporting 10,000 sessions within 60 s (NFR-005) should not occupy a web request; the file is a point-in-time snapshot taken when the job starts (EC-027) and expires after 24 h (FR-130..132).

## 3. Delivery and idempotency

1. A handler first checks whether the effect of its idempotency key already exists, then performs the effect and records it in one transaction.
2. Effects that call outside systems (email, push, AI) record an "attempted" marker before the call and handle a duplicate send with the provider's own idempotency support where available, otherwise accept at-most-one-duplicate for reminders.
3. Handlers receive only an identifier and parameters, never a copy of user content; they load current data. This keeps queue payloads free of personal and note content (NFR-063).

## 4. Time-zone-aware scheduling

- Cron expressions run in UTC. Jobs that depend on a user's local day do not use a global midnight.
- Reminder jobs compute the next UTC instant from the user's IANA zone and reminder time at scheduling, and reschedule after each run or after a timezone or preference change (FR-150, FR-154, EC-006).
- The streak and XP evaluation runs on a short cadence (every 15 minutes) and selects users whose local day, including their rollover hour, just ended and whose evaluation for that local date has not been recorded (BR-014, FR-009). Keying by user and local date makes late runs and retries safe (APPLICATION-FLOWS.md section 9).
- DST days of 23 or 25 hours need no special handling because boundaries are computed by the time module from the zone rather than by adding 24 h (EC-006).
- Group weekly boundaries are computed in the group's configured week definition, not each member's zone; the leaderboard counts sessions by their UTC instants within that week (proposed; confirm in Phase 4/6).
- The exam archive job compares the exam date to the user's local today so the exam is archived at the start of the next day in the profile timezone (EC-013, FR-124).

## 5. Retry and dead-letter handling

| Step | Behavior |
|---|---|
| Failure | The job is retried per its policy with exponential backoff and jitter |
| Exhaustion | The job moves to a dead-letter state with the failure reason (scrubbed) |
| Alerting | Any dead-lettered job raises an alert to the on-call channel; dead jobs older than 7 days are reviewed |
| Replay | A dead job can be re-enqueued manually by an operator after the cause is fixed; replay is safe because of idempotency keys |
| Poison jobs | A job that fails immediately and repeatedly for the same input is parked rather than retried indefinitely |
| User-visible effects | Export and AI jobs report failure states to the user (export failed, schedule failed) with a retry option (FR-132, FR-197) |

## 6. Observability

- Every execution logs job name, idempotency key, attempt, duration and result with the request ID of the originating request when there is one (NFR-063).
- Queue depth, oldest job age, failure count and dead-letter count are exposed as metrics or periodic log lines; thresholds alert when the auto-close job misses more than 5 consecutive ticks, because that threatens NFR-051.
- A job that exceeds twice its expected duration is flagged.
- Error tracking receives unexpected handler errors, scrubbed of personal content.

## 7. Worker scaling

- Start with one worker instance; the singleton keys make running two safe.
- Scale horizontally by adding instances when queue age grows. Concurrency per instance is configurable per job type, with lower limits for AI and export jobs.
- Database connection budget: the web instances and workers share connection limits through a pooler (DEPLOYMENT-ARCHITECTURE.md section 5).
- If queue polling measurably degrades p95 targets (NFR-002), the extraction trigger in SYSTEM-ARCHITECTURE.md section 3 applies: move the queue to a dedicated store behind the same job interface.
- Deployment of the worker is independent of the web service, but both must run the same version of module code during a release (DEPLOYMENT-ARCHITECTURE.md section 4).
