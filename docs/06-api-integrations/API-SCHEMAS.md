# Lumora API Schemas

> Status: Proposal, pending approval. Source of truth: Phase 2 PRD and Phase 1 docs.

This document defines every request and response schema used by the Lumora internal API (`/api/app`) and the Phase 3 public API (`/v1`). Wire rules (JSON, camelCase, ID and instant formats, strict parsing, resource shapes, pagination envelope, headers) are fixed in [API-CONVENTIONS](API-CONVENTIONS.md); error codes in [API-ERRORS](API-ERRORS.md); endpoint contracts, which cite these schema names, in [API-ENDPOINTS](API-ENDPOINTS.md). Field limits come only from [DATA-DICTIONARY](../04-database/DATA-DICTIONARY.md), [DATABASE-CONSTRAINTS](../04-database/DATABASE-CONSTRAINTS.md) and [FUNCTIONAL-REQUIREMENTS](../02-requirements/FUNCTIONAL-REQUIREMENTS.md). Phase 2 and 3 schemas are non-binding until that phase starts.

## 0. How to read

- Table columns: `field | type | required | constraints | source`. `source` is `DICT <table>.<column>` or an FR/BR/NFR id. "Req" is `yes`, `no`, or `resp` for response-only fields (always present unless the type says `null`).
- Naming: `<Resource>` is a response; `Create<Resource>Input` and `Update<Resource>Input` are request bodies; `<Resource>ListQuery` is a query string. `Update` inputs have every field optional and at least one field required (empty body -> `validation_failed`). All inputs are parsed `.strict()` (CONVENTIONS section 2).
- Types: `Id` (UUIDv7 string), `Instant` (ISO 8601 UTC with `Z`), `LocalDate` (`YYYY-MM-DD`), `int`, `string`, `bool`, `enum(...)`. A trailing `?` means nullable.
- Every resource whose table is marked **(V)** in the dictionary carries `version` (`Version`) and `createdAt`/`updatedAt` (`Instant`). Resources without `(V)` carry only the timestamps their table has. These standard fields are written "versioned" in the tables below instead of repeating them.
- Enum values are the database strings (CONVENTIONS section 2).

### Omitted-field rule (applies to every response, NFR-016, NFR-037)

Never present in any response, internal or public: `user_id`, `request_key`, `token_hash`, `key_hash`, `password_hash`, `failed_sign_in_count`, `locked_until` (exposed only as `details.lockedUntil` in the `account_locked` error), `file_key`, `request_hash`, `reporter_user_id`, `push_attempted_at`, and any other internal column not listed in a schema below. Group members expose only `displayName`, `role`, `joinedAt`, and `weeklyMinutes` only when that member's `share_weekly_minutes` is true; otherwise the field is absent, not null (NFR-037).

## Schema index

| Schema | Section | Used by |
| --- | --- | --- |
| `Id`, `Instant`, `LocalDate`, `Version`, `Cursor`, `PageInfo`, `ConfirmedWarnings`, `IdempotencyKeyHeader`, `ErrorEnvelope`, `PublicErrorEnvelope` | 1 | all |
| `Profile`, `UpdateProfileInput`, `OnboardingState`, `UpdateOnboardingInput` | 2 | PROF-01..03 |
| `SignUpInput`, `SignInInput`, `SignInSession`, `PasswordResetRequestInput`, `PasswordResetCompleteInput`, `RevokeOthersResult`, `DeleteAccountInput` | 3 | AUTH-01..09, PROF-04 |
| `DataExport`, `CreateDataExportInput` | 4 | PROF-05..08 |
| `Subject`, `CreateSubjectInput`, `UpdateSubjectInput`, `SubjectListQuery`, `SubjectOrderInput` | 5 | SUBJ-01..07 |
| `Topic`, `CreateTopicInput`, `UpdateTopicInput`, `TopicListQuery`, `TopicOrderInput`, `BulkTopicsInput`, `BulkTopicsPreview`, `BulkTopicsResult` | 6 | TOP-01..08 |
| `Exam`, `ExamListItem`, `ExamChecklistItem`, `ExamCountdown`, `ExamReadiness`, `CreateExamInput`, `UpdateExamInput`, `ExamListQuery`, `SetExamTopicsInput`, `SetExamTopicInput` | 7 | EXAM-01..06 |
| `PlanEntry`, `CreatePlanEntryInput`, `UpdatePlanEntryInput`, `PlanEntryListQuery` | 8 | PLAN-01..06 |
| `StudySession`, `DayAllocation`, `CreateStudySessionInput`, `UpdateStudySessionInput`, `StudySessionListQuery` | 9 | SESS-01..05 |
| `TimerState`, `TimerSegmentsSummary`, `TimerStateResponse`, `StartTimerInput`, `StopTimerResult`, `TimerSettings`, `UpdateTimerSettingsInput` | 10 | TIM-01..08 |
| `Todo`, `CreateTodoInput`, `UpdateTodoInput`, `TodoListQuery`, `SetTodoCompletionInput` | 11 | TODO-01..06 |
| `Note`, `NoteListItem`, `CreateNoteInput`, `UpdateNoteInput`, `NoteListQuery`, `RenderedNote`, `RenderNoteQuery` | 12 | NOTE-01..06 |
| `Flashcard`, `CreateFlashcardInput`, `UpdateFlashcardInput`, `FlashcardListQuery`, `ReviewQueueItem`, `ReviewQueue`, `CreateCardReviewInput`, `CardReview`, `FlashcardSettings`, `UpdateFlashcardSettingsInput` | 13 | FLASH-01..08 |
| `GoalSet`, `DailyGoal`, `SubjectGoal`, `SetDailyGoalInput`, `SetSubjectGoalInput`, `GoalProgress`, `GoalProgressQuery`, `SubjectGoalProgress` | 14 | GOAL-01..05 |
| `CalendarMonth`, `CalendarMonthQuery`, `CalendarDay`, `CalendarDayDetail` | 15 | CAL-01, CAL-02 |
| `StatsRangeQuery`, `StatsDaily`, `StatsWeekly`, `StatsMonthly`, `StatsBySubject`, `StatsGoalHitRate`, `StatsPlannedVsActual` | 16 | STAT-01..06 |
| `Gamification` | 17 | GAME-01 |
| `Notification`, `NotificationListQuery`, `NotificationPreferences`, `UpdateNotificationPreferencesInput`, `PushSubscription`, `CreatePushSubscriptionInput` | 18 | NOTIF-01..07 |
| `AiConsent`, `SetAiConsentInput`, `AiQuota`, `AiAvailabilityWindow`, `CreateScheduleRequestInput`, `ScheduleRequest`, `ScheduleProposal`, `ProposedEntry`, `AcceptProposalInput` | 19 | AI-01..07 |
| `Group`, `CreateGroupInput`, `UpdateGroupInput`, `Member`, `Invite`, `CreateInviteInput`, `InviteCreated`, `AcceptInviteInput`, `TransferAdminInput`, `SharingInput`, `LeaderboardQuery`, `LeaderboardRow`, `Leaderboard`, `CreateReportInput` | 20 | GRP-01..16 |
| `ApiKey`, `CreateApiKeyInput`, `ApiKeyCreated`, `ApiKeyScopes` | 21 | KEY-01..03 |
| `HealthStatus` | 22 | SYS-01 |
| `PublicSubject`, `PublicTopic`, `PublicStudySession`, `PublicPlanEntry`, `PublicTodo`, `PublicNote`, `PublicNoteListItem`, `PublicExam`, `PublicExamListItem` and their input schemas | 23 | PUB-01..37 |

## 1. Shared schemas

