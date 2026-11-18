# ADR-004 Authentication

> Status: Proposal, pending approval. Source of truth: Phase 2 PRD and Phase 1 docs.

## Status

Proposed, conditional on owner acceptance. The M00 spike is recorded in the evidence update below.

## Context

Requirements: email and password, Google sign-in, logout, password reset (FR-001..005); password of at least 10 characters stored as a salted adaptive hash (NFR-011); 15-minute lock after 5 consecutive failures (NFR-012); session expiry after 30 days of inactivity and revocation within 60 s (NFR-013, FR-008); CSRF and XSS protection (NFR-014); audit events kept 90 days (NFR-020); age confirmation of 16 or older (NFR-035); deletion and purge in 30 days (NFR-031). Phase 3 adds API keys (NFR-021). There is no in-app administrator (R-1).

## Decision

Use Better Auth running inside the application with database-backed sessions. Lockout, audit events and the age gate are application-owned and attached through the library's hooks. All other modules obtain only the current user identity from the Authentication module. Sessions are opaque identifiers in HttpOnly, Secure, SameSite cookies, looked up in the database on each request.

**Fallback (U-A4).** If the Phase 7 spike shows Better Auth cannot satisfy NFR-012 (lockout) or NFR-013 (revocation within 60 s, 30-day inactivity expiry), use Auth.js with custom lockout and session handling behind the same Authentication module interface. No other module changes.

## Consequences

- Credentials and sessions stay in our database, which keeps deletion, purge and export in our control (NFR-031).
- Revocation is immediate because sessions are looked up per request.
- Library maturity is a residual risk: we own patching and must track security advisories.
- The spike must demonstrate: five failures then a correct password refused for 15 min; a revoked session refused within 60 s; a session expiring after 30 days of inactivity with a controlled clock; audit events for each listed action.
- Password reset depends on the email provider (U-A2).

## M00 evidence update

Date: 2026-11-18. Status stays Proposed. The spike record is [M00-EVIDENCE](../08-build/M00-EVIDENCE.md). It used Better Auth 1.7.25 on a scratch PostgreSQL 18.6 database. No production schema or product code was merged.

| Claim | Observation | State |
|---|---|---|
| Lockout | Five wrong passwords produced `failedCount` 1 to 5 and `locked_until`; a correct password while locked returned `kind: "locked"` and created zero sessions; the same password one second after the window returned `kind: "ok"`; the counter cleared on success | PASS |
| Revocation | `revokeSession` returned `{ "status": true }`; the next `getSession` returned `null`; measured 9.97 ms with `performance.now()` | PASS |
| Inactivity expiry | `expiresAt - createdAt` was 2,592,000,000 ms; a session backdated in `expiresAt` and `updatedAt` returned `null` | PASS |
| Password hashing | The stored password was a 161-character `node:crypto` scrypt value, not plaintext | PASS |
| Google callback | The Next route returned an `accounts.google.com` URL with `code_challenge_method=S256` and a state cookie; the callback route existed; a replayed callback returned `state_mismatch` | PARTIAL: live Google token exchange not tested (U-03) |
| Same-email linking | A verified and an unverified same-email provider identity both returned `account_not_linked` with zero sessions and zero links; a new provider identity created one user, one link and one session | PASS for the library path |
| Identifier mapping | Better Auth created `user.id` and `session.id` as `text`; the values were UUIDv7; a native `uuid` column was proven only in a separate probe table | NOT PROVEN for the auth tables |
| Account uniqueness | No unique constraint or index on `(providerId, accountId)` was created | OPEN: M02 must add one or prove an application-level guard |
| CSRF and cookies | The state cookie was `HttpOnly; SameSite=Lax; Max-Age=300`; the session cookie was `HttpOnly; SameSite=Lax; Max-Age=2592000`; `Secure` was absent because the local server used HTTP | PARTIAL: CSRF checks and production HTTPS were not exercised |
| Audit retention | Sign-in and lockout rows were written for failure, locked and success; no 90-day cleanup job was run | PARTIAL |

The Auth.js fallback is not required by lockout, revocation or expiry. It remains available if the live Google path fails U-03 or if the M02 native-`uuid` experiment fails. The safe linking option observed is `accountLinking.disableImplicitLinking: true`; OD-S03 stays open until the security owner accepts it. The spike does not prove production readiness and does not close U-A4.

## Alternatives

- Auth.js: mature, limited credentials support, lockout is custom. Chosen as fallback.
- Self-built on lightweight session primitives: full control, highest security risk and effort.
- Managed IdP (Clerk, Auth0): strongest assurances and fastest delivery, but per-user cost, personal-data processing by a vendor, and deletion/purge depending on the vendor.
- Stateless tokens (JWT sessions): rejected because revocation within 60 s requires server-side state anyway.
