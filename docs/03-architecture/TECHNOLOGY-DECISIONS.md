# Lumora Technology Decisions

> Status: Proposal, pending approval. Source of truth: Phase 2 PRD and Phase 1 docs.

Each decision section (`D1`..`D21`) uses the same seven labelled subsections. Candidate technologies named in the Phase 3 brief were evaluated, not assumed; where a candidate was rejected the reason is stated. Three choices were confirmed by the product owner before this phase and are documented with their trade-offs but not re-opened: managed PaaS with managed PostgreSQL (D17), a Next.js full-stack modular monolith in TypeScript (D1, D2, D3), and a PostgreSQL-backed job queue with pg-boss (D14). Schema design, table names and queries belong to Phase 4 and do not appear here.

Capacity context for every choice: 10,000 registered users, 1,000 concurrent users, 5 million stored sessions (NFR-070); a small team; no native apps (PRD section 4, out of scope).

## D1 Programming language

**Decision**: TypeScript in strict mode for every layer: browser, server, worker, tests and tooling scripts.

**Why appropriate**: One language lets validation schemas, domain types and error codes be shared between client forms and server use cases. The numeric limits that appear throughout the PRD (goal 5-1440, plan duration 5-480, Pomodoro focus 1-120) are defined once and enforced on both sides.

**Advantages**: Compile-time checking of module public interfaces (the boundary rules in MODULE-BOUNDARIES.md are checkable); one hiring profile; no serialization mismatch between client and server; large ecosystem for every other decision here.

**Disadvantages**: Types are erased at runtime, so every external input still needs schema validation (D8). Strict mode has an adoption cost on third-party libraries with weak typings. Single-threaded runtime, so CPU-heavy work (exports of 10,000 sessions, NFR-005) must stream or run in the worker.

**Alternatives**: JavaScript with JSDoc (weaker guarantees); Kotlin or Java backend with a TypeScript frontend (two languages, duplicated validation); Python backend (same duplication, weaker front-to-back typing); Go backend (fast, but duplicates validation and slows a small team).

**Long-term implications**: If a hot path ever outgrows the runtime, it can be extracted behind the module's public interface into another language without changing callers (trigger conditions in SYSTEM-ARCHITECTURE.md section 3). TypeScript upgrades are routine and low risk.

**Requirements driven (NFR/FR IDs)**: NFR-060, NFR-061, NFR-062, NFR-094, EC-023, FR-070, FR-057.

## D2 Frontend framework

**Decision**: React 19 through Next.js (App Router), using server components for read-heavy pages and client components for interactive islands (timer, forms, calendar grid).

**Why appropriate**: The product is an authenticated, data-driven web app with one highly interactive surface (the timer, FR-050..059) and several read-heavy pages (dashboard FR-020..024, statistics FR-080..089, calendar FR-060..062). Server rendering of the read pages helps the dashboard LCP target of 2.5 s on mid-tier mobile (NFR-001) by sending data with the first response. The same project hosts the backend (D3), so there is one deployable and one toolchain.

**Advantages**: Route groups map cleanly to roles (public, app, api); server components keep markdown rendering and sanitization on the server (NFR-015); large ecosystem of accessible component libraries (D4); preview deployments per pull request.

**Disadvantages**: App Router caching and server/client boundary rules are a known source of subtle bugs; the framework moves quickly; server components make some data-fetching patterns less obvious to new contributors. Vendor-flavoured features (image optimization, edge runtime) are avoided so the app stays portable across PaaS vendors (U-A1).

**Alternatives**: Remix / React Router framework mode (simpler data model, smaller ecosystem for this stack); SvelteKit (smaller bundles, but a smaller component and testing ecosystem and a less common skill set); single-page React app plus separate API (two deployables, no server rendering, duplicated routing guards); Vue/Nuxt (equally viable, no advantage for this team).

**Long-term implications**: The adapter-thin rule in D3 means business logic is not tied to Next.js; replacing the web framework later costs adapters and UI, not domain code. PWA support (Phase 2, U-A6) works with Next.js through a service worker added later.

**Requirements driven (NFR/FR IDs)**: NFR-001, NFR-004, NFR-015, NFR-080, NFR-081, NFR-085, NFR-086, FR-020, FR-050, FR-139.

## D3 Backend architecture