| Schema | Definition | Constraints | Source |
| --- | --- | --- | --- |
| `Id` | string | UUIDv7, lowercase hyphenated. A malformed path ID yields `not_found`, not `validation_failed` (see [API-SECURITY](API-SECURITY.md) section 5). | DICT "Reading this document"; CONVENTIONS section 2 |
| `Instant` | string | ISO 8601 UTC with `Z`, for example `2026-11-06T09:30:00Z`. | CONVENTIONS section 2 |
| `LocalDate` | string | `YYYY-MM-DD`; a local date in the profile zone unless stated. | CONVENTIONS section 2, BR-030 |
| `Version` | int | `>= 1`. Sent as `If-Match: "<version>"`, returned as `ETag` and body `version`. | DICT standard columns, NFR-094, ADR-011 |
| `Cursor` | string | Opaque base64url of the last row's sort keys plus id. Malformed or tampered -> `invalid_cursor`. | FR-224, CONVENTIONS section 4 |
| `PageInfo` | `{ nextCursor: string?, hasMore: bool }` | Present as `page` on cursor-paginated lists. | FR-224 |
| `PageQuery` | `{ limit?: int, cursor?: Cursor }` | `limit` 1..100, default 50, else `invalid_page_size`. Merged into every cursor-paginated `<Resource>ListQuery`. | FR-224 |
| `ListEnvelope<T>` | `{ data: T[] }` or `{ data: T[], page: PageInfo }` | Pagination variant per endpoint. | CONVENTIONS section 3 |
| `ConfirmedWarnings` | `("overlap" \| "exam_date")[]` | Optional on plan-entry create/update and AI accept; unknown values -> `validation_failed`. | BR-026, FR-038, CONVENTIONS section 8 |
| `IdempotencyKeyHeader` | header string | 1..100 chars, `^[A-Za-z0-9_-]+$`. | DICT `study_sessions.request_key`, `idempotency_keys.key`, ADR-011, CONVENTIONS section 7 |
| `ErrorEnvelope` | `{ code, category, message, details, requestId, retryable, retryAfter? }` | `code` from [API-ERRORS](API-ERRORS.md); `retryAfter` also sent as `Retry-After`. | ERROR-HANDLING section 2, API-ERRORS |
| `PublicErrorEnvelope` | `{ code, message, details, requestId }` | No `category`, `retryable`, `retryAfter` in the body. | API-ERRORS |

## 2. Profile and onboarding

### Profile

Used by PROF-01, PROF-02 (response).

| Field | Type | Req | Constraints | Source |
| --- | --- | --- | --- | --- |
| `email` | string | resp | Read-only; sign-in email. | DICT `users.email` |
| `displayName` | string | resp | 1..50 trimmed. | DICT `user_profiles.display_name` |
| `timezone` | string | resp | IANA zone. | DICT `user_profiles.timezone`, EC-006 |
| `rolloverHour` | int | resp | 0..23. | DICT `user_profiles.rollover_hour`, BR-014 |
| `theme` | enum(`light`,`dark`,`system`) | resp | | DICT `user_profiles.theme`, FR-138 |
| `primaryGoal` | enum(`exam_prep`,`coursework`,`self_learning`)? | resp | | DICT `user_profiles.primary_goal`, FR-137 |
| `onboarding` | `OnboardingState` | resp | | DICT `user_profiles.onboarding_*` |
| `hasPassword` | bool | resp | True when a `credential` account link exists; drives the account-deletion re-authentication choice. | DICT `auth_accounts.provider` |
| `googleLinked` | bool | resp | | DICT `auth_accounts.provider` |
| `version`, `createdAt`, `updatedAt` | versioned | resp | | DICT `user_profiles` |

### UpdateProfileInput

Used by PROF-02. All fields optional, at least one required. Changes apply forward only (BR-014, EC-006).

| Field | Type | Req | Constraints | Source |
| --- | --- | --- | --- | --- |
| `displayName` | string | no | 1..50 after trim | DICT `user_profiles.display_name` |
| `timezone` | string | no | Valid IANA zone, else `invalid_timezone` | DICT `user_profiles.timezone` |
| `rolloverHour` | int | no | 0..23 | DICT `user_profiles.rollover_hour` |
| `theme` | enum | no | `light`, `dark`, `system` | FR-138 |
| `primaryGoal` | enum? | no | `exam_prep`, `coursework`, `self_learning`, or null to clear | FR-137 |

### OnboardingState

Used by PROF-01, PROF-03 (response).

| Field | Type | Req | Constraints | Source |
| --- | --- | --- | --- | --- |
| `completedAt` | Instant? | resp | | DICT `user_profiles.onboarding_completed_at` |
| `dismissedAt` | Instant? | resp | | DICT `user_profiles.onboarding_dismissed_at`, FR-135 |
| `steps` | object | resp | Map of step key -> completion Instant; only completed steps appear. Skipped steps are absent (AC-FR-135-1). | DICT `user_profiles.onboarding_steps` |

Step keys are the four steps of the wizard in FR-134, in order: `primary_goal` (FR-137), `first_subject` (FR-010), `daily_goal_timezone` (FR-070, EC-006), `first_session` (FR-136). The page shows "Step N of 4" ([PAGE-SPECIFICATIONS](../05-ui-ux/PAGE-SPECIFICATIONS.md) A-1). The dictionary only says "map of step name" and no source names the keys, so these four wire keys are a transcription of the FR-134 wording, recorded as reconciliation 11 in [API-CONVENTIONS.md](API-CONVENTIONS.md); any other key gives `validation_failed`.

### UpdateOnboardingInput

Used by PROF-03. Exactly one of the two shapes (discriminated by `action`).

| Field | Type | Req | Constraints | Source |
| --- | --- | --- | --- | --- |
| `action` | enum(`complete_step`,`complete`,`dismiss`,`reopen`) | yes | `complete_step` records a step; `complete` sets `completedAt`; `dismiss` sets `dismissedAt` (defaults stay, AC-FR-135-2); `reopen` clears both (FR-135) | FR-134, FR-135 |
| `step` | enum(`primary_goal`,`first_subject`,`daily_goal_timezone`,`first_session`) | when `action = complete_step` | Skipping a step sends nothing (AC-FR-135-1). The values of the step itself are saved through PROF-02, SUBJ-02, GOAL-02 in their own calls. | FR-134, FR-135 |

## 3. Authentication

### SignUpInput

Used by AUTH-01.

| Field | Type | Req | Constraints | Source |
| --- | --- | --- | --- | --- |
| `email` | string | yes | Valid email; unique case-insensitive (`duplicate_email`) | DICT `users.email`, FR-001 |
| `password` | string | yes | Minimum length per FR-001 (`password_too_short`) | FR-001, NFR-011 |
| `ageConfirmed` | bool | yes | Must be `true` (`age_confirmation_required`) | DICT `users.age_confirmed_at`, NFR-035 |
| `timezone` | string | yes | Valid IANA zone (`invalid_timezone`) | DICT `user_profiles.timezone`, EC-006 |

Response: `Profile` with `201`, plus the session cookie (CONVENTIONS section 3, [API-SECURITY](API-SECURITY.md) section 1).

### SignInInput

Used by AUTH-02.

| Field | Type | Req | Constraints | Source |
| --- | --- | --- | --- | --- |
| `email` | string | yes | | FR-002 |
| `password` | string | yes | | FR-002 |

Response: `Profile` with `200` and the session cookie.

### SignInSession

Used by AUTH-07 (list), AUTH-08, AUTH-09. A "sign-in" is one row of `auth_sessions`.

| Field | Type | Req | Constraints | Source |
| --- | --- | --- | --- | --- |
| `id` | Id | resp | `signInId` path parameter | DICT `auth_sessions.id` |
| `current` | bool | resp | True for the session making the request | FR-008 |
| `device` | string | resp | Parsed from the stored user agent (max 512 chars stored) | DICT `auth_sessions.user_agent` |
| `lastActiveAt` | Instant | resp | | DICT `auth_sessions.last_active_at` |
| `createdAt` | Instant | resp | | DICT `auth_sessions.created_at` |

IP, token hash and expiry are omitted (omitted-field rule). Revoked sessions are not listed (NFR-013).

### PasswordResetRequestInput / PasswordResetCompleteInput

Used by AUTH-05 and AUTH-06.

| Schema | Field | Type | Req | Constraints | Source |
| --- | --- | --- | --- | --- | --- |
| `PasswordResetRequestInput` | `email` | string | yes | Response is a neutral `202` body identical for known and unknown emails | FR-005 |
| `PasswordResetCompleteInput` | `token` | string | yes | Single use, valid 60 minutes (`reset_token_invalid`) | DICT `auth_verifications.expires_at`, `consumed_at`, FR-005 |
| `PasswordResetCompleteInput` | `newPassword` | string | yes | Same rule as sign-up password | FR-001, FR-005 |

### RevokeOthersResult

Used by AUTH-09: `{ revoked: int }` (count of other sessions revoked, `>= 0`). Source: FR-008.

### DeleteAccountInput

Used by PROF-04.

| Field | Type | Req | Constraints | Source |
| --- | --- | --- | --- | --- |
| `password` | string | one of | Required for accounts with a credential link | FR-007, DICT `auth_accounts` |
| `reauthToken` | string | one of | Google re-authentication proof for Google-only accounts | FR-007 |
| `confirmation` | string | yes | Typed confirmation text defined by FR-007 | FR-007 |

