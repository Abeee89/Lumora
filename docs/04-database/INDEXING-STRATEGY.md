# Indexing strategy

> Status: Proposal, pending approval. Source of truth: Phase 2 PRD and Phase 1 docs.

Every index beyond primary keys and the unique constraints listed in [DATABASE-CONSTRAINTS](DATABASE-CONSTRAINTS.md) section 4. Index names follow `ix_<table>_<cols>`. Table and column definitions are in [DATA-DICTIONARY](DATA-DICTIONARY.md); the per-diagram placement is in [PHYSICAL-ERD](PHYSICAL-ERD.md).

## 1. Principles

1. Index for a named query shape and a requirement. Indexes that serve only a guess are not added.
2. Every user-owned table can be reached by `user_id` without a scan, because ownership scoping (NFR-016) and the `users` cascade at account purge (NFR-031) both filter on it. A partial index does not qualify for this purpose, because the foreign key checks and cascades are not guaranteed to prove the predicate.
3. Every foreign key column is the leading column of some full index (or a partial index whose predicate follows from an equality test, noted below), so a parent delete or update never scans the child (R4 NO ACTION checks, EC-022 SET NULL).
4. Covering indexes (`INCLUDE`) are used for statistics so the heatmap and daily totals can be answered by index-only scans (NFR-003).
5. Unique constraints already create indexes. They are listed in section 9 so they are not duplicated.

## 2. Study sessions and calendar statistics

| Index | Definition | Serves | Requirement |
| --- | --- | --- | --- |
| ix_study_sessions_user_started | `(user_id, started_at DESC)` | Session list and history, newest first; latest session for a user | FR-043, NFR-002 |
| ex_study_sessions_overlap (GiST) | created by the exclusion constraint | Overlap detection on manual add and edit | EC-011 |
| ix_study_sessions_plan_entry | `(plan_entry_id) WHERE plan_entry_id IS NOT NULL` | Planned versus actual per entry; the `SET NULL` action when an entry is deleted. The planner proves the predicate from `plan_entry_id = $1`, since `=` is strict. | BR-001..004, EC-022 |
| ix_study_sessions_subject | `(subject_id)` | Foreign key check on subject; sessions by subject for the session list filter | R4 |
| ix_study_sessions_topic | `(topic_id) WHERE topic_id IS NOT NULL` | Foreign key check on topic | EC-008 |
| ix_study_session_days_user_date | `(user_id, local_date) INCLUDE (seconds, subject_id)` | Daily totals, calendar heatmap, goal progress, 24-month range scans | NFR-003, NFR-072, BR-014 |
| ix_study_session_days_user_subject_date | `(user_id, subject_id, local_date) INCLUDE (seconds)` | Subject statistics and per-subject goal progress | BR-013, NFR-003 |
| ix_plan_entries_user_starts | `(user_id, starts_at)` | Plan calendar by week and month; next upcoming entry | FR-037, FR-062 |
| ix_plan_entries_user_date | `(user_id, local_date)` | Planned minutes per local day for variance | BR-004 |
| ix_plan_entries_subject | `(subject_id)` | Foreign key check on subject | R4 |
| ix_plan_entries_topic | `(topic_id) WHERE topic_id IS NOT NULL` | Foreign key check on topic | EC-008 |

Query shape, daily totals for a range:

```sql
SELECT local_date, SUM(seconds)
FROM study_session_days
WHERE user_id = $1 AND local_date BETWEEN $2 AND $3
GROUP BY local_date;
```

This is an index-only scan on `ix_study_session_days_user_date` after the visibility map is current.

## 3. Tasks, notes, catalog

| Index | Definition | Serves | Requirement |
| --- | --- | --- | --- |
| ix_subjects_user_position | `(user_id, position)` | Subject list and picker (the query adds `archived_at IS NULL`); user scoping and cascade | FR-010, NFR-016 |
| uq_subjects_active_name | unique partial, see constraints | Duplicate name check | FR-010 |
| ix_topics_subject_position | `(subject_id, position)` | Topics of a subject in order; foreign key check on subject. Full rather than partial so cascade checks can use it; topic counts per subject are small. | FR-017, R4 |
| ix_topics_user | `(user_id)` | User scoping and purge cascade | NFR-016 |
| ix_exams_user_date | `(user_id, exam_date)` | Exam list by nearest date, countdown | FR-123 |
| ix_exams_subject | `(subject_id)` | Foreign key check on subject | R4 |
| ix_exam_topics_topic | `(topic_id)` | Foreign key check on topic; exams that include a topic | EC-008 |
| ix_todos_user_list | `(user_id, done, priority, due_date NULLS LAST, created_at)` | Default list: open first, by priority, due date, age | FR-095 |
| ix_todos_open_due | `(user_id, due_date) WHERE done = false` | Overdue and due-today filters | FR-095 |
| ix_todos_subject | `(subject_id) WHERE subject_id IS NOT NULL` | Foreign key check on subject | R4 |
| ix_todos_topic | `(topic_id) WHERE topic_id IS NOT NULL` | Foreign key check on topic | EC-008 |
| ix_notes_user_subject | `(user_id, subject_id, updated_at DESC)` | Notes of a subject, newest first | FR-100 |
| ix_notes_subject | `(subject_id)` | Foreign key check on subject | R4 |
| ix_notes_topic | `(topic_id) WHERE topic_id IS NOT NULL` | Notes of a topic; foreign key check | FR-100 |
| ix_subject_goals_subject | `(subject_id)` | Foreign key check on subject | R4 |

