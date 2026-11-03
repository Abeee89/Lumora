# Data lifecycle

> Status: Proposal, pending approval. Source of truth: Phase 2 PRD and Phase 1 docs.

How each kind of data is created, changed, removed and retained. Table definitions: [DATA-DICTIONARY](DATA-DICTIONARY.md). Delete actions: [DATABASE-CONSTRAINTS](DATABASE-CONSTRAINTS.md) section 3. Rules: [DATABASE-DESIGN](DATABASE-DESIGN.md) R4 and R5. Recovery: [BACKUP-RESTORE](BACKUP-RESTORE.md).

All cleanup jobs run in the worker (BACKGROUND-JOBS), are idempotent and delete in bounded batches (for example 1,000 rows per statement) to avoid long locks.

## 1. Table lifecycle

| Table or group | Created by | Changed by | Removed by | Retention |
| --- | --- | --- | --- | --- |
| users, auth_accounts | Registration, Google sign-in (FR-001, FR-003) | Sign-in counters, password change, deletion request | Account purge | Until account purge |
| auth_sessions | Sign-in | Activity extends `expires_at`; user revoke | Cleanup job; account purge | Deleted 7 days after `expires_at` or `revoked_at` |
| auth_verifications | Reset request (FR-005) | Consume | Cleanup job; account purge | Deleted 24 hours after expiry or consumption |
| auth_audit_events | Auth events (NFR-020) | Never | Retention job; account purge | 90 days |
| user_profiles, timer_settings, flashcard_settings, notification_preferences | Registration or first change | User edits | Account purge | Until account purge |
| data_exports | Export request (FR-130..132) | Export job progress | Expiry job; account purge | File deleted at `expires_at` (completion plus 48 hours); row kept 30 days after that |
| account_deletion_log | Deletion request | Purge job sets `purged_at` | Age-out job | 35 days after `purged_at` |
| subjects, topics | User | User edits; archive and restore | Account purge only | Until account purge (BR-029, NFR-093) |
| exams, exam_topics | User | User edits; checklist | Account purge only; `exam_topics` also on subject change (FR-121) | Until account purge (BR-025) |
| plan_entries | User, AI accept | User edits while not past (BR-028); missed mark | User delete; account purge | Until the user deletes them |
| study_sessions | Timer stop, auto-close, manual entry | User edit (FR-043) | User delete (FR-044); account purge | Until the user deletes them |
| study_session_days | Written with the session | Rewritten on time edit | Cascade from session | Follows the session |
| timer_runs, timer_run_segments | Timer start | Pause, resume, heartbeat, phase change | Stop, discard, auto-close; account deletion request | Minutes to hours; none after stop |
| todos, notes, flashcards | User | User edits | User delete; account purge | Until the user deletes them. Notes are deleted only while their subject is active |
| card_reviews | Flashcard rating | Never | Cascade from card; account purge | Until the card or account is removed |
| daily_goal_history, subject_goals | User, registration | User edits | Account purge | Until account purge; history is never pruned (BR-015) |
| user_gamification, daily_evaluations | Evaluation job | Evaluation job | Account purge | Until account purge |
| xp_ledger | Awarding service | Never updated; compensating rows appended | Account purge only | Until account purge (R3) |
| notifications | Scheduling job | Delivery, dismissal | Cascade from plan entry; cleanup job; account purge | Deleted 30 days after `due_at` |
| push_subscriptions | Browser subscription | `last_used_at` | Unsubscribe; invalid endpoint response; account purge | Until removed |
| ai_consents | Consent decision | Never (append only) | Account purge | Until account purge |
| ai_generation_requests | Generation request | Provider result; accept | Expiry job; account purge | `proposal` set to NULL at 24 hours; row deleted at 30 days |
| groups | Group create | Admin edits | Deleted by the last member leaving or purge handler | Until empty |
| group_members | Join | Role change; sharing toggle | Leave, removal, account purge | Until removed |
| group_invites | Admin | Accept, revoke | Cleanup job; cascade | Deleted 30 days after expiry, revocation or acceptance |
| group_reports | Member report | Never | Cascade from group or target; reporter set to NULL | Until the group is dissolved or the target is deleted |
| api_keys | User | `last_used_at`, revoke | Account purge | Revoked rows kept until account purge (FR-220) |
| idempotency_keys | Keyed create | Never | Cleanup job; account purge | 7 days (R8) |
| outbox_events | Business transaction | Relay sets `relayed_at` | Cleanup job | Relayed rows deleted after 7 days |
| rate_limit_counters | Request | Increment | Cleanup job (every 5 minutes) | Rows older than 10 minutes |

## 2. Delete matrix

What disappears, what stays, and how history is labelled.

