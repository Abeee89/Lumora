# Lumora Testing Strategy

> Status: Proposal, pending approval. Source of truth: Phase 2 PRD and Phase 1 docs.

Tools come from ADR-001: Vitest, Testing Library, Playwright and axe. CI stage numbers refer to [DEPLOYMENT-ARCHITECTURE.md](../03-architecture/DEPLOYMENT-ARCHITECTURE.md) section 4. Milestone ids are in [MILESTONES.md](MILESTONES.md). A milestone is not done until the tests required by section 11 exist and pass ([DEFINITION-OF-DONE.md](DEFINITION-OF-DONE.md)).

## 1. Unit tests

| Item | Rule |
|---|---|
| Tool | Vitest |
| Scope | Domain rules and pure functions in each module; no database, no network |
| CI | Stage 3 |
| Requirement | Every BR-001..BR-032 that applies to the MVP has at least one test (NFR-061). BR-017..BR-022 are Phase 2 |
| Traceability | The report in REQUIREMENT-TRACEABILITY.md section (d) is regenerated at each milestone close |
| Time | Fixed clock; DST and midnight cases for BR-030, EC-006, AC-E2E-05 and AC-E2E-06 (spring-forward, fall-back, rollover hour, timezone change) |
| Exit | All pass; domain coverage floor met (DEVELOPMENT-STANDARDS.md) |

## 2. Integration tests

| Item | Rule |
|---|---|
| Tool | Vitest against a real PostgreSQL container |
| Scope | Repositories, transactions, outbox, use cases across one module and its allowed dependencies |
| CI | Stage 4 |
| Required cases | pg-boss handlers run twice with the same input produce one effect (idempotency, NFR-053); concurrent writers on the same record produce one winner and a documented error (NFR-094); outbox event written in a transaction is dispatched once |
| Exit | All pass on an empty database with migrations applied |

## 3. API tests

| Item | Rule |
|---|---|
| Tool | Vitest calling route handlers or the running app |
| Scope | Every endpoint id in the milestone |
| CI | Stage 4 |
| Per endpoint | Success; each documented error code; validation failures; authentication (G or session); CSRF on state-changing calls; idempotency replay where specified; rate-limit class |
| Ownership | A cross-user contract test per resource returns not found, never forbidden (NFR-016, AC-E2E-10). The helper from M02 is mandatory |
| OpenAPI | Internal contract tests from M01; an OpenAPI parity check once the OPENAPI-PLAN pipeline exists (public API, P3-03) |
| Exit | Every endpoint id has the tests above |

## 4. Database tests

| Item | Rule |
|---|---|
| Tool | Vitest plus SQL against a PostgreSQL container |
| CI | Stage 4; restore drill outside CI |
| Migrations | Apply on an empty database and on the previous-version schema; the previous app version still runs on the new schema (expand/contract) |
| Constraints | Tests from DATABASE-CONSTRAINTS: check constraints, partial unique indexes (for example one running timer per user), composite foreign keys, cascade purge |
| Indexes | EXPLAIN on seeded data for the statistics and calendar queries confirms the planned indexes are used (INDEXING-STRATEGY) |
| Purge | A test enumerates every table with `user_id` and fails if no purge handler is registered (from M14) |
| Restore | Restore drill with deletion re-check (NFR-103, NFR-104), first at M15, then quarterly |

## 5. End-to-end tests

| Item | Rule |
|---|---|
| Tool | Playwright against a preview deployment |
| CI | Stage 5 |
| Scenarios | AC-E2E-01..AC-E2E-10; each milestone adds the scenarios it enables (see section 11) |
| Browsers and widths | Chrome, Firefox, WebKit at 360 px and 1280 px (NFR-080, NFR-081, NFR-085, NFR-086) |
| Fault injection | For NFR-051: page refresh, tab close, offline for up to 30 minutes during a running timer |
| Exit | All scenarios green on all three browsers and both widths at M15; milestone scenarios green earlier on at least Chrome |

## 6. Accessibility tests

| Check | Rule | Requirement |
|---|---|---|
| axe | On every page in CI; zero serious or critical violations | NFR-040 |
| Keyboard walkthrough | Manual, per milestone for its new flows | NFR-041 |
| Screen readers | Two readers; at M07 (timer announcements) and M15 (all core flows) | NFR-044 |
| Grayscale and color-blind review | Charts, heatmap, status indicators carry non-color cues | NFR-043 |
| Reduced motion and color scheme | Honored | NFR-045 |
| Touch targets | Measured at 44 x 44 px on touch widths | NFR-087 |
| Design acceptance checks | The checks in ACCESSIBILITY.md section 10, run at M15 | ACCESSIBILITY.md |

