# Lumora External Integrations

> Status: Proposal, pending approval. Source of truth: Phase 2 PRD and Phase 1 docs.

This document lists every system outside the Lumora application that the API or the worker talks to, with data flow, secrets, failure behaviour and decision status. Sources: [SYSTEM-ARCHITECTURE.md](../03-architecture/SYSTEM-ARCHITECTURE.md), [DEPLOYMENT-ARCHITECTURE.md](../03-architecture/DEPLOYMENT-ARCHITECTURE.md), [TECHNOLOGY-DECISIONS.md](../03-architecture/TECHNOLOGY-DECISIONS.md), [SDD.md](../03-architecture/SDD.md) section 12 (unresolved decisions U-A1..U-A7), [SECURITY-ARCHITECTURE.md](../03-architecture/SECURITY-ARCHITECTURE.md), [BACKGROUND-JOBS.md](../03-architecture/BACKGROUND-JOBS.md), [ERROR-HANDLING.md](../03-architecture/ERROR-HANDLING.md), [DATA-LIFECYCLE.md](../04-database/DATA-LIFECYCLE.md), [ADR-004](../adr/ADR-004-authentication.md), [ADR-010](../adr/ADR-010-ai-integration-adapter.md) and the requirements FR-003, FR-005, FR-153, FR-190..198, NFR-019, NFR-030, NFR-033, NFR-036, NFR-063. Related: [AI-INTEGRATION.md](AI-INTEGRATION.md), [WEBHOOKS.md](WEBHOOKS.md), [API-ERRORS.md](API-ERRORS.md), [API-SECURITY.md](API-SECURITY.md).

General rules for all integrations:

- Every external system is reached through a port with an adapter. Application services never import a vendor SDK (ADR-003, ADR-010).
- No user-facing request waits on a third party except the Google sign-in redirect. Email, push, AI and export storage are called from worker jobs ([BACKGROUND-JOBS.md](../03-architecture/BACKGROUND-JOBS.md) section 2).
- Secrets live in the per-environment secrets store and never reach the browser (NFR-019). Production, preview and development use separate credentials for every integration below.
- Request and response bodies, tokens and personal text are never logged (NFR-063).
- Retry abbreviations follow BACKGROUND-JOBS: `standard` = 3 attempts, exponential backoff starting at 30 s.

## 1. Summary

| # | Integration | Direction | Phase | Status |
|---|---|---|---|---|
| 1 | Google OAuth | Outbound redirect, inbound callback | MVP | Decided (callback path unverified) |
| 2 | Transactional email | Outbound | MVP | Open: U-A2 |
| 3 | AI provider | Outbound | 3 | Open: U-A3 |
| 4 | Error tracking | Outbound | MVP | Open: U-A7 |
| 5 | Web Push | Outbound | 2 | Proposed, pending approval |
| 6 | Object storage for exports | Outbound | MVP | Decided as a port; vendor follows U-A1 |
| 7 | Uptime monitor | Inbound probe | MVP | Open: vendor not chosen |
| 8 | CDN | Outbound delivery | MVP | Decided: platform-provided |
| 9 | PaaS and managed PostgreSQL | Hosting | MVP | Open: U-A1 |

## 2. Integrations

### 2.1 Google OAuth

| Field | Value |
|---|---|
| Purpose | Sign in with a Google account; create the account if none exists for the verified email (FR-003) |
| Direction | Lumora redirects the browser to Google (AUTH-03); Google redirects back to a callback route |
| Phase | MVP |
| Data sent | OAuth client id, redirect URI, scopes `openid email profile`, `state`, PKCE challenge. The age confirmation flag and browser timezone travel inside the signed state, never to Google |
| Data received | Verified email, name, Google subject id. Only a verified email is accepted (FR-003); unverified is treated as a failed sign-in |
| Auth and secret | OAuth client id and client secret in the secrets store. A separate OAuth client per environment |
| Timeout, retry, idempotency | Code exchange has a short server-side timeout and no automatic retry; the user restarts sign-in. A replayed callback fails on the consumed `state` |
| Failure behaviour | User cancels at Google: login page shows a cancellation notice and no account is created (AC-FR-003-3). Google unreachable or token exchange fails: login page shows `internal_error` copy and email-password sign-in remains available |
| Environment separation | One Google OAuth client and redirect URI set per environment |
| Privacy basis | Data limited to what FR-003 needs (NFR-030). Age gate applies to new accounts (NFR-035) |
| Status | Decided (ADR-004). The library-owned callback path `/api/auth/callback/google` is unverified; confirm in the Phase 7 spike (U-A4). Closing criterion: spike proves NFR-012 and NFR-013 and the callback path, otherwise the Auth.js fallback applies |
| Owner module and port | Authentication; Better Auth Google provider |