| Action | Disappears | Stays | History label |
| --- | --- | --- | --- |
| Archive subject (FR-013) | Subject, its topics, open plan entries, to-dos, notes and per-subject goal from pickers and lists | All rows; all sessions; all statistics | Statistics show "<name> (archived)" |
| Restore subject (FR-014) | Nothing | Everything reappears without a data rewrite | None. A name clash asks for a new name |
| Archive topic | Topic from pickers and exam readiness | Sessions, notes, to-dos, exam rows | Topic shown as archived in history (EC-008) |
| Delete plan entry (EC-022) | The entry; its reminder (cascade) | All linked sessions with `plan_entry_id` set to NULL | Sessions appear as unplanned |
| Delete session (FR-044) | Session, its day rows | XP rows | XP corrected by a compensating row (R3, EC-017) |
| Edit session times (FR-043) | Old day rows | The session | XP adjusted by compensating row with new `source_revision` |
| Delete to-do | The to-do | XP rows | XP unchanged (BR-019 allows removal only for session deletion or correction) |
| Delete note | The note | Nothing else | None |
| Delete flashcard | The card, its reviews (cascade) | Nothing else | None |
| Exam | Never deleted by the user | The exam | Archived when `exam_date` is before today in the profile zone (BR-025) |
| Delete group | Group, members, invites, reports (cascade) | Members' own study data | None |
| Member leaves or is removed (EC-018) | Membership row | Own study data; past invite rows | Rejoining needs a new invite |
| Revoke API key | Access | The key row, flagged `revoked_at` | Shown as revoked |
| Delete account (BR-032, EC-019) | Everything owned, per section 3 | `account_deletion_log` row, anonymous `account_deleted` audit row, group content other members own | None |

## 3. Account deletion

Timing (default, overridable by the product owner, see DATABASE-DESIGN section 5): the purge runs within 24 hours of the request. NFR-031 allows 30 days. A longer window adds an undo period and changes no schema.

**Request (one transaction):**

1. Set `users.deletion_requested_at`. Sign-in refuses such accounts.
2. Revoke all `auth_sessions`.
3. Delete the user's `timer_runs` (segments cascade). A running timer is not saved (EC-019).
4. Remove the user's `group_members` rows. For each group where the user was the last admin, promote the member with the smallest `joined_at` first; delete the group if no member remains (R7).
5. Insert `account_deletion_log (user_id, requested_at)`.
6. Enqueue the purge job through the outbox.

**Purge job:**

1. Run module purge handlers for data outside PostgreSQL: delete export files, unsubscribe push endpoints, delete the user's objects in file storage.
2. `DELETE FROM users WHERE id = $1`. Every owned row cascades (DATABASE-CONSTRAINTS section 2.1). `groups.created_by`, `group_invites.accepted_by_user_id` and `group_reports.reporter_user_id` become NULL.
3. Insert `auth_audit_events (event_type = 'account_deleted', user_id NULL)` with no address or user agent.
4. Set `account_deletion_log.purged_at`.
5. Append the user id to the deletion register mirror (private object storage, append only, BACKUP-RESTORE section 5).

The job is idempotent: if the user row is gone, only steps 3 to 5 are finished.

**Backups.** Provider backups age out after 30 days and the weekly dump after 30 days, so the last copy of the data disappears within 35 days of deletion (NFR-031). After any restore, the deletion register is replayed before service resumes (NFR-104).

## 4. Export

- Contents (FR-130..132): sessions, plan entries, subjects, topics, to-dos, notes and exams (seven types), plus the profile and goals. Archived subjects and topics are included and marked archived (FR-131, AC-FR-131-3). Flashcards and XP are included when those phases are live.
- Consistency: the export job opens one transaction at `REPEATABLE READ READ ONLY`, records `snapshot_at`, and each module's contributor reads from that snapshot, so a session saved mid-export appears in the next export, not as a partial row (EC-027).
- Output: CSV (one file per type) or one JSON file, written to private object storage under `file_key`. A user has at most one running export (`uq_data_exports_running`).
- Verification: the sum of session durations in the file equals the statistics total (AC-FR-130-3).
- Expiry: file deleted at `expires_at` (completion plus 48 hours; at least 24 hours is required by FR-132). The row is kept 30 days so the user sees the history, then deleted.
- No other user's data may appear (AC-FR-130-4). Every contributor query is scoped by `user_id`.

## 5. Historical correctness rules

1. A session keeps its `timezone`, `local_date` and `day_rollover_hour` from its start. A profile change never rewrites them (EC-006, NFR-091).
2. A plan entry keeps its `timezone` and `local_date` from the time its start was last set.
3. A daily goal applies from `effective_from`; past days keep the target in force on their date (BR-015, FR-074).
4. `daily_evaluations` rows are never recomputed after a timezone change. Streak history and freeze usage stay as recorded (BR-022).
5. `xp_ledger` is never deleted or edited. Corrections are new rows (R3).
6. Subjects, topics and exams are never hard-deleted by users (R4).
7. `study_session_days` is rewritten in the same transaction as any change to its session, so the sum of day rows always equals the session duration (NFR-096).
8. A midnight crossing is allocated by the session's frozen zone and rollover hour, not by the zone the user has now (EC-009).
