# Backup and restore

> Status: Proposal, pending approval. Source of truth: Phase 2 PRD and Phase 1 docs.

Backup, restore and drill procedure for the Lumora PostgreSQL database. Requirements: daily backups kept 30 days (NFR-100), RPO of 24 hours or less (NFR-101), RTO of 8 hours or less (NFR-102), a restore drill every quarter (NFR-103), deleted accounts stay deleted after any restore (NFR-104), personal data gone from backups within 35 days (NFR-031). Platform detail depends on the hosting vendor (U-A1, DEPLOYMENT-ARCHITECTURE); this document states what must be true, not vendor commands.

Cross references: deletion and retention in [DATA-LIFECYCLE](DATA-LIFECYCLE.md); integrity rules in [DATABASE-CONSTRAINTS](DATABASE-CONSTRAINTS.md); transaction boundaries in [DATABASE-DESIGN](DATABASE-DESIGN.md) R10.

## 1. Strategy

| Layer | What | Frequency | Retention | Location |
| --- | --- | --- | --- | --- |
| Provider backup | Automated base backup of the whole instance | Daily | 30 days | Provider |
| Point-in-time recovery | WAL archive, if the vendor offers it | Continuous | 30 days | Provider |
| Logical dump | `pg_dump -Fc` of the `public` schema data plus the `pgboss` schema definition, encrypted | Weekly | 30 days, never longer | Storage in a different provider and account |
| Deletion register mirror | Append-only list of purged `user_id` values | On each purge | Until the oldest backup could contain the user, then no longer needed; kept at most 35 days after the purge | Private bucket, separate from backups |

- RPO: daily backups alone give 24 hours at worst. PITR, when available, narrows it to minutes. If the chosen vendor has no PITR, the 24 hours is the commitment.
- Retention must not exceed 30 days for any copy that holds personal data. A longer retention would break the 35-day purge bound (NFR-031).
- Encryption: provider backups encrypted at rest; the logical dump encrypted with a key held outside the database host. Access to backups and keys is limited to two named operators.
- `pgboss` data is excluded from the logical dump because queued jobs are replayable from `outbox_events` and every handler is idempotent (ADR-011 item 6). The `pgboss` schema is created by the library on first start.
- Before every production migration (DEPLOYMENT stage 9) the operator records the latest restorable point (backup id or timestamp) in the release record. Migrations are expand and contract only, so the previous application version can run against the new schema.

## 2. Restore rules

1. Restore always goes to a new instance. Never restore in place over the live database.
2. The new instance is read-only until all checks in section 3 pass.
3. A restore replays deletions (step 5) before any user traffic reaches it.
4. The decision to restore, the restore point chosen and the data window lost are recorded by the incident owner.

## 3. Restore runbook

Targets are cumulative budgets inside the 8 hour RTO (NFR-102).

| Step | Action | Budget |
| --- | --- | --- |
| 1 | Provision a new PostgreSQL instance of the same major version (15 or newer) and extension set (`btree_gist`). | 1 h |
| 2 | Restore the chosen provider backup or point in time. If the provider is unavailable, restore the latest weekly logical dump with `pg_restore` and accept up to 7 days of data loss, recorded as an RPO breach. | 2 h |
| 3 | Set `default_transaction_read_only = on` for the application and worker roles. The operator and migration roles keep write access for steps 4, 5 and 7. | 5 min |
| 4 | Run the migration check: compare the Drizzle migration journal with the repository; apply any pending migration with the migration role if the backup predates it. | 30 min |
| 5 | Deletion replay (NFR-104). Read the deletion register mirror; for every listed `user_id` that still exists in `users`, run the purge job (DATA-LIFECYCLE section 3, steps 1 to 4). Also read `account_deletion_log` from the restored database and purge every row with `purged_at IS NOT NULL` whose user still exists. | 1 h |
| 6 | Integrity queries (section 4). All must return zero offending rows. | 1 h |
| 7 | Force re-login: set `revoked_at = now()` on every `auth_sessions` row, because the restored token state may differ from what clients hold. Leave `timer_runs` alone: the auto-close job closes stale runs at their `last_heartbeat_at` (BR-006), which is the correct end time after a restore. | 15 min |
| 8 | Repoint the application connection string to the restored instance, still read-only. Run read-only smoke checks: load statistics and the session list for a test account, confirm the health check reports the database reachable. | 30 min |
| 9 | Lift read-only (`default_transaction_read_only = off`) and start the worker. pg-boss recreates its schema if absent. Relay `outbox_events WHERE relayed_at IS NULL`; handlers are idempotent so repeated jobs are safe. | 30 min |
| 10 | Run write smoke checks: sign in, start and stop a timer, create an export. Announce the data window that was lost. | 5 min |

