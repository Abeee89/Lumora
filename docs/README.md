# Lumora Documentation

Lumora is a web application where learners plan study time, study with a timer, record sessions and compare actual effort with the plan. The planning prompts call it "Study Tracker"; the documents use Lumora.

> Status: M07 (timer) was executed on 2026-11-25 under the M07 build instruction, two days after the M06 delivery report was approved ([OPEN-DECISIONS.md](OPEN-DECISIONS.md) section G); evidence, the completion record, the twelve findings and the unchecked rows are in [08-build/M07-EVIDENCE.md](08-build/M07-EVIDENCE.md) and [08-build/M07-COMPLETION-REPORT.md](08-build/M07-COMPLETION-REPORT.md). M07 is not closed: its Definition of Done row stays partial because the screen-reader pass with two readers was not run, the by-layer coverage floors are neither enforced nor met beyond the timer module floor M07 added, axe cannot run, and the build is committed without a milestone tag. M06 (study sessions) was executed on 2026-11-23; M05 (study plans) was executed on 2026-11-22; M04 (exams, basic) was executed on 2026-11-21; M03 (subjects and topics) was executed on 2026-11-21 and approved the same day; M02 (authentication and profile) was executed on 2026-11-20 and approved the same day; M01 (project foundation) was executed on 2026-11-19 and recorded on 2026-11-20; M00 was executed and torn down on 2026-11-18. The planning baseline remains unapproved, the palette and typeface decisions (U-D2, U-D3), the vendor rows (U-A1, U-A2) and other U-rows are open, and M08 is not authorized.

## Reading order

1. [PROJECT-BRIEF.md](PROJECT-BRIEF.md) and [01-product-discovery/PRODUCT-VISION.md](01-product-discovery/PRODUCT-VISION.md): what and why.
2. [02-requirements/PRD.md](02-requirements/PRD.md): scope, phases, unresolved decisions U-1..U-9.
3. [03-architecture/SDD.md](03-architecture/SDD.md) and [03-architecture/MODULE-BOUNDARIES.md](03-architecture/MODULE-BOUNDARIES.md): how it is built.
4. [04-database/DATA-DICTIONARY.md](04-database/DATA-DICTIONARY.md): tables.
5. [06-api-integrations/API-ENDPOINTS.md](06-api-integrations/API-ENDPOINTS.md) and [05-ui-ux/PAGE-SPECIFICATIONS.md](05-ui-ux/PAGE-SPECIFICATIONS.md): contracts and screens.
6. [07-roadmap/MILESTONES.md](07-roadmap/MILESTONES.md): build order.
7. Phase 8: [FINAL-ARCHITECTURE-REVIEW.md](FINAL-ARCHITECTURE-REVIEW.md), [OPEN-DECISIONS.md](OPEN-DECISIONS.md), [TRACEABILITY-MATRIX.md](TRACEABILITY-MATRIX.md).
8. Build records: [08-build/M07-COMPLETION-REPORT.md](08-build/M07-COMPLETION-REPORT.md) with [08-build/M07-EVIDENCE.md](08-build/M07-EVIDENCE.md) for the current milestone, [08-build/M06-COMPLETION-REPORT.md](08-build/M06-COMPLETION-REPORT.md) with [08-build/M06-EVIDENCE.md](08-build/M06-EVIDENCE.md), [08-build/M05-COMPLETION-REPORT.md](08-build/M05-COMPLETION-REPORT.md) with [08-build/M05-EVIDENCE.md](08-build/M05-EVIDENCE.md), [08-build/M04-COMPLETION-REPORT.md](08-build/M04-COMPLETION-REPORT.md) with [08-build/M04-EVIDENCE.md](08-build/M04-EVIDENCE.md), [08-build/M03-COMPLETION-REPORT.md](08-build/M03-COMPLETION-REPORT.md) with [08-build/M03-EVIDENCE.md](08-build/M03-EVIDENCE.md), [08-build/M02-COMPLETION-REPORT.md](08-build/M02-COMPLETION-REPORT.md) with [08-build/M02-EVIDENCE.md](08-build/M02-EVIDENCE.md), [08-build/M01-COMPLETION-REPORT.md](08-build/M01-COMPLETION-REPORT.md) with [08-build/M01-EVIDENCE.md](08-build/M01-EVIDENCE.md), and [08-build/M00-IMPLEMENTATION-PLAN.md](08-build/M00-IMPLEMENTATION-PLAN.md) with [08-build/M00-COMPLETION-REPORT.md](08-build/M00-COMPLETION-REPORT.md) for the spike.

Full list: [DOCUMENTATION-INDEX.md](DOCUMENTATION-INDEX.md). Change history: [CHANGELOG.md](CHANGELOG.md).

## Key numbers

97 Markdown documents: 73 baseline planning documents, 7 Phase 8 governance documents and 17 build records. The baseline defines 164 functional requirements (98 MVP), 62 non-functional requirements, 32 business rules, 28 edge cases, 595 functional acceptance criteria, 19 modules, 41 tables, 125 internal and 39 public API operations, 16 MVP milestones, 7 Phase 2 milestones and 3 Phase 3 milestones.

## Conventions

- IDs: FR, NFR, BR, EC, AC-FR-xxx-n, planned TC-FR-xxx-n, endpoint prefixes such as AUTH-01, pages PU, SY, A, B, C.
- Numeric values not fixed by Phase 1 are proposals until approved.
- Except for the M00 charter, the M01 authorization, the M01 close-out record, the M02 execution record, the M02 approval, the M03 execution record, the M03 approval, the M04 execution record, the M05 execution record and the M05 approval, no document has repository evidence of owner approval. Approval requires an owner, date, baseline version and decision record.
