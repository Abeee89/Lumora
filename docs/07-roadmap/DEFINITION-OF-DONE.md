# Lumora Definition of Done

> Status: Proposal, pending approval. Source of truth: Phase 2 PRD and Phase 1 docs.

Three levels. A level is met only when every item is checked with evidence. MVP acceptance rules are in [ACCEPTANCE-CRITERIA.md](../02-requirements/ACCEPTANCE-CRITERIA.md) section 5. Test requirements are in [TESTING-STRATEGY.md](TESTING-STRATEGY.md) and standards in [DEVELOPMENT-STANDARDS.md](DEVELOPMENT-STANDARDS.md).

## 1. Task or pull request level

- [ ] Change is within one milestone and its scope
- [ ] Typecheck (stage 1), lint and boundary check (stage 2) pass
- [ ] Unit and integration tests for the change pass (stages 3 and 4)
- [ ] Inputs validated on the server; error codes follow API-ERRORS.md
- [ ] No secrets or personal data in logs or fixtures
- [ ] No `TODO`, stub, placeholder, mock data or dead code
- [ ] Docs touched by the change are updated
- [ ] Reviewed against the review checklist in DEVELOPMENT-STANDARDS.md and squash merged

## 2. Milestone level

All items are required.

- [ ] All acceptance criteria ids listed for the milestone pass (`AC-FR-*`, `AC-NFR-*`, `AC-E2E-*`)
- [ ] Every FR in scope has implemented behavior: no stubs, placeholders, mock data or TODOs
- [ ] Tests per the TESTING-STRATEGY.md section 11 matrix are written and green
- [ ] Typecheck, lint and boundary check pass
- [ ] Coverage floors met (domain 90%, application 80%, overall 80%) and not lower than before
- [ ] An ownership contract test exists for each new resource
- [ ] A purge handler and an export contributor are registered for each new user-data table
- [ ] Idempotency and concurrency requirements from the endpoint specs are verified
- [ ] Migrations apply from an empty database and from the previous schema
- [ ] Accessibility: axe reports zero serious or critical issues; manual keyboard pass for new pages; no horizontal scroll at 360 px
- [ ] Error, empty and loading states from PAGE-SPECIFICATIONS are implemented
- [ ] Structured logs carry no secrets or note content
- [ ] Docs updated: SDD, DATA-DICTIONARY, API-ENDPOINTS, PAGE-SPECIFICATIONS as affected
- [ ] REQUIREMENT-TRACEABILITY updated
- [ ] MILESTONES.md checklist for the milestone fully checked
- [ ] Completion report produced in the Build Mode format (functionality, files, database changes, tests executed and results, known limitations, remaining tasks, docs updated, recommended next milestone)
- [ ] No future-phase feature code is reachable
- [ ] Tag `m<NN>-done` created

## 3. Phase 2 and Phase 3 milestone addition

- [ ] The feature is behind its configuration flag and unreachable with the flag off (tested)
- [ ] The relevant gate (G3, G4, G5) has an owner decision recorded
- [ ] Any new table has a purge handler and an export contributor

## 4. Release level

- [ ] AC-E2E-01..AC-E2E-10 pass on Chrome, Firefox and WebKit at 360 px and 1280 px
- [ ] Every MVP NFR is measured with evidence attached and meets its threshold
- [ ] Every Must Have MVP FR passes all criteria; each Should Have FR passes or has a written waiver
- [ ] Every applicable BR has a passing automated test (NFR-061)
- [ ] Zero open severity-1 or severity-2 defects
- [ ] WCAG 2.2 AA audit passed on core flows (NFR-040)
- [ ] ASVS L1 checklist, dependency scan and client bundle secret scan reports attached (NFR-017, NFR-018, NFR-019)
- [ ] Load test report for NFR-002, NFR-003, NFR-070, NFR-072
- [ ] Restore drill logged with the deletion re-check (NFR-103, NFR-104)
- [ ] Uptime monitor configured and green (NFR-050)
- [ ] No Phase 2 or Phase 3 behavior reachable in the build
- [ ] Changelog entry written; release tag created
