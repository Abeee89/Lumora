# M00 Evidence

> Status: executed 2026-11-18. Worktree branch `spike/m00` at commit `73a39b1`; the branch and worktree were deleted at close. Evidence only. The spike code, scratch database and local environment file are deleted; this file is preserved.

## Rules

- One section per executed protocol, using the template at the end.
- Paste raw output and the exact command. A summary written later is not evidence.
- Record library, runtime, browser, PostgreSQL and vendor versions.
- Redact secrets, tokens and personal email addresses.
- State pass or fail against the plan criterion. On fail, name the fallback.
- Do not record a conclusion before the data exists.

## Scope mapping

| M00 item | Protocol |
|---|---|
| (a) authentication library | TS-01, TS-02, TS-03 |
| (b) UUIDv7 | TS-04 |
| (c) OpenAPI tooling | TS-05 |
| (d) pg-boss and pooler | TS-06 |
| (e) vendors | TS-09 |
| Email one-time secret | TS-07 |
| Timer calibration, if not deferred | TS-08 |

## Status

| Protocol | Task | State | Result |
|---|---|---|---|
| TS-01 Lockout | M00-T04 | Executed | PASS: 5 failures lock for 15 minutes; a correct password is refused while locked; the counter clears on success |
| TS-02 Revocation and expiry | M00-T05 | Executed | PASS: revocation observed at 9.97 ms; a backdated session is rejected; lifetime is 2,592,000,000 ms |
| TS-03 OAuth and linking | M00-T06 | Executed | PARTIAL: library callback, PKCE, state replay and same-email refusal PASS; live Google blocked by U-03 |
| TS-04 UUIDv7 | M00-T07 | Executed | PASS: 10,000 valid unique ids and a native `uuid` round trip; Better Auth ids are `text` |
| TS-05 OpenAPI | M00-T08 | Executed | PASS: valid OpenAPI 3.1, deterministic output, breaking change detected and CI failure proven |
| TS-06 Queue and pooler | M00-T09 | Executed | PARTIAL: local atomic enqueue, outbox and retry PASS; pooler and vendor modes blocked by U-02 |
| TS-07 Email and secrets | M00-T10 | Executed | PARTIAL: local sink idempotency and no plaintext PASS; provider sandbox blocked by U-05 |
| TS-08 Timer calibration | M00-T11 | DEFERRED | U-01 default applied; M07 keeps its timer-evidence block; NFR-052 is not claimed |
| TS-09 Vendor checklist | M00-T03 | PARTIAL | Local PostgreSQL 18.6 and `btree_gist` 1.8 observed; vendor rows blocked by U-02 |

## Environment and versions

| Item | Observed value |
|---|---|
| Runner | Windows 10.0.26200, x64 |
| Node.js | v24.13.1 |
| npm | 11.8.0 |
| git | 2.53.0.windows.1 |
| Worktree | `D:/Portofolio/Lumora-m00`, branch `spike/m00`, commit `73a39b1` |
| Main checkout | `D:/Portofolio/Lumora`, branch `main`, commit `73a39b1` at run; `c8f151e` at close |
| Next.js | 16.4.6 |
| React and React DOM | 19.3.0 |
| TypeScript | 5.9.3 |
| Better Auth | 1.7.25 |
| zod | 4.6.7 |
| pg | 8.23.1 |
| pg-boss | 12.38.2 |
| uuidv7 | 1.2.1 |
| @asteasolutions/zod-to-openapi | 9.1.0 |
| embedded-postgres | 18.6.0-beta.19 |
| PostgreSQL | 18.6 on x86_64-windows, compiled by msvc-19.44.35228, 64-bit |
| Extension | `btree_gist` 1.8 |
| Redocly CLI | 2.79.0 |
| oasdiff | 1.39.0 |

The host clock is UTC+07. Every timestamp in this file is UTC.

Limitation: the scratch server is PostgreSQL 18.6 through the `embedded-postgres` beta package. The plan asked for PostgreSQL 15 or newer, so the version satisfies the floor, but no vendor-managed PostgreSQL was tested. PostgreSQL 18 behavior is not the production baseline until a vendor row in TS-09 is observed.

## Scratch database shape

The scratch database was `lumora` on `127.0.0.1:55432`. `scripts/migrate.ts` ran Better Auth `getMigrations(auth.options)` and then the app schema. `migrate.log` at 2026-11-18T02:09:07Z recorded `toBeCreated: [user, session, account, verification]`; `migrate-email.log` at 2026-11-18T02:16:55Z recorded `toBeCreated: []` after the email tables were added. `schema.log` at 2026-11-18T02:09:13Z listed 11 tables; the final list has 12 with `email_bounces`.

Final tables: `account`, `auth_audit_events`, `auth_lockouts`, `email_bounces`, `email_sink`, `job_effects`, `outbox_events`, `password_reset_requests`, `session`, `user`, `uuid_probe`, `verification`, plus the `pgboss` schema.

### Better Auth tables

Observed columns, copied from `pg-facts.log` at 2026-11-18T02:22:22Z:

| Table | Columns |
|---|---|
| `account` | `id text`, `accountId text`, `providerId text`, `userId text`, `accessToken text`, `refreshToken text`, `idToken text`, `accessTokenExpiresAt timestamptz`, `refreshTokenExpiresAt timestamptz`, `scope text`, `password text`, `createdAt timestamptz`, `updatedAt timestamptz` |
| `session` | `id text`, `expiresAt timestamptz`, `token text`, `createdAt timestamptz`, `updatedAt timestamptz`, `ipAddress text`, `userAgent text`, `userId text` |
| `user` | `id text`, `name text`, `email text`, `emailVerified bool`, `image text`, `createdAt timestamptz`, `updatedAt timestamptz` |
| `verification` | `id text`, `identifier text`, `value text`, `expiresAt timestamptz`, `createdAt timestamptz`, `updatedAt timestamptz` |

Constraints and indexes observed at 2026-11-18T02:23Z:

```text
user_pkey              PRIMARY KEY (id)
user_email_key         UNIQUE (email)
session_pkey           PRIMARY KEY (id)
session_token_key      UNIQUE (token)
session_userId_fkey    FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE
session_userId_idx     INDEX ("userId")
account_pkey           PRIMARY KEY (id)
account_userId_fkey    FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE
account_userId_idx     INDEX ("userId")
verification_pkey      PRIMARY KEY (id)
verification_identifier_idx INDEX (identifier)
```

Finding: no unique constraint or unique index on `account(providerId, accountId)` was created by Better Auth 1.7.25. The linking test created one link and did not test duplicate insertion. DATABASE-DESIGN must add an explicit unique constraint or prove an application-level guard before M02. This is an amendment candidate, not a pass.

