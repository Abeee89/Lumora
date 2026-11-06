# Lumora API Errors

> Status: Proposal, pending approval. Source of truth: Phase 2 PRD and Phase 1 docs.

The error contract of the internal and public APIs. It reproduces the taxonomy and code catalog of [ERROR-HANDLING.md](../03-architecture/ERROR-HANDLING.md) sections 2 to 4 without renaming any code, adds the codes the API needs, and fixes the HTTP status, retry flag and `details` shape of each. Endpoint-specific error lists are in [API-ENDPOINTS.md](API-ENDPOINTS.md); shared rules are in [API-CONVENTIONS.md](API-CONVENTIONS.md).

## 1. Envelopes

| Surface | Body | Notes |
|---|---|---|
| Internal (`/api/app`) | `{ code, category, message, details, requestId, retryable, retryAfter? }` | `category` is one of the seven categories in section 2 |
| Public (`/v1`) | `{ code, message, details, requestId }` | `category` is expressed by the HTTP status; `retryAfter` becomes the `Retry-After` header (FR-225) |

- One mapper function, specified once, serves both trees: it copies `code`, `message`, `details`; the public mapper drops `category`, `retryable`, `retryAfter` from the body and removes internal-only detail fields (for example `details.current` of internal-only resources). Domain code returns typed errors; only the adapter maps them (ERROR-HANDLING section 3).
- `message` is English, safe to show, and may change. `code` is stable once released.
- `details` is always an object (`{}` when empty), never `null`.
- `requestId` is also sent in the `X-Request-Id` header.

Internal example:

```json
{
  "code": "manual_entry_overlaps_session",
  "category": "Conflict",
  "message": "This time overlaps another session.",
  "details": { "conflictingSessionId": "0192f5c0-7b1e-7c3a-9d2e-4a6f1b8c0d11" },
  "requestId": "req_01JBX7Q8M2",
  "retryable": false
}
```

Public example:

```json
{
  "code": "scope_missing",
  "message": "This key cannot write sessions.",
  "details": { "required": { "resource": "sessions", "access": "write" } },
  "requestId": "req_01JBX7Q8M3"
}
```

## 2. Taxonomy and status mapping

| Category | HTTP status | Retry by client |
|---|---|---|
| Validation | 400 | Only after the user corrects input |
| Authentication | 401 (a locked account is 401 `account_locked`) | After signing in again; locked: after the lock expires |
| Authorization and not-found | 403 for scope, role and CSRF; 404 for cross-user, missing and unsupported version | No |
| Conflict | 409 | After reloading or confirming |
| Rate limit | 429 | After `Retry-After` |
| Dependency failure | 502, 503, 504 (504 on timeout) | Yes, with backoff and the same request key |
| Unexpected | 500 | Maybe, with the same request key |

Cross-user access is always 404 (USER-ROLES-AND-PERMISSIONS section 5, NFR-016). A missing API scope is 403 and reveals nothing about other users' data (FR-225).

## 3. Code catalog

Codes from ERROR-HANDLING section 4 (unchanged) with status, retryable flag and `details` shape. "Where" lists the surface that can emit the code.

### Validation (400)

| Code | Retryable | Trigger | `details` |
|---|---|---|---|
| `validation_failed` | no | Any shape or range violation, unknown field, wrong content type, malformed JSON | `{ "fields": [{ "path": "name", "rule": "max_length", "limit": 100 }] }`; `{ "missing": [...] }` for AI prerequisites |
| `password_too_short` | no | Password under 10 characters (FR-001, AC-FR-001-2) | `{ "minLength": 10 }` |
| `age_confirmation_required` | no | Age confirmation not given (FR-001, NFR-035) | `{}` |
| `invalid_timezone` | no | Not in the runtime IANA zone list (EC-006) | `{ "timezone": "..." }` |
| `goal_out_of_range` | no | Daily or subject target outside 5..1440 (EC-023) | `{ "min": 5, "max": 1440 }` |
| `duration_out_of_range` | no | Plan entry duration outside 5..480 (BR-001) | `{ "min": 5, "max": 480 }` |
| `manual_entry_in_future` | no | Manual session end after server now (EC-011) | `{ "now": "<instant>" }` |
| `manual_entry_too_long` | no | Manual duration outside 60 s..24 h (EC-011) | `{ "minSeconds": 60, "maxSeconds": 86400 }` |
| `daily_total_exceeded` | no | Day total would exceed 24 h (EC-011) | `{ "localDate": "...", "maxSeconds": 86400 }` |
| `exam_date_in_past` | no | Exam create with date before today in profile zone (EC-013) | `{ "today": "YYYY-MM-DD" }` |
| `consent_required` | no | AI request without current granted consent (FR-192). Kept in Validation (400) as in the catalog | `{ "feature": "ai_schedule" }` |
| `input_too_large` | no | Body over 512 KiB, more than 200 bulk lines, more than 200 AI topics | `{ "limit": 200, "actual": 201 }` |