**Decision**: Modular monolith inside the Next.js project. Server logic lives only in domain modules (19 modules, MODULE-BOUNDARIES.md). Route handlers and server actions are thin adapters: parse input, call one application service, map the result or error.

**Why appropriate**: One team, one product, one database, one deploy. The load target (NFR-070) is far below what a single well-indexed relational database and two or three stateless web instances serve. Business rules BR-001..BR-032 are tightly interrelated (a session edit touches goals, statistics, XP), so in-process calls with one transaction are simpler and safer than distributed calls.

**Advantages**: Atomic transactions across modules where required (session save with XP ledger entry, EC-017); no network failure modes between modules; simple local development and testing; enforceable boundaries without deployment complexity.

**Disadvantages**: Boundaries are social until tooling enforces them, so a rule check is mandatory (recorded as a Phase 7 requirement in MODULE-BOUNDARIES.md section 8). One deploy unit means one module's memory leak affects all. Next.js route handler limits (timeouts, body size) constrain long operations, which is why those run in the worker (D14).

**Alternatives**: Microservices (rejected: operational cost and distributed consistency with no scale or team-size justification); serverless functions per route (cold starts hurt the 200 ms timer acknowledgement, NFR-004, and connection management to Postgres is awkward); separate NestJS or Express API (clearer separation, but a second deployable and duplicated typing).

**Long-term implications**: Extraction triggers are named in SYSTEM-ARCHITECTURE.md section 3. Analytics, AI scheduling and the public API are the likeliest first extractions because they have distinct load or isolation profiles.

**Requirements driven (NFR/FR IDs)**: NFR-002, NFR-016, NFR-053, NFR-060, NFR-061, NFR-070, NFR-071, EC-017, EC-021.

## D4 Styling and UI component system

**Decision**: Tailwind CSS with shadcn/ui components (copied into the repository, built on Radix primitives).

**Why appropriate**: Accessibility is a hard requirement: WCAG 2.2 AA, full keyboard operation, visible focus (NFR-040, NFR-041), reduced-motion and color-scheme support (NFR-045), 44 px touch targets (NFR-087) and 360-2560 px layouts (NFR-085, NFR-086). Radix primitives implement focus management and ARIA patterns for dialogs, menus, selects and tabs. Tailwind makes responsive breakpoints and dark mode (FR-138) direct to express.

**Advantages**: Components are owned source, so accessibility fixes and design-system changes (Planning phase 5) need no upstream release; small runtime; theme tokens support light, dark and system themes.

**Disadvantages**: Owning the component source means owning its updates; utility-class markup is verbose and needs consistent conventions; Radix does not cover everything (the heatmap and timer face are custom and need their own accessibility work, NFR-043, NFR-044).

**Alternatives**: MUI (rich, heavier bundle, harder to restyle); Mantine (good defaults, runtime CSS-in-JS cost with server components); Chakra (similar trade-off); hand-written CSS modules (maximum control, highest accessibility cost).

**Long-term implications**: The design system defined in Planning phase 5 can map directly to Tailwind theme tokens. Because components are copied in, a future migration of the styling layer is local to a UI directory.

**Requirements driven (NFR/FR IDs)**: NFR-040, NFR-041, NFR-043, NFR-045, NFR-085, NFR-086, NFR-087, NFR-088, FR-138, FR-139.

## D5 Database

**Decision**: PostgreSQL (current major version supported by the chosen PaaS), managed service.

**Why appropriate**: Study data is relational and ownership-scoped; integrity rules require foreign-key enforcement (NFR-092, NFR-093). Range and overlap detection for manual entries and plan entries (EC-003, EC-011) are natural with range types and exclusion-style checks. Time-zone-aware UTC timestamps are first-class (NFR-091). The same database hosts the job queue (D14), removing a separate broker. Detailed modelling is Phase 4.

**Advantages**: Transactional DDL and strong constraints; mature backup and point-in-time recovery on managed offerings (NFR-100..104); efficient indexed access by user and date for the 5-million-session target (NFR-070, NFR-071); JSON columns available if a bounded flexible field is ever needed; partitioning and materialized aggregates available as the growth path (NFR-071, NFR-072).

