# Lumora Error Handling

> Status: Proposal, pending approval. Source of truth: Phase 2 PRD and Phase 1 docs.

Defines how failures are classified, represented, logged and shown. No implementation code is included. Security-relevant behavior (not-found for cross-user access, generic authentication failures) is specified here and in [SECURITY-ARCHITECTURE.md](SECURITY-ARCHITECTURE.md).

## 1. Principles

1. Every failure belongs to exactly one category in section 2 and carries a stable code from section 4.
2. Domain and application code return typed errors; only adapters turn them into HTTP responses or UI messages.
3. Nothing is partially saved on failure: use cases are transactional (EC-015, EC-016).
4. Internal details (stack traces, query text, provider messages) never reach the client.
5. A failure on one record never leaks the existence of another user's record (NFR-016).
6. Retried writes are safe because they carry an idempotency key (NFR-053).

## 2. Error taxonomy

| Category | Meaning | HTTP status | Retry by client? |
|---|---|---|---|
| Validation | Input breaks a shape or range rule (goal 5-1440, duration 5-480, password under 10, future manual entry) | 400 | Only after the user corrects input |
| Authentication | No valid identity, expired session, wrong credentials, account locked | 401 (a locked account is 401 with code `account_locked`) | After signing in again; locked: after the lock expires |
| Authorization and not-found | Scope missing (API), role not allowed (group action), or record not owned by the caller | 403 for scope and role, 404 for cross-user and missing records | No |
| Conflict | State prevents the action: stale version (EC-020), second running timer (EC-002), archive blocked (EC-007), overlap needing confirmation, duplicate | 409 | After reloading or confirming |
| Rate limit | Too many requests (EC-026, NFR-012 lockout window) | 429 | After the retry-after value |
| Dependency failure | Provider, email or database dependency failed or timed out (EC-016) | 502 or 503 (504 on timeout) | Yes, with backoff and the same request key |
| Unexpected | Bug or unclassified fault | 500 | Maybe, same request key; reported with request ID |

Cross-user access is always category Authorization and not-found with status 404 (USER-ROLES-AND-PERMISSIONS.md section 5). A missing scope on an API key is 403 and does not reveal other users' data (FR-225).

## 3. Error envelope and mapping to the public format

**Internal envelope.** One shape is used by the internal API, server actions and job handlers:

| Field | Purpose |
|---|---|
| `code` | Stable machine-readable value from the catalog in section 4 |
| `category` | One of the seven categories |
| `message` | Short human-readable text safe to show |
| `details` | Field-level or limit information (for example which field and which allowed range; the conflicting session for EC-011; the current record version for EC-020) |
| `requestId` | Correlates the response with logs (NFR-063) |
| `retryable` | Boolean hint |
| `retryAfter` | Seconds, only for rate limit and some dependency errors |

**Public format (Phase 3).** The public `/v1` API returns `{code, message, details}` (FR-225) with the request identifier included for troubleshooting. The mapping from the internal envelope is direct: `code`, `message` and `details` are copied; `category` is expressed by the HTTP status; `requestId` is returned in the body and in a response header; `retryAfter` becomes the standard retry-after header on 429 and 503. Internal-only detail fields (for example stored record versions of internal-only resources) are removed by the public mapper. The mapping lives in one adapter-level function reused by both APIs, so the two cannot drift.

**Where mapping happens.** Domain code throws or returns typed errors; application services add context; adapters map. A top-level boundary handler converts any unclassified error to the unexpected category with a generic message and logs the full detail internally.

## 4. Stable error code catalog

Names only. Names are stable once released; messages may change. HTTP statuses come from section 2.

| Category | Codes |
|---|---|
| Validation | `validation_failed`, `password_too_short`, `age_confirmation_required`, `invalid_timezone`, `goal_out_of_range`, `duration_out_of_range`, `manual_entry_in_future`, `manual_entry_too_long`, `daily_total_exceeded`, `exam_date_in_past`, `consent_required`, `input_too_large` |
| Authentication | `unauthenticated`, `invalid_credentials`, `account_locked`, `session_expired`, `session_revoked`, `reset_token_invalid`, `api_key_invalid`, `api_key_revoked` |
| Authorization and not-found | `not_found`, `scope_missing`, `role_not_allowed`, `last_administrator` |
| Conflict | `stale_version`, `timer_already_running`, `subject_has_running_session`, `overlap_confirmation_required`, `exam_date_warning_confirmation_required`, `manual_entry_overlaps_session`, `duplicate_email`, `group_full`, `invite_expired`, `already_member`, `past_entry_read_only`, `session_already_closed` |
| Rate limit | `rate_limited`, `ai_daily_limit_reached`, `export_limit_reached` |
| Dependency failure | `ai_provider_unavailable`, `ai_provider_timeout`, `ai_no_valid_entries`, `email_delivery_failed`, `storage_unavailable`, `database_unavailable` |
| Unexpected | `internal_error` |

Notes: `overlap_confirmation_required` and `exam_date_warning_confirmation_required` are warnings that require a confirmed resubmission and are not failures of the user's data (BR-026, FR-038). `ai_no_valid_entries` is a dependency-class outcome because the cause is provider output (EC-015).

## 5. Client handling rules

