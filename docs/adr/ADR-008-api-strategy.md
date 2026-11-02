# ADR-008 API strategy

> Status: Proposal, pending approval. Source of truth: Phase 2 PRD and Phase 1 docs.

## Status

Proposed.

## Context

The web client reaches data through an internal API from the MVP; it is not a public contract, undocumented externally and unsupported until Phase 3 (NFR-060, inconsistency I-8). Phase 3 adds a public REST API: API keys with read/write scopes per resource (FR-220, FR-221), rate limit 60 requests per minute per key (FR-222, U-9), `/v1` versioning (FR-223), JSON with pagination (FR-224), a standard error format with code, message and details (FR-225), and revocation (FR-226, EC-026).

## Decision

1. Internal now: route handlers and server actions are thin adapters over application services. No external documentation or stability promise.
2. Public later: the `/v1` tree is a separate set of adapters over the same application services. It never calls repositories directly. Internal and public route trees are separate so internal routes cannot be accidentally exposed.
3. The public contract is OpenAPI 3.1 generated from the same Zod schemas used for validation.
4. Authentication by API key hashed at rest and shown once (NFR-021). A key acts as exactly one user (R-2) and never exceeds that user's rights.
5. Rate limiting through a limiter port: Postgres-backed in Phase 3, replaceable with Redis or an edge gateway.
6. Errors: one internal envelope with a stable code catalog, mapped to the public `{code, message, details}` format with the request identifier (ERROR-HANDLING.md section 3).
7. Breaking changes require a new version prefix.

## Consequences

- One set of business rules for both APIs; no duplicated logic.
- A generated OpenAPI document needs curation to be usable and is an input to Planning 6.
- Public traffic shares the web tier until an extraction trigger applies (security isolation, scaling).
- Database-backed rate limiting adds writes; monitored.

## Alternatives

- tRPC for internal use: good typing but not a public REST contract.
- GraphQL: not required by any FR and adds a layer.
- Hand-written OpenAPI: drift risk.
- Exposing the internal API publicly: violates NFR-060.
