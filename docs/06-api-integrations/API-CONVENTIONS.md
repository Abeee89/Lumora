# Lumora API Conventions

> Status: Proposal, pending approval. Source of truth: Phase 2 PRD and Phase 1 docs.

Rules that every endpoint in [API-ENDPOINTS.md](API-ENDPOINTS.md) inherits: surfaces, wire format, pagination, concurrency, idempotency, rate limits, headers and versioning. Decisions build on [ADR-008](../adr/ADR-008-api-strategy.md), [ADR-011](../adr/ADR-011-idempotency-and-concurrency.md), [ERROR-HANDLING.md](../03-architecture/ERROR-HANDLING.md), [SECURITY-ARCHITECTURE.md](../03-architecture/SECURITY-ARCHITECTURE.md) and [DATA-DICTIONARY.md](../04-database/DATA-DICTIONARY.md). Error codes are defined in [API-ERRORS.md](API-ERRORS.md), shapes in [API-SCHEMAS.md](API-SCHEMAS.md), security rules in [API-SECURITY.md](API-SECURITY.md). Documentation only: nothing here is implemented. Numbers marked "proposal" are not fixed by any approved document and live in the configuration module (NFR-062).

## 1. Surfaces

| Surface | Base path | Auth | Consumer | Stability | Phase |
|---|---|---|---|---|---|
| Internal API | `/api/app` | Cookie session | The Lumora web client only | None promised (NFR-060, ADR-008) | MVP |
| Public API | `/v1` (host root) | API key (`Authorization: Bearer lum_...`) | Third-party scripts and tools | Versioned, additive (section 13) | 3 |
| Health | `/api/health` | none | Uptime monitor | Stable | MVP |

- The trees are separate. Public handlers live in their own directory with their own DTO Zod schemas and mappers; they never re-export internal schemas (ADR-008 decision 2).
- Every handler in both trees calls an application service. No handler reads repositories directly.
- All client-driven calls use route handlers. Server actions are not used for data (product-owner decision 1); this keeps one contract per capability and one test surface.

## 2. Wire format

| Aspect | Rule |
|---|---|
| Encoding | JSON, UTF-8. Bodies require `Content-Type: application/json`; otherwise 400 `validation_failed` |
| Field names | camelCase |
| Enum values | The database strings: `not_started`, `in_progress`, `done`, `stopwatch`, `pomodoro`, `timer`, `manual`, `high`, `medium`, `low` |
| IDs | UUIDv7 strings (DATA-DICTIONARY "Reading this document") |
| Instants | ISO 8601 UTC with `Z`, for example `2026-11-06T09:30:00Z` |
| Dates | `YYYY-MM-DD`, a local date in the profile zone (BR-014, ADR-006) |
| Durations | Recorded time ends in `Seconds` (`durationSeconds`); planned or configured time ends in `Min` (`durationMin`, `focusMin`). Mirrors the database |
| Request parsing | Zod `.strict()`: an unknown field gives 400 `validation_failed` (prevents mass assignment) |
| Max body | 512 KiB; larger gives 400 `input_too_large` |
| Nulls | A nullable field is always present with `null`; optional request fields may be omitted |

## 3. Resource shapes

| Operation | Status | Body |
|---|---|---|
| Read one | 200 | Bare object including `id` and, for versioned resources, `version` (integer) |
| Create | 201 | Created object; `Location` header holds the resource path |
| Update (`PATCH`, `PUT`) | 200 | Updated object |
| Archive, restore, other action | 200 | Resulting resource |
| Delete | 204 | None |
| Accepted asynchronous work | 202 | Status resource (export, AI request, deletion) |
| List, not paginated | 200 | `{ "data": [ ... ] }` |
| List, cursor paginated | 200 | `{ "data": [ ... ], "page": { "nextCursor": string or null, "hasMore": boolean } }` |

## 4. Pagination (FR-224)

- Query parameters: `limit` (default 50, minimum 1, maximum 100 on both surfaces) and `cursor`.
- `limit` outside 1..100 gives 400 `invalid_page_size`.
- `cursor` is opaque base64url of the last row's sort keys plus `id`. A malformed or tampered cursor gives 400 `invalid_cursor`. Clients must not parse it.
- Ordering is fixed per endpoint and always ends with `id` as tiebreaker, so pages are stable (FR-224).
- The to-do order is the FR-095 composite; its cursor encodes `(priorityRank, dueDate or null, createdAt, id)`.

