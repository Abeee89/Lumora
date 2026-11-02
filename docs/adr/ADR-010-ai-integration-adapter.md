# ADR-010 AI integration adapter

> Status: Proposal, pending approval. Source of truth: Phase 2 PRD and Phase 1 docs.

## Status

Proposed. Applies to Phase 3. The provider is unresolved (U-A3).

## Context

AI schedule generation (FR-190..198) sends exams, topics, available weekly hours and 4 weeks of history to a provider only after explicit, per-feature, revocable consent (FR-192, NFR-036). The provider may be slow (30 s timeout, EC-016) and returns untrusted output that must be validated entry by entry (EC-015, FR-194). Nothing persists until the user accepts (FR-195). Generations are limited to 5 per user per profile day, counted only when a provider response was received (FR-196, U-4).

## Decision

1. The AI scheduling module owns consent, quota, input assembly, validation, preview and acceptance.
2. The provider is reached through a port with one capability ("propose schedule"), implemented by a single adapter. The adapter may use the Vercel AI SDK or a direct provider SDK; this is an implementation detail behind the port (U-A3).
3. Output must conform to a Zod schema. Entries failing any EC-015 rule are dropped and counted. If none remain, an error is returned and nothing is saved.
4. Generation runs as a background job with a 30 s provider timeout, so a web request never waits on the provider.
5. Inputs are minimal and aggregated: no email, display name or notes content (NFR-030).
6. No outbound call occurs without recorded consent; consent is re-checked at call time.
7. Accepting creates plan entries through the Study plans use case, which applies overlap and exam-date warnings (BR-026, BR-025).
8. A fake provider is used in tests and local development.

## Consequences

- Provider lock-in is limited to one adapter; a provider switch needs no change in scheduling rules.
- Prompt quality, cost and evaluation are product risks outside this decision.
- Legal review of consent wording must complete before Phase 3 release (U-4).
- Contract tests use recorded or synthetic responses, including malformed, late and out-of-rule entries.

## Alternatives

- Calling a provider SDK directly from the scheduling service: faster to write, couples rules to the vendor.
- LangChain or a workflow platform: heavier than needed, more data sharing.
- Rule-based scheduling without AI: out of scope for Phase 3 as specified, but possible as a fallback adapter behind the same port.
