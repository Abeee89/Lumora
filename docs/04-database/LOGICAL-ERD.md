# Logical ERD

> Status: Proposal, pending approval. Source of truth: Phase 2 PRD and Phase 1 docs.

Entities with business attributes, logical types, keys and cardinality. No vendor types. Physical types, every column and the constraint detail are in [PHYSICAL-ERD](PHYSICAL-ERD.md) and [DATA-DICTIONARY](DATA-DICTIONARY.md). Entity overview: [CONCEPTUAL-ERD](CONCEPTUAL-ERD.md).

Logical types: `uuid`, `string`, `int`, `decimal`, `date`, `time`, `instant` (a UTC moment), `bool`, `json`, `binary`. Standard audit columns (`created_at`, `updated_at`, `version`) are left out of the diagrams; see the dictionary for which tables carry them. Markers: `PK` primary key, `FK` foreign key, `UK` unique. Relationship lines use crow's foot: `||` exactly one, `|o` zero or one, `o{` zero or many, `|{` one or many.

The model is split in four layers so each diagram stays readable. An entity drawn without attributes in a layer is defined in another layer.

## Layer 1. Foundation and catalog

Identity, profile, subjects, topics and exams.

```mermaid
erDiagram
    users ||--|| user_profiles : "has"
    users ||--o{ auth_accounts : "signs in with"
    users ||--o{ auth_sessions : "holds"
    users ||--o{ auth_verifications : "requests"
    users |o--o{ auth_audit_events : "is logged in"
    users ||--o{ subjects : "owns"
    subjects ||--o{ topics : "contains"
    users ||--o{ exams : "owns"
    subjects ||--o{ exams : "is studied for"
    exams ||--o{ exam_topics : "checks"
    topics ||--o{ exam_topics : "is checked in"

    users {
        uuid id PK
        string email UK
        bool email_verified
        instant age_confirmed_at
        int failed_sign_in_count
        instant locked_until
        instant deletion_requested_at
    }
    auth_accounts {
        uuid id PK
        uuid user_id FK
        string provider UK
        string provider_account_id UK
        string password_hash
    }
    auth_sessions {
        uuid id PK
        uuid user_id FK
        string token_hash UK
        instant expires_at
        instant revoked_at
    }
    auth_verifications {
        uuid id PK
        uuid user_id FK
        string purpose
        string token_hash UK
        instant expires_at
        instant consumed_at
    }
    auth_audit_events {
        uuid id PK
        uuid user_id FK
        string event_type
        instant occurred_at
    }
    user_profiles {
        uuid user_id PK, FK
        string display_name
        string timezone
        int rollover_hour
        string theme
        string primary_goal
    }
    subjects {
        uuid id PK
        uuid user_id FK, UK
        string name
        string color
        int position
        instant archived_at
    }
    topics {
        uuid id PK
        uuid user_id FK
        uuid subject_id FK, UK
        string name
        int weight
        string status
        instant archived_at
    }
    exams {
        uuid id PK
        uuid user_id FK, UK
        uuid subject_id FK, UK
        string title
        date exam_date
    }
    exam_topics {
        uuid exam_id PK, FK
        uuid topic_id PK, FK
        uuid subject_id FK
        bool completed
        int weight
    }
```

Cross-layer notes: `subjects` and `topics` are referenced by layers 2, 3 and 4 through composite keys (subject with owner, topic with subject). `users` is referenced by every user-owned entity.

## Layer 2. Activity

What the user plans, does and writes.

```mermaid
erDiagram
    subjects ||--o{ plan_entries : "is planned for"
    topics |o--o{ plan_entries : "is planned for"
    subjects ||--o{ study_sessions : "is studied in"
    topics |o--o{ study_sessions : "is studied in"
    plan_entries |o--o{ study_sessions : "is fulfilled by"
    users |o--o| timer_runs : "is running"
    subjects ||--o{ timer_runs : "is timed for"
    plan_entries |o--o{ timer_runs : "is timed against"
    timer_runs ||--o{ timer_run_segments : "consists of"
    subjects |o--o{ todos : "groups"
    subjects ||--o{ notes : "holds"
    topics |o--o{ notes : "holds"
    users ||--o{ flashcards : "owns"
    flashcards ||--o{ card_reviews : "is reviewed in"

    plan_entries {
        uuid id PK
        uuid user_id FK, UK
        uuid subject_id FK
        uuid topic_id FK
        instant starts_at
        int duration_min
        string timezone
        date local_date
        instant missed_at
    }
    study_sessions {
        uuid id PK
        uuid user_id FK, UK
        uuid subject_id FK
        uuid topic_id FK
        uuid plan_entry_id FK
        string source
        string mode
        instant started_at
        instant ended_at
        int duration_seconds
        int pomodoros_completed
        bool auto_closed
        string timezone
        date local_date
        int day_rollover_hour
        string request_key UK
    }
    timer_runs {
        uuid id PK
        uuid user_id FK, UK
        uuid subject_id FK
        uuid topic_id FK
        uuid plan_entry_id FK
        string mode
        string state
        string phase
        instant phase_ends_at
        instant started_at
        instant last_heartbeat_at
    }
    timer_run_segments {
        uuid run_id PK, FK
        int seq PK
        instant started_at
        instant ended_at
    }
    timer_settings {
        uuid user_id PK, FK
        int focus_min
        int break_min
        int long_break_min
        int cycles_before_long_break
        string audio_loop
        int audio_volume
    }
    todos {
        uuid id PK
        uuid user_id FK
        uuid subject_id FK
        uuid topic_id FK
        string title
        date due_date
        string priority
        bool done
        instant completed_at
    }
    notes {
        uuid id PK
        uuid user_id FK
        uuid subject_id FK
        uuid topic_id FK
        string title
        string body
    }
    flashcards {
        uuid id PK
        uuid user_id FK
        uuid subject_id FK
        uuid topic_id FK
        string front
        string back
        date due_date
        int interval_days
        decimal ease
    }
    card_reviews {
        uuid id PK
        uuid card_id FK
        uuid user_id FK
        string rating
        instant reviewed_at
        date local_date
        string request_key UK
    }
```