## 7. Performance tests

| Check | Threshold | When |
|---|---|---|
| Largest Contentful Paint on the dashboard, throttled mid-tier mobile | at most 2.5 s | M13, M15 |
| API p95 at 500 concurrent users | reads at most 300 ms, writes at most 500 ms | M15 |
| Statistics, 10,000 sessions over 24 months | p95 at most 1 s (NFR-003) | M12 and M15 |
| Statistics, 100,000 sessions | still meets NFR-003 (NFR-072) | M15 |
| Export of 10,000 sessions | at most 60 s (NFR-005) | M14 |
| Timer action acknowledgement | at most 200 ms at p95, 50 repetitions (NFR-004) | M07 |

Load tests run in staging with a seeded dataset: at M12 for statistics, at M15 for the full set, then before each major release.

## 8. Security tests

| Check | Detail | When |
|---|---|---|
| ASVS Level 1 checklist | Completed and attached (NFR-017) | M15 |
| Lockout and revocation | 5 failures lock for 15 minutes; revocation effective within 60 s (NFR-012, NFR-013) | M02 |
| CSRF | State-changing calls without a token are rejected with `csrf_rejected` (NFR-014) | M02 onward |
| XSS corpus | Payload corpus against notes rendering and every user-supplied text field (NFR-015) | M11, M15 |
| Authorization matrix | Every endpoint by anonymous, owner, other user | each milestone |
| Bundle secret scan | Client bundle inspected (NFR-019) | stage 6 |
| Dependency scan | No unresolved critical or high at release (NFR-018) | stage 6 |
| Log scrub | Passwords, tokens and note content never appear in logs or error tracking (NFR-063, U-A7) | M01, M15 |
| AI privacy | Contract in AI-INTEGRATION section 12 | P3-01 |
| API keys | Scope enforcement, revocation, rate limit, key never logged | P3-03 |

## 9. Coverage and traceability

- Floors: domain at least 90% line, application at least 80%, overall at least 80%; the number never decreases. Coverage is a floor; traceability to BR, NFR and AC ids is the real gate.
- Each milestone updates REQUIREMENT-TRACEABILITY.md so every FR in scope maps to a test.

## 10. Test data, fixtures and flaky tests

- Deterministic seeds only; a fixed clock in every time-dependent test; no shared state between tests; each test creates its own users.
- Seeded datasets for performance: 10,000-session and 100,000-session accounts, generated by script, not committed as data.
- Flaky test policy: a flaky test is quarantined within 1 day of detection, and fixed before the milestone closes. Quarantined tests are listed in the completion report.
- Tests are not written for wiring, echoes, source text or defaults that are not requirements.

## 11. Milestone by test type

Legend: R = required, A = additional scenarios named in the milestone, - = not applicable.

| Milestone | Unit | Integration | API | Database | E2E | Accessibility | Performance | Security |
|---|---|---|---|---|---|---|---|---|
| M00 | - | - | - | - | - | - | - | spike proof |
| M01 | R | R (outbox) | R (health) | R | smoke | R (SY pages) | - | log scrub |
| M02 | R | R | R | R | R (sign-up, sign-in) | R | - | R (lockout, CSRF, revocation) |
| M03 | R | R | R | R | R (AC-E2E-10 part) | R | - | ownership |
| M04 | R | R | R | R | R (AC-E2E-08) | R | - | ownership |
| M05 | R | R | R | R | R | R | - | ownership |
| M06 | R | R | R | R | R (AC-E2E-05) | R | - | ownership |
| M07 | R | R | R | R | R (AC-E2E-02, 03, 04) | R + two screen readers | R (NFR-004) | ownership |
| M08 | R | R | R | R | R (AC-E2E-06) | R | - | ownership |
| M09 | R | R | R | - | R | R | - | ownership |
| M10 | R | R | R | R | R | R | - | ownership |
| M11 | R | R | R | R | R | R | - | R (XSS corpus) |
| M12 | R | R | R | R (EXPLAIN) | R (AC-E2E-07) | R | R (NFR-003) | ownership |
| M13 | R | - | R | - | R (AC-E2E-01) | R | R (LCP) | - |
| M14 | R | R | R | R (purge coverage) | R (AC-E2E-09) | R | R (NFR-005) | R |
| M15 | full | full | full | restore drill | AC-E2E-01..10, 3 browsers, 2 widths | full + two readers | full load | ASVS L1, scans |
| P2-01..P2-07 | R | R | R | R | R | R | as named | ownership; flag-off test |
| P3-01..P3-03 | R | R | R | R | R | R | as named | R (AI privacy, API keys) |