### 2.2 Transactional email

| Field | Value |
|---|---|
| Purpose | Password reset (FR-005, MVP), group invitation (Phase 3), study reminders (FR-150, FR-151, Phase 2) |
| Direction | Outbound from the worker |
| Phase | MVP |
| Data sent | Recipient address, template name, template variables (reset link, invite link, reminder text). Never study notes or AI text |
| Data received | Provider message id and an accepted or rejected result. Bounce events only if [WEBHOOKS.md](WEBHOOKS.md) W-2 is built |
| Auth and secret | Provider API key in the secrets store |
| Port | Notifications port `SendEmail({to, template, variables, idempotencyKey})`; templates: password reset, group invite, reminder (Phase 2) |
| Timeout, retry, idempotency | Jobs use the `standard` retry policy. The idempotency key is the reset request id or invite id; the provider's own idempotency support is used where available, otherwise at most one duplicate is accepted (BACKGROUND-JOBS section 4) |
| Failure behaviour | After retries are exhausted the job is dead-lettered and logged as `email_delivery_failed`. Password reset keeps the neutral response (AC-FR-005-1), so the user is not told; they may request again. An invite whose email failed remains valid and the admin can copy the link from GRP-07's one-time response |
| Environment separation | Separate sender identity and key per environment; non-production sends only to an allow-list or a sink |
| Privacy basis | Address processed to deliver FR-005 and invites; data processing agreement required (NFR-030) |
| Status | Open: U-A2 (provider not chosen). Closing criteria: the provider meets every row below, and the owner records the choice in [TECHNOLOGY-DECISIONS.md](../03-architecture/TECHNOLOGY-DECISIONS.md) |
| Owner module | Notifications |

U-A2 selection criteria:

| Criterion | Required |
|---|---|
| Data processing agreement | Available |
| Region | EU processing option |
| Bounce and complaint events | Webhook callbacks supported (enables [WEBHOOKS.md](WEBHOOKS.md) W-2) |
| Idempotency | Send API accepts an idempotency key |
| Deliverability | SPF, DKIM and DMARC supported on a custom sending domain |
| Price | Predictable at NFR-070 volumes; budget set by the owner |

### 2.3 AI provider

| Field | Value |
|---|---|
| Purpose | Propose a study schedule (FR-190..198) |
| Direction | Outbound from the worker |
| Phase | 3 |
| Data sent / received | Minimised payload and validated output as defined in [AI-INTEGRATION.md](AI-INTEGRATION.md); not repeated here |
| Auth and secret | Provider key in the secrets store; the adapter is selected by configuration |
| Timeout, retry, idempotency | 30 s hard timeout; one retry only if no response was received at all, never after a timeout; job keyed by generation request id (BACKGROUND-JOBS) |
| Failure behaviour | Request ends `failed` or `timed_out` with `ai_provider_unavailable`, `ai_provider_timeout` or `ai_no_valid_entries`; the user retries from the prefilled form (FR-197) |
| Environment separation | Fake adapter in development and test; real key in production only, and in preview only if the owner allows |
| Privacy basis | Per-feature revocable consent (FR-192, NFR-036); consent wording pending legal review (U-4) |
| Status | Open: U-A3 (provider and SDK) and U-4 (wording). Closing criteria are the provider selection table in [AI-INTEGRATION.md](AI-INTEGRATION.md) and the legal sign-off |
| Owner module and port | AI scheduling; `ScheduleProposer` |

### 2.4 Error tracking