Response `202` `{ requestedAt: Instant }`. Source: DICT `users.deletion_requested_at`, `account_deletion_log.requested_at`, BR-032.

## 4. Data export

### DataExport

Used by PROF-05, PROF-06, PROF-07.

| Field | Type | Req | Constraints | Source |
| --- | --- | --- | --- | --- |
| `id` | Id | resp | | DICT `data_exports.id` |
| `format` | enum(`csv`,`json`) | resp | | DICT `data_exports.format` |
| `status` | enum(`running`,`completed`,`failed`) | resp | | DICT `data_exports.status` |
| `progressPercent` | int | resp | 0..100 | DICT `data_exports.progress_percent` |
| `snapshotAt` | Instant | resp | | DICT `data_exports.snapshot_at`, EC-027 |
| `fileBytes` | int? | resp | Present when `completed` | DICT `data_exports.file_bytes` |
| `expiresAt` | Instant? | resp | Completion plus 48 h; clients must not assume 24 h | DICT `data_exports.expires_at`, FR-132 |
| `errorCode` | string? | resp | Set when `failed` | DICT `data_exports.error_code` |
| `completedAt` | Instant? | resp | | DICT `data_exports.completed_at` |
| `createdAt`, `updatedAt` | Instant | resp | | DICT `data_exports` |

`file_key` is never exposed; the file is only streamed by PROF-08 after an ownership and expiry check.

### CreateDataExportInput

Used by PROF-05: `format` (enum `csv` \| `json`, required). Source: DICT `data_exports.format`, FR-130, FR-131.

## 5. Subjects

### Subject

Used by SUBJ-01..07 (response).

| Field | Type | Req | Constraints | Source |
| --- | --- | --- | --- | --- |
| `id` | Id | resp | | DICT `subjects.id` |
| `name` | string | resp | 1..100 trimmed | DICT `subjects.name`, FR-010 |
| `color` | string | resp | A palette key from configuration | DICT `subjects.color` |
| `position` | int | resp | `>= 0` | DICT `subjects.position` |
| `archivedAt` | Instant? | resp | | DICT `subjects.archived_at`, BR-029 |
| `version`, `createdAt`, `updatedAt` | versioned | resp | | DICT `subjects` |

### CreateSubjectInput

Used by SUBJ-02.

| Field | Type | Req | Constraints | Source |
| --- | --- | --- | --- | --- |
| `name` | string | yes | 1..100 trimmed; active name unique per user, case-insensitive (`name_conflict`) | DICT `subjects.name`, FR-010 |
| `color` | string | yes | Palette key; validated against the configuration palette, else `validation_failed` | DICT `subjects.color` |

Position is assigned server-side (appended last, FR-012).

### UpdateSubjectInput

Used by SUBJ-04: `name`, `color` (same constraints as create; both optional, at least one). Source: FR-011. Position changes only via SUBJ-05; archive state only via SUBJ-06/07.

### SubjectListQuery

Used by SUBJ-01: `includeArchived` (bool, default false). Unpaginated, ordered by `position`. Source: FR-010, FR-013.

### SubjectOrderInput

Used by SUBJ-05: `subjectIds` (`Id[]`, required, exactly all active subject IDs, no duplicates, else `validation_failed`). Source: FR-012.

## 6. Topics

### Topic

Used by TOP-01..08 (response).

| Field | Type | Req | Constraints | Source |
| --- | --- | --- | --- | --- |
| `id` | Id | resp | | DICT `topics.id` |
| `subjectId` | Id | resp | | DICT `topics.subject_id` |
| `name` | string | resp | 1..150 trimmed | DICT `topics.name` |
| `weight` | int | resp | 1..5 | DICT `topics.weight`, BR-024 |
| `status` | enum(`not_started`,`in_progress`,`done`) | resp | Never auto-changed | DICT `topics.status`, FR-019 |
| `position` | int | resp | `>= 0` | DICT `topics.position` |
| `archivedAt` | Instant? | resp | | DICT `topics.archived_at`, EC-008 |
| `version`, `createdAt`, `updatedAt` | versioned | resp | | DICT `topics` |

### CreateTopicInput

Used by TOP-02. `name` (string, required, 1..150 trimmed, DICT `topics.name`); `weight` (int, optional, 1..5, default 1, DICT `topics.weight`); `status` (enum, optional, default `not_started`, DICT `topics.status`). The subject comes from the path.

### UpdateTopicInput

Used by TOP-05. `name`, `weight`, `status` with the same constraints, all optional, at least one. Source: FR-016, FR-019.

### TopicListQuery

Used by TOP-01: `includeArchived` (bool, default false). Unpaginated per subject, ordered by `position`. Source: FR-015.

### TopicOrderInput

Used by TOP-06: `topicIds` (`Id[]`, required, exactly all active topic IDs of the subject). Source: FR-016.

### BulkTopicsInput

Used by TOP-03.

| Field | Type | Req | Constraints | Source |
| --- | --- | --- | --- | --- |
| `lines` | string[] | yes | At most 200 non-blank lines (201st -> `input_too_large`); each 1..150 chars after trim | FR-017, DICT `topics.name` |
| `dryRun` | bool | no | Default false. True returns `BulkTopicsPreview` and needs no idempotency key | FR-017 |

### BulkTopicsPreview / BulkTopicsResult

| Schema | Fields | Source |
| --- | --- | --- |
| `BulkTopicsPreview` (dry run, `200`) | `valid: string[]`, `duplicates: string[]`, `tooLong: string[]` | FR-017 |
| `BulkTopicsResult` (`201`) | `data: Topic[]` (created topics in input order); atomic: all or none | FR-017 |

## 7. Exams

### ExamChecklistItem

Embedded in `Exam.checklist`. Source: DICT `exam_topics`.

| Field | Type | Req | Constraints | Source |
| --- | --- | --- | --- | --- |
| `topicId` | Id | resp | | DICT `exam_topics.topic_id` |
| `name` | string | resp | Topic name | DICT `topics.name` |
| `completed` | bool | resp | | DICT `exam_topics.completed`, FR-122 |
| `weight` | int | resp | 1..5; Phase 2 (FR-127), otherwise 1 | DICT `exam_topics.weight` |

### ExamCountdown

Embedded in `Exam.countdown`: `daysRemaining` (int, whole calendar days from today in the profile zone, `0` on exam day; negative values are not returned, archived exams omit the object) and `isToday` (bool). Source: FR-123, BR-025, BR-030.

### ExamReadiness (Phase 2)

Embedded in `Exam.readiness` from Phase 2; absent in MVP responses.

| Field | Type | Req | Constraints | Source |
| --- | --- | --- | --- | --- |
| `readinessPercent` | int? | resp | Whole percent 0..100; `null` when the exam has zero active topics | FR-126, BR-024, EC-014 |
| `readinessNote` | string? | resp | Set when `readinessPercent` is null, or when a topic was removed from the checklist | FR-126, FR-122, EC-008 |

### Exam

Used by EXAM-02..06 (response). `ExamListItem` (EXAM-01) is the same without `checklist`, with `topicCount` and `completedCount` instead.

| Field | Type | Req | Constraints | Source |
| --- | --- | --- | --- | --- |
| `id` | Id | resp | | DICT `exams.id` |
| `subjectId` | Id | resp | | DICT `exams.subject_id`, BR-023 |
| `title` | string | resp | 1..200 trimmed | DICT `exams.title` |
| `examDate` | LocalDate | resp | | DICT `exams.exam_date` |
| `state` | enum(`upcoming`,`archived`) | resp | Derived from `examDate` vs today in the profile zone | BR-025, FR-125 |
| `countdown` | `ExamCountdown` | resp (upcoming) | | FR-123 |
| `checklist` | `ExamChecklistItem[]` | resp (detail only) | | FR-122 |
| `readiness` | `ExamReadiness` | resp (Phase 2) | | FR-126 |
| `version`, `createdAt`, `updatedAt` | versioned | resp | | DICT `exams` |

### CreateExamInput

Used by EXAM-02. `subjectId` (Id, required, active subject, else `subject_archived`/`not_found`); `title` (string, required, 1..200); `examDate` (LocalDate, required, today or later in the profile zone, else `exam_date_in_past`). Source: DICT `exams`, FR-120, EC-013.

### UpdateExamInput