Sum of budgets: about 6.9 hours, leaving about 1.1 hours margin inside the 8 hour RTO.

## 4. Integrity queries

Run on the restored instance before step 8. Each query must return no rows (or the stated value).

| Check | Intent |
| --- | --- |
| Orphan scan per composite-FK table | Rows whose `subject_id`/`user_id` pair has no subject, and topic/subject pairs without a topic (`study_sessions`, `plan_entries`, `timer_runs`, `todos`, `notes`, `flashcards`, `exams`, `exam_topics`, `subject_goals`). Foreign keys prevent these, so rows signal a corrupted or partially restored dump (NFR-092). |
| Sessions without day rows | `study_sessions s LEFT JOIN study_session_days d ON d.session_id = s.id WHERE d.session_id IS NULL` |
| Day sum mismatch | `GROUP BY session_id HAVING SUM(d.seconds) <> s.duration_seconds` (NFR-096, R6) |
| One timer per user | Guaranteed by `uq_timer_runs_user`; the check confirms the index exists and is valid in `pg_index`. |
| Open segments | `timer_run_segments` with more than one open segment per run, or runs with no segments. |
| XP uniqueness | The `uq_xp_ledger_award` index exists and is valid. |
| Constraint validity | `SELECT conname FROM pg_constraint WHERE NOT convalidated` returns no rows. |
| Outbox backlog | `SELECT count(*) FROM outbox_events WHERE relayed_at IS NULL`; compare with the expected backlog from the monitor before the incident. |
| Deleted accounts | No row in `users` whose id is in the deletion register or has `account_deletion_log.purged_at` set. |

## 5. Deletion register

- Written by the purge job after `DELETE FROM users` succeeds (DATA-LIFECYCLE section 3, step 5): one append-only object per user id, in a private bucket separate from the backups.
- Read by restore step 5.
- Kept at most 35 days after the purge, matching the age-out of the oldest backup that could hold the user.
- If the mirror is lost: the product owner supplies the list of deleted accounts from the application request logs (account deletion events are logged with request id and user id, NFR-063). This is manual and flagged as a risk. Missing a user means an account that asked for deletion may reappear until the next purge; the owner accepts this risk before relying on the fallback.
- If `account_deletion_log` and the mirror both survive, the union is purged.

## 6. Partial failures

| Situation | Handling |
| --- | --- |
| pg-boss state lost or inconsistent | Drop and recreate the `pgboss` schema. Relay unrelayed outbox rows. Re-run daily scheduled jobs; evaluation rows act as "done" markers (`daily_evaluations`), so reruns are safe. |
| Backup restores but a migration is newer than the backup | Apply the pending expand migration (step 4). Contract migrations are only released a version after the expand, so the older schema is accepted by the current code. |
| Restore point predates a user's account | That user is lost with the data window. Communicate the window; do not recreate accounts by hand. |
| Restore point predates a deletion | Step 5 repeats it. |
| Weekly dump used instead of a provider backup | Record as an RPO breach (up to 7 days). Reconcile with `data_exports` and statistics totals before opening. |
| Export files in object storage | Not part of the database backup. Missing files after restore mark the row `failed` with `error_code = 'file_missing'` and the user may request a new export. |

## 7. Quarterly restore drill (NFR-103)

Run each quarter on a staging instance restored from a production backup. Record the result in the operations log.

Checklist:

1. Pick a backup at least 24 hours old, and one from earlier in the 30-day window.
2. Time every step of section 3 from provisioning to smoke check.
3. Run all integrity queries in section 4.
4. Deletion check: choose an account purged after the backup point, run step 5, and confirm the user is gone and the deletion register entry exists.
5. Confirm the restored application and worker roles cannot write until step 9.
6. Confirm the oldest backup is no older than 30 days and the oldest weekly dump no older than 30 days.
7. Destroy the staging instance and its copy of the data.

Record fields: drill date; operator; backup id and its age; restore method (provider or logical); minutes per step; total elapsed time against the 8 hour RTO; data window lost against the 24 hour RPO; integrity results; deletion check result; defects found; follow-up owner and due date.

## 8. Open items

- Whether the vendor offers PITR, and the retention it gives (U-A1, U-A5). Without it, the 24 hour RPO stands unchanged.
- Name and location of the second storage provider for the weekly dump.
- Names of the two operators with backup access.
