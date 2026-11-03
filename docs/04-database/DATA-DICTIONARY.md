# Data dictionary

> Status: Proposal, pending approval. Source of truth: Phase 2 PRD and Phase 1 docs.

Every table in the Lumora schema, with columns, types and constraints. Design rules are in [DATABASE-DESIGN](DATABASE-DESIGN.md); constraint semantics in [DATABASE-CONSTRAINTS](DATABASE-CONSTRAINTS.md); indexes in [INDEXING-STRATEGY](INDEXING-STRATEGY.md).

## Reading this document

- `PK` is `id uuid` (UUIDv7, application generated, no default) unless a composite key is stated.
- Every table has `created_at timestamptz NOT NULL DEFAULT now()`, except `auth_audit_events` (`occurred_at`), `rate_limit_counters` (`window_start`) and `account_deletion_log` (`requested_at`). Every mutable table also has `updated_at timestamptz NOT NULL DEFAULT now()`, set by the application. Tables marked **(V)** also have `version integer NOT NULL DEFAULT 1 CHECK (version >= 1)` (NFR-094). These standard columns are listed once per table as "Standard columns" and not repeated in the column table. Where a table has no "Standard columns" line, only `created_at` applies.
- Foreign key notation: `-> table(col) ACTION`. Default `ON UPDATE NO ACTION` everywhere, except where stated.
- Key column values: `PK`, `FK`, `UK` (unique), `PU` (partial unique).
- "Composite FK" means the pattern in [DATABASE-CONSTRAINTS](DATABASE-CONSTRAINTS.md) section 6: the child carries `user_id` and, below subject level, `subject_id`, and references a parent's `UNIQUE (id, user_id)` or `UNIQUE (id, subject_id)`, so a child can never point at another user's or another subject's record (NFR-016, NFR-092).
- `T(a..b)` in constraints means `CHECK (col BETWEEN a AND b)`. `L(a..b)` means `CHECK (char_length(btrim(col)) BETWEEN a AND b)`.

## 1. Authentication (MVP)

### users

Identity row. Better Auth user (ADR-004). Owner: Auth. Standard columns: `id`, `created_at`, `updated_at`.

| Column | Type | Null | Default | Key | Constraints | Description |
| --- | --- | --- | --- | --- | --- | --- |
| id | uuid | no | | PK | | User identifier. |
| email | text | no | | UK | `UNIQUE (lower(email))` | Sign-in email (FR-001). Case-insensitive uniqueness. |
| email_verified | boolean | no | false | | | Email confirmed. |
| age_confirmed_at | timestamptz | no | | | | Moment the user confirmed being 16 or older (NFR-035, U-6). |
| failed_sign_in_count | smallint | no | 0 | | `>= 0` | Consecutive failed sign-ins (NFR-012). Reset on success. |
| locked_until | timestamptz | yes | | | | Lockout end; 15 minutes after the fifth failure (NFR-012). |
| deletion_requested_at | timestamptz | yes | | | | Set when account deletion is requested (BR-032). Sign-in refuses rows where this is not NULL. |

### auth_accounts

Credential and Google provider links. Owner: Auth. Standard columns: `id`, `created_at`, `updated_at`.

| Column | Type | Null | Default | Key | Constraints | Description |
| --- | --- | --- | --- | --- | --- | --- |
| id | uuid | no | | PK | | |
| user_id | uuid | no | | FK | -> users(id) CASCADE | Owner. |
| provider | text | no | | | IN ('credential','google') | Sign-in method. |
| provider_account_id | text | no | | | | Provider subject id; the user id for `credential`. |
| password_hash | text | yes | | | `(provider = 'credential') = (password_hash IS NOT NULL)` | Salted adaptive hash (NFR-011). Never reversible. |
| | | | | UK | `UNIQUE (provider, provider_account_id)` | One external identity maps to one row. |
| | | | | UK | `UNIQUE (user_id, provider)` | One link per provider per user. |

### auth_sessions

Sign-in sessions. Owner: Auth. Standard columns: `id`, `created_at`.

| Column | Type | Null | Default | Key | Constraints | Description |
| --- | --- | --- | --- | --- | --- | --- |
| id | uuid | no | | PK | | |
| user_id | uuid | no | | FK | -> users(id) CASCADE | Owner. |
| token_hash | text | no | | UK | | Hash of the session token. The token itself is never stored. |
| expires_at | timestamptz | no | | | | Sliding 30 days from last activity (NFR-013). |
| last_active_at | timestamptz | no | now() | | | Last request that extended the session. |
| revoked_at | timestamptz | yes | | | | Set on user revocation (NFR-013). |
| ip | inet | yes | | | | Address at creation. |
| user_agent | text | yes | | | `char_length <= 512` | Device label for the session list. |

### auth_verifications

Password reset tokens. Owner: Auth. Standard columns: `id`, `created_at`.

| Column | Type | Null | Default | Key | Constraints | Description |
| --- | --- | --- | --- | --- | --- | --- |
| id | uuid | no | | PK | | |
| user_id | uuid | no | | FK | -> users(id) CASCADE | Owner. |
| purpose | text | no | | | IN ('password_reset') | Token use. |
| token_hash | text | no | | UK | | Hash of the emailed token. |
| expires_at | timestamptz | no | | | | Creation plus 60 minutes (FR-005). |
| consumed_at | timestamptz | yes | | | | Single use. |

### auth_audit_events