### App tables

| Table | Columns |
|---|---|
| `auth_lockouts` | `email text primary key`, `failed_count integer not null default 0`, `locked_until timestamptz`, `updated_at timestamptz not null` |
| `auth_audit_events` | `id uuid primary key`, `email text not null`, `event text not null`, `result text not null`, `detail jsonb`, `created_at timestamptz not null default now()` |
| `outbox_events` | `id uuid primary key`, `topic text not null`, `payload jsonb not null`, `created_at timestamptz not null`, `dispatched_at timestamptz` |
| `email_sink` | `id uuid primary key`, `idempotency_key text not null unique`, `recipient text not null`, `template text not null`, `variables_hash text not null`, `created_at timestamptz not null default now()` |
| `email_bounces` | `id uuid primary key`, `idempotency_key text not null unique`, `reason text not null`, `created_at timestamptz not null default now()` |
| `password_reset_requests` | `id uuid primary key`, `email text not null`, `token_hash text not null`, `payload_encrypted text`, `expires_at timestamptz not null`, `created_at timestamptz not null`, `sent_at timestamptz`, `consumed_at timestamptz` |
| `uuid_probe` | `id uuid primary key`, `created_at timestamptz not null default now()` |
| `job_effects` | `effect_key text primary key`, `created_at timestamptz not null default now()` |

`btree_gist` 1.8 was installed before the app schema. No exclusion constraint was exercised. The extension row is the only platform fact transferred to TS-09.

### TS-01 Lockout

- Hypothesis: an application-owned lockout wrapper around Better Auth can stop password guessing after five failures, refuse a correct password while the lock is active, clear the counter on success, and write an audit trail.
- Requirement or decision: NFR-012 and NFR-020; ADR-004 lockout ownership; the owner must be able to explain a refused sign-in.
- Environment and versions: Better Auth 1.7.25, pg 8.23.1, Node 24.13.1, PostgreSQL 18.6. The wrapper is `lib/lockout.ts`, threshold 5, duration 15 minutes. The clock is passed into the wrapper as a `Date`, so no wall-clock wait is used.
- Preconditions: the four Better Auth tables and the app tables `auth_lockouts` and `auth_audit_events`; a clean test identity `m00.lockout@example.test`; the scratch database on port 55432.
- Procedure, exact command:

```bash
node --env-file=.env.local scripts/test-auth.ts
```

The test signs up, deletes the created session, fails the password five times at controlled timestamps, tries the correct password while locked, advances the clock to `lockedUntil + 1000 ms`, then checks the audit rows, the counter, the session and the password storage. Node 24 prints a `MODULE_TYPELESS_PACKAGE_JSON` warning because the scratch package has no `type` field; it is unrelated to the result and is omitted from the excerpt.

- Raw output (session tokens, cookies and the password hash prefix are redacted):

```json
{
  "check": "signUp 200",
  "ok": true,
  "detail": { "status": 200 }
}
{
  "check": "user id is UUIDv7",
  "ok": true,
  "detail": { "userId": "01a1ec76-cd25-7cc0-828f-f61697095bf5" }
}
{
  "check": "failed sign-in 1 records failure",
  "ok": true,
  "detail": { "failedCount": 1, "lockedUntil": null }
}
{
  "check": "failed sign-in 2 records failure",
  "ok": true,
  "detail": { "failedCount": 2, "lockedUntil": null }
}
{
  "check": "failed sign-in 3 records failure",
  "ok": true,
  "detail": { "failedCount": 3, "lockedUntil": null }
}
{
  "check": "failed sign-in 4 records failure",
  "ok": true,
  "detail": { "failedCount": 4, "lockedUntil": null }
}
{
  "check": "failed sign-in 5 records failure",
  "ok": true,
  "detail": { "failedCount": 5, "lockedUntil": "2026-11-18T02:37:55.195Z" }
}
{
  "check": "correct password refused while locked",
  "ok": true,
  "detail": { "kind": "locked", "lockedUntil": "2026-11-18T02:37:55.195Z" }
}
{
  "check": "locked attempt created no session",
  "ok": true,
  "detail": { "count": 0 }
}
{
  "check": "correct password accepted after lock window",
  "ok": true,
  "detail": {
    "kind": "ok",
    "response": {},
    "cookie": "better-auth.session_token=<redacted>"
  }
}
{
  "check": "audit rows written",
  "ok": true,
  "detail": [
    { "event": "lockout", "result": "locked", "count": 1 },
    { "event": "sign_in", "result": "failure", "count": 5 },
    { "event": "sign_in", "result": "locked", "count": 1 },
    { "event": "sign_in", "result": "success", "count": 1 }
  ]
}
{
  "check": "five failure audit rows",
  "ok": true,
  "detail": [
    { "event": "lockout", "result": "locked", "count": 1 },
    { "event": "sign_in", "result": "failure", "count": 5 },
    { "event": "sign_in", "result": "locked", "count": 1 },
    { "event": "sign_in", "result": "success", "count": 1 }
  ]
}
{
  "check": "one lockout audit row",
  "ok": true,
  "detail": [
    { "event": "lockout", "result": "locked", "count": 1 },
    { "event": "sign_in", "result": "failure", "count": 5 },
    { "event": "sign_in", "result": "locked", "count": 1 },
    { "event": "sign_in", "result": "success", "count": 1 }
  ]
}
{
  "check": "lock counter cleared after success",
  "ok": true,
  "detail": { "count": 0 }
}
{
  "check": "session resolves after unlock",
  "ok": true,
  "detail": { "token": "<redacted>" }
}
{
  "check": "session lifetime is 30 days",
  "ok": true,
  "detail": { "ageMs": 2592000000 }
}
{
  "check": "session id is UUIDv7",
  "ok": true,
  "detail": { "sessionId": "01a1ec76-cfd8-79f7-b36b-854a9cbbdbad" }
}
{
  "check": "revoked session rejected",
  "ok": true,
  "detail": {
    "revokeResult": { "status": true },
    "revokeMs": 9.972600000000057
  }
}
{
  "check": "revocation within 60 seconds",
  "ok": true,
  "detail": { "revokeMs": 9.972600000000057 }
}
{
  "check": "second sign-in succeeds",
  "ok": true,
  "detail": {
    "kind": "ok",
    "response": {},
    "cookie": "better-auth.session_token=<redacted>"
  }
}
{
  "check": "expired session rejected",
  "ok": true,
  "detail": null
}
{
  "check": "password is not stored in plaintext",
  "ok": true,
  "detail": { "length": 161, "prefix": "<redacted>" }
}
{
  "counts": { "users": 1, "accounts": 1, "sessions": 0 }
}
{
  "failures": []
}
```

