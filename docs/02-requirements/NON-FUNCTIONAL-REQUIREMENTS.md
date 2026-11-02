# Lumora Non-Functional Requirements

> Status: Proposal, pending approval. Source of truth: Phase 1 docs.

All thresholds below are **proposed** unless a Phase 1 document already fixes them (cited by ID). Verification methods name the kind of evidence needed, not a tool. Risk IDs (R1..R19) refer to `docs/01-product-discovery/ASSUMPTIONS-AND-RISKS.md`. Thresholds are measured against the user and data volumes in NFR-070.

## 1. Performance

| ID | Requirement | Measure/threshold | Verification method | Phase |
|---|---|---|---|---|
| NFR-001 | Dashboard and primary pages load quickly on mid-tier mobile over 4G | Largest Contentful Paint <= 2.5 s for the dashboard (proposed) | Synthetic lab test on a throttled mid-tier mobile profile, 10 runs, median reported | MVP |
| NFR-002 | API responsiveness under load | p95 <= 300 ms for reads and <= 500 ms for writes at 500 concurrent users (proposed) | Load test against a production-like environment | MVP |
| NFR-003 | Statistics stay fast on large histories | Statistics for 24 months / 10,000 sessions respond p95 <= 1 s (proposed) | Load test with a seeded account of 10,000 sessions | MVP |
| NFR-004 | Timer actions feel instant | Start, pause, resume and stop acknowledged in the UI <= 200 ms (proposed) | Automated UI timing test, 50 repetitions, 95th percentile | MVP |
| NFR-005 | Full-account export completes in a bounded time | Export of an account with 10,000 sessions <= 60 s (proposed) | Timed export on a seeded account | MVP |

## 2. Security

| ID | Requirement | Measure/threshold | Verification method | Phase |
|---|---|---|---|---|
| NFR-010 | Encrypted transport | TLS 1.2 or higher on every connection; plain HTTP is refused or redirected (proposed) | Configuration scan; external TLS test | MVP |
| NFR-011 | Password strength and storage | Passwords >= 10 characters; stored only as salted adaptive hashes, never reversible (proposed) | Policy test on sign-up/reset; code and data review | MVP |
| NFR-012 | Brute-force protection | Account locked for 15 min after 5 consecutive failed sign-ins on that account (proposed) | Automated test: 5 failures then correct password is refused for 15 min | MVP |
| NFR-013 | Session lifetime and revocation | Sign-in session expires after 30 days of inactivity; user can revoke any session and revocation takes effect <= 60 s (proposed) | Automated test with clock control; manual revoke test | MVP |
| NFR-014 | Web attack protection | State-changing requests are protected against cross-site request forgery; all rendered user content is escaped against cross-site scripting (proposed) | Security test cases; penetration test checklist | MVP |
| NFR-015 | Markdown sanitization (R6) | Rendered notes contain no executable script, event handlers or unsafe links; 0 failures on an XSS payload corpus (proposed) | Automated test with an XSS payload corpus | MVP |
| NFR-016 | Object-level authorization | Every request to a resource is checked against ownership; a user can never read or change another user's data (proposed) | Automated cross-user access tests for every resource; any failure is severity 1 | MVP |
| NFR-017 | Security baseline | OWASP ASVS Level 1 requirements satisfied (proposed) | Checklist audit before release | MVP |
| NFR-018 | Dependency hygiene | Vulnerability scan on each release; 0 known critical or high findings unresolved at release (proposed) | Scan report attached to release | MVP |
| NFR-019 | No secrets in the client | No credential, key or private configuration is delivered to the browser (proposed) | Static review of the shipped client bundle | MVP |
| NFR-020 | Authentication audit log | Sign-in, failed sign-in, lockout, password reset, session revoke and account deletion events are recorded and retained 90 days (proposed) | Test that each event produces a record; retention check | MVP |
| NFR-021 | API key protection (Phase 3) | API keys stored only as hashes and shown once at creation (proposed) | Data review; creation-flow test | 3 |

## 3. Privacy