Security event log. Owner: Auth. Standard columns: `id`. No `created_at`; `occurred_at` is the event time.

| Column | Type | Null | Default | Key | Constraints | Description |
| --- | --- | --- | --- | --- | --- | --- |
| id | uuid | no | | PK | | |
| user_id | uuid | yes | | FK | -> users(id) CASCADE | Subject of the event. NULL for `account_deleted` rows written after the cascade. |
| event_type | text | no | | | IN ('sign_in','sign_in_failed','lockout','password_reset','session_revoked','account_deleted') | Event kind. |
| ip | inet | yes | | | | Source address. Not stored for `account_deleted`. |
| user_agent | text | yes | | | | Not stored for `account_deleted`. |
| occurred_at | timestamptz | no | now() | | | Retained 90 days (NFR-020). |

## 2. User profile (MVP)

### user_profiles

One row per user. Owner: Profile. **(V)** Standard columns: `created_at`, `updated_at`, `version`.

| Column | Type | Null | Default | Key | Constraints | Description |
| --- | --- | --- | --- | --- | --- | --- |
| user_id | uuid | no | | PK, FK | -> users(id) CASCADE | |
| display_name | text | no | | | L(1..50) | Shown to group members (NFR-037). |
| timezone | text | no | | | | IANA zone. Validity checked in the application against the Intl zone list; no database check. |
| rollover_hour | smallint | no | 0 | | T(0..23) | Hour at which the local day starts (BR-014). |
| theme | text | no | 'system' | | IN ('light','dark','system') | |
| primary_goal | text | yes | | | IN ('exam_prep','coursework','self_learning') | Onboarding answer. |
| onboarding_completed_at | timestamptz | yes | | | | |
| onboarding_dismissed_at | timestamptz | yes | | | | |
| onboarding_steps | jsonb | no | '{}' | | | Map of step name to completion timestamp. |

### data_exports

Export requests (BR-032, FR-130..132). Owner: Profile. Standard columns: `id`, `created_at`, `updated_at`.

| Column | Type | Null | Default | Key | Constraints | Description |
| --- | --- | --- | --- | --- | --- | --- |
| id | uuid | no | | PK | | |
| user_id | uuid | no | | FK | -> users(id) CASCADE | |
| format | text | no | | | IN ('csv','json') | |
| status | text | no | | | IN ('running','completed','failed') | |
| snapshot_at | timestamptz | no | | | | Transaction snapshot time (EC-027). |
| progress_percent | smallint | no | 0 | | T(0..100) | |
| file_key | text | yes | | | `(status = 'completed') = (file_key IS NOT NULL)` | Object storage key. |
| file_bytes | bigint | yes | | | | |
| expires_at | timestamptz | yes | | | | Completion plus 48 hours. FR-132 requires at least 24 hours. |
| error_code | text | yes | | | | |
| completed_at | timestamptz | yes | | | | |
| | | | | PU | `UNIQUE (user_id) WHERE status = 'running'` | One export in flight per user. |

### account_deletion_log

Deletion register source. Owner: Profile. Intentionally has no foreign key to `users` (NFR-104). No standard columns beyond those listed.

| Column | Type | Null | Default | Key | Constraints | Description |
| --- | --- | --- | --- | --- | --- | --- |
| user_id | uuid | no | | PK | | Deleted account id. Not an FK. |
| requested_at | timestamptz | no | | | | |
| purged_at | timestamptz | yes | | | | Set after `DELETE FROM users` completes. Row retained until 35 days after this (NFR-031). |

## 3. Subjects and topics (MVP)

### subjects

Owner: Subjects. **(V)** Standard columns: `id`, `created_at`, `updated_at`, `version`.

| Column | Type | Null | Default | Key | Constraints | Description |
| --- | --- | --- | --- | --- | --- | --- |
| id | uuid | no | | PK | | |
| user_id | uuid | no | | FK | -> users(id) CASCADE | |
| name | text | no | | | L(1..100) | FR-010. |
| color | text | no | | | IN (fixed palette keys from configuration) | |
| position | integer | no | | | `>= 0` | Manual order. |
| archived_at | timestamptz | yes | | | | Soft delete (BR-029, NFR-093). |
| | | | | UK | `UNIQUE (id, user_id)` | Target of composite FKs. |
| | | | | PU | unique index `(user_id, lower(btrim(name))) WHERE archived_at IS NULL` | Active name unique per user (FR-010). Restoring with a clash fails and the service asks for a new name (FR-014). |

### topics

Owner: Subjects. **(V)** Standard columns: `id`, `created_at`, `updated_at`, `version`.

| Column | Type | Null | Default | Key | Constraints | Description |
| --- | --- | --- | --- | --- | --- | --- |
| id | uuid | no | | PK | | |
| user_id | uuid | no | | FK | -> users(id) CASCADE | |
| subject_id | uuid | no | | FK | composite `(subject_id, user_id) -> subjects(id, user_id)` NO ACTION | |
| name | text | no | | | L(1..150) | |
| weight | smallint | no | 1 | | T(1..5) | Readiness weight (BR-024). |
| status | text | no | 'not_started' | | IN ('not_started','in_progress','done') | |
| position | integer | no | | | `>= 0` | |
| archived_at | timestamptz | yes | | | | Independent archive (EC-008). |
| | | | | UK | `UNIQUE (id, subject_id)` | Target of composite FKs below subject level. |

## 4. Exams (MVP; readiness Phase 2)

### exams

Owner: Exams. **(V)** Standard columns: `id`, `created_at`, `updated_at`, `version`.