Used by EXAM-04. `subjectId`, `title`, `examDate`, all optional, at least one. A past `examDate` is allowed on edit (DICT `exams.exam_date`). Changing `subjectId` clears the checklist in the same transaction (FR-121). Source: FR-121.

### ExamListQuery

Used by EXAM-01: `state` (enum `upcoming` default \| `archived`). `upcoming` is unpaginated, nearest first; `archived` is cursor-paginated (`PageQuery`), newest first. Source: FR-123, FR-125, FR-224.

### SetExamTopicsInput / SetExamTopicInput

| Schema | Used by | Fields | Source |
| --- | --- | --- | --- |
| `SetExamTopicsInput` | EXAM-05 | `topicIds: Id[]` (each must belong to the exam's subject, else `validation_failed`); replaces membership, keeps `completed` of retained topics | FR-122, BR-023 |
| `SetExamTopicInput` | EXAM-06 | `completed: bool` (required); `weight: int` 1..5 optional, Phase 2 only | FR-122, FR-127, DICT `exam_topics.weight` |

## 8. Plan entries

### PlanEntry

Used by PLAN-01..06 (response).

| Field | Type | Req | Constraints | Source |
| --- | --- | --- | --- | --- |
| `id` | Id | resp | | DICT `plan_entries.id` |
| `subjectId` | Id | resp | | DICT `plan_entries.subject_id` |
| `topicId` | Id? | resp | Same subject as `subjectId` | DICT `plan_entries.topic_id` |
| `startsAt` | Instant | resp | | DICT `plan_entries.starts_at` |
| `durationMin` | int | resp | 5..480 | DICT `plan_entries.duration_min`, BR-001 |
| `timezone` | string | resp | Frozen | DICT `plan_entries.timezone` |
| `localDate` | LocalDate | resp | Frozen | DICT `plan_entries.local_date` |
| `status` | enum(`upcoming`,`done`,`missed`) | resp | Derived: `missed` if `missed_at` set; `done` if a session is linked; else `upcoming` | DICT `plan_entries.missed_at`, BR-005, FR-033 |
| `missedAt` | Instant? | resp | | DICT `plan_entries.missed_at` |
| `plannedMin` | int | resp | Equals `durationMin` | BR-001, FR-036 |
| `actualSeconds` | int | resp | Sum of linked session durations | BR-002, FR-036 |
| `varianceSeconds` | int | resp | Signed: actual minus planned in seconds | BR-004, FR-036 |
| `warnings` | object[]? | resp (create/update only) | Advisory overlap or exam-date warnings that were confirmed | BR-026, FR-038 |
| `version`, `createdAt`, `updatedAt` | versioned | resp | | DICT `plan_entries` |

### CreatePlanEntryInput

Used by PLAN-02.

| Field | Type | Req | Constraints | Source |
| --- | --- | --- | --- | --- |
| `subjectId` | Id | yes | Active subject (`subject_archived` otherwise) | DICT `plan_entries.subject_id`, BR-029 |
| `topicId` | Id? | no | Belongs to `subjectId` | DICT `plan_entries.topic_id` |
| `startsAt` | Instant | yes | In the future | FR-030 |
| `durationMin` | int | yes | 5..480 | DICT `plan_entries.duration_min` |
| `confirmedWarnings` | `ConfirmedWarnings` | no | | BR-026, FR-038 |

### UpdatePlanEntryInput

Used by PLAN-04. `subjectId`, `topicId`, `startsAt`, `durationMin`, `confirmedWarnings`; same constraints; all optional, at least one. Only entries that have not started are editable (`past_entry_read_only`, BR-028). Source: FR-031, FR-065..069.

### PlanEntryListQuery

Used by PLAN-01.

| Field | Type | Req | Constraints | Source |
| --- | --- | --- | --- | --- |
| `from` | LocalDate | yes | Inclusive | FR-037, CONVENTIONS section 5 |
| `to` | LocalDate | yes | Inclusive; span at most 93 days, else `invalid_date_range` | CONVENTIONS section 4 |
| `subjectId` | Id | no | | FR-037 |
| `status` | enum(`upcoming`,`done`,`missed`) | no | | FR-037 |

Unpaginated, ordered `startsAt`, `id`.

## 9. Study sessions

### DayAllocation

Embedded in `StudySession.dayAllocations`: `localDate` (LocalDate), `seconds` (int, 1..86400), `isManual` (bool). Source: DICT `study_session_days`, BR-016, EC-009.

### StudySession

Used by SESS-01..05, TIM-05 (embedded in `StopTimerResult`).

| Field | Type | Req | Constraints | Source |
| --- | --- | --- | --- | --- |
| `id` | Id | resp | | DICT `study_sessions.id` |
| `subjectId` | Id | resp | | DICT `study_sessions.subject_id` |
| `topicId` | Id? | resp | | DICT `study_sessions.topic_id` |
| `planEntryId` | Id? | resp | Cleared when the entry is deleted | DICT `study_sessions.plan_entry_id`, EC-022 |
| `source` | enum(`timer`,`manual`) | resp | Immutable | DICT `study_sessions.source`, BR-010 |
| `mode` | enum(`stopwatch`,`pomodoro`)? | resp | Null when `source = manual` | DICT `study_sessions.mode` |
| `startedAt` | Instant | resp | | DICT `study_sessions.started_at` |
| `endedAt` | Instant | resp | After `startedAt` | DICT `study_sessions.ended_at` |
| `durationSeconds` | int | resp | 60..86400 | DICT `study_sessions.duration_seconds`, BR-008 |
| `pomodorosCompleted` | int | resp | `>= 0`; 0 unless `mode = pomodoro` | DICT `study_sessions.pomodoros_completed`, FR-058 |
| `autoClosed` | bool | resp | | DICT `study_sessions.auto_closed`, BR-006 |
| `timezone` | string | resp | Frozen | DICT `study_sessions.timezone`, NFR-091 |
| `localDate` | LocalDate | resp | Frozen local date of `startedAt` | DICT `study_sessions.local_date` |
| `dayAllocations` | `DayAllocation[]` | resp | | DICT `study_session_days` |
| `serverTime` | Instant | resp (create only) | | CONVENTIONS section 12 |
| `version`, `createdAt`, `updatedAt` | versioned | resp | | DICT `study_sessions` |

`request_key` and `day_rollover_hour` are omitted (omitted-field rule).

### CreateStudySessionInput

Used by SESS-03 (manual only, BR-010, FR-042).

| Field | Type | Req | Constraints | Source |
| --- | --- | --- | --- | --- |
| `subjectId` | Id | yes | Active subject | DICT `study_sessions.subject_id`, BR-029 |
| `topicId` | Id? | no | Belongs to `subjectId` | DICT `study_sessions.topic_id` |
| `planEntryId` | Id? | no | Owned by caller | DICT `study_sessions.plan_entry_id`, BR-003 |
| `startedAt` | Instant | yes | Not in the future (`manual_entry_in_future`) | EC-011, FR-042 |
| `endedAt` | Instant | yes | After `startedAt`; resulting duration 60..86400 s and at most 24 h per day (`manual_entry_too_long`, `daily_total_exceeded`); no overlap (`manual_entry_overlaps_session`) | DICT `study_sessions`, EC-011, FR-048 |

Duration is derived (`endedAt - startedAt`), never sent. `source` is not accepted (always `manual`).

### UpdateStudySessionInput

Used by SESS-04: `subjectId`, `topicId`, `planEntryId`, `startedAt`, `endedAt`; same rules as create; `source` present -> `validation_failed`; duration recomputed and days rewritten. Source: FR-043, DICT `study_sessions.duration_seconds`.

### StudySessionListQuery

Used by SESS-01: `PageQuery` plus `from`, `to` (LocalDate, inclusive, `from <= to`), `subjectId`, `topicId`, `source` (enum). Order `startedAt` desc, `id` desc. Source: FR-061, FR-224.

## 10. Timer

### TimerSegmentsSummary

Embedded in `TimerState.segments`: `count` (int, `>= 0`) and `openSegmentStartedAt` (Instant?, non-null while running). Source: DICT `timer_run_segments`.

### TimerState

Used by TIM-01..06 (response).

| Field | Type | Req | Constraints | Source |
| --- | --- | --- | --- | --- |
| `id` | Id | resp | Run id | DICT `timer_runs.id` |
| `state` | enum(`running`,`paused`) | resp | | DICT `timer_runs.state` |
| `mode` | enum(`stopwatch`,`pomodoro`) | resp | | DICT `timer_runs.mode` |
| `subjectId` | Id | resp | | DICT `timer_runs.subject_id` |
| `topicId` | Id? | resp | | DICT `timer_runs.topic_id` |
| `planEntryId` | Id? | resp | | DICT `timer_runs.plan_entry_id` |
| `phase` | enum(`focus`,`break`,`long_break`)? | resp | Non-null iff `mode = pomodoro` | DICT `timer_runs.phase` |
| `phaseEndsAt` | Instant? | resp | Pomodoro only | DICT `timer_runs.phase_ends_at` |
| `cycleIndex` | int | resp | `>= 1` | DICT `timer_runs.cycle_index` |
| `pomodorosCompleted` | int | resp | `>= 0` | DICT `timer_runs.pomodoros_completed` |
| `focusMin`, `breakMin`, `longBreakMin`, `cyclesBeforeLongBreak` | int | resp | Settings snapshot taken at start | DICT `timer_runs`, FR-057 |
| `startedAt` | Instant | resp | | DICT `timer_runs.started_at` |
| `segments` | `TimerSegmentsSummary` | resp | | DICT `timer_run_segments` |
| `lastHeartbeatAt` | Instant | resp | | DICT `timer_runs.last_heartbeat_at`, BR-006 |
| `serverTime` | Instant | resp | For client clock offset | BR-012, EC-010, FR-054 |
| `version` | Version | resp | Sent as `If-Match` on pause/resume/stop | DICT `timer_runs.version`, EC-020 |

### TimerStateResponse

Used by TIM-01: `{ timer: TimerState | null, serverTime: Instant }`. Source: FR-054, FR-059.

### StartTimerInput

Used by TIM-02.

| Field | Type | Req | Constraints | Source |
| --- | --- | --- | --- | --- |
| `mode` | enum(`stopwatch`,`pomodoro`) | yes | | FR-050, FR-051 |
| `subjectId` | Id | yes | Active subject (`subject_archived`) | DICT `timer_runs.subject_id`, BR-029 |
| `topicId` | Id? | no | Belongs to `subjectId` | DICT `timer_runs.topic_id` |
| `planEntryId` | Id? | no | | DICT `timer_runs.plan_entry_id` |
| `replaceRunning` | bool | no | Default false; true stops and saves the current run first | FR-053, EC-002 |

### StopTimerResult

Used by TIM-05.

| Field | Type | Req | Constraints | Source |
| --- | --- | --- | --- | --- |
| `outcome` | enum(`saved`,`time_only`,`discarded`) | resp | `discarded` under 60 s; pomodoro `saved` at 5 min of focus or more, `time_only` from 1 to under 5 min | BR-007, BR-008, FR-058 |
| `session` | `StudySession` | resp when `saved` or `time_only` | | FR-058 |
| `message` | string | resp | Plain-language outcome (EC-012) | EC-012 |

### TimerSettings

Used by TIM-07, TIM-08 (response). Defaults come from configuration when no row exists (`version: 0`).

| Field | Type | Req | Constraints | Source |
| --- | --- | --- | --- | --- |
| `focusMin` | int | resp | 1..120, default 25 | DICT `timer_settings.focus_min`, FR-057, BR-009 |
| `breakMin` | int | resp | 1..60, default 5 | DICT `timer_settings.break_min` |
| `longBreakMin` | int | resp | 1..60, default 15 | DICT `timer_settings.long_break_min` |
| `cyclesBeforeLongBreak` | int | resp | 2..8, default 4 | DICT `timer_settings.cycles_before_long_break` |
| `audioLoop` | enum(`none`,`rain`,`white_noise`,`cafe`) | resp | Phase 2 | DICT `timer_settings.audio_loop`, FR-180 |
| `audioVolume` | int | resp | 0..100, default 50; Phase 2 | DICT `timer_settings.audio_volume`, FR-181 |
| `version`, `updatedAt` | versioned | resp | `version` is `0` while the row is absent | DICT `timer_settings` |

### UpdateTimerSettingsInput

Used by TIM-08: any of the fields above except `version`, same ranges, at least one. Out-of-range -> `validation_failed` with the allowed range in `details`, previous value kept. Does not alter a running timer. Source: FR-057, FR-183.

## 11. To-dos

### Todo

Used by TODO-01..06.

| Field | Type | Req | Constraints | Source |
| --- | --- | --- | --- | --- |
| `id` | Id | resp | | DICT `todos.id` |
| `title` | string | resp | 1..200 | DICT `todos.title`, FR-090 |
| `subjectId` | Id? | resp | | DICT `todos.subject_id` |
| `topicId` | Id? | resp | Requires `subjectId` | DICT `todos.topic_id` |
| `dueDate` | LocalDate? | resp | | DICT `todos.due_date` |
| `priority` | enum(`high`,`medium`,`low`) | resp | | DICT `todos.priority`, BR-031 |
| `done` | bool | resp | | DICT `todos.done` |
| `completedAt` | Instant? | resp | Non-null iff `done` | DICT `todos.completed_at` |
| `overdue` | bool | resp | Derived: open and `dueDate` before today in the profile zone | FR-094 |
| `version`, `createdAt`, `updatedAt` | versioned | resp | | DICT `todos` |

### CreateTodoInput

Used by TODO-02: `title` (string, required, 1..200, not whitespace-only, DICT `todos.title`); `subjectId` (Id?, optional); `topicId` (Id?, optional, requires `subjectId`, DICT `todos.topic_id`); `dueDate` (LocalDate?, optional); `priority` (enum, default `medium`, BR-031). Source: FR-090, FR-096.

### UpdateTodoInput

Used by TODO-04: same fields as create, all optional and nullable where nullable above, at least one; `done` is not accepted on the internal API (use TODO-05). Source: FR-091.

### TodoListQuery

Used by TODO-01: `PageQuery` plus `status` (enum `open` default \| `done` \| `all`), `subjectId`, `priority`, `due` (enum `overdue` \| `today` \| `within7` \| `none`). Order is the FR-095 composite; cursor encodes `(priorityRank, dueDate|null, createdAt, id)`. Source: FR-094, FR-095, FR-224.

### SetTodoCompletionInput

Used by TODO-05: `done` (bool, required). Idempotent set; no `If-Match`. Source: FR-093.

## 12. Notes

### Note

Used by NOTE-02..04 (response). `NoteListItem` (NOTE-01) is the same without `body` and with `bodyPreview`.

| Field | Type | Req | Constraints | Source |
| --- | --- | --- | --- | --- |
| `id` | Id | resp | | DICT `notes.id` |
| `subjectId` | Id | resp | | DICT `notes.subject_id` |
| `topicId` | Id? | resp | | DICT `notes.topic_id` |
| `title` | string | resp | 1..200 | DICT `notes.title` |
| `body` | string | resp (detail) | Raw Markdown, at most 100000 chars, never sanitized on write | DICT `notes.body`, ADR-007, FR-100 |
| `bodyPreview` | string | resp (list) | First 200 chars of `body` | NOTE-01 contract |
| `version`, `createdAt`, `updatedAt` | versioned | resp | | DICT `notes` |

### CreateNoteInput / UpdateNoteInput

Used by NOTE-02 and NOTE-04. `subjectId` (Id, required on create), `topicId` (Id?, belongs to the subject), `title` (string, 1..200), `body` (string, default empty, at most 100000 chars, else `input_too_large`). Update: all optional, at least one. Source: DICT `notes`, FR-100, FR-102.

### NoteListQuery

Used by NOTE-01: `PageQuery` plus `subjectId`, `topicId`. Order `updatedAt` desc, `id` desc. Source: FR-100, FR-224.

### RenderedNote / RenderNoteQuery

| Schema | Used by | Fields | Source |
| --- | --- | --- | --- |
| `RenderedNote` | NOTE-05 | `html: string` (sanitized server-side; external links carry `rel`) | FR-101, ADR-007, NFR-015 |
| `RenderNoteQuery` | NOTE-05 | `allowImages: bool`, default false | FR-101 |

## 13. Flashcards (Phase 2)

### Flashcard

Used by FLASH-01..04, FLASH-06 (embedded).

| Field | Type | Req | Constraints | Source |
| --- | --- | --- | --- | --- |
| `id` | Id | resp | | DICT `flashcards.id` |
| `subjectId` | Id? | resp | | DICT `flashcards.subject_id` |
| `topicId` | Id? | resp | Requires `subjectId` | DICT `flashcards.topic_id` |
| `front`, `back` | string | resp | 1..1000 | DICT `flashcards.front`, `flashcards.back`, FR-107 |
| `dueDate` | LocalDate | resp | | DICT `flashcards.due_date` |
| `intervalDays` | int | resp | `>= 0` | DICT `flashcards.interval_days` |
| `repetitions`, `lapses` | int | resp | `>= 0` | DICT `flashcards.repetitions`, `.lapses` |
| `lastReviewedAt` | Instant? | resp | | DICT `flashcards.last_reviewed_at` |
| `version`, `createdAt`, `updatedAt` | versioned | resp | | DICT `flashcards` |

`ease` is a scheduler internal and is not exposed.

### CreateFlashcardInput / UpdateFlashcardInput

Used by FLASH-02, FLASH-03: `front`, `back` (string, required on create, 1..1000), `subjectId` (Id?), `topicId` (Id?, requires `subjectId`). Update: all optional, at least one; the schedule is not reset. Source: DICT `flashcards`, FR-107, FR-108.

### FlashcardListQuery

Used by FLASH-01: `PageQuery` plus `subjectId`, `topicId`. Order `createdAt` desc, `id`. Source: FR-107, FR-224.

### ReviewQueueItem / ReviewQueue

| Schema | Fields | Used by | Source |
| --- | --- | --- | --- |
| `ReviewQueueItem` | `id`, `subjectId?`, `front`, `back`, `dueDate`, `overdueDays: int` (0 if due today) | FLASH-05 | FR-109, DICT `flashcards` |
| `ReviewQueue` | `data: ReviewQueueItem[]`, `remainingToday: int` (daily limit minus reviews today) | FLASH-05 | FR-111, DICT `flashcard_settings.daily_review_limit`, FR-110 |

### CreateCardReviewInput / CardReview

| Schema | Field | Type | Constraints | Source |
| --- | --- | --- | --- | --- |
| `CreateCardReviewInput` | `rating` | enum(`again`,`hard`,`good`,`easy`) | Required | DICT `card_reviews.rating`, FR-110 |
| `CardReview` (response) | `card` | `Flashcard` | Updated card | FR-112 |
| `CardReview` | `rating`, `reviewedAt`, `dueDateAfter`, `intervalDaysAfter` | enum, Instant, LocalDate, int | `intervalDaysAfter >= 0` | DICT `card_reviews` |

The `Idempotency-Key` is stored as `card_reviews.request_key` (required, up to 100 chars).

### FlashcardSettings / UpdateFlashcardSettingsInput

Used by FLASH-07, FLASH-08: `dailyReviewLimit` (int, 1..500, default 50, DICT `flashcard_settings.daily_review_limit`, FR-111). No `version` (table has none).

## 14. Goals

### DailyGoal / SubjectGoal / GoalSet

Used by GOAL-01 (`GoalSet`), GOAL-02 (`DailyGoal`), GOAL-03 (`SubjectGoal`).

| Schema | Field | Type | Constraints | Source |
| --- | --- | --- | --- | --- |
| `DailyGoal` | `targetMinutes` | int | 5..1440, default 120 | DICT `daily_goal_history.target_minutes`, FR-070, BR-013 |
| `DailyGoal` | `effectiveFrom` | LocalDate | First local day the target applies | DICT `daily_goal_history.effective_from`, FR-074 |
| `SubjectGoal` | `subjectId` | Id | | DICT `subject_goals.subject_id` |
| `SubjectGoal` | `targetMinutes` | int | 5..1440 | DICT `subject_goals.target_minutes`, FR-071 |
| `GoalSet` | `daily` | `DailyGoal` | Target in force today | BR-015 |
| `GoalSet` | `subjects` | `SubjectGoal[]` | Goals of archived subjects are included with `subjectArchived: true` and are suspended | FR-071 |

Goal history is internal to the Goals module and is not exposed (FR-074, BR-015).

### SetDailyGoalInput / SetSubjectGoalInput

Used by GOAL-02, GOAL-03: `targetMinutes` (int, required, 5..1440, whole number; out of range -> `goal_out_of_range`). A same-day change upserts. Source: FR-070, FR-071, FR-074, EC-023.

### GoalProgressQuery / GoalProgress / SubjectGoalProgress

Used by GOAL-05.

| Schema | Field | Type | Constraints | Source |
| --- | --- | --- | --- | --- |
| `GoalProgressQuery` | `date` | LocalDate | Default today in the profile zone | FR-072 |
| `GoalProgress` | `date` | LocalDate | | FR-072 |
| `GoalProgress` | `minutes` | int | Sum of allocated study minutes, manual included | FR-072, BR-014 |
| `GoalProgress` | `targetMinutes` | int | Target in force that day | BR-015 |
| `GoalProgress` | `percent` | int | May exceed 100 | FR-072 |
| `GoalProgress` | `goalMet` | bool | `minutes >= targetMinutes` | FR-073, BR-015 |
| `GoalProgress` | `subjects` | `SubjectGoalProgress[]` | Only subjects with a goal | FR-071 |
| `SubjectGoalProgress` | `subjectId`, `minutes`, `targetMinutes`, `percent`, `goalMet` | Id, int, int, int, bool | Same rules | FR-071 |

## 15. Calendar

### CalendarMonthQuery / CalendarMonth

Used by CAL-01.

| Schema | Field | Type | Constraints | Source |
| --- | --- | --- | --- | --- |
| `CalendarMonthQuery` | `month` | string | `YYYY-MM`, required | FR-060, CONVENTIONS section 5 |
| `CalendarMonth` | `month` | string | | FR-060 |
| `CalendarMonth` | `days` | `CalendarDay[]` | One per calendar day of the month | FR-060 |
| `CalendarDay` | `date` | LocalDate | | FR-060 |
| `CalendarDay` | `minutes` | int | Visible as text, not only as bucket | FR-060, AC-FR-060-2 |
| `CalendarDay` | `bucket` | enum(`0`,`1_59`,`60_119`,`120_plus`) | Buckets 0, 1-59, 60-119, 120 or more | FR-060 |
| `CalendarDay` | `isToday` | bool | | FR-060 |

### CalendarDayDetail

Used by CAL-02: `date` (LocalDate), `totalMinutes` (int), `sessions` (`StudySession[]` with allocation for that day in `dayAllocations`, plus `subjectName` and `subjectArchived: bool`), `planEntries` (`PlanEntry[]` with `status`). Midnight-crossing sessions appear on both days (EC-009). Source: FR-061, FR-062, BR-016, BR-029.

## 16. Statistics

### StatsRangeQuery

Used by STAT-01..06.

| Field | Type | Req | Constraints | Source |
| --- | --- | --- | --- | --- |
| `from` | LocalDate | no | Default 29 days before `to` (last 30 days) | FR-086 |
| `to` | LocalDate | no | Default today in the profile zone | FR-086 |

Rules: `from <= to` else `invalid_date_range`; span at most 24 months (24 months plus 1 day rejected, `invalid_date_range`). Source: FR-086, BR-030.

### Response schemas

All stats responses are `{ from, to, ... }` objects, never paginated. Totals reconcile across views (NFR-096).

| Schema | Used by | Fields | Source |
| --- | --- | --- | --- |
| `StatsDaily` | STAT-01 | `days: [{ date: LocalDate, minutes: int, timerMinutes: int, manualMinutes: int }]`, zero-filled; `totalMinutes: int` | FR-080, FR-088 |
| `StatsWeekly` | STAT-02 | `weeks: [{ weekStart: LocalDate (Monday), minutes: int, partial: bool }]`, `totalMinutes` | FR-081 |
| `StatsMonthly` | STAT-03 | `months: [{ month: "YYYY-MM", minutes: int, current: bool }]`, `totalMinutes` | FR-082 |
| `StatsBySubject` | STAT-04 | `subjects: [{ subjectId: Id, name: string, archived: bool, minutes: int, percent: int }]`; integer percents sum to 100; `totalMinutes` | FR-083, BR-029 |
| `StatsGoalHitRate` | STAT-05 | `{ daysMet: int, daysTotal: int, percent: int }` or `{ noData: true }`; days before account creation excluded | FR-084, BR-015 |
| `StatsPlannedVsActual` | STAT-06 | `byDay: [{ date, plannedMin, actualMin, varianceMin }]`, `bySubject: [{ subjectId, plannedMin, actualMin, varianceMin }]`, `byEntry: [{ planEntryId, plannedMin, actualMin, varianceMin }]`, `hasPlan: bool`; variance is signed actual minus planned | FR-085, BR-002, BR-004 |

`minutes` fields are whole minutes derived from `study_session_days.seconds` (DICT `study_session_days.seconds`).

## 17. Gamification (Phase 2)

### Gamification

Used by GAME-01 (read-only).

| Field | Type | Req | Constraints | Source |
| --- | --- | --- | --- | --- |
| `currentStreak` | int | resp | `>= 0` | DICT `user_gamification.current_streak`, FR-160 |
| `longestStreak` | int | resp | `>= 0`, never decreases | DICT `user_gamification.longest_streak`, FR-163, BR-022 |
| `todayPending` | bool | resp | Today in progress and not yet met | FR-160 |
| `freezeAvailable` | bool | resp | One freeze per week | FR-162, DICT `daily_evaluations.freeze_week_start` |
| `xpTotal` | int | resp | Sum of ledger amounts, never below 0 | FR-176, FR-177 |
| `level` | int | resp | Largest `n` with `100·n(n+1)/2 <= xpTotal`; 0 below 100 XP | FR-175, BR-019 |
| `xpInLevel` | int | resp | `xpTotal` minus the threshold of `level` | FR-175 |
| `xpToNextLevel` | int | resp | Threshold of `level + 1` minus `xpTotal` | FR-175 |
| `xpToday` | int | resp | Counts toward the 600 daily cap | FR-173, BR-018 |
| `dailyCapReached` | bool | resp | | FR-173 |

Level examples: 99 XP -> level 0; 300 -> 2; 599 -> level 2 with 1 XP to level 3 (AC-FR-175-1..3). The XP ledger itself is not exposed.

## 18. Notifications (Phase 2)

### Notification / NotificationListQuery

Used by NOTIF-01, NOTIF-02.

| Field | Type | Req | Constraints | Source |
| --- | --- | --- | --- | --- |
| `id` | Id | resp | | DICT `notifications.id` |
| `kind` | enum(`daily_reminder`,`plan_entry_reminder`) | resp | | DICT `notifications.kind` |
| `planEntryId` | Id? | resp | | DICT `notifications.plan_entry_id` |
| `dueAt` | Instant | resp | | DICT `notifications.due_at` |
| `localDate` | LocalDate | resp | | DICT `notifications.local_date` |
| `body` | string | resp | At most 300 chars | DICT `notifications.body` |
| `deliveredAt`, `dismissedAt` | Instant? | resp | | DICT `notifications` |
| `createdAt` | Instant | resp | | DICT `notifications` |

`NotificationListQuery` is `PageQuery` only. Order `dueAt` desc, `id`. Source: FR-152, FR-224.

### NotificationPreferences / UpdateNotificationPreferencesInput

Used by NOTIF-03, NOTIF-04.

| Field | Type | Req | Constraints | Source |
| --- | --- | --- | --- | --- |
| `dailyReminderEnabled` | bool | resp / optional | Default false | DICT `notification_preferences.daily_reminder_enabled`, FR-150 |
| `dailyReminderTime` | string | resp / optional | `HH:mm` local time, default `19:00` | DICT `notification_preferences.daily_reminder_time` |
| `planReminderEnabled` | bool | resp / optional | Default false | DICT `notification_preferences.plan_reminder_enabled`, FR-151 |
| `planReminderLeadMin` | int | resp / optional | 0..120, default 10 | DICT `notification_preferences.plan_reminder_lead_min` |
| `version`, `updatedAt` | versioned | resp | | DICT `notification_preferences` |

The update input has the four editable fields, all optional, at least one. Source: FR-154.

### PushSubscription / CreatePushSubscriptionInput

Used by NOTIF-05..07.

| Schema | Field | Type | Constraints | Source |
| --- | --- | --- | --- | --- |
| `CreatePushSubscriptionInput` | `endpoint` | string | HTTPS URL; upsert by endpoint | DICT `push_subscriptions.endpoint`, FR-153 |
| `CreatePushSubscriptionInput` | `keys.p256dh`, `keys.auth` | string | Required | DICT `push_subscriptions.p256dh`, `.auth` |
| `PushSubscription` | `id`, `endpoint`, `userAgent?`, `lastUsedAt?`, `createdAt` | Id, string, string, Instant, Instant | `p256dh` and `auth` never returned | DICT `push_subscriptions` |

## 19. AI scheduling (Phase 3)

Behaviour is defined in [AI-INTEGRATION](AI-INTEGRATION.md); this section only fixes shapes.

### AiConsent / SetAiConsentInput

Used by AI-01, AI-02.

| Schema | Field | Type | Constraints | Source |
| --- | --- | --- | --- | --- |
| `AiConsent` | `granted` | bool | Latest decision; false when none recorded | DICT `ai_consents.granted`, NFR-036 |
| `AiConsent` | `wordingVersion` | string | Wording version of the latest decision | DICT `ai_consents.wording_version` |
| `AiConsent` | `currentWordingVersion` | string | Version a new decision must carry | U-4 |
| `AiConsent` | `decidedAt` | Instant? | | DICT `ai_consents.decided_at` |
| `SetAiConsentInput` | `granted` | bool | Required; false revokes | FR-192 |
| `SetAiConsentInput` | `wordingVersion` | string | Must equal `currentWordingVersion` else `validation_failed` | DICT `ai_consents.wording_version` |

### AiQuota

Used by AI-03: `limit` (int, 5), `used` (int), `remaining` (int), `resetsOnLocalDate` (LocalDate). Source: FR-196, DICT `ai_generation_requests.quota_local_date`, `counts_toward_quota`.

### AiAvailabilityWindow / CreateScheduleRequestInput

Used by AI-04.

| Schema | Field | Type | Constraints | Source |
| --- | --- | --- | --- | --- |
| `AiAvailabilityWindow` | `weekday` | int | 1..7, Monday = 1 | AI-INTEGRATION section 4 |
| `AiAvailabilityWindow` | `startTime`, `endTime` | string | `HH:mm`, start before end, same day, in the profile zone, windows do not overlap | AI-INTEGRATION section 4 |
| `CreateScheduleRequestInput` | `examIds` | Id[] | 1..10 upcoming exams | AI-INTEGRATION section 4, FR-190 |
| `CreateScheduleRequestInput` | `weeklyHours` | int | 1..168 | DICT `ai_generation_requests.params`, FR-191 |
| `CreateScheduleRequestInput` | `availability` | `AiAvailabilityWindow[]` | 1..21 windows | AI-INTEGRATION section 4, FR-191 |

### ScheduleRequest

Used by AI-04 (`202`), AI-05.

| Field | Type | Req | Constraints | Source |
| --- | --- | --- | --- | --- |
| `id` | Id | resp | | DICT `ai_generation_requests.id` |
| `status` | enum(`pending`,`succeeded`,`failed`,`timed_out`) | resp | | DICT `ai_generation_requests.status`, EC-015, EC-016 |
| `params` | `CreateScheduleRequestInput` | resp | Persisted so a retry can be prefilled | DICT `ai_generation_requests.params`, FR-197 |
| `errorCode` | string? | resp | When `failed` or `timed_out`: `ai_provider_unavailable`, `ai_provider_timeout`, `ai_no_valid_entries`, `consent_required` | FR-197, FR-193 |
| `entriesRemoved` | int | resp | `>= 0` | DICT `ai_generation_requests.entries_removed`, EC-015 |
| `removedByReason` | object? | resp | Map reason -> count (reasons in AI-INTEGRATION section 6) | AI-INTEGRATION |
| `proposal` | `ScheduleProposal`? | resp | Only when `succeeded` and not expired or accepted | DICT `ai_generation_requests.proposal` |
| `proposalExpiresAt` | Instant? | resp | Creation plus 24 h | DICT `ai_generation_requests.proposal_expires_at` |
| `acceptedAt` | Instant? | resp | | DICT `ai_generation_requests.accepted_at` |
| `createdAt`, `updatedAt` | Instant | resp | | DICT `ai_generation_requests` |

`counts_toward_quota` and `provider_responded_at` are internal and omitted.

### ScheduleProposal / ProposedEntry

| Schema | Field | Type | Constraints | Source |
| --- | --- | --- | --- | --- |
| `ScheduleProposal` | `entries` | `ProposedEntry[]` | At most 100 | AI-INTEGRATION section 4 |
| `ProposedEntry` | `examId`, `subjectId` | Id | | FR-193 |
| `ProposedEntry` | `topicId` | Id? | | FR-193 |
| `ProposedEntry` | `startsAt` | Instant | Strictly in the future at proposal time | FR-193 |
| `ProposedEntry` | `durationMin` | int | 5..480 | DICT `plan_entries.duration_min` |
| `ProposedEntry` | `localDate` | LocalDate | | FR-193 |
| `ProposedEntry` | `warnings` | `{ code: "overlap", planEntryId: Id }[]` | Overlap with existing entries is advisory | BR-026, FR-193 |

### AcceptProposalInput

Used by AI-06: `confirmedWarnings` (`ConfirmedWarnings`, optional; `overlap` required when any entry carries an overlap warning). Source: FR-195, BR-026.

## 20. Study groups (Phase 3)

### Group / CreateGroupInput / UpdateGroupInput

Used by GRP-01..04.

| Schema | Field | Type | Constraints | Source |
| --- | --- | --- | --- | --- |
| `Group` | `id` | Id | | DICT `groups.id` |
| `Group` | `name` | string | 1..60 | DICT `groups.name`, FR-200 |
| `Group` | `memberCount`, `maxMembers` | int | `maxMembers` 2..100, default 20 | DICT `groups.max_members`, U-3 |
| `Group` | `role` | enum(`admin`,`member`) | Caller's role | DICT `group_members.role` |
| `Group` | `shareWeeklyMinutes` | bool | Caller's sharing setting | DICT `group_members.share_weekly_minutes`, FR-206 |
| `Group` | `version`, `createdAt`, `updatedAt` | versioned | `created_by` is omitted | DICT `groups` |
| `CreateGroupInput` | `name` | string | Required, 1..60 trimmed | DICT `groups.name` |
| `UpdateGroupInput` | `name` | string | Required, 1..60 (rename, FR-212) | DICT `groups.name` |

### Member

Used by GRP-06: `userId` (Id, needed for admin actions GRP-12/GRP-13), `displayName` (string, 1..50, DICT `user_profiles.display_name`), `role` (enum), `joinedAt` (Instant), `weeklyMinutes` (int, only when the member shares, NFR-037). No email, no study data otherwise. Source: FR-211, NFR-037, DICT `group_members`.

### Invite / CreateInviteInput / InviteCreated / AcceptInviteInput

| Schema | Used by | Fields | Source |
| --- | --- | --- | --- |
| `CreateInviteInput` | GRP-07 | `email` (string?, optional, valid email) | DICT `group_invites.email`, FR-201 |
| `Invite` | GRP-08 | `id`, `email?`, `expiresAt`, `createdAt`; pending only; token and hash never returned | DICT `group_invites`, FR-201 |
| `InviteCreated` | GRP-07 (`201`) | `Invite` plus `inviteUrl` (string, shown once); `details.warning` of `group_full` is a warning not an error | FR-201, FR-208 |
| `AcceptInviteInput` | GRP-10 | `token` (string, required); response is `Group` | FR-202, FR-208 |

Invite expiry is creation plus 7 days (DICT `group_invites.expires_at`).

### TransferAdminInput / SharingInput / CreateReportInput

| Schema | Used by | Fields | Source |
| --- | --- | --- | --- |
| `TransferAdminInput` | GRP-13 | `userId` (Id, an existing member) | FR-205 |
| `SharingInput` | GRP-14 | `shareWeeklyMinutes` (bool, required) | DICT `group_members.share_weekly_minutes`, FR-206 |
| `CreateReportInput` | GRP-16 | `targetUserId` (Id), `reason` (string, 1..500) | DICT `group_reports.reason`, FR-209 |

GRP-05 (dissolve) body: `confirmName` (string, must equal the group name). Source: FR-210. GRP-16 returns `201 {}`; the reporter is never exposed (DICT `group_reports.reporter_user_id`).

### LeaderboardQuery / Leaderboard / LeaderboardRow

Used by GRP-15.

| Schema | Field | Type | Constraints | Source |
| --- | --- | --- | --- | --- |
| `LeaderboardQuery` | `weekStart` | LocalDate | A Monday; default current week | FR-207, DATABASE-DESIGN R7 |
| `Leaderboard` | `weekStart` | LocalDate | | FR-207 |
| `Leaderboard` | `data` | `LeaderboardRow[]` | Opted-in members only | FR-206, NFR-037 |
| `LeaderboardRow` | `rank` | int | Ties share a rank | FR-207 |
| `LeaderboardRow` | `displayName` | string | | DICT `user_profiles.display_name` |
| `LeaderboardRow` | `weeklyMinutes` | int | From `study_session_days` where `is_ranked` (timer sessions of 5 minutes or more) | DICT `study_session_days.is_ranked`, BR-018, EC-025 |

## 21. API keys (Phase 3)

### ApiKeyScopes

Object keyed by resource, each value `read` or `write` (write includes read), over exactly `subjects`, `topics`, `sessions`, `plan_entries`, `todos`, `notes`, `exams`; at least one key. Source: DICT `api_keys.scopes`, FR-221.

### ApiKey / ApiKeyCreated

Used by KEY-01 (`ApiKey`), KEY-02 (`ApiKeyCreated`).

| Field | Type | Req | Constraints | Source |
| --- | --- | --- | --- | --- |
| `id` | Id | resp | | DICT `api_keys.id` |
| `name` | string | resp | 1..60 | DICT `api_keys.name`, FR-220 |
| `scopes` | `ApiKeyScopes` | resp | | DICT `api_keys.scopes` |
| `last4` | string | resp | 4 chars | DICT `api_keys.last4` |
| `lastUsedAt` | Instant? | resp | | DICT `api_keys.last_used_at` |
| `revokedAt` | Instant? | resp | | DICT `api_keys.revoked_at` |
| `createdAt` | Instant | resp | | DICT `api_keys` |
| `key` | string | resp (`ApiKeyCreated` only) | Full key, shown once, never retrievable | FR-220 |

### CreateApiKeyInput

Used by KEY-02: `name` (string, required, 1..60, DICT `api_keys.name`, FR-220); `scopes` (`ApiKeyScopes`, required). More than 10 active keys -> `api_key_limit_reached`. `key_hash` is never returned.

## 22. System

`HealthStatus` (SYS-01): `{ status: "ok" }`. No versions or internals. Source: NFR-050.

## 23. Public DTOs (Phase 3)

Public DTOs are subsets of the internal resources with their own Zod schemas and mappers (CONVENTIONS section 1; never re-exported from the internal tree). They follow the same wire format. Inputs of `/v1` endpoints are the matching internal `Create…Input` / `Update…Input` unless a difference is listed. Public errors use `PublicErrorEnvelope`. Source for all: FR-220..226.

| Public schema | Used by | Differences from the internal resource |
| --- | --- | --- |
| `PublicSubject` | PUB-01..05 | Same fields as `Subject`. |
| `PublicTopic` | PUB-06..10 | Same fields as `Topic`. PUB-08 takes `subjectId` in the body. |
| `PublicStudySession` | PUB-11..15 | Fields: `id`, `subjectId`, `topicId`, `planEntryId`, `source` (read-only; sessions created via `/v1` are always `manual`, FR-042, BR-010), `startedAt`, `endedAt`, `durationSeconds`, `timezone`, `localDate`, `version`, `createdAt`, `updatedAt`. Omits `mode`, `pomodorosCompleted`, `autoClosed`, `dayAllocations`, `serverTime`. |
| `PublicPlanEntry` | PUB-16..21 | Fields: `id`, `subjectId`, `topicId`, `startsAt`, `durationMin`, `localDate`, `status`, `missedAt`, `version`, `createdAt`, `updatedAt`. Omits `plannedMin`, `actualSeconds`, `varianceSeconds`, `warnings`. Create/update accept `confirmedWarnings`. |
| `PublicTodo` | PUB-22..26 | Same fields as `Todo` minus `overdue`. `UpdateTodoInput` additionally accepts `done` on PUB-25 (the internal TODO-05 route is not public). |
| `PublicNote`, `PublicNoteListItem` | PUB-27..31 | Raw Markdown `body` only (no rendered HTML, no `RenderedNote`); list items omit `body` and carry `bodyPreview`. |
| `PublicExam`, `PublicExamListItem` | PUB-32..36 | `Exam` fields except `readiness` and `countdown`; `checklist` of `{ topicId, completed }` on detail. PUB-36 takes `SetExamTopicsInput`. |
| `PublicErrorEnvelope` | all | See section 1. |

Every public list response uses `{ data, page: PageInfo }` (FR-224), except PUB-16 (range-bound, unpaginated like PLAN-01).
