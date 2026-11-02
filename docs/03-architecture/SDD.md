# Lumora Software Design Document (SDD)

> Status: Proposal, pending approval. Source of truth: Phase 2 PRD and Phase 1 docs.

## 1. Purpose and status

This SDD records the recommended system architecture for Lumora, a web application where learners plan study time, study with a timer, record sessions and compare actual effort with the plan. It translates the Phase 2 PRD (`docs/02-requirements/`) into architecture, technology choices, module boundaries, flows and security design.

- Phase 3 is documentation only. No application code, package, migration or implementation file exists.
- Everything here is a proposal until the product owner approves it.
- **Phase 4 (database design and ERD) must not begin before this architecture is approved.**
- Three choices were fixed by the product owner before this phase: managed PaaS with managed PostgreSQL, a Next.js full-stack modular monolith in TypeScript, and a PostgreSQL-backed job queue with pg-boss. Their trade-offs are still documented.

## 2. Scope

In scope: system context, containers, modules, flows, security, error handling, background jobs, deployment, technology and decision records for MVP, Phase 2 and Phase 3. Out of scope: data model and schema (Phase 4), API endpoint design (Planning 6), UI design (Planning 5), delivery plan (Planning 7), implementation.

## 3. Architectural drivers

The drivers are listed with their consequences in [SYSTEM-ARCHITECTURE.md](SYSTEM-ARCHITECTURE.md) section 1. In brief: server-authoritative timer accuracy (NFR-052, NFR-090), no loss of running sessions (NFR-051), object-level authorization (NFR-016), idempotent writes (NFR-053), UTC with frozen local dates (NFR-091), optimistic concurrency (NFR-094), p95 300/500 ms at 500 concurrent users (NFR-002), accessibility to WCAG 2.2 AA (NFR-040), and a capacity target of 10,000 users and 5 million sessions (NFR-070).

## 4. Recommended architecture summary

A **modular monolith** in TypeScript: one Next.js codebase with 19 domain modules arranged in five acyclic layers (foundation, catalog, activity, derived, composition), run as two processes (web and worker) against one managed PostgreSQL database that also holds the job queue. Server logic lives only in application services; route handlers, server actions and job handlers are thin adapters. Ownership scoping happens in the repository layer, and cross-user access returns not-found. The timer is server-authoritative: the client sends actions, never durations, and converges across devices by polling every 3 s while a timer runs. Time is stored in UTC, with the IANA zone and local date frozen on each session. Phase 3 adds a provider-agnostic AI adapter, study groups and a versioned public API that reuses the same application services.

## 5. Technology stack

Full rationale with advantages, disadvantages and alternatives is in [TECHNOLOGY-DECISIONS.md](TECHNOLOGY-DECISIONS.md).

| Area | Choice | Replaces candidate? | ADR |
|---|---|---|---|
| Language | TypeScript strict | No | ADR-001 |
| Frontend | React with Next.js App Router | No | ADR-001 |
| Backend | Modular monolith in Next.js | Not a candidate; user-confirmed | ADR-003 |
| Styling/UI | Tailwind CSS + shadcn/ui | No | ADR-001 |
| Database | PostgreSQL, managed | No | ADR-002 |
| ORM | Drizzle | No | ADR-001 |
| Authentication | Better Auth (fallback: Auth.js with custom lockout) | No, with fallback | ADR-004 |
| Validation | Zod | No | ADR-001 |
| State | TanStack Query, React state, Zustand for the timer only | Not a candidate | ADR-001 |
| Notes editor | Markdown textarea with sanitized preview | Yes, replaces TipTap | ADR-007 |
| Calendar | Custom heatmap (MVP), dnd-kit (Phase 2) | Partly | ADR-001 |
| Dates/time zones | date-fns with date-fns-tz | No | ADR-006 |
| Charts | Recharts, paired with numeric tables | No | ADR-001 |
| AI | Provider-agnostic adapter, provider TBD | Not a candidate | ADR-010 |
| Background jobs | pg-boss, separate worker | Not a candidate; user-confirmed | ADR-005 |
| Audio | Native audio element, self-hosted CC0 loops | Not a candidate | ADR-001 |
| API documentation | OpenAPI 3.1 from Zod (public API only) | No | ADR-008 |
| Testing | Vitest, Playwright, Testing Library, axe | No | ADR-001 |
| Deployment | Managed PaaS, vendor TBD | Not a candidate; user-confirmed | ADR-009 |
| Observability | pino JSON logs, error tracking service | Not a candidate | ADR-001 |
| Idempotency and concurrency | Request keys and optimistic versions | Not a candidate | ADR-011 |