| Column | Type | Null | Default | Key | Constraints | Description |
| --- | --- | --- | --- | --- | --- | --- |
| id | uuid | no | | PK | | |
| user_id | uuid | no | | FK | -> users(id) CASCADE | |
| subject_id | uuid | no | | FK | composite `(subject_id, user_id) -> subjects(id, user_id)` NO ACTION | One subject per exam (BR-023). |
| title | text | no | | | L(1..200) | |
| exam_date | date | no | | | | Past date rejected on create by the service (EC-013), allowed on edit. Archived state is derived (BR-025). |
| | | | | UK | `UNIQUE (id, user_id)` | |
| | | | | UK | `UNIQUE (id, subject_id)` | Target of `exam_topics` subject consistency FK. |

### exam_topics

Checklist rows. Owner: Exams. Standard columns: `created_at`, `updated_at`. No `user_id`: ownership follows the exam.

| Column | Type | Null | Default | Key | Constraints | Description |
| --- | --- | --- | --- | --- | --- | --- |
| exam_id | uuid | no | | PK, FK | part of PK; see below | |
| topic_id | uuid | no | | PK, FK | part of PK; see below | |
| subject_id | uuid | no | | | | Copy of the exam subject. |
| completed | boolean | no | false | | | Checklist state (FR-122). |
| weight | smallint | no | 1 | | T(1..5) | Phase 2, FR-127. |
| | | | | PK | `PRIMARY KEY (exam_id, topic_id)` | |
| | | | | FK | `(exam_id, subject_id) -> exams(id, subject_id) CASCADE` | Subject matches the exam. |
| | | | | FK | `(topic_id, subject_id) -> topics(id, subject_id) NO ACTION` | Topic belongs to that subject. |

Changing an exam's subject deletes its `exam_topics` in the same transaction (FR-121). Archived topics are excluded from readiness by joining `topics.archived_at IS NULL` (EC-008, EC-014).

## 5. Study plans (MVP)

### plan_entries

Planned study intent. Owner: Plans. **(V)** Standard columns: `id`, `created_at`, `updated_at`, `version`.

| Column | Type | Null | Default | Key | Constraints | Description |
| --- | --- | --- | --- | --- | --- | --- |
| id | uuid | no | | PK | | |
| user_id | uuid | no | | FK | -> users(id) CASCADE | |
| subject_id | uuid | no | | FK | composite `(subject_id, user_id) -> subjects(id, user_id)` NO ACTION | |
| topic_id | uuid | yes | | FK | composite `(topic_id, subject_id) -> topics(id, subject_id)` NO ACTION | |
| starts_at | timestamptz | no | | | | |
| duration_min | smallint | no | | | T(5..480) | Planned minutes (BR-001). |
| timezone | text | no | | | | Frozen at create or start edit (R5). |
| local_date | date | no | | | | Frozen with `timezone`. |
| missed_at | timestamptz | yes | | | | BR-005. "Done" is derived from linked sessions. |
| | | | | UK | `UNIQUE (id, user_id)` | Target of composite FKs from sessions, timer runs, notifications. |

Overlap is advisory (BR-026, EC-003), so there is no exclusion constraint. Past-entry immutability (BR-028) is a service rule using server time.

## 6. Study sessions (MVP)

### study_sessions

Completed study facts. Owner: Sessions. **(V)** Standard columns: `id`, `created_at`, `updated_at`, `version`.

| Column | Type | Null | Default | Key | Constraints | Description |
| --- | --- | --- | --- | --- | --- | --- |
| id | uuid | no | | PK | | |
| user_id | uuid | no | | FK | -> users(id) CASCADE | |
| subject_id | uuid | no | | FK | composite `(subject_id, user_id) -> subjects(id, user_id)` NO ACTION | |
| topic_id | uuid | yes | | FK | composite `(topic_id, subject_id) -> topics(id, subject_id)` NO ACTION | |
| plan_entry_id | uuid | yes | | FK | `(plan_entry_id, user_id) -> plan_entries(id, user_id) ON DELETE SET NULL (plan_entry_id)` | Optional link (BR-003, EC-022). |
| source | text | no | | | IN ('timer','manual') | Immutable, enforced by the service (BR-010). |
| mode | text | yes | | | IN ('stopwatch','pomodoro'); `(source = 'manual') = (mode IS NULL)` | Timer mode. |
| started_at | timestamptz | no | | | | |
| ended_at | timestamptz | no | | | `ended_at > started_at` | |
| duration_seconds | integer | no | | | `>= 60 AND <= 86400`; `<= extract(epoch from (ended_at - started_at))` | Study time excluding pauses (BR-008, NFR-090). After a time edit it becomes `ended_at - started_at` and days are rewritten (FR-043). |
| pomodoros_completed | smallint | no | 0 | | `>= 0`; `(mode = 'pomodoro') OR pomodoros_completed = 0` | FR-058. |
| auto_closed | boolean | no | false | | | Set by the auto-close job (BR-006). |
| timezone | text | no | | | | Frozen at start (NFR-091). |
| local_date | date | no | | | | Frozen local date of `started_at`. |
| day_rollover_hour | smallint | no | | | T(0..23) | Frozen rollover. |
| request_key | text | yes | | | `char_length <= 100` | Idempotency key (EC-021). NULL for server-originated rows. |
| | | | | UK | `UNIQUE (user_id, request_key)` | |
| | | | | UK | `UNIQUE (id, user_id, subject_id)` | Target of the `study_session_days` composite FK. |
| | | | | EX | `EXCLUDE USING gist (user_id WITH =, tstzrange(started_at, ended_at, '[)') WITH &&)` | No overlapping sessions per user (EC-011). Requires `btree_gist`. |

