# ADR-011 Idempotency and concurrency

> Status: Proposal, pending approval. Source of truth: Phase 2 PRD and Phase 1 docs.

## Status

Proposed.

## Context

Retried or double-submitted writes must not duplicate results: session save (EC-021, FR-048), XP awards (EC-017, FR-176, NFR-095), general retries (NFR-053). Two tabs or devices can edit the same record (EC-020, NFR-094). Only one timer may run per user, and simultaneous starts must have a single winner (BR-011, EC-002). Timer state must converge across devices within 5 s (FR-059).

## Decision

1. **Request keys.** The client generates a key per logical write (session save, timer start, manual entry, other creating actions). The server stores the key with the result and returns the stored result when the same key arrives again for the same user. Keys are scoped per user.
2. **XP uniqueness.** Each XP award is unique per user, source event and rule; a repeat is a no-op. Edits and deletes create compensating adjustments; ledger rows are never deleted.
3. **Optimistic versions.** Every editable record carries a version. An update sends the expected version; a mismatch is rejected with `stale_version` and the current record. Notes show both versions for resolution (U-8).
4. **One timer.** Timer start performs an atomic check-and-insert guarded by a database constraint, so the first accepted wins. The loser receives `timer_already_running`, and the client prompts "Stop current session and start new?".
5. **Convergence.** The timer is server-authoritative; clients poll every 3 s while a timer runs and refetch on focus (SSE is a later option, U-A5).
6. **Jobs.** Each job has an idempotency key and handlers are safe to repeat.
7. **Transactions.** Application services own the transaction; the effect and its idempotency record are committed together.

## Consequences

- Retries are safe by default, which allows automatic retry of keyed writes (ERROR-HANDLING.md section 5).
- Keys are stored for at least the lifetime of the record they created; Phase 4 decides retention.
- Users may see "changed elsewhere" prompts when two devices edit; the UI must make recovery easy.
- The database guarantees (uniqueness, versions) are the final defence; application checks give friendly messages.
- Tests: replay each request twice (NFR-053), two-tab edit test (NFR-094), simultaneous start test (EC-002).

## Alternatives

- Pessimistic locks on records: blocks users and complicates multi-device use.
- Last-write-wins: silently loses edits, violates NFR-094.
- Server-generated request tokens only: do not cover double-click before the first response.
- Operational transforms or CRDTs for notes: heavy; out of scope since there is no offline-first mode.