## 6. Module list

Details, public interfaces and the acyclicity proof are in [MODULE-BOUNDARIES.md](MODULE-BOUNDARIES.md).

| Layer | Modules |
|---|---|
| Foundation | Authentication, User profile |
| Catalog | Subjects, Topics |
| Activity | Study plans, Study sessions, Timer, Tasks, Notes, Exams, Flashcards |
| Derived | Goals, Calendar, Analytics, Gamification |
| Composition | AI scheduling, Study groups, API integrations, Notifications |

## 7. Key flows index

| Flow | Section in APPLICATION-FLOWS.md |
|---|---|
| Registration and login | 1 |
| First-time onboarding | 2 |
| Subject creation | 3 |
| Study plan creation | 4 |
| Study session lifecycle | 5 |
| Timer lifecycle | 6 |
| Daily goal calculation | 7 |
| XP transaction | 8 |
| Streak calculation | 9 |
| AI schedule generation | 10 |
| Exam preparation | 11 |
| Group activity | 12 |
| API authentication and request handling | 13 |

Diagram index: system context, container and component diagrams in SYSTEM-ARCHITECTURE.md section 17; authentication sequence in SECURITY-ARCHITECTURE.md section 2; deployment diagram in DEPLOYMENT-ARCHITECTURE.md section 1; dependency graph in MODULE-BOUNDARIES.md section 5; session lifecycle state diagram, AI schedule sequence and the main flows in APPLICATION-FLOWS.md.

## 8. Cross-cutting concerns

| Concern | Where defined |
|---|---|
| Security, authorization, privacy | SECURITY-ARCHITECTURE.md |
| Error taxonomy and codes | ERROR-HANDLING.md |
| Logging | ERROR-HANDLING.md section 6, ADR-001 |
| Time handling | SYSTEM-ARCHITECTURE.md section 13, ADR-006 |
| Idempotency and concurrency | SYSTEM-ARCHITECTURE.md section 14, ADR-011 |
| Configuration of defaults | SYSTEM-ARCHITECTURE.md section 16 |
| Background processing | BACKGROUND-JOBS.md, ADR-005 |
| Deployment and operations | DEPLOYMENT-ARCHITECTURE.md, ADR-009 |
| Accessibility | TECHNOLOGY-DECISIONS.md D4, SYSTEM-ARCHITECTURE.md section 4 |

## 9. Architecture quality review

| Quality | How achieved | Evidence / requirement | Residual risk | Rating |
|---|---|---|---|---|
| Maintainability | One language and codebase; thin adapters; business rules in pure domain code; numeric defaults in one configuration module; ADRs record reasoning | NFR-060, NFR-061, NFR-062; MODULE-BOUNDARIES.md | Next.js App Router conventions change quickly; Drizzle and Better Auth are young and need version pinning | Adequate |
| Type safety | Strict TypeScript; shared Zod schemas between client and server; typed repository ports; typed error codes | D1, D8; NFR-062 | Types are erased at runtime, so all external input must pass schema validation | Strong |
| Data integrity | Relational database with integrity constraints; UTC and frozen local date; server timestamps; optimistic versions; idempotency keys; XP ledger uniqueness; transactions owned by application services | NFR-053, NFR-090..096, EC-017, EC-020, EC-021 | Detailed constraint design is deferred to Phase 4; restores must replay deletions (NFR-104) | Strong |
| Security | Repository-level ownership; not-found on cross-user access; DB-backed revocable sessions; lockout; CSRF and XSS controls; markdown sanitization; hashed API keys; audit log; ASVS L1 mapping | NFR-010..021; SECURITY-ARCHITECTURE.md | Better Auth maturity (U-A4); in-app lockout must be proven by tests; the markdown pipeline needs a payload corpus | Adequate |
| Performance | Server-rendered read pages; access by user and date; direct reads for statistics with rollups as a measured trigger (p95 700 ms); cheap timer polling only while running | NFR-001..005, NFR-070..072 | Statistics at 24 months / 10,000 sessions and 100,000 sessions (NFR-072) are unproven until load-tested; polling load (U-A5) | Adequate |
| Modularity | 19 modules in five acyclic layers with public interfaces, events and inversion points; tooling-enforced boundaries (Phase 7) | MODULE-BOUNDARIES.md sections 1 to 8 | Boundaries are only convention until the tooling exists; shared database tempts shortcuts | Adequate |
| Testability | Injected clock and configuration; pure domain; repository ports; real PostgreSQL in CI; fake email and AI providers; Playwright mapped to AC-E2E-01..10 | NFR-061; D18 | Time-dependent behavior (30-day expiry, DST) needs disciplined clock use; E2E suites are slow | Strong |
| Future extensibility | Phase 2 and 3 modules exist as boundaries now; AI provider, email, rate limiter and file store behind ports; public API reuses application services; extraction triggers named | SYSTEM-ARCHITECTURE.md sections 3, 8, 9; NFR-071 | Single database is a shared failure domain; extraction still needs data separation work | Strong |