**Disadvantages**: Vertical scaling first; connection counts need pooling with multiple web instances and a worker; a database outage stops both the app and the job queue (coupled failure domain, accepted at MVP and noted in the trade-off register).

**Alternatives**: MySQL (viable, weaker range and constraint features); SQLite (no managed multi-instance story, no concurrent writers for 1,000 users); MongoDB (relational ownership and integrity rules would move into application code, risking NFR-092).

**Long-term implications**: Read replicas and pre-computed aggregates can be added without redesign (NFR-071). Switching vendors between managed Postgres providers is a dump-and-restore, which makes U-A1 low-regret. ADR-002 records the decision.

**Requirements driven (NFR/FR IDs)**: NFR-003, NFR-031, NFR-070, NFR-071, NFR-072, NFR-091, NFR-092, NFR-093, NFR-094, NFR-095, NFR-096, NFR-100, NFR-101, NFR-102, EC-003, EC-011.

## D6 ORM and query layer

**Decision**: Drizzle ORM with a PostgreSQL driver; repositories are the only code that imports it. Only the choice is recorded here; no schema.

**Why appropriate**: Drizzle keeps queries close to SQL, which matters for range queries, grouped statistics over 24 months (NFR-003) and explicit transaction control owned by application services. Types are inferred from the schema definition, supporting the type-safety goal.

**Advantages**: Lightweight, no code-generation step at runtime, no heavy query engine; easy to drop to raw SQL for statistics; fits the repository-port pattern (SYSTEM-ARCHITECTURE.md section 5).

**Disadvantages**: Younger than Prisma, smaller community and fewer tutorials; migrations tooling is less polished (migration ownership is decided in Phase 4); API has had breaking changes between minor versions, so versions must be pinned.

**Alternatives**: Prisma (best developer ergonomics and migrations, heavier engine and weaker control over complex queries); Kysely (query builder only, excellent types, no schema/migration layer); raw SQL with a thin typed client (maximum control, most boilerplate).

**Long-term implications**: Because repositories hide the ORM behind ports, a switch to Kysely or Prisma touches only the repository adapters. Choice is revisited in Phase 4 only if modelling needs reveal a gap.

**Requirements driven (NFR/FR IDs)**: NFR-002, NFR-003, NFR-016, NFR-053, NFR-092, NFR-094, NFR-096.

## D7 Authentication

**Decision**: Better Auth running inside the application: email and password, Google OAuth, database-backed revocable sessions, with application-owned lockout, audit and age-gate logic wired through its hooks. Fallback if review fails: Auth.js plus custom lockout (ADR-004, U-A4).

**Why appropriate**: Requirements are email/password and Google (FR-001..005), password of at least 10 characters with salted adaptive hashing (NFR-011), lockout after 5 failures for 15 minutes (NFR-012), 30-day inactivity expiry and revocation within 60 s (NFR-013), and audit events retained 90 days (NFR-020). Database-backed sessions make revocation immediate, unlike stateless tokens. Keeping identity inside the application avoids a third-party processor for credentials (NFR-030).

**Advantages**: No per-user vendor fee; sessions and accounts live in our database so deletion and purge (NFR-031) are in our control; TypeScript-native; supports adding an API-key mechanism and social providers later.

**Disadvantages**: Young library with a smaller security-review history than Auth.js or managed IdPs. Lockout and the audit trail are not guaranteed by the library and must be proven with tests against NFR-012 and NFR-013 before approval is final. We own patching. Password reset email depends on the notifications port (D21).

**Alternatives**: Auth.js (mature, session strategies and credentials provider are limited, lockout is custom); self-built on Lucia-style primitives (full control, highest security risk and effort); managed IdP such as Clerk or Auth0 (fastest, strongest assurances, but ongoing cost per active user, data sharing with a processor, and deletion/purge dependent on the vendor, NFR-031).

**Long-term implications**: Authentication is a module boundary (MODULE-BOUNDARIES.md); the rest of the system consumes only "current user identity". Swapping the engine is contained there. Risk register entry: library maturity; mitigation is the fallback decision and a Phase 7 spike that proves lockout and revocation.

**Requirements driven (NFR/FR IDs)**: NFR-011, NFR-012, NFR-013, NFR-014, NFR-020, NFR-031, NFR-035, FR-001, FR-002, FR-003, FR-004, FR-005, FR-008, FR-007.

