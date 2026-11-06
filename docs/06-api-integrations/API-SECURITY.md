# Lumora API Security

> Status: Proposal, pending approval. Source of truth: Phase 2 PRD and Phase 1 docs.

This document fixes the security decisions for the internal API (`/api/app`) and the Phase 3 public API (`/v1`). It applies the architecture in [SECURITY-ARCHITECTURE.md](../03-architecture/SECURITY-ARCHITECTURE.md) and [ADR-004](../adr/ADR-004-authentication.md) to concrete endpoints, headers and error codes. Wire rules are in [API-CONVENTIONS.md](API-CONVENTIONS.md), error codes in [API-ERRORS.md](API-ERRORS.md), permissions in [USER-ROLES-AND-PERMISSIONS.md](../02-requirements/USER-ROLES-AND-PERMISSIONS.md), requirements in [NON-FUNCTIONAL-REQUIREMENTS.md](../02-requirements/NON-FUNCTIONAL-REQUIREMENTS.md) and [FUNCTIONAL-REQUIREMENTS.md](../02-requirements/FUNCTIONAL-REQUIREMENTS.md). Field names come from [DATA-DICTIONARY.md](../04-database/DATA-DICTIONARY.md). Endpoint IDs refer to [API-ENDPOINTS.md](API-ENDPOINTS.md). Numbers marked proposal live in configuration (NFR-062) and the owner may change them.

## 1. Authentication

### 1.1 Internal API (`S`)

| Aspect | Decision | Requirement |
|---|---|---|
| Mechanism | Better Auth, database-backed session. The cookie holds an opaque random identifier only; no claims. | NFR-013, ADR-004 |
| Cookie | Name `__Host-lumora_session` (the `__Host-` prefix forces `Secure`, `Path=/` and no `Domain`). Attributes: `HttpOnly; Secure; SameSite=Lax; Path=/`. In local development over HTTP the unprefixed name `lumora_session` is used. | NFR-013, NFR-014 |
| Lookup | One database lookup of the session on every request. No identity cache, so revocation is immediate and well inside the 60 s limit. | NFR-013, FR-008 |
| Expiry | 30 days sliding inactivity; each use extends it. An expired session returns `session_expired`, a revoked one `session_revoked`, a missing one `unauthenticated`. | NFR-013 |
| New identifier | A new session identifier is issued at every sign-in, sign-up and password reset (no fixation). | NFR-013 |
| Lockout | 5 consecutive failed sign-ins lock the account for 15 min; the lock is checked before password verification, so a correct password is refused while locked. Response `account_locked` is 401 with `details.lockedUntil` and `Retry-After` (API-ERRORS, reconciliation 2). | NFR-012 |
| Generic failure | Wrong password, unknown email and an account with `deletion_requested_at` all return `invalid_credentials` with the same message. | NFR-012, FR-002 |
| Password reset | Single-use short-lived token; AUTH-05 returns the same 202 body for known and unknown emails; AUTH-06 revokes all sessions and clears the lockout. | FR-005 |
| Age gate | AUTH-01 and AUTH-03 require `ageConfirmed: true`; the Google flow carries the flag in signed state. | NFR-035, FR-001 |

Password sign-in, sign-up, reset and sign-in management are app-owned endpoints AUTH-01 to AUTH-09 that call the Authentication module use cases. The Better Auth catch-all route `/api/auth/[...all]` is mounted but allow-lists only the Google OAuth callback path; every other path under it returns 404. This stops the library's own password routes from bypassing the lockout, age-gate and audit rules. The exact callback path is unverified and must be confirmed in the Phase 7 spike required by ADR-004 and SECURITY-ARCHITECTURE section 2 (U-A4). If the library cannot be restricted this way, it is wrapped behind the AUTH-0x endpoints and the real paths are recorded here in a one-line amendment; the AUTH-0x contracts do not change.

AUTH-03 is a GET that only redirects to Google with state and PKCE; the session is created by the callback after state and PKCE verification (FR-003). It changes no application data.