### study_session_days

Per-session, per-local-day allocation. Derived, written with the session. Owner: Sessions. Standard columns: `created_at`.

| Column | Type | Null | Default | Key | Constraints | Description |
| --- | --- | --- | --- | --- | --- | --- |
| session_id | uuid | no | | PK | | |
| local_date | date | no | | PK | `PRIMARY KEY (session_id, local_date)` | Local day in the session's frozen zone and rollover. |
| user_id | uuid | no | | | | Denormalised for index-only user queries. |
| subject_id | uuid | no | | | | Denormalised for per-subject statistics. |
| seconds | integer | no | | | `> 0 AND <= 86400` | Seconds on that day (BR-016). |
| is_manual | boolean | no | | | | Copy of `source = 'manual'`. |
| is_ranked | boolean | no | | | | True iff `source = 'timer'` and `duration_seconds >= 300` (EC-025, BR-018). Written by the sessions service. |
| | | | | FK | `(session_id, user_id, subject_id) -> study_sessions(id, user_id, subject_id) ON DELETE CASCADE ON UPDATE CASCADE` | A subject change on a session propagates. |

## 7. Timer (MVP; audio Phase 2)

### timer_runs

Active timer. At most one per user. Owner: Timer. **(V)** Standard columns: `id`, `created_at`, `updated_at`, `version`.

| Column | Type | Null | Default | Key | Constraints | Description |
| --- | --- | --- | --- | --- | --- | --- |
| id | uuid | no | | PK | | |
| user_id | uuid | no | | UK, FK | -> users(id) CASCADE; `UNIQUE (user_id)` | One active timer per user (BR-011). |
| subject_id | uuid | no | | FK | composite `(subject_id, user_id) -> subjects(id, user_id)` NO ACTION | |
| topic_id | uuid | yes | | FK | composite `(topic_id, subject_id) -> topics(id, subject_id)` NO ACTION | |
| plan_entry_id | uuid | yes | | FK | `(plan_entry_id, user_id) -> plan_entries(id, user_id) ON DELETE SET NULL (plan_entry_id)` | |
| mode | text | no | | | IN ('stopwatch','pomodoro') | |
| state | text | no | | | IN ('running','paused') | Completed and discarded timers have no row (R2). |
| phase | text | yes | | | IN ('focus','break','long_break'); `(mode = 'pomodoro') = (phase IS NOT NULL)` | Pomodoro phase. |
| phase_ends_at | timestamptz | yes | | | | Pomodoro only. |
| cycle_index | smallint | no | 1 | | `>= 1` | |
| pomodoros_completed | smallint | no | 0 | | `>= 0` | |
| focus_min | smallint | no | | | T(1..120) | Snapshot of settings at start (FR-057). |
| break_min | smallint | no | | | T(1..60) | Snapshot. |
| long_break_min | smallint | no | | | T(1..60) | Snapshot. |
| cycles_before_long_break | smallint | no | | | T(2..8) | Snapshot. |
| started_at | timestamptz | no | | | | |
| timezone | text | no | | | | Frozen (R5). |
| local_date | date | no | | | | Frozen. |
| day_rollover_hour | smallint | no | | | T(0..23) | Frozen. |
| last_heartbeat_at | timestamptz | no | | | | Auto-close input (BR-006). |

### timer_run_segments

Focus intervals of a run. Owner: Timer. Standard columns: `created_at`.

| Column | Type | Null | Default | Key | Constraints | Description |
| --- | --- | --- | --- | --- | --- | --- |
| run_id | uuid | no | | PK, FK | -> timer_runs(id) CASCADE | |
| seq | smallint | no | | PK | `PRIMARY KEY (run_id, seq)` | Order within the run. |
| started_at | timestamptz | no | | | | |
| ended_at | timestamptz | yes | | | `ended_at IS NULL OR ended_at >= started_at` | NULL while open. |
| | | | | PU | `UNIQUE (run_id) WHERE ended_at IS NULL` | At most one open segment. |

### timer_settings

Owner: Timer. **(V)** Standard columns: `created_at`, `updated_at`, `version`. Row created lazily on first change; absent rows read defaults from configuration (NFR-062).

| Column | Type | Null | Default | Key | Constraints | Description |
| --- | --- | --- | --- | --- | --- | --- |
| user_id | uuid | no | | PK, FK | -> users(id) CASCADE | |
| focus_min | smallint | no | 25 | | T(1..120) | BR-009. |
| break_min | smallint | no | 5 | | T(1..60) | |
| long_break_min | smallint | no | 15 | | T(1..60) | |
| cycles_before_long_break | smallint | no | 4 | | T(2..8) | |
| audio_loop | text | no | 'none' | | IN ('none','rain','white_noise','cafe') | Phase 2. |
| audio_volume | smallint | no | 50 | | T(0..100) | |

## 8. Tasks (MVP)

### todos

Owner: Tasks. **(V)** Standard columns: `id`, `created_at`, `updated_at`, `version`.