### Authentication (401)

| Code | Retryable | Trigger | `details` |
|---|---|---|---|
| `unauthenticated` | no | No valid session on an `S` endpoint | `{}` |
| `invalid_credentials` | no | Wrong email or password, Google re-auth mismatch, account pending deletion. Generic message (ERROR-HANDLING section 7) | `{}` |
| `account_locked` | after lock | Fifth failed sign-in in a row locks for 15 min (NFR-012). Status is 401, not 429. Header `Retry-After` | `{ "lockedUntil": "<instant>" }` |
| `session_expired` | no | Session past its 30 day sliding expiry (NFR-013) | `{}` |
| `session_revoked` | no | Session revoked by the user (FR-008) | `{}` |
| `reset_token_invalid` | no | Unknown, expired or used reset token (FR-005) | `{}` |
| `api_key_invalid` | no | `/v1`: missing, malformed or unknown key; cookie-only request | `{}` |
| `api_key_revoked` | no | `/v1`: key revoked (FR-226, EC-026) | `{}` |

### Authorization and not-found

| Code | Status | Retryable | Trigger | `details` |
|---|---|---|---|---|
| `not_found` | 404 | no | Missing record, another user's record, malformed path ID, unknown, used or revoked invite token, expired or foreign export | `{}` |
| `scope_missing` | 403 | no | API key lacks the scope (FR-221 acceptance text says `insufficient_scope`; wire code is `scope_missing`, reconciliation 1) | `{ "required": { "resource": "sessions", "access": "write" } }` |
| `role_not_allowed` | 403 | no | Group action needing `admin` by a member (FR-211) | `{ "required": "admin" }` |
| `last_administrator` | 403 | no | The only administrator tries to leave (FR-203, EC-018) | `{}` |

`last_administrator` stays in this category, as in the catalog, and therefore uses status 403.

### Conflict (409)

| Code | Retryable | Trigger | `details` |
|---|---|---|---|
| `stale_version` | after reload | `If-Match` differs from the stored version (EC-020) | `{ "current": <resource> }` |
| `timer_already_running` | after confirm | A run exists and `replaceRunning` is false (EC-002) | `{ "current": <TimerState> }` |
| `subject_has_running_session` | after stop | Archive blocked by a running run (EC-007) | `{ "timerRunId": "..." }` |
| `overlap_confirmation_required` | after confirm | Plan entry overlaps (BR-026, EC-003) | `{ "warnings": [{ "code": "overlap", "planEntryId": "..." }] }` |
| `exam_date_warning_confirmation_required` | after confirm | Entry after exam date (FR-038, BR-025) | `{ "warnings": [{ "code": "exam_date", "examId": "..." }] }` |
| `manual_entry_overlaps_session` | no | Manual or edited session overlaps another (EC-011) | `{ "conflictingSessionId": "..." }` |
| `duplicate_email` | no | Email already registered (FR-001); generic message | `{}` |
| `group_full` | no | Group is at `maxMembers` (FR-208) | `{ "maxMembers": 20 }` |
| `invite_expired` | no | Invite past 7 days (FR-202) | `{}` |
| `already_member` | no | Accepting an invite for a group the user already belongs to | `{}` |
| `past_entry_read_only` | no | Edit of a plan entry that has started (BR-028) | `{ "startsAt": "<instant>" }` |
| `session_already_closed` | no | Pause, resume, stop or heartbeat with no timer run, including an auto-closed run (EC-001, EC-028) | `{}` |

### Rate limit (429)

| Code | Retryable | Trigger | `details` |
|---|---|---|---|
| `rate_limited` | after `Retry-After` | A rate-limit class in [API-CONVENTIONS.md](API-CONVENTIONS.md) section 10 is exceeded | `{ "class": "RL-WRITE", "retryAfter": 12 }` |
| `ai_daily_limit_reached` | next profile day | 5 generations used (FR-196) | `{ "limit": 5, "used": 5, "resetsOnLocalDate": "YYYY-MM-DD" }` |
| `export_limit_reached` | later | One export running or 5 requested today (FR-130) | `{ "running": true, "limit": 5, "used": 5 }` |

### Dependency failure

| Code | Status | Retryable | Trigger | `details` |
|---|---|---|---|---|
| `ai_provider_unavailable` | 502 | yes | Provider 4xx or 5xx, rate limit or connection failure (EC-016). Surfaced as `errorCode` on the AI request resource | `{}` |
| `ai_provider_timeout` | 504 | yes | No response within 30 s (EC-016) | `{}` |
| `ai_no_valid_entries` | 502 | yes | Provider answered but zero entries survived validation (EC-015) | `{ "removedByReason": { "in_past": 3 } }` |
| `email_delivery_failed` | 502 | yes | Email provider rejected or timed out | `{}` |
| `storage_unavailable` | 503 | yes | Export file store unreachable | `{}` |
| `database_unavailable` | 503 | yes | Database or limiter down on a fail-closed path | `{}` |