### 1.2 Public API (`K`, Phase 3)

| Aspect | Decision | Requirement |
|---|---|---|
| Header | `Authorization: Bearer lum_<43 characters>`, where the 43 characters are base64url of 32 random bytes. | FR-220, NFR-021 |
| Cookies | Session cookies are never accepted on `/v1`. A request with a cookie and no bearer key returns 401 `api_key_invalid`. | FR-220 |
| Cross-surface | `Authorization` is never read on `/api/app`; a bearer key sent there is ignored and the request is treated as unauthenticated. | FR-220 |
| Failures | Missing, malformed or unknown key: 401 `api_key_invalid`. Revoked key: 401 `api_key_revoked`. The wire response does not reveal which part of a malformed key failed. | FR-225, FR-226 |
| Order of checks | Key lookup and revocation first, then rate limit (a revoked key is never answered with 429, FR-226), then scope, then validation. | FR-226, EC-026 |
| Version prefix | A path with a prefix other than `/v1` returns 404 `unsupported_api_version`. | FR-223 |

## 2. API key management

| Rule | Decision | Requirement |
|---|---|---|
| Generation | Server-side, 32 bytes from a cryptographically secure generator, prefix `lum_`. Never client-generated. | NFR-021, FR-220 |
| Display | The full key is returned once, in the KEY-02 response (`ApiKeyCreated`). Afterwards only `name`, `last4`, `scopes`, `createdAt`, `lastUsedAt`, `revokedAt` are visible. | FR-220 |
| Storage | SHA-256 of the key in `api_keys.key_hash` (unique) plus `last4`. The key itself is never stored or logged. | NFR-021 |
| Lookup | By hash through the unique index; the stored and computed hash bytes are compared with a constant-time comparison. A fast hash is acceptable because the key has 256 bits of entropy. | SECURITY-ARCHITECTURE section 9 |
| Cache | No key cache. Each request looks the key up, so revocation takes effect on the next request, which satisfies the 5 s criterion of FR-226. | FR-226, EC-026 |
| `last_used_at` | Updated at most once per minute per key, to avoid a write per request. | NFR-050 |
| Limit | At most 10 active keys per user; the 11th gives 409 `api_key_limit_reached`. | FR-220 |
| Scopes | Fixed at creation: for each of `subjects, topics, sessions, plan_entries, todos, notes, exams`, `read` or `write`; at least one resource. A write scope includes read. Scopes cannot be edited; the user creates a new key. | FR-221 |
| Revocation | KEY-03 sets `revoked_at`. A revoked key stays listed and cannot be reactivated. | FR-226 |
| Account deletion | PROF-04 invalidates all keys at once with the sessions. | FR-007, NFR-031 |
| Logs | A key appears in logs only as `keyId` and `last4`; request headers are never logged. | NFR-063 |
| Key scope on key routes | A key cannot call KEY-01 to KEY-03 or any `/api/app` route; key management needs a cookie session. | FR-220 |
| Leak runbook | If a key leaks: revoke it (KEY-03), read its `lastUsedAt`, review the structured logs by `keyId`, create a replacement. | FR-226 |

## 3. Authorization

The four layers of SECURITY-ARCHITECTURE section 3 map to these concrete adapter and service rules. Authorization defaults to deny.

| Layer | Helper or rule | Failure result |
|---|---|---|
| Edge (route group) | An identity exists for `app` page routes. | Redirect to sign-in with target preserved (FR-002); API routes return 401 `unauthenticated`. |
| Adapter, internal | `requireSession()` resolves the user ID from the cookie. | 401 `unauthenticated`, `session_expired` or `session_revoked`. |
| Adapter, public | `requireScope(resource, access)` checks the key scope before any use case runs. | 403 `scope_missing` with `details.required` = `{resource, access}` (FR-221 text says `insufficient_scope`; wire code is `scope_missing`, see API-CONVENTIONS reconciliation 1). |
| Application service, group | `requireGroupRole(role)` for group actions: `group:member` or `group:admin`. | 403 `role_not_allowed`; 403 `last_administrator` for EC-018. |
| Repository | Every query is scoped by the caller's user ID. There is no repository function that reads by identifier alone. | 404 `not_found`, identical to a missing record (NFR-016). |