| Column | Type | Null | Default | Key | Constraints | Description |
| --- | --- | --- | --- | --- | --- | --- |
| id | uuid | no | | PK | | |
| user_id | uuid | no | | FK | -> users(id) CASCADE | |
| title | text | no | | | L(1..200) | |
| subject_id | uuid | yes | | FK | composite `(subject_id, user_id) -> subjects(id, user_id)` NO ACTION | |
| topic_id | uuid | yes | | FK | composite `(topic_id, subject_id) -> topics(id, subject_id)` NO ACTION; `topic_id IS NULL OR subject_id IS NOT NULL` | |
| due_date | date | yes | | | | |
| priority | text | no | 'medium' | | IN ('high','medium','low') | BR-031. |
| done | boolean | no | false | | | |
| completed_at | timestamptz | yes | | | `done = (completed_at IS NOT NULL)` | |

## 9. Notes (MVP)

### notes

Owner: Notes. **(V)** Standard columns: `id`, `created_at`, `updated_at`, `version`.

| Column | Type | Null | Default | Key | Constraints | Description |
| --- | --- | --- | --- | --- | --- | --- |
| id | uuid | no | | PK | | |
| user_id | uuid | no | | FK | -> users(id) CASCADE | |
| subject_id | uuid | no | | FK | composite `(subject_id, user_id) -> subjects(id, user_id)` NO ACTION | |
| topic_id | uuid | yes | | FK | composite `(topic_id, subject_id) -> topics(id, subject_id)` NO ACTION | |
| title | text | no | | | L(1..200) | |
| body | text | no | '' | | `char_length(body) <= 100000` | Raw Markdown. Never sanitized on write (ADR-007, FR-100); sanitized at render (NFR-015). |

## 10. Flashcards (Phase 2)

### flashcards

Owner: Flashcards. **(V)** Standard columns: `id`, `created_at`, `updated_at`, `version`.

| Column | Type | Null | Default | Key | Constraints | Description |
| --- | --- | --- | --- | --- | --- | --- |
| id | uuid | no | | PK | | |
| user_id | uuid | no | | FK | -> users(id) CASCADE | |
| subject_id | uuid | yes | | FK | composite `(subject_id, user_id) -> subjects(id, user_id)` NO ACTION | |
| topic_id | uuid | yes | | FK | composite `(topic_id, subject_id) -> topics(id, subject_id)` NO ACTION; `topic_id IS NULL OR subject_id IS NOT NULL` | |
| front | text | no | | | L(1..1000) | |
| back | text | no | | | L(1..1000) | |
| due_date | date | no | | | | Local date next due. |
| interval_days | integer | no | 0 | | `>= 0` | |
| ease | numeric(4,2) | no | 2.50 | | T(1.30..3.50) | |
| repetitions | integer | no | 0 | | `>= 0` | |
| lapses | integer | no | 0 | | `>= 0` | |
| last_reviewed_at | timestamptz | yes | | | | |

The scheduling algorithm is application configuration (FR-110 fixes only ordering properties). The columns reproduce its state.

### card_reviews

Review history. Owner: Flashcards. Standard columns: `id`, `created_at`.

| Column | Type | Null | Default | Key | Constraints | Description |
| --- | --- | --- | --- | --- | --- | --- |
| id | uuid | no | | PK | | |
| card_id | uuid | no | | FK | -> flashcards(id) CASCADE | |
| user_id | uuid | no | | FK | -> users(id) CASCADE | |
| rating | text | no | | | IN ('again','hard','good','easy') | |
| reviewed_at | timestamptz | no | | | | |
| local_date | date | no | | | | Counts against the daily limit. |
| interval_days_after | integer | no | | | `>= 0` | |
| due_date_after | date | no | | | | |
| request_key | text | no | | | `char_length <= 100` | |
| | | | | UK | `UNIQUE (user_id, request_key)` | Retry safety. |

### flashcard_settings

Owner: Flashcards. Standard columns: `created_at`, `updated_at`.

| Column | Type | Null | Default | Key | Constraints | Description |
| --- | --- | --- | --- | --- | --- | --- |
| user_id | uuid | no | | PK, FK | -> users(id) CASCADE | |
| daily_review_limit | smallint | no | 50 | | T(1..500) | NFR-062. |

## 11. Goals (MVP)

### daily_goal_history

Owner: Goals. Standard columns: `created_at`, `updated_at`.

| Column | Type | Null | Default | Key | Constraints | Description |
| --- | --- | --- | --- | --- | --- | --- |
| user_id | uuid | no | | PK, FK | -> users(id) CASCADE | |
| effective_from | date | no | | PK | `PRIMARY KEY (user_id, effective_from)` | First local day the target applies. |
| target_minutes | smallint | no | | | T(5..1440) | EC-023. Default 120 (BR-013). |

A same-day change upserts the same key (FR-074, EC-005). The target for day D is the row with the greatest `effective_from <= D` (BR-015). A row is inserted at registration with `effective_from` equal to the registration local date.

### subject_goals

Owner: Goals. Standard columns: `created_at`, `updated_at`.

| Column | Type | Null | Default | Key | Constraints | Description |
| --- | --- | --- | --- | --- | --- | --- |
| user_id | uuid | no | | PK, FK | -> users(id) CASCADE | |
| subject_id | uuid | no | | PK, FK | composite `(subject_id, user_id) -> subjects(id, user_id)` NO ACTION; `PRIMARY KEY (user_id, subject_id)` | Not deleted on subject archive. |
| target_minutes | smallint | no | | | T(5..1440) | BR-013. |

## 12. Gamification (Phase 2)

### user_gamification

