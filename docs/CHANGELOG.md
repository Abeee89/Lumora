# Changelog

Documentation changes and build evidence. M01 application code is tracked from 2026-11-19.

## 2026-11-19, M01 project foundation

### Added
- [08-build/M01-EVIDENCE.md](08-build/M01-EVIDENCE.md): environment and versions, one section per CI stage and runtime check with the command and raw output, per-row checklist status, nine limitations and the Definition of Done check.
- [08-build/M01-COMPLETION-REPORT.md](08-build/M01-COMPLETION-REPORT.md): functionality, files, database changes, tests executed, technical findings, known limitations, remaining tasks, documents updated, Definition of Done level and recommended next milestone.
- [OPEN-DECISIONS.md](OPEN-DECISIONS.md) section G: the 2026-11-20 row recording the M01 execution and close-out, limited to M01 records and stating that M01 stays open.
- Application and tooling: `src/kernel/{config,env,errors,idempotency,logger,outbox,registries,time}.ts`, `src/app/{layout,error,not-found}.tsx` with `globals.css`, `src/app/api/health/route.ts`, `src/app/unsupported-browser/page.tsx`, `src/ui/shell.tsx`, `src/ui/focus-heading.tsx`, `src/ui/nav.ts`, `src/worker/index.ts`, `tools/boundaries.ts`, `scripts/{check-boundaries,apply-migrations}.ts`, `db/migrations/0001_shared_kernel.sql`, `Dockerfile`, `.github/workflows/ci.yml`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `vitest.config.ts`, `.env.example`, `README.md`.
- Tests: 10 unit files (35 tests) and two integration files (6 tests) plus the boundary fixtures.

### Changed
- [07-roadmap/MILESTONES.md](07-roadmap/MILESTONES.md): M01 rows with evidence are checked and an "As built" note records the deferred deliverables; M11 and M14 dependencies, the M02 database list and acceptance rows, and the M05 and M06 requirement split were corrected.
- [03-architecture/MODULE-BOUNDARIES.md](03-architecture/MODULE-BOUNDARIES.md): section 8 now records the implemented checker and its fixtures; section 7 no longer claims no files exist in the phase.
- [04-database/DATA-DICTIONARY.md](04-database/DATA-DICTIONARY.md): `idempotency_keys` records that it ships in M02 with the `users` foreign key.
- [README.md](README.md), [DOCUMENTATION-INDEX.md](DOCUMENTATION-INDEX.md), [IMPLEMENTATION-READINESS.md](IMPLEMENTATION-READINESS.md) and [OPEN-DECISIONS.md](OPEN-DECISIONS.md): inventory at 84 documents, M01 authorization and scope.

### Results
- Boundaries, typecheck, lint, 35 unit tests, 6 integration tests and the production build pass on Node 24.13.1, TypeScript 6.0.3, Next.js 16.4.6, pg-boss 12.38.2, PostgreSQL 18.6 (embedded).
- The worker dispatches a committed outbox row exactly once; a rollback leaves no row; a duplicate `idempotency_key` is rejected by the database.
- The shell and the three system pages answer in Chromium at 360 px and 1280 px with no horizontal scroll, contrast above 7:1, a working skip link and no console errors.

### Not changed
- No ADR is Accepted, no open-decision row is closed, no vendor is selected and no requirement baseline is approved.
- No product page, no module directory and no user table exists; M02 is not authorized.
- Stage 8 (staging deploy), stage 5 (preview environment), axe and the container image build are unexecuted; each names its cause in the evidence file.

## 2026-11-18, M00 close-out

### Added
- [08-build/M00-COMPLETION-REPORT.md](08-build/M00-COMPLETION-REPORT.md): M00 functionality, files, database changes, tests, results, limitations, remaining tasks and next milestone.
- [08-build/M00-EVIDENCE.md](08-build/M00-EVIDENCE.md): teardown results and the secret-scan record.