Priority ordering High, Medium, Low is exact in the query with `CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END`. The index orders by the text value, which is not the business order, so the index narrows to the user's open rows and the sort runs on at most 500 rows per user, which satisfies NFR-002 (FR-095).

## 4. Timer

| Index | Definition | Serves | Requirement |
| --- | --- | --- | --- |
| ix_timer_runs_heartbeat | `(last_heartbeat_at)` | Auto-close job: runs with no heartbeat for 30 minutes | BR-006 |
| ix_timer_runs_subject | `(subject_id)` | Subject archive guard; foreign key check | FR-013 |
| ix_timer_runs_topic | `(topic_id) WHERE topic_id IS NOT NULL` | Foreign key check on topic | EC-008 |
| ix_timer_runs_plan_entry | `(plan_entry_id) WHERE plan_entry_id IS NOT NULL` | `SET NULL` action on plan entry delete | EC-022 |

`uq_timer_runs_user` serves the per-user lookup on page load and the one-timer rule.

## 5. Flashcards and reviews (Phase 2)

| Index | Definition | Serves | Requirement |
| --- | --- | --- | --- |
| ix_flashcards_user_due | `(user_id, due_date)` | Daily queue: cards due on or before today | FR-109 |
| ix_flashcards_subject | `(subject_id) WHERE subject_id IS NOT NULL` | Foreign key check on subject | R4 |
| ix_flashcards_topic | `(topic_id) WHERE topic_id IS NOT NULL` | Foreign key check on topic | EC-008 |
| ix_card_reviews_user_date | `(user_id, local_date)` | Reviews done today against the daily limit | FR-111 |
| ix_card_reviews_card | `(card_id, reviewed_at DESC)` | Foreign key check; history of one card | FR-110 |

## 6. Gamification and group leaderboard

| Index | Definition | Serves | Requirement |
| --- | --- | --- | --- |
| ix_xp_ledger_user_date | `(user_id, local_date) INCLUDE (amount)` | Daily XP for the 600 cap | BR-018 |
| ix_xp_ledger_user_amount | `(user_id) INCLUDE (amount)` | XP total as a sum, for level | FR-175 |
| ix_study_session_days_ranked | `(user_id, local_date) INCLUDE (seconds) WHERE is_ranked` | Weekly leaderboard minutes | FR-207, EC-025 |
| ix_group_members_user | `(user_id)` | Groups of a user; user cascade | R7 |
| ix_group_invites_group | `(group_id)` | Invites of a group; foreign key check | EC-018 |
| ix_group_invites_created_by | `(created_by)` | User cascade | NFR-031 |
| ix_group_invites_accepted_by | `(accepted_by_user_id)` | `SET NULL` on user delete | NFR-031 |
| ix_group_reports_group | `(group_id)` | Reports of a group; foreign key check | FR-209 |
| ix_group_reports_target | `(target_user_id)` | User cascade | NFR-031 |
| ix_group_reports_reporter | `(reporter_user_id)` | `SET NULL` on user delete | NFR-031 |
| ix_groups_created_by | `(created_by)` | `SET NULL` on user delete | NFR-031 |

Weekly leaderboard query shape: members of the group (at most 100, FR-208) with `share_weekly_minutes = true`, joined to `ix_study_session_days_ranked` for the Monday to Sunday range of each member's own zone. Cost is the member count times a short range scan.

## 7. Jobs, housekeeping and settings