| Field | Value |
|---|---|
| Purpose | Collect scrubbed error events from web and worker (ERROR-HANDLING section 6) |
| Direction | Outbound |
| Phase | MVP |
| Data sent | Error class, stack trace, request id, release, environment, user id as an opaque id at most |
| Data NOT sent | Request bodies, cookies, `Authorization` and `Cookie` headers, email addresses, note text, AI prompts and responses, API keys, reset or invite tokens |
| Scrubbing contract | A `beforeSend` hook (or vendor equivalent) removes the items above before transmission. The vendor must also support server-side scrubbing rules. A test sends a seeded error containing each forbidden item and asserts none arrives |
| Auth and secret | Project DSN or key in the secrets store; separate project per environment |
| Timeout, retry, idempotency | Fire and forget with a short timeout; failure to report never affects the request |
| Failure behaviour | Silent to the user; errors still appear in structured logs |
| Privacy basis | Data minimisation (NFR-030, NFR-063); data processing terms required |
| Status | Open: U-A7. Closing criteria: vendor supports scrubbing hooks and server-side rules, offers a DPA, and the scrub test passes |
| Owner | Observability (cross-cutting) |

### 2.5 Web Push (Phase 2)

| Field | Value |
|---|---|
| Purpose | Reminder delivery to a closed tab after explicit opt-in (FR-153) |
| Direction | Outbound from the worker to the browser vendor's push service |
| Phase | 2 |
| Proposal | Standard Web Push protocol with VAPID keys held in the secrets store and a server-side push library. No third-party push vendor, which keeps NFR-033 intact. Pending approval; no document decides push delivery |
| Data sent | Encrypted payload with the notification id and a generic title only. Study content is fetched in-app after the click. Note: FR-153 allows "reminder text and subject name"; this proposal is stricter |
| Subscription | Registered by NOTIF-05 (endpoint, `p256dh`, `auth`). Endpoint must be HTTPS. Upsert by endpoint |
| Timeout, retry, idempotency | `standard` retry; keyed by notification id (BACKGROUND-JOBS "Push delivery") |
| Failure behaviour | Push service answers 404 or 410: the subscription is deleted. Denied permission or unsupported browser: in-app reminders continue (EC-024). Other failures: retried, then dropped; the in-app notification still exists (FR-152) |
| Environment separation | Separate VAPID key pair per environment (a pair change invalidates existing subscriptions) |
| Privacy basis | Opt-in per browser, off by default; turning off deletes the subscription; purge unsubscribes endpoints ([DATA-LIFECYCLE.md](../04-database/DATA-LIFECYCLE.md)) |
| Status | Proposed, pending approval. Closing criterion: owner approves the VAPID approach; Phase 7 confirms library choice |
| Owner module and port | Notifications; push sender port |

### 2.6 Object storage for exports

| Field | Value |
|---|---|
| Purpose | Hold generated export files (FR-130..132) |
| Direction | Outbound from the worker; streamed out through PROF-08 |
| Phase | MVP |
| Port | `put(key, stream)`, `getStream(key)`, `delete(key)`. Private bucket, no public URLs |
| Data | One CSV set or one JSON file per export, built from a single read-only snapshot |
| Lifetime | File deleted at `expires_at` (completion plus 48 hours per DATA-LIFECYCLE), at least 24 hours available (FR-132). Clients read `expiresAt` from the API and must not assume 24 hours; see the reconciliation in [API-CONVENTIONS.md](API-CONVENTIONS.md) |
| Auth and secret | Storage credentials in the secrets store, scoped to the one bucket |
| Timeout, retry, idempotency | Job keyed by export id; partial files deleted on failure |
| Failure behaviour | Export row ends `failed` with `storage_unavailable` or `internal_error`; user retries (FR-132). Download of an expired or foreign export is `not_found` |
| Environment separation | Separate bucket per environment |
| Privacy basis | Export contains only the owner's data; account purge deletes files |
| Status | Decided as a port; the concrete store is a Phase 4 detail and follows the PaaS choice (U-A1). Closing criterion: U-A1 closed and the store passes the port contract test |
| Owner module | Data export (Profile) |

### 2.7 Uptime monitor

