# Lumora API Endpoints

> Status: Proposal, pending approval. Source of truth: Phase 2 PRD and Phase 1 docs.

Per-endpoint contracts for the internal API (`/api/app`, MVP to Phase 3) and the public API (`/v1`, Phase 3), derived from [FUNCTIONAL-REQUIREMENTS.md](../02-requirements/FUNCTIONAL-REQUIREMENTS.md) and the module use cases in [MODULE-BOUNDARIES.md](../03-architecture/MODULE-BOUNDARIES.md). Shared rules are in [API-CONVENTIONS.md](API-CONVENTIONS.md), request and response shapes in [API-SCHEMAS.md](API-SCHEMAS.md), codes in [API-ERRORS.md](API-ERRORS.md), security in [API-SECURITY.md](API-SECURITY.md), the choice of mechanism per capability in [API-STRATEGY.md](API-STRATEGY.md). Documentation only: no endpoint is implemented.

## 1. How to read this document

- Every endpoint has a spec block with the same 12 rows: Purpose, Phase / FR, Authentication, Authorization, Request parameters, Request body, Response, Validation rules, Error responses, Rate limit, Pagination, Idempotency / concurrency. Block headings are `#### <ID> <METHOD> <path>`; internal paths are relative to `/api/app` unless written in full.
- Phase is `MVP`, `2` or `3`. Phase 2 and 3 contracts are non-binding until that phase starts.
- Authentication classes (`G`, `S`, `K:<resource>:<read|write>`), rate-limit classes (`RL-*`), header rules, pagination, `If-Match` and `Idempotency-Key` are defined once in [API-CONVENTIONS.md](API-CONVENTIONS.md) and not restated per endpoint beyond the values that apply. Schema names refer to [API-SCHEMAS.md](API-SCHEMAS.md). Codes refer to [API-ERRORS.md](API-ERRORS.md).
- Each endpoint maps to exactly one use case in [MODULE-BOUNDARIES.md](../03-architecture/MODULE-BOUNDARIES.md) section 2; the handler does authentication, origin check, rate limit, Zod parse, idempotency, version-header extraction and error mapping only ([API-STRATEGY.md](API-STRATEGY.md) section 2).
- No endpoint exists for something a Server Component can load directly (API-CONVENTIONS section 14). Section 5 lists what is deliberately not exposed.

### Common error set

Stated once; not repeated in spec blocks. Each block lists only endpoint-specific codes.

| Code | Status | Applies to |
|---|---|---|
| `unauthenticated` | 401 | Every `S` endpoint |
| `validation_failed` | 400 | Every endpoint with parameters or a body |
| `rate_limited` | 429 | Every endpoint (class in its block) |
| `internal_error` | 500 | Every endpoint |
| `csrf_rejected` | 403 | Every state-changing `S` call (`POST`, `PUT`, `PATCH`, `DELETE`) |
| `not_found` | 404 | Any endpoint with a `{id}` path parameter, including cross-user access and non-UUID values |
| `api_key_invalid`, `api_key_revoked`, `scope_missing` | 401, 401, 403 | Every public `/v1` endpoint with a key |

## 2. Requirement coverage

Every functional requirement in [FUNCTIONAL-REQUIREMENTS.md](../02-requirements/FUNCTIONAL-REQUIREMENTS.md) appears exactly once. FR-133 does not exist by design. Kinds: `endpoint` (served by the listed endpoints), `server component` (page data loaded in-process), `client only`, `job` (background rule, surfaced as stated), `composition` (existing endpoints combined by the client or adapter).

| FR | Requirement | Kind | Endpoint IDs or mechanism |
|---|---|---|---|
| FR-001 | Register with email and password | endpoint | AUTH-01 |
| FR-002 | Log in with email and password | endpoint | AUTH-02 |
| FR-003 | Sign in with Google | endpoint | AUTH-03 |
| FR-004 | Log out | endpoint | AUTH-04 |
| FR-005 | Reset a forgotten password | endpoint | AUTH-05, AUTH-06 |
| FR-006 | Edit profile display name and timezone | endpoint | PROF-01, PROF-02 |
| FR-007 | Delete account with 30-day purge | endpoint | PROF-04 |
| FR-008 | View and revoke active sign-ins | endpoint | AUTH-07, AUTH-08, AUTH-09 |
| FR-009 | Configure day rollover hour | endpoint | PROF-01, PROF-02 |
| FR-010 | Create a subject | endpoint | SUBJ-01, SUBJ-02, SUBJ-03 |
| FR-011 | Edit subject name and color | endpoint | SUBJ-04 |
| FR-012 | Reorder subjects | endpoint | SUBJ-05 |
| FR-013 | Archive a subject | endpoint | SUBJ-06 |
| FR-014 | Restore an archived subject | endpoint | SUBJ-07 |
| FR-015 | Create a topic with optional weight | endpoint | TOP-01, TOP-02, TOP-04 |
| FR-016 | Edit and reorder topics | endpoint | TOP-05, TOP-06 |
| FR-017 | Bulk paste a topic list | endpoint | TOP-03 |
| FR-018 | Archive and restore a topic | endpoint | TOP-07, TOP-08 |
| FR-019 | Set topic status | endpoint | TOP-05 |
| FR-020 | Dashboard today's progress against goal | server component | Dashboard page; client refresh via GOAL-05 |
| FR-021 | Dashboard running timer card | server component | Dashboard page; client refresh via TIM-01 |
| FR-022 | Dashboard next three planned entries | server component | Dashboard page; client refresh via PLAN-01 |
| FR-023 | Dashboard due and overdue to-dos | server component | Dashboard page; client refresh via TODO-01 |
| FR-024 | Dashboard seven-day minutes by subject | server component | Dashboard page; client refresh via STAT-04 |
| FR-030 | Create a plan entry | endpoint | PLAN-02 |
| FR-031 | Edit an upcoming plan entry | endpoint | PLAN-04 |
| FR-032 | Delete a plan entry | endpoint | PLAN-05 |
| FR-033 | Mark a past plan entry as missed | endpoint | PLAN-06 |
| FR-034 | Overlap warning and confirmation | endpoint | PLAN-02, PLAN-04 (`confirmedWarnings`) |
| FR-035 | Past plan entries are read-only | endpoint | PLAN-04 (`past_entry_read_only`) |
| FR-036 | Planned versus actual display | endpoint | PLAN-01, PLAN-03 |
| FR-037 | List and filter plan entries | endpoint | PLAN-01 |
| FR-038 | Warn when planning after an exam date | endpoint | PLAN-02, PLAN-04 |
| FR-040 | Save a timer session when it stops | endpoint | TIM-05 |
| FR-041 | Link a session to subject, topic and plan entry | endpoint | TIM-02, SESS-03, SESS-04 |
| FR-042 | Add a manual session entry | endpoint | SESS-03 |
| FR-043 | Edit a session | endpoint | SESS-02, SESS-04 |
| FR-044 | Delete a session | endpoint | SESS-05 |
| FR-045 | Discard sessions shorter than one minute | endpoint | TIM-05 (`outcome: discarded`) |
| FR-046 | Auto-close an idle session | job | Idle-session auto-close job; late stop returns `session_already_closed` on TIM-05 |
| FR-047 | Split a session at the day boundary | endpoint | SESS-02 (`dayAllocations`), computed on write by SESS-03, SESS-04, TIM-05 |
| FR-048 | Idempotent session save | endpoint | SESS-03, TIM-05 (`Idempotency-Key`) |
| FR-049 | Post-session topic status and note prompt | composition | TIM-05 result, then TOP-05 and NOTE-02 |
| FR-050 | Start a Pomodoro timer | endpoint | TIM-02 |
| FR-051 | Start a stopwatch | endpoint | TIM-02, TIM-05 |
| FR-052 | Pause and resume a timer | endpoint | TIM-03, TIM-04, TIM-06 |
| FR-053 | Allow only one running timer | endpoint | TIM-02 |
| FR-054 | Recover a running timer after refresh or network loss | endpoint | TIM-01 |
| FR-055 | Interval-end notification | client only | Browser notification from `phaseEndsAt` |
| FR-056 | Tab title countdown | client only | Derived from TIM-01 state |
| FR-057 | Configure timer durations | endpoint | TIM-07, TIM-08 |
| FR-058 | Stop a Pomodoro and classify the result | endpoint | TIM-05 |
| FR-059 | Converge timer state across devices | endpoint | TIM-01 |
| FR-060 | Month heatmap of study minutes | endpoint | CAL-01 |
| FR-061 | Calendar day detail | endpoint | CAL-02, SESS-01 |
| FR-062 | Planned entries on the calendar | endpoint | CAL-02, PLAN-01 |
| FR-065 | Create a plan entry by dragging | endpoint | PLAN-02 |
| FR-066 | Move a plan entry by dragging | endpoint | PLAN-04 |
| FR-067 | Resize a plan entry on the 15-minute grid | endpoint | PLAN-04 |
| FR-068 | Keyboard alternative for calendar planning | endpoint | PLAN-02, PLAN-04 |
| FR-069 | Overlap confirmation on drag-and-drop | endpoint | PLAN-04 (`confirmedWarnings`) |
| FR-070 | Set the daily goal | endpoint | GOAL-01, GOAL-02 |
| FR-071 | Set per-subject daily goals | endpoint | GOAL-01, GOAL-03, GOAL-04 |
| FR-072 | Show daily goal progress | endpoint | GOAL-05 |
| FR-073 | Show goal-met state | endpoint | GOAL-05 |
| FR-074 | Apply goal changes from today forward | endpoint | GOAL-01, GOAL-02 |
| FR-080 | Daily study totals | endpoint | STAT-01 |
| FR-081 | Weekly study totals | endpoint | STAT-02 |
| FR-082 | Monthly study totals | endpoint | STAT-03 |
| FR-083 | Study totals by subject | endpoint | STAT-04 |
| FR-084 | Goal-hit rate | endpoint | STAT-05 |
| FR-085 | Planned versus actual statistics | endpoint | STAT-06 |
| FR-086 | Date ranges up to 24 months | endpoint | STAT-01 to STAT-06 (`invalid_date_range`) |
| FR-087 | Statistics empty state | endpoint | STAT-01 to STAT-06 (zero-filled or `noData`) |
| FR-088 | Show manual entries distinctly in statistics | endpoint | STAT-01 |
| FR-089 | Correct day buckets across timezone and DST | endpoint | STAT-01 to STAT-06 (frozen `localDate`) |
| FR-090 | Create a to-do | endpoint | TODO-02 |
| FR-091 | Edit a to-do | endpoint | TODO-03, TODO-04 |
| FR-092 | Delete a to-do | endpoint | TODO-06 |
| FR-093 | Mark a to-do done or undone | endpoint | TODO-05 |
| FR-094 | Filter to-dos | endpoint | TODO-01 |
| FR-095 | Sort to-dos by priority then due date | endpoint | TODO-01 |
| FR-096 | Assign to-do priority | endpoint | TODO-02 |
| FR-100 | Create and edit a markdown note | endpoint | NOTE-01, NOTE-02, NOTE-03, NOTE-04 |
| FR-101 | Render notes with sanitization | endpoint | NOTE-05 |
| FR-102 | Autosave notes | endpoint | NOTE-04 |
| FR-103 | Resolve note version conflicts | endpoint | NOTE-02, NOTE-04 (`stale_version`) |
| FR-104 | Delete a note | endpoint | NOTE-06 |
| FR-107 | Create a flashcard | endpoint | FLASH-01, FLASH-02 |
| FR-108 | Edit and delete a flashcard | endpoint | FLASH-03, FLASH-04 |
| FR-109 | Daily review queue | endpoint | FLASH-05 |
| FR-110 | Rate a reviewed flashcard | endpoint | FLASH-06 |
| FR-111 | Daily review limit | endpoint | FLASH-05, FLASH-07, FLASH-08 |
| FR-112 | Spaced-repetition scheduling | endpoint | FLASH-06 |
| FR-120 | Create an exam | endpoint | EXAM-02 |
| FR-121 | Edit an exam | endpoint | EXAM-04 |
| FR-122 | Exam topic checklist | endpoint | EXAM-03, EXAM-05, EXAM-06 |
| FR-123 | Exam countdown | endpoint | EXAM-01, EXAM-03 |
| FR-124 | Archive exams after the exam date | job | Exam auto-archive job; result visible in EXAM-01 `state=archived` |
| FR-125 | View archived exams | endpoint | EXAM-01 |
| FR-126 | Exam readiness score | endpoint | EXAM-03 |
| FR-127 | Weighted topics in readiness | endpoint | EXAM-06 |
| FR-128 | Label readiness as topic coverage | endpoint | EXAM-03 |
| FR-130 | Export data as CSV | endpoint | PROF-05, PROF-08 |
| FR-131 | Export data as JSON | endpoint | PROF-05, PROF-08 |
| FR-132 | Export progress and failure handling | endpoint | PROF-05, PROF-06, PROF-07, PROF-08 |
| FR-134 | Onboarding wizard | endpoint | PROF-01, PROF-03 |
| FR-135 | Skip onboarding steps | endpoint | PROF-03 |
| FR-136 | Guided first session | composition | PROF-03 plus TIM-02 and TIM-05 |
| FR-137 | Choose primary goal in onboarding | endpoint | PROF-01, PROF-02, PROF-03 |
| FR-138 | Light, dark and system theme | endpoint | PROF-01, PROF-02 |
| FR-139 | Responsive layout | client only | No data contract |
| FR-150 | Daily study reminder | endpoint | NOTIF-03, NOTIF-04; delivery by reminder job |
| FR-151 | Plan entry reminder | endpoint | NOTIF-04; delivery by reminder job |
| FR-152 | In-app notifications | endpoint | NOTIF-01, NOTIF-02 |
| FR-153 | Browser push opt-in | endpoint | NOTIF-05, NOTIF-06, NOTIF-07; delivery by push job |
| FR-154 | Reminder preferences | endpoint | NOTIF-03, NOTIF-04 |
| FR-160 | Current streak | job | Streak evaluation job; read through GAME-01 |
| FR-161 | Streak reset after a missed day | job | Streak evaluation job; read through GAME-01 |
| FR-162 | Weekly streak freeze | job | Streak evaluation job; `freezeAvailable` in GAME-01 |
| FR-163 | Longest streak | job | Streak evaluation job; read through GAME-01 |
| FR-164 | Streak stability across timezone change | job | Streak evaluation job; read through GAME-01 |
| FR-170 | Award XP for focused minutes | job | Event-driven XP award; total in GAME-01 |
| FR-171 | Award XP for meeting the daily goal | job | Event-driven XP award; total in GAME-01 |
| FR-172 | Award XP for completed High-priority to-dos | job | Event-driven XP award; total in GAME-01 |
| FR-173 | Daily XP cap | job | XP rule; total in GAME-01 |
| FR-174 | XP exclusions | job | XP rule; total in GAME-01 |
| FR-175 | Levels | job | Level computed from XP; `level` and `xpToNextLevel` in GAME-01 |
| FR-176 | Idempotent XP ledger | job | Ledger uniqueness; no endpoint writes it |
| FR-177 | XP adjustment on session edit or delete | job | Event-driven compensation; total in GAME-01 |
| FR-180 | Choose an ambient loop | endpoint | TIM-07, TIM-08 (`audioLoop`) |
| FR-181 | Ambient volume | endpoint | TIM-07, TIM-08 (`audioVolume`) |
| FR-182 | Play audio only while a session runs | client only | Derived from TIM-01 state |
| FR-183 | Remember last audio choice | endpoint | TIM-08 |
| FR-184 | Mute audio on pause | client only | Derived from TIM-01 state |
| FR-190 | AI schedule inputs | endpoint | AI-04 |
| FR-191 | Request an AI schedule | endpoint | AI-04, AI-05 |
| FR-192 | Consent to share study data with the AI provider | endpoint | AI-01, AI-02 |
| FR-193 | Preview an AI schedule | endpoint | AI-05 |
| FR-194 | Validate AI-proposed entries | endpoint | AI-05 (server-side validation result) |
| FR-195 | Accept or discard an AI schedule | endpoint | AI-06, AI-07 |
| FR-196 | AI generation daily limit | endpoint | AI-03, AI-04 |
| FR-197 | AI provider failure handling | endpoint | AI-05 |
| FR-198 | AI schedule prerequisites | endpoint | AI-04 |
| FR-200 | Create a study group | endpoint | GRP-01, GRP-02 |
| FR-201 | Invite members to a group | endpoint | GRP-07, GRP-08, GRP-09 |
| FR-202 | Join a group | endpoint | GRP-10 |
| FR-203 | Leave a group | endpoint | GRP-11 |
| FR-204 | Remove a group member | endpoint | GRP-12 |
| FR-205 | Transfer group administration | endpoint | GRP-13 |
| FR-206 | Per-user sharing setting | endpoint | GRP-14 |
| FR-207 | Weekly leaderboard | endpoint | GRP-15 |
| FR-208 | Group size cap | endpoint | GRP-10, GRP-15 (`group_full`) |
| FR-209 | Report a group member | endpoint | GRP-16 |
| FR-210 | Dissolve a group | endpoint | GRP-05 |
| FR-211 | View group members | endpoint | GRP-03, GRP-06 |
| FR-212 | Rename a group | endpoint | GRP-04 |
| FR-220 | Create an API key | endpoint | KEY-01, KEY-02 |
| FR-221 | API key scopes | endpoint | KEY-02; enforced on every PUB endpoint |
| FR-222 | API rate limit | endpoint | Every PUB endpoint (RL-PUBLIC) |
| FR-223 | Versioned API | endpoint | Every PUB endpoint (`/v1` prefix) |
| FR-224 | JSON responses and pagination | endpoint | Every PUB list endpoint |
| FR-225 | Standard API error format | endpoint | Every PUB endpoint (`PublicErrorEnvelope`) |
| FR-226 | Revoke an API key | endpoint | KEY-03 |

## 3. Internal API (`/api/app`)

Paths in headings carry the full prefix. Modules follow the dependency order of MODULE-BOUNDARIES section 4, with system at the end.

### 3.1 Authentication

Account creation, sign-in and sign-out, password reset, Google sign-in start, and the list and revocation of the caller's own sign-ins (FR-001 to FR-005, FR-008). Paths are under `/api/app`; the session cookie is `__Host-lumora_session` ([API-SECURITY.md](API-SECURITY.md) section 1.1).

| ID | Method path | FR | Phase | Summary |
|---|---|---|---|---|
| AUTH-01 | POST /api/app/auth/sign-up | FR-001 | MVP | Create an account, set the session cookie, create the default daily goal of 120 minutes |
| AUTH-02 | POST /api/app/auth/sign-in | FR-002 | MVP | Sign in with email and password; lockout after 5 consecutive failures |
| AUTH-03 | GET /api/app/auth/google | FR-003 | MVP | Redirect to Google with state and PKCE |
| AUTH-04 | POST /api/app/auth/sign-out | FR-004 | MVP | Revoke the current sign-in only |
| AUTH-05 | POST /api/app/auth/password-reset/request | FR-005 | MVP | Request a reset email; neutral 202 for known and unknown emails |
| AUTH-06 | POST /api/app/auth/password-reset/complete | FR-005 | MVP | Set a new password with a single-use token; revokes all sign-ins |
| AUTH-07 | GET /api/app/auth/sign-ins | FR-008 | MVP | List active sign-ins with the current one marked |
| AUTH-08 | DELETE /api/app/auth/sign-ins/{signInId} | FR-008 | MVP | Revoke one other sign-in |
| AUTH-09 | POST /api/app/auth/sign-ins/revoke-others | FR-008 | MVP | Revoke every sign-in except the current one |

#### AUTH-01 POST /api/app/auth/sign-up

| Field | Specification |
|---|---|
| Purpose | A guest creates an account with email and password. The account is created, the user is signed in (session cookie set) and a default daily goal of 120 minutes is created. |
| Phase / FR | MVP / FR-001 (AC-FR-001-1 to AC-FR-001-3), NFR-010, NFR-011, NFR-035 |
| Authentication | G |
| Authorization | none (no caller identity yet) |
| Request parameters | Path: none. Query: none. Headers: `Content-Type: application/json`; `Origin` (checked as login-CSRF defence, API-SECURITY section 7). No `Idempotency-Key`, no `If-Match`. |
| Request body | `SignUpInput` |
| Response | 201 `Profile`; `Location: /api/app/profile`; `ETag: "<version>"`; `Set-Cookie` for `__Host-lumora_session` (HttpOnly, Secure, SameSite=Lax, Path=/). A new session identifier is issued (no fixation). |
| Validation rules | `email` valid format, unique case-insensitively (DICT `users.email`). `password` at least 10 characters (AC-FR-001-2: 9 characters is rejected and no account exists). `ageConfirmed` must be `true` (AC-FR-001-3, NFR-035); the confirmation time is stored in `age_confirmed_at`. `timezone` must be in the runtime IANA zone list and becomes the baseline zone (EC-006). The password is stored only as a salted adaptive hash (NFR-011). Unknown fields are rejected. |
| Error responses | `password_too_short` (400): under 10 characters, `details.minLength` 10.<br>`age_confirmation_required` (400): `ageConfirmed` is `false`.<br>`invalid_timezone` (400): zone not in the IANA list (EC-006).<br>`duplicate_email` (409): email already registered; generic message "We could not create an account with these details" (FR-001, reconciliation 5).<br>`database_unavailable` (503): rate limiter unavailable, fails closed.<br>plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-SIGNUP |
| Pagination | none |
| Idempotency / concurrency | `Idempotency-Key` not used: a guest call has no user scope; a retry after success returns `duplicate_email`. `If-Match` not applicable (creates the profile at `version` 1). |

#### AUTH-02 POST /api/app/auth/sign-in

| Field | Specification |
|---|---|
| Purpose | A guest signs in with email and password and receives a session cookie. After 5 consecutive failures on one account the account is locked for 15 minutes. |
| Phase / FR | MVP / FR-002 (AC-FR-002-1 to AC-FR-002-4), NFR-012, NFR-013 |
| Authentication | G |
| Authorization | none |
| Request parameters | Path: none. Query: none. Headers: `Content-Type: application/json`; `Origin` (login-CSRF defence). No `Idempotency-Key`, no `If-Match`. |
| Request body | `SignInInput` |
| Response | 200 `Profile`; `ETag: "<version>"`; `Set-Cookie` for `__Host-lumora_session` (new session identifier). The 30 day sliding expiry starts. |
| Validation rules | `email` and `password` required strings. The lock is checked before the password is verified, so a correct password is refused while locked (AC-FR-002-2). The failure count is per account and resets on success (NFR-012). An unknown email, a wrong password and an account with `deletion_requested_at` set all return the same `invalid_credentials` with the same message (AC-FR-002-4, API-SECURITY section 1.1). Audit events `sign_in`, `sign_in_failed`, `lockout` ([API-SECURITY.md](API-SECURITY.md) section 8). |
| Error responses | `invalid_credentials` (401): wrong email or password, or account pending deletion; generic message.<br>`account_locked` (401): account locked; `details.lockedUntil` (instant) and header `Retry-After` (seconds until the lock ends); not 429.<br>`database_unavailable` (503): rate limiter unavailable, fails closed.<br>plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-SIGNIN (plus the per-account lockout, which is independent of the limiter) |
| Pagination | none |
| Idempotency / concurrency | `Idempotency-Key` not used: sign-in creates a session, not a user resource; every successful call opens a new sign-in. `If-Match` not applicable. |

#### AUTH-03 GET /api/app/auth/google

| Field | Specification |
|---|---|
| Purpose | Start Google sign-in: redirect the browser to Google with state and PKCE. The session is created later by the library-owned callback after state and PKCE verification; this endpoint changes no application data. |
| Phase / FR | MVP / FR-003 (AC-FR-003-1 to AC-FR-003-3), NFR-010, NFR-035 |
| Authentication | G |
| Authorization | none |
| Request parameters | Query: `next` (optional string; a same-origin relative path starting with a single `/`, used as the post-sign-in landing; any other value is ignored and the dashboard is used), `ageConfirmed` (optional bool, default `false`), `timezone` (optional IANA name from the browser, default is the zone detected at the callback). Headers: none required (a GET is not subject to the origin check). |
| Request body | none |
| Response | 302 with `Location` set to the Google authorization URL (scopes `openid email profile`). `ageConfirmed` and `timezone` travel in the signed state. The callback path `/api/auth/callback/google` is library-owned and unverified until the Phase 7 spike (ADR-004, API-SECURITY section 1.1); it is not part of this contract. |
| Validation rules | `ageConfirmed` is required to be `true` only when the callback finds no account for the verified Google email (FR-003 expected behavior, NFR-035); an existing account signs in regardless. Only a verified Google email is accepted (FR-003). On cancel, provider failure, unverified email or missing age confirmation for a new account, the callback creates no account and redirects to the sign-in page with a notice (AC-FR-003-3); these redirect outcomes are not JSON errors. `timezone` is validated against the IANA list. |
| Error responses | `invalid_timezone` (400): `timezone` query value not in the IANA list.<br>`database_unavailable` (503): rate limiter unavailable, fails closed.<br>plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-SIGNIN |
| Pagination | none |
| Idempotency / concurrency | read only (redirect; no `Idempotency-Key`, no `If-Match`). |

#### AUTH-04 POST /api/app/auth/sign-out

| Field | Specification |
|---|---|
| Purpose | A signed-in user ends the current sign-in. Other sign-ins stay active. A running timer is not stopped. |
| Phase / FR | MVP / FR-004 (AC-FR-004-1 to AC-FR-004-3), NFR-013 |
| Authentication | S |
| Authorization | owner (the session in the cookie) |
| Request parameters | Path: none. Query: none. Headers: `Origin`. No `Idempotency-Key`, no `If-Match`. |
| Request body | none |
| Response | 204; `Set-Cookie` expires `__Host-lumora_session`. |
| Validation rules | Revokes the current session server-side so it cannot be reused (FR-004). Other sessions are untouched (AC-FR-004-3). The timer run stays running and visible from other sign-ins (FR-004 expected behavior). Audit event `session_revoked`. |
| Error responses | plus common set (API-ENDPOINTS section 1); a repeated call after success returns `unauthenticated`. |
| Rate limit | RL-WRITE |
| Pagination | none |
| Idempotency / concurrency | none (idempotent set; the session is not a versioned resource, so no `If-Match`; no `Idempotency-Key`). |

#### AUTH-05 POST /api/app/auth/password-reset/request

| Field | Specification |
|---|---|
| Purpose | A guest requests a password reset link by email. The response is the same whether or not an account exists. |
| Phase / FR | MVP / FR-005 (AC-FR-005-1), NFR-011, NFR-012, NFR-020 |
| Authentication | G |
| Authorization | none |
| Request parameters | Path: none. Query: none. Headers: `Content-Type: application/json`; `Origin`. No `Idempotency-Key`, no `If-Match`. |
| Request body | `PasswordResetRequestInput` |
| Response | 202 with the neutral body `{}`, byte-identical for known and unknown emails (AC-FR-005-1). The email is sent by a background job; the request never waits for delivery, so response timing does not reveal account existence. |
| Validation rules | `email` required, valid format. For a known account (including a Google-only account, which can set a first password, FR-005) a single-use token valid 60 minutes is stored hashed and a reset-email job is enqueued; for an unknown email nothing is stored. The limiter keys on the client IP and on the SHA-256 of the lower-cased email, so no plain email is stored in the limiter. |
| Error responses | `database_unavailable` (503): rate limiter unavailable, fails closed.<br>plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-RESET |
| Pagination | none |
| Idempotency / concurrency | `Idempotency-Key` not used: the neutral 202 is already identical on repeat. `If-Match` not applicable. |

#### AUTH-06 POST /api/app/auth/password-reset/complete

| Field | Specification |
|---|---|
| Purpose | A guest sets a new password with the emailed single-use token. All existing sign-ins are revoked and any lockout is cleared. |
| Phase / FR | MVP / FR-005 (AC-FR-005-2, AC-FR-005-3), NFR-011, NFR-012, NFR-020 |
| Authentication | G |
| Authorization | none (the token identifies the account) |
| Request parameters | Path: none. Query: none. Headers: `Content-Type: application/json`; `Origin`. No `Idempotency-Key`, no `If-Match`. |
| Request body | `PasswordResetCompleteInput` |
| Response | 204. No session is created and no token is returned; the user signs in again with AUTH-02. |
| Validation rules | `token` must be known, unused and under 60 minutes old (DICT `auth_verifications.expires_at`, `consumed_at`); it is consumed in the same transaction as the password change, so a second use fails. `newPassword` at least 10 characters (FR-001 rule). On success: the password hash is replaced, every session of the account is revoked (AC-FR-005-2), `failed_sign_in_count` and `locked_until` are cleared. Audit events `password_reset` and `session_revoked` (one per revoked session). A token that is not valid does not change the password (AC-FR-005-3). |
| Error responses | `reset_token_invalid` (401): token unknown, expired or already used.<br>`password_too_short` (400): `newPassword` under 10 characters, `details.minLength` 10.<br>`database_unavailable` (503): rate limiter unavailable, fails closed.<br>plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-RESET |
| Pagination | none |
| Idempotency / concurrency | none (single-use token enforces at-most-once; a repeat returns `reset_token_invalid`; no `Idempotency-Key`, no `If-Match`). |

#### AUTH-07 GET /api/app/auth/sign-ins

