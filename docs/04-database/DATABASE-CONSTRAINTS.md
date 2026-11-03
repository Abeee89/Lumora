# Database constraints

> Status: Proposal, pending approval. Source of truth: Phase 2 PRD and Phase 1 docs.

Constraint catalogue for Lumora, by kind. Columns are defined in [DATA-DICTIONARY](DATA-DICTIONARY.md); the rules behind them are in [DATABASE-DESIGN](DATABASE-DESIGN.md). Constraint names follow `pk_`, `fk_`, `uq_`, `ck_`, `ex_` prefixes plus table and column.

## 1. Primary keys

| Table | Primary key | Requirement |
| --- | --- | --- |
| Every table with a surrogate key | `id uuid` | NFR-092 |
| user_profiles, timer_settings, flashcard_settings, user_gamification, notification_preferences | `user_id` | One row per user |
| exam_topics | `(exam_id, topic_id)` | One checklist row per topic (FR-122) |
| study_session_days | `(session_id, local_date)` | One allocation per session per day (BR-016) |
| timer_run_segments | `(run_id, seq)` | Ordered segments (BR-012) |
| daily_goal_history | `(user_id, effective_from)` | Same-day change upserts (FR-074, EC-005) |
| subject_goals | `(user_id, subject_id)` | One target per subject (BR-013) |
| daily_evaluations | `(user_id, local_date)` | Idempotent daily job (FR-161) |
| group_members | `(group_id, user_id)` | One membership per user per group (R7) |
| idempotency_keys | `(user_id, scope, key)` | ADR-011 item 1 |
| rate_limit_counters | `(bucket, window_start)` | NFR-012, EC-026 |
| account_deletion_log | `user_id` (no FK) | NFR-104 |
| outbox_events | `id bigint identity` | Relay order (ADR-005) |

## 2. Foreign keys

All foreign keys are `ON UPDATE NO ACTION` because identifiers are immutable, except `study_session_days`, which uses `ON UPDATE CASCADE` (section 3). `(a, b)` denotes a composite key.

### 2.1 To users

Every user-owned table references `users(id)` with `ON DELETE CASCADE` (BR-032, NFR-031, NFR-092, EC-019). Tables: `auth_accounts`, `auth_sessions`, `auth_verifications`, `auth_audit_events` (nullable column), `user_profiles`, `data_exports`, `subjects`, `topics`, `exams`, `plan_entries`, `study_sessions`, `timer_runs`, `timer_settings`, `todos`, `notes`, `flashcards`, `card_reviews`, `flashcard_settings`, `daily_goal_history`, `subject_goals`, `user_gamification`, `daily_evaluations`, `xp_ledger`, `notification_preferences`, `notifications`, `push_subscriptions`, `ai_consents`, `ai_generation_requests`, `group_members`, `group_invites.created_by`, `group_reports.target_user_id`, `api_keys`, `idempotency_keys`.

Exceptions on the user parent: `groups.created_by`, `group_invites.accepted_by_user_id` and `group_reports.reporter_user_id` use `ON DELETE SET NULL` so group records outlive one member (R7).

### 2.2 Between application tables

| Child | Parent | Columns | On delete | Reason |
| --- | --- | --- | --- | --- |
| topics | subjects | `(subject_id, user_id) -> (id, user_id)` | NO ACTION | Subjects are archived, never deleted (BR-029, NFR-093) |
| exams, plan_entries, study_sessions, timer_runs, todos, notes, flashcards, subject_goals | subjects | `(subject_id, user_id) -> (id, user_id)` | NO ACTION | Same |
| plan_entries, study_sessions, timer_runs, todos, notes, flashcards | topics | `(topic_id, subject_id) -> (id, subject_id)` | NO ACTION | Topics are archived, never deleted (EC-008) |
| exam_topics | topics | `(topic_id, subject_id) -> (id, subject_id)` | NO ACTION | Same |
| exam_topics | exams | `(exam_id, subject_id) -> (id, subject_id)` | CASCADE | Checklist belongs to the exam; also forces subject consistency |
| study_sessions | plan_entries | `(plan_entry_id, user_id) -> (id, user_id)` | `SET NULL (plan_entry_id)` | Deleting an entry keeps the session (EC-022, BR-003) |
| timer_runs | plan_entries | `(plan_entry_id, user_id) -> (id, user_id)` | `SET NULL (plan_entry_id)` | Same |
| notifications | plan_entries | `(plan_entry_id, user_id) -> (id, user_id)` | CASCADE | Deleted entry cancels its reminder (FR-151) |
| study_session_days | study_sessions | `(session_id, user_id, subject_id) -> (id, user_id, subject_id)` | CASCADE | Derived rows follow the session (BR-016) |
| timer_run_segments | timer_runs | `run_id -> id` | CASCADE | Segments follow the run (R2) |
| card_reviews | flashcards | `card_id -> id` | CASCADE | History follows the card |
| group_members, group_invites, group_reports | groups | `group_id -> id` | CASCADE | Dissolving a group removes its records |

