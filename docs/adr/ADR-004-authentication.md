# ADR-004 Authentication

> Status: Proposal, pending approval. Source of truth: Phase 2 PRD and Phase 1 docs.

## Status

Proposed, conditional on a spike (see Consequences).

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

## Alternatives

- Auth.js: mature, limited credentials support, lockout is custom. Chosen as fallback.
- Self-built on lightweight session primitives: full control, highest security risk and effort.
- Managed IdP (Clerk, Auth0): strongest assurances and fastest delivery, but per-user cost, personal-data processing by a vendor, and deletion/purge depending on the vendor.
- Stateless tokens (JWT sessions): rejected because revocation within 60 s requires server-side state anyway.