- UTC timestamps and runner: the log was written at 2026-11-18T02:22:52Z; the test's own Better Auth warnings are 2026-11-18T02:22:51.291Z to 02:22:51.716Z. Runner is the Windows 10.0.26200 host with Node 24.13.1.
- Result: PASS. 22 of 22 checks are true and `failures` is empty. Five wrong passwords produced `failedCount` 1 through 5, and the fifth set `locked_until` to `2026-11-18T02:37:55.195Z`. A correct password at `t0 + 6 s` returned `kind: "locked"` and created zero sessions. The same password one second after `lockedUntil` returned `kind: "ok"`. The audit table held `sign_in/failure` 5, `sign_in/locked` 1, `lockout/locked` 1 and `sign_in/success` 1. The counter was 0 after success. The password column held a 161-character value, not the plaintext password. Better Auth 1.7.25 uses `node:crypto` scrypt on Node, which is the adaptive hash the plan requires.
- Fallback decision: not needed for the wrapper path. If lockout had failed, the fallback was Auth.js with a custom lockout table; that fallback was not exercised.
- Residual risk and what this does not prove: the 15-minute window was not waited in real time; the test controls the timestamp that the wrapper compares and mutates `locked_until` only through the wrapper. Concurrent failures from two processes, retry storms, distributed locks, the 90-day audit-retention job, and the exact production threshold are not tested. The lockout is application-owned, so every sign-in path must use `signInWithLockout`; a direct call to `auth.api.signInEmail` would bypass it. This is an ADR-004 implementation constraint, not a library guarantee.

### TS-02 Revocation and expiry

- Hypothesis: a database-backed Better Auth session can be revoked inside the 60-second NFR-013 window, and an inactive session can be rejected after its 30-day lifetime, without a cookie cache hiding the change.
- Requirement or decision: NFR-013 and the 30-day inactivity rule. The session cookie cache is disabled in `lib/auth.ts` so a database read decides every request.
- Environment and versions: Better Auth 1.7.25 with its Kysely adapter over the scratch PostgreSQL 18.6; `expiresIn` 30 days, `updateAge` 1 hour, `cookieCache.enabled` false.
- Preconditions: the same run and identity as TS-01. The test signs in again after unlock, revokes that session, then signs in a second time and backdates the stored row.
- Procedure, exact command:

```bash
node --env-file=.env.local scripts/test-auth.ts
```

The relevant checks are part of the TS-01 run. The expiry step is the only database mutation:

```sql
update session
set "expiresAt" = now() - interval '1 second',
    "updatedAt" = now() - interval '31 days'
where token = $1;
```

Then `auth.api.getSession({ headers })` is called with the same cookie.

- Raw output (the same run as TS-01; tokens and cookies redacted):

```json
{
  "check": "session lifetime is 30 days",
  "ok": true,
  "detail": { "ageMs": 2592000000 }
}
{
  "check": "revoked session rejected",
  "ok": true,
  "detail": {
    "revokeResult": { "status": true },
    "revokeMs": 9.972600000000057
  }
}
{
  "check": "revocation within 60 seconds",
  "ok": true,
  "detail": { "revokeMs": 9.972600000000057 }
}
{
  "check": "second sign-in succeeds",
  "ok": true,
  "detail": {
    "kind": "ok",
    "response": {},
    "cookie": "better-auth.session_token=<redacted>"
  }
}
{
  "check": "expired session rejected",
  "ok": true,
  "detail": null
}
```

- UTC timestamps and runner: the log was written at 2026-11-18T02:22:52Z. The revoke call finished in 9.97 ms, measured with `performance.now()` around `auth.api.revokeSession`.
- Result: PASS. `expiresAt - createdAt` was 2,592,000,000 ms, which is exactly 30 days. `revokeSession` returned `{ "status": true }` and the next `getSession` returned `null`; the measured latency is far below 60 seconds. The second session was then backdated by 31 days in `updatedAt` and one second past `expiresAt`; `getSession` returned `null`. No wall-clock wait was used.
- Fallback decision: not needed. If the cookie cache had hidden the revocation, the fallback was to keep the cache disabled or set a cache age below 60 seconds, and to re-run the same check. The configuration already disables the cache, so the fallback is not active.
- Residual risk and what this does not prove: this is one session and one process. Revoke-all, multiple devices, a session list, IP or user-agent binding, and a real 30-day idle period are not tested. The 9.97 ms number is a local measurement, not a production latency budget. The test proves the database read sees the deleted or expired row; it does not prove a CDN, proxy or client cache cannot serve a stale page for the same user.

### TS-03 OAuth and linking

- Hypothesis: the Better Auth Google route uses an authorization-code flow with state and PKCE S256, the callback route exists, a replayed callback is rejected, and implicit linking of a provider identity to an existing same-email account can be refused.
- Requirement or decision: FR-003, NFR-030 and C-04; OD-S03 is the open decision about same-email linking. ADR-004 is the authentication record.
- Environment and versions: Next.js 16.4.6 dev server on `http://localhost:3000`; Better Auth 1.7.25; `google` social provider configured with a dummy client; a `genericOAuth` provider named `mock-google` for the linking matrix; Node 24.13.1; PostgreSQL 18.6.
- Preconditions: the Next dev server is running; the scratch database has the four Better Auth tables; the mock provider listens on `127.0.0.1:4010` inside the linking script; the two test scripts use sandbox identities only.
- Procedure, exact commands:

```bash
node --env-file=.env.local scripts/test-oauth-http.ts
node --env-file=.env.local scripts/test-oauth-link.ts
```

The first script calls the real Next route with the dummy Google client. The second script starts an in-process HTTP server for `/token`, registers `mock-google` through `genericOAuth`, and calls `auth.api.signInSocial` and `auth.handler` for the callback. The mock replaces Google's token and userinfo endpoints; it does not replace the linking guard under test. The mock access token is not a production credential and is not reproduced here.

- Raw output, first command (state, state cookie and dummy client id redacted):