Streak state; also the row locked for XP cap and evaluation serialization. Owner: Gamification. Standard columns: `created_at`, `updated_at`.

| Column | Type | Null | Default | Key | Constraints | Description |
| --- | --- | --- | --- | --- | --- | --- |
| user_id | uuid | no | | PK, FK | -> users(id) CASCADE | |
| current_streak | integer | no | 0 | | `>= 0` | BR-020, BR-021. |
| longest_streak | integer | no | 0 | | `>= 0` | Never decreases, enforced by `GREATEST` in the single update statement (BR-022). |
| streak_as_of_date | date | yes | | | | Last evaluated local date. |

### daily_evaluations

Owner: Gamification. Standard columns: `created_at`.

| Column | Type | Null | Default | Key | Constraints | Description |
| --- | --- | --- | --- | --- | --- | --- |
| user_id | uuid | no | | PK, FK | -> users(id) CASCADE | |
| local_date | date | no | | PK | `PRIMARY KEY (user_id, local_date)` | Row existence is the "evaluated" marker for the job. |
| target_minutes | smallint | no | | | | Target in force that day (BR-015). |
| seconds | integer | no | | | `>= 0` | Study seconds that day. |
| goal_met | boolean | no | | | | |
| freeze_used | boolean | no | false | | | BR-021. |
| freeze_week_start | date | yes | | | `freeze_used = (freeze_week_start IS NOT NULL)` | Monday of the freeze week. |
| | | | | PU | `UNIQUE (user_id, freeze_week_start) WHERE freeze_used` | One freeze per week (FR-162). |

### xp_ledger

Append-only. Owner: Gamification. Standard columns: `id`, `created_at`.

| Column | Type | Null | Default | Key | Constraints | Description |
| --- | --- | --- | --- | --- | --- | --- |
| id | uuid | no | | PK | | |
| user_id | uuid | no | | FK | -> users(id) CASCADE | |
| source_type | text | no | | | IN ('session','todo','daily_goal') | |
| source_key | text | no | | | | Session uuid, to-do uuid or `YYYY-MM-DD`. No FK. |
| rule | text | no | | | IN ('focus_minutes','daily_goal_bonus','high_priority_todo','adjustment') | `adjustment` rows keep the original `source_type` and `source_key`. |
| source_revision | integer | no | 0 | | `>= 0` | 0 for the first award; the source `version` for later adjustments. |
| amount | integer | no | | | `amount <> 0` | Signed XP. |
| local_date | date | no | | | | Day used for the daily cap. |
| | | | | UK | `uq_xp_ledger_award UNIQUE (user_id, source_type, source_key, rule, source_revision)` | NFR-095, EC-017. |

## 13. Notifications (MVP port; Phase 2 tables)

### notification_preferences

Owner: Notifications. **(V)** Standard columns: `created_at`, `updated_at`, `version`.

| Column | Type | Null | Default | Key | Constraints | Description |
| --- | --- | --- | --- | --- | --- | --- |
| user_id | uuid | no | | PK, FK | -> users(id) CASCADE | |
| daily_reminder_enabled | boolean | no | false | | | |
| daily_reminder_time | time | no | '19:00' | | | Local time. Default chosen here; the FR is silent. |
| plan_reminder_enabled | boolean | no | false | | | |
| plan_reminder_lead_min | smallint | no | 10 | | T(0..120) | |

### notifications

Owner: Notifications. Standard columns: `id`, `created_at`, `updated_at`.

| Column | Type | Null | Default | Key | Constraints | Description |
| --- | --- | --- | --- | --- | --- | --- |
| id | uuid | no | | PK | | |
| user_id | uuid | no | | FK | -> users(id) CASCADE | |
| kind | text | no | | | IN ('daily_reminder','plan_entry_reminder') | |
| plan_entry_id | uuid | yes | | FK | `(plan_entry_id, user_id) -> plan_entries(id, user_id) ON DELETE CASCADE` | A deleted entry cancels its reminder (FR-151). |
| due_at | timestamptz | no | | | | |
| local_date | date | no | | | | |
| body | text | no | | | `char_length <= 300` | |
| delivered_at | timestamptz | yes | | | | |
| dismissed_at | timestamptz | yes | | | | |
| push_attempted_at | timestamptz | yes | | | | |
| | | | | PU | `UNIQUE (user_id, local_date) WHERE kind = 'daily_reminder'` | One daily reminder per day. |
| | | | | PU | `UNIQUE (plan_entry_id) WHERE kind = 'plan_entry_reminder'` | An edit reschedules by updating `due_at`. |

### push_subscriptions

Owner: Notifications. Standard columns: `id`, `created_at`.

| Column | Type | Null | Default | Key | Constraints | Description |
| --- | --- | --- | --- | --- | --- | --- |
| id | uuid | no | | PK | | |
| user_id | uuid | no | | FK | -> users(id) CASCADE | |
| endpoint | text | no | | UK | | Push service URL. |
| p256dh | text | no | | | | Client public key. |
| auth | text | no | | | | Client auth secret. |
| user_agent | text | yes | | | | |
| last_used_at | timestamptz | yes | | | | |

## 14. AI scheduling (Phase 3)

### ai_consents

Append-only. Owner: AI scheduling. Standard columns: `id`, `created_at`.