NO ACTION rather than RESTRICT: NO ACTION defers the check to statement end, so the `users` cascade can remove subjects and their children in one statement. RESTRICT would fail that cascade.

## 3. Delete behaviour matrix

| Parent | Child | Action | What the user sees |
| --- | --- | --- | --- |
| users | All owned tables | CASCADE | Everything disappears at account purge |
| users | groups.created_by, group_invites.accepted_by_user_id, group_reports.reporter_user_id | SET NULL | Group records remain without a name |
| subjects | topics, exams, plan_entries, study_sessions, timer_runs, todos, notes, flashcards, subject_goals | NO ACTION | Subject is archived instead; history stays and is labelled "<name> (archived)" |
| topics | plan_entries, study_sessions, timer_runs, todos, notes, flashcards, exam_topics | NO ACTION | Topic is archived instead |
| plan_entries | study_sessions, timer_runs | SET NULL | Sessions remain, unlinked |
| plan_entries | notifications | CASCADE | Reminder cancelled |
| exams | exam_topics | CASCADE | Checklist removed with the exam (exams are never deleted by users, so this fires at purge or subject change cleanup) |
| study_sessions | study_session_days | CASCADE | Statistics drop the session |
| timer_runs | timer_run_segments | CASCADE | |
| flashcards | card_reviews | CASCADE | |
| groups | group_members, group_invites, group_reports | CASCADE | |

`study_session_days` also has `ON UPDATE CASCADE` on its composite key, so changing `study_sessions.subject_id` (FR-043) updates the denormalised `subject_id` in the same statement.

## 4. Unique constraints and partial unique indexes

| Name | Table | Definition | Requirement |
| --- | --- | --- | --- |
| uq_users_email | users | `UNIQUE (lower(email))` | FR-001 |
| uq_auth_accounts_provider | auth_accounts | `UNIQUE (provider, provider_account_id)` | FR-003 |
| uq_auth_accounts_user_provider | auth_accounts | `UNIQUE (user_id, provider)` | |
| uq_auth_sessions_token | auth_sessions | `UNIQUE (token_hash)` | NFR-013 |
| uq_auth_verifications_token | auth_verifications | `UNIQUE (token_hash)` | FR-005 |
| uq_data_exports_running | data_exports | `UNIQUE (user_id) WHERE status = 'running'` | FR-132, EC-027 |
| uq_subjects_id_user | subjects | `UNIQUE (id, user_id)` | Composite FK target |
| uq_subjects_active_name | subjects | `UNIQUE (user_id, lower(btrim(name))) WHERE archived_at IS NULL` | FR-010, FR-014 |
| uq_topics_id_subject | topics | `UNIQUE (id, subject_id)` | Composite FK target |
| uq_exams_id_user | exams | `UNIQUE (id, user_id)` | Composite FK target |
| uq_exams_id_subject | exams | `UNIQUE (id, subject_id)` | FR-121 |
| uq_plan_entries_id_user | plan_entries | `UNIQUE (id, user_id)` | Composite FK target |
| uq_study_sessions_request | study_sessions | `UNIQUE (user_id, request_key)` | EC-021, ADR-011 |
| uq_study_sessions_id_user_subject | study_sessions | `UNIQUE (id, user_id, subject_id)` | Composite FK target |
| uq_timer_runs_user | timer_runs | `UNIQUE (user_id)` | BR-011, EC-002 |
| uq_timer_segments_open | timer_run_segments | `UNIQUE (run_id) WHERE ended_at IS NULL` | At most one open segment |
| uq_card_reviews_request | card_reviews | `UNIQUE (user_id, request_key)` | Retry safety |
| uq_daily_evaluations_freeze | daily_evaluations | `UNIQUE (user_id, freeze_week_start) WHERE freeze_used` | FR-162, BR-021 |
| uq_xp_ledger_award | xp_ledger | `UNIQUE (user_id, source_type, source_key, rule, source_revision)` | NFR-095, EC-017 |
| uq_notifications_daily | notifications | `UNIQUE (user_id, local_date) WHERE kind = 'daily_reminder'` | FR-150 |
| uq_notifications_plan | notifications | `UNIQUE (plan_entry_id) WHERE kind = 'plan_entry_reminder'` | FR-151 |
| uq_push_subscriptions_endpoint | push_subscriptions | `UNIQUE (endpoint)` | |
| uq_ai_requests_pending | ai_generation_requests | `UNIQUE (user_id) WHERE status = 'pending'` | EC-016 |
| uq_group_invites_token | group_invites | `UNIQUE (token_hash)` | EC-018 |
| uq_api_keys_hash | api_keys | `UNIQUE (key_hash)` | FR-220 |
| uq_outbox_key | outbox_events | `UNIQUE (idempotency_key)` | ADR-005 |