The three AI codes are terminal states of an asynchronous request. They appear as `errorCode` in the AI-05 body (HTTP 200), not as the HTTP status of that poll.

### Unexpected

| Code | Status | Retryable | Trigger |
|---|---|---|---|
| `internal_error` | 500 | maybe, same key | Any unclassified fault. Generic message plus `requestId`; detail is logged only |

## 4. Codes added in Phase 6

Not present in the ERROR-HANDLING catalog (reconciliation 7 and 8). Names follow the existing style.

| Code | Category | Status | Retryable | Trigger | `details` |
|---|---|---|---|---|---|
| `invalid_page_size` | Validation | 400 | no | `limit` outside 1..100 (FR-224) | `{ "min": 1, "max": 100 }` |
| `invalid_cursor` | Validation | 400 | no | Malformed or tampered cursor | `{}` |
| `invalid_date_range` | Validation | 400 | no | `from` later than `to`, span over 93 days (plan entries) or 24 months (stats, FR-086) | `{ "maxSpan": "93 days" }` |
| `idempotency_key_required` | Validation | 400 | no | Missing header on a keyed endpoint | `{}` |
| `version_required` | Validation | 400 | no | Missing `If-Match` on a versioned write | `{}` |
| `csrf_rejected` | Authorization and not-found | 403 | no | State-changing `/api/app` call with wrong or missing origin (API-SECURITY section 7) | `{}` |
| `unsupported_api_version` | Authorization and not-found | 404 | no | A version prefix other than `v1` | `{ "supportedVersions": ["v1"] }` |
| `idempotency_key_reused` | Conflict | 409 | no | Same key, different request hash | `{}` |
| `request_in_progress` | Conflict | 409 | yes, after 1 s | Same key while the first request is running; `Retry-After: 1` | `{}` |
| `name_conflict` | Conflict | 409 | no | Active subject, topic or group name clash, including subject restore (FR-010, FR-014) | `{ "field": "name", "conflictingId": "..." }` |
| `subject_archived` | Conflict | 409 | no | Write that references an archived subject (BR-029) | `{ "subjectId": "..." }` |
| `export_not_ready` | Conflict | 409 | yes | Download while status is `running` (FR-132) | `{ "status": "running" }` |
| `generation_in_progress` | Conflict | 409 | after completion | A pending AI request exists (EC-016) | `{ "requestId": "..." }` |
| `proposal_stale` | Conflict | 409 | no | Accept after the 24 h expiry, or any entry start now in the past (FR-195) | `{ "reason": "expired" }` or `{ "reason": "in_past" }` |
| `api_key_limit_reached` | Conflict | 409 | no | 10 active keys (FR-220) | `{ "limit": 10 }` |

`proposal_not_found` is deliberately not added: a missing, foreign, or discarded proposal is `not_found`.

## 5. Decisions on catalog ambiguities

| Ambiguity | Decision |
|---|---|
| `consent_required` category | Stays Validation, 400 |
| Lockout status | `account_locked` is 401 with `details.lockedUntil` and a `Retry-After` header, not 429 |
| Missing API scope | Wire code `scope_missing` (403), not FR-221's `insufficient_scope` |
| Timer command with no run | 409 `session_already_closed` for pause, resume, stop and heartbeat |
| Invite tokens | Unknown, used, revoked: 404 `not_found`; only an expired but otherwise valid invite is `invite_expired` |
| Duplicate sign-up email | 409 `duplicate_email`, generic message "We could not create an account with these details" (FR-001); enumeration risk accepted, limited by RL-SIGNUP |
| Path IDs that are not UUIDs | 404 `not_found`, not 400, so ID shape is not revealed |

## 6. Logging and client handling

- Logging level per category follows ERROR-HANDLING section 6: validation and conflict at info; authentication at warn; dependency failures at error with the dependency name; unexpected at error and sent to error tracking. Never logged: passwords, tokens, API keys, note content, AI prompts and responses.
- Client handling follows ERROR-HANDLING section 5.
- Automatic retry: only `GET` and writes carrying `Idempotency-Key`, at most 3 attempts, exponential backoff with jitter. Never on 4xx except 429, which honours `Retry-After`. `request_in_progress` is retried after 1 s.
- User message intent per category follows ERROR-HANDLING section 7.

## 7. Error code to endpoints

The table below is generated from [API-ENDPOINTS.md](API-ENDPOINTS.md): each code with the endpoint IDs whose spec block lists it. Common errors (`unauthenticated`, `validation_failed`, `rate_limited`, `internal_error`, `csrf_rejected`, and `not_found` on `{id}` paths) are stated once in API-ENDPOINTS section 1 and are not repeated per endpoint.

