# Changelog

Documentation changes and build evidence. M01 application code is tracked from 2026-11-19, M02 from 2026-11-20, M03 from 2026-11-21 and M04 from 2026-11-21.

## 2026-11-21, M04 exams (basic)

### Added
- [08-build/M04-EVIDENCE.md](08-build/M04-EVIDENCE.md): environment and versions, one section per checkpoint (E01 to E11) with the command and raw output, per-row checklist status, the browser measurements at four widths, the four defects found and fixed, the registry order, the derived archive state and the Definition of Done check.
- [08-build/M04-COMPLETION-REPORT.md](08-build/M04-COMPLETION-REPORT.md): functionality, files, database changes, tests executed, technical findings, known limitations, remaining tasks, documents updated, Definition of Done level and recommended next milestone.
- [OPEN-DECISIONS.md](OPEN-DECISIONS.md) section C: OD-M33 to OD-M35 (the derived archive state, the date-only edit on an archived exam and the unpaginated upcoming list). Section G: the 2026-11-21 M04 execution row, limited to M04 records and stating that M04 stays open.
- Application and tooling: `db/migrations/0004_exams_and_checklists.sql`; `src/modules/exams/**` (5 files); `src/app/api/app/exams/**` (4 routes); `src/app/exams/**` (2 pages); `src/ui/forms/exam-{dialog,list,workspace}.tsx`; the `exam_auto_archive` scheduled job registered in `src/worker/index.ts`.
- Tests: `tests/unit/exams.test.ts` (7 cases) and `tests/integration/exams.test.ts` (12 cases), taking the unit tier to 17 files and 76 tests and the integration tier to 8 files and 59 tests.

### Changed
- [07-roadmap/MILESTONES.md](07-roadmap/MILESTONES.md): three M04 rows with evidence checked, the Definition of Done row left partial, and an "As built" note recording what shipped, the derived archive rule and the open rows.
- [03-architecture/ERROR-HANDLING.md](03-architecture/ERROR-HANDLING.md) section 4: `invalid_page_size` and `invalid_cursor`, and the EC-008 row now names the checklist drop rather than a readiness note.
- [OPEN-DECISIONS.md](OPEN-DECISIONS.md), [IMPLEMENTATION-READINESS.md](IMPLEMENTATION-READINESS.md) sections 6 and 7, [README.md](../README.md), [docs/README.md](README.md), [DOCUMENTATION-INDEX.md](DOCUMENTATION-INDEX.md): build state, the M05 gate and the inventory at 91 documents (11 build records).
- Application and tooling: `src/kernel/{config,errors}.ts` (the exams limits, the queue name, the cron and two codes), `src/server/{container,request-context}.ts`, `src/ui/{control,messages,nav}.ts(x)`, `vitest.config.ts` (a `src/modules/exams/**` coverage floor beside the kernel one), `tests/integration/support/api.ts` and `tests/integration/profile.test.ts`.

### Fixed
- The exam list answered `topicCount` and `completedCount` as the driver's bigint strings; both counts now cast `::int`, with a regression case.
- A `date` column returned as a JavaScript `Date` shifted every countdown by one day outside UTC; every exam read now selects `exam_date::text`.
- The A-12 tablist used a roving tabindex with no arrow handler, so the Archived tab was unreachable by keyboard; both exam tabs now follow the ARIA arrow pattern.
- The exam list showed "No upcoming exams" during the request; a loading branch now renders five skeletons in an `aria-busy` region with a `role="status"` label.

### Results
- `npm run verify` exit 0: typecheck, `eslint .`, `Boundary check passed.`, 17 unit files and 76 tests, 8 integration files and 59 tests in 140.70 s against PostgreSQL 18.6.
- `npx next build`: 43 routes, 26 under `/api/app` of which 4 are M04's, plus `/exams` and `/exams/[examId]`; 28 static pages generated; no static and dynamic sibling conflict.
- `npm run test:coverage` exit 0: both configured floors pass, the kernel at 94.94% lines and 77.5% branches and the exams module at 89.93% lines and 87.15% branches; overall lines measure 50.12%, because the UI layer is covered by the browser pass, so the Definition of Done coverage item stays partial.
- Browser checks in Chromium at 360, 768, 1280 and 2560 px: A-12 and A-13 with their empty, loading and error states, the add, edit and change-date dialogs, the checklist tick, arrow-key tabs, the read-only archived exam and no horizontal overflow.

