# Lumora Webhooks

> Status: Proposal, pending approval. Source of truth: Phase 2 PRD and Phase 1 docs.

This document is a decision record on webhooks. It states that Lumora has no outbound webhooks through Phase 3, reserves one inbound route for email provider events, and lists the rules that apply if either is ever built. Sources: [FEATURE-ANALYSIS.md](../01-product-discovery/FEATURE-ANALYSIS.md) (feature 13), [FUNCTIONAL-REQUIREMENTS.md](../02-requirements/FUNCTIONAL-REQUIREMENTS.md) (FR-220..226), [ADR-008](../adr/ADR-008-api-strategy.md), [BACKGROUND-JOBS.md](../03-architecture/BACKGROUND-JOBS.md), [SECURITY-ARCHITECTURE.md](../03-architecture/SECURITY-ARCHITECTURE.md), [DATA-DICTIONARY.md](../04-database/DATA-DICTIONARY.md). Related: [EXTERNAL-INTEGRATIONS.md](EXTERNAL-INTEGRATIONS.md), [API-CONVENTIONS.md](API-CONVENTIONS.md), [API-SECURITY.md](API-SECURITY.md).

## 1. Context

- The Phase 3 public API (FR-220..226) covers API keys, scoped read and write, and rate limits. None of those requirements asks for event delivery to a third party.
- `FEATURE-ANALYSIS.md` feature 13 lists "webhooks maybe" under functionality. That is an exploratory remark, not a requirement, and it carries no FR or acceptance criterion.
- The approved database design ([DATA-DICTIONARY.md](../04-database/DATA-DICTIONARY.md)) has no tables for webhook endpoint registration, signing secrets, delivery attempts or delivery logs. Outbound webhooks would need all four, which means a Phase 4 data change.
- The only external system that may call Lumora is the transactional email provider, and only if it reports bounces and complaints (vendor choice U-A2 is open, see [EXTERNAL-INTEGRATIONS.md](EXTERNAL-INTEGRATIONS.md) section 2).
- Third-party consumers named in `FEATURE-ANALYSIS.md` (Google Calendar, Notion, Anki) can poll the public API with a key.

## 2. Decision

| # | Decision | Phase | Basis |
|---|---|---|---|
| W-1 | No outbound webhooks through Phase 3. The endpoint inventory in [API-ENDPOINTS.md](API-ENDPOINTS.md) has no webhook registration or delivery endpoint. | MVP, 2, 3 | No FR requires them; no supporting tables in the approved database design |
| W-2 | One inbound route is reserved: `POST /api/webhooks/email`, for provider bounce and complaint events. It is not part of the endpoint inventory, not in the OpenAPI document, and not built until U-A2 is closed and the chosen provider supports event callbacks. | 2 or later | U-A2 (transactional email provider) open |
| W-3 | No other inbound webhooks. Google sign-in uses a browser redirect callback owned by the auth library (FR-003), which is not a webhook. | all | ADR-004 |
| W-4 | Third parties integrate by polling `/v1` with an API key (FR-220, FR-222). | 3 | [API-STRATEGY.md](API-STRATEGY.md) |

## 3. Rules if the inbound email route is built (W-2)

| Rule | Value | Basis |
|---|---|---|
| Signature check | HMAC over the raw request body using the provider secret from the secrets store; verify before any parsing | NFR-019 (no secrets in the client), [SECURITY-ARCHITECTURE.md](../03-architecture/SECURITY-ARCHITECTURE.md) |
| Failed signature | 401 with an empty body, nothing logged beyond event name and request ID | NFR-063 |
| Timestamp tolerance | 5 minutes either side of server time; outside it is rejected like a bad signature | Replay protection |
| Comparison | Constant-time compare of signature bytes | Timing attacks |
| Deduplication | Provider event id is used as the pg-boss `singletonKey`; a duplicate delivery enqueues nothing | [BACKGROUND-JOBS.md](../03-architecture/BACKGROUND-JOBS.md) idempotency keys |
| Handler work | Verify, enqueue one job, return 200 within 1 second. No database business writes and no calls to other services in the request | Provider retry storms |
| Logging | Payload never logged; log event type, provider event id, outcome, request ID only | NFR-063 |
| Effect | Mark the address as undeliverable in the Notifications port so that later sends are skipped. This needs a Phase 4 data decision, recorded as change request CR-3 only if the route is built | [API-CONVENTIONS.md](API-CONVENTIONS.md) Reconciliations |
| Authentication class | None of `G`, `S`, `K`; signature is the only credential. Cookies and API keys are ignored | [API-CONVENTIONS.md](API-CONVENTIONS.md) section 9 |
| Rate limit | Edge-limited per source IP; no per-user class applies | NFR-062 |
| Errors | Unknown event types return 200 and are dropped; malformed bodies after a valid signature return 400 `validation_failed` | [API-ERRORS.md](API-ERRORS.md) |

## 4. Reopen criteria for outbound webhooks

Reopen this decision only if at least one of these is true:

1. A Phase 3 or later FR from a third-party consumer requires event push.
2. Three or more distinct API-key users ask for it.
3. The owner commits to a Zapier-style integration.

If reopened, the design must settle this checklist before any build:

| Item | Proposed starting point |
|---|---|
| Event types | Limited to the public resources (subjects, topics, sessions, plan entries, to-dos, notes, exams) created, updated, deleted |
| Signature | `Lumora-Signature` header carrying HMAC-SHA256 of timestamp plus raw body, per-endpoint secret shown once |
| Delivery | At least once; 5 attempts with exponential backoff; endpoint disabled after repeated failure |
| Endpoint URL safety | HTTPS only; SSRF guard rejecting private, loopback and link-local addresses, resolved at send time |
| Data | Tables for endpoints, secrets (hashed or encrypted) and a delivery log with a retention period; a Phase 4 migration plan and an update to [DATA-LIFECYCLE.md](../04-database/DATA-LIFECYCLE.md) |
| Scope | Same scopes as API keys (FR-221); an event is sent only if the key owner could read the resource |
| Contract | Added to the OpenAPI document as callbacks; versioned with `/v1` rules ([API-CONVENTIONS.md](API-CONVENTIONS.md) section 13) |
| Requirements | New FR and ADR before any code |

## 5. Consequences

- The API surface stays smaller: no signing, retry, delivery-log or endpoint-registration code to build, secure or support.
- Integrators must poll. The 60 requests per minute limit per key (FR-222, U-9) bounds the polling cost.
- Bounce and complaint handling is absent until U-A2 closes. Until then a failed email send surfaces as `email_delivery_failed` ([API-ERRORS.md](API-ERRORS.md)) and the address is not suppressed.
- If outbound webhooks are added later, they need new tables and a migration; nothing in the current design blocks that.
