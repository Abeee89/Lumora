# Product Vision — Lumora

> Status: Proposal, pending approval.

## Vision statement
Lumora is the single place where a learner plans what to study, studies with a focused timer, records what was learned, and sees honestly how actual effort compares with the plan — so every study session makes the next one better.

## Core problem
Learners spread their study workflow across many disconnected tools: a calendar or paper planner for planning, a phone timer for focus, a notes app for material, a spreadsheet or nothing for hours, and a separate list for exams. Consequences:

- Plans and reality are never compared. Learners cannot see whether they studied what they planned.
- Time per subject is invisible, so weak subjects get neglected until exam week.
- Exam preparation is reactive: no topic checklist, no countdown, no readiness signal.
- Motivation depends on willpower; there is no feedback loop (progress, streaks) tied to real effort.

## Unique value proposition
One closed loop in one app:

**plan → study (timer) → record → review stats → revise (and re-plan)**

Differentiators:
1. **Planned-vs-actual tracking** — plans and recorded sessions are separate data and are always shown side by side (see BR-001..BR-004 in BUSINESS-RULES.md).
2. **Exam-driven planning** — exam date → topic checklist → countdown → readiness.
3. **Effort-based feedback** — goals, statistics, and (later) streaks derive from recorded sessions, not self-reported checkmarks.

## Success metrics (proposed targets, to be validated)
| Metric | Definition | Initial target |
|---|---|---|
| D7 retention | % of new signups with ≥1 session on days 7–13 after signup | ≥ 25% |
| Sessions / week / active user | Mean saved sessions per user active that week | ≥ 4 |
| Daily goal met rate | % of active-user days where progress ≥ target | ≥ 40% |
| Activation | % of signups completing first session within 24h | ≥ 50% |
| Plan adherence | actual ÷ planned minutes for users who plan | tracked, no target in MVP |

## Product principles
- Honest data over flattering data (manual entries are flagged; plans never overwrite actuals).
- Low friction: start a session in ≤ 3 interactions.
- Ship the loop first; engagement mechanics (XP, social) only after the loop retains users.