```json
{
  "check": "health route",
  "ok": true,
  "detail": { "status": 200, "body": "{\"ok\":true,\"spike\":\"M00\"}" }
}
{
  "check": "auth handler get-session",
  "ok": true,
  "detail": { "status": 200, "body": "null" }
}
{
  "check": "social sign-in route",
  "ok": true,
  "detail": {
    "status": 200,
    "body": "{\"url\":\"https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=<redacted>&state=<redacted>&scope=email+profile+openid&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fapi%2Fauth%2Fcallback%2Fgoogle&code_challenge_method=S256&code_challenge=sHeQ8scJzX-bkDNqGEIFYGw8SZdCLenaJkXI8MdrMAs&include_granted_scopes=true\",\"redirect\":true}",
    "setCookies": [
      "better-auth.state=<redacted>; Max-Age=300; Path=/; HttpOnly; SameSite=Lax"
    ]
  }
}
{
  "check": "authorization host is Google",
  "ok": true,
  "detail": { "host": "accounts.google.com" }
}
{
  "check": "authorization includes PKCE challenge",
  "ok": true,
  "detail": { "codeChallengeMethod": "S256" }
}
{
  "check": "authorization includes state",
  "ok": true,
  "detail": { "state": "<redacted>" }
}
{
  "check": "Google callback route exists",
  "ok": true,
  "detail": {
    "status": 302,
    "location": "http://localhost:3000/api/auth/error?error=invalid_code",
    "body": ""
  }
}
{
  "check": "replayed callback is rejected",
  "ok": true,
  "detail": {
    "status": 302,
    "location": "http://localhost:3000/api/auth/error?error=state_mismatch",
    "body": ""
  }
}
{
  "failures": []
}
```

- Raw output, second command (state, state cookie and session cookie redacted):

```json
{
  "check": "same-email verified OAuth is rejected",
  "ok": true,
  "detail": {
    "status": 302,
    "location": "http://localhost:3000/api/auth/error?error=account_not_linked",
    "setCookies": [
      "better-auth.state=<redacted>; Max-Age=0; Path=/; HttpOnly; SameSite=Lax"
    ],
    "body": ""
  }
}
{
  "check": "pre-hijack created no session and no link",
  "ok": true,
  "detail": { "sessions": 0, "linked_accounts": 0 }
}
{
  "check": "replayed OAuth state is rejected",
  "ok": true,
  "detail": {
    "status": 302,
    "location": "http://localhost:3000/api/auth/error?error=state_mismatch",
    "setCookies": [],
    "body": ""
  }
}
{
  "check": "same-email unverified OAuth is rejected",
  "ok": true,
  "detail": {
    "status": 302,
    "location": "http://localhost:3000/api/auth/error?error=account_not_linked",
    "setCookies": [
      "better-auth.state=<redacted>; Max-Age=0; Path=/; HttpOnly; SameSite=Lax"
    ],
    "body": ""
  }
}
{
  "check": "unverified OAuth created no session and no link",
  "ok": true,
  "detail": { "sessions": 0, "linked_accounts": 0 }
}
{
  "check": "new OAuth user is signed in",
  "ok": true,
  "detail": {
    "status": 302,
    "location": "http://localhost:3000/",
    "setCookies": [
      "better-auth.state=<redacted>; Max-Age=0; Path=/; HttpOnly; SameSite=Lax",
      "better-auth.session_token=<redacted>; Max-Age=2592000; Path=/; HttpOnly; SameSite=Lax"
    ],
    "body": ""
  }
}
{
  "check": "new OAuth user created",
  "ok": true,
  "detail": [{ "id": "01a1ec6e-76d3-7ce3-967f-96f493374e86" }]
}
{
  "check": "new OAuth user has one link and one session",
  "ok": true,
  "detail": { "sessions": 1, "linked_accounts": 1 }
}
{
  "check": "replay after success is rejected",
  "ok": true,
  "detail": {
    "status": 302,
    "location": "http://localhost:3000/api/auth/error?error=state_mismatch",
    "setCookies": [],
    "body": ""
  }
}
{
  "failures": []
}
```

- UTC timestamps and runner: the HTTP route log was written at 2026-11-18T02:12:28Z; the linking log was written at 2026-11-18T02:13:44Z. Both ran on the Windows 10.0.26200 host with Node 24.13.1 and the Next dev server on port 3000.
- Result: PARTIAL. The route, state, PKCE S256, callback existence and replay rejection checks PASS. The linking guard PASSES for the library path: a verified same-email provider identity and an unverified same-email provider identity both returned `account_not_linked`, created zero sessions and zero links; a new provider identity created one user, one link and one session; replay after success returned `state_mismatch`. The live Google row is not proven: the dummy client cannot exchange a real authorization code, so the callback with a fake code returned `invalid_code`. No Google test project or two verified test accounts were available (U-03).
- Fallback decision: treat the mock path as evidence for the shared callback and linking logic only. The live Google path remains a blocking U-03 item before the authentication milestone is accepted. If the product owner rejects `disableImplicitLinking`, the fallback is an explicit link flow that requires a signed-in session and a fresh provider authentication; that flow is not implemented in this spike.
- Residual risk and what this does not prove: Google's real token exchange, the `email_verified` claim, Google-specific error shapes, a real browser state cookie, multi-tab or clock-skew behavior, provider outage, and an account-linking UI are not tested. The mock replaces the token and userinfo endpoints, so any Google-specific claim parsing is [INFERENCE], not observed. The absence of a unique `(providerId, accountId)` constraint in the scratch schema is recorded in the database section; duplicate-link insertion was not exercised.

### TS-04 UUIDv7

- Hypothesis: UUIDv7 values generated in the application are RFC 4122 version 7, unique and time-ordered at the timestamp level; PostgreSQL can store the same values in a native `uuid` column and return them unchanged.
- Requirement or decision: the identifier mapping in DATABASE-DESIGN section 2. The plan requires UUIDv7 as the primary identifier strategy and a decision on the PostgreSQL column type.
- Environment and versions: `uuidv7` 1.2.1, Node 24.13.1, PostgreSQL 18.6, `pg` 8.23.1, Better Auth 1.7.25 Kysely adapter.
- Preconditions: the `uuid_probe(id uuid primary key, created_at timestamptz)` table and the Better Auth tables from the migration. The test uses a single process.
- Procedure, exact command:

```bash
node --env-file=.env.local scripts/test-uuid.ts
```

The script generates 10,000 ids, checks the version nibble and variant, checks uniqueness and timestamp monotonicity, inserts the ids into `uuid_probe` through a `uuid[]` array, reads them back, and inspects `information_schema.columns` for `session.id`, `user.id` and `uuid_probe.id`.

- Raw output:

