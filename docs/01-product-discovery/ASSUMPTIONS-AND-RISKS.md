# Assumptions and Risks

> Status: Proposal, pending approval.

## Assumptions
1. Web only, responsive; no native apps.
2. Single-user MVP; no social features.
3. English only.
4. Free product; no payments.
5. Auth: email+password and Google sign-in.
6. Each user has a timezone; the server stores UTC.
7. Users are 16+ in MVP (avoids minors' consent requirements; to confirm legally).
8. Users enter subjects/topics themselves; no curriculum import.
9. Internet connection required (no offline-first).
10. Daily goal in minutes is a sufficient goal model for MVP.

## Ambiguities / conflicting requirements found in the brief
- "Notes and Revision Tools" bundles two very different features → split (notes MVP, revision Phase 2).
- "Focus Timer and Ambient Audio" overlaps "Pomodoro Timer and Stopwatch" → timer is MVP, audio only is Phase 2.
- "Calendar" vs "Drag-and-Drop Calendar" vs "Study Plan": read-only calendar in MVP, plan entries via form.
- To-Do vs plan entries: to-dos are tasks, plan entries are time blocks.
- XP and leaderboards conflict with manual entry → manual entries are excluded from both.
- Brief doc paths lost their slashes; interpreted as `docs/01-product-discovery/…`.

## Risks
| ID | Category | Risk | L | I | Mitigation |
|---|---|---|---|---|---|
| R1 | Technical | Timer drift in background tabs | H | H | Store start timestamps; compute elapsed from timestamps; heartbeat |
| R2 | Technical | Concurrent timers across devices | M | M | One active timer per user (BR-011); server-authoritative state |
| R3 | Technical | Timezone/DST day-boundary errors in goals, streaks, stats | H | H | UTC storage, per-user timezone, tests for DST and midnight splits |
| R4 | Scalability | Session rows grow quickly | M | M | Index by user/date; aggregate (daily rollup) tables later; paginate |
| R5 | Scalability | Statistics queries slow on large history | M | M | Precomputed aggregates, caching |
| R6 | Technical | Markdown notes XSS | M | H | Sanitize on render |
| R7 | Technical | Calendar drag-and-drop on touch/keyboard | H | M | Phase 2; provide form fallback and keyboard path |
| R8 | Product | Feature bloat delays MVP | H | H | Strict MVP cut; phase gates |
| R9 | Product | Low retention after novelty | H | H | Onboarding, goals, reminders (Ph2); measure D7 |
| R10 | Product | Gamification burnout / streak guilt | M | M | Streak freeze; goal-based not session-count; opt-out |
| R11 | Product | Leaderboard cheating via fake sessions | H | M | Exclude manual entries; minimum session length; XP cap; delay leaderboards to Phase 3 |
| R12 | Product | Ambient audio licensing | M | M | Use CC0 or purchased licensed audio only |
| R13 | Technical | AI schedule cost/quality/privacy | H | M | Start rule-based; require ≥ 4 weeks data; explicit consent; cost caps |
| R14 | UX | Setup friction in onboarding | H | H | Skippable steps, defaults, templates |
| R15 | UX | Readiness score read as exam prediction | M | M | Label as "topic coverage" |
| R16 | UX | Users forgetting to stop timers | H | M | Idle auto-close (BR-006), reminders, edit session |
| R17 | Security | Public API abuse | M | H | Defer to Phase 3; API keys, scopes, rate limits |
| R18 | Legal | Minors' data | M | H | 16+ in MVP; privacy policy review |
| R19 | Product | Notes feature competes with Notion etc. | M | M | Keep notes basic; later Notion integration |

(L = likelihood, I = impact: H/M/L.)

## Features that may be unnecessarily complex
1. **AI-Generated Study Schedule** — high cost, unclear value without data.
2. **Study Groups and Leaderboards** — moderation, privacy, cheating.
3. **XP economy** — tuning burden; low value before streaks prove useful.
4. **Public REST API** — versioning and security commitment before the model is stable.
5. **Drag-and-Drop Study Calendar** — high UI cost; simpler form-based planning serves early users.