## 10. Trade-off register

| ID | Trade-off | Chosen | Gave up | Revisit when |
|---|---|---|---|---|
| T-1 | Monolith versus services | Modular monolith | Independent scaling and isolation | An extraction trigger fires (SYSTEM-ARCHITECTURE.md section 3) |
| T-2 | Queue infrastructure | pg-boss on the application database | Throughput and isolation of a dedicated broker | Queue polling affects p95 (NFR-002) |
| T-3 | Auth engine | Better Auth in-process | Maturity and vendor assurances of a managed IdP | Spike fails NFR-012 or NFR-013 (U-A4) |
| T-4 | Notes editor | Markdown textarea | WYSIWYG convenience | Users demand rich text (ADR-007) |
| T-5 | Calendar | Custom heatmap, dnd-kit later | Ready-made calendar features | Phase 2 scope grows beyond a 15-minute grid |
| T-6 | Convergence | Polling every 3 s while timing | Instant push | Load tests show polling cost or UX complaints (U-A5) |
| T-7 | Statistics | Direct queries, no rollups at MVP | Guaranteed speed at very large histories | p95 above 700 ms |
| T-8 | Hosting | Managed PaaS | Control, cheapest cost | Cost or SLA fails NFR-050 |
| T-9 | ORM | Drizzle | Prisma's ergonomics and migration tooling | Phase 4 modelling shows a gap (D6) |
| T-10 | Rate limiting | Database-backed limiter | Edge-grade performance | Public API traffic (Phase 3) |
| T-11 | Single region | Simple operations | Regional redundancy | Availability target tightens |

## 11. Requirement coverage

Every FR group in [FUNCTIONAL-REQUIREMENTS.md](../02-requirements/FUNCTIONAL-REQUIREMENTS.md) is assigned to a module and at least one flow. Flows column refers to APPLICATION-FLOWS.md sections. Where a flow is not defined, the group is a plain create-read-update-delete over a single module and follows the generic adapter -> application service -> repository path in SYSTEM-ARCHITECTURE.md section 5.

| FR group | Module(s) | Flow |
|---|---|---|
| FR-001..005, FR-008 Authentication, sessions | Authentication | 1 |
| FR-006, FR-007, FR-009 Profile, deletion, rollover | User profile | 1, 7; purge in BACKGROUND-JOBS.md |
| FR-010..019 Subjects and topics | Subjects, Topics | 3 |
| FR-020..024 Dashboard | Adapter composition over Goals, Timer, Study plans, Tasks, Analytics | 7 |
| FR-030..038 Study planning | Study plans (with Exams) | 4 |
| FR-040..049 Sessions | Study sessions | 5 |
| FR-050..059 Timer | Timer (with Study sessions) | 6 |
| FR-060..062 Calendar | Calendar | 4, 7 |
| FR-065..069 Drag-and-drop | Study plans (rules), Calendar (UI) | 4 |
| FR-070..074 Daily goals | Goals | 7 |
| FR-080..089 Statistics | Analytics | 5, 7 |
| FR-090..096 To-dos | Tasks | generic CRUD |
| FR-100..104 Notes | Notes | generic CRUD with conflict handling (ERROR-HANDLING.md section 5) |
| FR-107..112 Flashcards | Flashcards | generic CRUD with review queue |
| FR-120..128 Exams | Exams | 11 |
| FR-130..132 Data export | User profile (contributors from all modules) | export job in BACKGROUND-JOBS.md |
| FR-134..139 Onboarding, appearance | User profile, adapter composition | 2 |
| FR-150..154 Reminders | Notifications | reminder jobs in BACKGROUND-JOBS.md |
| FR-160..164 Streaks | Gamification | 9 |
| FR-170..177 XP | Gamification | 8 |
| FR-180..184 Ambient audio | Timer (preferences), client audio | 6 |
| FR-190..198 AI schedule | AI scheduling | 10 |
| FR-200..212 Study groups | Study groups | 12 |
| FR-220..226 REST API | API integrations | 13 |