```json
{
  "check": "10000 ids generated",
  "ok": true,
  "detail": { "generateMs": 24.074700000000007 }
}
{
  "check": "all ids are version 7",
  "ok": true,
  "detail": { "bad": [] }
}
{
  "check": "all ids are RFC 4122 variant",
  "ok": true,
  "detail": { "bad": [] }
}
{
  "check": "all ids unique",
  "ok": true,
  "detail": { "unique": 10000 }
}
{
  "check": "timestamps non-decreasing",
  "ok": true,
  "detail": { "regressions": 0 }
}
{
  "check": "database round trip preserved every id",
  "ok": true,
  "detail": { "rows": 10000 }
}
{
  "check": "uuid_probe.id is native uuid",
  "ok": true,
  "detail": [
    { "table_name": "session", "column_name": "id", "data_type": "text", "udt_name": "text" },
    { "table_name": "user", "column_name": "id", "data_type": "text", "udt_name": "text" },
    { "table_name": "uuid_probe", "column_name": "id", "data_type": "uuid", "udt_name": "uuid" }
  ]
}
{
  "check": "Better Auth ids are stored in text columns",
  "ok": true,
  "detail": [
    { "table_name": "session", "column_name": "id", "data_type": "text", "udt_name": "text" },
    { "table_name": "user", "column_name": "id", "data_type": "text", "udt_name": "text" },
    { "table_name": "uuid_probe", "column_name": "id", "data_type": "uuid", "udt_name": "uuid" }
  ]
}
{
  "failures": []
}
```

- UTC timestamps and runner: the log was written at 2026-11-18T02:11:33Z on the Windows 10.0.26200 host with Node 24.13.1.
- Result: PASS for generation and storage. 10,000 ids were generated in 24.07 ms; every id had version 7 and the RFC 4122 variant; all 10,000 were unique; there were 0 timestamp regressions; all 10,000 native `uuid` values round-tripped through PostgreSQL. The mapping finding is that the Better Auth Kysely schema creates `user.id` and `session.id` as `text`, even though the values are UUIDv7 strings. The native `uuid` column exists only in the app's `uuid_probe` table.
- Fallback decision: for M02, either keep `text` ids for the Better Auth tables and generate UUIDv7 in the application (the observed path), or pre-create those tables with `uuid` columns and re-run the auth spike before accepting the schema. The spike does not prove that Better Auth 1.7.25 works with `uuid` columns; that is an explicit M02 experiment. The database design must not claim native UUID storage for the auth tables until that experiment passes.
- Residual risk and what this does not prove: one process, no concurrent writers, no cross-process clock regression, no same-millisecond ordering guarantee beyond the non-decreasing timestamp check, and no index-size or query-plan comparison between `text` and `uuid`. The 10,000-row insert is a small local sample.

### TS-05 OpenAPI

- Hypothesis: zod 4 with `@asteasolutions/zod-to-openapi` 9.1.0 generates a valid, deterministic OpenAPI 3.1 document, and oasdiff detects a removed required response property and can fail a CI step.
- Requirement or decision: OPENAPI-PLAN sections 3, 6, 7 and 8; ADR-008. The plan asks for a generator, a diff tool and a reference-page decision.
- Environment and versions: `@asteasolutions/zod-to-openapi` 9.1.0, zod 4.6.7, Node 24.13.1, Redocly CLI 2.79.0, oasdiff 1.39.0 (Windows binary at `.artifacts/oasdiff.exe`).
- Preconditions: the sample registry in `scripts/openapi.ts` registers `GET /api/v1/health` and the `Health` and `Error` schemas. The script generates the document twice, writes `openapi/v1.json` and `openapi/v1-rerun.json`, then removes `Health.spike` from a clone and writes `openapi/v1-removed.json`.
- Procedure, exact commands:

```bash
node --env-file=.env.local scripts/openapi.ts
npx @redocly/cli@2.79.0 lint openapi/v1.json
.artifacts/oasdiff.exe diff openapi/v1.json openapi/v1-rerun.json
.artifacts/oasdiff.exe breaking --fail-on ERR openapi/v1.json openapi/v1-removed.json
```

- Raw output:

```json
{
  "openapi": "3.1.0",
  "paths": ["/api/v1/health"],
  "schemas": ["Health", "Error"],
  "deterministic": true,
  "removedField": "Health.spike"
}
```

```text
No configurations were provided -- using built in recommended configuration by default.

validating openapi\v1.json...
openapi\v1.json: validated in 46ms

Woohoo! Your API description is valid.
```

```text
{}
```

```text
1 changes: 1 error, 0 warning, 0 info
error	[response-required-property-removed] at openapi/v1.json
	in API GET /api/v1/health
		removed the required property `spike` from the response with the `200` status
```

The breaking command was run again with `--fail-on ERR` and the shell exit code was 1:

```text
BREAK_FAIL_EXIT:1
```

Without `--fail-on ERR`, the same comparison exits 0. The CI command must include the flag; the tool detects the change but does not fail by default.

- UTC timestamps and runner: generator and Redocly at 2026-11-18T02:20:54Z and 02:20:58Z; oasdiff same-spec at 02:21:16Z; oasdiff breaking at 02:21:26Z. Runner is the Windows 10.0.26200 host with Node 24.13.1.
- Result: PASS. The document declares OpenAPI 3.1.0; two generations were byte-identical; Redocly exited 0 with no warnings; oasdiff reported no diff between two runs; oasdiff reported `response-required-property-removed` for the removed required property and exited 1 with `--fail-on ERR`.
- Decision: generator is `@asteasolutions/zod-to-openapi` 9.1.0 with zod 4.6.7. Diff tool is oasdiff 1.39.0 with `--fail-on ERR` in CI. Reference page: no public reference page in the MVP because there is no public API until Phase 3; Scalar is the first candidate when Phase 3 starts, with Redoc as the fallback. The spike did not render either tool, so the reference-page choice is a recommendation, not observed evidence.
- Fallback decision: if the generator proves too limiting for the real route set, the fallback is a spec-first file with a route-conformance test. That fallback was not exercised.
- Residual risk and what this does not prove: one path and two schemas only; no comparison against the real Next route surface; no `operationId` uniqueness test at scale; no spec-to-server request validation; no Scalar or Redoc render; no CI job. The diff proves the removed-field class, not every breaking-change class.

### TS-06 Queue and pooler

- Hypothesis: pg-boss 12.38.2 can enqueue a job inside the same PostgreSQL transaction that writes an outbox row, so a rollback leaves no job and a commit leaves exactly one; a dispatcher called twice creates one job; and a retried job still produces one effect when the effect is keyed idempotently.
- Requirement or decision: NFR-053 for idempotent job handling; ADR-005 for the worker and queue design. The plan asks for evidence of atomic enqueue, at-least-once delivery and the pooler mode.
- Environment and versions: pg-boss 12.38.2, pg 8.23.1, PostgreSQL 18.6, Node 24.13.1. The pg-boss schema is `pgboss`; the app tables are `outbox_events` and `job_effects`.
- Preconditions: a scratch database with the app schema; pg-boss started with the `pgboss` schema; no connection pooler in front of PostgreSQL. The test uses one process and a manual transaction.
- Procedure, exact command:

```bash
node --env-file=.env.local scripts/test-queue.ts
```

The test opens a transaction, calls `boss.send` with `{ db: { executeSql } }`, and rolls back; repeats and commits; writes an outbox row in a transaction and rolls back, then commits; runs the dispatcher twice; starts a worker for the committed job and the outbox job; and starts a handler that throws once to force a retry.

- Raw output:

```json
{
  "check": "transaction rollback writes no job",
  "ok": true,
  "detail": { "jobId": "ba85d9f1-4aca-4842-b1b2-2ed11b33f4da", "jobs": 0 }
}
{
  "check": "transaction commit writes exactly one job",
  "ok": true,
  "detail": { "jobId": "b4eb2c6b-1fbf-4100-bfef-2576710fc4a9", "jobs": 1 }
}
{
  "check": "transaction rollback writes no outbox row",
  "ok": true,
  "detail": { "count": 0 }
}
{
  "check": "transaction commit writes one outbox row",
  "ok": true,
  "detail": { "count": 1 }
}
{
  "check": "outbox dispatch creates one job",
  "ok": true,
  "detail": { "firstDispatch": 1, "secondDispatch": 0, "jobs": 1 }
}
{
  "check": "committed job produced one effect",
  "ok": true,
  "detail": { "count": 1 }
}
{
  "check": "outbox job produced one effect",
  "ok": true,
  "detail": { "count": 1 }
}
{
  "check": "failed attempt redelivered with one effect",
  "ok": true,
  "detail": {
    "attempts": 2,
    "effects": 1,
    "job": { "state": "active", "retry_count": 1 }
  }
}
{
  "failures": []
}
```

- UTC timestamps and runner: the log was written at 2026-11-18T02:15:45Z on the Windows 10.0.26200 host with Node 24.13.1.
- Result: PASS for the local, no-pooler path. Rollback left 0 jobs and 0 outbox rows; commit left exactly 1 job and 1 outbox row; a second dispatcher call created 0 additional jobs; each committed path produced exactly 1 `job_effects` row; the throwing handler was attempted twice, `retry_count` was 1, and the effect count stayed 1. The job row still showed `state: "active"` because the query ran before pg-boss marked the handler complete; the effect count is the proof of execution, not the state field.
- Pooler result: NOT TESTED. There was no managed pooler and no vendor trial. Transaction-mode pooling, session-mode pooling, prepared-statement behavior, and the pooler's effect on `LISTEN` or advisory locks are unknown. This is the main gap in TS-06.
- Fallback decision: if the vendor pooler cannot support the pg-boss connection mode, the fallback is a direct connection for the worker and a pooler only for web traffic, or a vendor that offers a session-mode pooler. The fallback is a deployment constraint, not a code change.
- Residual risk and what this does not prove: one process and one local database; no process kill or crash recovery; no connection loss; no dead-letter queue, backoff schedule, or queue-age alert; no 5 million-row load; no PITR; no vendor worker service; no SLA, price, region or DPA. The test proves at-least-once delivery with an idempotent effect for a thrown error, not for a process crash.

### TS-07 Email and secrets

- Hypothesis: the email port can store only a hash of a one-time token and an encrypted payload, enqueue only a request id, send a message at most once per idempotency key, clear the payload after a successful send, and record a bounce once.
- Requirement or decision: NFR-019, FR-005 and the email provider row in EXTERNAL-INTEGRATIONS. ADR-005 covers job idempotency.
- Environment and versions: Node 24.13.1, `pg` 8.23.1, PostgreSQL 18.6, a local in-memory email sink, `node:crypto` SHA-256 and AES-256-GCM. The key is read from `M00_EMAIL_KEY` in the gitignored `.env.local`.
- Preconditions: the `password_reset_requests`, `outbox_events`, `email_sink`, `email_bounces`, `auth_audit_events` and `pgboss.job` tables; a sandbox identity `m00.email@example.test`; no real email provider.
- Procedure, exact command:

```bash
node --env-file=.env.local scripts/test-email.ts
```

The test requests a reset, dispatches the outbox, sends the same email twice with the same idempotency key, checks the sink and the payload, searches six database locations and the notification log for the plaintext token, then records a bounce twice.

- Raw output:

```json
{
  "check": "reset token generated",
  "ok": true,
  "detail": { "tokenLength": 43 }
}
{
  "check": "only a token hash and ciphertext are stored",
  "ok": true,
  "detail": { "hashLength": 64, "ciphertextLength": 158 }
}
{
  "check": "outbox payload contains only the request id",
  "ok": true,
  "detail": [
    { "payload": { "requestId": "01a1ec71-c3cc-7b0b-9b56-fd026388b1f4" } }
  ]
}
{
  "check": "first dispatch sends one message",
  "ok": true,
  "detail": {
    "first": {
      "sent": true,
      "duplicate": false,
      "messageId": "01a1ec71-c3ed-75c9-b7d1-625985d38383"
    },
    "messages": 1
  }
}
{
  "check": "sendEmail is idempotent per key",
  "ok": true,
  "detail": {
    "duplicate": {
      "id": "01a1ec71-c3ed-75c9-b7d1-625985d38383",
      "duplicate": true
    },
    "messages": 1
  }
}
{
  "check": "second dispatch is idempotent",
  "ok": true,
  "detail": { "second": { "sent": false, "duplicate": true }, "messages": 1 }
}
{
  "check": "one sink row per idempotency key",
  "ok": true,
  "detail": { "count": 1 }
}
{
  "check": "payload cleared after send",
  "ok": true,
  "detail": { "sent": true, "payloadCleared": true }
}
{
  "check": "no plaintext token in application tables",
  "ok": true,
  "detail": [
    { "location": "password_reset_requests.token_hash", "count": 0 },
    { "location": "password_reset_requests.payload_encrypted", "count": 0 },
    { "location": "outbox_events.payload", "count": 0 },
    { "location": "email_sink.variables_hash", "count": 0 },
    { "location": "auth_audit_events.detail", "count": 0 },
    { "location": "pgboss.job.data", "count": 0 }
  ]
}
{
  "check": "no plaintext token in notification logs",
  "ok": true,
  "detail": { "logLines": 1 }
}
{
  "check": "bounce recorded once",
  "ok": true,
  "detail": { "count": 1 }
}
{
  "summary": { "messages": 1, "sinkRows": 1, "bounces": 1, "tokenLength": 43 }
}
{
  "failures": []
}
```