| ID | Requirement | Measure/threshold | Verification method | Phase |
|---|---|---|---|---|
| NFR-030 | Data minimization | Personal data collected is limited to what a documented FR needs; no field is collected without an FR (proposed) | Review of collected fields against FR list at each release | MVP |
| NFR-031 | Deletion and purge (BR-032) | After account deletion, personal data is purged within 30 days and from backups within 35 days (proposed) | Deletion test; backup purge audit | MVP |
| NFR-032 | Export on demand (BR-032) | A user can export all own data at any time without staff involvement | Functional test of export | MVP |
| NFR-033 | No advertising or tracking | No third-party advertising or cross-site tracking scripts (proposed) | Network inspection of all pages | MVP |
| NFR-034 | Anonymised analytics | Product analytics, if any, contain no name, email or free text and cannot be re-linked to an account (proposed) | Data review of analytics events | MVP |
| NFR-035 | Minimum age (Phase 1 assumption 7) | Users must confirm they are 16 or older at sign-up; see inconsistency I-3 and decision U-6 (proposed) | Sign-up flow test | MVP |
| NFR-036 | AI provider data sharing (Phase 3) | Study data is sent to an AI provider only after explicit, per-feature, revocable consent (proposed) | Flow test; no outbound call without consent | 3 |
| NFR-037 | Group sharing opt-in (Phase 3) | Each user's data is shared with a group only for fields the user has opted into (proposed) | Cross-member visibility tests | 3 |

## 4. Accessibility

| ID | Requirement | Measure/threshold | Verification method | Phase |
|---|---|---|---|---|
| NFR-040 | Conformance level | WCAG 2.2 level AA (proposed) | Automated scan plus manual audit of core flows | MVP |
| NFR-041 | Keyboard operability | Every function, including the timer and calendar, is operable by keyboard alone with visible focus (proposed) | Manual keyboard walkthrough of all MVP flows | MVP |
| NFR-042 | Drag-and-drop alternative | Every drag-and-drop action has a keyboard-operable equivalent (proposed; R7) | Manual test of each drag action by keyboard | 2 |
| NFR-043 | Color is never the only indicator | Heatmap cells, priorities and goal states also carry text or numeric values (proposed) | Review in grayscale and with color-blindness simulation | MVP |
| NFR-044 | Screen-reader announcements | Timer state changes (started, paused, resumed, interval ended, stopped) are announced; the per-second count is not (proposed) | Screen-reader test on two readers | MVP |
| NFR-045 | User display preferences | Honors reduced-motion and color-scheme preferences (proposed) | Test with each preference set | MVP |

## 5. Reliability

| ID | Requirement | Measure/threshold | Verification method | Phase |
|---|---|---|---|---|
| NFR-050 | Availability | Monthly availability >= 99.5% excluding announced maintenance (proposed; U-5) | Uptime monitoring report | MVP |
| NFR-051 | No loss of running-session data | No loss on refresh, tab close or network drop of <= 30 min (BR-006) | Fault-injection test cases for each trigger | MVP |
| NFR-052 | Timer accuracy | Saved duration within +/- 2 s of server wall-clock time (USER-JOURNEYS journey 4) | Automated comparison over runs of 1, 25 and 120 min, including a background tab | MVP |
| NFR-053 | Idempotent writes | Retrying a session save or XP award never creates a duplicate (EC-017, EC-021) | Replay tests sending each request twice | MVP |
| NFR-054 | Graceful save failure | A failed save shows an error with a retry action; unsaved note content is kept locally until saved (proposed) | Network-failure test during save | MVP |

## 6. Maintainability

| ID | Requirement | Measure/threshold | Verification method | Phase |
|---|---|---|---|---|
| NFR-060 | Internal API | The web client reaches data only through the internal API; it is not a public contract, undocumented externally and unsupported until Phase 3 (inconsistency I-8) | Architecture review | MVP |
| NFR-061 | Rule test coverage | Every business rule BR-001..BR-032 has at least one automated test | Traceability report (REQUIREMENT-TRACEABILITY.md section d) | MVP |
| NFR-062 | Data-driven defaults | Numeric defaults (BR-007..BR-009, BR-013, XP values, review limit) are defined in one configurable place, not duplicated in code (proposed) | Code review; changing a value changes all behavior | MVP |
| NFR-063 | Structured logging | Every request logs a request ID and outcome in structured form; no passwords, tokens or note content are logged (proposed) | Log sampling test | MVP |