## D8 Form and input validation

**Decision**: Zod schemas, one per input contract, shared by client forms and server adapters. Schemas are the only place where numeric ranges are defined, and those ranges come from the configuration module (NFR-062).

**Why appropriate**: Every feature has precise validation in the PRD (goal 5-1440, EC-023; plan duration 5-480, FR-030; to-do title at most 200 characters, FR-090; topic weight 1-5, FR-015; Pomodoro settings, FR-057). A single schema avoids client/server drift and lets error details use one shape (ERROR-HANDLING.md).

**Advantages**: Inferred types; composable; also source for OpenAPI generation (D16) and for validating AI output (EC-015).

**Disadvantages**: Bundle size on the client; business rules that need the database (overlap checks, ownership) cannot live in a schema and stay in application services; schema library major versions change error shapes.

**Alternatives**: Valibot (smaller, newer ecosystem); Yup (weaker typing); Joi (server-oriented); hand-written validators (drift risk).

**Long-term implications**: The same schemas back the Phase 3 public API contract. Changing validation libraries later is a mechanical but wide change, so schema construction is wrapped in a small shared helper layer.

**Requirements driven (NFR/FR IDs)**: NFR-062, FR-001, FR-015, FR-030, FR-057, FR-070, FR-090, FR-194, EC-015, EC-023.

## D9 State management

**Decision**: Server state through TanStack Query (cache, refetch on focus, polling); local UI state through React state; Zustand only for the timer client store. No Redux.

**Why appropriate**: Almost all state is server-owned. The timer needs a client store that survives navigation, holds the server start timestamps, and ticks the display from them without becoming the source of truth (BR-012, NFR-090, EC-010). TanStack Query supplies the 3 s polling while a timer runs and the refetch-on-focus used for convergence within 5 s (EC-020, FR-059).

**Advantages**: Small API surface; consistent loading and error states; invalidation after mutations; versions of records returned by the server flow into optimistic-concurrency checks (NFR-094).

**Disadvantages**: Two cache layers (framework cache and query cache) must be reasoned about; Zustand store must be kept minimal or it becomes a shadow database.

**Alternatives**: Redux Toolkit (more ceremony than needed); SWR (similar, fewer mutation features); React context only (re-render cost on timer ticks); server actions only (no client cache for polling).

**Long-term implications**: If Server-Sent Events replace polling (U-A5), only the timer data source changes; components keep consuming the same store.

**Requirements driven (NFR/FR IDs)**: NFR-004, NFR-051, NFR-052, NFR-090, NFR-094, FR-054, FR-059, EC-001, EC-020, EC-028.

## D10 Rich text editor (notes)

**Decision**: No rich text editor in the MVP. Notes are markdown (FR-100, FR-101): a plain textarea with a live preview rendered through remark and rehype with rehype-sanitize. TipTap is rejected for the MVP and recorded as a Phase 2+ option.

**Why appropriate**: The requirement stores notes as markdown and requires sanitized rendering with zero failures against an XSS corpus (NFR-015). A textarea with a server-sanitized preview keeps the attack surface small, keeps the stored format identical to the editing format, and supports autosave with local retention on failure (FR-102, NFR-054) and a two-version conflict view (FR-103, EC-020) using a text diff.

**Advantages**: Tiny bundle; no HTML-to-markdown round trip loss; one sanitization point; easy keyboard and screen-reader behavior (NFR-041).

**Disadvantages**: Less friendly to users who do not know markdown; no toolbar, tables or live WYSIWYG; preview is a separate pane on small screens.

**Alternatives**: TipTap (rejected for MVP: large bundle, native model is a document tree not markdown so a serialization layer is needed and introduces lossy conversions, bigger sanitization surface); Lexical or Slate (same trade-offs, less turnkey); CodeMirror markdown editor (lighter than TipTap, still heavier than needed).

**Long-term implications**: If users ask for rich editing, TipTap with a markdown serializer can be added behind the notes module without changing stored data, because storage stays markdown. This affects ADR-007 and FR-100..103 only.

**Requirements driven (NFR/FR IDs)**: NFR-014, NFR-015, NFR-054, FR-100, FR-101, FR-102, FR-103, EC-020.

## D11 Calendar and drag-and-drop