- UTC timestamps and runner: the log was written at 2026-11-18T02:17:21Z on the Windows 10.0.26200 host with Node 24.13.1.
- Result: PASS for the local sink path. The token is 43 characters; the database stored a 64-character SHA-256 hash and a 158-character AES-256-GCM ciphertext; the outbox payload had only `requestId`; one dispatch sent one message; a repeat send and a repeat dispatch returned `duplicate: true` and left the message count at 1; the sink had one row; the payload was nulled after send; the plaintext token appeared in none of the six queried locations or the notification log; the bounce was recorded once.
- Provider result: NOT TESTED. There was no provider sandbox, no real message, no webhook signature, no bounce payload, no DKIM, SPF or DMARC check, and no deliverability measurement. The local sink is not a provider. U-05 remains open, so U-A2 is not proven.
- Fallback decision: keep the email port and the local sink for development, but do not accept the email provider until a sandbox send, a signed webhook, and a bounce event are observed. If the provider cannot meet the DPA or region constraints, the fallback is the next shortlisted provider; that vendor was not tested.
- Residual risk and what this does not prove: the encryption key is in an environment file, so key rotation and key compromise are not covered; the token expiry and one-time consumption path are not exercised; the in-memory sink does not exercise SMTP, API rate limits, retries or provider duplicate detection; the log check covers one log line, not a production log pipeline.

### TS-08 Timer calibration

- Hypothesis: a saved timing session can be recovered within plus or minus 2 seconds of server time after a tab is backgrounded, a second browser is opened, and the client clock is changed.
- Requirement or decision: NFR-052 and NFR-090. U-01 asks whether T11 stays in M00 or is deferred.
- Environment and versions: not started. A browser harness, server timestamps, a second browser and a wrong-clock simulation would be required.
- Preconditions: a timer implementation and a browser test harness. Neither exists in M00.
- Procedure, exact commands: none. No timer protocol was run.
- Raw output: none.
- UTC timestamps and runner: not applicable.
- Result: DEFERRED under the U-01 default. The product owner did not answer U-01 before T11, so the conservative option in the plan applies: defer to M07 and keep the M07 timer-evidence block. NFR-052 and NFR-090 are not claimed as proven.
- Fallback decision: none. The fallback is the deferred state itself. M07 must run the 1, 25 and 120 minute sessions, throttle the background tab, open a second browser, and change the client clock before the timer requirement can be accepted.
- Residual risk and what this does not prove: every timer behavior remains unproven. A green M00 result elsewhere does not reduce this risk.

### TS-09 Vendor checklist

- Hypothesis: the shortlisted platform can provide managed PostgreSQL with the required version and extension, a pooler, backups and PITR, a worker service, the required region, an SLA, a price at the target volume, a DPA, and error tracking that scrubs a known token and email.
- Requirement or decision: TS-09 per the plan; DEPLOYMENT-ARCHITECTURE section 8; U-A1, U-A2 and U-A7. U-02 (trial shortlist and spend) and U-05 (email provider sandbox) were not answered, so no trial account or scratch project existed.
- Environment and versions: local embedded PostgreSQL 18.6 through `embedded-postgres` 18.6.0-beta.19. No vendor console, no vendor database, no vendor worker, no vendor email sandbox and no error-tracking project.
- Preconditions: a vendor trial, a scratch project and permission to spend. None was available.
- Procedure, exact command: the only executable check was the local database fact query:

```bash
node --env-file=.env.local --input-type=module -e "import pg from 'pg'; const p=new pg.Pool({connectionString:process.env.DATABASE_URL}); console.log((await p.query('select version()')).rows[0]); console.log((await p.query(\"select extname, extversion from pg_extension where extname='btree_gist'\")).rows); await p.end();"
```

- Raw output:

```json
{
  "version": "PostgreSQL 18.6 on x86_64-windows, compiled by msvc-19.44.35228, 64-bit",
  "extensions": [{ "extname": "btree_gist", "extversion": "1.8" }]
}
```

The vendor rows are recorded as blocked, not as passes:

| DEPLOYMENT-ARCHITECTURE section 8 row | State | Evidence |
|---|---|---|
| Managed PostgreSQL, current major version, extension support, TLS, pooling | BLOCKED | Local PostgreSQL 18.6 and `btree_gist` 1.8 observed; no vendor instance, no TLS, no pooler |
| Backups, 30-day retention, restore to a new instance, PITR | BLOCKED | No vendor backup or restore was observed |
| Region near the primary user base and data residency | BLOCKED | No vendor region was observed |
| Separate worker service for a long-lived process | BLOCKED | No worker service was deployed |
| Horizontal scaling of web and worker | BLOCKED | No scaling event was observed |
| Request timeouts sufficient for polling | BLOCKED | No vendor gateway was exercised |
| Preview environments with isolated databases | BLOCKED | No preview deployment was created |
| Managed TLS certificates, TLS 1.2 or newer | BLOCKED | Local Next dev served HTTP only |
| Per-environment secrets store | BLOCKED | Local `.env.local` only; no vendor secrets store |
| Availability SLA meets or approaches 99.5 percent | BLOCKED | No contract or SLA document was observed |
| Container portability, no proprietary runtime APIs | BLOCKED | No image was built or deployed |
| Predictable cost at NFR-070 volume | BLOCKED | No quote or price observation |
| Observability, log access, metrics, log drain | BLOCKED | Local logs only |
| Data processing agreement | BLOCKED | No DPA was read |
| Email provider sandbox, signed webhook and bounce (U-A2) | BLOCKED | U-05; local sink only |
| Error tracking scrubs a known token and email (U-A7) | BLOCKED | No error-tracking project or scrub test |

- UTC timestamps and runner: the local fact query ran at 2026-11-18T02:22:22Z; the PostgreSQL smoke log was written at 2026-11-18T02:06:00Z. Runner is the Windows 10.0.26200 host.
- Result: PARTIAL. The only observed facts are the local PostgreSQL version and the `btree_gist` extension. Every vendor row is blocked by U-02, and the email row is blocked by U-05. No vendor is recommended and no platform is accepted.
- Fallback decision: keep U-A1, U-A2 and U-A7 open. If a trial cannot be granted before the milestone that needs it, the completion report must state that the deployment baseline is unresolved and must not mark the vendor checklist complete. The next step is a shortlist and a trial account from the product owner, not more local testing.
- Residual risk and what this does not prove: the local PostgreSQL 18.6 beta is not a vendor-managed service. It does not prove backup retention, PITR, failover, pooler behavior, TLS, region, SLA, price, DPA, worker service, observability or error tracking. Error tracking was not tested at all.