### Changed
- Added M00 evidence sections to [ADR-004](adr/ADR-004-authentication.md), [ADR-005](adr/ADR-005-background-jobs.md), [ADR-008](adr/ADR-008-api-strategy.md) and [ADR-009](adr/ADR-009-deployment-platform.md). Every status stays Proposed.
- Updated [DATABASE-DESIGN.md](04-database/DATABASE-DESIGN.md), [OPENAPI-PLAN.md](06-api-integrations/OPENAPI-PLAN.md), [EXTERNAL-INTEGRATIONS.md](06-api-integrations/EXTERNAL-INTEGRATIONS.md) and [TECHNOLOGY-DECISIONS.md](03-architecture/TECHNOLOGY-DECISIONS.md) with the local evidence and the vendor gaps.
- Added the OD-S02 to OD-S06 evidence table and the close-out record to [OPEN-DECISIONS.md](OPEN-DECISIONS.md); no row was closed.
- Updated [MILESTONES.md](07-roadmap/MILESTONES.md), [IMPLEMENTATION-READINESS.md](IMPLEMENTATION-READINESS.md), [README.md](README.md) and [DOCUMENTATION-INDEX.md](DOCUMENTATION-INDEX.md) for the results and the 83-document inventory.

### Results
- TS-01, TS-02, TS-04 and TS-05 PASS. TS-03, TS-06, TS-07 and TS-09 PARTIAL. TS-08 DEFERRED.
- The spike worktree and branch were deleted; the scratch database and local environment file were removed; the evidence survived.
- The secret scan found no environment secret value in tracked files. The main commit advanced to `c8f151e` and contains no spike source.

### Not changed
- No ADR is Accepted, no OD-S02 to OD-S06 row is closed, no vendor is selected, no requirement baseline is approved, and no production code, migration or seed exists. M01 and Build Mode remain unauthorized.

## 2026-11-18, M00 charter approved

### Added
- [08-build/M00-IMPLEMENTATION-PLAN.md](08-build/M00-IMPLEMENTATION-PLAN.md): approved M00 charter, requirements mapping, scope, 14-task checklist, order, test protocols, documentation changes and risks.
- [08-build/M00-EVIDENCE.md](08-build/M00-EVIDENCE.md): evidence template for the nine protocols.

### Changed
- Recorded M00 authorization in [OPEN-DECISIONS.md](OPEN-DECISIONS.md) section G and in the [IMPLEMENTATION-READINESS.md](IMPLEMENTATION-READINESS.md) gate model.
- Updated the inventory counts in README.md and DOCUMENTATION-INDEX.md for the new build record.

### Not changed
- No ADR is Accepted, no requirement or baseline is approved, no application code or migration exists, and no milestone other than M00 is authorized.

## 2026-11-17, Phase 8 audit refresh

Audit basis: commit `8e9ef3c` plus the working-tree documentation state.

### Changed
- Corrected the inventory to 80 Markdown documents: 73 baseline documents and 7 Phase 8 documents.
- Replaced unsupported 100% readiness and 92% clean-FR claims with a reproducible trace metric and categorical gate result.
- Reclassified global, M00 and milestone-specific blockers to remove the D-01/D-02/M00 authorization cycle.
- Expanded the final review and open-decision register with product, timer, privacy, recovery, UI, API, security and testing blockers found in the full audit.
- Marked unsupported and inherited trace links explicitly; no proposed requirement or architecture decision was approved or changed.

### Findings
- Verdict remains: not ready for Build Mode.
- The refreshed report consolidates blockers into 12 critical categories.
- Strict Flow00 trace completeness is 66.5% (`654 / 984`) before inherited design and entity context is accepted as row-level evidence.
- Approval evidence is `0 / 80`; critical product, security, timer, deletion/recovery and milestone-contract decisions remain open.

## Initial Phase 8 audit snapshot

### Added
- README.md, DOCUMENTATION-INDEX.md, IMPLEMENTATION-READINESS.md, FINAL-ARCHITECTURE-REVIEW.md, OPEN-DECISIONS.md, this CHANGELOG.md.
- TRACEABILITY-MATRIX.md: 164 requirements linked to module, tables, endpoints, pages, milestone, acceptance criteria and planned test cases.

### Changed
- None. No approved document was edited. All corrections are recommendations in FINAL-ARCHITECTURE-REVIEW.md and OPEN-DECISIONS.md awaiting owner approval.

### Findings
- Initial snapshot recorded 6 critical and 31 major findings. The 2026-11-17 full audit supersedes those counts and retains the same not-ready verdict.

## Earlier phases (from repository history)

| Phase | Content |
|---|---|
| 1 | Product discovery and requirement analysis |
| 2 | PRD, functional and non-functional requirements, acceptance criteria |
| 3 | SDD, system architecture, ADR-001..011 |
| 4 | Database design and ERDs |
| 5 | UI/UX and design system |
| 6 | API and external integration design |
| 7 | Development roadmap and implementation plan |