| Field | Value |
|---|---|
| Purpose | Measure availability against NFR-050 |
| Direction | Inbound probe |
| Phase | MVP |
| Probes | SYS-01 `GET /api/health` and the sign-in page |
| Data | SYS-01 returns only `{"status":"ok"}` with no versions or internals |
| Failure behaviour | Monitor alerts the owner; no user-visible change |
| Status | Open: vendor not chosen. Closing criteria: probe interval of 1 minute or better, alerting channel, no data beyond the two public URLs |
| Owner | Operations |

### 2.8 CDN and PaaS

| Integration | Detail | Status |
|---|---|---|
| CDN | Platform-provided delivery of static assets and Phase 2 audio files. No cookies or personal data cross it | Decided |
| PaaS and managed PostgreSQL | Web service, worker service, managed database. Chosen against the checklist in [DEPLOYMENT-ARCHITECTURE.md](../03-architecture/DEPLOYMENT-ARCHITECTURE.md) section 8 | Open: U-A1. Closing criterion: ADR-009 updated with the vendor |

## 3. Failure-mode matrix

| Integration down | Feature degradation | User message intent | Alert |
|---|---|---|---|
| Google OAuth | Google sign-in fails; email and password still works | "Google sign-in is not available right now. Use your email and password or try again later." | Error tracking event; alert on sustained failure rate |
| Email provider | Reset and invite emails not delivered; reminders by email missed | Reset keeps the neutral message; admin can copy the invite link; reminders stay in-app | Dead-letter count above zero for email jobs |
| AI provider | Schedule generation fails; manual planning unaffected | `ai_provider_unavailable` or `ai_provider_timeout` copy with retry; no quota used (EC-015, EC-016) | AI failure ratio and timeout metrics ([AI-INTEGRATION.md](AI-INTEGRATION.md)) |
| Error tracking | No remote error reports; logs remain | None | Missing heartbeat events; check logs |
| Push service | Push not received; in-app reminders unaffected | None (in-app indicator remains) | Push failure ratio |
| Object storage | Exports fail or cannot be downloaded | `storage_unavailable` copy with retry (FR-132) | Export failure count |
| Uptime monitor | Availability is not measured | None | Vendor status; manual check |
| CDN | Static assets or audio slow or missing; core API unaffected | Audio falls back to silent (FR-180 family) | Synthetic probe of asset URL |
| PaaS or database | Whole service down | `database_unavailable` or platform error page | Uptime monitor and platform alerts |

## 4. Third-party consumers of the public API

`FEATURE-ANALYSIS.md` feature 13 names Google Calendar, Notion and Anki as intended consumers of the public API. Lumora builds no first-party integration for any of them. They use a `/v1` key with the scopes of FR-221 and the 60 requests per minute limit (FR-222).

| Consumer | How it integrates | What Lumora builds |
|---|---|---|
| Google Calendar | User or third-party tool reads plan entries (`plan_entries:read`) and creates calendar events | Nothing beyond `/v1` |
| Notion | Tool reads subjects, topics, notes, to-dos and writes notes or to-dos | Nothing beyond `/v1` |
| Anki | Tool reads topics and notes to build cards; Lumora flashcards are not in the public API (see [API-STRATEGY.md](API-STRATEGY.md)) | Nothing beyond `/v1` |

## 5. Open decisions carried

| ID | Decision | Default stated | Closes in |
|---|---|---|---|
| U-A1 | PaaS vendor | Choose against the DEPLOYMENT-ARCHITECTURE checklist | Before Phase 7 deployment |
| U-A2 | Transactional email provider | Any provider meeting the criteria in 2.2 | Before MVP release (FR-005 needs it) |
| U-A3 | AI provider and SDK | Adapter now; provider chosen before Phase 3 build | Before Phase 3 |
| U-A4 | Better Auth acceptance versus fallback | Accept if a spike proves NFR-012 and NFR-013 | Phase 7 spike |
| U-A7 | Error-tracking vendor | Any vendor supporting scrubbing and DPA | Before MVP release |
| U-4 | AI daily limit and consent wording | 5 per day; wording pending legal review | Before Phase 3 |
| Push | Web Push approach (2.5) | VAPID, no vendor | Before Phase 2 |