## 5. CHECK constraints

All value ranges, enumerations and cross-column checks are stated per column in [DATA-DICTIONARY](DATA-DICTIONARY.md). The rules that carry requirement weight:

| Table | Check | Requirement |
| --- | --- | --- |
| study_sessions | `ended_at > started_at` | NFR-090 |
| study_sessions | `duration_seconds BETWEEN 60 AND 86400` | BR-008 |
| study_sessions | `duration_seconds <= extract(epoch from (ended_at - started_at))` | NFR-090, BR-012 |
| study_sessions | `(source = 'manual') = (mode IS NULL)` | BR-010 |
| study_sessions | `mode = 'pomodoro' OR pomodoros_completed = 0` | FR-058 |
| study_sessions, timer_runs, user_profiles | `day_rollover_hour` / `rollover_hour` BETWEEN 0 AND 23 | BR-014 |
| study_session_days | `seconds > 0 AND seconds <= 86400` | BR-016 |
| timer_runs | `(mode = 'pomodoro') = (phase IS NOT NULL)` | BR-009 |
| timer_runs, timer_settings | focus 1..120, break 1..60, long break 1..60, cycles 2..8 | BR-009, FR-057 |
| timer_run_segments | `ended_at IS NULL OR ended_at >= started_at` | BR-012 |
| plan_entries | `duration_min BETWEEN 5 AND 480` | FR-030 |
| daily_goal_history, subject_goals | `target_minutes BETWEEN 5 AND 1440` | EC-023, BR-013 |
| todos | `done = (completed_at IS NOT NULL)`; `topic_id IS NULL OR subject_id IS NOT NULL` | FR-090 |
| xp_ledger | `amount <> 0`; `source_revision >= 0` | R3 |
| daily_evaluations | `freeze_used = (freeze_week_start IS NOT NULL)` | FR-162 |
| user_gamification | `current_streak >= 0`, `longest_streak >= 0` | BR-020..022 |
| data_exports | `(status = 'completed') = (file_key IS NOT NULL)`; `progress_percent BETWEEN 0 AND 100` | FR-132 |
| auth_accounts | `(provider = 'credential') = (password_hash IS NOT NULL)` | NFR-011 |
| groups | `max_members BETWEEN 2 AND 100` | U-3 |
| api_keys | `jsonb_typeof(scopes) = 'object'` | FR-221 |
| notes | `char_length(body) <= 100000` | FR-100 |
| Text columns | `char_length(btrim(col)) BETWEEN a AND b` | Each FR that sets a length |
| All `version` | `version >= 1` | NFR-094 |

## 6. Composite foreign key pattern