Rules:

1. Application services receive `userId` only, never a session or key object. Cookie and key handling stop at the adapter.
2. Cross-user access is 404 `not_found`, never 403 (AC-E2E-10). A path ID that is not a valid UUID also returns 404 (section 5).
3. A non-member of a group gets 404 for every group route, and an unknown, used or revoked invite token gets 404. Only a member lacking the admin role gets 403 `role_not_allowed`.
4. Group administrators gain management rights only. They never reach subjects, topics, sessions, plan entries, notes, to-dos or exams of a member (USER-ROLES-AND-PERMISSIONS sections 2 and 3, NFR-037). Fields a member did not opt in to share are absent, not null.
5. An API key acts as exactly one user and never exceeds that user's rights (FR-221).
6. There is no in-app administrator and no administrative API (R-1).
7. Contract test: for every internal and public endpoint with an `{id}` or other resource identifier in the path or body, a second authenticated user must receive 404. A failure is severity 1 (NFR-016, AC-E2E-10). The same test asserts that a key lacking the scope receives `scope_missing` and that a revoked key receives `api_key_revoked`.

### 3.1 Scope matrix (public API)

A GET needs `read`; every other method needs `write`. A `write` scope includes `read` (FR-221). All `/v1` calls use class RL-PUBLIC.

| Resource (scope key) | GET list / GET item | POST | PATCH / PUT | DELETE | Endpoint IDs |
|---|---|---|---|---|---|
| `subjects` | read | write (create, archive, restore) | write | not offered | PUB-01 to PUB-05b |
| `topics` | read | write (create, archive, restore) | write | not offered | PUB-06 to PUB-10b |
| `sessions` | read | write (manual only) | write | write | PUB-11 to PUB-15 |
| `plan_entries` | read | write (create, missed) | write | write | PUB-16 to PUB-21 |
| `todos` | read | write | write (including `done`) | write | PUB-22 to PUB-26 |
| `notes` | read | write | write | write | PUB-27 to PUB-31 |
| `exams` | read | write | write (including `PUT /topics`) | not offered | PUB-32 to PUB-36 |
| none (guest) | `GET /v1/openapi.json` | | | | PUB-37, class RL-DOC |

A method a resource does not offer returns 405 on `/v1`. Timer, goals, statistics, flashcards, groups, AI, notifications, profile and export have no public routes (FR-220 lists exactly the seven resources above).

## 4. Rate limiting

Classes, limits, buckets and response headers are defined once in [API-CONVENTIONS.md](API-CONVENTIONS.md) section 10 (RL-READ, RL-WRITE, RL-TIMER, RL-HEAVY, RL-SIGNIN, RL-SIGNUP, RL-RESET, RL-DELETE, RL-PUBLIC, RL-DOC; FR-222, NFR-012). This section adds the rules that belong to security.