**Decision**: MVP heatmap and day detail are custom, built with CSS grid and date-fns. Phase 2 drag-and-drop planning uses dnd-kit with keyboard sensors on a 15-minute grid. FullCalendar is rejected.

**Why appropriate**: The MVP calendar is read-only: four minute buckets (0, 1-59, 60-119, 120 or more) shown with numbers (FR-060, NFR-043), a day detail (FR-061) and a planned-entries list (FR-062). That does not need a scheduling widget. Phase 2 requires create, move and resize on a 15-minute grid with a keyboard alternative (FR-065..069, NFR-042); dnd-kit has first-class keyboard and screen-reader support.

**Advantages**: Zero licensing cost; small bundle; full control over accessible markup; same overlap warning rules (BR-026, BR-027) reused from the Study plans module.

**Disadvantages**: We build and maintain week and day grid layout, resize handles and collision logic ourselves; more upfront Phase 2 work than adopting a calendar widget.

**Alternatives**: FullCalendar (rich, but large bundle, premium features need a commercial licence, and its accessibility for drag operations is limited); react-big-calendar (cheaper, weaker accessibility); Schedule-X (newer, smaller).

**Long-term implications**: Calendar stays a read-only consumer module (MODULE-BOUNDARIES.md); drag operations call the Study plans use cases, so there is one place for overlap rules. dnd-kit versions are pinned.

**Requirements driven (NFR/FR IDs)**: NFR-041, NFR-042, NFR-043, NFR-085, FR-060, FR-061, FR-062, FR-065, FR-066, FR-067, FR-068, FR-069, EC-003.

## D12 Dates and time zones

**Decision**: date-fns with date-fns-tz (or the Temporal API through a polyfill once assessed) for formatting and calendar arithmetic. Storage and comparison are always UTC instants; the IANA zone and the local date are frozen on each session at its start (ADR-006).

**Why appropriate**: Local-day boundaries, day-rollover hours (FR-009), DST days of 23 or 25 hours and zone changes (EC-006) are the highest data-correctness risk. A single date library behind a small time module keeps this logic in one place.

**Advantages**: Tree-shakeable functions; no mutable date objects; well known.

**Disadvantages**: date-fns-tz adds a timezone database dependency to the bundle or runtime; native Temporal is not yet universal; arithmetic across DST still needs deliberate tests.

**Alternatives**: Luxon (excellent zone support, larger, class-based); Day.js (small, plugin-based timezones are less reliable); Temporal polyfill (future-proof, larger and less mature today); native Intl only (insufficient arithmetic).

**Long-term implications**: Because only the time module imports the library, moving to Temporal is internal to it. Every business rule that mentions "local day" calls the time module.

**Requirements driven (NFR/FR IDs)**: NFR-090, NFR-091, FR-006, FR-009, FR-047, FR-072, FR-089, FR-164, EC-006, EC-009.

## D13 Charts and AI integration

This section covers two independent technology areas, charts and AI integration, because both are consumed by the statistics and scheduling modules only.

**Decision**: Charts: Recharts for statistics, always accompanied by a numeric table or text values. AI (Phase 3): a provider-agnostic adapter module behind an interface, using either the Vercel AI SDK or a direct provider SDK; structured output is validated with Zod; the specific provider is chosen later (U-A3, ADR-010).

**Why appropriate**: Statistics need bar and line charts for day, week, month and subject totals and planned-versus-actual (FR-080..085); color must never be the only indicator (NFR-043). For AI, schedule entries are untrusted output that must be validated against many rules (EC-015) and consent must precede any outbound call (NFR-036, FR-192), which is simplest to guarantee at one adapter boundary.

**Advantages**: Recharts is declarative and React-native, with accessible-friendly SVG output and data tables easy to pair; the AI adapter keeps provider lock-in at one file set, supports timeouts of 30 s (EC-016, FR-197) and a contract test with a fake provider.

**Disadvantages**: Recharts adds bundle weight and its built-in accessibility is limited, so table pairing is mandatory; AI SDK abstractions can lag provider-specific features; model output quality and cost are product risks outside architecture.

**Alternatives**: Charts: Chart.js (canvas, harder to make accessible), visx (lower level, more effort), Nivo, plain SVG for a few simple charts. AI: LangChain (heavier than needed), direct HTTP calls (more code), a hosted workflow platform (data sharing and cost).