## 7. Scalability

| ID | Requirement | Measure/threshold | Verification method | Phase |
|---|---|---|---|---|
| NFR-070 | MVP capacity target | 10,000 registered users, 1,000 concurrent users, 5 million stored sessions (proposed) | Load test at target volumes | MVP |
| NFR-071 | Growth path (R4) | Capacity can grow by adding resources, with no redesign of the data model; access by user and date is efficient and pre-computed aggregates can be added later (proposed) | Architecture review | MVP |
| NFR-072 | Statistics at 10x data | With 10x per-user data, statistics still meet NFR-003 (proposed) | Load test with 100,000-session account | MVP |

## 8. Browser compatibility

| ID | Requirement | Measure/threshold | Verification method | Phase |
|---|---|---|---|---|
| NFR-080 | Desktop browsers | Latest 2 major versions of Chrome, Edge, Firefox and Safari (proposed) | Cross-browser test run of MVP E2E scenarios | MVP |
| NFR-081 | Mobile browsers | Safari on iOS 16+ and Chrome on Android, latest 2 major versions (proposed) | Cross-device test run | MVP |
| NFR-082 | Unsupported browsers | Internet Explorer is not supported; unsupported browsers see a notice and not a broken page (proposed) | Test with an unsupported user agent | MVP |

## 9. Responsive design

| ID | Requirement | Measure/threshold | Verification method | Phase |
|---|---|---|---|---|
| NFR-085 | Supported widths | 360 to 2560 px viewport width (proposed) | Visual and automated checks at 360, 768, 1280, 2560 px | MVP |
| NFR-086 | No horizontal scrolling | No horizontal page scroll at 360 px width (proposed) | Automated check on all MVP pages | MVP |
| NFR-087 | Touch targets | Interactive targets >= 44 x 44 px on touch devices (proposed) | Automated measurement plus manual review | MVP |
| NFR-088 | Timer on phone | Starting, pausing and stopping a session is fully usable on a 360 px phone (proposed) | Manual phone test | MVP |

## 10. Data integrity

| ID | Requirement | Measure/threshold | Verification method | Phase |
|---|---|---|---|---|
| NFR-090 | Timestamp-based durations (BR-012) | Durations are computed from stored start and end timestamps, never from tick counts | Test with throttled tab and wrong client clock (EC-010) | MVP |
| NFR-091 | UTC with frozen local date (BR-030, EC-006) | Timestamps stored in UTC; each session keeps the timezone and local date at its start and they are never recomputed | Timezone-change and DST test cases | MVP |
| NFR-092 | Referential integrity | No session, plan entry, to-do, note or exam exists without an owning user; links to deleted parents never dangle (proposed) | Integrity checks; deletion tests | MVP |
| NFR-093 | Soft-delete rules (BR-029) | Archived subjects and topics keep history and statistics; hard purge happens only through account deletion | Archive/restore tests (EC-007, EC-008) | MVP |
| NFR-094 | Optimistic concurrency (EC-020) | Every editable record carries a version; a save on a stale version is rejected, never silently overwrites | Two-tab edit test | MVP |
| NFR-095 | XP ledger uniqueness (EC-017) | Each XP award is unique per user, source event and rule | Duplicate-award tests | 2 |
| NFR-096 | Reconciliation | Totals shown in statistics equal the sum of session durations for the same period, with 0 minutes difference (proposed) | Automated reconciliation test over seeded data | MVP |

## 11. Backup and recovery

| ID | Requirement | Measure/threshold | Verification method | Phase |
|---|---|---|---|---|
| NFR-100 | Automated backups | Daily automated backups, retained 30 days (proposed) | Backup job report | MVP |
| NFR-101 | Recovery point objective | RPO <= 24 h (proposed; U-5) | Restore drill measurement | MVP |
| NFR-102 | Recovery time objective | RTO <= 8 h (proposed; U-5) | Restore drill measurement | MVP |
| NFR-103 | Restore drills | A restore drill is run every quarter and its result recorded (proposed) | Drill log | MVP |
| NFR-104 | Deleted accounts stay deleted | After any restore, accounts deleted before the restore are purged again before service resumes (proposed) | Restore drill includes a deletion check | MVP |