| Column | Type | Null | Default | Key | Constraints | Description |
| --- | --- | --- | --- | --- | --- | --- |
| id | uuid | no | | PK | | |
| user_id | uuid | no | | FK | -> users(id) CASCADE | |
| feature | text | no | | | IN ('ai_schedule') | NFR-036. |
| granted | boolean | no | | | | |
| wording_version | text | no | | | | Consent wording shown (U-4). |
| decided_at | timestamptz | no | | | | Current consent is the latest row per `(user_id, feature)`. |

### ai_generation_requests

Owner: AI scheduling. Standard columns: `id`, `created_at`, `updated_at`.

| Column | Type | Null | Default | Key | Constraints | Description |
| --- | --- | --- | --- | --- | --- | --- |
| id | uuid | no | | PK | | |
| user_id | uuid | no | | FK | -> users(id) CASCADE | |
| status | text | no | | | IN ('pending','succeeded','failed','timed_out') | EC-015, EC-016. |
| params | jsonb | no | | | | Exam ids, topic ids, weekly_hours 1..168, availability windows. Validated by Zod. |
| provider_responded_at | timestamptz | yes | | | | |
| counts_toward_quota | boolean | no | false | | | |
| quota_local_date | date | no | | | | |
| proposal | jsonb | yes | | | | Nulled by the expiry job. |
| entries_removed | smallint | no | 0 | | `>= 0` | Invalid entries stripped (EC-015). |
| proposal_expires_at | timestamptz | yes | | | | Creation plus 24 hours. |
| accepted_at | timestamptz | yes | | | | |
| | | | | PU | `UNIQUE (user_id) WHERE status = 'pending'` | One request in flight. |

## 15. Study groups (Phase 3)

### groups

Owner: Groups. **(V)** Standard columns: `id`, `created_at`, `updated_at`, `version`.

| Column | Type | Null | Default | Key | Constraints | Description |
| --- | --- | --- | --- | --- | --- | --- |
| id | uuid | no | | PK | | |
| name | text | no | | | L(1..60) | |
| max_members | smallint | no | | | T(2..100) | Default from configuration, 20 (U-3). |
| created_by | uuid | yes | | FK | -> users(id) SET NULL | Informational only. |

### group_members

Owner: Groups. Standard columns: `created_at`, `updated_at`.

| Column | Type | Null | Default | Key | Constraints | Description |
| --- | --- | --- | --- | --- | --- | --- |
| group_id | uuid | no | | PK, FK | -> groups(id) CASCADE | |
| user_id | uuid | no | | PK, FK | -> users(id) CASCADE; `PRIMARY KEY (group_id, user_id)` | |
| role | text | no | | | IN ('admin','member') | |
| joined_at | timestamptz | no | | | | Used for admin promotion order. |
| share_weekly_minutes | boolean | no | false | | | Opt-in (NFR-037). |

### group_invites

Owner: Groups. Standard columns: `id`, `created_at`.

| Column | Type | Null | Default | Key | Constraints | Description |
| --- | --- | --- | --- | --- | --- | --- |
| id | uuid | no | | PK | | |
| group_id | uuid | no | | FK | -> groups(id) CASCADE | |
| created_by | uuid | no | | FK | -> users(id) CASCADE | |
| token_hash | text | no | | UK | | SHA-256 of the invite token. |
| email | text | yes | | | | Optional addressee. |
| expires_at | timestamptz | no | | | | Creation plus 7 days. |
| revoked_at | timestamptz | yes | | | | |
| accepted_by_user_id | uuid | yes | | FK | -> users(id) SET NULL | |
| accepted_at | timestamptz | yes | | | | Single use. |

### group_reports

Owner: Groups. Standard columns: `id`, `created_at`.

| Column | Type | Null | Default | Key | Constraints | Description |
| --- | --- | --- | --- | --- | --- | --- |
| id | uuid | no | | PK | | |
| group_id | uuid | no | | FK | -> groups(id) CASCADE | |
| reporter_user_id | uuid | yes | | FK | -> users(id) SET NULL | Never exposed to the target (service rule). |
| target_user_id | uuid | no | | FK | -> users(id) CASCADE | |
| reason | text | no | | | L(1..500) | |

## 16. API integrations (Phase 3)

### api_keys

Owner: API integrations. Standard columns: `id`, `created_at`, `updated_at`.

| Column | Type | Null | Default | Key | Constraints | Description |
| --- | --- | --- | --- | --- | --- | --- |
| id | uuid | no | | PK | | |
| user_id | uuid | no | | FK | -> users(id) CASCADE | |
| name | text | no | | | L(1..60) | |
| key_hash | bytea | no | | UK | | SHA-256 of a random key of at least 32 bytes. Lookup is by hash through the unique index. |
| last4 | char(4) | no | | | | Display suffix. |
| scopes | jsonb | no | | | `jsonb_typeof(scopes) = 'object'` | Keys: subjects, topics, sessions, plan_entries, todos, notes, exams. Values: `read` or `write`. Validated by Zod. |
| revoked_at | timestamptz | yes | | | | Revoked rows stay (FR-220). |
| last_used_at | timestamptz | yes | | | | |

The limit of 10 active keys is enforced under the R9 advisory lock (FR-220, EC-026).

## 17. Shared kernel (MVP)

### idempotency_keys

Owner: Shared kernel. No `updated_at`.

| Column | Type | Null | Default | Key | Constraints | Description |
| --- | --- | --- | --- | --- | --- | --- |
| user_id | uuid | no | | PK, FK | -> users(id) CASCADE | |
| scope | text | no | | PK | | Action name, for example `plan_entry.create`. |
| key | text | no | | PK | `PRIMARY KEY (user_id, scope, key)` | Client supplied. |
| request_hash | text | no | | | | Detects key reuse with a different payload. |
| response_status | smallint | no | | | | |
| response_body | jsonb | yes | | | | |
| expires_at | timestamptz | no | | | | Creation plus 7 days (R8). |