| Cursor paginated | Not paginated (bounded) |
|---|---|
| sessions, notes, todos, flashcards, notifications, archived exams, every public list except plan entries | subjects; topics per subject; active exams; plan entries (range required, maximum span 93 days, else 400 `invalid_date_range`); calendar views; stats; API keys (maximum 10 active); groups of a user; group members (maximum 100); exports (last 5); sign-ins; review queue; invites |

## 5. Date ranges

- `from` and `to` are inclusive local dates `YYYY-MM-DD` in the profile zone. `from` later than `to` gives 400 `invalid_date_range`.
- Statistics: maximum span 24 months; 24 months plus one day is rejected with `invalid_date_range` (FR-086). Default is the last 30 days.
- Calendar month: `month=YYYY-MM`.

## 6. Optimistic concurrency (ADR-011, NFR-094, EC-020)

- Versioned resources are those marked **(V)** in DATA-DICTIONARY: profile, subjects, topics, exams, plan entries, study sessions, timer runs, timer settings, to-dos, notes, flashcards, notification preferences, groups.
- Responses carry `ETag: "<version>"` and body `version`.
- `PATCH`, `DELETE`, archive and restore on a versioned resource REQUIRE `If-Match: "<version>"` (a bare integer is also accepted). Missing gives 400 `version_required`. Mismatch gives 409 `stale_version` with `details.current` set to the current resource.
- Not versioned, so no `If-Match`: exam checklist rows (`exam_topics`), goals, flashcard settings, notifications, push subscriptions, API keys, exports, group members, group invites, to-do completion (idempotent set). PROF-03 (onboarding progress) is a deliberate exception on a versioned row: every action is an idempotent set, so it takes no `If-Match` (the write still bumps `version`).
- Timer settings are created lazily. `GET` returns `version: 0` when no row exists; the first `PATCH` may then omit `If-Match`, or send `If-Match: "0"`. After the row exists the normal rule applies.

## 7. Idempotency (ADR-011, NFR-053, EC-021)

- Header `Idempotency-Key`: 1..100 characters matching `^[A-Za-z0-9_-]+$`, generated by the client (UUIDv7 recommended), scoped to the user.
- Required (missing gives 400 `idempotency_key_required`) on every creating `POST` on the internal API, plus timer start and stop, card review, AI request and accept, export request and API key creation. Exceptions: AUTH-01 sign-up (a retry returns `duplicate_email`), PROF-04 account deletion (a repeat returns `unauthenticated` because sessions are revoked) and NOTIF-05 (upsert by push endpoint, naturally idempotent). Public API: required only for `POST /v1/sessions`, optional for other creates.
- Storage: study sessions and card reviews keep the key in `request_key` (a replay returns the existing row with `Idempotent-Replay: true`). Every other keyed action uses `idempotency_keys` with scope `<resource>.<action>` (for example `plan_entry.create`) and 7 day retention (DATABASE-DESIGN R8).
- Replay with the same key and the same canonical request hash (SHA-256 of method + path + canonical JSON body) returns the stored status and body with `Idempotent-Replay: true`.
- One-time secrets are never stored in a replay body: a replay of KEY-02 omits `key` and a replay of GRP-07 omits `inviteUrl`. After a lost response the user revokes the key or invite and creates a new one.
- Same key, different hash: 409 `idempotency_key_reused`.
- Same key while the first request is still executing: 409 `request_in_progress` with `Retry-After: 1`.
- Only 2xx responses are stored. 4xx and 5xx are re-evaluated on retry.
- The idempotency record is committed in the same transaction as the effect (ADR-011 decision 7).

## 8. Warning confirmation (BR-026, FR-038)

- Warnings that need a confirmed resubmission return 409 with `overlap_confirmation_required` or `exam_date_warning_confirmation_required` and `details.warnings: [{ "code", ...conflict ids }]`.
- The client resubmits the same request with body `confirmedWarnings: ["overlap", "exam_date"]` (any subset) and a new `Idempotency-Key`; the old key cannot be reused because the request hash changes.
- A warning that is not in `confirmedWarnings` is never silently accepted.

## 9. Auth classes used in endpoint specs