| Topic | Decision |
|---|---|
| Client IP | The client IP is the rightmost untrusted entry of `X-Forwarded-For`, counting from the platform proxy. The number of trusted hops is set per environment in configuration and fixed in Phase 7 (platform not yet chosen, U-A1). If the header is absent or malformed, the socket address is used. Leftmost values are never trusted, because clients can forge them. |
| Port | `consume(bucket, limit, windowSeconds)` returns `{allowed, remaining, resetSeconds}`; the MVP implementation is Postgres-backed `rate_limit_counters` (D20). |
| Failure: limiter unavailable on reads and ordinary writes | Fail open. The request is served and the outage is logged at `error`. |
| Failure: limiter unavailable on sign-in, sign-up, password reset | Fail closed with 503 `database_unavailable`, because failing open would disable brute-force protection. |
| Failure: clock or window edge | Fixed 60 s windows allow a burst of up to twice the limit across a window boundary; accepted for the MVP. |
| Per-account lockout | Independent of RL-SIGNIN; counts failures per account (NFR-012). RL-SIGNIN limits many accounts from one IP. |
| Reset enumeration | RL-RESET counts per IP and per SHA-256 of the lower-cased email, so the limiter itself never stores a plain email. |
| Public keys | RL-PUBLIC is per key, not per user (FR-222). Public responses carry `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`; 429 adds `Retry-After`. Brute force of key values is impractical at 60 requests per minute against 256 bits of entropy. Requests with an unknown key are also counted in a per-IP bucket `apikey-unknown:<ip>` (proposal: 60/min) so a scanner cannot probe without limit. |
| Business quotas | AI (5 per profile day, FR-196) and exports (1 running, 5 per profile day, FR-130) are counted from their own tables and return `ai_daily_limit_reached` and `export_limit_reached`, not `rate_limited`. |
| Edge | A coarse per-IP limit on the whole app at the platform edge is a deployment concern (NFR-050, [SECURITY-ARCHITECTURE.md](../03-architecture/SECURITY-ARCHITECTURE.md) section 10). |

## 5. Input validation

| Rule | Decision | Source |
|---|---|---|
| Schemas | Zod schemas are parsed with `.strict()` at the adapter, before any use case. Unknown fields give 400 `validation_failed` (mass assignment is impossible: a client cannot set `user_id`, `version`, `source`, `completed_at`). Schemas are shared with the client for form validation. | API-CONVENTIONS section 2, [API-SCHEMAS.md](API-SCHEMAS.md) |
| Content type | Request bodies must be `application/json`, else 400 `validation_failed`. | API-CONVENTIONS section 2 |
| Body size | Maximum 512 KiB, else 400 `input_too_large`. | API-CONVENTIONS section 2 |
| Path IDs | A path identifier that is not a UUID returns 404 `not_found`, not 400, so the response does not reveal the ID shape. Query and body IDs that are not UUIDs give 400 `validation_failed`. | NFR-016 |
| Text fields | Trimmed, then length-checked against DATA-DICTIONARY (for example subject name 1..100, group name 1..60, note body up to 100000 characters). Whitespace-only is rejected where the FR says non-whitespace. | DATA-DICTIONARY |
| Time zones | A zone is accepted only if it is in the runtime IANA list (`Intl.supportedValuesOf('timeZone')`); else `invalid_timezone` (EC-006). | EC-006 |
| Markdown | Stored exactly as written; never sanitized on write. Sanitization runs on the server at render time (NOTE-05) with the allow-list pipeline, `rel` on external links and no image loading unless `allowImages=true`. Public note endpoints return raw markdown only. | NFR-015, FR-101, [ADR-007](../adr/ADR-007-notes-markdown-and-sanitization.md) |
| Cursors | Opaque base64url; decoded and validated against the endpoint's sort keys; a malformed or tampered cursor gives 400 `invalid_cursor`. A cursor cannot widen the caller's scope because the repository still applies the user filter. | FR-224 |
| AI output | Treated as untrusted input: strict schema, ref mapping, per-entry validation (see [AI-INTEGRATION.md](AI-INTEGRATION.md)). | NFR-036, FR-193 |
| CSV export | Any cell that begins with `=`, `+`, `-` or `@` is prefixed with a single quote to prevent spreadsheet formula injection. | FR-130 |
| Stored output | React escapes output by default; no raw HTML insertion outside the markdown pipeline. | NFR-014 |
| Query strings | Unknown query parameters are rejected with `validation_failed`, for the same reason as unknown body fields. | API-CONVENTIONS section 2 |

## 6. CORS