### Not changed
- No commit, no tag, no ADR Accepted, no vendor selected, no open-decision row closed and no requirement baseline approved.
- No readiness score, weight input or label (Phase 2), no plan, session, timer, statistic or note behaviour, and no paging widget on the archived list; M05 is not authorized.

## 2026-11-21, M03 subjects and topics

### Added
- [08-build/M03-EVIDENCE.md](08-build/M03-EVIDENCE.md): environment and versions, one section per checkpoint (E01 to E11) with the command and raw output, per-row checklist status, the browser measurements at four widths, the five defects found and fixed, five deviations and the Definition of Done check.
- [08-build/M03-COMPLETION-REPORT.md](08-build/M03-COMPLETION-REPORT.md): functionality, files, database changes, tests executed, technical findings, known limitations, remaining tasks, documents updated, Definition of Done level and recommended next milestone.
- [OPEN-DECISIONS.md](OPEN-DECISIONS.md) section C: OD-M27 to OD-M32 (the SUBJ-01 topic counts, the M05 archive guard, pointer drag, the archived-subject read-only rule, coverage floors and durable topic events). Section G: the 2026-11-21 M03 execution row, the same day's approval row answering the delivery report, both limited to M03 records and stating that M03 stays open.
- Application and tooling: `db/migrations/0003_subjects_and_topics.sql`; `src/modules/subjects/**` and `src/modules/topics/**`; `src/app/api/app/subjects/**` (8 routes) and `src/app/api/app/topics/**` (3); `src/app/subjects/**`; `src/ui/subject-dot.tsx`, `src/ui/dialog.tsx`, `src/ui/forms/subject-*.tsx` and `src/ui/forms/topic-*.tsx`.
- Tests: `tests/unit/subjects-topics.test.ts` (7 cases) and `tests/integration/subjects.test.ts` with `tests/integration/topics.test.ts` (11 and 9 cases), taking the unit tier to 16 files and 69 tests and the integration tier to 7 files and 47 tests.

### Changed
- [07-roadmap/MILESTONES.md](07-roadmap/MILESTONES.md): four M03 rows with evidence checked, the Definition of Done row left partial, an "As built" note recording what shipped, the deviations and the open rows, and the 2026-11-21 approval sentence answering the delivery report.
- [03-architecture/ERROR-HANDLING.md](03-architecture/ERROR-HANDLING.md) section 4 and [03-architecture/MODULE-BOUNDARIES.md](03-architecture/MODULE-BOUNDARIES.md) section 3: seven error codes, including the one retryable conflict, and the archive-guard verdict shape.
- [OPEN-DECISIONS.md](OPEN-DECISIONS.md), [IMPLEMENTATION-READINESS.md](IMPLEMENTATION-READINESS.md) sections 6 and 7, [README.md](../README.md), [docs/README.md](README.md), [DOCUMENTATION-INDEX.md](DOCUMENTATION-INDEX.md): build state, the M03 approval, the M04 gate and the inventory at 89 documents (9 build records).
- Application and tooling: `src/kernel/{config,errors,idempotency,registries}.ts` (the PostgreSQL idempotency store, the archive guard, the palette keys and limits), `src/server/{request-context,container}.ts`, `src/ui/{control,format,messages,nav}.ts(x)`, `src/ui/forms/feedback.ts`, `src/app/globals.css` (the ten subject tokens), `tests/integration/support/{api,ownership}.ts` and `tests/integration/profile.test.ts`.