## Inputs for T12 amendments

These are evidence statements for the amendment task. No ADR is marked Accepted by this file. Every ADR status stays Proposed; owner acceptance is a separate action in OPEN-DECISIONS.

| Document | Evidence-backed amendment candidate |
|---|---|
| ADR-004 Authentication | App-owned lockout wrapper is required; 5 failures and 15 minutes are implemented and tested with a controlled clock. Cookie cache is disabled to keep revocation inside 60 seconds. Same-email implicit linking is refused with `disableImplicitLinking: true`; the live Google path remains blocked by U-03. Better Auth 1.7.25 stores ids in `text`; the native `uuid` mapping is an M02 experiment. Add a unique `(providerId, accountId)` constraint or prove an application-level guard. |
| ADR-005 Background jobs | Transactional enqueue with `boss.send(..., { db: { executeSql } })` and an outbox row is proven locally. At-least-once delivery with an idempotent effect is proven for a thrown handler error. Pooler mode, PITR, worker service and vendor operations are not proven. |
| ADR-008 API strategy | Use `@asteasolutions/zod-to-openapi` 9.1.0 with zod 4.6.7. Use oasdiff 1.39.0 with `--fail-on ERR`; the default exit code is 0. No public reference page in the MVP; Scalar is the Phase 3 candidate and Redoc is the fallback. The sample spec is not route-parity evidence. |
| ADR-009 Deployment platform | Only PostgreSQL 18.6 and `btree_gist` 1.8 are observed, and both are local and beta-packaged. Every vendor row is blocked by U-02; the email row is blocked by U-05. No vendor is accepted. |
| DATABASE-DESIGN | Better Auth creates four tables with `text` ids and `timestamptz` columns; `user.email` and `session.token` are unique; `session` and `account` cascade on user delete. There is no unique `(providerId, accountId)` index. The app tables `auth_lockouts`, `auth_audit_events`, `outbox_events`, `email_sink`, `email_bounces`, `password_reset_requests`, `uuid_probe` and `job_effects` were exercised. The `uuid` versus `text` decision must be explicit. |
| OPENAPI-PLAN | Generator, deterministic output, lint command and breaking-change gate are observed. Reference-page renderer and spec-to-server validation are not. |
| EXTERNAL-INTEGRATIONS | The email port and local sink are observed. The provider sandbox, signed webhook, bounce payload and deliverability are not. U-A2 remains open. |
| TECHNOLOGY-DECISIONS | Pin the observed versions in the environment table. The `tsx` transform failed in this Next app; the spike used Node 24 type stripping with `node --env-file`. This is a spike workaround, not a product decision. |

## Known limitations

1. The database is embedded PostgreSQL 18.6 beta. It is not a vendor-managed service, and the beta packaging is not a production baseline.
2. No connection pooler was tested. Transaction-mode and session-mode behavior, prepared statements and pool exhaustion are unknown.
3. No PITR, backup restore, failover, SLA, price, region, DPA, worker service, preview environment or error-tracking scrub test was observed.
4. The live Google OAuth path was not tested. The dummy client cannot exchange a code; the mock provider replaces Google's token and userinfo endpoints. The linking guard is proven, the Google-specific claims are not.
5. The timer protocol is deferred under U-01. NFR-052 and NFR-090 remain unproven and M07 keeps its evidence block.
6. The email provider was not tested. The local in-memory sink proves the port, the hash, the ciphertext and the idempotency key, not deliverability or a provider bounce.
7. The OpenAPI document is a two-schema sample. There is no route-parity check, no request validation against the server, and no Scalar or Redoc render.
8. Better Auth stores ids in `text`. Native `uuid` storage is proven only for `uuid_probe`, not for the auth tables.
9. No unique `(providerId, accountId)` constraint exists in the scratch schema; duplicate-link insertion was not exercised.
10. Lockout and expiry use controlled timestamps or database backdating. No real 15-minute or 30-day wait was performed.
11. All tests are single-process and local. Concurrent sign-ins, process crashes, network loss and load at NFR-070 volume were not tested.
12. `tsx` failed with a transform error in this Next app; scripts ran through Node 24 type stripping. This is a tooling limitation of the spike, not a product requirement.
13. The evidence redacts session tokens, cookies, OAuth state, the dummy client id and the password hash prefix. No secret, token, cookie or personal email is recorded here. Sandbox identities use `example.test`.
14. The evidence file is in the main checkout. T13 was executed on 2026-11-18: the worktree, branch, scratch database and local environment file are deleted; this file and the completion report are preserved.

## Teardown

T13 was executed on 2026-11-18, after the evidence file was preserved in the main checkout.

| Check | Result |
|---|---|
| Scratch services | `m00-pg` and `m00-next` stopped; both reported `exited` |
| Worktree | `D:/Portofolio/Lumora-m00` removed with `git worktree remove --force`; exit 0 |
| Branch | `spike/m00` deleted; it was at `73a39b1`; main is at `c8f151e` |
| Local state | `spike/m00/.env.local` and `spike/m00/.pgdata` were removed with the worktree; `.pgdata-smoke` was absent before removal |
| Temporary files | No `oasdiff.exe` exists. The only file under `.artifacts/` is `oasdiff-release.json`, which is tracked in main commit `c8f151e`; it was retained, not deleted |
| Spike code | `git ls-files spike` is empty; no spike source or manifest is tracked on `main` |
| Secret scan | 129 tracked files scanned for the five values in `.env.local` and for known dummy literals before deletion. The only match was `BETTER_AUTH_URL` (`http://localhost:3000`, not a secret); `BETTER_AUTH_SECRET`, the Google client id and secret, the database URL, session tokens, OAuth state and the password hash prefix did not appear. `M00_EMAIL_KEY` appears only as an environment-variable name, not a value |
| Main checkout | `main` at `c8f151e`; the evidence file is tracked; no production code, migration or seed was added |

The main commit advanced from `73a39b1` to `c8f151e` during the spike. The new commit contains this evidence file, `Flow01.5.txt` and `.artifacts/oasdiff-release.json`; it does not contain spike source code. No spike file was merged.

## Template

```markdown
### TS-XX Name

- Hypothesis:
- Requirement or decision:
- Environment and versions:
- Preconditions:
- Procedure, exact commands:
- Raw output:
- UTC timestamps and runner:
- Result: PASS or FAIL
- Fallback decision:
- Residual risk and what this does not prove:
```