| Surface | Decision |
|---|---|
| `/api/app` | No CORS headers are sent. Only same-origin browser calls are supported; cross-origin browser calls fail at the browser. |
| `/v1` (Phase 3) | No `Access-Control-Allow-*` headers. The public API is for server-to-server and script use. A key must never be embedded in browser code, because a browser holding a key exposes it to any script on the page. `OPTIONS` returns 405. |
| Reopen criterion | A documented first-party browser client that needs keys. FR-220 to FR-226 do not require one, so it is out of scope; opening it would need an ADR on short-lived tokens instead of long-lived keys. |

## 7. CSRF

| Rule | Decision | Source |
|---|---|---|
| Scope | Every `POST`, `PUT`, `PATCH` and `DELETE` on `/api/app`. | NFR-014 |
| Origin check | The `Origin` header must equal the configured application origin exactly. | NFR-014 |
| Fallback | If `Origin` is absent, `Sec-Fetch-Site: same-origin` is required. If both are missing or wrong, the request is refused. | NFR-014 |
| Result | 403 `csrf_rejected`, before authentication state is changed and before body parsing. | [API-ERRORS.md](API-ERRORS.md) |
| Defence in depth | `SameSite=Lax` cookie, JSON-only content type (a cross-site HTML form cannot send `application/json`), and no state change on GET. | NFR-014 |
| Exceptions | AUTH-03 is GET and only redirects. The OAuth callback creates a session only after state and PKCE verification. | FR-003 |
| Public API | `/v1` has no cookie authority, so CSRF does not apply; a cookie is ignored (section 1.2). | SECURITY-ARCHITECTURE section 4 |
| Sign-in forms | Guest endpoints (AUTH-01, AUTH-02, AUTH-05, AUTH-06) use the same origin check, which prevents login CSRF. | NFR-014 |

The CSRF-token alternative named in SECURITY-ARCHITECTURE section 4 ("anti-forgery token or origin header check") is resolved here in favour of the origin check; no token is issued.

## 8. Audit logging

`auth_audit_events` records the types in NFR-020 only: `sign_in`, `sign_in_failed`, `lockout`, `password_reset`, `session_revoked`, `account_deleted` (DATA-DICTIONARY `auth_audit_events`). Fields: event type, user reference, source IP, user agent, time; retention 90 days; no password, token or key is stored. `account_deleted` rows carry no IP or user agent.

### 8.1 Gap and change request CR-1

The approved database design has no audit events for API keys, AI consent or export requests. Phase 6 is documentation only and adds no migration, so the gap is recorded as a change request.

| Item | Decision |
|---|---|
| CR-1 (to Phase 4) | Extend the `auth_audit_events.event_type` CHECK, and the enumerated value set in DATA-DICTIONARY section 18, with `api_key_created`, `api_key_revoked`, `ai_consent_granted`, `ai_consent_revoked`, `export_requested`. |
| Interim | Until CR-1 is accepted, those actions are written to structured logs only, with event name, `userId`, `keyId` and `last4` where relevant, and `requestId`. Structured logs are not a retention-guaranteed audit trail. |
| Reconciliation | Listed in API-CONVENTIONS section 15 for the Phase 8 audit. |

### 8.2 Event emission by endpoint

"DB" means a row in `auth_audit_events`. "Log" means a structured log event only (interim until CR-1; after CR-1 these become DB rows, and the log entry remains).