**Long-term implications**: Chart components load lazily on the statistics page to protect NFR-001. The adapter interface lets the product switch provider, add an evaluation harness, or move generation to the worker without touching AI scheduling rules. Unresolved: provider and SDK (U-A3).

**Requirements driven (NFR/FR IDs)**: NFR-001, NFR-036, NFR-043, FR-080, FR-081, FR-082, FR-083, FR-085, FR-190, FR-191, FR-192, FR-194, FR-196, FR-197, EC-015, EC-016.

## D14 Background jobs

**Decision**: pg-boss on the same PostgreSQL database, executed by a separate worker process built from the same repository (BACKGROUND-JOBS.md, ADR-005).

**Why appropriate**: Required scheduled work is modest: idle-session auto-close every minute (BR-006, FR-046), purge of deleted accounts at 30 days (NFR-031), exam archiving (EC-013), export generation and expiry (FR-130..132), retention cleanup (NFR-020), and Phase 2-3 reminders, streak evaluation, AI generation and weekly leaderboards. A Postgres-backed queue gives transactional enqueueing next to business writes, so a job is never enqueued without its data, and removes a separate broker.

**Advantages**: No Redis or message broker to host, secure or back up; jobs are covered by the existing backup and restore drill (NFR-103); at-least-once delivery with retries and dead-letter handling; cron scheduling and singleton keys.

**Disadvantages**: Queue load shares the database with application traffic; polling overhead at high volume; fewer ecosystem tools than BullMQ. The worker is a second service to deploy and monitor. A database outage halts both app and jobs.

**Alternatives**: BullMQ with Redis (higher throughput, extra infrastructure); managed cron plus HTTP endpoints (no retries or backpressure, endpoints must be secured); serverless schedulers (vendor lock-in); in-process timers (lost on restart, duplicated with multiple instances, rejected).

**Long-term implications**: If job volume grows past database comfort, the queue interface can move to Redis-backed workers without changing job handlers, since handlers receive an idempotency key and payload only.

**Requirements driven (NFR/FR IDs)**: NFR-031, NFR-051, NFR-020, NFR-104, FR-046, FR-130, FR-132, FR-150, FR-151, FR-190, EC-001, EC-013.

## D15 Audio playback

**Decision**: Native `HTMLAudioElement` (with Web Audio only if gain control proves insufficient), looping self-hosted CC0 audio files served as CDN-cached static assets. No library.

**Why appropriate**: Phase 2 needs three built-in loops, volume 0-100, play only while a session runs and mute on pause (FR-180..184). Autoplay blocking is expected and must degrade to an in-app indicator (EC-024). Self-hosting removes third-party requests (NFR-033) and licensing risk (R12).

**Advantages**: No dependency; no bundle impact; no external tracking; assets cache well.

**Disadvantages**: Seamless looping of compressed formats needs gapless-friendly files; mobile Safari restrictions on audio start need a user gesture; asset licensing evidence must be kept.

**Alternatives**: Howler.js (convenient, extra weight for few features); Tone.js (far more than needed); streaming third-party ambient services (tracking and availability risk).

**Long-term implications**: Adding more loops is a static asset change. User-uploaded audio is out of scope.

**Requirements driven (NFR/FR IDs)**: NFR-033, NFR-044, FR-180, FR-181, FR-182, FR-183, FR-184, EC-024.

## D16 API documentation

**Decision**: OpenAPI 3.1 generated from Zod schemas (zod-to-openapi style generation) for the Phase 3 public `/v1` API only. The internal API used by the web client is not documented externally (NFR-060).

**Why appropriate**: The public contract needs a machine-readable description including the standard error format (FR-225), pagination (FR-224), key scopes (FR-221) and rate limit headers (FR-222, EC-026). Generating from the same Zod schemas used for validation prevents contract drift.

**Advantages**: One source of truth; documentation and client generation come free; contract tests can run against the document.

**Disadvantages**: Generated specs can be noisy and need curation; Zod features without OpenAPI equivalents need care; two audiences (internal, public) require a clear exclusion rule in ADR-008.

**Alternatives**: Hand-written OpenAPI (drift risk); tRPC (typed internally, not a public REST contract); GraphQL (not required, adds a layer); Swagger annotations in code (verbose).