| Situation | Rule | Source |
|---|---|---|
| Save fails (network, 5xx) | Show an error with a Retry action. The retry reuses the same request key, so the server stores at most one result | NFR-054, NFR-053, EC-021 |
| Unsaved note | Content is kept locally until saved; reload restores it; on a stale version both versions are shown with keep mine, keep theirs, copy both | NFR-054, EC-020, FR-103, U-8 |
| Stale version on any edit | Show "changed elsewhere", reload the record, let the user re-apply | EC-020 |
| Second timer start | Show "Stop current session and start new?"; confirm sends the replace command | EC-002, FR-053 |
| Network loss during timer | Display keeps running from the stored start; the client retries heartbeat and sync on reconnect; no error dialog interrupts the timer | EC-028, FR-054 |
| Rate limit | Disable the action until retry-after elapses and show the time | EC-026 |
| Locked account | Show the lock and remaining time | NFR-012 |
| Dependency failure on AI | Show an error; nothing saved; no quota used | EC-016 |
| Permission denied (notifications, audio) | Fall back to an in-app indicator and prompt to enable | EC-024 |
| Session expired | Redirect to login with target preserved; unsaved form content is retained where possible | FR-002 |
| Retry policy | Automatic retry only for idempotent reads and for writes with a request key, at most 3 attempts with exponential backoff and jitter; never for validation, conflict or authorization errors | NFR-053 |
| Unsupported browser | Notice instead of broken page | NFR-082 |

## 6. Logging rules (NFR-063)

1. Every request logs a request ID, route, status, duration and outcome in structured form.
2. Never logged: passwords, tokens, API keys, reset tokens, session identifiers, note content, AI prompts and responses, full email addresses where a hash suffices.
3. Errors are logged once at the boundary with category, code, request ID, user reference (opaque identifier) and a scrubbed stack for the unexpected category.
4. Validation and conflict errors are logged at info level; authentication failures at warn level (they feed the audit events of NFR-020 separately); dependency failures at error level with the dependency name; unexpected errors at error level and sent to error tracking.
5. Error-tracking events are scrubbed before sending (NFR-030, NFR-034).
6. Jobs log job name, idempotency key, attempt number and result. Dead-lettered jobs raise an alert (BACKGROUND-JOBS.md section 5).
7. Log retention is set by the platform and does not exceed what privacy requirements allow; logs contain no personal content, so they are outside account purge (NFR-031).

## 7. User-facing message intent

| Category | Intent of the message |
|---|---|
| Validation | Name the field and state the allowed range in plain words ("Goal must be between 5 and 1440 minutes") |
| Authentication | Generic: do not say which of email or password was wrong; locked state names remaining time |
| Not found | "Not found" without explanation of why |
| Conflict | Say what changed and what the user can do next (reload, confirm, stop the current session) |
| Rate limit | Say when to try again |
| Dependency | Say the service is unavailable, that nothing was saved and that trying again is safe |
| Unexpected | Apologise briefly, show the request ID, keep user input |

All messages are in English (PRD section 4, out of scope languages).

## 8. Edge-case mapping

| EC ID | Mechanism | Error codes involved |
|---|---|---|
| EC-001 | Server timestamps plus 60 s heartbeat; idle-close job at last heartbeat flagged auto-closed | `session_already_closed` (late stop of an auto-closed run) |
| EC-002 | Atomic start; first accepted wins; replace command | `timer_already_running` |
| EC-003 | Overlap check with confirmation flag | `overlap_confirmation_required` |
| EC-004 | Not an error: day marked goal not met; no notification | none |
| EC-005 | Not an error: target history by effective date | none |
| EC-006 | Frozen zone and local date; time module | none; invalid zone gives `invalid_timezone` |
| EC-007 | Archive guard registered by Timer | `subject_has_running_session` |
| EC-008 | TopicArchived event; readiness recomputed with a note | none |
| EC-009 | Day-allocation at read time | none |
| EC-010 | Client sends actions only; server time | none |
| EC-011 | Manual entry validation and overlap check naming the conflicting session in details | `manual_entry_in_future`, `manual_entry_too_long`, `daily_total_exceeded`, `manual_entry_overlaps_session` |
| EC-012 | Thresholds from configuration; message states result | none (outcome message) |
| EC-013 | Create rejects past date; edit allowed; archive job next day | `exam_date_in_past` |
| EC-014 | Empty-state response; no division by zero | none |
| EC-015 | Per-entry validation; rejected entries counted; nothing saved if zero valid; quota only if provider responded | `ai_no_valid_entries` |
| EC-016 | 30 s timeout; nothing saved; no quota consumed | `ai_provider_unavailable`, `ai_provider_timeout` |
| EC-017 | Unique ledger rows; compensating adjustments | none (duplicate is a no-op) |
| EC-018 | Immediate removal from lists; last-administrator rule | `last_administrator`, `already_member` |
| EC-019 | Running timer discarded; memberships removed; purge job | none |
| EC-020 | Versioned records; stale-version rejection; both-versions note UI; timer polling | `stale_version` |
| EC-021 | Client request key stored with the session | none (returns the existing session) |
| EC-022 | PlanEntryDeleted event unlinks sessions | none |
| EC-023 | Shared schema range 5-1440 | `goal_out_of_range` |
| EC-024 | Client fallback to in-app indicator | none (client-side) |
| EC-025 | Leaderboard counts only timer sessions of 5 min or more | none |
| EC-026 | Per-key limiter; immediate revocation | `rate_limited`, `api_key_revoked` |
| EC-027 | Export as point-in-time snapshot taken at request time | `export_limit_reached` |
| EC-028 | Local continuation; resync on reconnect; BR-006 applies after 30 min | `session_already_closed` |