| Endpoint | Outcome | Audit record |
|---|---|---|
| AUTH-01 | Account created | DB `sign_in` (the session creation) |
| AUTH-02 | Success | DB `sign_in` |
| AUTH-02 | Wrong password or unknown email | DB `sign_in_failed` (for an unknown email, no user reference) |
| AUTH-02 | Fifth consecutive failure | DB `sign_in_failed` and DB `lockout` |
| AUTH-02 | Refused because locked | DB `sign_in_failed` |
| AUTH-03 and callback | Google sign-in or link | DB `sign_in` |
| AUTH-04 | Sign-out | DB `session_revoked` |
| AUTH-06 | Password changed | DB `password_reset`, plus DB `session_revoked` for the revoked sessions |
| AUTH-08 | One sign-in revoked | DB `session_revoked` |
| AUTH-09 | Others revoked | DB `session_revoked` (one per revoked session) |
| PROF-04 | Deletion requested | DB `session_revoked` for the revoked sessions; DB `account_deleted` when the purge completes |
| Inactivity expiry | Session expires unused | None (no event in NFR-020) |
| KEY-02 | Key created | Log `api_key_created` (CR-1: DB) |
| KEY-03 | Key revoked | Log `api_key_revoked` (CR-1: DB) |
| AI-02 | Consent granted | Log `ai_consent_granted` (CR-1: DB); the append-only `ai_consents` row is also the durable record |
| AI-02 | Consent revoked (`granted: false`) | Log `ai_consent_revoked` (CR-1: DB); `ai_consents` row as above |
| PROF-05 | Export requested | Log `export_requested` (CR-1: DB); the `data_exports` row is also the durable record |
| All `/v1` calls | Any | Request log with `keyId`, `last4`, method, route, status, `requestId`; no audit row |

Every request additionally writes the structured log required by NFR-063 (request ID, outcome); passwords, tokens, keys, note content and AI text are never logged.

## 9. Data access boundaries

| Data class | Who can read it | Via which endpoint | Never logged |
|---|---|---|---|
| Credentials (password hash, reset tokens, OAuth link) | Nobody through the API; the hash is never returned. | None; AUTH-06 accepts a token, never returns one | Password, hash, reset token, OAuth tokens, `failed_sign_in_count` |
| Sessions | The owner | AUTH-07 (device, `lastActiveAt`, `current`) | Session identifier, cookie value |
| Study data (subjects, topics, sessions, plan entries, to-dos, goals, exams, flashcards) | The owner; a key with the matching scope for the seven public resources | Internal module endpoints; `/v1` PUB-01 to PUB-36 | Names, titles and free text (logs carry IDs only) |
| Notes | The owner; a key with `notes` scope | NOTE-01 to NOTE-05; PUB-27 to PUB-31 | Note body and preview |
| AI proposals and requests | The owner | AI-05 | Prompt, provider payload, provider response, proposal content |
| Export files | The owner, authenticated and ownership-checked, until `expiresAt` | PROF-08 (streamed; never a public or pre-signed URL) | File content, storage object key |
| Group data | Members: group name, member list, and only the fields each member opted in to share | GRP-03, GRP-06, GRP-15 | Report reasons, invite tokens |
| Group administrators | Management only: rename, invite, remove, transfer, dissolve. No access to member study data. | GRP-04, GRP-05, GRP-07 to GRP-09, GRP-12, GRP-13 | Invite tokens |
| Reports | Written by a member, never exposed to the reported member or reporter lists; no read endpoint | GRP-16 (write only) | Reason text |
| API keys | The owner sees metadata only; the full key is shown once | KEY-01, KEY-02 | Full key, `key_hash`, `Authorization` header |
| Audit events | No endpoint (no user-facing FR); staff only, outside the product | None | Passwords, tokens |

Further boundaries:

- The AI provider receives only the minimised payload defined in [AI-INTEGRATION.md](AI-INTEGRATION.md) and only after consent (NFR-036, FR-192). It never receives email, display name, user ID, note content or exam titles.
- Outbound webhooks do not exist; see [WEBHOOKS.md](WEBHOOKS.md).
- Responses omit `user_id`, `request_key`, `token_hash`, `key_hash`, `password_hash` and other internal columns ([API-SCHEMAS.md](API-SCHEMAS.md)).
- Error bodies never contain stack traces, SQL, hostnames or other users' IDs. The unauthenticated `GET /api/health` returns no versions or internals.

## 10. Other controls

### 10.1 Headers and transport

Security headers, the nonce-based Content-Security-Policy, `frame-ancestors none`, TLS 1.2 or higher and HSTS are specified in [SECURITY-ARCHITECTURE.md](../03-architecture/SECURITY-ARCHITECTURE.md) sections 4 and 6 and are not restated. API responses add `Cache-Control: no-store` and a server-generated `X-Request-Id` ([API-CONVENTIONS.md](API-CONVENTIONS.md) section 11). The API sets `X-Content-Type-Options: nosniff` on all responses, including export downloads, which are sent with `Content-Disposition: attachment`.

