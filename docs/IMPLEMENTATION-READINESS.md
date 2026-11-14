# Implementation Readiness

> Status: Phase 8 result. **Not ready for Build Mode.** Six critical findings and unresolved owner decisions remain (see [FINAL-ARCHITECTURE-REVIEW.md](FINAL-ARCHITECTURE-REVIEW.md) section 3 and [OPEN-DECISIONS.md](OPEN-DECISIONS.md) section A). Build Mode must not start until the owner approves corrections and gives explicit authorization.

## 1. Verdict

| Measure | Value |
|---|---|
| Structural linkage (requirement to AC, endpoint row, module, page, milestone) | 164 / 164 FRs, 100% |
| FRs without a critical defect | 151 / 164 (92%); MVP 85 / 98 (87%) |
| Critical findings | 6 (C-1 to C-6) |
| Major findings | 31 (M-1 to M-31) |
| Blocker decisions (OPEN-DECISIONS section A) | 7 |
| Documents approved by the owner | 0 of 73 |

Do not read the 100% linkage figure as readiness. It measures that links exist, not that the linked content agrees.

## 2. Readiness checklist

Every critical requirement must have the seven attributes below. "Pass" means the attribute exists and no critical finding contradicts it.

| Attribute | Where it lives | Status |
|---|---|---|
| Clear specification | FUNCTIONAL-REQUIREMENTS, NON-FUNCTIONAL-REQUIREMENTS | Pass for 151 FRs; FR-001, FR-003, FR-007, FR-030..FR-038, FR-070 blocked by C-2, C-3, C-5, C-6 |
| Owner module | MODULE-BOUNDARIES section 2 | Pass (164 / 164); FR-020..FR-023 are dashboard composition |
| Defined data model | DATA-DICTIONARY, DATABASE-DESIGN | Pass with fixes: C-4, M-12, M-14 |
| UI/UX specification | PAGE-SPECIFICATIONS, INTERACTION-SPECIFICATIONS | Pass with fixes: M-28, M-29, M-31 |
| Acceptance criteria | ACCEPTANCE-CRITERIA (595 AC, 62 NFR rows, 10 E2E) | Pass; E2E set incomplete (M-2) |
| Testing approach | TESTING-STRATEGY, REQUIREMENT-TRACEABILITY (planned TC IDs) | Pass; timer accuracy tests missing (M-27) |
| Implementation milestone | MILESTONES (M00..M15, P2-01..07, P3-01..03) | Pass with fixes: C-3, C-4, C-6, M-25, M-26 |

The full per-requirement mapping is in [TRACEABILITY-MATRIX.md](TRACEABILITY-MATRIX.md).

## 3. Gates and prerequisites

| Gate | Needed for | State |
|---|---|---|
| Owner approval of the documentation set and I-1..I-8 | Build Mode | Open (D-01) |
| Critical corrections C-1 to C-6 applied and re-reviewed | M01, M02, M05, M14 | Open |
| G1 hosting vendor (U-A1) | M00(d), M01 first staging deploy | Open (D-06) |
| U-A2 email provider, U-6 age policy, U-A4 auth spike | M02 | Open (D-08) |
| U-A7 error tracking, U-D5 legal pages, incident runbook | M15 | Open (D-19) |
| G2 | v1.0.0 | Open |
| G3, U-2 | P2-03 | Open |
| G4, U-3, U-4, U-A3 | P3-01, P3-02 | Open |
| G5, U-9 | P3-03 | Open |

## 4. Recommended implementation sequence

Taken from MILESTONES.md with the corrections the audit requires. Phase 2 and Phase 3 contracts stay non-binding until their phase starts.

| Order | Milestone | Condition before start | Correction carried in |
|---|---|---|---|
| 1 | M00 Technical spike | D-01 approved; D-06 chosen if spike (d) is to run on the real pooler | Spike outcomes recorded as ADR amendments, including linking policy (D-02) and UUIDv7 |
| 2 | M01 Project foundation | G1 done | Move `idempotency_keys` to M02; add CI stages 5, 6, 9, 10, 11 and retention jobs |
| 3 | M02 Authentication and profile | D-02, D-08, D-09, D-10 | Create `idempotency_keys` here; no goal insert at sign-up |
| 4 | M03 Subjects and topics | D-11 | One topic weight column |
| 5 | M04 Exams (basic) | D-12 | |
| 6 | M05 Study plans | D-03, D-13, D-18 | FR-036 actuals deferred to M06 or M12 |
| 7 | M06 Study sessions | | Carries plan actuals and `done` |
| 8 | M07 Timer | D-13, D-14, D-15 | Accuracy tests added |
| 9 | M08 Daily and subject goals | D-05, D-20 | Derived default goal |
| 10 | M09 Calendar | D-20 | Goal-met flag in day payloads |
| 11 | M10 Tasks, M11 Notes | after M03 | Dependency edges to M14 |
| 12 | M12 Statistics | | Completes AC-E2E-02 |
| 13 | M13 Dashboard and onboarding | | Routes exist before M02 redirects, or redirect to a holding page |
| 14 | M14 Data export and account deletion | D-04, D-16 | Purge cap; 48 h export |
| 15 | M15 MVP hardening and release | D-19, G2 | Incident runbook, legal pages |
| 16 to 25 | P2-01..P2-07, then P3-01..P3-03 | gates G3 to G5 | See OPEN-DECISIONS sections C |

## 5. Recommended first milestone

**M00 Technical spike and decisions.** It is a throwaway branch with no schema in the product and no user-facing code, so it is the lowest risk start. It resolves the questions that still gate M01 and M02:

- (a) to (e) per MILESTONES.md: auth library behaviour, UUIDv7, pooled connection with pg-boss, vendor Postgres features (`btree_gist`, PG 15+), email delivery.
- Add: confirm the Google callback path and account-linking behaviour so C-2 is decided with evidence, and measure timer drift in a throttled background tab (M-27) before M07 is sized.

M00 may start only after D-01 (approval of the corrected set) and, for item (d), D-06.

## 6. Authorization

Build Mode is not started. Waiting for the owner to (1) approve or amend the corrections, (2) answer section A of OPEN-DECISIONS.md, and (3) state explicitly: "Authorize Build Mode, milestone M00".