**Long-term implications**: Versioning follows `/v1` (FR-223); breaking changes require `/v2`. The generated spec becomes input to Planning phase 6.

**Requirements driven (NFR/FR IDs)**: NFR-021, NFR-060, FR-220, FR-221, FR-222, FR-223, FR-224, FR-225, FR-226, EC-026.

## D17 Deployment platform

**Decision**: Managed PaaS hosting a web service, a worker service and managed PostgreSQL, plus an object store only if later needed and a CDN for static assets. The concrete vendor is an unresolved decision (U-A1) with a criteria checklist in DEPLOYMENT-ARCHITECTURE.md.

**Why appropriate**: The team is small and the load target is moderate (NFR-070). A managed platform delivers TLS (NFR-010), backups with 30-day retention (NFR-100), preview environments and horizontal scaling without operating servers. Containerised services keep the option to move vendors.

**Advantages**: Low operational burden; quick restore capability (NFR-101..103); scaling by instance count (NFR-071); predictable monthly cost.

**Disadvantages**: Vendor-specific limits (request timeouts, connection limits, region options); less control over networking; costs scale with instances. Availability depends on the vendor SLA, which may not meet 99.5% unless chosen carefully (NFR-050, U-5).

**Alternatives**: Serverless-first platform (cold starts and connection limits); self-managed VMs or Kubernetes (control, but operational cost unjustified at this size); bare-metal VPS (cheapest, highest ops risk).

**Long-term implications**: Keeping the app container-portable, avoiding proprietary runtime features and keeping the database standard Postgres makes vendor change a bounded project. ADR-009.

**Requirements driven (NFR/FR IDs)**: NFR-010, NFR-050, NFR-070, NFR-071, NFR-100, NFR-101, NFR-102, NFR-103, NFR-104.

## D18 Testing

**Decision**: Vitest for unit and integration tests; Testing Library for components; Playwright for end-to-end tests mapped one-to-one to AC-E2E-01..AC-E2E-10; axe checks in end-to-end runs for accessibility; contract tests for authorization (every resource, cross-user returns not-found, NFR-016); PostgreSQL via container in CI for integration tests.

**Why appropriate**: NFR-061 requires an automated test for every business rule BR-001..BR-032. Many risks are time- and concurrency-related (EC-001, EC-002, EC-006, EC-020, EC-021) and need controllable clocks and a real database. Playwright can test two browser contexts for multi-tab convergence (AC-E2E-04).

**Advantages**: Fast, TypeScript-native tools; shared config; realistic integration tests against real Postgres rather than mocks; cross-browser coverage for NFR-080 and NFR-081.

**Disadvantages**: End-to-end suites are slower and need stable test data; time-travel for the 30-day session expiry and the 30-minute idle rule requires an injectable clock built into the architecture (time module).

**Alternatives**: Jest (similar, slower with ESM and TypeScript); Cypress (weaker multi-tab and cross-browser); Selenium (heavier).

**Long-term implications**: The injectable clock and fake AI provider become permanent test seams. The authorization contract tests double as regression protection for every new module.

**Requirements driven (NFR/FR IDs)**: NFR-016, NFR-040, NFR-053, NFR-061, NFR-080, NFR-081, NFR-090, NFR-091, NFR-094, NFR-096.

## D19 Observability

**Decision**: Structured JSON logging with pino and a request ID on every request; an error-tracking service (vendor unresolved, U-A7) with scrubbing; uptime monitoring; basic metrics added later.

**Why appropriate**: NFR-063 requires a request ID and outcome in every log line and forbids passwords, tokens and note content. Uptime evidence is needed for NFR-050.

**Advantages**: Machine-parseable logs; correlation across web and worker; low overhead.

**Disadvantages**: Log scrubbing needs discipline and tests; error-tracking vendors receive stack traces, which requires scrubbing to respect NFR-034 and NFR-030; metrics are deferred, so early performance diagnosis relies on logs and load tests.

**Alternatives**: Plain console logging (unstructured); a full APM suite (cost and data sharing); self-hosted ELK/Grafana (operational burden).

**Long-term implications**: OpenTelemetry-compatible fields can be added when metrics are introduced, with no change to call sites.

