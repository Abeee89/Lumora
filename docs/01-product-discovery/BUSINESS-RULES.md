# Business Rules

> Status: **All numeric values are proposals pending approval.** Each rule has an ID and rationale.

## 1. Planned vs actual study time
- **BR-001** Planned time = duration of a plan entry. Actual time = sum of recorded session durations (breaks excluded). *Rationale: two independent measures.*
- **BR-002** Planned and actual never overwrite each other. *Rationale: honest comparison.*
- **BR-003** A session may optionally link to one plan entry; unlinked sessions still count toward goals and stats. *Rationale: low friction.*
- **BR-004** Variance = actual − planned (per entry, day, subject). Over-studying yields positive variance. *Rationale: simple, signed, explainable.*
- **BR-005** A plan entry in the past without linked sessions can be marked "missed"; it is not deleted.

## 2. Study session completion
- **BR-006** Session states: running, paused, completed, discarded. If no heartbeat for > 30 min, the session auto-closes at the last heartbeat time.
- **BR-007** Pomodoro: counts when the focus interval runs to its end, or the user stops after ≥ 5 min of focus. Stopped earlier than 5 min → saved as stopwatch-equivalent only if ≥ 1 min (counts as time, not as a completed pomodoro).
- **BR-008** Any session < 1 min is discarded. Stopwatch sessions ≥ 1 min are saved.
- **BR-009** Defaults: Pomodoro 25 min focus / 5 min break; long break 15 min after 4 cycles; all configurable. Break time is not study time.
- **BR-010** Manual entry is allowed, stored with `manual` flag, shown distinctly, and excluded from XP and leaderboards. It counts toward goals and statistics. *Rationale: forgiving yet protects competitive integrity.*
- **BR-011** Only one running timer per user at a time; starting a second prompts to stop the first. *Rationale: prevents double-counting across devices.*
- **BR-012** Timer duration is computed from stored start/end timestamps, never from tick counts.

## 3. Daily goal
- **BR-013** Goal is minutes per day per user; default 120. Optional per-subject targets.
- **BR-014** Progress = sum of study minutes in the user's local day (day starts 00:00 in the profile timezone; optional user-configurable rollover hour).
- **BR-015** Goal met when progress ≥ target. Changing the target applies from the current day forward; past days keep the target in force that day.
- **BR-016** Sessions spanning the day boundary are split at the boundary.

## 4. XP earning (Phase 2)
- **BR-017** 1 XP per focused minute; +20 XP when the daily goal is met; +10 XP per completed High-priority to-do.
- **BR-018** Cap 600 XP/day. No XP for manual entries or sessions < 5 min.
- **BR-019** Levels use a fixed threshold table (to be defined in PRD). XP is never removed except by session deletion/correction.

## 5. Habit streak (Phase 2)
- **BR-020** A day counts toward the streak when the daily goal is met. (Alternative: ≥ 1 completed session; recommended: goal met. Decision D2.)
- **BR-021** Streak resets to 0 after one missed day. One "freeze" per week may cover one missed day.
- **BR-022** Computed in the user's timezone; longest streak is stored. Changing timezone does not reduce an existing streak.

## 6. Exam preparation progress
- **BR-023** An exam links to one subject and a set of its topics; has a date.
- **BR-024** Readiness = Σ(weight of completed topics) ÷ Σ(weight of all topics); default equal weights. Displayed with days remaining. It is a coverage measure, not a score prediction.
- **BR-025** Past exams are archived, not deleted. Exam dates are fixed anchors: plan entries scheduled after the exam date for that exam's topics show a warning.

## 7. Schedule conflict handling
- **BR-026** Overlapping plan entries for the same user are allowed with a warning; saving requires confirmation. No hard blocking.
- **BR-027** Drag-and-drop (Phase 2) onto an overlap shows the warning and requires confirmation.
- **BR-028** Past plan entries are not editable, except marking missed (BR-005).

## 8. General
- **BR-029** Deleting a subject is a soft-delete; history and statistics are retained and the subject shows as archived.
- **BR-030** Each user has a timezone; all day-based computations use it. Timestamps are stored in UTC.
- **BR-031** To-do priorities: High, Medium, Low.
- **BR-032** Users own their data and can export it (CSV/JSON) and delete their account.