| Class | Meaning |
|---|---|
| `G` | Guest, no authentication |
| `S` | Cookie session |
| `K:<resource>:<read\|write>` | API key with scope. Write includes read. `GET` needs read, every other method needs write |

Authorization values: `owner` (repository scoped to the caller; another user's record is 404), `group:member`, `group:admin`.

## 10. Rate limits (NFR-012, FR-222, EC-026)

Fixed 60 s windows stored in `rate_limit_counters` (bucket name in parentheses). Values come from the configuration module; unlisted numbers are proposals the owner may override.

| Class | Limit | Bucket | Applies to |
|---|---|---|---|
| RL-READ | 300/min per user | `u:<id>:read` | Internal `GET` |
| RL-WRITE | 120/min per user | `u:<id>:write` | Internal `POST`, `PATCH`, `PUT`, `DELETE` except below |
| RL-TIMER | 120/min per user | `u:<id>:timer` | Timer `GET`, heartbeat, pause, resume, stop (polling 20/min plus heartbeat 1/min fits) |
| RL-HEAVY | 30/min per user | `u:<id>:heavy` | Stats, calendar, export request, AI request, bulk topics, push test |
| RL-SIGNIN | 10/min per IP | `signin:<ip>` | AUTH-02, AUTH-03, plus account lockout (NFR-012) |
| RL-SIGNUP | 5/min per IP | `signup:<ip>` | AUTH-01 |
| RL-RESET | 5/min per IP and 3/min per sha256(email) | `reset:<ip>`, `reset:<emailhash>` | AUTH-05, AUTH-06 |
| RL-DELETE | 5/min per user | `u:<id>:delete` | PROF-04 |
| RL-PUBLIC | 60/min per key (FR-222, U-9) | `apikey:<id>` | Every `/v1` call except `GET /v1/openapi.json` |
| RL-DOC | 60/min per IP | `doc:<ip>` | `GET /v1/openapi.json` |

- Exceeded: 429 `rate_limited` with `Retry-After: <seconds>`.
- Every public response includes `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset` (seconds until the window ends) (FR-222, EC-026).
- A revoked key gets 401 `api_key_revoked` even if its bucket is exhausted (FR-226).
- Business quotas are not request rates: AI 5 per profile day gives `ai_daily_limit_reached`; export allows 1 running and 5 per profile day (counted from `data_exports` rows) and gives `export_limit_reached`.
- Limiter port: `consume(bucket, limit, windowSeconds) -> { allowed, remaining, resetSeconds }`. A limiter outage fails open for reads and fails closed (503 `database_unavailable`) for sign-in, sign-up and reset.
- Client IP source: see [API-SECURITY.md](API-SECURITY.md) section 4.

## 11. Headers

| Header | Rule |
|---|---|
| `X-Request-Id` | On every response; server generated, a client-supplied value is ignored. Errors repeat it as `requestId` in the body (NFR-063) |
| `Cache-Control` | `no-store` on every response, except `GET /timer`, which uses `private, no-cache` with `ETag` and honours `If-None-Match` with 304 (SYSTEM-ARCHITECTURE section 15) |
| `ETag` | Versioned resources (section 6) |
| `Idempotent-Replay` | `true` on a replayed response |
| `Retry-After` | 429, 503 and `request_in_progress`, `account_locked` |
| `RateLimit-*` | Public API (section 10) |
| `Deprecation`, `Sunset` | Public API deprecations (section 13) |

## 12. Time semantics (BR-012, EC-010, ADR-006)

- Clients send commands, never durations or timestamps for the timer. The server clock is authoritative.
- Responses where the client needs a clock offset carry `serverTime` (timer, session create).
- Day bucketing uses the `localDate` and `timezone` frozen on the session (ADR-006, NFR-091).

## 13. Versioning and deprecation (public API, FR-223)

- `/v1` allows additive changes: new endpoints, new optional response fields, new optional request fields. Removing, renaming, retyping a field or changing semantics requires `/v2`.
- Deprecation: `Deprecation: true` and `Sunset: <HTTP-date>` headers and a notice at least 90 days ahead (AC-FR-223-4).
- Any other version prefix (for example `/v2/...` before it exists) gives 404 `unsupported_api_version` with `details.supportedVersions: ["v1"]`.

## 14. Reads without HTTP

Server Components load page data by calling application services directly, with no self-HTTP call. Endpoints exist only for client interactivity (TanStack Query islands, mutations, polling). The dashboard (FR-020..024) therefore has no endpoint; its client islands refresh through the timer, goals, plan-entries, todos and stats endpoints.

## 15. Reconciliations

Contradictions found while writing Phase 6. Existing documents are not edited here; the Phase 8 audit corrects them.

| # | Existing doc says | Phase 6 decision | Doc to correct in Phase 8 |
|---|---|---|---|
| 1 | FR-221 acceptance criteria name the missing-scope code `insufficient_scope`; ERROR-HANDLING catalog says `scope_missing` | Wire code is `scope_missing` (403) | FUNCTIONAL-REQUIREMENTS FR-221, ACCEPTANCE-CRITERIA |
| 2 | ERROR-HANDLING section 2 lists the NFR-012 lockout window under 429 but also defines `account_locked` as 401 | `account_locked` is 401 with `details.lockedUntil` and `Retry-After`; 429 is only `rate_limited` | ERROR-HANDLING section 2 row "Rate limit" |
| 3 | BACKGROUND-JOBS "Group leaderboard weekly compute" and "group's configured week" versus DATABASE-DESIGN R7 member-zone weeks | Leaderboard is computed on read (GRP-15) from `study_session_days` where `is_ranked`, Monday to Sunday by each session's frozen `local_date`; the weekly job is optional pre-aggregation | BACKGROUND-JOBS section 2 and section 4 |
| 4 | FR-132 and BACKGROUND-JOBS: export expires after 24 h; DATA-DICTIONARY `data_exports.expires_at`: 48 h with 24 h minimum | API exposes `expiresAt`; clients must not assume 24 h | BACKGROUND-JOBS, FR-132 wording |
| 5 | FR-001: duplicate email shows a generic message; catalog code `duplicate_email` is 409 | 409 `duplicate_email` with the generic message "We could not create an account with these details"; residual enumeration risk accepted and limited by RL-SIGNUP | ERROR-HANDLING section 7 note |
| 6 | `auth_audit_events.event_type` has no event for API keys, AI consent or export | Change request CR-1 to Phase 4 (see [API-SECURITY.md](API-SECURITY.md) section 8). CR-2 (optional AI cost columns) and CR-3 (email bounce suppression, only if built) also recorded | DATA-DICTIONARY section 1 and 14, DATABASE-CONSTRAINTS |
| 7 | ERROR-HANDLING catalog lacks several codes the API needs | Added in [API-ERRORS.md](API-ERRORS.md) section 4 | ERROR-HANDLING section 4 |
| 8 | FR-224 mandates pagination errors but no code exists | `invalid_page_size` and `invalid_cursor` added | ERROR-HANDLING section 4 |
| 9 | BACKGROUND-JOBS "Export file expiry" says 24 h | See row 4 | BACKGROUND-JOBS section 2 |
| 10 | FR-221 lists API-key scopes; DATA-DICTIONARY `api_keys.scopes` keys match (subjects, topics, sessions, plan_entries, todos, notes, exams) | No conflict. Recorded so the public resource list is not extended without an FR change | none |
| 11 | `onboarding_steps` is "map of step name" with no key list; FR-134 describes four steps in prose | Wire keys `primary_goal`, `first_subject`, `daily_goal_timezone`, `first_session` | DATA-DICTIONARY `user_profiles.onboarding_steps`, FR-134 |
| 12 | FR-153 allows push content of reminder text and subject name | Push payload carries only a notification id and a generic title (stricter, NFR-033) | FR-153 |
| 13 | SECURITY-ARCHITECTURE section 4: "anti-forgery token or origin check" | Origin check with `Sec-Fetch-Site` fallback; no token | SECURITY-ARCHITECTURE section 4 |
| 14 | FR-195 has no accept-time re-validation rule | AI-06 re-validates at accept time (exam still upcoming, topic active, subject not archived, starts in the future) and returns `proposal_stale` | FR-195 |
| 15 | Planning 6 section 3 lists 15 module areas; earlier notes said 14 | 15 areas are evaluated | none |
| 16 | U-A2..U-A7 and U-4 are defined in SDD section 12 and PRD, not in ASSUMPTIONS-AND-RISKS | Links point to SDD and PRD | none |
| 17 | FR-223 AC-2 names the unsupported-version code `unknown_version` | Wire code is `unsupported_api_version` | FR-223 acceptance criteria |
