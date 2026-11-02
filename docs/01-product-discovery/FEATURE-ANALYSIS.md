# Feature Analysis

> Status: Proposal. Complexity: S (days) / M (1–2 wks) / L (2–4 wks) / XL (>1 month or ongoing). Estimates are relative, not commitments.

## Summary table
| # | Feature | Complexity | Phase |
|---|---|---|---|
| A1 | Authentication & Profile (added) | M | MVP |
| A2 | Subjects & Topics Management (added) | S | MVP |
| 2 | Study Hours Tracking by Subject | M | MVP |
| 4 | Pomodoro Timer and Stopwatch | M | MVP |
| 3 | Daily Study Goals | S | MVP |
| 14 | To-Do List and Priority Management | S | MVP |
| 1 | Study Activity Calendar | M | MVP (read-only) |
| 5 | Daily and Monthly Statistics | M | MVP |
| 6 | Notes and Revision Tools | M / L | Split: basic notes MVP; revision tools Phase 2 |
| 11 | Exam Preparation Management | M | MVP basic; Phase 2 readiness score |
| A3 | Data Export (added) | S | MVP |
| A4 | Onboarding (added) | S | MVP |
| A5 | Dark mode / Responsive / PWA (added) | S / M | Responsive+dark MVP; PWA Phase 2 |
| 7 | Drag-and-Drop Study Calendar | L | Phase 2 |
| 10 | Habit Streak and XP Gamification | M (streak) + M (XP) | Phase 2 |
| 9 | Focus Timer and Ambient Audio | S–M | Phase 2 |
| A6 | Reminders / Notifications (added) | M | Phase 2 |
| A7 | Spaced-repetition Flashcards (added; part of 6) | L | Phase 2 |
| 8 | AI-Generated Study Schedule | XL | Phase 3 |
| 12 | Study Groups and Leaderboards | XL | Phase 3 |
| 13 | REST API for External Integrations | L | Phase 3 (public); internal API from MVP |

## Brief features

### 1. Study Activity Calendar
- **Purpose:** show when the user studied and what is planned.
- **Functionality:** month heatmap of study minutes; day detail; list of planned sessions.
- **Dependencies:** Sessions (feature 2/4), plan entries.
- **Complexity:** M. **Risks:** timezone day boundaries; large month queries (index by user/date).
- **Phase:** MVP as read-only heatmap + planned list. Editing is feature 7.

### 2. Study Hours Tracking by Subject
- **Purpose:** the core data: how long per subject/topic.
- **Functionality:** sessions linked to subject (and optional topic/plan entry); manual entry flagged `manual`; edit/delete.
- **Dependencies:** Auth, Subjects & Topics.
- **Complexity:** M. **Risks:** data integrity of durations, midnight splits, concurrent timers, row growth.
- **Phase:** MVP.

### 3. Daily Study Goals
- **Purpose:** daily target and progress feedback.
- **Functionality:** minutes target (default 120), optional per-subject targets, progress bar, goal-met state.
- **Dependencies:** Sessions, user timezone.
- **Complexity:** S. **Risks:** day-boundary bugs; goal changes mid-day (rule: new target applies from today).
- **Phase:** MVP.

### 4. Pomodoro Timer and Stopwatch
- **Purpose:** produce accurate session records with low friction.
- **Functionality:** Pomodoro 25/5 (configurable), long break after 4 cycles, stopwatch, pause/resume, interval-end notification.
- **Dependencies:** Subjects, Sessions.
- **Complexity:** M. **Risks:** background-tab throttling (use stored timestamps, not tick counts), multi-device concurrent timers, refresh/crash recovery, notification permissions.
- **Phase:** MVP.

### 5. Daily and Monthly Statistics
- **Purpose:** feedback and insight on effort.
- **Functionality:** totals by day/week/month and subject, goal hit rate, planned vs actual.
- **Dependencies:** Sessions, Goals, plan entries.
- **Complexity:** M. **Risks:** query cost as data grows (aggregate tables later), misleading charts at low data volume.
- **Phase:** MVP.

### 6. Notes and Revision Tools
- **Purpose:** keep material and support recall.
- **Functionality:** MVP: markdown notes per subject/topic. Phase 2: flashcards with spaced repetition, revision reminders.
- **Dependencies:** Subjects & Topics; flashcards also need reminders.
- **Complexity:** M (notes), L (revision). **Risks:** scope creep into a notes product; markdown sanitization (XSS); algorithm choice and review scheduling.
- **Phase:** split as above.