| Index | Definition | Serves | Requirement |
| --- | --- | --- | --- |
| ix_outbox_unrelayed | `(id) WHERE relayed_at IS NULL` | Relay loop; claim 100 rows with `FOR UPDATE SKIP LOCKED` | ADR-005 |
| ix_auth_sessions_user | `(user_id)` | Session list; revoke all; user cascade | NFR-013 |
| ix_auth_sessions_expires | `(expires_at)` | Expiry cleanup | DATA-LIFECYCLE |
| ix_auth_verifications_user | `(user_id)` | User cascade | NFR-031 |
| ix_auth_verifications_expires | `(expires_at)` | Expiry cleanup | FR-005 |
| ix_auth_audit_user_time | `(user_id, occurred_at)` | Per-user audit view; user cascade | NFR-020 |
| ix_auth_audit_time | `(occurred_at)` | 90-day retention delete | NFR-020 |
| ix_idempotency_expires | `(expires_at)` | 7-day retention delete | R8 |
| ix_notifications_user_due | `(user_id, due_at)` | Inbox for a user; user cascade | FR-152 |
| ix_notifications_due_undelivered | `(due_at) WHERE delivered_at IS NULL` | Delivery job | FR-150, FR-151 |
| ix_notifications_plan_entry | `(plan_entry_id) WHERE plan_entry_id IS NOT NULL` | Cascade from plan entry delete | FR-151 |
| ix_push_subscriptions_user | `(user_id)` | Subscriptions of a user; user cascade | FR-153 |
| ix_data_exports_user | `(user_id, created_at DESC)` | Export list | FR-132 |
| ix_data_exports_expires | `(expires_at) WHERE status = 'completed'` | File expiry job | FR-132 |
| ix_api_keys_user | `(user_id)` | Key list; active key count; user cascade | FR-220 |
| ix_ai_consents_user_feature | `(user_id, feature, decided_at DESC)` | Latest consent | NFR-036 |
| ix_ai_requests_user_quota | `(user_id, quota_local_date)` | Daily quota count | EC-016 |

## 8. User-leading index coverage

Tables whose `user_id` foreign key is served by a primary key or unique constraint leading with `user_id`: `user_profiles`, `timer_settings`, `flashcard_settings`, `daily_goal_history`, `subject_goals`, `user_gamification`, `daily_evaluations`, `notification_preferences`, `idempotency_keys`, `xp_ledger` (via `uq_xp_ledger_award`), `timer_runs` (`uq_timer_runs_user`), `auth_accounts` (`uq_auth_accounts_user_provider`), `account_deletion_log` (no foreign key). Tables with a dedicated `user_id`-leading index: all others in sections 2 to 7.

Tables without a `user_id` column, reached through their parent key: `exam_topics` (`exam_id` leads the primary key), `timer_run_segments` (`run_id` leads the primary key), `group_invites` and `group_reports` (via `group_id`), `outbox_events` and `rate_limit_counters` (no owner).

## 9. Indexes created by constraints

These already exist and are not repeated above: every primary key; `uq_users_email`; `uq_auth_accounts_*`; `uq_auth_sessions_token`; `uq_auth_verifications_token`; `uq_data_exports_running`; `uq_subjects_id_user`, `uq_subjects_active_name`; `uq_topics_id_subject`; `uq_exams_id_user`, `uq_exams_id_subject`; `uq_plan_entries_id_user`; `uq_study_sessions_request`, `uq_study_sessions_id_user_subject`; `uq_timer_runs_user`, `uq_timer_segments_open`; `uq_card_reviews_request`; `uq_daily_evaluations_freeze`; `uq_xp_ledger_award`; `uq_notifications_daily`, `uq_notifications_plan`; `uq_push_subscriptions_endpoint`; `uq_ai_requests_pending`; `uq_group_invites_token`; `uq_api_keys_hash`; `uq_outbox_key`.

## 10. Search

No search index at MVP. No functional requirement asks for note or topic search. If one is approved: GIN with `pg_trgm` on `notes.title` and a generated `tsvector` column with a GIN index on `notes.body`.

## 11. Write cost

A session insert writes one `study_sessions` row (indexes: primary key, request key, id/user/subject unique, GiST overlap, user-started, subject, plan entry, topic), one or two `study_session_days` rows (primary key, user-date, user-subject-date, ranked), and an outbox row. That is about ten index entries per session. At 5 million sessions (NFR-070) and a human logging rate of a handful of sessions per user per day, this is far below the write capacity of one PostgreSQL instance. If a measured need appears, `ix_study_sessions_subject` and `ix_study_sessions_topic` are the first candidates to drop, at the price of a scan on the rare subject or topic hard delete.

## 12. Performance verification plan

1. Seed staging (DEPLOYMENT) with 10,000 sessions for one user across 24 months, then 100,000 sessions across a hundred users, then a 5 million session table for the capacity target (NFR-070).
2. Run `EXPLAIN (ANALYZE, BUFFERS)` for each shape: 24-month daily totals, month heatmap, subject totals, to-do list of 500, flashcard queue, weekly leaderboard for a group of 100, overlap check on manual add, auto-close scan, outbox claim.
3. Accept when the plan uses the named index (index-only scan for the covering ones) and the end-to-end p95 meets NFR-003 and NFR-072 at 10x data.
4. Trigger for the rollup table: statistics p95 above 700 ms in this test (DATABASE-DESIGN R6).
5. Run `VACUUM (ANALYZE)` before measuring so the visibility map supports index-only scans. Autovacuum defaults are kept; `study_session_days` and `xp_ledger` are insert-mostly.
6. Record results with the date and data size in the release checklist.
