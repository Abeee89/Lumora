# ADR-006 Time and timezone handling

> Status: Proposal, pending approval. Source of truth: Phase 2 PRD and Phase 1 docs.

## Status

Proposed.

## Context

Durations must come from stored timestamps, never tick counts (BR-012, NFR-090) and be accurate to 2 s of server time even in a background tab or with a wrong client clock (NFR-052, EC-010). Day-based computations use the user's timezone (BR-030) with an optional rollover hour (BR-014, FR-009). Sessions that cross midnight are split by day (BR-016, EC-009). Timezone changes and DST must not alter past days or reduce a streak (EC-006, BR-022). The running timer must survive refresh and reflect across devices (EC-001, EC-020).

## Decision

1. Store every instant in UTC.
2. At session start, store the user's IANA zone and the local date; they are frozen and never recomputed (NFR-091).
3. Today's progress counts sessions whose frozen local date equals today's date in the current zone.
4. A midnight-crossing session is stored once and allocated to two days at read time, using its frozen zone (BR-016).
5. The timer is server-authoritative. The client sends commands (start, pause, resume, stop, heartbeat) and receives server timestamps. The browser derives the displayed time from server timestamps and a measured offset to server time; it never sends durations.
6. A single time module is the only code that converts instants to local dates. date-fns with date-fns-tz is used inside it. The clock is injected everywhere, including domain code and tests.
7. Jobs that depend on a user's local day compute the next boundary from the user's zone at scheduling time.
8. Auto-close uses the last heartbeat time as end time after more than 30 min without heartbeat (BR-006).

## Consequences

- Timezone and DST bugs are contained in one module with a dedicated test suite (EC-006 cases, AC-E2E-05, AC-E2E-06).
- Frozen local dates mean statistics by day never shift when a user travels.
- Allocation at read time requires day-allocation logic in queries or the Study sessions module; Phase 4 must support efficient access by user and date (NFR-071).
- Replacing date-fns-tz with Temporal later is internal to the time module.

## Alternatives

- Store local times only: breaks across zone changes and DST.
- Recompute local dates from the current zone: violates EC-006 and rewrites history.
- Client-reported durations: violates BR-012 and EC-010.
- Split midnight-crossing sessions into two stored rows: simplifies day queries but breaks the single-session display and edit semantics (EC-009); rejected, but Phase 4 may add derived data without changing this decision.