| Field | Specification |
|---|---|
| Purpose | List the caller's active sign-ins with a device description, approximate last-active time and a marker for the current one. |
| Phase / FR | MVP / FR-008 (AC-FR-008-1) |
| Authentication | S |
| Authorization | owner (cross-user = 404; the list only ever contains the caller's own sessions) |
| Request parameters | Path: none. Query: none. Headers: none. |
| Request body | none |
| Response | 200 `{ "data": SignInSession[] }`. Revoked and expired sessions are not listed (NFR-013). IP, token hash and expiry are never returned. |
| Validation rules | `current` is true for exactly the session that made the request. `device` is parsed from the stored user agent (maximum 512 characters stored). Ordered by `lastActiveAt` descending, then `id`. |
| Error responses | plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-READ |
| Pagination | not paginated (bounded by active sessions per user) |
| Idempotency / concurrency | read only |

#### AUTH-08 DELETE /api/app/auth/sign-ins/{signInId}

| Field | Specification |
|---|---|
| Purpose | Revoke one other sign-in so that it is rejected on its next request. |
| Phase / FR | MVP / FR-008 (AC-FR-008-2) |
| Authentication | S |
| Authorization | owner (another user's sign-in = 404) |
| Request parameters | Path: `signInId` (`Id` of the session; a malformed value gives `not_found`). Query: none. Headers: `Origin`. No `Idempotency-Key`, no `If-Match`. |
| Request body | none |
| Response | 204 |
| Validation rules | The target must belong to the caller and still be active. The current session cannot be revoked here: `validation_failed` with `details.fields` naming `signInId`; the client offers AUTH-04 instead (FR-008 errors and edge cases). A session that is already revoked or expired is `not_found`, and the client refreshes the list (FR-008). Revocation is immediate (NFR-013). Audit event `session_revoked`. |
| Error responses | `not_found` (404): unknown, foreign, already revoked or expired sign-in.<br>plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-WRITE |
| Pagination | none |
| Idempotency / concurrency | none (sessions are not versioned, so no `If-Match`; no `Idempotency-Key`; a repeat returns `not_found`). |

#### AUTH-09 POST /api/app/auth/sign-ins/revoke-others

| Field | Specification |
|---|---|
| Purpose | Revoke every sign-in of the caller except the current one. |
| Phase / FR | MVP / FR-008 (AC-FR-008-3) |
| Authentication | S |
| Authorization | owner |
| Request parameters | Path: none. Query: none. Headers: `Origin`. No `Idempotency-Key`, no `If-Match`. |
| Request body | none |
| Response | 200 `RevokeOthersResult` (`{ "revoked": n }`, `n` may be 0). |
| Validation rules | Only the current session stays active (AC-FR-008-3). Revocation is immediate. One audit event `session_revoked` per revoked session. |
| Error responses | plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-WRITE |
| Pagination | none |
| Idempotency / concurrency | none (idempotent set; a repeat returns `revoked` 0; no `Idempotency-Key`, no `If-Match`). |

### 3.2 User profile

Profile settings, onboarding state, account deletion with a 30 day purge, and data export (FR-006, FR-007, FR-009, FR-130 to FR-132, FR-134 to FR-138). Account deletion (PROF-04) and the export endpoints are listed here because the User profile module owns them ([MODULE-BOUNDARIES.md](../03-architecture/MODULE-BOUNDARIES.md) section 2).

| ID | Method path | FR | Phase | Summary |
|---|---|---|---|---|
| PROF-01 | GET /api/app/profile | FR-006, FR-009, FR-137, FR-138 | MVP | Read the profile, preferences and onboarding state |
| PROF-02 | PATCH /api/app/profile | FR-006, FR-009, FR-137, FR-138 | MVP | Change display name, timezone, rollover hour, theme, primary goal |
| PROF-03 | PATCH /api/app/profile/onboarding | FR-134, FR-135, FR-136, FR-137 | MVP | Record an onboarding step, complete, dismiss or reopen the wizard |
| PROF-04 | POST /api/app/account/deletion | FR-007 | MVP | Request account deletion with re-authentication; 30 day purge |
| PROF-05 | POST /api/app/exports | FR-130, FR-131, FR-132 | MVP | Request a CSV or JSON export; 202 with a status resource |
| PROF-06 | GET /api/app/exports | FR-132 | MVP | List the last 5 exports |
| PROF-07 | GET /api/app/exports/{exportId} | FR-132 | MVP | Read export status and progress |
| PROF-08 | GET /api/app/exports/{exportId}/download | FR-130, FR-131 | MVP | Stream the finished export file |

#### PROF-01 GET /api/app/profile

| Field | Specification |
|---|---|
| Purpose | Return the caller's profile, preferences and onboarding state. |
| Phase / FR | MVP / FR-006, FR-009, FR-137, FR-138 |
| Authentication | S |
| Authorization | owner |
| Request parameters | Path: none. Query: none. Headers: none. |
| Request body | none |
| Response | 200 `Profile`; `ETag: "<version>"`. |
| Validation rules | Defaults when never changed: `rolloverHour` 0 (AC-FR-009-1), `theme` `system` (AC-FR-138-1), `primaryGoal` `null`. `email` is read-only. `hasPassword` and `googleLinked` drive the account-deletion re-authentication choice (PROF-04). |
| Error responses | plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-READ |
| Pagination | none |
| Idempotency / concurrency | read only (returns `ETag` for the next PROF-02 `If-Match`). |

#### PROF-02 PATCH /api/app/profile

| Field | Specification |
|---|---|
| Purpose | Change display name, timezone, day rollover hour, theme or primary goal. Changes apply from the change onward; past records are never recomputed. |
| Phase / FR | MVP / FR-006 (AC-FR-006-1 to AC-FR-006-4), FR-009 (AC-FR-009-3, AC-FR-009-4), FR-137, FR-138, NFR-094 |
| Authentication | S |
| Authorization | owner |
| Request parameters | Path: none. Query: none. Headers: `If-Match: "<version>"` (required); `Origin`. No `Idempotency-Key`. |
| Request body | `UpdateProfileInput` |
| Response | 200 `Profile`; `ETag: "<new version>"`. |
| Validation rules | At least one field. `displayName` 1..50 characters after trim (AC-FR-006-2: 51 characters is rejected and the old name kept). `timezone` must be in the runtime IANA zone list (EC-006). `rolloverHour` integer 0..23 (AC-FR-009-3: 24, -1 or a non-integer is rejected and the old value kept). `theme` is `light`, `dark` or `system`. `primaryGoal` is `exam_prep`, `coursework`, `self_learning` or `null`. `email` and onboarding fields are not accepted here. A timezone or rollover change does not rewrite past local dates and does not reduce a streak (EC-006, AC-FR-006-3, AC-FR-006-4, AC-FR-009-4). |
| Error responses | `invalid_timezone` (400): zone not in the IANA list.<br>`version_required` (400): `If-Match` missing.<br>`stale_version` (409): `If-Match` differs from the stored version; `details.current` is the current `Profile` (EC-020).<br>plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-WRITE |
| Pagination | none |
| Idempotency / concurrency | `If-Match: "<version>"` required; `Idempotency-Key` not used (a PATCH to the same values is naturally repeatable). |

#### PROF-03 PATCH /api/app/profile/onboarding

| Field | Specification |
|---|---|
| Purpose | Record onboarding progress: complete one wizard step, complete the wizard, dismiss it, or reopen it from settings. Each choice is written at once so leaving mid-way keeps completed steps. |
| Phase / FR | MVP / FR-134 (AC-FR-134-1 to AC-FR-134-4), FR-135 (AC-FR-135-1 to AC-FR-135-3), FR-136, FR-137 |
| Authentication | S |
| Authorization | owner |
| Request parameters | Path: none. Query: none. Headers: `Origin`. No `If-Match` (deliberate exception to CONVENTIONS section 6: every action is an idempotent set of onboarding keys and the wizard must not fail on a version race with the settings form). No `Idempotency-Key`. |
| Request body | `UpdateOnboardingInput` |
| Response | 200 `OnboardingState`. |
| Validation rules | `action` is `complete_step`, `complete`, `dismiss` or `reopen`. `complete_step` requires `step` to be one of `primary_goal`, `first_subject`, `daily_goal_timezone`, `first_session` (reconciliation 11); any other key, or `step` sent with another action, gives `validation_failed`. Repeating a step keeps its first completion instant. Skipping a step sends nothing and saves nothing (AC-FR-135-1). `dismiss` sets `dismissedAt` and leaves defaults in place: goal 120 minutes, detected timezone (AC-FR-135-2). `reopen` clears `completedAt` and `dismissedAt` (AC-FR-135-3). The values chosen in a step are saved through their own endpoints: `primaryGoal` through PROF-02, the subject through SUBJ-02, the goal and zone through GOAL-02 and PROF-02 (FR-134, EC-006). The write increments the profile `version`, so a settings form open in another tab gets `stale_version` on its next save and reloads. |
| Error responses | plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-WRITE |
| Pagination | none |
| Idempotency / concurrency | none (idempotent set; no `If-Match`, no `Idempotency-Key`). |

#### PROF-04 POST /api/app/account/deletion

| Field | Specification |
|---|---|
| Purpose | Request permanent deletion of the account. Access is blocked at once; personal data is purged by a background job within 30 days (backups within 35 days). |
| Phase / FR | MVP / FR-007 (AC-FR-007-1 to AC-FR-007-4), EC-019, BR-032, NFR-031, NFR-104 |
| Authentication | S |
| Authorization | owner |
| Request parameters | Path: none. Query: none. Headers: `Content-Type: application/json`; `Origin`. No `Idempotency-Key`, no `If-Match`. |
| Request body | `DeleteAccountInput` |
| Response | 202 `{ "requestedAt": Instant }` (see `DeleteAccountInput` in API-SCHEMAS section 3); `Set-Cookie` expires `__Host-lumora_session`. |
| Validation rules | Exactly one of `password` (accounts with a credential link, `Profile.hasPassword` true) or `reauthToken` (Google-only accounts); both or neither gives `validation_failed`. `confirmation` must equal the typed word `DELETE` shown by the settings Danger area ([PAGE-SPECIFICATIONS.md](../05-ui-ux/PAGE-SPECIFICATIONS.md) settings page); a different value gives `validation_failed` and nothing is deleted. A wrong password or an invalid Google proof gives `invalid_credentials` and nothing changes (AC-FR-007-3). On success, in one transaction: `deletion_requested_at` is set, all sessions and API keys are revoked, a running timer is discarded and no session is saved (AC-FR-007-4), group memberships are removed (EC-018, EC-019), a purge event is written to the outbox and a row is added to `account_deletion_log`. Sign-in is refused afterwards (AC-FR-007-1, AUTH-02). The user may export first (PROF-05). Audit: `session_revoked` per session; `account_deleted` when the purge completes. |
| Error responses | `invalid_credentials` (401): wrong password or Google proof does not match.<br>plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-DELETE |
| Pagination | none |
| Idempotency / concurrency | none (all sessions are revoked, so a repeat returns `unauthenticated`; the outbox purge event is deduplicated per user; no `Idempotency-Key`, no `If-Match`). |

#### PROF-05 POST /api/app/exports

| Field | Specification |
|---|---|
| Purpose | Request an export of the caller's own data as CSV or JSON. The work runs in the background and the response is a status resource to poll. |
| Phase / FR | MVP / FR-130 (AC-FR-130-1 to AC-FR-130-4), FR-131, FR-132 (AC-FR-132-2), EC-027, BR-032, NFR-005 |
| Authentication | S |
| Authorization | owner |
| Request parameters | Path: none. Query: none. Headers: `Idempotency-Key` (required); `Content-Type: application/json`; `Origin`. No `If-Match`. |
| Request body | `CreateDataExportInput` |
| Response | 202 `DataExport` with `status` `running` and `progressPercent` 0; `Location: /api/app/exports/{exportId}`; `Idempotent-Replay: true` on a replay. |
| Validation rules | `format` is `csv` or `json`. The export is a point-in-time snapshot taken at request time; later changes are not included (EC-027, `snapshotAt`). It contains only the caller's data: subjects, topics, sessions, plan entries, to-dos, notes and exams (FR-130, FR-131). Business quota, not a request rate: at most 1 running export and 5 per profile day, counted from `data_exports` rows (CONVENTIONS section 10). A replay of a stored 2xx is served before the quota check. Audit: log event `export_requested` (CR-1). |
| Error responses | `export_limit_reached` (429): an export is already running or 5 were requested today; `details` has `running`, `limit`, `used` (AC-FR-132-2).<br>`idempotency_key_required` (400): header missing.<br>`idempotency_key_reused` (409): same key, different request.<br>`request_in_progress` (409): same key still executing, `Retry-After: 1`.<br>plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-HEAVY |
| Pagination | none |
| Idempotency / concurrency | `Idempotency-Key` required (scope `export.create`, 7 day retention); `If-Match` not applicable (exports are not versioned). The partial unique index `UNIQUE (user_id) WHERE status = 'running'` enforces one running export. |

#### PROF-06 GET /api/app/exports

| Field | Specification |
|---|---|
| Purpose | List the caller's most recent exports so the settings page can show progress, failure and download links. |
| Phase / FR | MVP / FR-132 (AC-FR-132-1) |
| Authentication | S |
| Authorization | owner |
| Request parameters | Path: none. Query: none. Headers: none. |
| Request body | none |
| Response | 200 `{ "data": DataExport[] }` with at most the last 5 exports. |
| Validation rules | Ordered by `createdAt` descending, then `id` descending. `file_key` is never returned. Clients must read `expiresAt` and must not assume 24 hours (reconciliation 4). |
| Error responses | plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-READ |
| Pagination | not paginated (bounded: last 5) |
| Idempotency / concurrency | read only |

#### PROF-07 GET /api/app/exports/{exportId}

| Field | Specification |
|---|---|
| Purpose | Read the status of one export; the client polls while `status` is `running` and announces completion to assistive technology (FR-132). |
| Phase / FR | MVP / FR-132 (AC-FR-132-1, AC-FR-132-3) |
| Authentication | S |
| Authorization | owner (another user's export = 404) |
| Request parameters | Path: `exportId` (`Id`; malformed gives `not_found`). Query: none. Headers: none. |
| Request body | none |
| Response | 200 `DataExport` (`status`, `progressPercent`, `snapshotAt`, `fileBytes`, `expiresAt`, `errorCode`, `completedAt`). |
| Validation rules | A `failed` export carries `errorCode` and offers no file; a retry is a new PROF-05 request (AC-FR-132-3). |
| Error responses | `not_found` (404): unknown or foreign export.<br>plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-READ |
| Pagination | none |
| Idempotency / concurrency | read only |

#### PROF-08 GET /api/app/exports/{exportId}/download

| Field | Specification |
|---|---|
| Purpose | Stream the finished export file to its owner. The file is never exposed through a public or pre-signed URL. |
| Phase / FR | MVP / FR-130 (AC-FR-130-4), FR-131, FR-132 (AC-FR-132-4), NFR-032 |
| Authentication | S |
| Authorization | owner (ownership and expiry checked on every request; foreign = 404) |
| Request parameters | Path: `exportId` (`Id`; malformed gives `not_found`). Query: none. Headers: none. |
| Request body | none |
| Response | 200 file stream with `Content-Disposition: attachment`, `X-Content-Type-Options: nosniff`, `Cache-Control: no-store`. `json` exports are one JSON file (`application/json`); `csv` exports are one download holding the 7 CSV files, one per data type (AC-FR-130-1), packaged as a ZIP archive (`application/zip`). The ZIP packaging is a proposal: no source document names the container. |
| Validation rules | Available only when `status` is `completed` and `expiresAt` has not passed; the file stays available at least 24 hours after completion (AC-FR-132-4). CSV cells beginning with `=`, `+`, `-` or `@` are prefixed with `'` (FR-130, API-SECURITY section 5). A `failed` export has no file and gives `not_found`. |
| Error responses | `export_not_ready` (409): `status` is `running`; `details.status` `running`.<br>`not_found` (404): unknown, foreign, failed or expired export.<br>`storage_unavailable` (503): file store unreachable.<br>plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-READ |
| Pagination | none |
| Idempotency / concurrency | read only |

### 3.3 Subjects

Subject lifecycle: list, create, read, rename and recolor, reorder, archive and restore (FR-010 to FR-014). Archiving is a soft delete that keeps history (BR-029, NFR-093).

| ID | Method path | FR | Phase | Summary |
|---|---|---|---|---|
| SUBJ-01 | GET /api/app/subjects | FR-010 | MVP | List subjects in order; archived ones on request |
| SUBJ-02 | POST /api/app/subjects | FR-010 | MVP | Create a subject, placed last |
| SUBJ-03 | GET /api/app/subjects/{subjectId} | FR-010 | MVP | Read one subject |
| SUBJ-04 | PATCH /api/app/subjects/{subjectId} | FR-011 | MVP | Rename or recolor a subject |
| SUBJ-05 | PUT /api/app/subjects/order | FR-012 | MVP | Save the order of all active subjects |
| SUBJ-06 | POST /api/app/subjects/{subjectId}/archive | FR-013 | MVP | Archive a subject (soft delete) |
| SUBJ-07 | POST /api/app/subjects/{subjectId}/restore | FR-014 | MVP | Restore an archived subject, placed last |

#### SUBJ-01 GET /api/app/subjects

| Field | Specification |
|---|---|
| Purpose | List the caller's subjects in their saved order, for pickers, lists and the archived view. |
| Phase / FR | MVP / FR-010 |
| Authentication | S |
| Authorization | owner |
| Request parameters | Path: none. Query: `includeArchived` (bool, default `false`). Headers: none. |
| Request body | none (query is `SubjectListQuery`) |
| Response | 200 `{ "data": Subject[] }` |
| Validation rules | Ordered by `position`, then `id`. Without `includeArchived` only active subjects are returned (AC-FR-013-3: archived subjects are absent from pickers). With `includeArchived=true`, archived subjects follow the active ones with `archivedAt` set. A non-boolean `includeArchived` gives `validation_failed`. |
| Error responses | plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-READ |
| Pagination | not paginated (bounded: a user's subjects) |
| Idempotency / concurrency | read only |

#### SUBJ-02 POST /api/app/subjects

| Field | Specification |
|---|---|
| Purpose | Create a subject with a name and a colour from the fixed palette. It is placed last in the order. |
| Phase / FR | MVP / FR-010 (AC-FR-010-1 to AC-FR-010-4), BR-029, NFR-016 |
| Authentication | S |
| Authorization | owner (the subject is created for the caller only) |
| Request parameters | Path: none. Query: none. Headers: `Idempotency-Key` (required); `Content-Type: application/json`; `Origin`. No `If-Match`. |
| Request body | `CreateSubjectInput` |
| Response | 201 `Subject` (`version` 1); `Location: /api/app/subjects/{subjectId}`; `ETag: "1"`; `Idempotent-Replay: true` on a replay. |
| Validation rules | `name` 1..100 characters after trim (AC-FR-010-2: 101 characters or empty is rejected). The name must be unique among the caller's active subjects, compared case-insensitively on the trimmed name (AC-FR-010-3: "math" clashes with "Math"); a subject archived under that name does not clash (AC-FR-010-4). `color` must be a palette key from configuration, else `validation_failed`. `position` is assigned by the server, last among active subjects (FR-012). |
| Error responses | `name_conflict` (409): an active subject has the same name; `details.field` `name`, `details.conflictingId`.<br>`idempotency_key_required` (400): header missing.<br>`idempotency_key_reused` (409): same key, different request.<br>`request_in_progress` (409): same key still executing, `Retry-After: 1`.<br>plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-WRITE |
| Pagination | none |
| Idempotency / concurrency | `Idempotency-Key` required (scope `subject.create`, 7 day retention); `If-Match` not applicable to a create. |

#### SUBJ-03 GET /api/app/subjects/{subjectId}

| Field | Specification |
|---|---|
| Purpose | Read one subject, active or archived. |
| Phase / FR | MVP / FR-010 |
| Authentication | S |
| Authorization | owner (cross-user = 404) |
| Request parameters | Path: `subjectId` (`Id`; malformed gives `not_found`). Query: none. Headers: none. |
| Request body | none |
| Response | 200 `Subject`; `ETag: "<version>"`. |
| Validation rules | Archived subjects are readable so history and restore flows can show them (FR-014). |
| Error responses | `not_found` (404): unknown, foreign or malformed ID.<br>plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-READ |
| Pagination | none |
| Idempotency / concurrency | read only (returns `ETag` for the next write). |

#### SUBJ-04 PATCH /api/app/subjects/{subjectId}

| Field | Specification |
|---|---|
| Purpose | Rename a subject or change its colour. History is linked by identity, so past sessions and statistics show the new name (AC-FR-011-1). |
| Phase / FR | MVP / FR-011 (AC-FR-011-1 to AC-FR-011-3), NFR-094, EC-020 |
| Authentication | S |
| Authorization | owner (cross-user = 404) |
| Request parameters | Path: `subjectId` (`Id`; malformed gives `not_found`). Query: none. Headers: `If-Match: "<version>"` (required); `Origin`. No `Idempotency-Key`. |
| Request body | `UpdateSubjectInput` |
| Response | 200 `Subject`; `ETag: "<new version>"`. |
| Validation rules | At least one of `name`, `color`. Same constraints as SUBJ-02: `name` 1..100 after trim, unique among active subjects case-insensitively (the subject itself is excluded, so a case-only change is allowed), `color` a palette key (AC-FR-011-2). Position and archive state cannot be changed here (SUBJ-05 to SUBJ-07). On an archived subject only `name` may change: this is the rename step of the restore conflict flow (SUBJ-07, AC-FR-014-3); no uniqueness check applies because the unique index covers active names only (DICT `subjects`). A `color` change on an archived subject gives `subject_archived`. |
| Error responses | `name_conflict` (409): the new name clashes with another active subject.<br>`subject_archived` (409): `color` change on an archived subject (BR-029).<br>`version_required` (400): `If-Match` missing.<br>`stale_version` (409): `If-Match` differs from the stored version; `details.current` is the current `Subject` (AC-FR-011-3).<br>plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-WRITE |
| Pagination | none |
| Idempotency / concurrency | `If-Match: "<version>"` required; `Idempotency-Key` not used. |

#### SUBJ-05 PUT /api/app/subjects/order

| Field | Specification |
|---|---|
| Purpose | Save the display order of all active subjects (drag handles or up and down controls). The order is used in every picker and list. |
| Phase / FR | MVP / FR-012 (AC-FR-012-1 to AC-FR-012-3), NFR-094 |
| Authentication | S |
| Authorization | owner |
| Request parameters | Path: none. Query: none. Headers: `Content-Type: application/json`; `Origin`. No `If-Match`, no `Idempotency-Key`. |
| Request body | `SubjectOrderInput` |
| Response | 200 `{ "data": Subject[] }` in the new order, with contiguous `position` values starting at 0. |
| Validation rules | `subjectIds` must contain exactly all of the caller's active subject IDs, each once, in the new order. A missing, extra, duplicate, foreign or archived ID gives `validation_failed` with `details.fields` naming `subjectIds` (AC-FR-012-3: archived subjects are not part of the ordering). If another device added or archived a subject meanwhile, the set no longer matches and the client reloads SUBJ-01 and retries. The write is atomic: on failure the previous order stays (FR-012 errors). |
| Error responses | plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-WRITE |
| Pagination | none |
| Idempotency / concurrency | none (idempotent set: repeating the same list gives the same state; the full-set check replaces `If-Match`; no `Idempotency-Key`). |

#### SUBJ-06 POST /api/app/subjects/{subjectId}/archive

| Field | Specification |
|---|---|
| Purpose | Archive a subject (soft delete). History and statistics stay and show "<name> (archived)". |
| Phase / FR | MVP / FR-013 (AC-FR-013-1 to AC-FR-013-3), EC-007, BR-029, NFR-093 |
| Authentication | S |
| Authorization | owner (cross-user = 404) |
| Request parameters | Path: `subjectId` (`Id`; malformed gives `not_found`). Query: none. Headers: `If-Match: "<version>"` (required); `Origin`. No `Idempotency-Key`. |
| Request body | none |
| Response | 200 `Subject` with `archivedAt` set; `ETag: "<new version>"`. |
| Validation rules | Blocked while a timer run exists on the subject (AC-FR-013-2, EC-007); the client asks the user to stop the timer first. The subject, its topics, open plan entries and to-dos are hidden from pickers and kept for restore; no history is deleted (FR-013, EC-007). Archiving an already archived subject with a matching version returns 200 unchanged. The confirmation dialog is a client concern. |
| Error responses | `subject_has_running_session` (409): a timer run is on this subject; `details.timerRunId`.<br>`version_required` (400): `If-Match` missing.<br>`stale_version` (409): `If-Match` differs from the stored version; `details.current` is the current `Subject`.<br>plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-WRITE |
| Pagination | none |
| Idempotency / concurrency | `If-Match: "<version>"` required; `Idempotency-Key` not used (state transition, not a create). |

#### SUBJ-07 POST /api/app/subjects/{subjectId}/restore

| Field | Specification |
|---|---|
| Purpose | Restore an archived subject. It appears last among active subjects and its topics, open plan entries and to-dos reappear. |
| Phase / FR | MVP / FR-014 (AC-FR-014-1 to AC-FR-014-3), EC-007, BR-029 |
| Authentication | S |
| Authorization | owner (cross-user = 404) |
| Request parameters | Path: `subjectId` (`Id`; malformed gives `not_found`). Query: none. Headers: `If-Match: "<version>"` (required); `Origin`. No `Idempotency-Key`. |
| Request body | none |
| Response | 200 `Subject` with `archivedAt` `null` and `position` last; `ETag: "<new version>"`. |
| Validation rules | If an active subject already has the same name (case-insensitive, trimmed), restore fails with `name_conflict` and changes nothing (AC-FR-014-3). The client then renames the archived subject through SUBJ-04 (name only) and retries SUBJ-07. History is unchanged (FR-014). Restoring an already active subject with a matching version returns 200 unchanged. |
| Error responses | `name_conflict` (409): an active subject has the same name; `details.field` `name`, `details.conflictingId`.<br>`version_required` (400): `If-Match` missing.<br>`stale_version` (409): `If-Match` differs from the stored version; `details.current` is the current `Subject`.<br>plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-WRITE |
| Pagination | none |
| Idempotency / concurrency | `If-Match: "<version>"` required; `Idempotency-Key` not used (state transition, not a create). |

### 3.4 Topics

Topic lifecycle inside a subject: list, create, bulk paste with preview, edit and status, reorder, archive and restore (FR-015 to FR-019). Topics are independent of recorded time: status is manual and never changes automatically (FR-019).

| ID | Method path | FR | Phase | Summary |
|---|---|---|---|---|
| TOP-01 | GET /api/app/subjects/{subjectId}/topics | FR-015 | MVP | List the topics of a subject in order |
| TOP-02 | POST /api/app/subjects/{subjectId}/topics | FR-015 | MVP | Add one topic, weight default 1 |
| TOP-03 | POST /api/app/subjects/{subjectId}/topics/bulk | FR-017 | MVP | Preview or save a pasted topic list |
| TOP-04 | GET /api/app/topics/{topicId} | FR-015 | MVP | Read one topic |
| TOP-05 | PATCH /api/app/topics/{topicId} | FR-016, FR-019 | MVP | Rename, change weight or status |
| TOP-06 | PUT /api/app/subjects/{subjectId}/topics/order | FR-016 | MVP | Save the order of a subject's active topics |
| TOP-07 | POST /api/app/topics/{topicId}/archive | FR-018 | MVP | Archive a topic (soft delete) |
| TOP-08 | POST /api/app/topics/{topicId}/restore | FR-018 | MVP | Restore an archived topic |

#### TOP-01 GET /api/app/subjects/{subjectId}/topics

| Field | Specification |
|---|---|
| Purpose | List the topics of one subject in their saved order, for the subject page, pickers and the exam checklist editor. |
| Phase / FR | MVP / FR-015 |
| Authentication | S |
| Authorization | owner (a subject of another user = 404) |
| Request parameters | Path: `subjectId` (`Id`; malformed gives `not_found`). Query: `includeArchived` (bool, default `false`). Headers: none. |
| Request body | none (query is `TopicListQuery`) |
| Response | 200 `{ "data": Topic[] }` |
| Validation rules | Ordered by `position`, then `id`. Without `includeArchived` only active topics are returned (AC-FR-018-2: archived topics are absent from pickers); with it, archived topics follow the active ones and the subject page can offer restore. The list is readable for an archived subject (read only). |
| Error responses | `not_found` (404): unknown or foreign subject.<br>plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-READ |
| Pagination | not paginated (bounded: topics of one subject) |
| Idempotency / concurrency | read only |

#### TOP-02 POST /api/app/subjects/{subjectId}/topics

| Field | Specification |
|---|---|
| Purpose | Add a topic to an active subject with an optional weight. It is placed last in the subject's order. |
| Phase / FR | MVP / FR-015 (AC-FR-015-1 to AC-FR-015-3), BR-024, BR-029, NFR-016 |
| Authentication | S |
| Authorization | owner (a subject of another user = 404) |
| Request parameters | Path: `subjectId` (`Id`; malformed gives `not_found`). Query: none. Headers: `Idempotency-Key` (required); `Content-Type: application/json`; `Origin`. No `If-Match`. |
| Request body | `CreateTopicInput` |
| Response | 201 `Topic` (`version` 1); `Location: /api/app/topics/{topicId}`; `ETag: "1"`; `Idempotent-Replay: true` on a replay. |
| Validation rules | `name` 1..150 characters after trim (AC-FR-015-3: 151 characters is rejected). `weight` integer 1..5, default 1 (AC-FR-015-2: 0, 6 and 2.5 are rejected). `status` defaults to `not_started`. The subject must be active (BR-029). Topic names carry no uniqueness rule in the data model (DICT `topics`); duplicates are only flagged in the TOP-03 preview. `position` is assigned by the server. |
| Error responses | `subject_archived` (409): the subject is archived; `details.subjectId`.<br>`idempotency_key_required` (400): header missing.<br>`idempotency_key_reused` (409): same key, different request.<br>`request_in_progress` (409): same key still executing, `Retry-After: 1`.<br>plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-WRITE |
| Pagination | none |
| Idempotency / concurrency | `Idempotency-Key` required (scope `topic.create`, 7 day retention); `If-Match` not applicable to a create. |

#### TOP-03 POST /api/app/subjects/{subjectId}/topics/bulk

| Field | Specification |
|---|---|
| Purpose | Add many topics from pasted text, one per line. With `dryRun` true it returns a preview and saves nothing; with `dryRun` false it saves all lines atomically. |
| Phase / FR | MVP / FR-017 (AC-FR-017-1 to AC-FR-017-3), NFR-001 |
| Authentication | S |
| Authorization | owner (a subject of another user = 404) |
| Request parameters | Path: `subjectId` (`Id`; malformed gives `not_found`). Query: none. Headers: `Idempotency-Key` (required when `dryRun` is false or omitted, not needed when `dryRun` is true); `Content-Type: application/json`; `Origin`. No `If-Match`. |
| Request body | `BulkTopicsInput` |
| Response | `dryRun` true: 200 `BulkTopicsPreview` (`valid`, `duplicates`, `tooLong`). `dryRun` false: 201 `BulkTopicsResult` (`data`: created topics in input order); `Location: /api/app/subjects/{subjectId}/topics`; `Idempotent-Replay: true` on a replay. |
| Validation rules | The client sends the raw lines; blank lines are ignored and whitespace is trimmed. At most 200 non-blank lines: the 201st gives `input_too_large` and nothing is saved (AC-FR-017-2). Each line 1..150 characters after trim; a longer line is listed in `tooLong` in the preview and makes a save fail with `validation_failed` until it is removed or shortened (AC-FR-017-3). `duplicates` lists lines matching an existing active topic name or an earlier line, as a flag only: topic names have no uniqueness rule in the data model, so a save creates every submitted line and the client removes flagged lines first. Every created topic has weight 1 and status `not_started` (AC-FR-017-1). The save is atomic: all lines or none (FR-017). The subject must be active. |
| Error responses | `input_too_large` (400): more than 200 non-blank lines; `details.limit` 200, `details.actual`.<br>`subject_archived` (409): the subject is archived.<br>`idempotency_key_required` (400): save without header.<br>`idempotency_key_reused` (409): same key, different request.<br>`request_in_progress` (409): same key still executing, `Retry-After: 1`.<br>plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-HEAVY |
| Pagination | none |
| Idempotency / concurrency | `Idempotency-Key` required for the save (scope `topic.bulk_create`, 7 day retention); not needed for `dryRun` true (read only); `If-Match` not applicable to a create. |

#### TOP-04 GET /api/app/topics/{topicId}

| Field | Specification |
|---|---|
| Purpose | Read one topic, active or archived. |
| Phase / FR | MVP / FR-015 |
| Authentication | S |
| Authorization | owner (cross-user = 404) |
| Request parameters | Path: `topicId` (`Id`; malformed gives `not_found`). Query: none. Headers: none. |
| Request body | none |
| Response | 200 `Topic`; `ETag: "<version>"`. |
| Validation rules | Archived topics are readable (EC-008: sessions keep showing the topic as archived). |
| Error responses | `not_found` (404): unknown, foreign or malformed ID.<br>plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-READ |
| Pagination | none |
| Idempotency / concurrency | read only (returns `ETag` for the next write). |

#### TOP-05 PATCH /api/app/topics/{topicId}

| Field | Specification |
|---|---|
| Purpose | Rename a topic, change its weight, or set its status. Status is manual and never changes automatically from logged time. |
| Phase / FR | MVP / FR-016 (AC-FR-016-1, AC-FR-016-3), FR-019 (AC-FR-019-1 to AC-FR-019-3), NFR-094, EC-020 |
| Authentication | S |
| Authorization | owner (cross-user = 404) |
| Request parameters | Path: `topicId` (`Id`; malformed gives `not_found`). Query: none. Headers: `If-Match: "<version>"` (required); `Origin`. No `Idempotency-Key`. |
| Request body | `UpdateTopicInput` |
| Response | 200 `Topic`; `ETag: "<new version>"`. |
| Validation rules | At least one of `name`, `weight`, `status`. `name` 1..150 after trim; `weight` integer 1..5 (readiness uses the new weight afterwards, AC-FR-016-1); `status` is `not_started`, `in_progress` or `done`, any other value gives `validation_failed` listing the three (AC-FR-019-3). Position and archive state change only through TOP-06 to TOP-08. Sessions linked to the topic keep their link (FR-016). A change of `status` publishes TopicStatusChanged (Exams readiness, FR-122). |
| Error responses | `version_required` (400): `If-Match` missing.<br>`stale_version` (409): `If-Match` differs from the stored version; `details.current` is the current `Topic` (AC-FR-016-3).<br>plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-WRITE |
| Pagination | none |
| Idempotency / concurrency | `If-Match: "<version>"` required; `Idempotency-Key` not used. |

#### TOP-06 PUT /api/app/subjects/{subjectId}/topics/order

| Field | Specification |
|---|---|
| Purpose | Save the order of the active topics of one subject. |
| Phase / FR | MVP / FR-016 (AC-FR-016-2), NFR-041, NFR-042, NFR-094 |
| Authentication | S |
| Authorization | owner (a subject of another user = 404) |
| Request parameters | Path: `subjectId` (`Id`; malformed gives `not_found`). Query: none. Headers: `Content-Type: application/json`; `Origin`. No `If-Match`, no `Idempotency-Key`. |
| Request body | `TopicOrderInput` |
| Response | 200 `{ "data": Topic[] }` in the new order, with contiguous `position` values starting at 0. |
| Validation rules | `topicIds` must contain exactly all active topic IDs of the subject, each once. A missing, extra, duplicate, archived or other-subject ID gives `validation_failed` with `details.fields` naming `topicIds`. The write is atomic and the order persists after reload (AC-FR-016-2). Sessions linked to the topics keep their link. |
| Error responses | plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-WRITE |
| Pagination | none |
| Idempotency / concurrency | none (idempotent set: repeating the same list gives the same state; the full-set check replaces `If-Match`; no `Idempotency-Key`). |

#### TOP-07 POST /api/app/topics/{topicId}/archive

| Field | Specification |
|---|---|
| Purpose | Archive a topic (soft delete). Sessions keep their subject and show the topic as archived. |
| Phase / FR | MVP / FR-018 (AC-FR-018-1, AC-FR-018-2), EC-008, BR-029, NFR-093 |
| Authentication | S |
| Authorization | owner (cross-user = 404) |
| Request parameters | Path: `topicId` (`Id`; malformed gives `not_found`). Query: none. Headers: `If-Match: "<version>"` (required); `Origin`. No `Idempotency-Key`. |
| Request body | none |
| Response | 200 `Topic` with `archivedAt` set; `ETag: "<new version>"`. |
| Validation rules | Publishes TopicArchived: exam checklists drop the topic from the readiness denominator and note the change (EC-008, FR-122). Sessions are unchanged (AC-FR-018-1). Archiving an already archived topic with a matching version returns 200 unchanged. The confirmation dialog is a client concern. |
| Error responses | `version_required` (400): `If-Match` missing.<br>`stale_version` (409): `If-Match` differs from the stored version; `details.current` is the current `Topic`.<br>plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-WRITE |
| Pagination | none |
| Idempotency / concurrency | `If-Match: "<version>"` required; `Idempotency-Key` not used (state transition, not a create). |

#### TOP-08 POST /api/app/topics/{topicId}/restore

| Field | Specification |
|---|---|
| Purpose | Restore an archived topic with its prior status and weight. |
| Phase / FR | MVP / FR-018 (AC-FR-018-3), EC-008, BR-029 |
| Authentication | S |
| Authorization | owner (cross-user = 404) |
| Request parameters | Path: `topicId` (`Id`; malformed gives `not_found`). Query: none. Headers: `If-Match: "<version>"` (required); `Origin`. No `Idempotency-Key`. |
| Request body | none |
| Response | 200 `Topic` with `archivedAt` `null`, `status` and `weight` as before archiving; `ETag: "<new version>"`. |
| Validation rules | The topic reappears in pickers (AC-FR-018-3) and counts again in exam readiness through the Exams module. Restoring an already active topic with a matching version returns 200 unchanged. |
| Error responses | `version_required` (400): `If-Match` missing.<br>`stale_version` (409): `If-Match` differs from the stored version; `details.current` is the current `Topic`.<br>plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-WRITE |
| Pagination | none |
| Idempotency / concurrency | `If-Match: "<version>"` required; `Idempotency-Key` not used (state transition, not a create). |
### 3.5 Exams

Exams (EXAM-01..06): create and edit exams, maintain the topic checklist, list upcoming and archived exams; archived is a state derived from `examDate` against today in the profile zone (BR-025), so no endpoint archives an exam.

| ID | Method path | FR | Phase | Summary |
|---|---|---|---|---|
| EXAM-01 | `GET /api/app/exams` | FR-123, FR-125 | MVP | List upcoming exams (nearest first) or archived exams (newest first, cursor) |
| EXAM-02 | `POST /api/app/exams` | FR-120 | MVP | Create an exam for one active subject |
| EXAM-03 | `GET /api/app/exams/{examId}` | FR-122, FR-123, FR-126 | MVP | Read one exam with checklist, countdown and (Phase 2) readiness |
| EXAM-04 | `PATCH /api/app/exams/{examId}` | FR-121 | MVP | Edit title, subject or date; a past date is allowed on edit |
| EXAM-05 | `PUT /api/app/exams/{examId}/topics` | FR-122 | MVP | Replace which topics of the exam subject are on the exam |
| EXAM-06 | `PUT /api/app/exams/{examId}/topics/{topicId}` | FR-122, FR-127 | MVP | Mark one checklist topic complete or not (Phase 2: set its weight) |

#### EXAM-01 GET /api/app/exams

| Field | Specification |
|---|---|
| Purpose | List the caller's exams: the upcoming list (default) or the archive, with countdown and checklist progress per exam. |
| Phase / FR | MVP / FR-123, FR-125 (the archive state of FR-124 is derived on read, no job is needed for this endpoint) |
| Authentication | S |
| Authorization | owner (list is scoped to the caller; cross-user = 404 applies to ids, none here) |
| Request parameters | Query (`ExamListQuery`): `state` = `upcoming` (default) or `archived`; with `state=archived` also `limit` (1..100, default 50) and `cursor`. Supplying `limit` or `cursor` with `state=upcoming` is `validation_failed`. No required headers. |
| Request body | none |
| Response | 200 `{ data: ExamListItem[] }` for `upcoming`; 200 `{ data: ExamListItem[], page: PageInfo }` for `archived`. Each item has `countdown` (upcoming only), `topicCount`, `completedCount`; from Phase 2 also `readiness`. |
| Validation rules | `state` must be one of the two enum values. An exam is archived when `examDate` is before today in the profile zone; an exam dated today is still upcoming (BR-025, BR-030, AC-FR-124-2). Countdown = whole calendar days from today in the profile zone, 0 on exam day (FR-123). |
| Error responses | `invalid_page_size` 400: `limit` outside 1..100. `invalid_cursor` 400: malformed or tampered `cursor`. Plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-READ |
| Pagination | `upcoming`: not paginated (bounded), order `examDate` asc, `id` asc. `archived`: cursor, order `examDate` desc, `id` desc, cursor keys `(examDate, id)` (FR-224). |
| Idempotency / concurrency | read only |

#### EXAM-02 POST /api/app/exams

| Field | Specification |
|---|---|
| Purpose | Create an exam linked to exactly one active subject with a date as fixed anchor (BR-023). |
| Phase / FR | MVP / FR-120 |
| Authentication | S |
| Authorization | owner (`subjectId` must be the caller's subject; another user's subject = 404 `not_found`) |
| Request parameters | Headers: `Idempotency-Key` (required; scope `exam.create`), `Origin` (same-origin), `Content-Type: application/json`. No path or query parameters. |
| Request body | `CreateExamInput` (`subjectId`, `title`, `examDate`) |
| Response | 201 `Exam` (empty `checklist`; `readinessPercent` null with `readinessNote` from Phase 2, EC-014); headers `Location: /api/app/exams/{id}`, `ETag: "1"`. Replay: stored 201 with `Idempotent-Replay: true`. |
| Validation rules | `subjectId` required, active subject (FR-120 AC-3); `title` required, trimmed, 1..200 characters (AC-FR-120-4, DICT `exams.title`); `examDate` required, today or later in the profile zone (BR-030, EC-013). Topics are linked afterwards through EXAM-05. |
| Error responses | `exam_date_in_past` 400: `examDate` before today in the profile zone, nothing created. `subject_archived` 409: subject is archived (BR-029). `idempotency_key_required` 400. `idempotency_key_reused` 409. `request_in_progress` 409. Plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-WRITE |
| Pagination | none |
| Idempotency / concurrency | `Idempotency-Key` required (CONVENTIONS section 7); new resource, so no `If-Match` |

#### EXAM-03 GET /api/app/exams/{examId}

| Field | Specification |
|---|---|
| Purpose | Read one exam with its topic checklist, countdown and, from Phase 2, readiness (topic coverage). |
| Phase / FR | MVP / FR-122, FR-123, FR-126 (readiness fields from Phase 2, FR-127) |
| Authentication | S |
| Authorization | owner (cross-user = 404) |
| Request parameters | Path: `examId` (Id; a non-UUID value is `not_found`). No query parameters or required headers. |
| Request body | none |
| Response | 200 `Exam` with `checklist: ExamChecklistItem[]`, `countdown` (omitted when archived), `state`; `ETag: "<version>"`. From Phase 2 `readiness` is `ExamReadiness`: `readinessPercent` is `null` with `readinessNote` when the exam has zero active topics (EC-014) or a topic was removed (EC-008). |
| Validation rules | Archived topics are dropped from `checklist` and the removal is noted in `readinessNote` (FR-122, EC-008). Zero topics is a valid state, never an error (AC-FR-122-3). Readiness = completed weight over total weight, whole percent (BR-024, Phase 2). |
| Error responses | Only the common set (API-ENDPOINTS section 1); `not_found` 404 for missing or foreign `examId`. |
| Rate limit | RL-READ |
| Pagination | none |
| Idempotency / concurrency | read only |

#### EXAM-04 PATCH /api/app/exams/{examId}

| Field | Specification |
|---|---|
| Purpose | Edit an exam's title, subject or date; editing the date to a past value is allowed and the exam then shows as archived from the next day (EC-013). |
| Phase / FR | MVP / FR-121 |
| Authentication | S |
| Authorization | owner (cross-user = 404) |
| Request parameters | Path: `examId`. Headers: `If-Match` (required), `Origin` (same-origin), `Content-Type: application/json`. |
| Request body | `UpdateExamInput` (`subjectId`, `title`, `examDate`; all optional, at least one) |
| Response | 200 `Exam` (full detail, new `version`); `ETag: "<version>"`. |
| Validation rules | `title` 1..200 trimmed. `examDate` may be in the past (DICT `exams.exam_date`, AC-FR-121-2); a past date on an upcoming exam does not fail. Changing `subjectId` requires an active subject and clears the checklist in the same transaction (AC-FR-121-4). An archived exam accepts only a body containing `examDate` alone; any other field is `validation_failed` (rule exam_archived, FR-125 AC-3); setting a today-or-later date restores it to upcoming (AC-FR-124-4). |
| Error responses | `version_required` 400: no `If-Match`. `stale_version` 409: `details.current` is the current `Exam` (EC-020, AC-FR-121-3). `subject_archived` 409: new `subjectId` is archived. Plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-WRITE |
| Pagination | none |
| Idempotency / concurrency | `If-Match: "<version>"` required (CONVENTIONS section 6); no `Idempotency-Key` (update, last-writer protected by version) |

#### EXAM-05 PUT /api/app/exams/{examId}/topics

| Field | Specification |
|---|---|
| Purpose | Replace the set of topics on the exam checklist; topics retained keep their `completed` mark. |
| Phase / FR | MVP / FR-122 |
| Authentication | S |
| Authorization | owner (cross-user = 404) |
| Request parameters | Path: `examId`. Headers: `Origin` (same-origin), `Content-Type: application/json`. |
| Request body | `SetExamTopicsInput` (`topicIds: Id[]`) |
| Response | 200 `Exam` with the new `checklist` (and recomputed `readiness` from Phase 2, FR-126). |
| Validation rules | Every id must be an active topic of the exam's subject; a topic of another subject, an archived topic or an unknown id is `validation_failed` naming the offending ids (AC-FR-122-4, BR-023). Duplicate ids are `validation_failed`. An empty array is valid and clears the checklist (EC-014). New topics start `completed = false`; retained topics keep `completed` and (Phase 2) `weight`. An archived exam rejects the call with `validation_failed` (rule exam_archived, AC-FR-125-3). |
| Error responses | Only the common set (API-ENDPOINTS section 1): `validation_failed` for the cases above; `not_found` for missing or foreign `examId`. |
| Rate limit | RL-WRITE |
| Pagination | none |
| Idempotency / concurrency | none (idempotent set; `exam_topics` rows are unversioned, so no `If-Match`, CONVENTIONS section 6) |

#### EXAM-06 PUT /api/app/exams/{examId}/topics/{topicId}

| Field | Specification |
|---|---|
| Purpose | Mark a checklist topic complete or not complete; from Phase 2 also set its readiness weight. |
| Phase / FR | MVP / FR-122; Phase 2 adds `weight` (FR-127) |
| Authentication | S |
| Authorization | owner (cross-user = 404) |
| Request parameters | Path: `examId`, `topicId`. Headers: `Origin` (same-origin), `Content-Type: application/json`. |
| Request body | `SetExamTopicInput` (`completed` required; `weight` optional, Phase 2 only) |
| Response | 200 `Exam` with updated `checklist` (and `readiness` from Phase 2, recomputed at once, FR-126). |
| Validation rules | `completed` is a boolean and required. `weight` is an integer 1..5 (AC-FR-127-3: 0 and 6 rejected); before Phase 2 a `weight` field is `validation_failed`. The topic must already be on the checklist, otherwise `not_found`. An archived exam is read-only: `validation_failed` (rule exam_archived, AC-FR-125-3). |
| Error responses | Only the common set (API-ENDPOINTS section 1): `not_found` 404 when the exam or the checklist topic is missing or foreign; `validation_failed` for the cases above. |
| Rate limit | RL-WRITE |
| Pagination | none |
| Idempotency / concurrency | none (idempotent set; unversioned checklist row, no `If-Match`) |

### 3.6 Study plans

Plan entries (PLAN-01..06): planned study blocks with overlap and exam-date warnings that need explicit confirmation (BR-026, FR-038), a read-only rule once an entry has started (BR-028), and the missed mark (BR-005).

| ID | Method path | FR | Phase | Summary |
|---|---|---|---|---|
| PLAN-01 | `GET /api/app/plan-entries` | FR-037, FR-062 | MVP | List entries in a required date range with planned, actual and variance |
| PLAN-02 | `POST /api/app/plan-entries` | FR-030 | MVP | Create an entry in the future; warnings need confirmation |
| PLAN-03 | `GET /api/app/plan-entries/{entryId}` | FR-036 | MVP | Read one entry with planned versus actual |
| PLAN-04 | `PATCH /api/app/plan-entries/{entryId}` | FR-031, FR-065..069 | MVP | Edit an entry that has not started; Phase 2 drag, resize and keyboard reuse it |
| PLAN-05 | `DELETE /api/app/plan-entries/{entryId}` | FR-032 | MVP | Delete an entry; linked sessions are kept and unlinked |
| PLAN-06 | `POST /api/app/plan-entries/{entryId}/missed` | FR-033 | MVP | Mark a past entry without sessions as missed |

#### PLAN-01 GET /api/app/plan-entries

| Field | Specification |
|---|---|
| Purpose | List plan entries whose start falls in a date range, for the list view and the calendar, with planned, actual and variance (FR-036). |
| Phase / FR | MVP / FR-037, FR-062 |
| Authentication | S |
| Authorization | owner (list is scoped to the caller) |
| Request parameters | Query (`PlanEntryListQuery`): `from` (`LocalDate`, required), `to` (`LocalDate`, required), `subjectId` (Id, optional), `status` (`upcoming`, `done` or `missed`, optional). No required headers. |
| Request body | none |
| Response | 200 `{ data: PlanEntry[] }`, each with `status`, `plannedMin`, `actualSeconds`, `varianceSeconds`. Empty range returns `{ data: [] }`. |
| Validation rules | `from` and `to` are inclusive local dates in the profile zone and are compared with `startsAt` converted to the current profile zone (EC-006, FR-037). `from` later than `to` or a span over 93 days is rejected. `status` is derived: `missed` if `missedAt` is set, `done` if a session is linked, else `upcoming` (BR-005). `actualSeconds` is the sum of linked session durations, breaks excluded; with no sessions it is 0 and `varianceSeconds` equals minus planned seconds (AC-FR-036-3). Entries of archived subjects are hidden (EC-007, FR-062). |
| Error responses | `invalid_date_range` 400: `from` later than `to` or span over 93 days (`details.maxSpan`). Plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-READ |
| Pagination | not paginated (bounded by the 93 day range); order `startsAt` asc, `id` asc |
| Idempotency / concurrency | read only |

#### PLAN-02 POST /api/app/plan-entries

| Field | Specification |
|---|---|
| Purpose | Create a plan entry for an active subject with optional topic, a future start and a duration of 5..480 minutes. |
| Phase / FR | MVP / FR-030 (warnings FR-034, FR-038) |
| Authentication | S |
| Authorization | owner (referenced subject, topic are the caller's, else 404 `not_found`) |
| Request parameters | Headers: `Idempotency-Key` (required; scope `plan_entry.create`), `Origin` (same-origin), `Content-Type: application/json`. No path or query parameters. |
| Request body | `CreatePlanEntryInput` (`subjectId`, `topicId?`, `startsAt`, `durationMin`, `confirmedWarnings?`) |
| Response | 201 `PlanEntry` (`warnings` lists confirmed advisories); headers `Location: /api/app/plan-entries/{id}`, `ETag: "1"`. Replay: stored 201 with `Idempotent-Replay: true`. |
| Validation rules | `subjectId` required (AC-FR-030-3), active subject. `topicId`, if given, must belong to `subjectId` (else `validation_failed`). `startsAt` must be after server now (AC-FR-030-4, else `validation_failed` stating entries must be in the future). `durationMin` integer 5..480 (BR-001). `timezone` and `localDate` are frozen from the profile at create. Overlap: any entry of the caller, any subject, whose interval intersects; entries that only touch do not overlap (AC-FR-034-3, BR-026). Exam date: the subject has an upcoming exam and the entry's local date is after the exam date (FR-038, BR-025). A warning not listed in `confirmedWarnings` is never accepted silently; when both apply, the response code is the overlap one and `details.warnings` lists both (CONVENTIONS section 8). |
| Error responses | `duration_out_of_range` 400: `durationMin` outside 5..480. `overlap_confirmation_required` 409: `details.warnings` with `planEntryId` of each overlapping entry. `exam_date_warning_confirmation_required` 409: `details.warnings` with `examId`. `subject_archived` 409. `idempotency_key_required` 400. `idempotency_key_reused` 409 (also when resubmitting with `confirmedWarnings` under the old key; use a new key). `request_in_progress` 409. Plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-WRITE |
| Pagination | none |
| Idempotency / concurrency | `Idempotency-Key` required (CONVENTIONS section 7); a confirmed resubmission needs a new key (CONVENTIONS section 8); new resource, so no `If-Match` |

#### PLAN-03 GET /api/app/plan-entries/{entryId}

| Field | Specification |
|---|---|
| Purpose | Read one plan entry with planned minutes, actual seconds and signed variance. |
| Phase / FR | MVP / FR-036 |
| Authentication | S |
| Authorization | owner (cross-user = 404) |
| Request parameters | Path: `entryId` (Id; a non-UUID value is `not_found`). No query parameters or required headers. |
| Request body | none |
| Response | 200 `PlanEntry`; `ETag: "<version>"`. |
| Validation rules | `varianceSeconds` = actual minus planned in seconds, signed (AC-FR-036-1/2). Planned and actual are stored independently; editing one never changes the other (FR-036). Unlinked sessions are excluded from `actualSeconds`. |
| Error responses | Only the common set (API-ENDPOINTS section 1); `not_found` 404 for missing or foreign `entryId`. |
| Rate limit | RL-READ |
| Pagination | none |
| Idempotency / concurrency | read only |

#### PLAN-04 PATCH /api/app/plan-entries/{entryId}

| Field | Specification |
|---|---|
| Purpose | Edit subject, topic, start or duration of an entry that has not started; the Phase 2 drag, resize and keyboard planning (15-minute grid) send the same request. |
| Phase / FR | MVP / FR-031, FR-065..069 (drag, resize, keyboard are Phase 2 clients of this endpoint) |
| Authentication | S |
| Authorization | owner (cross-user = 404) |
| Request parameters | Path: `entryId`. Headers: `If-Match` (required), `Origin` (same-origin), `Content-Type: application/json`. |
| Request body | `UpdatePlanEntryInput` (`subjectId`, `topicId`, `startsAt`, `durationMin`, `confirmedWarnings`; all optional, at least one) |
| Response | 200 `PlanEntry` (new `version`, `warnings` for confirmed advisories); `ETag: "<version>"`. Linked sessions are unaffected (FR-031). |
| Validation rules | Allowed only while the stored `startsAt` is after server now (BR-028, FR-035); the check uses server time at each attempt. A new `startsAt` must be in the future. `durationMin` 5..480. If `subjectId` changes, the resulting `topicId` must belong to the new subject (send `topicId: null` or a matching topic). Changing `startsAt` re-freezes `timezone` and `localDate`. Overlap and exam-date checks re-run on save (FR-031, BR-026); the request must list unconfirmed warnings in `confirmedWarnings`. Drag and resize snap to 15 minutes on the client; the server only enforces the rules above (BR-027). |
| Error responses | `version_required` 400. `stale_version` 409: `details.current` is the current `PlanEntry` (AC-FR-031-3, EC-020). `past_entry_read_only` 409: `details.startsAt` (entry has started; only PLAN-06 is allowed). `duration_out_of_range` 400. `overlap_confirmation_required` 409. `exam_date_warning_confirmation_required` 409. `subject_archived` 409: new subject archived. Plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-WRITE |
| Pagination | none |
| Idempotency / concurrency | `If-Match: "<version>"` required (CONVENTIONS section 6); no `Idempotency-Key`; `past_entry_read_only` is evaluated after the version check |

#### PLAN-05 DELETE /api/app/plan-entries/{entryId}

| Field | Specification |
|---|---|
| Purpose | Delete a plan entry; sessions linked to it remain, unlinked, and still count toward goals and statistics (EC-022). |
| Phase / FR | MVP / FR-032 |
| Authentication | S |
| Authorization | owner (cross-user = 404, AC-FR-032-3) |
| Request parameters | Path: `entryId`. Headers: `If-Match` (required), `Origin` (same-origin). |
| Request body | none |
| Response | 204 with no body. |
| Validation rules | Hard delete. Allowed for past entries as well (FR-032 sets no start condition; AC-FR-032-1 deletes an entry with recorded sessions). Linked `study_sessions.plan_entry_id` becomes null (BR-003, DICT); a timer run linked to it also loses the link. The confirmation dialog is client side (AC-FR-032-2). |
| Error responses | `version_required` 400. `stale_version` 409: `details.current` is the current `PlanEntry`. Plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-WRITE |
| Pagination | none |
| Idempotency / concurrency | `If-Match: "<version>"` required (CONVENTIONS section 6); a retry after success returns 404 `not_found` |

#### PLAN-06 POST /api/app/plan-entries/{entryId}/missed

| Field | Specification |
|---|---|
| Purpose | Mark a past plan entry that has no linked sessions as missed; the entry is kept and counts as planned time with zero actual. |
| Phase / FR | MVP / FR-033 |
| Authentication | S |
| Authorization | owner (cross-user = 404) |
| Request parameters | Path: `entryId`. Headers: `If-Match` (required), `Origin` (same-origin). |
| Request body | none |
| Response | 200 `PlanEntry` with `status: missed` and `missedAt` set; `ETag: "<version>"`. |
| Validation rules | The entry's `startsAt` must be before server now (BR-028 comparison, AC-FR-033-3 refuses an upcoming entry) and it must have no linked session (AC-FR-033-2 refuses an entry with recorded time); both refusals are `validation_failed` with a rule name of not_started_yet or has_sessions in `details.fields`. Marking an already missed entry changes nothing and returns 200 with the current entry. Missed is the only change allowed on a past entry (FR-033). |
| Error responses | `version_required` 400. `stale_version` 409: `details.current` is the current `PlanEntry`. `validation_failed` 400: entry not yet started or has sessions. Plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-WRITE |
| Pagination | none |
| Idempotency / concurrency | `If-Match: "<version>"` required (CONVENTIONS section 6); repeating the call on an already missed entry is a no-op, so no `Idempotency-Key` |

### 3.7 Study sessions

Study sessions (SESS-01..05): list, read, add manual, edit and delete recorded sessions; timer sessions are created only by TIM-05, never by `POST /sessions`.

| ID | Method path | FR | Phase | Summary |
|---|---|---|---|---|
| SESS-01 | `GET /api/app/sessions` | FR-061 | MVP | List sessions with filters, newest first, cursor paginated |
| SESS-02 | `GET /api/app/sessions/{sessionId}` | FR-043 | MVP | Read one session with its day allocations |
| SESS-03 | `POST /api/app/sessions` | FR-042, FR-048 | MVP | Add a manual session, idempotent by request key |
| SESS-04 | `PATCH /api/app/sessions/{sessionId}` | FR-043 | MVP | Edit subject, topic, plan link, start or end; duration recomputed |
| SESS-05 | `DELETE /api/app/sessions/{sessionId}` | FR-044 | MVP | Delete a session; totals and plan actuals update |

#### SESS-01 GET /api/app/sessions

| Field | Specification |
|---|---|
| Purpose | List the caller's recorded sessions, newest first, for history and filtered views. |
| Phase / FR | MVP / FR-061 (pagination FR-224) |
| Authentication | S |
| Authorization | owner (list is scoped to the caller) |
| Request parameters | Query (`StudySessionListQuery`): `from`, `to` (`LocalDate`, inclusive, optional), `subjectId`, `topicId` (Id, optional), `source` (`timer` or `manual`, optional), `limit` (1..100, default 50), `cursor`. No required headers. |
| Request body | none |
| Response | 200 `{ data: StudySession[], page: PageInfo }`. Sessions of archived subjects are included (labelled by the client as archived, EC-007). |
| Validation rules | `from` and `to` are local dates in the profile zone; a session matches when any of its `dayAllocations` falls inside the range, so a midnight-crossing session appears under both days (BR-016, EC-009). `from` later than `to` is rejected. `source` is a database enum value. |
| Error responses | `invalid_date_range` 400: `from` later than `to`. `invalid_page_size` 400. `invalid_cursor` 400. Plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-READ |
| Pagination | cursor; order `startedAt` desc, `id` desc; cursor keys `(startedAt, id)` (FR-224) |
| Idempotency / concurrency | read only |

#### SESS-02 GET /api/app/sessions/{sessionId}

| Field | Specification |
|---|---|
| Purpose | Read one session including its per-day allocations. |
| Phase / FR | MVP / FR-043 |
| Authentication | S |
| Authorization | owner (cross-user = 404) |
| Request parameters | Path: `sessionId` (Id; a non-UUID value is `not_found`). No query parameters or required headers. |
| Request body | none |
| Response | 200 `StudySession` with `dayAllocations: DayAllocation[]`; `ETag: "<version>"`. |
| Validation rules | A midnight-crossing session is one session with two allocations, split at the frozen zone boundary (FR-047, EC-009); allocations do not change when the profile zone changes (AC-FR-047-2). `autoClosed` is true when the idle job closed it (BR-006). |
| Error responses | Only the common set (API-ENDPOINTS section 1); `not_found` 404 for missing or foreign `sessionId`. |
| Rate limit | RL-READ |
| Pagination | none |
| Idempotency / concurrency | read only |

#### SESS-03 POST /api/app/sessions

| Field | Specification |
|---|---|
| Purpose | Record a past study session by hand. It is stored with `source: manual`, counts toward goals and statistics, and earns no XP or leaderboard rank (BR-010). |
| Phase / FR | MVP / FR-042, FR-048 |
| Authentication | S |
| Authorization | owner (subject, topic, plan entry must be the caller's, else 404 `not_found`) |
| Request parameters | Headers: `Idempotency-Key` (required; stored as the session's `request_key`), `Origin` (same-origin), `Content-Type: application/json`. No path or query parameters. |
| Request body | `CreateStudySessionInput` (`subjectId`, `topicId?`, `planEntryId?`, `startedAt`, `endedAt`) |
| Response | 201 `StudySession` with `source: manual`, `mode: null`, `dayAllocations`, `serverTime`; headers `Location: /api/app/sessions/{id}`, `ETag: "1"`. Same key replay: the existing session, `Idempotent-Replay: true` (AC-FR-048-1, EC-021). |
| Validation rules | Duration is derived as `endedAt` minus `startedAt` and is never sent; `source` is not accepted. `startedAt` and `endedAt` must not be after server now (EC-011). `endedAt` after `startedAt`; duration 60..86400 s (DICT `study_sessions.duration_seconds`, BR-008). The total of all sessions' allocations on any local day touched must stay at or below 24 h (EC-011, AC-FR-042-4). The range must not overlap any recorded session of the caller; the conflicting session is named (EC-011, U-7). Topic must belong to `subjectId` (FR-041 AC-1, else `validation_failed`); `subjectId` active. `timezone`, `localDate` and rollover hour are frozen from the profile; the session is split at day boundaries (BR-016). |
| Error responses | `manual_entry_in_future` 400: `details.now`. `manual_entry_too_long` 400: duration outside 60..86400 s (`details.minSeconds`, `details.maxSeconds`). `daily_total_exceeded` 400: `details.localDate`, `details.maxSeconds`. `manual_entry_overlaps_session` 409: `details.conflictingSessionId`. `subject_archived` 409. `idempotency_key_required` 400. `idempotency_key_reused` 409. `request_in_progress` 409. Plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-WRITE |
| Pagination | none |
| Idempotency / concurrency | `Idempotency-Key` required (CONVENTIONS section 7); persisted in `request_key`, unique per user; new resource, so no `If-Match` |

#### SESS-04 PATCH /api/app/sessions/{sessionId}

| Field | Specification |
|---|---|
| Purpose | Correct a session's subject, topic, plan link, start or end; duration is recomputed from the timestamps and day allocations are rewritten. |
| Phase / FR | MVP / FR-043 |
| Authentication | S |
| Authorization | owner (cross-user = 404) |
| Request parameters | Path: `sessionId`. Headers: `If-Match` (required), `Origin` (same-origin), `Content-Type: application/json`. |
| Request body | `UpdateStudySessionInput` (`subjectId`, `topicId`, `planEntryId`, `startedAt`, `endedAt`; all optional, at least one) |
| Response | 200 `StudySession` (new `version`, rewritten `dayAllocations`); `ETag: "<version>"`. |
| Validation rules | `source` or any other unknown field is `validation_failed`; `source` is immutable (BR-010). Same limits as create (EC-011): no future start or end, resulting duration 60..86400 s (`durationSeconds` becomes `endedAt` minus `startedAt` after a time edit), at most 24 h per local day, no overlap with another session (AC-FR-043-3). `planEntryId: null` unlinks; only one plan entry can be linked (AC-FR-041-2). A topic must belong to the resulting subject. Applies to timer and manual sessions alike. Totals, statistics and plan actuals update (FR-043). |
| Error responses | `version_required` 400. `stale_version` 409: `details.current` is the current `StudySession` (AC-FR-043-2, EC-020). `manual_entry_in_future` 400. `manual_entry_too_long` 400. `daily_total_exceeded` 400. `manual_entry_overlaps_session` 409: `details.conflictingSessionId`. `subject_archived` 409: new subject archived. Plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-WRITE |
| Pagination | none |
| Idempotency / concurrency | `If-Match: "<version>"` required (CONVENTIONS section 6); no `Idempotency-Key` |

#### SESS-05 DELETE /api/app/sessions/{sessionId}

| Field | Specification |
|---|---|
| Purpose | Delete a session; totals for its days, statistics and the linked plan entry's actual time fall accordingly. |
| Phase / FR | MVP / FR-044 |
| Authentication | S |
| Authorization | owner (cross-user = 404) |
| Request parameters | Path: `sessionId`. Headers: `If-Match` (required), `Origin` (same-origin). |
| Request body | none |
| Response | 204 with no body. |
| Validation rules | Hard delete of the session and its `study_session_days` rows (cascade). Publishes the SessionDeleted event so goal progress, statistics and plan actuals recompute. The confirmation dialog is client side (AC-FR-044-2). |
| Error responses | `version_required` 400. `stale_version` 409: `details.current` is the current `StudySession` (AC-FR-044-3, EC-020). Plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-WRITE |
| Pagination | none |
| Idempotency / concurrency | `If-Match: "<version>"` required (CONVENTIONS section 6); a retry after success returns 404 `not_found` |

### 3.8 Timer

Timer (TIM-01..08): server-authoritative single timer per user (BR-011); the client sends commands (start, pause, resume, stop, heartbeat) and never durations or timestamps (BR-012, EC-010). Clients poll TIM-01 every 3 s only while a timer runs, plus on window focus, so state converges within 5 s (FR-059, ADR-011).

| ID | Method path | FR | Phase | Summary |
|---|---|---|---|---|
| TIM-01 | `GET /api/app/timer` | FR-054, FR-059 | MVP | Read the current timer (or none) with server time; ETag and 304 |
| TIM-02 | `POST /api/app/timer/start` | FR-050, FR-051, FR-053 | MVP | Start a Pomodoro or stopwatch; atomic single-timer rule with optional replace |
| TIM-03 | `POST /api/app/timer/pause` | FR-052 | MVP | Pause the running timer |
| TIM-04 | `POST /api/app/timer/resume` | FR-052 | MVP | Resume the paused timer |
| TIM-05 | `POST /api/app/timer/stop` | FR-040, FR-045, FR-051, FR-058 | MVP | Stop, classify and save or discard the run |
| TIM-06 | `POST /api/app/timer/heartbeat` | FR-052 | MVP | Report liveness every 60 s; returns the timer |
| TIM-07 | `GET /api/app/timer/settings` | FR-057 | MVP | Read Pomodoro settings (defaults when no row) |
| TIM-08 | `PATCH /api/app/timer/settings` | FR-057, FR-180, FR-181, FR-183 | MVP (audio fields Phase 2) | Change Pomodoro durations; audio choice and volume from Phase 2 |

#### TIM-01 GET /api/app/timer

| Field | Specification |
|---|---|
| Purpose | Return the caller's running or paused timer, or `null`, with the server clock so the client can compute elapsed time without trusting its own clock. |
| Phase / FR | MVP / FR-054, FR-059 |
| Authentication | S |
| Authorization | owner (a user only ever sees their own run) |
| Request parameters | Headers: `If-None-Match` (optional, the previous `ETag`). No path or query parameters. |
| Request body | none |
| Response | 200 `TimerStateResponse` (`{ timer: TimerState or null, serverTime }`) with `ETag` and `Cache-Control: private, no-cache`; 304 with no body when `If-None-Match` matches. The `ETag` is derived from the run `id` and `version` (so a new run never matches an old tag) and is a fixed value when there is no run; `serverTime` is not part of the validator. |
| Validation rules | Elapsed time is computed from stored server timestamps, not ticks (BR-012, AC-FR-054-4). A run idle for more than 30 min is closed at its last heartbeat by the idle job (BR-006) and then reads as `timer: null`; the session carries `autoClosed: true` (FR-046, EC-028). Poll only while a timer runs, and on focus (ADR-011). |
| Error responses | Only the common set (API-ENDPOINTS section 1). |
| Rate limit | RL-TIMER |
| Pagination | none |
| Idempotency / concurrency | read only (conditional GET via `If-None-Match`) |

#### TIM-02 POST /api/app/timer/start

| Field | Specification |
|---|---|
| Purpose | Start a Pomodoro or stopwatch for an active subject. At most one run exists per user across all tabs and devices; a second start is refused unless the client confirms replacement. |
| Phase / FR | MVP / FR-050, FR-051, FR-053 |
| Authentication | S |
| Authorization | owner (subject, topic, plan entry must be the caller's, else 404 `not_found`) |
| Request parameters | Headers: `Idempotency-Key` (required; scope `timer.start`), `Origin` (same-origin), `Content-Type: application/json`. No path or query parameters. |
| Request body | `StartTimerInput` (`mode`, `subjectId`, `topicId?`, `planEntryId?`, `replaceRunning?`) |
| Response | 201 `TimerState` (`state: running`, `serverTime`, settings snapshot; for `pomodoro` `phase: focus` and `phaseEndsAt`) with `Location: /api/app/timer` and `ETag`. Replay: stored 201 with `Idempotent-Replay: true`. With `replaceRunning: true` the replaced run's saved session is found afterwards through SESS-01. |
| Validation rules | `mode` is `stopwatch` or `pomodoro`; `subjectId` required (AC-FR-050-4) and active (BR-029); `topicId`, if given, belongs to `subjectId` (else `validation_failed`). The insert is atomic on the unique `user_id` of `timer_runs`; the first accepted request wins, a simultaneous loser gets the 409 with the winner in `details.current` (BR-011, AC-FR-053-3, EC-002). `replaceRunning` defaults to false. When true and a run exists, the current run is stopped and saved or discarded under the TIM-05 rules at server time of confirmation and the new run starts, all in one transaction (AC-FR-053-2); when true and no run exists it is a plain start. Pomodoro durations are copied from timer settings (`focusMin`, `breakMin`, `longBreakMin`, `cyclesBeforeLongBreak`, BR-009, FR-057). The run freezes `timezone`, `localDate` and rollover hour. |
| Error responses | `timer_already_running` 409: a run exists and `replaceRunning` is false; `details.current` is the `TimerState` (EC-002). `subject_archived` 409. `idempotency_key_required` 400. `idempotency_key_reused` 409. `request_in_progress` 409. Plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-WRITE |
| Pagination | none |
| Idempotency / concurrency | `Idempotency-Key` required (CONVENTIONS section 7); only the 2xx response is stored, so a retry after `timer_already_running` is re-evaluated; the run is a new row, so no `If-Match` |

#### TIM-03 POST /api/app/timer/pause

| Field | Specification |
|---|---|
| Purpose | Pause the running timer; paused time is not study time and the run stays recoverable until auto-closed by inactivity. |
| Phase / FR | MVP / FR-052 |
| Authentication | S |
| Authorization | owner (acts on the caller's own run) |
| Request parameters | Headers: `If-Match` (required; the `version` of the `TimerState`, not the TIM-01 `ETag` tag), `Origin` (same-origin). No path or query parameters. |
| Request body | none |
| Response | 200 `TimerState` with `state: paused`, new `version`, `serverTime`; the open segment is closed at server time. |
| Validation rules | Requires an existing run. Pausing an already paused run changes nothing and returns 200 with the current `TimerState`. Pause is stored as an action with a server timestamp (FR-052); the client sends no time. |
| Error responses | `version_required` 400. `stale_version` 409: `details.current` is the current `TimerState` (EC-020, FR-059). `session_already_closed` 409: no run exists, for example stopped on another device or auto-closed (AC-FR-059-4, EC-001). Plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-TIMER |
| Pagination | none |
| Idempotency / concurrency | `If-Match: "<version>"` required (CONVENTIONS section 6, timer run version); no `Idempotency-Key` |

#### TIM-04 POST /api/app/timer/resume

| Field | Specification |
|---|---|
| Purpose | Resume a paused timer; a new focus segment starts at server time. |
| Phase / FR | MVP / FR-052 |
| Authentication | S |
| Authorization | owner (acts on the caller's own run) |
| Request parameters | Headers: `If-Match` (required; the `version` of the `TimerState`), `Origin` (same-origin). No path or query parameters. |
| Request body | none |
| Response | 200 `TimerState` with `state: running`, new `version`, `serverTime`, a new open segment in `segments`. |
| Validation rules | Requires an existing run. Resuming a run that is already running changes nothing and returns 200 with the current `TimerState`. Elapsed study time keeps excluding paused time (AC-FR-052-1: 10 min, pause 5 min, 10 min gives 20 min ±2 s). |
| Error responses | `version_required` 400. `stale_version` 409: `details.current` is the current `TimerState`. `session_already_closed` 409: no run exists (EC-001, EC-028). Plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-TIMER |
| Pagination | none |
| Idempotency / concurrency | `If-Match: "<version>"` required (CONVENTIONS section 6, timer run version); no `Idempotency-Key` |

#### TIM-05 POST /api/app/timer/stop

| Field | Specification |
|---|---|
| Purpose | Stop the run, compute the study time from stored server timestamps, then save a session, save time only, or discard, and report which happened. |
| Phase / FR | MVP / FR-040, FR-045, FR-051, FR-058 |
| Authentication | S |
| Authorization | owner (acts on the caller's own run) |
| Request parameters | Headers: `Idempotency-Key` (required; scope `timer.stop`), `If-Match` (required; the `version` of the `TimerState`), `Origin` (same-origin). No path or query parameters. |
| Request body | none |
| Response | 200 `StopTimerResult` (`outcome`, `session?`, `message`). `outcome` is `saved`, `time_only` or `discarded`; `session` (`StudySession`, `source: timer`) is present for `saved` and `time_only`. Replay: the stored result with `Idempotent-Replay: true`. |
| Validation rules | Study time = focus seconds from the run's segments, excluding pauses and breaks, from server timestamps only (BR-012, FR-040 AC-2). Under 60 s: `discarded`, nothing stored, message states it was shorter than 1 minute (BR-008, AC-FR-045-1/2: 59 s discarded, exactly 60 s stored). Stopwatch from 60 s: `saved`. Pomodoro (BR-007, FR-058): 300 s or more of focus in the open interval, or a focus interval already run to its end, counts a completed pomodoro and the outcome is `saved` (`pomodorosCompleted` incremented); 60 to 299 s of total focus with no completed pomodoro is `time_only` with `pomodorosCompleted` unchanged; under 60 s is `discarded`. `message` states the result in plain language (EC-012). The run row is removed and the session, its day allocations and the key are written in one transaction; the session keeps the key in `request_key`, so a retry never creates a second session (FR-048). Stopping a paused run is allowed. The stop is evaluated against the version in `If-Match`; a stop whose key was already stored returns the stored result before the version check. |
| Error responses | `version_required` 400. `stale_version` 409: `details.current` is the current `TimerState` (a different run or state). `session_already_closed` 409: no run, because the idle job already closed it at its last heartbeat (session flagged `autoClosed`) or another device stopped it (EC-001, EC-028, AC-FR-059-4). `idempotency_key_required` 400. `idempotency_key_reused` 409. `request_in_progress` 409. Plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-TIMER |
| Pagination | none |
| Idempotency / concurrency | `Idempotency-Key` required (CONVENTIONS section 7) and `If-Match: "<version>"` required (CONVENTIONS section 6); a double click or retry with the same key returns the same result and one session |

#### TIM-06 POST /api/app/timer/heartbeat

| Field | Specification |
|---|---|
| Purpose | Tell the server the timer is still being watched; the client calls it every 60 s while a timer exists. A missed heartbeat never stops the timer, the server decides closure after more than 30 min (BR-006). |
| Phase / FR | MVP / FR-052 (idle rule FR-046) |
| Authentication | S |
| Authorization | owner (acts on the caller's own run) |
| Request parameters | Headers: `Origin` (same-origin). No path, query, `If-Match` or `Idempotency-Key`. |
| Request body | none |
| Response | 200 `TimerState` with updated `lastHeartbeatAt` and `serverTime`. |
| Validation rules | The client sends no timestamp; `lastHeartbeatAt` is set to server now (BR-012). When the client was offline for more than 30 min the idle rule has already closed the run (EC-028), so the call fails with the error below and the client shows that the session was auto-closed. |
| Error responses | `session_already_closed` 409: no run exists (EC-001, EC-028). Plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-TIMER |
| Pagination | none |
| Idempotency / concurrency | none (idempotent set: repeats only move `lastHeartbeatAt`; no `If-Match`, no `Idempotency-Key`) |

#### TIM-07 GET /api/app/timer/settings

| Field | Specification |
|---|---|
| Purpose | Read the caller's Pomodoro durations (and, from Phase 2, ambient audio choice and volume). |
| Phase / FR | MVP / FR-057 (audio fields Phase 2: FR-180, FR-181, FR-183) |
| Authentication | S |
| Authorization | owner |
| Request parameters | None (no path, query or required headers). |
| Request body | none |
| Response | 200 `TimerSettings`; `ETag: "<version>"`. When no row exists the configuration defaults are returned (25, 5, 15, 4) with `version: 0`. |
| Validation rules | Defaults and ranges: `focusMin` 1..120 (25), `breakMin` 1..60 (5), `longBreakMin` 1..60 (15), `cyclesBeforeLongBreak` 2..8 (4) (BR-009, FR-057). `audioLoop` and `audioVolume` appear from Phase 2. |
| Error responses | Only the common set (API-ENDPOINTS section 1). |
| Rate limit | RL-READ |
| Pagination | none |
| Idempotency / concurrency | read only |

#### TIM-08 PATCH /api/app/timer/settings

| Field | Specification |
|---|---|
| Purpose | Change Pomodoro durations; changes apply to timers started afterwards and never alter a running timer. From Phase 2 also stores the last ambient audio choice and volume. |
| Phase / FR | MVP / FR-057; Phase 2 adds `audioLoop`, `audioVolume` (FR-180, FR-181, FR-183) |
| Authentication | S |
| Authorization | owner |
| Request parameters | Headers: `If-Match` (required once the row exists; see rules), `Origin` (same-origin), `Content-Type: application/json`. No path or query parameters. |
| Request body | `UpdateTimerSettingsInput` (any of `focusMin`, `breakMin`, `longBreakMin`, `cyclesBeforeLongBreak`; Phase 2: `audioLoop`, `audioVolume`; at least one) |
| Response | 200 `TimerSettings` (new `version`); `ETag: "<version>"`. |
| Validation rules | Ranges: `focusMin` 1..120, `breakMin` 1..60, `longBreakMin` 1..60, `cyclesBeforeLongBreak` 2..8 (AC-FR-057-2/3/4: 120 accepted and 121 rejected, 0 and 61 rejected, 1 and 60 accepted, 1 and 9 rejected, 2 and 8 accepted). Phase 2: `audioLoop` is `none`, `rain`, `white_noise` or `cafe`; `audioVolume` integer 0..100. An out-of-range value gives `validation_failed` whose `details.fields` carries the allowed range, and the previous value is kept (FR-057). The row is created lazily: when TIM-07 returned `version: 0` the first `PATCH` may omit `If-Match` or send `If-Match: "0"` and creates the row at version 1; once a row exists `If-Match` is required. Does not alter a running timer (settings are snapshotted at start). |
| Error responses | `version_required` 400: a row exists and `If-Match` is missing. `stale_version` 409: `If-Match` differs from the stored version, including `"0"` after another request created the row; `details.current` is the current `TimerSettings`. Plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-WRITE |
| Pagination | none |
| Idempotency / concurrency | `If-Match: "<version>"` required (CONVENTIONS section 6), with the lazy-row exception when `version` is 0; no `Idempotency-Key` |
### 3.9 Tasks

To-dos: tasks to complete with optional subject, topic and due date; they are not time blocks and never affect sessions, plans or statistics (FR-090..096, BR-031).

| ID | Method path | FR | Phase | Summary |
|---|---|---|---|---|
| TODO-01 | GET /api/app/todos | 094, 095 | MVP | Filtered, FR-095 ordered, cursor-paginated to-do list |
| TODO-02 | POST /api/app/todos | 090, 096 | MVP | Create a to-do |
| TODO-03 | GET /api/app/todos/{todoId} | 091 | MVP | Read one to-do (edit form load) |
| TODO-04 | PATCH /api/app/todos/{todoId} | 091 | MVP | Edit title, subject, topic, due date or priority |
| TODO-05 | PUT /api/app/todos/{todoId}/completion | 093 | MVP | Idempotent set of done or not done |
| TODO-06 | DELETE /api/app/todos/{todoId} | 092 | MVP | Permanently delete a to-do |

#### TODO-01 GET /api/app/todos

| Field | Specification |
|---|---|
| Purpose | List the caller's to-dos, filtered and sorted for the task page and the dashboard due/overdue island. |
| Phase / FR | MVP / FR-094, FR-095, FR-224 |
| Authentication | S |
| Authorization | owner (cross-user = 404) |
| Request parameters | Query: `status` (`open` default, `done`, `all`), `subjectId` (`Id`), `priority` (`high`, `medium`, `low`), `due` (`overdue`, `today`, `within7`, `none`), `limit` (int 1..100, default 50), `cursor` (`Cursor`). Filters combine with AND. No required headers. |
| Request body | none (query is `TodoListQuery`) |
| Response | 200 `{ data: Todo[], page: PageInfo }` with `Cache-Control: no-store`. An empty match is 200 with `data: []` (AC-FR-094-4). |
| Validation rules | Unknown enum value is `validation_failed`. "Today" is the date in the profile zone (BR-030). `overdue` = open and `dueDate` before today, so it never matches done to-dos even with `status=all`. `today` = `dueDate` equals today. `within7` = `dueDate` from today through today plus 7 days, inclusive. `none` = `dueDate` is null. A `subjectId` filter on an archived subject returns that subject's to-dos (explicit selection, FR-094 edge). `subjectId` must be an owned subject. |
| Error responses | `invalid_page_size` 400: `limit` outside 1..100. `invalid_cursor` 400: malformed or tampered cursor. `not_found` 404: `subjectId` not owned. Plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-READ |
| Pagination | Cursor. Order is the FR-095 composite: priority `high`, `medium`, `low`; then `dueDate` ascending with null last; then `createdAt` ascending; then `id`. With `status=all`, open to-dos precede done to-dos. The cursor encodes (priorityRank, dueDate or null, createdAt, id) plus the open/done group. |
| Idempotency / concurrency | read only |

#### TODO-02 POST /api/app/todos

| Field | Specification |
|---|---|
| Purpose | Create a to-do for the caller. |
| Phase / FR | MVP / FR-090, FR-096 |
| Authentication | S |
| Authorization | owner (cross-user = 404) |
| Request parameters | Headers: `Idempotency-Key` (required, `IdempotencyKeyHeader`), `Origin` (must equal the app origin), `Content-Type: application/json`. |
| Request body | `CreateTodoInput` |
| Response | 201 `Todo` with `Location: /api/app/todos/{todoId}` and `ETag`. A replay returns the stored 201 and body with `Idempotent-Replay: true`. |
| Validation rules | `title` 1..200 characters after trim, not whitespace-only; 201 characters rejected, exactly 200 accepted (AC-FR-090-2). `priority` is `high`, `medium` or `low`, default `medium` (FR-096, BR-031). `topicId` requires `subjectId` and must belong to that subject, otherwise `validation_failed` and nothing is stored (AC-FR-090-4). `subjectId` and `topicId` must be owned records. `dueDate` is a `LocalDate`; a past date is accepted. New to-do starts `done: false`. |
| Error responses | `subject_archived` 409: `subjectId` references an archived subject (BR-029). `idempotency_key_required` 400: header missing. `idempotency_key_reused` 409: same key, different request. `request_in_progress` 409: same key still executing. `not_found` 404: unknown or foreign `subjectId` or `topicId`. Plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-WRITE |
| Pagination | none |
| Idempotency / concurrency | `Idempotency-Key` required, scope `todo.create` in `idempotency_keys`, 7 day retention (CONVENTIONS section 7, EC-021). No `If-Match` on create. |

#### TODO-03 GET /api/app/todos/{todoId}

| Field | Specification |
|---|---|
| Purpose | Read one to-do, including its current `version` for later edits. |
| Phase / FR | MVP / FR-091, FR-092 |
| Authentication | S |
| Authorization | owner (cross-user = 404) |
| Request parameters | Path: `todoId` (`Id`; a malformed value is `not_found`). |
| Request body | none |
| Response | 200 `Todo` with `ETag`. |
| Validation rules | A deleted to-do is `not_found` (AC-FR-092-3). `overdue` is computed against today in the profile zone. |
| Error responses | `not_found` 404: missing, deleted or foreign to-do. Plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-READ |
| Pagination | none |
| Idempotency / concurrency | read only |

#### TODO-04 PATCH /api/app/todos/{todoId}

| Field | Specification |
|---|---|
| Purpose | Edit title, subject, topic, due date or priority. |
| Phase / FR | MVP / FR-091, FR-096 |
| Authentication | S |
| Authorization | owner (cross-user = 404) |
| Request parameters | Path: `todoId`. Headers: `If-Match` (required, `"<version>"`), `Origin`, `Content-Type: application/json`. |
| Request body | `UpdateTodoInput` |
| Response | 200 `Todo` with the new `ETag`. |
| Validation rules | At least one field. Same rules as create: `title` 1..200 not whitespace-only (AC-FR-091-4 keeps the stored title on rejection), `priority` enum, topic belongs to subject. `dueDate: null` clears the due date (AC-FR-091-2). `subjectId: null` also clears `topicId`. `done` is not accepted here (strict parse gives `validation_failed`); use TODO-05. |
| Error responses | `version_required` 400: no `If-Match`. `stale_version` 409: version differs, `details.current` is the current `Todo` (AC-FR-091-3, EC-020). `subject_archived` 409: new `subjectId` is archived. `not_found` 404: unknown or foreign `subjectId`, `topicId`. Plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-WRITE |
| Pagination | none |
| Idempotency / concurrency | `If-Match` required (ADR-011). No `Idempotency-Key`; a repeated identical PATCH with the old version is rejected by version, a repeated one with the new version is a no-op value change. |

#### TODO-05 PUT /api/app/todos/{todoId}/completion

| Field | Specification |
|---|---|
| Purpose | Set a to-do done or not done; records or clears the completion time. |
| Phase / FR | MVP / FR-093 |
| Authentication | S |
| Authorization | owner (cross-user = 404) |
| Request parameters | Path: `todoId`. Headers: `Origin`, `Content-Type: application/json`. No `If-Match` (idempotent set). |
| Request body | `SetTodoCompletionInput` |
| Response | 200 `Todo` with `ETag`. |
| Validation rules | `done` is a required boolean. `true` sets `completedAt` to the server time; `false` clears it (AC-FR-093-1, AC-FR-093-2). Sending the current state changes nothing (no version bump, no event). The `TodoCompleted` event is published only on the false-to-true transition (FR-172, EC-017). Two quick toggles leave the state of the last request processed (AC-FR-093-3). |
| Error responses | `not_found` 404: missing, deleted or foreign to-do. Plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-WRITE |
| Pagination | none |
| Idempotency / concurrency | none (idempotent set): no `Idempotency-Key`, no `If-Match`. A real state change increments `version`, so a concurrent TODO-04 holding the old `If-Match` gets `stale_version`. |

#### TODO-06 DELETE /api/app/todos/{todoId}

| Field | Specification |
|---|---|
| Purpose | Permanently delete a to-do (no archive state). |
| Phase / FR | MVP / FR-092 |
| Authentication | S |
| Authorization | owner (cross-user = 404) |
| Request parameters | Path: `todoId`. Headers: `If-Match` (required), `Origin`. |
| Request body | none |
| Response | 204, no body. |
| Validation rules | Hard delete; sessions, plan entries and statistics are unaffected (AC-FR-092-4). A second delete finds nothing and returns `not_found`. |
| Error responses | `version_required` 400: no `If-Match`. `stale_version` 409: version differs, `details.current` is the current `Todo`. `not_found` 404: already deleted or foreign. Plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-WRITE |
| Pagination | none |
| Idempotency / concurrency | `If-Match` required (ADR-011). No `Idempotency-Key`. |

### 3.10 Notes

Markdown notes per subject or topic with server-side safe rendering and version-conflict handling (FR-100..104, ADR-007).

| ID | Method path | FR | Phase | Summary |
|---|---|---|---|---|
| NOTE-01 | GET /api/app/notes | 100 | MVP | Cursor-paginated note list without bodies |
| NOTE-02 | POST /api/app/notes | 100, 103 | MVP | Create a note (also "keep both" resolution) |
| NOTE-03 | GET /api/app/notes/{noteId} | 100 | MVP | Read one note with raw Markdown |
| NOTE-04 | PATCH /api/app/notes/{noteId} | 100, 102, 103 | MVP | Edit or autosave a note, version checked |
| NOTE-05 | GET /api/app/notes/{noteId}/render | 101 | MVP | Sanitized HTML of a note |
| NOTE-06 | DELETE /api/app/notes/{noteId} | 104 | MVP | Delete a note |

#### NOTE-01 GET /api/app/notes

| Field | Specification |
|---|---|
| Purpose | List notes of a subject or topic (or all) for the notes page without transferring bodies. |
| Phase / FR | MVP / FR-100, FR-104, FR-224 |
| Authentication | S |
| Authorization | owner (cross-user = 404) |
| Request parameters | Query: `subjectId` (`Id`), `topicId` (`Id`), `limit` (int 1..100, default 50), `cursor` (`Cursor`). No required headers. |
| Request body | none (query is `NoteListQuery`) |
| Response | 200 `{ data: NoteListItem[], page: PageInfo }`; each item has `bodyPreview` (first 200 characters) and no `body`. |
| Validation rules | Notes of archived subjects are not listed (hidden with the subject, FR-104, EC-007, BR-029); they return when the subject is restored with content unchanged. `subjectId` and `topicId` must be owned records; `topicId` must belong to `subjectId` when both are sent, else `validation_failed`. |
| Error responses | `invalid_page_size` 400: `limit` outside 1..100. `invalid_cursor` 400: malformed or tampered cursor. `not_found` 404: `subjectId` or `topicId` not owned. Plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-READ |
| Pagination | Cursor. Order `updatedAt` descending, then `id` descending. |
| Idempotency / concurrency | read only |

#### NOTE-02 POST /api/app/notes

| Field | Specification |
|---|---|
| Purpose | Create a note. Also the "keep both" step of conflict resolution: the client posts its own text as a new note titled with the suffix "(copy)" (AC-FR-103-3). |
| Phase / FR | MVP / FR-100, FR-103 |
| Authentication | S |
| Authorization | owner (cross-user = 404) |
| Request parameters | Headers: `Idempotency-Key` (required, `IdempotencyKeyHeader`), `Origin`, `Content-Type: application/json`. |
| Request body | `CreateNoteInput` |
| Response | 201 `Note` with `Location: /api/app/notes/{noteId}` and `ETag`. A replay returns the stored 201 with `Idempotent-Replay: true`. |
| Validation rules | `subjectId` required and owned (missing subject: `validation_failed`, FR-100 edge). `title` 1..200 characters; for the "(copy)" case the client shortens the original title so the result stays within 200. `body` defaults to empty, at most 100000 characters (AC-FR-100-4), stored exactly as sent and never sanitized on write (ADR-007). `topicId` optional and must belong to `subjectId`, else `validation_failed`. |
| Error responses | `input_too_large` 400: `body` over 100000 characters (details limit and actual). `subject_archived` 409: subject is archived (BR-029). `idempotency_key_required` 400: header missing. `idempotency_key_reused` 409: same key, different request. `request_in_progress` 409: same key still executing. `not_found` 404: unknown or foreign `subjectId` or `topicId`. Plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-WRITE |
| Pagination | none |
| Idempotency / concurrency | `Idempotency-Key` required, scope `note.create`, 7 day retention (CONVENTIONS section 7). No `If-Match` on create. |

#### NOTE-03 GET /api/app/notes/{noteId}

| Field | Specification |
|---|---|
| Purpose | Read one note with raw Markdown and `version` for editing and conflict comparison. |
| Phase / FR | MVP / FR-100, FR-103 |
| Authentication | S |
| Authorization | owner (cross-user = 404) |
| Request parameters | Path: `noteId` (`Id`; malformed is `not_found`). |
| Request body | none |
| Response | 200 `Note` including raw `body`, with `ETag`. |
| Validation rules | Returns the raw Markdown only; rendering is NOTE-05. A note whose subject is archived is hidden with it (FR-104, EC-007) and reads as `not_found` until the subject is restored. |
| Error responses | `not_found` 404: missing, deleted, foreign, or subject archived. Plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-READ |
| Pagination | none |
| Idempotency / concurrency | read only |

#### NOTE-04 PATCH /api/app/notes/{noteId}

| Field | Specification |
|---|---|
| Purpose | Save an edit or an autosave (every autosave is a normal save carrying the known version, FR-102). |
| Phase / FR | MVP / FR-100, FR-102, FR-103 |
| Authentication | S |
| Authorization | owner (cross-user = 404) |
| Request parameters | Path: `noteId`. Headers: `If-Match` (required, `"<version>"`), `Origin`, `Content-Type: application/json`. |
| Request body | `UpdateNoteInput` |
| Response | 200 `Note` with the new `ETag`; `version` increases by 1 (AC-FR-100-3). |
| Validation rules | At least one field. `title` 1..200. `body` at most 100000 characters. `subjectId` and `topicId` may change; `topicId` must belong to the resulting subject. A stale save is never merged (EC-020, AC-FR-103-1): the client shows both versions from `details.current` and then retries with the current `If-Match` ("keep mine"), re-sends only the other version's fields ("keep theirs"), or posts a copy through NOTE-02 ("keep both"). The client sends no request for an unchanged note (AC-FR-102-4). |
| Error responses | `version_required` 400: no `If-Match`. `stale_version` 409: `details.current` is the full current `Note` including `body`. `input_too_large` 400: `body` over 100000 characters. `subject_archived` 409: the note's subject or the target subject is archived. `not_found` 404: unknown or foreign note, subject or topic. Plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-WRITE (autosave every 5 s is 12 per minute per open note) |
| Pagination | none |
| Idempotency / concurrency | `If-Match` required (ADR-011, EC-020). No `Idempotency-Key`. |

#### NOTE-05 GET /api/app/notes/{noteId}/render

| Field | Specification |
|---|---|
| Purpose | Return the note as sanitized HTML for display. |
| Phase / FR | MVP / FR-101 |
| Authentication | S |
| Authorization | owner (cross-user = 404) |
| Request parameters | Path: `noteId`. Query: `allowImages` (bool, default false). |
| Request body | none (query is `RenderNoteQuery`) |
| Response | 200 `RenderedNote` (`html`). |
| Validation rules | Sanitization happens here at display time; stored Markdown is unchanged (ADR-007, NFR-015). Scripts, event handlers, raw HTML and `javascript:` links are neutralised (AC-FR-101-1, AC-FR-101-2). External links carry a `rel` attribute. External images are not emitted as loadable images unless `allowImages=true` (AC-FR-101-4). Same hidden-note rule as NOTE-03. |
| Error responses | `not_found` 404: missing, foreign, or subject archived. Plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-READ |
| Pagination | none |
| Idempotency / concurrency | read only |

#### NOTE-06 DELETE /api/app/notes/{noteId}

| Field | Specification |
|---|---|
| Purpose | Delete a note after the client's confirmation. |
| Phase / FR | MVP / FR-104 |
| Authentication | S |
| Authorization | owner (cross-user = 404) |
| Request parameters | Path: `noteId`. Headers: `If-Match` (required), `Origin`. |
| Request body | none |
| Response | 204, no body. |
| Validation rules | The note disappears from subject and topic views (AC-FR-104-1). A note on an archived subject cannot be deleted; the user restores the subject first (FR-104 edge, EC-007). |
| Error responses | `version_required` 400: no `If-Match`. `stale_version` 409: `details.current` is the current `Note`. `subject_archived` 409: the note's subject is archived. `not_found` 404: missing, already deleted or foreign. Plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-WRITE |
| Pagination | none |
| Idempotency / concurrency | `If-Match` required (ADR-011). No `Idempotency-Key`. |

### 3.11 Flashcards

Revision flashcards with a daily spaced-repetition review queue (FR-107..112). Phase 2; contracts are non-binding until Phase 2 starts.

| ID | Method path | FR | Phase | Summary |
|---|---|---|---|---|
| FLASH-01 | GET /api/app/flashcards | 107 | 2 | Cursor-paginated card list |
| FLASH-02 | POST /api/app/flashcards | 107 | 2 | Create a card, due immediately |
| FLASH-03 | PATCH /api/app/flashcards/{cardId} | 108 | 2 | Edit a card without resetting its schedule |
| FLASH-04 | DELETE /api/app/flashcards/{cardId} | 108 | 2 | Delete a card |
| FLASH-05 | GET /api/app/flashcards/review-queue | 109, 111 | 2 | Cards due today, capped by the daily limit |
| FLASH-06 | POST /api/app/flashcards/{cardId}/reviews | 110, 112 | 2 | Record one rating and reschedule |
| FLASH-07 | GET /api/app/flashcards/settings | 111 | 2 | Read the daily review limit |
| FLASH-08 | PATCH /api/app/flashcards/settings | 111 | 2 | Change the daily review limit |

#### FLASH-01 GET /api/app/flashcards

| Field | Specification |
|---|---|
| Purpose | List the caller's cards for management, optionally per subject or topic. |
| Phase / FR | 2 / FR-107, FR-224 |
| Authentication | S |
| Authorization | owner (cross-user = 404) |
| Request parameters | Query: `subjectId` (`Id`), `topicId` (`Id`), `limit` (int 1..100, default 50), `cursor` (`Cursor`). |
| Request body | none (query is `FlashcardListQuery`) |
| Response | 200 `{ data: Flashcard[], page: PageInfo }`. |
| Validation rules | A card linked to a topic is listed under that topic (AC-FR-107-4). `subjectId` and `topicId` must be owned records; `topicId` must belong to `subjectId` when both are sent. `ease` is never returned. |
| Error responses | `invalid_page_size` 400: `limit` outside 1..100. `invalid_cursor` 400: malformed or tampered cursor. `not_found` 404: `subjectId` or `topicId` not owned. Plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-READ |
| Pagination | Cursor. Order `createdAt` descending, then `id` descending. |
| Idempotency / concurrency | read only |

#### FLASH-02 POST /api/app/flashcards

| Field | Specification |
|---|---|
| Purpose | Create a flashcard that is due immediately. |
| Phase / FR | 2 / FR-107 |
| Authentication | S |
| Authorization | owner (cross-user = 404) |
| Request parameters | Headers: `Idempotency-Key` (required, `IdempotencyKeyHeader`), `Origin`, `Content-Type: application/json`. |
| Request body | `CreateFlashcardInput` |
| Response | 201 `Flashcard` with `Location: /api/app/flashcards/{cardId}` and `ETag`. A replay returns the stored 201 with `Idempotent-Replay: true`. |
| Validation rules | `front` and `back` each 1..1000 characters, both required (AC-FR-107-2, AC-FR-107-3). `topicId` requires `subjectId` and must belong to it, else `validation_failed`. New card: `dueDate` = today in the profile zone (BR-030), `intervalDays` 0, `repetitions` 0, `lapses` 0. |
| Error responses | `subject_archived` 409: `subjectId` references an archived subject (BR-029). `idempotency_key_required` 400: header missing. `idempotency_key_reused` 409: same key, different request. `request_in_progress` 409: same key still executing. `not_found` 404: unknown or foreign `subjectId` or `topicId`. Plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-WRITE |
| Pagination | none |
| Idempotency / concurrency | `Idempotency-Key` required, scope `flashcard.create`, 7 day retention (CONVENTIONS section 7). No `If-Match` on create. |

#### FLASH-03 PATCH /api/app/flashcards/{cardId}

| Field | Specification |
|---|---|
| Purpose | Edit front, back or subject/topic link; the schedule is not reset. |
| Phase / FR | 2 / FR-108 |
| Authentication | S |
| Authorization | owner (cross-user = 404) |
| Request parameters | Path: `cardId` (`Id`). Headers: `If-Match` (required), `Origin`, `Content-Type: application/json`. |
| Request body | `UpdateFlashcardInput` |
| Response | 200 `Flashcard` with the new `ETag`; `dueDate`, `intervalDays`, `repetitions`, `lapses` are unchanged (AC-FR-108-1). |
| Validation rules | At least one field. `front` and `back` 1..1000 when present. `topicId` must belong to the resulting `subjectId`. `subjectId: null` also clears `topicId`. |
| Error responses | `version_required` 400: no `If-Match`. `stale_version` 409: `details.current` is the current `Flashcard` (AC-FR-108-3, EC-020). `subject_archived` 409: new `subjectId` is archived. `not_found` 404: unknown, deleted or foreign card, subject or topic (AC-FR-108-4). Plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-WRITE |
| Pagination | none |
| Idempotency / concurrency | `If-Match` required (ADR-011). No `Idempotency-Key`. |

#### FLASH-04 DELETE /api/app/flashcards/{cardId}

| Field | Specification |
|---|---|
| Purpose | Delete a card; its review history is deleted with it. |
| Phase / FR | 2 / FR-108 |
| Authentication | S |
| Authorization | owner (cross-user = 404) |
| Request parameters | Path: `cardId`. Headers: `If-Match` (required), `Origin`. |
| Request body | none |
| Response | 204, no body. |
| Validation rules | The card never appears in any queue again (AC-FR-108-2). Reviews cascade (DATA-DICTIONARY `card_reviews.card_id`). |
| Error responses | `version_required` 400: no `If-Match`. `stale_version` 409: `details.current` is the current `Flashcard`. `not_found` 404: missing, already deleted or foreign. Plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-WRITE |
| Pagination | none |
| Idempotency / concurrency | `If-Match` required (ADR-011). No `Idempotency-Key`. |

#### FLASH-05 GET /api/app/flashcards/review-queue

| Field | Specification |
|---|---|
| Purpose | Return the cards to review now: due today or earlier in the profile zone, overdue first, at most the remaining daily limit. |
| Phase / FR | 2 / FR-109, FR-111 |
| Authentication | S |
| Authorization | owner (cross-user = 404) |
| Request parameters | none |
| Request body | none |
| Response | 200 `ReviewQueue` (`data: ReviewQueueItem[]`, `remainingToday`). |
| Validation rules | A card is due when `dueDate` is on or before today in the current profile zone, so a timezone change moves due status immediately (AC-FR-109-3, EC-006, BR-030). Order: most overdue first, then `id`. `data` length is at most `remainingToday`, where `remainingToday` = daily review limit (FLASH-07) minus reviews recorded today (including repeats after Again, FR-111). Limit reached: `data: []` and `remainingToday: 0` (AC-FR-111-3). No due cards: `data: []`, which is an empty state, not an error. |
| Error responses | Common set only (API-ENDPOINTS section 1). |
| Rate limit | RL-READ |
| Pagination | not paginated (bounded by the daily limit, at most 500) |
| Idempotency / concurrency | read only |

#### FLASH-06 POST /api/app/flashcards/{cardId}/reviews

| Field | Specification |
|---|---|
| Purpose | Record one rating for a revealed card and apply the new schedule. |
| Phase / FR | 2 / FR-110, FR-112 |
| Authentication | S |
| Authorization | owner (cross-user = 404) |
| Request parameters | Path: `cardId`. Headers: `Idempotency-Key` (required, stored as `card_reviews.request_key`), `Origin`, `Content-Type: application/json`. |
| Request body | `CreateCardReviewInput` |
| Response | 201 `CardReview` (updated `card`, `rating`, `reviewedAt`, `dueDateAfter`, `intervalDaysAfter`). No `Location`; reviews are not addressable. A replay returns the existing review with 201 and `Idempotent-Replay: true` (AC-FR-110-3, EC-021). |
| Validation rules | `rating` is `again`, `hard`, `good` or `easy`; any other value is `validation_failed` (AC-FR-110-4). Server time is `reviewedAt`; `local_date` is the profile-zone date at review time (AC-FR-112-4). `again` leaves the card due the same local day (AC-FR-112-1); `hard` interval is at most the `good` interval and at least 1 day; `easy` is the longest (AC-FR-112-2, AC-FR-112-3). The review count includes Again repeats toward the daily limit (FR-111). Reviewing does not require a running session. |
| Error responses | `idempotency_key_required` 400: header missing. `idempotency_key_reused` 409: same key sent for a different card or rating. `request_in_progress` 409: same key still executing. `not_found` 404: unknown, deleted or foreign card. Plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-WRITE |
| Pagination | none |
| Idempotency / concurrency | `Idempotency-Key` required; persisted in `card_reviews.request_key` with `UNIQUE (user_id, request_key)` (CONVENTIONS section 7). No `If-Match`: the card `version` is incremented by the scheduler, but the review is not version-gated. |

#### FLASH-07 GET /api/app/flashcards/settings

| Field | Specification |
|---|---|
| Purpose | Read the daily review limit. |
| Phase / FR | 2 / FR-111 |
| Authentication | S |
| Authorization | owner (cross-user = 404) |
| Request parameters | none |
| Request body | none |
| Response | 200 `FlashcardSettings` (`dailyReviewLimit`). |
| Validation rules | When no settings row exists, the default 50 from configuration is returned (AC-FR-111-1, NFR-062; the row is created on first change per DATA-LIFECYCLE). No `version` field. |
| Error responses | Common set only (API-ENDPOINTS section 1). |
| Rate limit | RL-READ |
| Pagination | none |
| Idempotency / concurrency | read only |

#### FLASH-08 PATCH /api/app/flashcards/settings

| Field | Specification |
|---|---|
| Purpose | Change the daily review limit; applies from the current day. |
| Phase / FR | 2 / FR-111 |
| Authentication | S |
| Authorization | owner (cross-user = 404) |
| Request parameters | Headers: `Origin`, `Content-Type: application/json`. No `If-Match` (settings table has no version). |
| Request body | `UpdateFlashcardSettingsInput` |
| Response | 200 `FlashcardSettings`. |
| Validation rules | `dailyReviewLimit` is an integer 1..500; 0 and 501 are rejected with `validation_failed` and the previous value is kept (AC-FR-111-4). Creates the settings row if absent. Reviews already recorded today still count against the new limit. |
| Error responses | Common set only (API-ENDPOINTS section 1). |
| Rate limit | RL-WRITE |
| Pagination | none |
| Idempotency / concurrency | none (idempotent set): no `Idempotency-Key`, no `If-Match`; last write wins. |

### 3.12 Goals

Daily study goal, optional per-subject goals and daily progress (FR-070..074). Goal history stays internal to the Goals module and is not exposed (BR-015).

| ID | Method path | FR | Phase | Summary |
|---|---|---|---|---|
| GOAL-01 | GET /api/app/goals | 070, 071 | MVP | Daily target in force today and subject targets |
| GOAL-02 | PUT /api/app/goals/daily | 070, 074 | MVP | Set the daily target from today forward |
| GOAL-03 | PUT /api/app/goals/subjects/{subjectId} | 071 | MVP | Set a subject target |
| GOAL-04 | DELETE /api/app/goals/subjects/{subjectId} | 071 | MVP | Remove a subject target |
| GOAL-05 | GET /api/app/goals/progress | 072, 073 | MVP | Minutes against target for one day |

#### GOAL-01 GET /api/app/goals

| Field | Specification |
|---|---|
| Purpose | Read the daily target in force today and every subject target, for the goal settings form. |
| Phase / FR | MVP / FR-070, FR-071 |
| Authentication | S |
| Authorization | owner (cross-user = 404) |
| Request parameters | none |
| Request body | none |
| Response | 200 `GoalSet` (`daily`: `DailyGoal`, `subjects`: `SubjectGoal[]`). |
| Validation rules | A new account returns `targetMinutes` 120 (AC-FR-070-1, BR-013). `daily.targetMinutes` is the row with the greatest `effectiveFrom` on or before today in the profile zone (BR-015). Goals of archived subjects are included with `subjectArchived: true` and are suspended until restore (AC-FR-071-4). |
| Error responses | Common set only (API-ENDPOINTS section 1). |
| Rate limit | RL-READ |
| Pagination | not paginated (bounded by the caller's subjects) |
| Idempotency / concurrency | read only |

#### GOAL-02 PUT /api/app/goals/daily

| Field | Specification |
|---|---|
| Purpose | Set the overall daily target; it applies to the current local day and later days, past days keep their own target. |
| Phase / FR | MVP / FR-070, FR-074 |
| Authentication | S |
| Authorization | owner (cross-user = 404) |
| Request parameters | Headers: `Origin`, `Content-Type: application/json`. No `If-Match` (goals are not versioned). |
| Request body | `SetDailyGoalInput` |
| Response | 200 `DailyGoal` (`targetMinutes`, `effectiveFrom` = today in the profile zone). |
| Validation rules | `targetMinutes` is a whole number 5..1440; 5 and 1440 accepted, 4 and 1441 rejected (AC-FR-070-3). Zero, negative and decimal values are `goal_out_of_range`; a non-numeric JSON type is `validation_failed`. A second change on the same day upserts the same history row (AC-FR-074-3, EC-005). Today's goal-met state is re-evaluated at once (AC-FR-074-2). |
| Error responses | `goal_out_of_range` 400: value outside 5..1440 or not a whole number (EC-023); previous value kept. Plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-WRITE |
| Pagination | none |
| Idempotency / concurrency | none (idempotent set): no `Idempotency-Key`, no `If-Match`; last write wins. |

#### GOAL-03 PUT /api/app/goals/subjects/{subjectId}

| Field | Specification |
|---|---|
| Purpose | Set or replace the optional daily target of one subject. |
| Phase / FR | MVP / FR-071 |
| Authentication | S |
| Authorization | owner (cross-user = 404) |
| Request parameters | Path: `subjectId` (`Id`). Headers: `Origin`, `Content-Type: application/json`. No `If-Match`. |
| Request body | `SetSubjectGoalInput` |
| Response | 200 `SubjectGoal`. |
| Validation rules | `targetMinutes` whole number 5..1440 (AC-FR-071-3). At most one target per subject per user (upsert). A subject target above the overall goal is allowed. The overall goal is unchanged. |
| Error responses | `goal_out_of_range` 400: value outside 5..1440 or not a whole number (EC-023). `subject_archived` 409: the subject is archived (BR-029). Plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-WRITE |
| Pagination | none |
| Idempotency / concurrency | none (idempotent set): no `Idempotency-Key`, no `If-Match`; last write wins. |

#### GOAL-04 DELETE /api/app/goals/subjects/{subjectId}

| Field | Specification |
|---|---|
| Purpose | Remove a subject target so the subject has no target. |
| Phase / FR | MVP / FR-071 |
| Authentication | S |
| Authorization | owner (cross-user = 404) |
| Request parameters | Path: `subjectId` (`Id`). Header: `Origin`. No `If-Match`. |
| Request body | none |
| Response | 204, no body. |
| Validation rules | Idempotent: 204 also when the subject has no target. Allowed for an archived subject. The overall goal is unchanged (AC-FR-071-2). |
| Error responses | Common set only (API-ENDPOINTS section 1); `not_found` when the subject is unknown or foreign. |
| Rate limit | RL-WRITE |
| Pagination | none |
| Idempotency / concurrency | none (idempotent set): no `Idempotency-Key`, no `If-Match`. |

#### GOAL-05 GET /api/app/goals/progress

| Field | Specification |
|---|---|
| Purpose | Show minutes studied against the target in force for one local day, overall and per subject with a goal. |
| Phase / FR | MVP / FR-072, FR-073 |
| Authentication | S |
| Authorization | owner (cross-user = 404) |
| Request parameters | Query: `date` (`LocalDate`, default today in the profile zone). |
| Request body | none (query is `GoalProgressQuery`) |
| Response | 200 `GoalProgress` (`date`, `minutes`, `targetMinutes`, `percent`, `goalMet`, `subjects`). |
| Validation rules | `minutes` sums allocated seconds of sessions whose frozen local date is `date`, manual entries included, midnight-crossing sessions split (BR-014, AC-FR-072-4). For today, the elapsed minutes of a running timer are included (AC-FR-072-2); clients refresh within 5 s of a timer state change. `targetMinutes` is the target in force on `date` (BR-015). `percent` may exceed 100. `goalMet` is true when `minutes` is at least `targetMinutes` (AC-FR-073-1, AC-FR-073-2). `subjects` lists only non-archived subjects with a goal. Malformed `date` is `validation_failed`. |
| Error responses | Common set only (API-ENDPOINTS section 1). |
| Rate limit | RL-READ |
| Pagination | not paginated (bounded) |
| Idempotency / concurrency | read only |

### 3.13 Calendar

Read-only month heatmap and day detail built from sessions and plan entries (FR-060..062). Editing goes through study planning.

| ID | Method path | FR | Phase | Summary |
|---|---|---|---|---|
| CAL-01 | GET /api/app/calendar/heatmap | 060 | MVP | Study minutes and intensity bucket for each day of a month |
| CAL-02 | GET /api/app/calendar/days/{date} | 061, 062 | MVP | Sessions, day total and plan entries of one day |

#### CAL-01 GET /api/app/calendar/heatmap

| Field | Specification |
|---|---|
| Purpose | Month grid: minutes per local day and the intensity bucket. |
| Phase / FR | MVP / FR-060 |
| Authentication | S |
| Authorization | owner (cross-user = 404) |
| Request parameters | Query: `month` (required, `YYYY-MM`, the month in the profile zone). |
| Request body | none (query is `CalendarMonthQuery`) |
| Response | 200 `CalendarMonth` (`month`, `days`: one `CalendarDay` per calendar day with `date`, `minutes`, `bucket`, `isToday`). |
| Validation rules | Missing or malformed `month` is `validation_failed`. `bucket` values: `0`, `1_59`, `60_119`, `120_plus` (AC-FR-060-1). `minutes` is always returned so the UI shows it as text (AC-FR-060-2). Days follow each session's frozen `localDate`, so a timezone change never moves past sessions (AC-FR-060-3, EC-006). Break time is excluded. Target: p95 under 1 s with 10,000 sessions (AC-FR-060-4, NFR-003). |
| Error responses | Common set only (API-ENDPOINTS section 1). |
| Rate limit | RL-HEAVY |
| Pagination | not paginated (bounded: at most 31 days) |
| Idempotency / concurrency | read only |

#### CAL-02 GET /api/app/calendar/days/{date}

| Field | Specification |
|---|---|
| Purpose | Day detail: the day's sessions, day total and plan entries with status. |
| Phase / FR | MVP / FR-061, FR-062 |
| Authentication | S |
| Authorization | owner (cross-user = 404) |
| Request parameters | Path: `date` (`LocalDate`, profile-zone local date). |
| Request body | none |
| Response | 200 `CalendarDayDetail` (`date`, `totalMinutes`, `sessions`, `planEntries`). |
| Validation rules | Malformed `date` is `validation_failed`. A session crossing midnight appears on both days, each with its own allocation in `dayAllocations`, and `totalMinutes` sums only that day's allocations (AC-FR-061-2, EC-009, BR-016). Sessions of archived subjects are included with `subjectName` and `subjectArchived: true` so the UI can label them "(archived)" (AC-FR-061-3). `planEntries` carry the derived status `upcoming`, `done` or `missed`, plus planned and actual minutes (AC-FR-062-2, AC-FR-062-3); entries of archived subjects are hidden (FR-062). A day with no data returns empty lists and `totalMinutes` 0 (AC-FR-061-4). |
| Error responses | Common set only (API-ENDPOINTS section 1). |
| Rate limit | RL-HEAVY |
| Pagination | not paginated (bounded: one day) |
| Idempotency / concurrency | read only |

### 3.14 Statistics

Read-only aggregates over `study_session_days`, plan entries and goal history for a local-date range of up to 24 months (FR-080..088). All views reconcile with each other (NFR-096). No write endpoints.

| ID | Method path | FR | Phase | Summary |
|---|---|---|---|---|
| STAT-01 | GET /api/app/stats/daily | 080, 088 | MVP | Minutes per day, timer and manual split |
| STAT-02 | GET /api/app/stats/weekly | 081 | MVP | Minutes per Monday-start week |
| STAT-03 | GET /api/app/stats/monthly | 082 | MVP | Minutes per calendar month |
| STAT-04 | GET /api/app/stats/by-subject | 083 | MVP | Minutes and share per subject |
| STAT-05 | GET /api/app/stats/goal-hit-rate | 084 | MVP | Days with the goal met out of eligible days |
| STAT-06 | GET /api/app/stats/planned-vs-actual | 085 | MVP | Planned against actual minutes with signed variance |

#### STAT-01 GET /api/app/stats/daily

| Field | Specification |
|---|---|
| Purpose | Total study minutes per local day, with the manual portion shown separately. The statistics page decides its empty state (fewer than 3 days with data, FR-087) from the days with minutes above 0. |
| Phase / FR | MVP / FR-080, FR-086, FR-088 |
| Authentication | S |
| Authorization | owner (cross-user = 404) |
| Request parameters | Query: `from` (`LocalDate`, default 29 days before `to`), `to` (`LocalDate`, default today in the profile zone). |
| Request body | none (query is `StatsRangeQuery`) |
| Response | 200 `StatsDaily` (`from`, `to`, `days`: `date`, `minutes`, `timerMinutes`, `manualMinutes`; `totalMinutes`). |
| Validation rules | `from` not after `to`. Span at most 24 months: exactly 24 months accepted, 24 months plus 1 day rejected (AC-FR-086-2, AC-FR-086-3). Days without sessions are returned with 0 (AC-FR-080-2). `minutes` equals `timerMinutes` plus `manualMinutes` (AC-FR-088-1, AC-FR-088-4). Sum of `days` equals the sum of session allocations in the range (AC-FR-080-4). Buckets use frozen local dates (EC-006). Target: p95 under 1 s for 10,000 sessions (NFR-003). |
| Error responses | `invalid_date_range` 400: `from` after `to`, or span over 24 months (FR-086). Plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-HEAVY |
| Pagination | not paginated (bounded: at most about 731 days) |
| Idempotency / concurrency | read only |

#### STAT-02 GET /api/app/stats/weekly

| Field | Specification |
|---|---|
| Purpose | Total study minutes per week. |
| Phase / FR | MVP / FR-081, FR-086 |
| Authentication | S |
| Authorization | owner (cross-user = 404) |
| Request parameters | Query: `from`, `to` as in STAT-01 (`StatsRangeQuery`). |
| Request body | none |
| Response | 200 `StatsWeekly` (`from`, `to`, `weeks`: `weekStart`, `minutes`, `partial`; `totalMinutes`). |
| Validation rules | Same range rules as STAT-01. Weeks start on Monday (data-driven default, FR-081). A partial first or last week counts only days inside the range and has `partial: true` (AC-FR-081-2). A midnight-crossing session splits between weeks by day allocation (AC-FR-081-3). `totalMinutes` equals the STAT-01 total for the same range (AC-FR-081-4). |
| Error responses | `invalid_date_range` 400: `from` after `to`, or span over 24 months. Plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-HEAVY |
| Pagination | not paginated (bounded: at most about 105 weeks) |
| Idempotency / concurrency | read only |

#### STAT-03 GET /api/app/stats/monthly

| Field | Specification |
|---|---|
| Purpose | Total study minutes per calendar month. |
| Phase / FR | MVP / FR-082, FR-086 |
| Authentication | S |
| Authorization | owner (cross-user = 404) |
| Request parameters | Query: `from`, `to` as in STAT-01 (`StatsRangeQuery`). |
| Request body | none |
| Response | 200 `StatsMonthly` (`from`, `to`, `months`: `month`, `minutes`, `current`; `totalMinutes`). |
| Validation rules | Same range rules as STAT-01. Months are local-day months in the profile zone; months with no sessions return 0; the month in progress has `current: true` and shows minutes to date (AC-FR-082-3). A 24-month range returns 24 rows (AC-FR-082-4). Midnight-crossing sessions split by day allocation (AC-FR-082-2). |
| Error responses | `invalid_date_range` 400: `from` after `to`, or span over 24 months. Plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-HEAVY |
| Pagination | not paginated (bounded: at most 25 months) |
| Idempotency / concurrency | read only |

#### STAT-04 GET /api/app/stats/by-subject

| Field | Specification |
|---|---|
| Purpose | Study minutes per subject with each subject's share of the total. |
| Phase / FR | MVP / FR-083, FR-086 |
| Authentication | S |
| Authorization | owner (cross-user = 404) |
| Request parameters | Query: `from`, `to` as in STAT-01 (`StatsRangeQuery`). |
| Request body | none |
| Response | 200 `StatsBySubject` (`from`, `to`, `subjects`: `subjectId`, `name`, `archived`, `minutes`, `percent`; `totalMinutes`). |
| Validation rules | Same range rules as STAT-01. Archived subjects stay included with `archived: true` so the UI can label them "(archived)" (AC-FR-083-2, BR-029, EC-007). `percent` values are whole numbers that sum to exactly 100 when `totalMinutes` is above 0 (AC-FR-083-1, AC-FR-083-4). Subject minutes sum to `totalMinutes`. |
| Error responses | `invalid_date_range` 400: `from` after `to`, or span over 24 months. Plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-HEAVY |
| Pagination | not paginated (bounded by the caller's subjects) |
| Idempotency / concurrency | read only |

#### STAT-05 GET /api/app/stats/goal-hit-rate

| Field | Specification |
|---|---|
| Purpose | Share of days in the range on which the goal in force that day was met. |
| Phase / FR | MVP / FR-084, FR-086 |
| Authentication | S |
| Authorization | owner (cross-user = 404) |
| Request parameters | Query: `from`, `to` as in STAT-01 (`StatsRangeQuery`). |
| Request body | none |
| Response | 200 `StatsGoalHitRate`: `{ from, to, daysMet, daysTotal, percent }` or `{ from, to, noData: true }`. |
| Validation rules | Same range rules as STAT-01. Each day is judged against the target in force on that day (BR-015, AC-FR-084-2). Days before the account was created are excluded from `daysTotal` (AC-FR-084-3). Days below target count in the denominator, without penalty (EC-004). No eligible day gives `noData: true`, not 0 percent (AC-FR-084-4). |
| Error responses | `invalid_date_range` 400: `from` after `to`, or span over 24 months. Plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-HEAVY |
| Pagination | none |
| Idempotency / concurrency | read only |

#### STAT-06 GET /api/app/stats/planned-vs-actual

| Field | Specification |
|---|---|
| Purpose | Compare planned minutes with actual minutes per day, subject and plan entry. |
| Phase / FR | MVP / FR-085, FR-086 |
| Authentication | S |
| Authorization | owner (cross-user = 404) |
| Request parameters | Query: `from`, `to` as in STAT-01 (`StatsRangeQuery`). |
| Request body | none |
| Response | 200 `StatsPlannedVsActual` (`from`, `to`, `byDay`, `bySubject`, `byEntry`, `hasPlan`). |
| Validation rules | Same range rules as STAT-01. `varianceMin` is signed actual minus planned (AC-FR-085-1, AC-FR-085-2; BR-004). Planned and actual are computed independently and never merged (BR-002). Sessions without a plan link add actual but 0 planned (AC-FR-085-3). A missed entry without sessions counts its planned minutes with actual 0 (AC-FR-085-4). No plan entries in the range gives `hasPlan: false` with actual only. |
| Error responses | `invalid_date_range` 400: `from` after `to`, or span over 24 months. Plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-HEAVY |
| Pagination | not paginated (bounded by the range, at most 24 months) |
| Idempotency / concurrency | read only |

### 3.15 Gamification

Read-only view of streak, XP and level (FR-160..164, FR-170..177). Phase 2; evaluation runs in jobs and event handlers, so there is no write endpoint.

| ID | Method path | FR | Phase | Summary |
|---|---|---|---|---|
| GAME-01 | GET /api/app/gamification | 160, 161, 162, 163, 164, 170, 171, 172, 173, 174, 175, 176, 177 | 2 | Streak, longest streak, freeze, XP and level |

#### GAME-01 GET /api/app/gamification

| Field | Specification |
|---|---|
| Purpose | Show the current streak, longest streak, weekly freeze availability, XP total and level progress. |
| Phase / FR | 2 / FR-160, FR-161, FR-162, FR-163, FR-164, FR-170, FR-171, FR-172, FR-173, FR-174, FR-175, FR-176, FR-177 |
| Authentication | S |
| Authorization | owner (cross-user = 404) |
| Request parameters | none |
| Request body | none |
| Response | 200 `Gamification` (`currentStreak`, `longestStreak`, `todayPending`, `freezeAvailable`, `xpTotal`, `level`, `xpInLevel`, `xpToNextLevel`, `xpToday`, `dailyCapReached`). |
| Validation rules | Streak counts consecutive days with the goal met, ending today or yesterday; `todayPending` is true while today is in progress and not yet met (AC-FR-160-2). A day resets the streak only after the local day ends and no freeze covers it (FR-161, FR-162). `longestStreak` never decreases (AC-FR-163-2). A timezone change never lowers a streak (FR-164). Level is the largest n with 100·n(n+1)/2 at most `xpTotal` (99 XP gives level 0, 300 gives 2, 599 gives level 2 with `xpToNextLevel` 1; AC-FR-175-1..3). Manual entries and sessions excluded by FR-174 give no XP. Awards are idempotent per source event (EC-017, FR-176). The XP ledger itself is not exposed. |
| Error responses | Common set only (API-ENDPOINTS section 1). |
| Rate limit | RL-READ |
| Pagination | none |
| Idempotency / concurrency | read only |

### 3.16 Notifications

In-app notifications, reminder preferences and browser push subscriptions (FR-150..154). Phase 2; contracts are non-binding until Phase 2 starts. Reminder creation and delivery are jobs; the endpoints only read, dismiss and configure.

| ID | Method path | FR | Phase | Summary |
|---|---|---|---|---|
| NOTIF-01 | GET /api/app/notifications | 152 | 2 | Cursor-paginated in-app notifications |
| NOTIF-02 | POST /api/app/notifications/{notificationId}/dismiss | 152 | 2 | Dismiss one notification |
| NOTIF-03 | GET /api/app/notifications/preferences | 154 | 2 | Read reminder preferences |
| NOTIF-04 | PATCH /api/app/notifications/preferences | 150, 151, 154 | 2 | Change reminder preferences |
| NOTIF-05 | POST /api/app/notifications/push-subscriptions | 153 | 2 | Register a browser push subscription |
| NOTIF-06 | DELETE /api/app/notifications/push-subscriptions/{subscriptionId} | 153 | 2 | Remove a push subscription |
| NOTIF-07 | POST /api/app/notifications/push-subscriptions/{subscriptionId}/test | 153 | 2 | Send a test push |

#### NOTIF-01 GET /api/app/notifications

| Field | Specification |
|---|---|
| Purpose | List the caller's notifications, newest first, for the in-app indicator. The client refresh cadence (FR-152: shown within 5 s of firing) is a Phase 7 decision. |
| Phase / FR | 2 / FR-152, FR-224 |
| Authentication | S |
| Authorization | owner (cross-user = 404) |
| Request parameters | Query: `limit` (int 1..100, default 50), `cursor` (`Cursor`). |
| Request body | none (query is `NotificationListQuery`) |
| Response | 200 `{ data: Notification[], page: PageInfo }`. |
| Validation rules | Dismissed notifications are returned with `dismissedAt` set so the client does not show them again (AC-FR-152-2). `body` is at most 300 characters. |
| Error responses | `invalid_page_size` 400: `limit` outside 1..100. `invalid_cursor` 400: malformed or tampered cursor. Plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-READ |
| Pagination | Cursor. Order `dueAt` descending, then `id` descending. |
| Idempotency / concurrency | read only |

#### NOTIF-02 POST /api/app/notifications/{notificationId}/dismiss

| Field | Specification |
|---|---|
| Purpose | Dismiss a notification. |
| Phase / FR | 2 / FR-152 |
| Authentication | S |
| Authorization | owner (cross-user = 404) |
| Request parameters | Path: `notificationId` (`Id`). Header: `Origin`. No `If-Match` (notifications are not versioned). |
| Request body | none |
| Response | 200 `Notification` with `dismissedAt` set. |
| Validation rules | Idempotent: dismissing an already dismissed notification returns 200 and keeps the first `dismissedAt`. |
| Error responses | Common set only (API-ENDPOINTS section 1); `not_found` when the notification is unknown or foreign. |
| Rate limit | RL-WRITE |
| Pagination | none |
| Idempotency / concurrency | none (idempotent set): no `Idempotency-Key` (an action on an existing resource, not a create), no `If-Match`. |

#### NOTIF-03 GET /api/app/notifications/preferences

| Field | Specification |
|---|---|
| Purpose | Read reminder preferences. |
| Phase / FR | 2 / FR-154 |
| Authentication | S |
| Authorization | owner (cross-user = 404) |
| Request parameters | none |
| Request body | none |
| Response | 200 `NotificationPreferences` with `ETag`. |
| Validation rules | A new account returns all reminders off, `dailyReminderTime` 19:00 and `planReminderLeadMin` 10 (AC-FR-154-1). The row is created on first change (DATA-LIFECYCLE), so until then the defaults are returned with `version: 0` (same lazy-row rule as TIM-08, CONVENTIONS section 6). Push on/off is derived from the browser's subscription (NOTIF-05, NOTIF-06), not stored here. |
| Error responses | Common set only (API-ENDPOINTS section 1). |
| Rate limit | RL-READ |
| Pagination | none |
| Idempotency / concurrency | read only |

#### NOTIF-04 PATCH /api/app/notifications/preferences

| Field | Specification |
|---|---|
| Purpose | Change reminder preferences; reminder jobs are rescheduled for the new settings. |
| Phase / FR | 2 / FR-150, FR-151, FR-154 |
| Authentication | S |
| Authorization | owner (cross-user = 404) |
| Request parameters | Headers: `If-Match` (`"<version>"`; may be omitted or `"0"` for the first save while GET returned `version: 0`), `Origin`, `Content-Type: application/json`. |
| Request body | `UpdateNotificationPreferencesInput` |
| Response | 200 `NotificationPreferences` with the new `ETag`. |
| Validation rules | At least one field. `dailyReminderTime` is `HH:mm` from 00:00 to 23:59, interpreted in the profile zone (BR-030). `planReminderLeadMin` is an integer 0..120. Disabling takes effect immediately and no reminder is delivered afterwards (AC-FR-154-3). A timezone change re-resolves the daily reminder without duplicates (EC-006). A failed save keeps the client's entered values (FR-154 edge). |
| Error responses | `version_required` 400: no `If-Match` although the row exists. `stale_version` 409: version differs, `details.current` is the current `NotificationPreferences` (EC-020). Plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-WRITE |
| Pagination | none |
| Idempotency / concurrency | `If-Match` required once the row exists (ADR-011). No `Idempotency-Key`. |

#### NOTIF-05 POST /api/app/notifications/push-subscriptions

| Field | Specification |
|---|---|
| Purpose | Register the browser's push subscription after the user explicitly opted in. |
| Phase / FR | 2 / FR-153 |
| Authentication | S |
| Authorization | owner (cross-user = 404) |
| Request parameters | Headers: `Origin`, `Content-Type: application/json`, `User-Agent` (stored as `userAgent`). No `If-Match` (not versioned). |
| Request body | `CreatePushSubscriptionInput` |
| Response | 201 `PushSubscription` with `Location: /api/app/notifications/push-subscriptions/{subscriptionId}` when new; 200 `PushSubscription` when the `endpoint` already belongs to the caller (upsert). `p256dh` and `auth` are never returned. |
| Validation rules | `endpoint` must be an HTTPS URL; `keys.p256dh` and `keys.auth` are required non-empty strings. Upsert by `endpoint`. Proposal: an `endpoint` already stored for another account is re-bound to the caller and the older row removed, so one browser serves one account and the other account is not revealed. Permission is requested by the client only after an explicit user action (FR-153); a denied permission never calls this endpoint (EC-024). |
| Error responses | Common set only (API-ENDPOINTS section 1). |
| Rate limit | RL-WRITE |
| Pagination | none |
| Idempotency / concurrency | none (idempotent set): `Idempotency-Key` not required because the upsert by `endpoint` is naturally idempotent (plan inventory decision); no `If-Match`. |

#### NOTIF-06 DELETE /api/app/notifications/push-subscriptions/{subscriptionId}

| Field | Specification |
|---|---|
| Purpose | Turn push off for one browser by removing its subscription. |
| Phase / FR | 2 / FR-153 |
| Authentication | S |
| Authorization | owner (cross-user = 404) |
| Request parameters | Path: `subscriptionId` (`Id`). Header: `Origin`. No `If-Match`. |
| Request body | none |
| Response | 204, no body. |
| Validation rules | Hard delete. No push is sent to that subscription after the call (AC-FR-153-3). |
| Error responses | Common set only (API-ENDPOINTS section 1); `not_found` when the subscription is unknown, already removed or foreign. |
| Rate limit | RL-WRITE |
| Pagination | none |
| Idempotency / concurrency | none (idempotent set): no `Idempotency-Key`, no `If-Match`. |

#### NOTIF-07 POST /api/app/notifications/push-subscriptions/{subscriptionId}/test

| Field | Specification |
|---|---|
| Purpose | Enqueue a test push to one subscription so the user can confirm push works. |
| Phase / FR | 2 / FR-153 |
| Authentication | S |
| Authorization | owner (cross-user = 404) |
| Request parameters | Path: `subscriptionId` (`Id`). Header: `Origin`. |
| Request body | none |
| Response | 202, no body. Delivery is asynchronous through a push job; the notification should arrive within 10 s (AC-FR-153-1). |
| Validation rules | The payload carries only a notification id and a generic title, no study content (Reconciliation 12, NFR-033). A 404 or 410 from the push service during delivery deletes the subscription (EXTERNAL-INTEGRATIONS). |
| Error responses | Common set only (API-ENDPOINTS section 1); `not_found` when the subscription is unknown or foreign. |
| Rate limit | RL-HEAVY |
| Pagination | none |
| Idempotency / concurrency | none (action, not a create): no `Idempotency-Key`, no `If-Match`; each call enqueues one push and is bounded by RL-HEAVY. |

### 3.17 AI scheduling

Phase 3 asynchronous schedule generation: consent, quota, request, poll, accept and discard. Behaviour, validation reasons, failure handling and privacy rules are defined in [AI-INTEGRATION.md](AI-INTEGRATION.md); this section fixes only the HTTP contract (FR-190..198, EC-015, EC-016).

| ID | Method path | FR | Phase | Summary |
|---|---|---|---|---|
| AI-01 | GET /api/app/ai/consent | 192 | 3 | Latest consent decision and the wording version a new decision must carry |
| AI-02 | PUT /api/app/ai/consent | 192 | 3 | Grant or revoke consent (appends a decision) |
| AI-03 | GET /api/app/ai/quota | 196 | 3 | Daily generation quota: limit, used, remaining, reset date |
| AI-04 | POST /api/app/ai/schedule-requests | 190, 191, 198 | 3 | Start an asynchronous schedule generation (202, then poll) |
| AI-05 | GET /api/app/ai/schedule-requests/{requestId} | 193, 197 | 3 | Poll a request: status, proposal, removed-entry counts, error code |
| AI-06 | POST /api/app/ai/schedule-requests/{requestId}/accept | 195 | 3 | Accept the proposal as ordinary plan entries, all or nothing |
| AI-07 | POST /api/app/ai/schedule-requests/{requestId}/discard | 195 | 3 | Discard the proposal; no plan entries are created |

#### AI-01 GET /api/app/ai/consent

| Field | Specification |
|---|---|
| Purpose | Return the caller's current consent to share study data with the AI provider (the latest `ai_consents` row for feature `ai_schedule`) and the wording version a new decision must carry. |
| Phase / FR | 3 / FR-192, NFR-036 |
| Authentication | S |
| Authorization | owner (reads only the caller's decision) |
| Request parameters | path: none<br>query: none<br>headers: none beyond the session cookie |
| Request body | none |
| Response | 200 `AiConsent`. With no decision on record: `granted` is `false` and `decidedAt` is `null`. No `ETag` (append-only data, not versioned). |
| Validation rules | No input. The wording text is not part of the API; `currentWordingVersion` identifies the text the client shows (legal review pending, U-4). |
| Error responses | No endpoint-specific codes; plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-READ |
| Pagination | none |
| Idempotency / concurrency | read only |

#### AI-02 PUT /api/app/ai/consent

| Field | Specification |
|---|---|
| Purpose | Record a consent decision: grant (`granted: true`) or withdraw (`granted: false`). Withdrawal applies to every future request at once and does not delete plan entries accepted earlier (FR-192). |
| Phase / FR | 3 / FR-192, NFR-036 |
| Authentication | S |
| Authorization | owner |
| Request parameters | path: none<br>query: none<br>headers: `Origin` (CSRF check) |
| Request body | `SetAiConsentInput` |
| Response | 200 `AiConsent` (the resulting current decision). No `ETag`. |
| Validation rules | `granted` is a required boolean; nothing is implied by omission, so the unchecked default of FR-192 AC-2 is enforced by the client sending an explicit value. `wordingVersion` must equal `currentWordingVersion` from AI-01, else `validation_failed` naming the field. Withdrawal while a request is `pending`: the worker re-reads the latest decision before the provider call and ends the request `failed` with `errorCode` `consent_required` and no quota use (AI-INTEGRATION section 7). If the decision cannot be stored the call fails and no request may start (FR-192 errors). Logs `ai_consent_granted` or `ai_consent_revoked` (API-SECURITY section 8.2). |
| Error responses | No endpoint-specific codes; plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-WRITE |
| Pagination | none |
| Idempotency / concurrency | none (idempotent set): no `Idempotency-Key` and no `If-Match` (append-only, not versioned). A row is appended only when `granted` or `wordingVersion` differs from the latest row; repeating the current decision appends nothing and returns the same 200 body. |

#### AI-03 GET /api/app/ai/quota

| Field | Specification |
|---|---|
| Purpose | Show how many generations remain today so the request screen displays a number from 0 to 5 (AC-FR-196-4). |
| Phase / FR | 3 / FR-196 |
| Authentication | S |
| Authorization | owner |
| Request parameters | path: none<br>query: none<br>headers: none beyond the session cookie |
| Request body | none |
| Response | 200 `AiQuota` (`limit`, `used`, `remaining`, `resetsOnLocalDate`). |
| Validation rules | `limit` comes from `AI_DAILY_LIMIT_PER_USER` (default 5, NFR-062). `used` counts the caller's `ai_generation_requests` rows with `counts_toward_quota` true and `quota_local_date` equal to today in the profile zone; the day rolls over at the start of the next profile day, not at midnight UTC (FR-196). Timeouts and provider failures are not counted (EC-016). |
| Error responses | No endpoint-specific codes; plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-READ |
| Pagination | none |
| Idempotency / concurrency | read only |

#### AI-04 POST /api/app/ai/schedule-requests

| Field | Specification |
|---|---|
| Purpose | Validate the inputs, pass the consent and quota gates, store the request as `pending` and enqueue generation. The call never waits for the provider (AI-INTEGRATION section 1). |
| Phase / FR | 3 / FR-190, FR-191, FR-198, EC-015, EC-016 |
| Authentication | S |
| Authorization | owner (every id in `examIds` must belong to the caller; a foreign or unknown id is 404) |
| Request parameters | path: none<br>query: none<br>headers: `Idempotency-Key` (required), `Origin` (CSRF check) |
| Request body | `CreateScheduleRequestInput` (`examIds`, `weeklyHours`, `availability` of `AiAvailabilityWindow`) |
| Response | 202 `ScheduleRequest` with `status` `pending`; header `Location: /api/app/ai/schedule-requests/{requestId}`. A replay returns the stored 202 with `Idempotent-Replay: true`. |
| Validation rules | Order of checks: body shape, then consent, then quota, then prerequisites and the one-pending rule (AI-INTEGRATION sections 1, 4, 7).<br>`examIds`: 1..10 ids, each an upcoming exam (date today or later in the profile zone, BR-025); a past exam gives `validation_failed` (AC-FR-190-4).<br>`weeklyHours`: integer 1..168 (AC-FR-190-2).<br>`availability`: 1..21 windows, `weekday` 1..7 (Monday = 1), `startTime` and `endTime` as `HH:mm`, start before end on the same day, windows do not overlap.<br>Horizon from now (rounded up to 15 min) to the latest selected exam date must be at most 120 days, else `validation_failed`.<br>Prerequisites (FR-198): at least one upcoming exam, at least one active topic for its subject, declared hours and windows; otherwise `validation_failed` with `details.missing` drawn from `exam`, `topic`, `weeklyHours`, `availability`. Empty session history is allowed (AC-FR-198-3).<br>More than 200 active topics across the selected exams: `input_too_large`.<br>Consent is read from the latest `ai_consents` row; the gate runs again in the worker. Quota is checked under the per-user advisory lock. Validated input is stored in `params` so a failed request can be retried prefilled (FR-197). |
| Error responses | `consent_required` (400): latest consent missing or not granted; nothing is queued (AC-FR-191-4).<br>`input_too_large` (400): more than 200 topics.<br>`ai_daily_limit_reached` (429): 5 counted generations on this profile day; `details` carry `limit`, `used`, `resetsOnLocalDate`.<br>`generation_in_progress` (409): a `pending` request exists; `details.requestId` identifies it (AC-FR-191-3, EC-016).<br>`ai_provider_unavailable` (502): only when the global switch `AI_SCHEDULING_ENABLED` is false; no request is created and no quota is used.<br>`not_found` (404): an id in `examIds` is unknown or foreign.<br>`idempotency_key_required` (400), `idempotency_key_reused` (409), `request_in_progress` (409).<br>Provider failures, timeouts and invalid output are not errors of this call; they appear later as `errorCode` on AI-05.<br>Plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-HEAVY (on top of the daily business quota) |
| Pagination | none |
| Idempotency / concurrency | `Idempotency-Key` required (CONVENTIONS section 7), stored in `idempotency_keys` with scope `ai_request.create`. After a terminal failure the client retries with a new key; the old key would replay the original 202. No `If-Match` (the request resource is not versioned). A unique partial index allows one `pending` request per user. |

#### AI-05 GET /api/app/ai/schedule-requests/{requestId}

| Field | Specification |
|---|---|
| Purpose | Poll one generation request: status, the proposal when it succeeded, how many entries validation removed and why, and the terminal error code when it failed. |
| Phase / FR | 3 / FR-193, FR-197 |
| Authentication | S |
| Authorization | owner (cross-user = 404) |
| Request parameters | path: `requestId` (`Id`; a non-UUID value is 404)<br>query: none<br>headers: none beyond the session cookie |
| Request body | none |
| Response | 200 `ScheduleRequest`. `status` is `pending`, `succeeded`, `failed` or `timed_out`. `proposal` (`ScheduleProposal`) is present only when `succeeded` and neither expired nor accepted. `entriesRemoved` and `removedByReason` are always present, so removals are never hidden (EC-015). On `failed` or `timed_out`, `errorCode` is one of `ai_provider_unavailable`, `ai_provider_timeout`, `ai_no_valid_entries`, `consent_required`. These are fields of a 200 response, not HTTP errors of the poll. |
| Validation rules | Read path sweep: a request still `pending` after 2 minutes is set to `failed` with `errorCode` `ai_provider_timeout` before the response is built, so the one-pending index never blocks the user (AI-INTEGRATION section 8). A late provider response cannot overwrite a terminal status. `proposal` is nulled by the expiry job 24 hours after creation (`proposalExpiresAt`) and is never shown after expiry. Entry warnings carry `{ code: "overlap", planEntryId }` for overlaps with existing plan entries (BR-026, FR-193). Neither provider payload nor response text is returned or logged (NFR-063). |
| Error responses | No endpoint-specific codes; plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-READ |
| Pagination | none |
| Idempotency / concurrency | read only (the 2 minute sweep is idempotent) |

#### AI-06 POST /api/app/ai/schedule-requests/{requestId}/accept

| Field | Specification |
|---|---|
| Purpose | Turn the proposal into ordinary plan entries through the Study plans `CreatePlanEntry` use case, all entries in one transaction (AI-INTEGRATION section 9). |
| Phase / FR | 3 / FR-195, BR-026 |
| Authentication | S |
| Authorization | owner (cross-user = 404) |
| Request parameters | path: `requestId` (`Id`)<br>query: none<br>headers: `Idempotency-Key` (required), `Origin` (CSRF check) |
| Request body | `AcceptProposalInput` (`confirmedWarnings`, optional) |
| Response | 200 `{ "data": PlanEntry[] }`, the created entries; header `Idempotent-Replay: true` on a replay. `acceptedAt` is set on the request. |
| Validation rules | The request must be `succeeded` and hold a proposal; a request in any other state, a discarded or already accepted proposal, or a foreign request is `not_found`. An expired proposal (`proposalExpiresAt` passed) is `proposal_stale` with reason `expired`; so is a proposal where any entry start is now at or before the server time (reason `in_past`).<br>Accept-time re-validation against current data (exam still upcoming, topic still active, subject not archived): a failure is `proposal_stale`.<br>Overlaps with existing plan entries need `confirmedWarnings: ["overlap"]`; without it nothing is saved and `overlap_confirmation_required` lists the conflicts (BR-026, AC-FR-195-2). Exam-date warnings cannot occur because validation rules them out.<br>All entries are created or none (FR-195). Accepted entries behave exactly like manual plan entries. Pressing accept twice creates the entries once (AC-FR-195-4). |
| Error responses | `proposal_stale` (409): expired, an entry start in the past, or re-validation failed at accept time.<br>`overlap_confirmation_required` (409): overlap not confirmed; `details.warnings` list `{ code, planEntryId }`.<br>`idempotency_key_required` (400), `idempotency_key_reused` (409), `request_in_progress` (409).<br>Plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-WRITE |
| Pagination | none |
| Idempotency / concurrency | `Idempotency-Key` required, scope `ai_request.accept`; the idempotency row is committed in the same transaction as the created entries. A second accept with a different key after success is `not_found`. After `overlap_confirmation_required` the resubmission with `confirmedWarnings` uses a new key (CONVENTIONS section 8). No `If-Match`. |

#### AI-07 POST /api/app/ai/schedule-requests/{requestId}/discard

| Field | Specification |
|---|---|
| Purpose | Discard the proposal: sets `proposal` to NULL. No plan entries are created (AC-FR-195-3). |
| Phase / FR | 3 / FR-195 |
| Authentication | S |
| Authorization | owner (cross-user = 404) |
| Request parameters | path: `requestId` (`Id`)<br>query: none<br>headers: `Origin` (CSRF check) |
| Request body | none |
| Response | 204, no body |
| Validation rules | Safe to repeat: an already discarded, expired or accepted request also returns 204. Entries created by AI-06 are untouched. A `pending` request is not cancelled by this call (closing the page never cancels it either, AI-INTEGRATION section 1). Discarding does not give back quota that was counted. |
| Error responses | No endpoint-specific codes; plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-WRITE |
| Pagination | none |
| Idempotency / concurrency | none (idempotent set): no `Idempotency-Key` and no `If-Match` (request resource is not versioned). |

### 3.18 Study groups

Phase 3 study groups: create, invite, join, leave, remove, transfer administration, sharing opt-in, weekly leaderboard, reports and dissolve (FR-200..212, EC-018, EC-025). A caller who is not a member of `{groupId}` always gets 404 `not_found`; a member who lacks the needed role gets 403 `role_not_allowed`. Administrators never see members' subjects, notes or session details (NFR-037). Response schemas never include `user_id`, `token_hash` or `reporter_user_id` ([API-SCHEMAS.md](API-SCHEMAS.md) omitted-field rule).

| ID | Method path | FR | Phase | Summary |
|---|---|---|---|---|
| GRP-01 | POST /api/app/groups | 200 | 3 | Create a group; caller becomes its administrator |
| GRP-02 | GET /api/app/groups | 200 | 3 | List the groups the caller belongs to |
| GRP-03 | GET /api/app/groups/{groupId} | 211 | 3 | Read one group with the caller's role and sharing setting |
| GRP-04 | PATCH /api/app/groups/{groupId} | 212 | 3 | Rename a group (administrator) |
| GRP-05 | POST /api/app/groups/{groupId}/dissolve | 210 | 3 | Dissolve the group after typed confirmation (administrator) |
| GRP-06 | GET /api/app/groups/{groupId}/members | 211 | 3 | List members with name, role, join date and opted-in weekly minutes |
| GRP-07 | POST /api/app/groups/{groupId}/invites | 201 | 3 | Create an invite link, optionally emailed (administrator) |
| GRP-08 | GET /api/app/groups/{groupId}/invites | 201 | 3 | List pending invites (administrator) |
| GRP-09 | DELETE /api/app/groups/{groupId}/invites/{inviteId} | 201 | 3 | Revoke an invite (administrator) |
| GRP-10 | POST /api/app/group-invites/accept | 202, 208 | 3 | Join a group with an invite token |
| GRP-11 | POST /api/app/groups/{groupId}/leave | 203 | 3 | Leave a group |
| GRP-12 | DELETE /api/app/groups/{groupId}/members/{userId} | 204 | 3 | Remove another member (administrator) |
| GRP-13 | POST /api/app/groups/{groupId}/transfer-admin | 205 | 3 | Promote a member to administrator (administrator) |
| GRP-14 | PUT /api/app/groups/{groupId}/sharing | 206 | 3 | Set the caller's weekly-minutes sharing for this group |
| GRP-15 | GET /api/app/groups/{groupId}/leaderboard | 207, 208 | 3 | Weekly ranking of opted-in members |
| GRP-16 | POST /api/app/groups/{groupId}/reports | 209 | 3 | Report another member of the same group |

#### GRP-01 POST /api/app/groups

| Field | Specification |
|---|---|
| Purpose | Create a study group. The creator becomes its first administrator and the group starts with one member (FR-200). |
| Phase / FR | 3 / FR-200, NFR-035, NFR-037 |
| Authentication | S |
| Authorization | none beyond the session (any registered user, aged 16+ by the sign-up gate, NFR-035) |
| Request parameters | path: none<br>query: none<br>headers: `Idempotency-Key` (required), `Origin` (CSRF check) |
| Request body | `CreateGroupInput` |
| Response | 201 `Group` with `role` `admin`, `memberCount` 1, `shareWeeklyMinutes` false; headers `Location: /api/app/groups/{groupId}` and `ETag`. A replay returns the stored 201 with `Idempotent-Replay: true`. |
| Validation rules | `name` required, trimmed, 1..60 characters; blank or 61 characters gives `validation_failed` naming the limit (AC-FR-200-2). `maxMembers` is set from configuration (default 20, range 2..100, U-3) and is not client-supplied. A user may create and hold several groups; each membership has its own sharing setting (AC-FR-200-3). Nothing about the creator's study data is shared until they opt in (FR-206). |
| Error responses | `idempotency_key_required` (400), `idempotency_key_reused` (409), `request_in_progress` (409); plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-WRITE |
| Pagination | none |
| Idempotency / concurrency | `Idempotency-Key` required (CONVENTIONS section 7), scope `group.create`. No `If-Match` on create. |

#### GRP-02 GET /api/app/groups

| Field | Specification |
|---|---|
| Purpose | List the groups the caller belongs to, each with the caller's role and sharing setting. |
| Phase / FR | 3 / FR-200, FR-211 |
| Authentication | S |
| Authorization | owner (only the caller's own memberships appear) |
| Request parameters | path: none<br>query: none<br>headers: none beyond the session cookie |
| Request body | none |
| Response | 200 `{ "data": Group[] }` ordered by `createdAt` ascending, then `id`. A group the caller left or was removed from no longer appears (EC-018). |
| Validation rules | No input. Each item carries `memberCount`, `maxMembers`, `role`, `shareWeeklyMinutes`, `version`; no member data. |
| Error responses | No endpoint-specific codes; plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-READ |
| Pagination | not paginated (bounded to the caller's memberships) |
| Idempotency / concurrency | read only |

#### GRP-03 GET /api/app/groups/{groupId}

| Field | Specification |
|---|---|
| Purpose | Read one group: name, member count, size cap, and the caller's role and sharing setting. |
| Phase / FR | 3 / FR-211, FR-212 |
| Authentication | S |
| Authorization | group:member (non-member, unknown or dissolved group = 404) |
| Request parameters | path: `groupId` (`Id`; a non-UUID value is 404)<br>query: none<br>headers: none beyond the session cookie |
| Request body | none |
| Response | 200 `Group` with `ETag: "<version>"` |
| Validation rules | The group name and member count are shown only to members; a non-member learns nothing about the group (FR-202, FR-211). |
| Error responses | No endpoint-specific codes; plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-READ |
| Pagination | none |
| Idempotency / concurrency | read only; the returned `ETag` is the value to send as `If-Match` on GRP-04 |

#### GRP-04 PATCH /api/app/groups/{groupId}

| Field | Specification |
|---|---|
| Purpose | Rename the group. The new name appears immediately in lists and in invites already issued (FR-212). |
| Phase / FR | 3 / FR-212, NFR-094, EC-020 |
| Authentication | S |
| Authorization | group:admin (a member who is not an administrator = 403 `role_not_allowed`; non-member = 404) |
| Request parameters | path: `groupId` (`Id`)<br>query: none<br>headers: `If-Match` (required), `Origin` (CSRF check) |
| Request body | `UpdateGroupInput` |
| Response | 200 `Group` with the new `ETag` |
| Validation rules | `name` required, trimmed, 1..60 characters; 61 characters is rejected (AC-FR-212-2). `If-Match` must equal the stored `version`. |
| Error responses | `role_not_allowed` (403): caller is a member but not an administrator.<br>`version_required` (400): `If-Match` missing.<br>`stale_version` (409): version differs; `details.current` is the current `Group` (AC-FR-212-3).<br>Plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-WRITE |
| Pagination | none |
| Idempotency / concurrency | `If-Match: "<version>"` required (CONVENTIONS section 6). No `Idempotency-Key` (a rename is an idempotent set). |

#### GRP-05 POST /api/app/groups/{groupId}/dissolve

| Field | Specification |
|---|---|
| Purpose | Delete the group and end every membership after explicit confirmation. Members' own study data is untouched (FR-210). |
| Phase / FR | 3 / FR-210, EC-018 |
| Authentication | S |
| Authorization | group:admin (a member who is not an administrator = 403 `role_not_allowed`; non-member = 404) |
| Request parameters | path: `groupId` (`Id`)<br>query: none<br>headers: `Origin` (CSRF check) |
| Request body | inline object `{ "confirmName": string }` (API-SCHEMAS section 20, note under `CreateReportInput`) |
| Response | 204, no body. Irreversible; leaderboard and shared statistics disappear for all members at once. |
| Validation rules | `confirmName` is required and must equal the stored group name exactly, else `validation_failed` on `confirmName` and nothing changes (AC-FR-210-1). Open invites of the group stop working (AC-FR-210-4: they resolve to `not_found`). Each member's sessions and totals are unchanged (AC-FR-210-2). |
| Error responses | `role_not_allowed` (403): caller is not an administrator.<br>Plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-WRITE |
| Pagination | none |
| Idempotency / concurrency | no `Idempotency-Key`, no `If-Match`: the typed `confirmName` is the guard (a concurrent rename makes it mismatch). A repeat after success is 404 `not_found` because the group no longer exists. |

#### GRP-06 GET /api/app/groups/{groupId}/members

| Field | Specification |
|---|---|
| Purpose | List the group's members with display name, role and join date. Weekly minutes appear only for members who opted in (FR-211, NFR-037). |
| Phase / FR | 3 / FR-211, NFR-037 |
| Authentication | S |
| Authorization | group:member (non-member = 404). Administrators see exactly the same fields as members (AC-FR-211-3). |
| Request parameters | path: `groupId` (`Id`)<br>query: none<br>headers: none beyond the session cookie |
| Request body | none |
| Response | 200 `{ "data": Member[] }`. `weeklyMinutes` is absent (not `null`) when that member's `shareWeeklyMinutes` is false. No email, subject, note or session data. |
| Validation rules | Departed and removed members disappear at once (AC-FR-211-4, EC-018). `userId` is exposed only so administrators can address GRP-12 and GRP-13. |
| Error responses | No endpoint-specific codes; plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-READ |
| Pagination | not paginated (bounded: at most 100 members, `maxMembers` default 20); ordered by `joinedAt` ascending, then `userId` |
| Idempotency / concurrency | read only |

#### GRP-07 POST /api/app/groups/{groupId}/invites

| Field | Specification |
|---|---|
| Purpose | Issue a single-use invite valid for 7 days, shown as a link and optionally sent by email (FR-201). |
| Phase / FR | 3 / FR-201, FR-208 |
| Authentication | S |
| Authorization | group:admin (a member who is not an administrator = 403 `role_not_allowed`, AC-FR-201-4; non-member = 404) |
| Request parameters | path: `groupId` (`Id`)<br>query: none<br>headers: `Idempotency-Key` (required), `Origin` (CSRF check) |
| Request body | `CreateInviteInput` (`email`, optional) |
| Response | 201 `InviteCreated` (`Invite` plus the one-time `inviteUrl`); header `Location: /api/app/groups/{groupId}/invites/{inviteId}`. When the group is already at `maxMembers`, the invite is still issued and the body carries `details.warning` with the value `group_full` (a warning, not an error, AC-FR-208-3). A replay returns the stored 201 without `inviteUrl` and with `Idempotent-Replay: true` (see Idempotency row). |
| Validation rules | `email` optional, a valid email address; when present an invite-email job is enqueued (delivery failure does not fail this call and is not surfaced here). `expiresAt` is creation plus 7 days. The token is unguessable, only its SHA-256 is stored (`token_hash`), and it is never returned again or logged. The invite reveals no group content to non-members. |
| Error responses | `role_not_allowed` (403): caller is not an administrator.<br>`idempotency_key_required` (400), `idempotency_key_reused` (409), `request_in_progress` (409).<br>Plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-WRITE |
| Pagination | none |
| Idempotency / concurrency | `Idempotency-Key` required (CONVENTIONS section 7), scope `group_invite.create`. The stored replay body omits `inviteUrl` so the token is never kept in `idempotency_keys`; if the first response was lost the administrator revokes the invite (GRP-09) and creates a new one. No `If-Match` (invites are not versioned). |

#### GRP-08 GET /api/app/groups/{groupId}/invites

| Field | Specification |
|---|---|
| Purpose | List the group's pending invites so an administrator can revoke them (FR-201). |
| Phase / FR | 3 / FR-201 |
| Authentication | S |
| Authorization | group:admin (a member who is not an administrator = 403 `role_not_allowed`; non-member = 404) |
| Request parameters | path: `groupId` (`Id`)<br>query: none<br>headers: none beyond the session cookie |
| Request body | none |
| Response | 200 `{ "data": Invite[] }` (`id`, `email`, `expiresAt`, `createdAt`). Only pending invites: not revoked, not accepted, not expired. The token, its hash and `inviteUrl` are never returned. |
| Validation rules | No input. |
| Error responses | `role_not_allowed` (403): caller is not an administrator; plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-READ |
| Pagination | not paginated (bounded to pending invites of one group); ordered by `createdAt` descending, then `id` |
| Idempotency / concurrency | read only |

#### GRP-09 DELETE /api/app/groups/{groupId}/invites/{inviteId}

| Field | Specification |
|---|---|
| Purpose | Revoke an invite. The link stops working at once (AC-FR-201-2). |
| Phase / FR | 3 / FR-201 |
| Authentication | S |
| Authorization | group:admin (a member who is not an administrator = 403 `role_not_allowed`; non-member = 404) |
| Request parameters | path: `groupId` (`Id`), `inviteId` (`Id`)<br>query: none<br>headers: `Origin` (CSRF check) |
| Request body | none |
| Response | 204, no body. Sets `revoked_at`; the row is not hard-deleted. |
| Validation rules | The invite must belong to `{groupId}`; an invite of another group, or one already accepted or expired, is `not_found`. Revoking an invite that is already revoked returns 204. |
| Error responses | `role_not_allowed` (403): caller is not an administrator; plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-WRITE |
| Pagination | none |
| Idempotency / concurrency | none (idempotent set): no `If-Match` (invites are not versioned) and no `Idempotency-Key`. |

#### GRP-10 POST /api/app/group-invites/accept

| Field | Specification |
|---|---|
| Purpose | Join a group by presenting an invite token. The new member starts with sharing off (FR-202, FR-206). |
| Phase / FR | 3 / FR-202, FR-208, EC-018 |
| Authentication | S (a signed-out visitor signs in first and returns to the invite, AC-FR-202-3) |
| Authorization | none (possession of a valid single-use token is the capability); an unknown, used or revoked token = 404 `not_found` |
| Request parameters | path: none<br>query: none<br>headers: `Idempotency-Key` (required), `Origin` (CSRF check) |
| Request body | `AcceptInviteInput` (`token`) |
| Response | 201 `Group` of the joined group (`role` `member`, `shareWeeklyMinutes` false); header `Location: /api/app/groups/{groupId}`. A replay returns the stored 201 with `Idempotent-Replay: true`. |
| Validation rules | `token` required string. Order of checks: token resolves to a pending invite of an existing group, otherwise `not_found` (this includes a token already used by anyone, revoked, or belonging to a dissolved group; an old invite of a user who left is therefore `not_found`, AC-FR-202-2, EC-018); then expiry; then existing membership; then size cap. The size cap is enforced at join time under a lock so concurrent joins cannot exceed `maxMembers` (FR-208). On success the invite is marked accepted and cannot be reused. The member's totals stay hidden until they opt in. |
| Error responses | `invite_expired` (409): valid invite older than 7 days (AC-FR-201-3).<br>`already_member` (409): caller already belongs to the group.<br>`group_full` (409): group at `maxMembers`; `details.maxMembers` (AC-FR-208-1).<br>`idempotency_key_required` (400), `idempotency_key_reused` (409), `request_in_progress` (409).<br>Plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-WRITE |
| Pagination | none |
| Idempotency / concurrency | `Idempotency-Key` required (CONVENTIONS section 7), scope `group_member.join`. The key makes a retry after a lost response return the stored 201 instead of `not_found` on the now-used token. No `If-Match`. |

#### GRP-11 POST /api/app/groups/{groupId}/leave

| Field | Specification |
|---|---|
| Purpose | Leave a group. The caller vanishes from the member list and leaderboards at once; their own sessions and totals are unchanged (FR-203, EC-018). |
| Phase / FR | 3 / FR-203, EC-018 |
| Authentication | S |
| Authorization | group:member (non-member = 404) |
| Request parameters | path: `groupId` (`Id`)<br>query: none<br>headers: `Origin` (CSRF check) |
| Request body | none |
| Response | 204, no body |
| Validation rules | The sole administrator may not leave, whatever the member count; they must transfer administration (GRP-13) or dissolve the group (GRP-05) first (AC-FR-203-3). An administrator who is not the last one may leave. Rejoining needs a new invite (AC-FR-203-4). |
| Error responses | `last_administrator` (403): caller is the only administrator; plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-WRITE |
| Pagination | none |
| Idempotency / concurrency | none: no `Idempotency-Key` and no `If-Match` (memberships are not versioned). A repeat after success is 404 `not_found` because the caller is no longer a member. |

#### GRP-12 DELETE /api/app/groups/{groupId}/members/{userId}

| Field | Specification |
|---|---|
| Purpose | Remove another member. They disappear from the list and leaderboard at once and need a new invite to rejoin (FR-204, EC-018). |
| Phase / FR | 3 / FR-204, EC-018 |
| Authentication | S |
| Authorization | group:admin (a member who is not an administrator = 403 `role_not_allowed`, AC-FR-204-3; non-member = 404) |
| Request parameters | path: `groupId` (`Id`), `userId` (`Id` of the member to remove)<br>query: none<br>headers: `Origin` (CSRF check) |
| Request body | none |
| Response | 204, no body. The removed user's own data is unchanged (AC-FR-204-2). |
| Validation rules | `userId` equal to the caller gives `validation_failed` and points to GRP-11 or GRP-13 (AC-FR-204-4). A user who is not a member of this group, including a member of another group, is `not_found` (FR-204). |
| Error responses | `role_not_allowed` (403): caller is not an administrator; plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-WRITE |
| Pagination | none |
| Idempotency / concurrency | none: no `Idempotency-Key` and no `If-Match` (memberships are not versioned). A repeat after success is 404 `not_found`. |

#### GRP-13 POST /api/app/groups/{groupId}/transfer-admin

| Field | Specification |
|---|---|
| Purpose | Promote an existing member to administrator so the group continues when the current administrator steps away (FR-205 AC-1). The caller stays an administrator; the group always keeps at least one. |
| Phase / FR | 3 / FR-205 |
| Authentication | S |
| Authorization | group:admin (a member who is not an administrator = 403 `role_not_allowed`; non-member = 404) |
| Request parameters | path: `groupId` (`Id`)<br>query: none<br>headers: `Origin` (CSRF check) |
| Request body | `TransferAdminInput` (`userId`) |
| Response | 200 `Member` (the promoted member, `role` `admin`) |
| Validation rules | `userId` must be a current member of this group, else `not_found` (FR-205 errors). A target who is already an administrator returns 200 unchanged. Admin rights give no access to members' subjects, notes or session details. The inventory defines no separate step-down call: an administrator who wants to leave first promotes a successor here, then uses GRP-11 (AC-FR-205-2, AC-FR-205-3). Automatic promotion of the oldest member on account deletion is a service rule, not an endpoint (FR-205 AC-4). |
| Error responses | `role_not_allowed` (403): caller is not an administrator; plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-WRITE |
| Pagination | none |
| Idempotency / concurrency | none (idempotent set): no `Idempotency-Key`, no `If-Match` (memberships are not versioned). |

#### GRP-14 PUT /api/app/groups/{groupId}/sharing

| Field | Specification |
|---|---|
| Purpose | Set whether the caller's weekly focused-minute total is shared with this group. Default is off (opt-in, FR-206, NFR-037). |
| Phase / FR | 3 / FR-206, NFR-037 |
| Authentication | S |
| Authorization | group:member (non-member = 404; the setting is per caller and per group) |
| Request parameters | path: `groupId` (`Id`)<br>query: none<br>headers: `Origin` (CSRF check) |
| Request body | `SharingInput` (`shareWeeklyMinutes`) |
| Response | 200 `Group` with the caller's updated `shareWeeklyMinutes` |
| Validation rules | `shareWeeklyMinutes` is a required boolean. Only the weekly focused-minute total can ever be shared, never subjects, topics, notes or session details. Turning sharing on makes the total appear on the next GRP-15 and GRP-06 read; turning it off hides it immediately (AC-FR-206-3, AC-FR-206-4). |
| Error responses | No endpoint-specific codes; plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-WRITE |
| Pagination | none |
| Idempotency / concurrency | none (idempotent set): no `Idempotency-Key`, no `If-Match` (memberships are not versioned). |

#### GRP-15 GET /api/app/groups/{groupId}/leaderboard

| Field | Specification |
|---|---|
| Purpose | Weekly ranking of the members who opted in, by focused minutes. Computed on read (API-CONVENTIONS section 15, reconciliation 3). |
| Phase / FR | 3 / FR-207, FR-208, EC-025, BR-010 |
| Authentication | S |
| Authorization | group:member (non-member = 404) |
| Request parameters | path: `groupId` (`Id`)<br>query: `weekStart` (`LocalDate`, must be a Monday, default the Monday of the current week in the caller's profile zone)<br>headers: none beyond the session cookie |
| Request body | none |
| Response | 200 `Leaderboard` (`weekStart`, `data` of `LeaderboardRow`: `rank`, `displayName`, `weeklyMinutes`). |
| Validation rules | `weekStart` that is not a valid date or not a Monday gives `validation_failed`. The week is Monday to Sunday by each session's frozen `local_date`. Only rows of `study_session_days` with `is_ranked` count, that is timer sessions of at least 5 minutes; manual entries and shorter sessions contribute 0 (AC-FR-207-1, AC-FR-207-2, EC-025). Only opted-in members are listed (AC-FR-207-4). Order: `weeklyMinutes` descending, then `displayName`; ties share a rank (FR-207). An empty board returns `data: []` and the client shows the opt-in empty state. Removed and departed members are excluded at once (EC-018). |
| Error responses | No endpoint-specific codes; plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-READ |
| Pagination | not paginated (bounded: at most 100 members) |
| Idempotency / concurrency | read only |

#### GRP-16 POST /api/app/groups/{groupId}/reports

| Field | Specification |
|---|---|
| Purpose | Report another member of the same group. The report is stored for follow-up outside the product; no automatic sanction occurs (FR-209). |
| Phase / FR | 3 / FR-209, NFR-020 |
| Authentication | S |
| Authorization | group:member (non-member = 404, AC-FR-209-4) |
| Request parameters | path: `groupId` (`Id`)<br>query: none<br>headers: `Idempotency-Key` (required), `Origin` (CSRF check) |
| Request body | `CreateReportInput` (`targetUserId`, `reason`) |
| Response | 201 `{}` acknowledging the report; no `Location` (reports have no read endpoint). A replay returns the stored 201 with `Idempotent-Replay: true`. |
| Validation rules | `reason` required, 1..500 characters; empty or longer is rejected with the range (AC-FR-209-2). `targetUserId` must be a current member of the same group, else `not_found`; reporting oneself gives `validation_failed`. The reporter is stored internally and never exposed to the target, in any response or notification (AC-FR-209-3). The reason text is never logged. |
| Error responses | `idempotency_key_required` (400), `idempotency_key_reused` (409), `request_in_progress` (409); plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-WRITE |
| Pagination | none |
| Idempotency / concurrency | `Idempotency-Key` required (CONVENTIONS section 7), scope `group_report.create`, so a double submit stores one report. No `If-Match`. |

### 3.19 API keys

Phase 3 key management for the public API (FR-220, FR-221, FR-226). These are internal endpoints: they need a cookie session and an API key can never call them or any other `/api/app` route (the `Authorization` header is ignored there, API-SECURITY section 2). The full key value exists only in the KEY-02 response.

| ID | Method path | FR | Phase | Summary |
|---|---|---|---|---|
| KEY-01 | GET /api/app/api-keys | 220 | 3 | List the caller's keys (metadata only, revoked keys included) |
| KEY-02 | POST /api/app/api-keys | 220, 221 | 3 | Create a named, scoped key; the full key is shown once |
| KEY-03 | DELETE /api/app/api-keys/{keyId} | 226 | 3 | Revoke a key immediately |

#### KEY-01 GET /api/app/api-keys

| Field | Specification |
|---|---|
| Purpose | Show the caller's keys with name, scopes, last 4 characters, creation, last use and revocation time. The full value is never shown again (AC-FR-220-2, AC-FR-226-2). |
| Phase / FR | 3 / FR-220, FR-226 |
| Authentication | S (cookie session only; a bearer API key is ignored and the call is 401 `unauthenticated`) |
| Authorization | owner (only the caller's keys) |
| Request parameters | path: none<br>query: none<br>headers: none beyond the session cookie |
| Request body | none |
| Response | 200 `{ "data": ApiKey[] }` (`id`, `name`, `scopes`, `last4`, `lastUsedAt`, `revokedAt`, `createdAt`). Revoked keys stay in the list with `revokedAt` set. `key` and `key_hash` are never returned. |
| Validation rules | No input. `lastUsedAt` is updated at most once per minute per key (API-SECURITY section 2), so it can lag recent use. |
| Error responses | No endpoint-specific codes; plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-READ |
| Pagination | not paginated (bounded: at most 10 active keys; revoked keys remain listed); ordered by `createdAt` descending, then `id` |
| Idempotency / concurrency | read only |

#### KEY-02 POST /api/app/api-keys

| Field | Specification |
|---|---|
| Purpose | Create a named API key with fixed scopes. The server generates the key, stores only its SHA-256 hash and `last4`, and returns the full value once (FR-220, FR-221). |
| Phase / FR | 3 / FR-220, FR-221, NFR-021 |
| Authentication | S (cookie session only; an API key cannot create keys) |
| Authorization | owner |
| Request parameters | path: none<br>query: none<br>headers: `Idempotency-Key` (required), `Origin` (CSRF check) |
| Request body | `CreateApiKeyInput` (`name`, `scopes` of `ApiKeyScopes`) |
| Response | 201 `ApiKeyCreated` (the `ApiKey` fields plus `key`, format `lum_` followed by 43 base64url characters); header `Location: /api/app/api-keys/{keyId}`. The client must show a warning that the value cannot be shown again (AC-FR-220-1). A replay returns the stored 201 as an `ApiKey` without `key` and with `Idempotent-Replay: true`. |
| Validation rules | `name` required, 1..60 characters (AC-FR-220-4).<br>`scopes` is an object whose keys are only `subjects`, `topics`, `sessions`, `plan_entries`, `todos`, `notes`, `exams` and whose values are `read` or `write` (`write` includes `read`); at least one key; any other resource key or value gives `validation_failed`. Scopes are fixed at creation and cannot be edited.<br>At most 10 active keys per user, enforced under the per-user advisory lock (R9); revoked keys do not count.<br>The key is 32 random bytes from a secure generator, never client-supplied. Logged only as `keyId` and `last4` (CR-1: audit row `api_key_created`). |
| Error responses | `api_key_limit_reached` (409): 10 active keys already exist; `details.limit` is 10 (AC-FR-220-3).<br>`idempotency_key_required` (400), `idempotency_key_reused` (409), `request_in_progress` (409).<br>Plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-WRITE |
| Pagination | none |
| Idempotency / concurrency | `Idempotency-Key` required (CONVENTIONS section 7), scope `api_key.create`. The stored replay body omits `key` so the plaintext never persists in `idempotency_keys`; if the first response was lost the user revokes that key (KEY-03) and creates another. No `If-Match` (keys are not versioned). |

#### KEY-03 DELETE /api/app/api-keys/{keyId}

| Field | Specification |
|---|---|
| Purpose | Revoke a key. It sets `revoked_at`; the row stays listed and the key can never be reactivated (FR-226). |
| Phase / FR | 3 / FR-226, EC-026 |
| Authentication | S (cookie session only) |
| Authorization | owner (another user's key = 404) |
| Request parameters | path: `keyId` (`Id`; a non-UUID value is 404)<br>query: none<br>headers: `Origin` (CSRF check) |
| Request body | none |
| Response | 204, no body |
| Validation rules | Takes effect on the next `/v1` request because every request looks the key up (no cache), within the 5 s of AC-FR-226-1. A revoked key answers 401 `api_key_revoked` even while rate limited (AC-FR-226-4). Revoking an already revoked key returns 204. Data created through the key stays with the user. Logs `api_key_revoked` with `keyId` and `last4` (CR-1: audit row). |
| Error responses | No endpoint-specific codes; plus common set (API-ENDPOINTS section 1). |
| Rate limit | RL-WRITE |
| Pagination | none |
| Idempotency / concurrency | none (idempotent set): no `If-Match` (keys are not versioned) and no `Idempotency-Key`. |
### 3.20 System

Operational endpoint outside the `/api/app` tree.

| ID | Method path | FR | Phase | Summary |
|---|---|---|---|---|
| SYS-01 | GET /api/health | NFR-050 | MVP | Liveness and database reachability for the uptime monitor |

#### SYS-01 GET /api/health

| Field | Specification |
|---|---|
| Purpose | Uptime check: confirms the app answers and a trivial database query succeeds. |
| Phase / FR | MVP / NFR-050 |
| Authentication | G |
| Authorization | none |
| Request parameters | none (absolute path `/api/health`, not under `/api/app`). |
| Request body | none |
| Response | 200 `HealthStatus` (`{ "status": "ok" }`) with `Cache-Control: no-store`. |
| Validation rules | Runs one trivial database query. Returns no versions, hostnames or other internals (API-SECURITY section on information disclosure). |
| Error responses | `database_unavailable` 503: the trivial query failed. Plus common set (API-ENDPOINTS section 1), of which only `internal_error` applies. |
| Rate limit | none at application level; limited at the platform edge. It belongs to no RL-* class. |
| Pagination | none |
| Idempotency / concurrency | read only |


## 4. Public API (/v1, Phase 3)

The public API is the Phase 3 surface for third-party scripts and tools (FR-220..226). It is separate from `/api/app` (API-CONVENTIONS section 1) and exposes exactly the seven resources FR-220 lists: subjects, topics, sessions, plan entries, to-dos, notes and exams. Contracts are non-binding until Phase 3 starts.

- **Authentication.** Every endpoint except PUB-37 uses class `K:<resource>:<read|write>` with `Authorization: Bearer lum_<key>`. `GET` needs `read`; every other method needs `write`, which includes `read` (FR-221, API-SECURITY section 3.1). A missing scope is 403 `scope_missing` with `details.required` `{ resource, access }`; a missing, malformed or unknown key is 401 `api_key_invalid`; a revoked key is 401 `api_key_revoked` even when its bucket is exhausted (FR-226). Session cookies are never accepted (API-SECURITY section 1.2). Order of checks: key, revocation, rate limit, scope, validation.
- **Authorization.** The key acts as exactly one user (`owner`). A record of another user is 404 `not_found`, identical to a missing record (FR-221 AC-4, NFR-016).
- **Rate limit.** Every call except PUB-37 is class RL-PUBLIC (60 per minute per key, FR-222). Every response carries `RateLimit-Limit`, `RateLimit-Remaining` and `RateLimit-Reset`; a 429 `rate_limited` adds `Retry-After` of 1..60 seconds (API-CONVENTIONS section 10, EC-026). PUB-37 is RL-DOC.
- **Pagination.** Every list is cursor paginated with `limit` (1..100, default 50) and `cursor` and returns `{ data, page: { nextCursor, hasMore } }`, except PUB-16 (plan entries), which requires a date range of at most 93 days and returns `{ data }` (FR-224). This is wider than the internal API, where subjects, topics per subject and active exams are unpaginated.
- **DTOs.** Responses use the `Public*` schemas of [API-SCHEMAS.md](API-SCHEMAS.md) section 23; request bodies use the matching `Create...Input` and `Update...Input` schemas, parsed `.strict()`. Public DTOs omit `user_id`, `request_key` and every internal column (API-SCHEMAS omitted-field rule). Public handlers have their own Zod schemas and mappers and call the same application service as the internal twin, so business rules are identical (FR-221 expected behavior).
- **Concurrency and idempotency.** Versioned resources return `ETag` and `version`; `PATCH`, `DELETE`, archive, restore and mark-missed require `If-Match` (400 `version_required`, 409 `stale_version` with `details.current` set to the current `Public*` resource). `Idempotency-Key` is optional on creating `POST` requests and required only on `POST /v1/sessions` (API-CONVENTIONS section 7).
- **Errors.** Bodies use `PublicErrorEnvelope` `{ code, message, details, requestId }` with no `category` (FR-225). The common set (API-ENDPOINTS section 1) applies to every block; the key errors above replace `unauthenticated` and `csrf_rejected`, which do not exist on `/v1` (no cookie authority, so no CSRF). A path prefix other than `/v1` is 404 `unsupported_api_version` with `details.supportedVersions` `["v1"]` (API-CONVENTIONS section 13). A method a resource does not offer returns 405. Responses may carry `Deprecation: true` and `Sunset` once a version is retired (FR-223).
- **Deliberate differences from the internal twins.** PUB-25 accepts `done` in `PATCH` because `/v1` has no `PUT .../completion` route; list endpoints are paginated where the internal list is not; there is no timer, goals, statistics, bulk-topic, reorder or render route; public clients cannot toggle a single exam-checklist `completed` flag (EXAM-06 is internal-only).

### 4.1 Inventory

| ID | Method path | Scope | Internal twin | Notes |
|---|---|---|---|---|
| PUB-01 | `GET /v1/subjects` | `subjects:read` | SUBJ-01 | Cursor paginated here; internal list is unpaginated |
| PUB-02 | `GET /v1/subjects/{id}` | `subjects:read` | SUBJ-03 |  |
| PUB-03 | `POST /v1/subjects` | `subjects:write` | SUBJ-02 | `Idempotency-Key` optional |
| PUB-04 | `PATCH /v1/subjects/{id}` | `subjects:write` | SUBJ-04 | `If-Match` |
| PUB-05a | `POST /v1/subjects/{id}/archive` | `subjects:write` | SUBJ-06 | `If-Match`; split from PUB-05 |
| PUB-05b | `POST /v1/subjects/{id}/restore` | `subjects:write` | SUBJ-07 | `If-Match`; split from PUB-05 |
| PUB-06 | `GET /v1/topics` | `topics:read` | TOP-01 | `subjectId` required; cursor paginated here |
| PUB-07 | `GET /v1/topics/{id}` | `topics:read` | TOP-04 |  |
| PUB-08 | `POST /v1/topics` | `topics:write` | TOP-02 | `subjectId` in body; `Idempotency-Key` optional |
| PUB-09 | `PATCH /v1/topics/{id}` | `topics:write` | TOP-05 | `If-Match` |
| PUB-10a | `POST /v1/topics/{id}/archive` | `topics:write` | TOP-07 | `If-Match`; split from PUB-10 |
| PUB-10b | `POST /v1/topics/{id}/restore` | `topics:write` | TOP-08 | `If-Match`; split from PUB-10 |
| PUB-11 | `GET /v1/sessions` | `sessions:read` | SESS-01 | Filters `from`, `to`, `subjectId`, `topicId`, `source` |
| PUB-12 | `GET /v1/sessions/{id}` | `sessions:read` | SESS-02 |  |
| PUB-13 | `POST /v1/sessions` | `sessions:write` | SESS-03 | `Idempotency-Key` REQUIRED; manual sessions only |
| PUB-14 | `PATCH /v1/sessions/{id}` | `sessions:write` | SESS-04 | `If-Match` |
| PUB-15 | `DELETE /v1/sessions/{id}` | `sessions:write` | SESS-05 | `If-Match` |
| PUB-16 | `GET /v1/plan-entries` | `plan_entries:read` | PLAN-01 | Range required; not paginated |
| PUB-17 | `GET /v1/plan-entries/{id}` | `plan_entries:read` | PLAN-03 |  |
| PUB-18 | `POST /v1/plan-entries` | `plan_entries:write` | PLAN-02 | `Idempotency-Key` optional; `confirmedWarnings` |
| PUB-19 | `PATCH /v1/plan-entries/{id}` | `plan_entries:write` | PLAN-04 | `If-Match`; `confirmedWarnings` |
| PUB-20 | `DELETE /v1/plan-entries/{id}` | `plan_entries:write` | PLAN-05 | `If-Match` |
| PUB-21 | `POST /v1/plan-entries/{id}/missed` | `plan_entries:write` | PLAN-06 | `If-Match` |
| PUB-22 | `GET /v1/todos` | `todos:read` | TODO-01 | Filters as TODO-01 |
| PUB-23 | `GET /v1/todos/{id}` | `todos:read` | TODO-03 |  |
| PUB-24 | `POST /v1/todos` | `todos:write` | TODO-02 | `Idempotency-Key` optional |
| PUB-25 | `PATCH /v1/todos/{id}` | `todos:write` | TODO-04 and TODO-05 | `If-Match`; `done` accepted here |
| PUB-26 | `DELETE /v1/todos/{id}` | `todos:write` | TODO-06 | `If-Match` |
| PUB-27 | `GET /v1/notes` | `notes:read` | NOTE-01 | Items omit `body` |
| PUB-28 | `GET /v1/notes/{id}` | `notes:read` | NOTE-03 |  |
| PUB-29 | `POST /v1/notes` | `notes:write` | NOTE-02 | `Idempotency-Key` optional |
| PUB-30 | `PATCH /v1/notes/{id}` | `notes:write` | NOTE-04 | `If-Match`; stale returns the current note |
| PUB-31 | `DELETE /v1/notes/{id}` | `notes:write` | NOTE-06 | `If-Match` |
| PUB-32 | `GET /v1/exams` | exams:read | EXAM-01 | Cursor paginated for both states (internal `upcoming` is unpaginated) |
| PUB-33 | `GET /v1/exams/{id}` | exams:read | EXAM-03 |  |
| PUB-34 | `POST /v1/exams` | exams:write | EXAM-02 | `Idempotency-Key` optional |
| PUB-35 | `PATCH /v1/exams/{id}` | exams:write | EXAM-04 | `If-Match` |
| PUB-36 | `PUT /v1/exams/{id}/topics` | exams:write | EXAM-05 | Replaces checklist membership; no `If-Match` |
| PUB-37 | `GET /v1/openapi.json` | none (G) | none | OpenAPI 3.1 document; guest |

### 4.2 Endpoint specifications

#### PUB-01 GET /v1/subjects

| Field | Specification |
|---|---|
| Purpose | List the key owner's subjects. |
| Phase / FR | 3 / FR-010, FR-013, FR-221, FR-222, FR-224, FR-225 |
| Authentication | K:subjects:read |
| Authorization | owner (the key acts as exactly one user; cross-user = 404) |
| Request parameters | header `Authorization: Bearer lum_<key>` (required); query `includeArchived` (bool, default `false`); query `limit` (int 1..100, default 50), `cursor` (`Cursor`) |
| Request body | none |
| Response | `200` `{ data: PublicSubject[], page: PageInfo }` |
| Validation rules | Archived subjects are returned only with `includeArchived=true` and carry `archivedAt`. Unknown query parameters are `validation_failed`. |
| Error responses | `invalid_page_size` 400 (`limit` outside 1..100), `invalid_cursor` 400 (malformed or tampered `cursor`), plus common set (API-ENDPOINTS section 1) |
| Rate limit | RL-PUBLIC |
| Pagination | Cursor. Order `position` ascending; `id` is the tiebreaker (FR-224). |
| Idempotency / concurrency | read only |

#### PUB-02 GET /v1/subjects/{id}

| Field | Specification |
|---|---|
| Purpose | Read one subject. |
| Phase / FR | 3 / FR-010, FR-013, FR-221, FR-222, FR-225 |
| Authentication | K:subjects:read |
| Authorization | owner (the key acts as exactly one user; cross-user = 404) |
| Request parameters | header `Authorization: Bearer lum_<key>` (required); path `id` (`Id`; a non-UUID value is 404 `not_found`) |
| Request body | none |
| Response | `200` `PublicSubject`; header `ETag: "<version>"` |
| Validation rules | An archived subject is returned with `archivedAt` set. |
| Error responses | none specific; plus common set (API-ENDPOINTS section 1) |
| Rate limit | RL-PUBLIC |
| Pagination | none |
| Idempotency / concurrency | read only |

#### PUB-03 POST /v1/subjects

| Field | Specification |
|---|---|
| Purpose | Create a subject. |
| Phase / FR | 3 / FR-010, FR-221, FR-222, FR-225 |
| Authentication | K:subjects:write |
| Authorization | owner (the key acts as exactly one user; cross-user = 404) |
| Request parameters | header `Authorization: Bearer lum_<key>` (required); header `Content-Type: application/json`; header `Idempotency-Key` (optional, 1..100 chars, `^[A-Za-z0-9_-]+$`) |
| Request body | `CreateSubjectInput` (`name`, `color`) |
| Response | `201` `PublicSubject`; headers `Location: /v1/subjects/{id}`, `ETag: "<version>"`; `Idempotent-Replay: true` on a replay |
| Validation rules | `name` 1..100 characters after trim, unique among active subjects of the owner, case-insensitive (AC-FR-010-3); a name used only by an archived subject is allowed (AC-FR-010-4). `color` must be a palette key from configuration, else `validation_failed`. Position is assigned by the server (appended last, FR-012); unknown fields are `validation_failed`. |
| Error responses | `name_conflict` 409 (active subject with the same name, `details.conflictingId`), `idempotency_key_reused` 409 (same key, different body), `request_in_progress` 409 (same key still executing, `Retry-After: 1`), plus common set (API-ENDPOINTS section 1) |
| Rate limit | RL-PUBLIC |
| Pagination | none |
| Idempotency / concurrency | Optional `Idempotency-Key` (CONVENTIONS section 7): with it, a replay returns the stored `201` with `Idempotent-Replay: true`; without it every call creates a new record. No `If-Match` (create). |

#### PUB-04 PATCH /v1/subjects/{id}

| Field | Specification |
|---|---|
| Purpose | Rename a subject or change its colour. |
| Phase / FR | 3 / FR-011, FR-221, FR-222, FR-225 |
| Authentication | K:subjects:write |
| Authorization | owner (the key acts as exactly one user; cross-user = 404) |
| Request parameters | header `Authorization: Bearer lum_<key>` (required); header `Content-Type: application/json`; path `id` (`Id`; a non-UUID value is 404 `not_found`); header `If-Match: "<version>"` (required; a bare integer is also accepted) |
| Request body | `UpdateSubjectInput` (`name`, `color`; at least one) |
| Response | `200` `PublicSubject`; header `ETag: "<new version>"` |
| Validation rules | `name` 1..100 trimmed and unique among active subjects (AC-FR-011-2); `color` a palette key. Position changes and archive state are not accepted here (strict body). An archived subject can be renamed, which lets the caller resolve a restore `name_conflict` (FR-014). |
| Error responses | `name_conflict` 409, `version_required` 400 (no `If-Match`), `stale_version` 409 (mismatch; `details.current` = current `PublicSubject`), plus common set (API-ENDPOINTS section 1) |
| Rate limit | RL-PUBLIC |
| Pagination | none |
| Idempotency / concurrency | `If-Match: "<version>"` required (CONVENTIONS section 6); a retry after success returns `stale_version`. `Idempotency-Key` is not used. |

#### PUB-05a POST /v1/subjects/{id}/archive

| Field | Specification |
|---|---|
| Purpose | Archive a subject; its sessions stay in history and statistics. |
| Phase / FR | 3 / FR-013, FR-221, FR-222, FR-225 |
| Authentication | K:subjects:write |
| Authorization | owner (the key acts as exactly one user; cross-user = 404) |
| Request parameters | header `Authorization: Bearer lum_<key>` (required); path `id` (`Id`; a non-UUID value is 404 `not_found`); header `If-Match: "<version>"` (required; a bare integer is also accepted) |
| Request body | none |
| Response | `200` `PublicSubject` with `archivedAt` set; header `ETag: "<new version>"` |
| Validation rules | Blocked while the owner has a running timer on the subject (AC-FR-013-2); the owner must stop it in the Lumora app because the timer has no public route. `details.timerRunId` is removed by the public error mapper. Archiving hides the subject and its topics from pickers (AC-FR-013-3). |
| Error responses | `subject_has_running_session` 409, `version_required` 400 (no `If-Match`), `stale_version` 409 (mismatch; `details.current` = current `PublicSubject`), plus common set (API-ENDPOINTS section 1) |
| Rate limit | RL-PUBLIC |
| Pagination | none |
| Idempotency / concurrency | `If-Match: "<version>"` required (CONVENTIONS section 6); a retry after success returns `stale_version`. `Idempotency-Key` is not used. |

#### PUB-05b POST /v1/subjects/{id}/restore

| Field | Specification |
|---|---|
| Purpose | Restore an archived subject. |
| Phase / FR | 3 / FR-014, FR-221, FR-222, FR-225 |
| Authentication | K:subjects:write |
| Authorization | owner (the key acts as exactly one user; cross-user = 404) |
| Request parameters | header `Authorization: Bearer lum_<key>` (required); path `id` (`Id`; a non-UUID value is 404 `not_found`); header `If-Match: "<version>"` (required; a bare integer is also accepted) |
| Request body | none |
| Response | `200` `PublicSubject` with `archivedAt` `null`; header `ETag: "<new version>"` |
| Validation rules | The subject returns as the last active subject (AC-FR-014-1). If an active subject already has the name the restore is refused; rename the archived subject with PUB-04, then retry (AC-FR-014-3). |
| Error responses | `name_conflict` 409 (`details.conflictingId`), `version_required` 400 (no `If-Match`), `stale_version` 409 (mismatch; `details.current` = current `PublicSubject`), plus common set (API-ENDPOINTS section 1) |
| Rate limit | RL-PUBLIC |
| Pagination | none |
| Idempotency / concurrency | `If-Match: "<version>"` required (CONVENTIONS section 6); a retry after success returns `stale_version`. `Idempotency-Key` is not used. |

#### PUB-06 GET /v1/topics

| Field | Specification |
|---|---|
| Purpose | List the topics of one subject. |
| Phase / FR | 3 / FR-015, FR-018, FR-221, FR-222, FR-224, FR-225 |
| Authentication | K:topics:read |
| Authorization | owner (the key acts as exactly one user; cross-user = 404) |
| Request parameters | header `Authorization: Bearer lum_<key>` (required); query `subjectId` (`Id`, required), `includeArchived` (bool, default `false`); query `limit` (int 1..100, default 50), `cursor` (`Cursor`) |
| Request body | none |
| Response | `200` `{ data: PublicTopic[], page: PageInfo }` |
| Validation rules | `subjectId` missing or not a UUID is `validation_failed`; an unknown or foreign subject is `not_found` (cross-user = 404). Archived topics only with `includeArchived=true`. |
| Error responses | `invalid_page_size` 400, `invalid_cursor` 400, plus common set (API-ENDPOINTS section 1) |
| Rate limit | RL-PUBLIC |
| Pagination | Cursor. Order `position` ascending; `id` is the tiebreaker (FR-224). |
| Idempotency / concurrency | read only |

#### PUB-07 GET /v1/topics/{id}

| Field | Specification |
|---|---|
| Purpose | Read one topic. |
| Phase / FR | 3 / FR-015, FR-018, FR-221, FR-222, FR-225 |
| Authentication | K:topics:read |
| Authorization | owner (the key acts as exactly one user; cross-user = 404) |
| Request parameters | header `Authorization: Bearer lum_<key>` (required); path `id` (`Id`; a non-UUID value is 404 `not_found`) |
| Request body | none |
| Response | `200` `PublicTopic`; header `ETag: "<version>"` |
| Validation rules | An archived topic is returned with `archivedAt` set. |
| Error responses | none specific; plus common set (API-ENDPOINTS section 1) |
| Rate limit | RL-PUBLIC |
| Pagination | none |
| Idempotency / concurrency | read only |

#### PUB-08 POST /v1/topics

| Field | Specification |
|---|---|
| Purpose | Create a topic in a subject. |
| Phase / FR | 3 / FR-015, FR-019, FR-221, FR-222, FR-225 |
| Authentication | K:topics:write |
| Authorization | owner (the key acts as exactly one user; cross-user = 404) |
| Request parameters | header `Authorization: Bearer lum_<key>` (required); header `Content-Type: application/json`; header `Idempotency-Key` (optional, 1..100 chars, `^[A-Za-z0-9_-]+$`) |
| Request body | `CreateTopicInput` plus required `subjectId` (`Id`) in the body |
| Response | `201` `PublicTopic`; headers `Location: /v1/topics/{id}`, `ETag: "<version>"`; `Idempotent-Replay: true` on a replay |
| Validation rules | `name` 1..150 trimmed (AC-FR-015-3); `weight` integer 1..5, default 1 (AC-FR-015-2); `status` `not_started`, `in_progress` or `done`, default `not_started`. `subjectId` of an unknown or foreign subject is `not_found`. Bulk creation is not public. |
| Error responses | `subject_archived` 409 (subject is archived, BR-029), `idempotency_key_reused` 409 (same key, different body), `request_in_progress` 409 (same key still executing, `Retry-After: 1`), plus common set (API-ENDPOINTS section 1) |
| Rate limit | RL-PUBLIC |
| Pagination | none |
| Idempotency / concurrency | Optional `Idempotency-Key` (CONVENTIONS section 7): with it, a replay returns the stored `201` with `Idempotent-Replay: true`; without it every call creates a new record. No `If-Match` (create). |

#### PUB-09 PATCH /v1/topics/{id}

| Field | Specification |
|---|---|
| Purpose | Change a topic's name, weight or status. |
| Phase / FR | 3 / FR-016, FR-019, FR-221, FR-222, FR-225 |
| Authentication | K:topics:write |
| Authorization | owner (the key acts as exactly one user; cross-user = 404) |
| Request parameters | header `Authorization: Bearer lum_<key>` (required); header `Content-Type: application/json`; path `id` (`Id`; a non-UUID value is 404 `not_found`); header `If-Match: "<version>"` (required; a bare integer is also accepted) |
| Request body | `UpdateTopicInput` (`name`, `weight`, `status`; at least one) |
| Response | `200` `PublicTopic`; header `ETag: "<new version>"` |
| Validation rules | Same limits as create. `status` outside the three values is `validation_failed` (AC-FR-019-3). Status is never changed automatically. `subjectId` and `position` are not accepted (strict body; reordering is internal-only). |
| Error responses | `version_required` 400 (no `If-Match`), `stale_version` 409 (mismatch; `details.current` = current `PublicTopic`), plus common set (API-ENDPOINTS section 1) |
| Rate limit | RL-PUBLIC |
| Pagination | none |
| Idempotency / concurrency | `If-Match: "<version>"` required (CONVENTIONS section 6); a retry after success returns `stale_version`. `Idempotency-Key` is not used. |

#### PUB-10a POST /v1/topics/{id}/archive

| Field | Specification |
|---|---|
| Purpose | Archive a topic; recorded sessions stay with the subject. |
| Phase / FR | 3 / FR-018, FR-221, FR-222, FR-225 |
| Authentication | K:topics:write |
| Authorization | owner (the key acts as exactly one user; cross-user = 404) |
| Request parameters | header `Authorization: Bearer lum_<key>` (required); path `id` (`Id`; a non-UUID value is 404 `not_found`); header `If-Match: "<version>"` (required; a bare integer is also accepted) |
| Request body | none |
| Response | `200` `PublicTopic` with `archivedAt` set; header `ETag: "<new version>"` |
| Validation rules | Existing sessions keep their topic reference and show it as archived (AC-FR-018-1). The topic leaves pickers and exam checklists (EC-008). |
| Error responses | `version_required` 400 (no `If-Match`), `stale_version` 409 (mismatch; `details.current` = current `PublicTopic`), plus common set (API-ENDPOINTS section 1) |
| Rate limit | RL-PUBLIC |
| Pagination | none |
| Idempotency / concurrency | `If-Match: "<version>"` required (CONVENTIONS section 6); a retry after success returns `stale_version`. `Idempotency-Key` is not used. |

#### PUB-10b POST /v1/topics/{id}/restore

| Field | Specification |
|---|---|
| Purpose | Restore an archived topic with its earlier status and weight. |
| Phase / FR | 3 / FR-018, FR-221, FR-222, FR-225 |
| Authentication | K:topics:write |
| Authorization | owner (the key acts as exactly one user; cross-user = 404) |
| Request parameters | header `Authorization: Bearer lum_<key>` (required); path `id` (`Id`; a non-UUID value is 404 `not_found`); header `If-Match: "<version>"` (required; a bare integer is also accepted) |
| Request body | none |
| Response | `200` `PublicTopic` with `archivedAt` `null`; header `ETag: "<new version>"` |
| Validation rules | Status and weight are those held before archiving (AC-FR-018-3). |
| Error responses | `version_required` 400 (no `If-Match`), `stale_version` 409 (mismatch; `details.current` = current `PublicTopic`), plus common set (API-ENDPOINTS section 1) |
| Rate limit | RL-PUBLIC |
| Pagination | none |
| Idempotency / concurrency | `If-Match: "<version>"` required (CONVENTIONS section 6); a retry after success returns `stale_version`. `Idempotency-Key` is not used. |

#### PUB-11 GET /v1/sessions

| Field | Specification |
|---|---|
| Purpose | List study sessions, newest first. |
| Phase / FR | 3 / FR-061, FR-221, FR-222, FR-224, FR-225 |
| Authentication | K:sessions:read |
| Authorization | owner (the key acts as exactly one user; cross-user = 404) |
| Request parameters | header `Authorization: Bearer lum_<key>` (required); query `from`, `to` (`LocalDate`, inclusive, profile zone), `subjectId` (`Id`), `topicId` (`Id`), `source` (`timer` or `manual`); query `limit` (int 1..100, default 50), `cursor` (`Cursor`) |
| Request body | none |
| Response | `200` `{ data: PublicStudySession[], page: PageInfo }` |
| Validation rules | Every filter is optional and filters combine with AND. `from` later than `to` is `invalid_date_range`. Day filters use the `localDate` frozen on each session (ADR-006), not the current profile zone. No maximum span applies (the 93-day cap is plan entries only). |
| Error responses | `invalid_date_range` 400, `invalid_page_size` 400, `invalid_cursor` 400, plus common set (API-ENDPOINTS section 1) |
| Rate limit | RL-PUBLIC |
| Pagination | Cursor. Order `startedAt` descending, `id` descending; `id` is the tiebreaker (FR-224). |
| Idempotency / concurrency | read only |

#### PUB-12 GET /v1/sessions/{id}

| Field | Specification |
|---|---|
| Purpose | Read one study session. |
| Phase / FR | 3 / FR-043, FR-061, FR-221, FR-222, FR-225 |
| Authentication | K:sessions:read |
| Authorization | owner (the key acts as exactly one user; cross-user = 404) |
| Request parameters | header `Authorization: Bearer lum_<key>` (required); path `id` (`Id`; a non-UUID value is 404 `not_found`) |
| Request body | none |
| Response | `200` `PublicStudySession`; header `ETag: "<version>"` |
| Validation rules | `source` reports `timer` or `manual`; day allocations and timer details are not part of the public DTO. |
| Error responses | none specific; plus common set (API-ENDPOINTS section 1) |
| Rate limit | RL-PUBLIC |
| Pagination | none |
| Idempotency / concurrency | read only |

#### PUB-13 POST /v1/sessions

| Field | Specification |
|---|---|
| Purpose | Record a manual study session from a past time range. |
| Phase / FR | 3 / FR-042, FR-048, FR-221, FR-222, FR-225 |
| Authentication | K:sessions:write |
| Authorization | owner (the key acts as exactly one user; cross-user = 404) |
| Request parameters | header `Authorization: Bearer lum_<key>` (required); header `Content-Type: application/json`; header `Idempotency-Key` (required, 1..100 chars, `^[A-Za-z0-9_-]+$`) |
| Request body | `CreateStudySessionInput` (`subjectId`, `topicId`, `planEntryId`, `startedAt`, `endedAt`) |
| Response | `201` `PublicStudySession` with `source` `manual`; headers `Location: /v1/sessions/{id}`, `ETag: "<version>"`; `Idempotent-Replay: true` on a replay (same key returns the stored row, AC-FR-048-1) |
| Validation rules | `startedAt` and `endedAt` not in the future; `endedAt` after `startedAt`; duration is derived and must be 60..86400 s; the total of one local day, over all sessions, may not exceed 86400 s (EC-011). The range may not overlap another session of the owner. `topicId` must belong to `subjectId`, else `validation_failed`; an unknown or foreign `subjectId`, `topicId` or `planEntryId` is `not_found`. `source` is never accepted; created sessions are always `manual` (BR-010). `timezone` and `localDate` are frozen from the profile at creation. |
| Error responses | `idempotency_key_required` 400, `manual_entry_in_future` 400, `manual_entry_too_long` 400, `daily_total_exceeded` 400, `manual_entry_overlaps_session` 409 (`details.conflictingSessionId`), `subject_archived` 409, `idempotency_key_reused` 409 (same key, different body), `request_in_progress` 409 (same key still executing, `Retry-After: 1`), plus common set (API-ENDPOINTS section 1) |
| Rate limit | RL-PUBLIC |
| Pagination | none |
| Idempotency / concurrency | `Idempotency-Key` REQUIRED, stored as `request_key` (CONVENTIONS section 7); two different keys create two sessions (AC-FR-048-3). No `If-Match` (create). |

#### PUB-14 PATCH /v1/sessions/{id}

| Field | Specification |
|---|---|
| Purpose | Correct the subject, topic, plan link or time range of a session. |
| Phase / FR | 3 / FR-043, FR-221, FR-222, FR-225 |
| Authentication | K:sessions:write |
| Authorization | owner (the key acts as exactly one user; cross-user = 404) |
| Request parameters | header `Authorization: Bearer lum_<key>` (required); header `Content-Type: application/json`; path `id` (`Id`; a non-UUID value is 404 `not_found`); header `If-Match: "<version>"` (required; a bare integer is also accepted) |
| Request body | `UpdateStudySessionInput` (`subjectId`, `topicId`, `planEntryId`, `startedAt`, `endedAt`; at least one) |
| Response | `200` `PublicStudySession`; header `ETag: "<new version>"` |
| Validation rules | Same time, duration, 24 h per day and overlap rules as PUB-13; duration is recomputed from the new range (AC-FR-043-1). `source` in the body is `validation_failed` (immutable, BR-010). Timer-created sessions can be edited with the same rules. |
| Error responses | `manual_entry_in_future` 400, `manual_entry_too_long` 400, `daily_total_exceeded` 400, `manual_entry_overlaps_session` 409, `subject_archived` 409, `version_required` 400 (no `If-Match`), `stale_version` 409 (mismatch; `details.current` = current `PublicStudySession`), plus common set (API-ENDPOINTS section 1) |
| Rate limit | RL-PUBLIC |
| Pagination | none |
| Idempotency / concurrency | `If-Match: "<version>"` required (CONVENTIONS section 6); a retry after success returns `stale_version`. `Idempotency-Key` is not used. |

#### PUB-15 DELETE /v1/sessions/{id}

| Field | Specification |
|---|---|
| Purpose | Delete a study session. |
| Phase / FR | 3 / FR-044, FR-221, FR-222, FR-225 |
| Authentication | K:sessions:write |
| Authorization | owner (the key acts as exactly one user; cross-user = 404) |
| Request parameters | header `Authorization: Bearer lum_<key>` (required); path `id` (`Id`; a non-UUID value is 404 `not_found`); header `If-Match: "<version>"` (required; a bare integer is also accepted) |
| Request body | none |
| Response | `204` no body |
| Validation rules | Totals of the session's days fall by its duration (AC-FR-044-1). |
| Error responses | `version_required` 400 (no `If-Match`), `stale_version` 409 (mismatch; `details.current` = current `PublicStudySession`), plus common set (API-ENDPOINTS section 1) |
| Rate limit | RL-PUBLIC |
| Pagination | none |
| Idempotency / concurrency | `If-Match: "<version>"` required (CONVENTIONS section 6). `Idempotency-Key` is not used; a retry after success finds no record (`not_found`). |

#### PUB-16 GET /v1/plan-entries

| Field | Specification |
|---|---|
| Purpose | List plan entries in a date range. |
| Phase / FR | 3 / FR-037, FR-221, FR-222, FR-224, FR-225 |
| Authentication | K:plan_entries:read |
| Authorization | owner (the key acts as exactly one user; cross-user = 404) |
| Request parameters | header `Authorization: Bearer lum_<key>` (required); query `from`, `to` (`LocalDate`, both required, inclusive, profile zone), `subjectId` (`Id`), `status` (`upcoming`, `done`, `missed`) |
| Request body | none |
| Response | `200` `{ data: PublicPlanEntry[] }` (no `page`) |
| Validation rules | `from` and `to` are required (else `validation_failed`); `from` later than `to` or a span over 93 days is `invalid_date_range`. `status` is derived: `missed` if `missedAt` is set, `done` if a session is linked, else `upcoming`. Planned-versus-actual fields are internal-only. |
| Error responses | `invalid_date_range` 400, plus common set (API-ENDPOINTS section 1) |
| Rate limit | RL-PUBLIC |
| Pagination | not paginated (bounded by the 93-day range); order `startsAt` ascending, `id` ascending |
| Idempotency / concurrency | read only |

#### PUB-17 GET /v1/plan-entries/{id}

| Field | Specification |
|---|---|
| Purpose | Read one plan entry. |
| Phase / FR | 3 / FR-036, FR-221, FR-222, FR-225 |
| Authentication | K:plan_entries:read |
| Authorization | owner (the key acts as exactly one user; cross-user = 404) |
| Request parameters | header `Authorization: Bearer lum_<key>` (required); path `id` (`Id`; a non-UUID value is 404 `not_found`) |
| Request body | none |
| Response | `200` `PublicPlanEntry`; header `ETag: "<version>"` |
| Validation rules | `status` is derived as in PUB-16. |
| Error responses | none specific; plus common set (API-ENDPOINTS section 1) |
| Rate limit | RL-PUBLIC |
| Pagination | none |
| Idempotency / concurrency | read only |

#### PUB-18 POST /v1/plan-entries

| Field | Specification |
|---|---|
| Purpose | Plan a future study block. |
| Phase / FR | 3 / FR-030, FR-034, FR-038, FR-221, FR-222, FR-225 |
| Authentication | K:plan_entries:write |
| Authorization | owner (the key acts as exactly one user; cross-user = 404) |
| Request parameters | header `Authorization: Bearer lum_<key>` (required); header `Content-Type: application/json`; header `Idempotency-Key` (optional, 1..100 chars, `^[A-Za-z0-9_-]+$`) |
| Request body | `CreatePlanEntryInput` (`subjectId`, `topicId`, `startsAt`, `durationMin`, `confirmedWarnings`) |
| Response | `201` `PublicPlanEntry`; headers `Location: /v1/plan-entries/{id}`, `ETag: "<version>"`; `Idempotent-Replay: true` on a replay |
| Validation rules | `startsAt` strictly in the future, else `validation_failed` (AC-FR-030-4); `durationMin` integer 5..480; `topicId` must belong to `subjectId`. An overlap with the owner's other entries or a date after the subject's exam date returns a warning 409; the caller resubmits with `confirmedWarnings` (`overlap`, `exam_date`) and a new `Idempotency-Key` (CONVENTIONS section 8, BR-026). |
| Error responses | `duration_out_of_range` 400, `overlap_confirmation_required` 409 (`details.warnings`), `exam_date_warning_confirmation_required` 409 (`details.warnings`), `subject_archived` 409, `idempotency_key_reused` 409 (same key, different body), `request_in_progress` 409 (same key still executing, `Retry-After: 1`), plus common set (API-ENDPOINTS section 1) |
| Rate limit | RL-PUBLIC |
| Pagination | none |
| Idempotency / concurrency | Optional `Idempotency-Key` (CONVENTIONS section 7): with it, a replay returns the stored `201` with `Idempotent-Replay: true`; without it every call creates a new record. No `If-Match` (create). |

#### PUB-19 PATCH /v1/plan-entries/{id}

| Field | Specification |
|---|---|
| Purpose | Change an upcoming plan entry. |
| Phase / FR | 3 / FR-031, FR-034, FR-035, FR-221, FR-222, FR-225 |
| Authentication | K:plan_entries:write |
| Authorization | owner (the key acts as exactly one user; cross-user = 404) |
| Request parameters | header `Authorization: Bearer lum_<key>` (required); header `Content-Type: application/json`; path `id` (`Id`; a non-UUID value is 404 `not_found`); header `If-Match: "<version>"` (required; a bare integer is also accepted) |
| Request body | `UpdatePlanEntryInput` (`subjectId`, `topicId`, `startsAt`, `durationMin`, `confirmedWarnings`; at least one) |
| Response | `200` `PublicPlanEntry`; header `ETag: "<new version>"` |
| Validation rules | Only entries that have not started are editable (BR-028). Same field limits and warning flow as PUB-18; the overlap and exam-date checks run again on the new values. |
| Error responses | `past_entry_read_only` 409 (`details.startsAt`), `duration_out_of_range` 400, `overlap_confirmation_required` 409, `exam_date_warning_confirmation_required` 409, `subject_archived` 409, `version_required` 400 (no `If-Match`), `stale_version` 409 (mismatch; `details.current` = current `PublicPlanEntry`), plus common set (API-ENDPOINTS section 1) |
| Rate limit | RL-PUBLIC |
| Pagination | none |
| Idempotency / concurrency | `If-Match: "<version>"` required (CONVENTIONS section 6); a retry after success returns `stale_version`. `Idempotency-Key` is not used. |

#### PUB-20 DELETE /v1/plan-entries/{id}

| Field | Specification |
|---|---|
| Purpose | Delete a plan entry; linked sessions stay, unlinked. |
| Phase / FR | 3 / FR-032, FR-221, FR-222, FR-225 |
| Authentication | K:plan_entries:write |
| Authorization | owner (the key acts as exactly one user; cross-user = 404) |
| Request parameters | header `Authorization: Bearer lum_<key>` (required); path `id` (`Id`; a non-UUID value is 404 `not_found`); header `If-Match: "<version>"` (required; a bare integer is also accepted) |
| Request body | none |
| Response | `204` no body |
| Validation rules | Sessions linked to the entry remain and lose their `planEntryId` (AC-FR-032-1, EC-022). |
| Error responses | `version_required` 400 (no `If-Match`), `stale_version` 409 (mismatch; `details.current` = current `PublicPlanEntry`), plus common set (API-ENDPOINTS section 1) |
| Rate limit | RL-PUBLIC |
| Pagination | none |
| Idempotency / concurrency | `If-Match: "<version>"` required (CONVENTIONS section 6). `Idempotency-Key` is not used; a retry after success finds no record (`not_found`). |

#### PUB-21 POST /v1/plan-entries/{id}/missed

| Field | Specification |
|---|---|
| Purpose | Mark a past entry without recorded time as missed. |
| Phase / FR | 3 / FR-033, FR-221, FR-222, FR-225 |
| Authentication | K:plan_entries:write |
| Authorization | owner (the key acts as exactly one user; cross-user = 404) |
| Request parameters | header `Authorization: Bearer lum_<key>` (required); path `id` (`Id`; a non-UUID value is 404 `not_found`); header `If-Match: "<version>"` (required; a bare integer is also accepted) |
| Request body | none |
| Response | `200` `PublicPlanEntry` with `status` `missed` and `missedAt` set; header `ETag: "<new version>"` |
| Validation rules | Refused with `validation_failed` when the entry has not started yet (AC-FR-033-3) or has a linked session (AC-FR-033-2). |
| Error responses | `version_required` 400 (no `If-Match`), `stale_version` 409 (mismatch; `details.current` = current `PublicPlanEntry`), plus common set (API-ENDPOINTS section 1) |
| Rate limit | RL-PUBLIC |
| Pagination | none |
| Idempotency / concurrency | `If-Match: "<version>"` required (CONVENTIONS section 6); a retry after success returns `stale_version`. `Idempotency-Key` is not used. |

#### PUB-22 GET /v1/todos

| Field | Specification |
|---|---|
| Purpose | List to-dos. |
| Phase / FR | 3 / FR-094, FR-095, FR-221, FR-222, FR-224, FR-225 |
| Authentication | K:todos:read |
| Authorization | owner (the key acts as exactly one user; cross-user = 404) |
| Request parameters | header `Authorization: Bearer lum_<key>` (required); query `status` (`open` default, `done`, `all`), `subjectId` (`Id`), `priority` (`high`, `medium`, `low`), `due` (`overdue`, `today`, `within7`, `none`); query `limit` (int 1..100, default 50), `cursor` (`Cursor`) |
| Request body | none |
| Response | `200` `{ data: PublicTodo[], page: PageInfo }` |
| Validation rules | Filters combine with AND. `overdue` means open with `dueDate` before today in the profile zone (AC-FR-094-3). Values outside the enums are `validation_failed`. `PublicTodo` carries no `overdue` field. |
| Error responses | `invalid_page_size` 400, `invalid_cursor` 400, plus common set (API-ENDPOINTS section 1) |
| Rate limit | RL-PUBLIC |
| Pagination | Cursor. FR-095 composite: open before done (relevant for `status=all`), priority `high`, `medium`, `low`, `dueDate` ascending with no due date last, `createdAt` ascending, then `id`; the cursor encodes `(priorityRank, dueDate or null, createdAt, id)`. |
| Idempotency / concurrency | read only |

#### PUB-23 GET /v1/todos/{id}

| Field | Specification |
|---|---|
| Purpose | Read one to-do. |
| Phase / FR | 3 / FR-091, FR-221, FR-222, FR-225 |
| Authentication | K:todos:read |
| Authorization | owner (the key acts as exactly one user; cross-user = 404) |
| Request parameters | header `Authorization: Bearer lum_<key>` (required); path `id` (`Id`; a non-UUID value is 404 `not_found`) |
| Request body | none |
| Response | `200` `PublicTodo`; header `ETag: "<version>"` |
| Validation rules | `completedAt` is set if and only if `done` is true. |
| Error responses | none specific; plus common set (API-ENDPOINTS section 1) |
| Rate limit | RL-PUBLIC |
| Pagination | none |
| Idempotency / concurrency | read only |

#### PUB-24 POST /v1/todos

| Field | Specification |
|---|---|
| Purpose | Create a to-do. |
| Phase / FR | 3 / FR-090, FR-096, FR-221, FR-222, FR-225 |
| Authentication | K:todos:write |
| Authorization | owner (the key acts as exactly one user; cross-user = 404) |
| Request parameters | header `Authorization: Bearer lum_<key>` (required); header `Content-Type: application/json`; header `Idempotency-Key` (optional, 1..100 chars, `^[A-Za-z0-9_-]+$`) |
| Request body | `CreateTodoInput` (`title`, `subjectId`, `topicId`, `dueDate`, `priority`) |
| Response | `201` `PublicTodo`; headers `Location: /v1/todos/{id}`, `ETag: "<version>"`; `Idempotent-Replay: true` on a replay |
| Validation rules | `title` 1..200 characters, not whitespace-only (AC-FR-090-2); `priority` `high`, `medium` or `low`, default `medium` (AC-FR-096-1); `topicId` requires `subjectId` and must belong to it, else `validation_failed` (AC-FR-090-4); `dueDate` a `LocalDate` or omitted. Created as not done. |
| Error responses | `subject_archived` 409, `idempotency_key_reused` 409 (same key, different body), `request_in_progress` 409 (same key still executing, `Retry-After: 1`), plus common set (API-ENDPOINTS section 1) |
| Rate limit | RL-PUBLIC |
| Pagination | none |
| Idempotency / concurrency | Optional `Idempotency-Key` (CONVENTIONS section 7): with it, a replay returns the stored `201` with `Idempotent-Replay: true`; without it every call creates a new record. No `If-Match` (create). |

#### PUB-25 PATCH /v1/todos/{id}

| Field | Specification |
|---|---|
| Purpose | Edit a to-do and, unlike the internal API, set or clear its completion in the same call. |
| Phase / FR | 3 / FR-091, FR-093, FR-221, FR-222, FR-225 |
| Authentication | K:todos:write |
| Authorization | owner (the key acts as exactly one user; cross-user = 404) |
| Request parameters | header `Authorization: Bearer lum_<key>` (required); header `Content-Type: application/json`; path `id` (`Id`; a non-UUID value is 404 `not_found`); header `If-Match: "<version>"` (required; a bare integer is also accepted) |
| Request body | `UpdateTodoInput` plus optional `done` (bool); at least one field |
| Response | `200` `PublicTodo`; header `ETag: "<new version>"` |
| Validation rules | Deliberate difference: the internal client marks completion with `PUT /todos/{id}/completion` (TODO-05, no `If-Match`); `/v1` has no such route, so `done` is a PATCH field under `If-Match`. `done` true sets `completedAt`, false clears it; the completion event is published only on a false-to-true change (AC-FR-093-1, AC-FR-093-2). Other fields follow PUB-24 (`title` 1..200, `priority`, `subjectId`, `topicId`, `dueDate`; `null` clears a nullable field, AC-FR-091-2). |
| Error responses | `subject_archived` 409, `version_required` 400 (no `If-Match`), `stale_version` 409 (mismatch; `details.current` = current `PublicTodo`), plus common set (API-ENDPOINTS section 1) |
| Rate limit | RL-PUBLIC |
| Pagination | none |
| Idempotency / concurrency | `If-Match: "<version>"` required (CONVENTIONS section 6); a retry after success returns `stale_version`. `Idempotency-Key` is not used. |

#### PUB-26 DELETE /v1/todos/{id}

| Field | Specification |
|---|---|
| Purpose | Delete a to-do permanently. |
| Phase / FR | 3 / FR-092, FR-221, FR-222, FR-225 |
| Authentication | K:todos:write |
| Authorization | owner (the key acts as exactly one user; cross-user = 404) |
| Request parameters | header `Authorization: Bearer lum_<key>` (required); path `id` (`Id`; a non-UUID value is 404 `not_found`); header `If-Match: "<version>"` (required; a bare integer is also accepted) |
| Request body | none |
| Response | `204` no body |
| Validation rules | Hard delete; study statistics are unchanged (AC-FR-092-4). |
| Error responses | `version_required` 400 (no `If-Match`), `stale_version` 409 (mismatch; `details.current` = current `PublicTodo`), plus common set (API-ENDPOINTS section 1) |
| Rate limit | RL-PUBLIC |
| Pagination | none |
| Idempotency / concurrency | `If-Match: "<version>"` required (CONVENTIONS section 6). `Idempotency-Key` is not used; a retry after success finds no record (`not_found`). |

#### PUB-27 GET /v1/notes

| Field | Specification |
|---|---|
| Purpose | List notes without their bodies. |
| Phase / FR | 3 / FR-100, FR-221, FR-222, FR-224, FR-225 |
| Authentication | K:notes:read |
| Authorization | owner (the key acts as exactly one user; cross-user = 404) |
| Request parameters | header `Authorization: Bearer lum_<key>` (required); query `subjectId` (`Id`), `topicId` (`Id`); query `limit` (int 1..100, default 50), `cursor` (`Cursor`) |
| Request body | none |
| Response | `200` `{ data: PublicNoteListItem[], page: PageInfo }` |
| Validation rules | Items carry `bodyPreview` (first 200 characters of the raw Markdown) instead of `body`. |
| Error responses | `invalid_page_size` 400, `invalid_cursor` 400, plus common set (API-ENDPOINTS section 1) |
| Rate limit | RL-PUBLIC |
| Pagination | Cursor. Order `updatedAt` descending, `id` descending; `id` is the tiebreaker (FR-224). |
| Idempotency / concurrency | read only |

#### PUB-28 GET /v1/notes/{id}

| Field | Specification |
|---|---|
| Purpose | Read one note as raw Markdown. |
| Phase / FR | 3 / FR-100, FR-221, FR-222, FR-225 |
| Authentication | K:notes:read |
| Authorization | owner (the key acts as exactly one user; cross-user = 404) |
| Request parameters | header `Authorization: Bearer lum_<key>` (required); path `id` (`Id`; a non-UUID value is 404 `not_found`) |
| Request body | none |
| Response | `200` `PublicNote`; header `ETag: "<version>"` |
| Validation rules | `body` is the Markdown exactly as stored (up to 100000 characters); no rendered HTML is offered on `/v1` (ADR-007). |
| Error responses | none specific; plus common set (API-ENDPOINTS section 1) |
| Rate limit | RL-PUBLIC |
| Pagination | none |
| Idempotency / concurrency | read only |

#### PUB-29 POST /v1/notes

| Field | Specification |
|---|---|
| Purpose | Create a note. |
| Phase / FR | 3 / FR-100, FR-221, FR-222, FR-225 |
| Authentication | K:notes:write |
| Authorization | owner (the key acts as exactly one user; cross-user = 404) |
| Request parameters | header `Authorization: Bearer lum_<key>` (required); header `Content-Type: application/json`; header `Idempotency-Key` (optional, 1..100 chars, `^[A-Za-z0-9_-]+$`) |
| Request body | `CreateNoteInput` (`subjectId`, `topicId`, `title`, `body`) |
| Response | `201` `PublicNote`; headers `Location: /v1/notes/{id}`, `ETag: "<version>"`; `Idempotent-Replay: true` on a replay |
| Validation rules | `subjectId` required; `topicId` must belong to it; `title` 1..200; `body` defaults to empty and is at most 100000 characters, else `input_too_large` (AC-FR-100-4). Markdown is stored unsanitized (ADR-007). |
| Error responses | `input_too_large` 400, `subject_archived` 409, `idempotency_key_reused` 409 (same key, different body), `request_in_progress` 409 (same key still executing, `Retry-After: 1`), plus common set (API-ENDPOINTS section 1) |
| Rate limit | RL-PUBLIC |
| Pagination | none |
| Idempotency / concurrency | Optional `Idempotency-Key` (CONVENTIONS section 7): with it, a replay returns the stored `201` with `Idempotent-Replay: true`; without it every call creates a new record. No `If-Match` (create). |

#### PUB-30 PATCH /v1/notes/{id}

| Field | Specification |
|---|---|
| Purpose | Edit a note's title, body or topic. |
| Phase / FR | 3 / FR-100, FR-103, FR-221, FR-222, FR-225 |
| Authentication | K:notes:write |
| Authorization | owner (the key acts as exactly one user; cross-user = 404) |
| Request parameters | header `Authorization: Bearer lum_<key>` (required); header `Content-Type: application/json`; path `id` (`Id`; a non-UUID value is 404 `not_found`); header `If-Match: "<version>"` (required; a bare integer is also accepted) |
| Request body | `UpdateNoteInput` (`subjectId`, `topicId`, `title`, `body`; at least one) |
| Response | `200` `PublicNote`; header `ETag: "<new version>"`; `version` increases by 1 (AC-FR-100-3) |
| Validation rules | Same limits as PUB-29. On a version mismatch `details.current` carries the whole current `PublicNote` including `body`, so the caller can merge and resubmit, or keep both versions by creating a copy with PUB-29 (FR-103). |
| Error responses | `input_too_large` 400, `version_required` 400 (no `If-Match`), `stale_version` 409 (mismatch; `details.current` = current `PublicNote`), plus common set (API-ENDPOINTS section 1) |
| Rate limit | RL-PUBLIC |
| Pagination | none |
| Idempotency / concurrency | `If-Match: "<version>"` required (CONVENTIONS section 6); a retry after success returns `stale_version`. `Idempotency-Key` is not used. |

#### PUB-31 DELETE /v1/notes/{id}

| Field | Specification |
|---|---|
| Purpose | Delete a note. |
| Phase / FR | 3 / FR-104, FR-221, FR-222, FR-225 |
| Authentication | K:notes:write |
| Authorization | owner (the key acts as exactly one user; cross-user = 404) |
| Request parameters | header `Authorization: Bearer lum_<key>` (required); path `id` (`Id`; a non-UUID value is 404 `not_found`); header `If-Match: "<version>"` (required; a bare integer is also accepted) |
| Request body | none |
| Response | `204` no body |
| Validation rules | The note disappears from subject and topic views (AC-FR-104-1). |
| Error responses | `version_required` 400 (no `If-Match`), `stale_version` 409 (mismatch; `details.current` = current `PublicNote`), plus common set (API-ENDPOINTS section 1) |
| Rate limit | RL-PUBLIC |
| Pagination | none |
| Idempotency / concurrency | `If-Match: "<version>"` required (CONVENTIONS section 6). `Idempotency-Key` is not used; a retry after success finds no record (`not_found`). |

#### PUB-32 GET /v1/exams

| Field | Specification |
|---|---|
| Purpose | List exams, upcoming or archived. |
| Phase / FR | 3 / FR-123, FR-125, FR-221, FR-222, FR-224, FR-225 |
| Authentication | K:exams:read |
| Authorization | owner (the key acts as exactly one user; cross-user = 404) |
| Request parameters | header `Authorization: Bearer lum_<key>` (required); query `state` (`upcoming` default, `archived`); query `limit` (int 1..100, default 50), `cursor` (`Cursor`) |
| Request body | none |
| Response | `200` `{ data: PublicExamListItem[], page: PageInfo }` |
| Validation rules | `state` outside the two values is `validation_failed`. List items carry no checklist; `readiness` and `countdown` are not part of the public DTO. |
| Error responses | `invalid_page_size` 400, `invalid_cursor` 400, plus common set (API-ENDPOINTS section 1) |
| Rate limit | RL-PUBLIC |
| Pagination | Cursor. `upcoming`: `examDate` ascending (nearest first, AC-FR-123-4), `id` ascending. `archived`: `examDate` descending (newest first, AC-FR-125-1), `id` descending. |
| Idempotency / concurrency | read only |

#### PUB-33 GET /v1/exams/{id}

| Field | Specification |
|---|---|
| Purpose | Read one exam with its checklist. |
| Phase / FR | 3 / FR-122, FR-125, FR-221, FR-222, FR-225 |
| Authentication | K:exams:read |
| Authorization | owner (the key acts as exactly one user; cross-user = 404) |
| Request parameters | header `Authorization: Bearer lum_<key>` (required); path `id` (`Id`; a non-UUID value is 404 `not_found`) |
| Request body | none |
| Response | `200` `PublicExam`; header `ETag: "<version>"` |
| Validation rules | `checklist` is `[{ topicId, completed }]`; an exam with no topics returns an empty list (AC-FR-122-3). |
| Error responses | none specific; plus common set (API-ENDPOINTS section 1) |
| Rate limit | RL-PUBLIC |
| Pagination | none |
| Idempotency / concurrency | read only |

#### PUB-34 POST /v1/exams

| Field | Specification |
|---|---|
| Purpose | Create an exam. |
| Phase / FR | 3 / FR-120, FR-221, FR-222, FR-225 |
| Authentication | K:exams:write |
| Authorization | owner (the key acts as exactly one user; cross-user = 404) |
| Request parameters | header `Authorization: Bearer lum_<key>` (required); header `Content-Type: application/json`; header `Idempotency-Key` (optional, 1..100 chars, `^[A-Za-z0-9_-]+$`) |
| Request body | `CreateExamInput` (`subjectId`, `title`, `examDate`) |
| Response | `201` `PublicExam`; headers `Location: /v1/exams/{id}`, `ETag: "<version>"`; `Idempotent-Replay: true` on a replay |
| Validation rules | `title` 1..200 (AC-FR-120-4); `subjectId` required, active subject; `examDate` is today or later in the profile zone, else `exam_date_in_past` (EC-013). |
| Error responses | `exam_date_in_past` 400 (`details.today`), `subject_archived` 409, `idempotency_key_reused` 409 (same key, different body), `request_in_progress` 409 (same key still executing, `Retry-After: 1`), plus common set (API-ENDPOINTS section 1) |
| Rate limit | RL-PUBLIC |
| Pagination | none |
| Idempotency / concurrency | Optional `Idempotency-Key` (CONVENTIONS section 7): with it, a replay returns the stored `201` with `Idempotent-Replay: true`; without it every call creates a new record. No `If-Match` (create). |

#### PUB-35 PATCH /v1/exams/{id}

| Field | Specification |
|---|---|
| Purpose | Edit an exam's subject, title or date. |
| Phase / FR | 3 / FR-121, FR-221, FR-222, FR-225 |
| Authentication | K:exams:write |
| Authorization | owner (the key acts as exactly one user; cross-user = 404) |
| Request parameters | header `Authorization: Bearer lum_<key>` (required); header `Content-Type: application/json`; path `id` (`Id`; a non-UUID value is 404 `not_found`); header `If-Match: "<version>"` (required; a bare integer is also accepted) |
| Request body | `UpdateExamInput` (`subjectId`, `title`, `examDate`; at least one) |
| Response | `200` `PublicExam`; header `ETag: "<new version>"` |
| Validation rules | A past `examDate` is accepted on edit; the exam archives on the next day (AC-FR-121-2, EC-013). Changing `subjectId` clears the checklist in the same transaction (AC-FR-121-4). |
| Error responses | `subject_archived` 409, `version_required` 400 (no `If-Match`), `stale_version` 409 (mismatch; `details.current` = current `PublicExam`), plus common set (API-ENDPOINTS section 1) |
| Rate limit | RL-PUBLIC |
| Pagination | none |
| Idempotency / concurrency | `If-Match: "<version>"` required (CONVENTIONS section 6); a retry after success returns `stale_version`. `Idempotency-Key` is not used. |

#### PUB-36 PUT /v1/exams/{id}/topics

| Field | Specification |
|---|---|
| Purpose | Replace the set of topics on an exam's checklist. |
| Phase / FR | 3 / FR-122, FR-221, FR-222, FR-225 |
| Authentication | K:exams:write |
| Authorization | owner (the key acts as exactly one user; cross-user = 404) |
| Request parameters | header `Authorization: Bearer lum_<key>` (required); header `Content-Type: application/json`; path `id` (`Id`; a non-UUID value is 404 `not_found`) |
| Request body | `SetExamTopicsInput` (`topicIds`) |
| Response | `200` `PublicExam` with the new `checklist` |
| Validation rules | Every `topicId` must be an active topic of the exam's subject, else `validation_failed` (AC-FR-122-4). Topics that stay keep their `completed` value; topics left out leave the checklist. An archived exam is read-only and gets `validation_failed` (AC-FR-125-3). Marking a single topic complete is the internal route EXAM-06 and has no public twin. |
| Error responses | none specific; plus common set (API-ENDPOINTS section 1) |
| Rate limit | RL-PUBLIC |
| Pagination | none |
| Idempotency / concurrency | none (idempotent set): repeating the same `topicIds` gives the same result. Checklist rows are not versioned (CONVENTIONS section 6), so there is no `If-Match`; `Idempotency-Key` is not used. |

#### PUB-37 GET /v1/openapi.json

| Field | Specification |
|---|---|
| Purpose | Serve the machine-readable OpenAPI 3.1 description of `/v1`. |
| Phase / FR | 3 / FR-223, NFR-060 |
| Authentication | G |
| Authorization | none (public document, no user data) |
| Request parameters | none (no `Authorization` header needed; a key, if sent, is ignored) |
| Request body | none |
| Response | `200` OpenAPI 3.1 JSON document (`application/json`) |
| Validation rules | The document describes only the `/v1` operations in this section (see [OPENAPI-PLAN.md](OPENAPI-PLAN.md)). No data of any user is included. |
| Error responses | none specific; only `rate_limited` and `internal_error` of the common set apply (no key, no `{id}`, no body) |
| Rate limit | RL-DOC (60/min per IP, bucket `doc:<ip>`) |
| Pagination | not paginated (single document) |
| Idempotency / concurrency | read only |

## 5. Not exposed as REST

Planning 6 asks not to expose REST endpoints unnecessarily. Each item below has no endpoint, with the reason.

| Capability | Mechanism instead | Reason |
|---|---|---|
| Dashboard (FR-020..024) | Server Component composes Goals, Timer, Study plans, Tasks and Analytics in-process | Page data needs no HTTP; client islands refresh through existing endpoints |
| Page data loads for every screen | Server Components call application services | Avoids a second contract and a round trip (API-CONVENTIONS section 14) |
| Idle auto-close, purge, exam archive, retention, token cleanup, rollups | Background jobs ([BACKGROUND-JOBS.md](../03-architecture/BACKGROUND-JOBS.md) section 2) | No user trigger; outcomes are visible through existing resources |
| Streak and XP evaluation (FR-160..164, FR-170..177) | Jobs and domain events; read-only GAME-01 | No FR lets a client write them |
| XP ledger listing | None | No FR displays ledger rows |
| CheckOverlap, ComputeReadiness | Folded into PLAN-02, PLAN-04 and EXAM-03 responses | A separate call would duplicate the write-time check |
| Audit log | None | No user-facing FR; auth events are in the sign-ins list only as sessions |
| Password hash and session internals | None | Credentials never leave the Authentication module |
| Push delivery, email send | Notifications ports | Delivery is a job concern ([EXTERNAL-INTEGRATIONS.md](EXTERNAL-INTEGRATIONS.md)) |
| Leaderboard weekly compute | Computed on read in GRP-15 | Avoids a stale precomputed table (API-CONVENTIONS reconciliation 3) |
| Goal history listing | Internal to `GetTargetForDay` | No FR displays target history |
| Statistics writes | None | Analytics is read-only (MODULE-BOUNDARIES rule 5) |
| Outbound webhooks | None through Phase 3 | See [WEBHOOKS.md](WEBHOOKS.md) |
| Timer, groups, AI scheduling, goals, flashcards, notifications, statistics in `/v1` | Internal API only | FR-220 fixes the public resources to subjects, topics, sessions, plan entries, to-dos, notes and exams |
| Server actions for data | None | Product-owner decision 1: one route-handler contract per capability |