Problem: a plain `subject_id -> subjects(id)` foreign key lets a row owned by user A point at user B's subject. A plain `topic_id -> topics(id)` lets a session reference a topic that belongs to a different subject than its `subject_id`. Both are cross-user or inconsistent links that repository scoping alone would have to catch (NFR-016).

Pattern:

1. Parents expose a second unique key: `subjects UNIQUE (id, user_id)`, `topics UNIQUE (id, subject_id)`, `plan_entries UNIQUE (id, user_id)`, `exams UNIQUE (id, user_id)` and `(id, subject_id)`, `study_sessions UNIQUE (id, user_id, subject_id)`.
2. Children carry the extra column and reference the pair. A session with `user_id = A`, `subject_id = S` can only point at a subject whose pair `(S, A)` exists, and at a topic whose pair `(T, S)` exists.
3. Nullable links (`topic_id`, `plan_entry_id`) use default `MATCH SIMPLE`: if the nullable column is NULL, the constraint is not checked; if set, the other columns are non-null and the full pair is checked. Where `subject_id` is nullable (`todos`, `flashcards`), the CHECK `topic_id IS NULL OR subject_id IS NOT NULL` closes the gap.
4. `ON DELETE SET NULL (plan_entry_id)` nulls only the link column. A plain `SET NULL` would also try to null `user_id`, which is `NOT NULL`, and fail.

Consequence: the database guarantees ownership and subject consistency independently of service code. A cost is one extra unique index per parent (see [INDEXING-STRATEGY](INDEXING-STRATEGY.md)).

## 7. Exclusion constraint

| Name | Table | Definition | Requirement |
| --- | --- | --- | --- |
| ex_study_sessions_overlap | study_sessions | `EXCLUDE USING gist (user_id WITH =, tstzrange(started_at, ended_at, '[)') WITH &&)` | EC-011, BR-011 |

Needs `btree_gist`. The half-open range lets a session start exactly when another ends. Contingency if the extension is unavailable: [DATABASE-DESIGN](DATABASE-DESIGN.md) section 1.

## 8. Constraints deliberately not in the database

| Rule | Why not in the database | Enforcing layer | Requirement |
| --- | --- | --- | --- |
| IANA timezone validity | The zone list changes with the runtime tzdata | Zod against the Intl zone list | BR-030 |
| Overlapping plan entries | Overlap is allowed with a warning | Plans service returns a warning; client confirms | BR-026, EC-003 |
| Past plan entries immutable except marking missed | Depends on server time and user zone | Plans service | BR-028 |
| 24 hour per-day manual cap | Cross-row sum | Sessions service under the per-user advisory lock (R9) | EC-011 |
| At least one group admin | Cross-row count | Groups service under `groups` row lock | R7, EC-018 |
| `max_members` | Cross-row count | Groups service under `groups` row lock | U-3 |
| 10 active API keys | Cross-row count | API service under the advisory lock | FR-220 |
| XP daily cap 600 | Cross-row sum, configurable | Gamification service under `user_gamification` row lock | BR-018, NFR-062 |
| Exam date not in the past on create | Depends on current date in user zone | Exams service | EC-013 |
| Subject not archived at write time | Would need a join in a CHECK | Services check `archived_at IS NULL` inside the write transaction | BR-029 |
| Manual entry in the future or overlapping a running timer | Depends on `now()` and another table | Sessions service under the advisory lock | EC-011, EC-010 |
| Session `source` immutable | No UPDATE-column guard; trigger avoided | Sessions service | BR-010 |
| Tag, colour palette keys | Palette lives in configuration | Zod against configuration | FR-010 |

## 9. Alternate form for PostgreSQL 14 or lower

If the platform cannot provide PostgreSQL 15, `ON DELETE SET NULL (column)` is unavailable. Replace the composite `plan_entry_id` foreign keys on `study_sessions` and `timer_runs` with a single-column `FOREIGN KEY (plan_entry_id) REFERENCES plan_entries(id) ON DELETE SET NULL`. The rule that the linked entry belongs to the same user moves to the services. All other constraints are unchanged. `notifications` keeps its composite key, because its action is CASCADE.