Cross-layer notes: `timer_settings` and `flashcard_settings` are one-row-per-user settings tables keyed by `user_id`; the latter is omitted here for size (see the dictionary). A timer run is deleted when it stops, so a finished timer exists only as a `study_sessions` row.

## Layer 3. Derived and goal data

Targets, per-day allocation, streak and XP.

```mermaid
erDiagram
    study_sessions ||--|{ study_session_days : "is allocated to"
    users ||--o{ daily_goal_history : "sets"
    users ||--o{ subject_goals : "sets"
    subjects ||--o| subject_goals : "is targeted by"
    users ||--|| user_gamification : "has"
    users ||--o{ daily_evaluations : "is evaluated by"
    users ||--o{ xp_ledger : "earns"

    study_session_days {
        uuid session_id PK, FK
        date local_date PK
        uuid user_id FK
        uuid subject_id FK
        int seconds
        bool is_manual
        bool is_ranked
    }
    daily_goal_history {
        uuid user_id PK, FK
        date effective_from PK
        int target_minutes
    }
    subject_goals {
        uuid user_id PK, FK
        uuid subject_id PK, FK
        int target_minutes
    }
    user_gamification {
        uuid user_id PK, FK
        int current_streak
        int longest_streak
        date streak_as_of_date
    }
    daily_evaluations {
        uuid user_id PK, FK
        date local_date PK
        int target_minutes
        int seconds
        bool goal_met
        bool freeze_used
        date freeze_week_start
    }
    xp_ledger {
        uuid id PK
        uuid user_id FK, UK
        string source_type UK
        string source_key UK
        string rule UK
        int source_revision UK
        int amount
        date local_date
    }
```

Cross-layer notes: `xp_ledger.source_key` refers to a session, to-do or date by value and has no foreign key, so removing the source never removes XP. `study_session_days` is rewritten whenever its session's times change.

## Layer 4. Composition, integration and system

Groups, notifications, AI, API access, exports and the shared kernel.

```mermaid
erDiagram
    users ||--o{ group_members : "holds"
    groups ||--|{ group_members : "has"
    groups ||--o{ group_invites : "issues"
    groups ||--o{ group_reports : "receives"
    users ||--o{ api_keys : "creates"
    users ||--o{ ai_consents : "decides"
    users ||--o{ ai_generation_requests : "submits"
    users ||--o{ notifications : "receives"
    plan_entries |o--o{ notifications : "triggers"
    users ||--o{ push_subscriptions : "registers"
    users ||--o{ data_exports : "requests"
    users ||--o{ idempotency_keys : "retries with"

    groups {
        uuid id PK
        string name
        int max_members
        uuid created_by FK
    }
    group_members {
        uuid group_id PK, FK
        uuid user_id PK, FK
        string role
        instant joined_at
        bool share_weekly_minutes
    }
    group_invites {
        uuid id PK
        uuid group_id FK
        uuid created_by FK
        string token_hash UK
        instant expires_at
        instant revoked_at
        uuid accepted_by_user_id FK
        instant accepted_at
    }
    group_reports {
        uuid id PK
        uuid group_id FK
        uuid reporter_user_id FK
        uuid target_user_id FK
        string reason
    }
    api_keys {
        uuid id PK
        uuid user_id FK
        string name
        binary key_hash UK
        string last4
        json scopes
        instant revoked_at
    }
    ai_consents {
        uuid id PK
        uuid user_id FK
        string feature
        bool granted
        string wording_version
        instant decided_at
    }
    ai_generation_requests {
        uuid id PK
        uuid user_id FK
        string status
        json params
        json proposal
        date quota_local_date
        bool counts_toward_quota
        instant accepted_at
    }
    notifications {
        uuid id PK
        uuid user_id FK
        string kind
        uuid plan_entry_id FK
        instant due_at
        date local_date
        instant delivered_at
        instant dismissed_at
    }
    push_subscriptions {
        uuid id PK
        uuid user_id FK
        string endpoint UK
    }
    data_exports {
        uuid id PK
        uuid user_id FK
        string format
        string status
        instant snapshot_at
        string file_key
        instant expires_at
    }
    idempotency_keys {
        uuid user_id PK, FK
        string scope PK
        string key PK
        string request_hash
        instant expires_at
    }
```

Cross-layer notes: `notification_preferences` (one row per user), `outbox_events`, `rate_limit_counters` and `account_deletion_log` have no relationships drawn: the first is a settings row keyed by `user_id`; the last three deliberately carry no foreign key to `users` (NFR-104 for the log, aged out by time for the others). `notifications.plan_entry_id` references a plan entry in layer 2.