### 10.2 Sensitive actions

| Action | Control |
|---|---|
| Account deletion (PROF-04) | Re-authentication with password (or a Google re-auth token) plus typed confirmation; class RL-DELETE; revokes sessions and keys at once; purge within 30 days (NFR-031, FR-007). |
| Export download (PROF-08) | Authenticated, ownership-checked, expiry-checked; expired or foreign export gives 404; running export gives `export_not_ready`. |
| Group dissolve (GRP-05) | Admin only; body `confirmName` must equal the group name. |
| API key creation (KEY-02) | Cookie session only; keyed by `Idempotency-Key`; limit 10 active keys. |

### 10.3 API threat table

These rows extend section 13 of SECURITY-ARCHITECTURE for API-specific risks.

| Asset | Threat | Mitigation | Requirement |
|---|---|---|---|
| Any `{id}` resource | IDOR through guessed or foreign identifiers | Repository ownership scoping, 404 for cross-user, composite foreign keys, contract test over every endpoint | NFR-016, NFR-092, AC-E2E-10 |
| Request bodies | Mass assignment of `user_id`, `version`, `source` or timestamps | `.strict()` Zod schemas that list writable fields only; unknown field gives 400 | NFR-016 |
| Create endpoints | Replay or duplicate submission | `Idempotency-Key` with request hash; `request_key` on sessions and card reviews | NFR-053, EC-021 |
| Concurrent edits | Lost update | `If-Match` and `stale_version` | NFR-094, EC-020 |
| API keys | Brute force of key values | 256-bit entropy, RL-PUBLIC, per-IP limit on unknown keys, hash lookup | NFR-021, FR-222 |
| API keys | Leak from logs or support | Keys never logged, only `keyId` and `last4`; immediate revocation | NFR-063, FR-226 |
| API keys | Use of a key on cookie-only routes, or a cookie on `/v1` | Strict surface separation; `Authorization` ignored internally, cookies ignored publicly | FR-220 |
| Pagination | Cursor tampering or scope widening | Opaque base64url, validated sort keys, user filter always applied, `invalid_cursor` | FR-224 |
| AI scheduling | Prompt injection through subject or topic names | Names sent as aliased refs, instructions fixed in a versioned prompt, strict output schema, ref allow-list, per-entry validation, user must accept the proposal | NFR-036, FR-193 |
| AI scheduling | Provider output creates invalid or hostile entries | Treated as untrusted; all-or-nothing accept re-validates | FR-195 |
| Notes | Stored XSS | Allow-list sanitization on render, CSP, corpus tests | NFR-015 |
| Export | CSV formula injection | Leading `= + - @` prefixed with `'` | FR-130 |
| Sign-in | Credential stuffing across many accounts | RL-SIGNIN per IP plus per-account lockout; fail closed if limiter is down | NFR-012 |
| Sign-up and reset | Account enumeration | Neutral reset response; generic sign-up message (residual risk on `duplicate_email` accepted, mitigated by RL-SIGNUP, API-ERRORS) | FR-001, FR-005 |
| Cross-site requests | CSRF and login CSRF | Origin check, `SameSite=Lax`, JSON-only (section 7) | NFR-014 |
| Browser use of keys | Key exposure in client code | No CORS on `/v1` (section 6) | NFR-021 |
| Timer and sessions | Forged durations | Clients send commands, not durations; server clock authoritative | NFR-090, EC-010 |
| Groups | Admin over-reach, member over-sharing | `requireGroupRole`, per-field opt-in, absent fields | NFR-037, R-1 |
| Better Auth routes | Library password routes bypass lockout and age gate | Catch-all allow-lists the OAuth callback only | NFR-012, NFR-035 |