## 12. Unresolved decisions

New architecture decisions (U-A) and their default:

| ID | Decision needed | Default stated | Affects |
|---|---|---|---|
| U-A1 | PaaS vendor | Choose against the checklist in DEPLOYMENT-ARCHITECTURE.md section 8 | ADR-009, DEPLOYMENT-ARCHITECTURE.md, NFR-050, NFR-100..104 |
| U-A2 | Transactional email provider | Any provider meeting deliverability and data-processing criteria, behind the notifications port | D21, FR-005, ADR-001 |
| U-A3 | AI provider and SDK (Vercel AI SDK versus direct SDK) | Adapter interface now; provider chosen before Phase 3 build; U-4 consent wording needs legal review | ADR-010, FR-190..198, NFR-036 |
| U-A4 | Better Auth acceptance versus fallback | Accept Better Auth if a spike proves NFR-012 and NFR-013; otherwise Auth.js plus custom lockout | ADR-004, SECURITY-ARCHITECTURE.md section 2 |
| U-A5 | Polling versus SSE for timer convergence | Polling every 3 s while a timer runs; SSE as a Phase 2 upgrade if load or latency demands it | SYSTEM-ARCHITECTURE.md section 15, FR-059, EC-020 |
| U-A6 | PWA approach (Phase 2) | No requirement exists (PRD section 4 mapping note); defer; service worker can be added without architecture change | ADR-001, D2 |
| U-A7 | Error-tracking vendor | Any vendor supporting scrubbing and data-processing terms | D19, ERROR-HANDLING.md section 6 |

Carry-over PRD decisions (status unchanged by this phase; architecture uses the stated defaults):

| ID | Decision | Status | Architecture impact |
|---|---|---|---|
| U-1 | Approve inconsistencies I-1..I-8 | Open, needs approval | Dashboard is composed in the adapter layer (I-1); internal API from the MVP (I-8, ADR-008) |
| U-2 | Level threshold formula | Default used | Configuration module holds the table |
| U-3 | Review limit 50, group cap 20 | Default used | Configuration module |
| U-4 | AI per day 5; consent wording | Default used; legal review pending | AI scheduling quota and consent gate |
| U-5 | Availability 99.5%, RPO 24 h, RTO 8 h | Default used | DEPLOYMENT-ARCHITECTURE.md section 6 |
| U-6 | Minimum age 16+ | Default used | Age gate in sign-up |
| U-7 | Manual entry overlapping a recorded session rejected | Default used | Study sessions validation |
| U-8 | Notes conflict shows both versions | Default used | ADR-007, ERROR-HANDLING.md |
| U-9 | API rate limit 60 per minute per key | Default used | API integrations limiter |

## 13. Document map

| Document | Purpose |
|---|---|
| [SDD.md](SDD.md) | This document |
| [SYSTEM-ARCHITECTURE.md](SYSTEM-ARCHITECTURE.md) | Style, layers, cross-cutting architecture and context, container and component diagrams |
| [TECHNOLOGY-DECISIONS.md](TECHNOLOGY-DECISIONS.md) | Evaluated technology choices with alternatives |
| [MODULE-BOUNDARIES.md](MODULE-BOUNDARIES.md) | 19 modules, dependency rules, events |
| [APPLICATION-FLOWS.md](APPLICATION-FLOWS.md) | 13 flows with diagrams |
| [SECURITY-ARCHITECTURE.md](SECURITY-ARCHITECTURE.md) | Authentication, authorization, privacy, ASVS mapping, threat model |
| [ERROR-HANDLING.md](ERROR-HANDLING.md) | Error taxonomy, envelope, code catalog, EC mapping |
| [BACKGROUND-JOBS.md](BACKGROUND-JOBS.md) | Job catalog and scheduling |
| [DEPLOYMENT-ARCHITECTURE.md](DEPLOYMENT-ARCHITECTURE.md) | Topology, environments, CI/CD, scaling, recovery |
| `../adr/ADR-001` to `ADR-011` | Decision records |

Phase 4 begins only after the product owner approves this architecture.