### Results
- `npm run verify` exit 0: typecheck, `eslint .`, `Boundary check passed.`, 16 unit files and 69 tests, 7 integration files and 47 tests in 132.69 s against PostgreSQL 18.6.
- `npx next build`: 37 routes, 22 under `/api/app` of which 11 are M03's, plus `/subjects` and `/subjects/[subjectId]`; 26 pages generated; no static and dynamic sibling conflict.
- Browser checks in Chromium at 360, 768, 1280 and 2560 px: A-7 and A-8 with their empty, loading and error states, keyboard reorder, archive and restore, the paste preview and its 200-line cap, no horizontal overflow and no target between 24 and 44 px.

### Not changed
- No commit, no tag, no ADR Accepted, no vendor selected, no open-decision row closed and no requirement baseline approved.
- No session, timer, plan, to-do, note or exam behaviour, no pointer drag reorder and no readiness job; M04 is not authorized.

## 2026-11-20, M02 authentication and profile

### Added
- [08-build/M02-EVIDENCE.md](08-build/M02-EVIDENCE.md): environment and versions, one section per checkpoint with the command and raw output, per-row checklist status, eleven limitations and the Definition of Done check.
- [08-build/M02-COMPLETION-REPORT.md](08-build/M02-COMPLETION-REPORT.md): functionality, files, database changes, tests executed, technical findings, known limitations, remaining tasks, documents updated, Definition of Done level and recommended next milestone.
- [OPEN-DECISIONS.md](OPEN-DECISIONS.md) section C: OD-M24 (password-reset mail transport), OD-M25 (account-column export coverage) and OD-M26 (the ADR-004 amendment). Section G: the 2026-11-20 M02 execution row and the approval row answering the delivery report, both limited to M02 records and stating that M02 stays open.
- Application and tooling: `src/kernel/{crypto,http,rate-limit,jobs}.ts`; `src/modules/auth/**` (8 files), `src/modules/profile/**` (2), `src/modules/notifications/public.ts`; `src/server/{container,request-context,session}.ts`; `src/app/api/app/auth/**` (9 routes), `src/app/api/app/profile/**` (2), `src/app/api/auth/callback/google/route.ts`; `src/app/{page,login,signup,forgot-password,reset-password,welcome,settings}/**`; `src/ui/**` with `src/ui/forms/**`; `db/migrations/0002_auth_and_profile.sql`; the `auth_cleanup` scheduled job registered in `src/worker/index.ts`.
- Tests: five unit files (`auth-password`, `auth-device-label`, `auth-google-state`, `rate-limit`, `profile-defaults`), taking the unit tier to 15 files and 59 tests; three integration files (`auth`, `profile`, `auth-cleanup`) with `tests/integration/support/{api,environment,ownership}.ts`, taking the integration tier to five files and 27 tests.

### Changed
- [07-roadmap/MILESTONES.md](07-roadmap/MILESTONES.md): the four M02 rows with evidence checked, the three open rows left unchecked, and an "As built" note recording what shipped and what is deferred.
- [OPEN-DECISIONS.md](OPEN-DECISIONS.md), [IMPLEMENTATION-READINESS.md](IMPLEMENTATION-READINESS.md) sections 6 and 7: the M02 execution state, the open M02 rows and the M03 gate.
- [README.md](../README.md), [docs/README.md](README.md), [DOCUMENTATION-INDEX.md](DOCUMENTATION-INDEX.md): build state and the inventory at 87 documents (7 build records).
- `.env.example`: the email sink, the optional Google variables and the trusted proxy hops. `.gitignore`: local run output under `.artifacts/` is ignored, except the tracked M00 OpenAPI diff.

### Results
- `npm run verify` exit 0: typecheck, `eslint .`, `Boundary check passed.`, 15 unit files and 59 tests, 5 integration files and 27 tests against PostgreSQL 18.6.
- `npx next build`: 24 route entries; every route is dynamic because the root layout reads the session and theme cookies.
- Browser checks in Chromium: sign-up, sign-in, sign-out, profile save, six of six theme switches, sign-in management, the age gate, three guard redirects, zero targets under 44 px and zero horizontal overflow on eight pages at 360, 768, 1280 and 2560 px, no console errors.

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