### 7. Drag-and-Drop Study Calendar
- **Purpose:** fast planning by direct manipulation.
- **Functionality:** create/move/resize plan entries, conflict warnings (BR-026..BR-028).
- **Dependencies:** Calendar (1), plan entries, conflict rules.
- **Complexity:** L. **Risks:** touch/mobile DnD, accessibility (keyboard alternative required), timezone/DST handling.
- **Phase:** 2. MVP uses form-based plan entry.

### 8. AI-Generated Study Schedule
- **Purpose:** auto-draft a plan from exam dates, topics, and past pace.
- **Functionality:** propose plan entries; user accepts/edits.
- **Dependencies:** Exams, topics, ≥ 4 weeks of real session data, plan entries, conflict rules.
- **Complexity:** XL. **Risks:** LLM cost and latency, poor/unexplainable output, privacy of study data sent to a provider, cold-start for new users. **Flag: likely over-complex**; a rule-based "distribute remaining topics evenly until exam" is a cheaper first step.
- **Phase:** 3.

### 9. Focus Timer and Ambient Audio
- **Purpose:** support concentration.
- **Functionality:** ambient sound loops (rain, noise) during sessions; volume; mute.
- **Dependencies:** Timer.
- **Complexity:** S–M. **Risks:** audio licensing (use CC0/licensed assets only), autoplay restrictions, bandwidth/caching.
- **Phase:** 2. Note: "focus timer" itself is covered by feature 4.

### 10. Habit Streak and XP Gamification
- **Purpose:** consistency and motivation.
- **Functionality:** streak counter, longest streak, weekly freeze; XP, levels.
- **Dependencies:** Sessions, Goals, timezone, anti-abuse rules.
- **Complexity:** M + M. **Risks:** gamification burnout and guilt on streak loss, gaming via manual/fake sessions, XP economy tuning. **Flag: XP economy likely over-complex.**
- **Phase:** 2, streak first, XP after.

### 11. Exam Preparation Management
- **Purpose:** turn an exam date into a plan and progress signal.
- **Functionality:** exam (subject, date), topic checklist, countdown; Phase 2 readiness score and backward planning.
- **Dependencies:** Subjects & Topics.
- **Complexity:** M. **Risks:** readiness being misread as predicted score; date changes.
- **Phase:** MVP basic; Phase 2 readiness.

### 12. Study Groups and Leaderboards
- **Purpose:** accountability and social motivation.
- **Functionality:** groups, invites, shared stats, leaderboards.
- **Dependencies:** Auth, stable session integrity, privacy settings, moderation.
- **Complexity:** XL. **Risks:** cheating via fake sessions, privacy (minors), moderation/abuse, demotivating rankings. **Flag: likely over-complex.**
- **Phase:** 3.

### 13. REST API for External Integrations
- **Purpose:** third-party integrations (Google Calendar, Notion, Anki).
- **Functionality:** API keys, scoped read/write, rate limits, docs, webhooks maybe.
- **Dependencies:** Stable domain model; auth.
- **Complexity:** L. **Risks:** versioning commitments, security, rate limiting, support burden. **Flag: public API likely over-complex before product-market fit.** Internal API exists from MVP but is not public.
- **Phase:** 3.

### 14. To-Do List and Priority Management
- **Purpose:** capture tasks tied to subjects.
- **Functionality:** tasks with subject, due date, priority (High/Medium/Low), done state.
- **Dependencies:** Subjects.
- **Complexity:** S. **Risks:** overlap with plan entries (rule: to-dos are tasks, plan entries are time blocks); scope creep to a full task manager.
- **Phase:** MVP.

## Recommended additions
| ID | Feature | Purpose | Dependencies | Complexity | Risks | Phase |
|---|---|---|---|---|---|---|
| A1 | Authentication & Profile | identity, timezone, settings | none | M | account security, password reset, OAuth | MVP |
| A2 | Subjects & Topics Management | backbone of all data | A1 | S | hierarchy creep; soft-delete semantics | MVP |
| A3 | Data Export (CSV/JSON) | trust, ownership, portability | sessions, notes | S | large exports | MVP |
| A4 | Onboarding | activation | A1, A2 | S | friction | MVP |
| A5 | Dark mode / responsive / PWA | usability on phone | none | S (responsive, dark), M (PWA) | PWA caching complexity | Responsive+dark MVP; PWA 2 |
| A6 | Reminders / Notifications | habit and revision prompts | A1, plan entries | M | push permissions, deliverability | 2 |
| A7 | Spaced-repetition Flashcards | revision | notes/topics, A6 | L | algorithm, content entry friction | 2 |
