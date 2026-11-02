# Product Scope

> Status: Proposal, pending approval.

## In scope (MVP)
- Authentication (email+password, Google) and profile (timezone, settings)
- Subjects and topics (soft-delete)
- Study Hours Tracking by Subject (timer sessions + flagged manual entries)
- Pomodoro Timer and Stopwatch
- Daily Study Goals
- To-Do List and Priority Management
- Study Activity Calendar (read-only heatmap + planned sessions list; plan entries created by form)
- Daily and Monthly Statistics (incl. planned vs actual)
- Basic notes per subject/topic (markdown)
- Basic Exam Management (exam date, countdown, topic checklist)
- Data export, onboarding, responsive web, dark mode
- Internal API serving the web client (not public)

## Out of scope (not planned)
- Native mobile apps
- Video/course hosting, content marketplace
- Payments, subscriptions
- Real-time chat
- LMS instructor features (classes, grading, assignments)
- Offline-first sync
- Languages other than English

## MVP boundaries
- Single user per account; no social or sharing.
- Responsive web only (desktop + mobile browsers).
- No drag-and-drop planning; no gamification; no AI; no public API; no ambient audio.
- Free product; no billing code.

## Future expansion
| Phase | Items |
|---|---|
| 2 | Drag-and-Drop Study Calendar, revision tools (flashcards/spaced repetition), Habit Streak then XP, Focus Timer ambient audio, exam readiness score, reminders, PWA |
| 3 | AI-Generated Study Schedule, Study Groups and Leaderboards, public REST API |
| Later | Integrations: Google Calendar, Notion, Anki import; additional languages |