**Requirements driven (NFR/FR IDs)**: NFR-034, NFR-050, NFR-063, NFR-002, NFR-003.

## D20 Rate limiting

**Decision**: A rate limiter behind an internal port. MVP: PostgreSQL-backed counters (or in-memory per instance for coarse protection) for sign-in, password reset and export endpoints; Phase 3: 60 requests per minute per API key (FR-222, U-9).

**Why appropriate**: Brute-force protection is account-based (NFR-012). Public API limits must be consistent across instances, so state must be shared; PostgreSQL is already available.

**Advantages**: No new infrastructure; per-key accuracy; port allows swapping implementation.

**Disadvantages**: Database writes on every limited request add load; in-memory limiting is per instance and weaker; no shared edge protection against volumetric attacks unless the PaaS provides it.

**Alternatives**: Redis-based limiter (faster, extra service); edge/CDN rate limiting (excellent for volumetric traffic, not per-key semantics); API gateway (extra component).

**Long-term implications**: If the public API sees real traffic, move counters to Redis or the gateway behind the same port.

**Requirements driven (NFR/FR IDs)**: NFR-012, NFR-021, FR-222, FR-225, EC-026.

## D21 Transactional email

**Decision**: A notifications port with an adapter for a transactional email provider (vendor unresolved, U-A2) used first for password reset (FR-005); later for reminders and group invitations.

**Why appropriate**: Password reset is an MVP Must Have and requires reliable email. Putting it behind a port keeps delivery logic testable with a fake and the vendor replaceable.

**Advantages**: Deliverability handled by specialists; templates versioned in the repository; no email content in logs (NFR-063).

**Disadvantages**: Another processor of personal data (email addresses) that must be listed in privacy documentation; vendor outage blocks resets; sending domain setup (SPF, DKIM) is an operational task.

**Alternatives**: Self-hosted SMTP (poor deliverability, high ops); the PaaS's built-in email (limited availability); sending through the identity provider (couples auth to the vendor).

**Long-term implications**: Reminders (Phase 2) reuse the same port. Retries and idempotency are enforced by queued email jobs (BACKGROUND-JOBS.md).

**Requirements driven (NFR/FR IDs)**: NFR-011, NFR-030, NFR-063, FR-005, FR-150, FR-151, FR-201.

## Summary

| Area | Choice | Replaces candidate? | ADR |
|---|---|---|---|
| Language | TypeScript strict | No (accepts candidate) | ADR-001 |
| Frontend framework | React with Next.js App Router | No | ADR-001 |
| Backend architecture | Modular monolith in Next.js | Not a candidate; user-confirmed | ADR-003 |
| Styling/UI | Tailwind CSS + shadcn/ui | No | ADR-001 |
| Database | PostgreSQL, managed | No | ADR-002 |
| ORM | Drizzle | No | ADR-001 |
| Authentication | Better Auth (fallback Auth.js + custom lockout) | No, with recorded fallback | ADR-004 |
| Form validation | Zod | No | ADR-001 |
| State management | TanStack Query + React state + Zustand (timer only) | Not a candidate | ADR-001 |
| Rich text editor | Markdown textarea + sanitized preview | Yes: replaces TipTap | ADR-007 |
| Calendar | Custom heatmap (MVP), dnd-kit (Phase 2) | Partly: dnd-kit accepted, FullCalendar not adopted | ADR-001 |
| Dates/time zones | date-fns + date-fns-tz | No | ADR-006 |
| Charts | Recharts with numeric tables | No | ADR-001 |
| AI integration | Provider-agnostic adapter, provider TBD | Not a candidate | ADR-010 |
| Background jobs | pg-boss, separate worker | Not a candidate; user-confirmed | ADR-005 |
| Audio | Native audio element, self-hosted CC0 loops | Not a candidate | ADR-001 |
| API documentation | OpenAPI 3.1 generated from Zod, public API only | No | ADR-008 |
| Testing | Vitest, Playwright, Testing Library, axe | No | ADR-001 |
| Deployment | Managed PaaS, vendor TBD (U-A1) | Not a candidate; user-confirmed | ADR-009 |
| Observability | pino JSON logs, error tracking (U-A7) | Not a candidate | ADR-001 |
| Rate limiting / email | Postgres-backed limiter; email behind a port (U-A2) | Not a candidate | ADR-008 |