### outbox_events

Owner: Shared kernel (ADR-005).

| Column | Type | Null | Default | Key | Constraints | Description |
| --- | --- | --- | --- | --- | --- | --- |
| id | bigint | no | GENERATED ALWAYS AS IDENTITY | PK | | Relay order. |
| job_name | text | no | | | | pg-boss queue name. |
| idempotency_key | text | no | | UK | | Used as pg-boss `singletonKey`. |
| payload | jsonb | no | | | | Identifiers and parameters only (NFR-063). |
| relayed_at | timestamptz | yes | | | | |

Relay: worker loop every 5 seconds, `SELECT ... WHERE relayed_at IS NULL ORDER BY id FOR UPDATE SKIP LOCKED LIMIT 100`, calls pg-boss `send`, sets `relayed_at`.

### rate_limit_counters

`UNLOGGED`. Owner: Shared kernel. A counter lost on crash is acceptable.

| Column | Type | Null | Default | Key | Constraints | Description |
| --- | --- | --- | --- | --- | --- | --- |
| bucket | text | no | | PK | | Limiter key, for example `signin:<ip>` or `apikey:<id>` (NFR-012, EC-026). |
| window_start | timestamptz | no | | PK | `PRIMARY KEY (bucket, window_start)` | |
| hits | integer | no | | | `>= 1` | Incremented by `INSERT ... ON CONFLICT DO UPDATE SET hits = rate_limit_counters.hits + 1 RETURNING hits`. |

## 18. Enumerated value sets

| Table.column | Allowed values |
| --- | --- |
| auth_accounts.provider | credential, google |
| auth_verifications.purpose | password_reset |
| auth_audit_events.event_type | sign_in, sign_in_failed, lockout, password_reset, session_revoked, account_deleted |
| user_profiles.theme | light, dark, system |
| user_profiles.primary_goal | exam_prep, coursework, self_learning |
| data_exports.format | csv, json |
| data_exports.status | running, completed, failed |
| topics.status | not_started, in_progress, done |
| study_sessions.source | timer, manual |
| study_sessions.mode, timer_runs.mode | stopwatch, pomodoro |
| timer_runs.state | running, paused |
| timer_runs.phase | focus, break, long_break |
| timer_settings.audio_loop | none, rain, white_noise, cafe |
| todos.priority | high, medium, low |
| card_reviews.rating | again, hard, good, easy |
| xp_ledger.source_type | session, todo, daily_goal |
| xp_ledger.rule | focus_minutes, daily_goal_bonus, high_priority_todo, adjustment |
| notifications.kind | daily_reminder, plan_entry_reminder |
| ai_consents.feature | ai_schedule |
| ai_generation_requests.status | pending, succeeded, failed, timed_out |
| group_members.role | admin, member |

## 19. Table ownership and purge

Purge handler owner: the module whose table holds data outside PostgreSQL or needing pre-delete logic. For every other table the `DELETE FROM users` cascade is the purge (NFR-031). Phase column is the first phase that migrates the table.

| Table | Owning module | Phase | Purge handler owner |
| --- | --- | --- | --- |
| users | Auth | MVP | Auth (final `DELETE`) |
| auth_accounts | Auth | MVP | Cascade |
| auth_sessions | Auth | MVP | Auth (revoke at request) |
| auth_verifications | Auth | MVP | Cascade |
| auth_audit_events | Auth | MVP | Cascade; Auth inserts anonymous `account_deleted` row |
| user_profiles | Profile | MVP | Cascade |
| data_exports | Profile | MVP | Profile (delete export file objects) |
| account_deletion_log | Profile | MVP | Profile (age out 35 days after purge) |
| subjects, topics | Subjects | MVP | Cascade |
| exams, exam_topics | Exams | MVP | Cascade |
| plan_entries | Plans | MVP | Cascade |
| study_sessions, study_session_days | Sessions | MVP | Cascade |
| timer_runs, timer_run_segments | Timer | MVP | Timer (delete run at request) |
| timer_settings | Timer | MVP | Cascade |
| todos | Tasks | MVP | Cascade |
| notes | Notes | MVP | Cascade |
| flashcards, card_reviews, flashcard_settings | Flashcards | Phase 2 | Cascade |
| daily_goal_history, subject_goals | Goals | MVP | Cascade |
| user_gamification, daily_evaluations, xp_ledger | Gamification | Phase 2 | Cascade |
| notification_preferences, notifications | Notifications | Phase 2 | Cascade |
| push_subscriptions | Notifications | Phase 2 | Notifications (unsubscribe at push service) |
| ai_consents, ai_generation_requests | AI scheduling | Phase 3 | Cascade |
| groups | Groups | Phase 3 | Groups (admin promotion; delete empty groups) |
| group_members, group_invites, group_reports | Groups | Phase 3 | Groups (membership removal at request); cascade |
| api_keys | API integrations | Phase 3 | Cascade |
| idempotency_keys | Shared kernel | MVP | Cascade |
| outbox_events | Shared kernel | MVP | None (no user column; payload holds ids only, aged out in 7 days) |
| rate_limit_counters | Shared kernel | MVP | None (aged out in 10 minutes) |
