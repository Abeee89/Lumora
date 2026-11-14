# Lumora Documentation

Lumora is a web application where learners plan study time, study with a timer, record sessions and compare actual effort with the plan. The planning prompts call it "Study Tracker"; the documents use Lumora.

> Status: Planning complete through Phase 8. The Phase 8 audit found six critical issues. No code or migration exists. Build Mode has not been authorized. See [IMPLEMENTATION-READINESS.md](IMPLEMENTATION-READINESS.md).

## Reading order

1. [PROJECT-BRIEF.md](PROJECT-BRIEF.md) and [01-product-discovery/PRODUCT-VISION.md](01-product-discovery/PRODUCT-VISION.md): what and why.
2. [02-requirements/PRD.md](02-requirements/PRD.md): scope, phases, unresolved decisions U-1..U-9.
3. [03-architecture/SDD.md](03-architecture/SDD.md) and [03-architecture/MODULE-BOUNDARIES.md](03-architecture/MODULE-BOUNDARIES.md): how it is built.
4. [04-database/DATA-DICTIONARY.md](04-database/DATA-DICTIONARY.md): tables.
5. [06-api-integrations/API-ENDPOINTS.md](06-api-integrations/API-ENDPOINTS.md) and [05-ui-ux/PAGE-SPECIFICATIONS.md](05-ui-ux/PAGE-SPECIFICATIONS.md): contracts and screens.
6. [07-roadmap/MILESTONES.md](07-roadmap/MILESTONES.md): build order.
7. Phase 8: [FINAL-ARCHITECTURE-REVIEW.md](FINAL-ARCHITECTURE-REVIEW.md), [OPEN-DECISIONS.md](OPEN-DECISIONS.md), [TRACEABILITY-MATRIX.md](TRACEABILITY-MATRIX.md).

Full list: [DOCUMENTATION-INDEX.md](DOCUMENTATION-INDEX.md). Change history: [CHANGELOG.md](CHANGELOG.md).

## Key numbers

164 functional requirements (98 MVP), 62 non-functional requirements, 32 business rules, 28 edge cases, 595 acceptance criteria, 19 modules, 41 tables, 125 internal and 39 public API operations, 16 MVP milestones, 7 Phase 2 and 3 Phase 3 milestones.

## Conventions

- IDs: FR, NFR, BR, EC, AC-FR-xxx-n, planned TC-FR-xxx-n, endpoint prefixes such as AUTH-01, pages PU, SY, A, B, C.
- Numeric values not fixed by Phase 1 are proposals until approved.
- Document headers say "Proposal, pending approval" until the owner records approval.
