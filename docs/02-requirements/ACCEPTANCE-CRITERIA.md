# Lumora Acceptance Criteria

> Status: Proposal, pending approval. Source of truth: Phase 1 docs.

## 1. How criteria are written

- **Per-requirement criteria** live in FUNCTIONAL-REQUIREMENTS.md under each FR, as numbered Given/When/Then lines with IDs `AC-FR-XXX-n` (XXX = FR number, n = sequence). They are not repeated here; section 2 indexes them.
- **Non-functional criteria** are `AC-NFR-XXX`, one per NFR, with a pass/fail threshold and a measuring method (section 3).
- **End-to-end scenarios** are `AC-E2E-nn`, covering the MVP core loop across several FRs (section 4).
- Every criterion states a concrete number or state so that a tester can decide pass or fail without interpretation.
- A criterion passes only when observed in a running system; planned test cases (TC) are listed in REQUIREMENT-TRACEABILITY.md.
- Priority of Phase 2 and 3 criteria follows the FR; they are not part of MVP acceptance.

## 2. Index of functional acceptance criteria

595 criteria for 164 requirements. The title is the expected result, shortened.

| AC ID | FR ID | Title |
|---|---|---|
| AC-FR-001-1 | FR-001 | an account is created, the user is signed in and the timezone is saved as an IANA name |
| AC-FR-001-2 | FR-001 | registration is rejected and no account exists |
| AC-FR-001-3 | FR-001 | no account is created |
| AC-FR-002-1 | FR-002 | the user is signed in and lands on their dashboard |
| AC-FR-002-2 | FR-002 | it is refused even with the correct password |
| AC-FR-002-3 | FR-002 | they are asked to log in again |
| AC-FR-002-4 | FR-002 | the same generic message is shown in both cases |
| AC-FR-003-1 | FR-003 | an account is created and they are signed in with timezone pre-filled from the browser |
| AC-FR-003-2 | FR-003 | that account is signed in and no second account exists |
| AC-FR-003-3 | FR-003 | no account is created and the login page shows a cancellation notice |
| AC-FR-004-1 | FR-004 | the current sign-in is invalidated and the login page is shown |
| AC-FR-004-2 | FR-004 | no private data is displayed and a login redirect occurs |
| AC-FR-004-3 | FR-004 | the second device stays signed in |
| AC-FR-005-1 | FR-005 | the same neutral confirmation is shown whether or not an account exists |
| AC-FR-005-2 | FR-005 | the password changes and all previous sign-ins are revoked |
| AC-FR-005-3 | FR-005 | the password is not changed and a new request is offered |
| AC-FR-006-1 | FR-006 | the new name is shown everywhere immediately |
| AC-FR-006-2 | FR-006 | it is rejected and the old name is kept |
| AC-FR-006-3 | FR-006 | past sessions keep their original local date and today's progress counts sessions whose... |
| AC-FR-006-4 | FR-006 | an existing streak value is unchanged |
| AC-FR-007-1 | FR-007 | all sign-ins are revoked and the account can no longer log in |
| AC-FR-007-2 | FR-007 | no personal data of that user remains in live storage |
| AC-FR-007-3 | FR-007 | the account is not deleted |
| AC-FR-007-4 | FR-007 | the timer is discarded and no session is saved |
| AC-FR-008-1 | FR-008 | 3 rows are shown with the current one marked |
| AC-FR-008-2 | FR-008 | that sign-in is rejected on its next request |
| AC-FR-008-3 | FR-008 | only the current sign-in stays active |
| AC-FR-009-1 | FR-009 | the rollover hour shows 0 |
| AC-FR-009-2 | FR-009 | it counts toward the previous calendar day |
| AC-FR-009-3 | FR-009 | it is rejected and the old value is kept |
| AC-FR-009-4 | FR-009 | days already recorded keep their assigned local dates |
| AC-FR-010-1 | FR-010 | the subject is created and listed last |
| AC-FR-010-2 | FR-010 | it is rejected |
| AC-FR-010-3 | FR-010 | it is rejected as duplicate |
| AC-FR-010-4 | FR-010 | creation is allowed |
| AC-FR-011-1 | FR-011 | all past sessions and statistics show "Maths" |
| AC-FR-011-2 | FR-011 | it is rejected |
| AC-FR-011-3 | FR-011 | the save is rejected with a changed-elsewhere message and the latest data is reloaded |
| AC-FR-012-1 | FR-012 | the list shows it first after reload |
| AC-FR-012-2 | FR-012 | it becomes 2nd |
| AC-FR-012-3 | FR-012 | it is not included in the ordering |
| AC-FR-013-1 | FR-013 | all 40 sessions remain in statistics labelled "<name> (archived)" |
| AC-FR-013-2 | FR-013 | it is blocked with a message |
| AC-FR-013-3 | FR-013 | it and its topics are absent |
| AC-FR-014-1 | FR-014 | it appears last among active subjects |
| AC-FR-014-2 | FR-014 | its previously hidden open plan entries and to-dos are visible again |
| AC-FR-014-3 | FR-014 | the user is asked for a new name before restoring |
| AC-FR-015-1 | FR-015 | its weight is 1 and status Not started |
| AC-FR-015-2 | FR-015 | accepted; given 0 or 6 or 2.5, then rejected |
| AC-FR-015-3 | FR-015 | it is rejected |
| AC-FR-016-1 | FR-016 | it saves and exam readiness uses 3 afterward |
| AC-FR-016-2 | FR-016 | order persists after reload |
| AC-FR-016-3 | FR-016 | the save is rejected with a changed-elsewhere message |
| AC-FR-017-1 | FR-017 | 30 topics with weight 1 are created in order |
| AC-FR-017-2 | FR-017 | nothing is saved and a message states the 200 limit |
| AC-FR-017-3 | FR-017 | blanks are ignored and the long line is flagged and excluded until fixed |
| AC-FR-018-1 | FR-018 | the 5 sessions remain with the subject and show the topic as archived |
| AC-FR-018-2 | FR-018 | it is absent |
| AC-FR-018-3 | FR-018 | it reappears in pickers with its prior status and weight |
| AC-FR-019-1 | FR-019 | its status is Not started |
| AC-FR-019-2 | FR-019 | status shows Done after reload |
| AC-FR-019-3 | FR-019 | it is rejected |
| AC-FR-020-1 | FR-020 | it shows 45 of 120 minutes and 38% progress, with a numeric label |
| AC-FR-020-2 | FR-020 | it shows a goal-met state with a text label, not color alone |
| AC-FR-020-3 | FR-020 | the target shown is the default 120 minutes |
| AC-FR-021-1 | FR-021 | the card shows the subject and elapsed time 12:30 within 2 seconds of server time |
| AC-FR-021-2 | FR-021 | the card shows that running state within 5 seconds |
| AC-FR-021-3 | FR-021 | the card shows a start action and no elapsed time |
| AC-FR-022-1 | FR-022 | exactly 3 are listed, the earliest first |
| AC-FR-022-2 | FR-022 | exactly 2 are listed |
| AC-FR-022-3 | FR-022 | an empty state with an action to add a plan entry is shown |
| AC-FR-023-1 | FR-023 | all 3 appear and the overdue one carries an "Overdue" text label |
| AC-FR-023-2 | FR-023 | they are ordered High, Medium, Low |
| AC-FR-023-3 | FR-023 | an empty state is shown |
| AC-FR-024-1 | FR-024 | totals per subject for the 7 local days are shown with numeric minutes |
| AC-FR-024-2 | FR-024 | its minutes appear labelled "<name> (archived)" |
| AC-FR-024-3 | FR-024 | an empty state is shown instead of zero-height bars |
| AC-FR-030-1 | FR-030 | the entry is created with planned time 60 minutes |
| AC-FR-030-2 | FR-030 | it is rejected and the allowed range 5-480 is stated |
| AC-FR-030-3 | FR-030 | it is rejected with a message that a subject is required |
| AC-FR-030-4 | FR-030 | it is rejected with a message that entries must be in the future |
| AC-FR-031-1 | FR-031 | planned time shows 90 minutes |
| AC-FR-031-2 | FR-031 | it is refused as read-only |
| AC-FR-031-3 | FR-031 | the save is rejected with "changed elsewhere" and the entry reloads |
| AC-FR-032-1 | FR-032 | the entry is removed and both sessions remain, unlinked |
| AC-FR-032-2 | FR-032 | the entry remains unchanged |
| AC-FR-032-3 | FR-032 | a not-found response is returned |
| AC-FR-033-1 | FR-033 | it shows status "Missed" and remains in lists |
| AC-FR-033-2 | FR-033 | it is refused with a message that it has recorded time |
| AC-FR-033-3 | FR-033 | it is refused because it has not passed |
| AC-FR-034-1 | FR-034 | a warning names the existing entry and requires confirmation |
| AC-FR-034-2 | FR-034 | both entries exist |
| AC-FR-034-3 | FR-034 | no warning is shown because they only touch |
| AC-FR-034-4 | FR-034 | nothing is saved |
| AC-FR-035-1 | FR-035 | fields are read-only |
| AC-FR-035-2 | FR-035 | it is rejected |
| AC-FR-035-3 | FR-035 | the mark-missed action is available |
| AC-FR-036-1 | FR-036 | it shows planned 60, actual 75, variance +15 |
| AC-FR-036-2 | FR-036 | variance shows -15 |
| AC-FR-036-3 | FR-036 | actual shows 0 and variance equals minus planned |
| AC-FR-037-1 | FR-037 | only matching entries are shown |
| AC-FR-037-2 | FR-037 | only missed entries appear |
| AC-FR-037-3 | FR-037 | an empty state with a clear-filter action appears |
| AC-FR-038-1 | FR-038 | a warning names the exam date |
| AC-FR-038-2 | FR-038 | no warning is shown |
| AC-FR-038-3 | FR-038 | the entry is created |
| AC-FR-040-1 | FR-040 | a session of 25 minutes 30 seconds is stored |
| AC-FR-040-2 | FR-040 | the duration still equals server end minus server start |
| AC-FR-040-3 | FR-040 | it counts toward its day within 1 refresh |
| AC-FR-041-1 | FR-041 | it is rejected |
| AC-FR-041-2 | FR-041 | it is refused: at most 1 entry |
| AC-FR-041-3 | FR-041 | it counts toward the daily goal |
| AC-FR-042-1 | FR-042 | it is stored flagged manual and counts 45 minutes toward its day |
| AC-FR-042-2 | FR-042 | it is rejected |
| AC-FR-042-3 | FR-042 | it is rejected naming the conflicting session |
| AC-FR-042-4 | FR-042 | it is rejected |
| AC-FR-043-1 | FR-043 | duration becomes 45 minutes |
| AC-FR-043-2 | FR-043 | rejected with "changed elsewhere" and the record reloads |
| AC-FR-043-3 | FR-043 | rejected |
| AC-FR-044-1 | FR-044 | totals for its day fall by 40 minutes |
| AC-FR-044-2 | FR-044 | the session remains |
| AC-FR-044-3 | FR-044 | it is rejected with "changed elsewhere" |
| AC-FR-045-1 | FR-045 | no session is stored |
| AC-FR-045-2 | FR-045 | a session is stored |
| AC-FR-045-3 | FR-045 | a message states it was shorter than 1 minute and discarded |
| AC-FR-046-1 | FR-046 | the session is closed at 10:00 flagged auto-closed |
| AC-FR-046-2 | FR-046 | the session remains running |
| AC-FR-046-3 | FR-046 | the auto-closed label is visible |
| AC-FR-047-1 | FR-047 | 30 minutes count to the first day and 20 to the next |
| AC-FR-047-2 | FR-047 | its allocations do not change |
| AC-FR-047-3 | FR-047 | durations are unaffected |
| AC-FR-048-1 | FR-048 | 1 session exists |
| AC-FR-048-2 | FR-048 | the user sees one session |
| AC-FR-048-3 | FR-048 | 2 sessions are stored |
| AC-FR-049-1 | FR-049 | the user can set a status and add a note up to the note limit |
| AC-FR-049-2 | FR-049 | the session remains saved unchanged |
| AC-FR-049-3 | FR-049 | the status choice is not offered |
| AC-FR-050-1 | FR-050 | a running session with a 25:00 focus countdown is shown within 200 ms |
| AC-FR-050-2 | FR-050 | the break length is 15 min instead of 5 min |
| AC-FR-050-3 | FR-050 | no minutes are added to the study total of the day |
| AC-FR-050-4 | FR-050 | the timer is not started and a subject selection prompt is shown |
| AC-FR-051-1 | FR-051 | a running session with an elapsed counter at 00:00 is shown within 200 ms |
| AC-FR-051-2 | FR-051 | a completed session of 42 min (±2 s) is saved |
| AC-FR-051-3 | FR-051 | the session is discarded and a message states it was under 1 min |
| AC-FR-051-4 | FR-051 | the saved duration is 20 min (±2 s) |
| AC-FR-052-1 | FR-052 | the stopped session counts 20 min (±2 s) |
| AC-FR-052-2 | FR-052 | the session is shown as paused with the same elapsed value |
| AC-FR-052-3 | FR-052 | the session is closed at the last heartbeat time and flagged "auto-closed" |
| AC-FR-052-4 | FR-052 | the UI shows the paused state within 200 ms |
| AC-FR-053-1 | FR-053 | the start is rejected and the prompt "Stop current session and start new?" is shown |
| AC-FR-053-2 | FR-053 | the first session is stopped at the server time of confirmation and the new one starts |
| AC-FR-053-3 | FR-053 | exactly 1 is accepted (the first) and the other receives the stop-and-start prompt |
| AC-FR-053-4 | FR-053 | the original session continues unchanged |
| AC-FR-054-1 | FR-054 | the timer shows 12 min (±2 s) and keeps counting |
| AC-FR-054-2 | FR-054 | the session is still running and the elapsed value is within 2 s of server time |
| AC-FR-054-3 | FR-054 | the session is closed at the last heartbeat and flagged "auto-closed" |
| AC-FR-054-4 | FR-054 | displayed elapsed time is based on server timestamps only |
| AC-FR-055-1 | FR-055 | an alert is shown within 2 s of the end |
| AC-FR-055-2 | FR-055 | an in-app indicator is shown and a prompt to enable notifications is offered |
| AC-FR-055-3 | FR-055 | a visible in-app indicator is shown instead of sound |
| AC-FR-055-4 | FR-055 | the change is announced once, not every second |
| AC-FR-056-1 | FR-056 | the Lumora tab title contains "18:00" (±1 s) |
| AC-FR-056-2 | FR-056 | the title shows 01:01 |
| AC-FR-056-3 | FR-056 | the tab title reverts to the default within 1 s |
| AC-FR-056-4 | FR-056 | no per-second announcement is made |
| AC-FR-057-1 | FR-057 | values 25, 5, 15 and 4 are shown |
| AC-FR-057-2 | FR-057 | the value is accepted; set to 121 min, then it is rejected |
| AC-FR-057-3 | FR-057 | each is rejected; 1 and 60 are accepted |
| AC-FR-057-4 | FR-057 | it is rejected; 2 and 8 are accepted |
| AC-FR-058-1 | FR-058 | it is saved and counted as a completed pomodoro |
| AC-FR-058-2 | FR-058 | 3 min are saved as time only and not counted as a completed pomodoro |
| AC-FR-058-3 | FR-058 | it is discarded and nothing is saved |
| AC-FR-058-4 | FR-058 | it counts as a completed pomodoro |
| AC-FR-059-1 | FR-059 | device B shows it running with the same elapsed value (±2 s) |
| AC-FR-059-2 | FR-059 | device A shows it paused |
| AC-FR-059-3 | FR-059 | device B shows no running timer |
| AC-FR-059-4 | FR-059 | it is rejected and the device is refreshed to the stopped state |
| AC-FR-060-1 | FR-060 | they appear in buckets 0, 1-59, 60-119 and >=120 respectively |
| AC-FR-060-2 | FR-060 | its minute value is visible as text, not only as color |
| AC-FR-060-3 | FR-060 | past sessions stay on the frozen local date of their start |
| AC-FR-060-4 | FR-060 | it loads within 1 s at p95 |
| AC-FR-061-1 | FR-061 | 3 sessions are listed with subject, start time and minutes, and a day total equal to their sum |
| AC-FR-061-2 | FR-061 | the session appears with 30 min allocated to that day |
| AC-FR-061-3 | FR-061 | the subject is labelled "<name> (archived)" |
| AC-FR-061-4 | FR-061 | an empty state shows 0 min |
| AC-FR-062-1 | FR-062 | both appear with subject, start time and duration |
| AC-FR-062-2 | FR-062 | both 60 and 50 min are visible |
| AC-FR-062-3 | FR-062 | status is shown as text, not only as color |
| AC-FR-062-4 | FR-062 | an empty state offers to add a plan entry |
| AC-FR-065-1 | FR-065 | a form opens with start 09:00 and duration 90 min |
| AC-FR-065-2 | FR-065 | the end snaps to the nearest 15-minute mark (09:00 or 09:15) |
| AC-FR-065-3 | FR-065 | no entry is created and the allowed range is stated |
| AC-FR-065-4 | FR-065 | the overlap warning is shown and saving needs confirmation |
| AC-FR-066-1 | FR-066 | it saves with start 14:00 and duration 60 min |
| AC-FR-066-2 | FR-066 | the move is refused with a message that past entries are read-only except marking missed |
| AC-FR-066-3 | FR-066 | the start snaps to 14:15 or 14:00 (nearest) |
| AC-FR-066-4 | FR-066 | a warning is shown and confirmation is required |
| AC-FR-067-1 | FR-067 | the duration becomes 90 min |
| AC-FR-067-2 | FR-067 | it is refused and 480 min is the maximum |
| AC-FR-067-3 | FR-067 | it is refused and the duration stays |
| AC-FR-067-4 | FR-067 | a warning and confirmation are required before saving |
| AC-FR-068-1 | FR-068 | the same form as drag-create opens |
| AC-FR-068-2 | FR-068 | it moves 60 min |
| AC-FR-068-3 | FR-068 | it changes in 15-minute steps |
| AC-FR-068-4 | FR-068 | an announcement states the new time and duration |
| AC-FR-069-1 | FR-069 | a warning names that entry and the time overlapped |
| AC-FR-069-2 | FR-069 | the change is saved with both entries kept |
| AC-FR-069-3 | FR-069 | the entry returns to its original position unchanged |
| AC-FR-069-4 | FR-069 | the warning is still shown |
| AC-FR-070-1 | FR-070 | the target shows 120 minutes |
| AC-FR-070-2 | FR-070 | the target is stored as 90 minutes and shown as 90 on the next page load |
| AC-FR-070-3 | FR-070 | the value is accepted; when the user saves 4 or 1441, then it is rejected and the stored... |
| AC-FR-070-4 | FR-070 | it is rejected with a message stating the allowed range 5-1440 |
| AC-FR-071-1 | FR-071 | the subject shows a 45-minute daily target |
| AC-FR-071-2 | FR-071 | the subject shows no target and the overall goal is unchanged |
| AC-FR-071-3 | FR-071 | it is rejected and nothing is stored |
| AC-FR-071-4 | FR-071 | its target is hidden and not counted until the subject is restored |
| AC-FR-072-1 | FR-072 | it shows 45 of 120 minutes (38%) |
| AC-FR-072-2 | FR-072 | the running elapsed minutes are included and the figure updates within 5 seconds of a state... |
| AC-FR-072-3 | FR-072 | it counts only sessions whose frozen local date equals today's date in the new zone |
| AC-FR-072-4 | FR-072 | the earlier day counts 10 and the later day counts 20 |
| AC-FR-073-1 | FR-073 | the state is 'not met' |
| AC-FR-073-2 | FR-073 | the state changes to 'met' with a text label |
| AC-FR-073-3 | FR-073 | it is labelled 'goal not met' and no notification was sent |
| AC-FR-073-4 | FR-073 | the state returns to 'not met' |
| AC-FR-074-1 | FR-074 | today shows target 60 and last week's days still show target 120 |
| AC-FR-074-2 | FR-074 | today shows met immediately |
| AC-FR-074-3 | FR-074 | only 80 applies and no extra history entry affects past days |
| AC-FR-074-4 | FR-074 | each past day still shows the target in force on its frozen local date |
| AC-FR-080-1 | FR-080 | that day shows 75 minutes |
| AC-FR-080-2 | FR-080 | it shows 0 minutes rather than being omitted |
| AC-FR-080-3 | FR-080 | it returns within 1 second at p95 (NFR-003) |
| AC-FR-080-4 | FR-080 | the sum equals the sum of all session durations in the range exactly |
| AC-FR-081-1 | FR-081 | that week shows 90 minutes |
| AC-FR-081-2 | FR-081 | the first week is labelled partial and counts only days in the range |
| AC-FR-081-3 | FR-081 | 30 minutes fall in the earlier week and 30 minutes in the next |
| AC-FR-081-4 | FR-081 | they equal the daily totals sum for the same range |
| AC-FR-082-1 | FR-082 | March shows 1,200 minutes |
| AC-FR-082-2 | FR-082 | 10 minutes fall in March and 20 in April |
| AC-FR-082-3 | FR-082 | it is labelled 'current' and shows minutes to date |
| AC-FR-082-4 | FR-082 | it returns within 1 second at p95 and 24 monthly rows are shown |
| AC-FR-083-1 | FR-083 | Maths shows 120 (67%) and History 60 (33%) |
| AC-FR-083-2 | FR-083 | it appears as '<name> (archived)' with 90 minutes |
| AC-FR-083-3 | FR-083 | its label no longer shows 'archived' and its minutes are unchanged |
| AC-FR-083-4 | FR-083 | they equal the total for the range |
| AC-FR-084-1 | FR-084 | it shows 5 of 7 days (71%) |
| AC-FR-084-2 | FR-084 | days 1-3 are judged against 120 and days 4 onward against 60 |
| AC-FR-084-3 | FR-084 | those days are excluded from the denominator |
| AC-FR-084-4 | FR-084 | it shows 'no data' rather than 0% or an error |
| AC-FR-085-1 | FR-085 | variance shows -30 minutes |
| AC-FR-085-2 | FR-085 | variance shows +20 minutes |
| AC-FR-085-3 | FR-085 | they count in actual but add 0 planned minutes |
| AC-FR-085-4 | FR-085 | its planned minutes count and its actual is 0 |
| AC-FR-086-1 | FR-086 | all statistics views use exactly 7 local days including today |
| AC-FR-086-2 | FR-086 | it is accepted and loads within 1 second at p95 for up to 10,000 sessions |
| AC-FR-086-3 | FR-086 | it is rejected and the previous range stays active |
| AC-FR-086-4 | FR-086 | it is rejected with a message |
| AC-FR-087-1 | FR-087 | an empty state with a start-timer action is shown and no chart |
| AC-FR-087-2 | FR-087 | the empty state is still shown |
| AC-FR-087-3 | FR-087 | the full views are shown |
| AC-FR-087-4 | FR-087 | its heading and action are announced as text |
| AC-FR-088-1 | FR-088 | the total is 90 and the manual portion is shown as 30 |
| AC-FR-088-2 | FR-088 | it carries a text label 'manual', not color alone |
| AC-FR-088-3 | FR-088 | the total falls by its minutes immediately |
| AC-FR-088-4 | FR-088 | the total equals the sum of all session durations |
| AC-FR-089-1 | FR-089 | the session stays on its original local date |
| AC-FR-089-2 | FR-089 | the day total is 120 minutes |
| AC-FR-089-3 | FR-089 | session durations are unchanged and no minutes are lost or duplicated |
| AC-FR-089-4 | FR-089 | the sum equals the sum of session durations in UTC-based elapsed time |
| AC-FR-090-1 | FR-090 | the to-do appears in the list as not done with priority Medium and no due date |
| AC-FR-090-2 | FR-090 | the save is rejected and no to-do is created; a title of exactly 200 characters is accepted |
| AC-FR-090-3 | FR-090 | the list shows both the subject and the topic on that to-do |
| AC-FR-090-4 | FR-090 | the save is rejected and nothing is stored |
| AC-FR-091-1 | FR-091 | the list shows High and the to-do moves to the High group in the priority sort |
| AC-FR-091-2 | FR-091 | the to-do shows no due date and no longer counts as due or overdue |
| AC-FR-091-3 | FR-091 | the save is rejected with a "changed elsewhere" message and the current version is loaded |
| AC-FR-091-4 | FR-091 | it is rejected and the stored title is unchanged |
| AC-FR-092-1 | FR-092 | the to-do disappears from every list and the dashboard within 1 second |
| AC-FR-092-2 | FR-092 | the to-do remains unchanged |
| AC-FR-092-3 | FR-092 | a not-found response is returned |
| AC-FR-092-4 | FR-092 | total study minutes are unchanged |
| AC-FR-093-1 | FR-093 | it shows as done with a completion time and leaves the default open list |
| AC-FR-093-2 | FR-093 | it returns to the open list and its completion time is cleared |
| AC-FR-093-3 | FR-093 | the final state matches the last user action and exactly one state is stored |
| AC-FR-093-4 | FR-093 | the state change is announced as done |
| AC-FR-094-1 | FR-094 | exactly 6 to-dos are shown |
| AC-FR-094-2 | FR-094 | only High to-dos are shown |
| AC-FR-094-3 | FR-094 | it appears and a to-do due today does not |
| AC-FR-094-4 | FR-094 | an empty state with an option to clear filters is shown |
| AC-FR-095-1 | FR-095 | the High to-do appears before the Low to-do |
| AC-FR-095-2 | FR-095 | the 1 May to-do appears first |
| AC-FR-095-3 | FR-095 | the one with a due date appears first |
| AC-FR-095-4 | FR-095 | the list responds within the NFR-002 read limit (p95 300 ms) |
| AC-FR-096-1 | FR-096 | its priority is Medium |
| AC-FR-096-2 | FR-096 | exactly that value is stored and shown |
| AC-FR-096-3 | FR-096 | it is rejected and the stored priority is unchanged |
| AC-FR-096-4 | FR-096 | the word High is visible as text |
| AC-FR-100-1 | FR-100 | the note appears under that subject with the title shown |
| AC-FR-100-2 | FR-100 | the note is listed there |
| AC-FR-100-3 | FR-100 | the new body is shown and the version number increases by 1 |
| AC-FR-100-4 | FR-100 | it is rejected with a message stating the limit and the stored note is unchanged |
| AC-FR-101-1 | FR-101 | no script runs and the tag is shown as inert text or removed |
| AC-FR-101-2 | FR-101 | the link is not clickable as an executable link |
| AC-FR-101-3 | FR-101 | each is shown with the matching formatting |
| AC-FR-101-4 | FR-101 | no request carrying user identifiers is sent to that address without the user choosing to... |
| AC-FR-102-1 | FR-102 | the note is saved and the indicator shows Saved |
| AC-FR-102-2 | FR-102 | the indicator shows Not saved, the typed text stays in the editor and is kept locally |
| AC-FR-102-3 | FR-102 | the system retries and the indicator shows Saved within 10 seconds |
| AC-FR-102-4 | FR-102 | no save request is made |
| AC-FR-103-1 | FR-103 | the save is rejected and a conflict view shows both versions |
| AC-FR-103-2 | FR-103 | the stored note becomes the user's text and the version increases by 1 |
| AC-FR-103-3 | FR-103 | two notes exist, the second titled with the suffix "(copy)" |
| AC-FR-103-4 | FR-103 | both versions remain available and nothing is deleted |
| AC-FR-104-1 | FR-104 | the note disappears from the subject and topic views |
| AC-FR-104-2 | FR-104 | notes of that subject are not listed |
| AC-FR-104-3 | FR-104 | its notes are listed again with unchanged content |
| AC-FR-104-4 | FR-104 | the note remains |
| AC-FR-107-1 | FR-107 | the card exists and is due today |
| AC-FR-107-2 | FR-107 | it is rejected and no card is created |
| AC-FR-107-3 | FR-107 | it is rejected with a limit message |
| AC-FR-107-4 | FR-107 | it is listed under that topic |
| AC-FR-108-1 | FR-108 | the next review date stays in 6 days |
| AC-FR-108-2 | FR-108 | it never appears in any queue again |
| AC-FR-108-3 | FR-108 | it is rejected with a "changed elsewhere" message and reloaded |
| AC-FR-108-4 | FR-108 | a not-found response is returned |
| AC-FR-109-1 | FR-109 | 12 cards are offered (subject to the daily limit in FR-111) |
| AC-FR-109-2 | FR-109 | the back is displayed and rating options appear |
| AC-FR-109-3 | FR-109 | due status uses the new zone's current date |
| AC-FR-109-4 | FR-109 | an empty state shows the date of the next due card |
| AC-FR-110-1 | FR-110 | one review is recorded and the card leaves today's queue |
| AC-FR-110-2 | FR-110 | the card is shown again later the same day |
| AC-FR-110-3 | FR-110 | only one review is recorded |
| AC-FR-110-4 | FR-110 | it is rejected |
| AC-FR-111-1 | FR-111 | the daily limit is 50 |
| AC-FR-111-2 | FR-111 | 50 cards are offered and 30 remain due |
| AC-FR-111-3 | FR-111 | it shows that the daily limit is reached |
| AC-FR-111-4 | FR-111 | it is rejected |
| AC-FR-112-1 | FR-112 | the card is due again on the same local day |
| AC-FR-112-2 | FR-112 | the Easy interval is greater than the Good interval |
| AC-FR-112-3 | FR-112 | the Hard interval is shorter than or equal to the Good interval and is at least 1 day |
| AC-FR-112-4 | FR-112 | it is derived from the profile-timezone date at review time |
| AC-FR-120-1 | FR-120 | the exam is listed with a countdown of 30 days |
| AC-FR-120-2 | FR-120 | it is rejected and no exam is created |
| AC-FR-120-3 | FR-120 | it is rejected |
| AC-FR-120-4 | FR-120 | it is rejected |
| AC-FR-121-1 | FR-121 | the countdown increases by 2 days |
| AC-FR-121-2 | FR-121 | the edit is accepted and the exam archives automatically the next day |
| AC-FR-121-3 | FR-121 | it is rejected with a "changed elsewhere" message |
| AC-FR-121-4 | FR-121 | topics linked from the old subject are removed from the checklist |
| AC-FR-122-1 | FR-122 | the checklist shows 2 of 5 complete |
| AC-FR-122-2 | FR-122 | the topic is no longer counted and a note says one topic was removed |
| AC-FR-122-3 | FR-122 | an "add topics" empty state is shown with no error |
| AC-FR-122-4 | FR-122 | it is rejected |
| AC-FR-123-1 | FR-123 | the countdown reads 14 days |
| AC-FR-123-2 | FR-123 | it reads "Today" (0 days) |
| AC-FR-123-3 | FR-123 | the countdown uses the new local date |
| AC-FR-123-4 | FR-123 | the nearest exam is first |
| AC-FR-124-1 | FR-124 | it is in the archive and not in the upcoming list |
| AC-FR-124-2 | FR-124 | it is still upcoming |
| AC-FR-124-3 | FR-124 | it is archived |
| AC-FR-124-4 | FR-124 | it returns to upcoming |
| AC-FR-125-1 | FR-125 | 3 exams are listed newest first |
| AC-FR-125-2 | FR-125 | title, subject, date and checklist completion are shown |
| AC-FR-125-3 | FR-125 | the change is not allowed |
| AC-FR-125-4 | FR-125 | an empty state is shown |
| AC-FR-126-1 | FR-126 | readiness shows 40% |
| AC-FR-126-2 | FR-126 | readiness is 100% |
| AC-FR-126-3 | FR-126 | no percentage is shown and the "add topics" state appears |
| AC-FR-126-4 | FR-126 | the denominator excludes it and a note records the change |
| AC-FR-127-1 | FR-127 | readiness is 75% |
| AC-FR-127-2 | FR-127 | all weights are 1 |
| AC-FR-127-3 | FR-127 | it is rejected |
| AC-FR-127-4 | FR-127 | readiness is recomputed at once |
| AC-FR-128-1 | FR-128 | the label reads topic coverage and not score |
| AC-FR-128-2 | FR-128 | it states it is not a grade prediction |
| AC-FR-128-3 | FR-128 | the label and percentage are announced together |
| AC-FR-128-4 | FR-128 | both use the same label |
| AC-FR-130-1 | FR-130 | 7 files are provided |
| AC-FR-130-2 | FR-130 | the export finishes within 60 seconds |
| AC-FR-130-3 | FR-130 | the total equals the total shown in statistics |
| AC-FR-130-4 | FR-130 | it contains no data of other users |
| AC-FR-131-1 | FR-131 | one file is produced containing all 7 types |
| AC-FR-131-2 | FR-131 | the link to the topic is present |
| AC-FR-131-3 | FR-131 | they are included and marked archived |
| AC-FR-131-4 | FR-131 | it completes within 60 seconds |
| AC-FR-132-1 | FR-132 | a progress indicator is visible |
| AC-FR-132-2 | FR-132 | the request is refused with a message that one is in progress |
| AC-FR-132-3 | FR-132 | no partial file is offered and retry is available |
| AC-FR-132-4 | FR-132 | the file stays available for download for at least 24 hours |
| AC-FR-134-1 | FR-134 | the wizard begins at step 1 |
| AC-FR-134-2 | FR-134 | the elapsed time from start to saved first session is under 3 minutes |
| AC-FR-134-3 | FR-134 | the goal is 120 minutes |
| AC-FR-134-4 | FR-134 | the user can confirm or change it before finishing |
| AC-FR-135-1 | FR-135 | the next step is shown and nothing is saved for the skipped step |
| AC-FR-135-2 | FR-135 | defaults are used: goal 120 minutes, detected timezone |
| AC-FR-135-3 | FR-135 | an option to restart it is present |
| AC-FR-135-4 | FR-135 | skip is reachable by keyboard |
| AC-FR-136-1 | FR-136 | a timer starts and acknowledges within 200 ms |
| AC-FR-136-2 | FR-136 | it is discarded and a message states that sessions under 1 minute are not saved |
| AC-FR-136-3 | FR-136 | 10 minutes are saved to the chosen subject |
| AC-FR-136-4 | FR-136 | the wizard completes without a session |
| AC-FR-137-1 | FR-137 | exactly 3 options are shown |
| AC-FR-137-2 | FR-137 | a suggestion to add an exam is shown on the dashboard |
| AC-FR-137-3 | FR-137 | no goal is stored and generic suggestions appear |
| AC-FR-137-4 | FR-137 | the choice is included in profile data |
| AC-FR-138-1 | FR-138 | the theme is system |
| AC-FR-138-2 | FR-138 | dark remains |
| AC-FR-138-3 | FR-138 | the theme changes without reload |
| AC-FR-138-4 | FR-138 | contrast meets WCAG 2.2 AA (4.5:1 for normal text) |
| AC-FR-139-1 | FR-139 | no horizontal scrolling is needed |
| AC-FR-139-2 | FR-139 | each is at least 44 by 44 px |
| AC-FR-139-3 | FR-139 | content stays readable and not stretched past a comfortable line length |
| AC-FR-139-4 | FR-139 | start, pause and stop are all reachable in one view |
| AC-FR-150-1 | FR-150 | one reminder is delivered that day |
| AC-FR-150-2 | FR-150 | 0 reminders are delivered |
| AC-FR-150-3 | FR-150 | it fires at 18:00 Tokyo time and not twice that day |
| AC-FR-151-1 | FR-151 | one reminder naming the subject is delivered |
| AC-FR-151-2 | FR-151 | the reminder is delivered at 14:30 |
| AC-FR-151-3 | FR-151 | 0 reminders are delivered |
| AC-FR-152-1 | FR-152 | an in-app notification appears within 5 seconds with a dismiss control |
| AC-FR-152-2 | FR-152 | the same reminder is not shown again |
| AC-FR-152-3 | FR-152 | it is announced once |
| AC-FR-153-1 | FR-153 | push is marked on and a test notification arrives within 10 seconds |
| AC-FR-153-2 | FR-153 | push remains off and a message explains how to enable it in browser settings |
| AC-FR-153-3 | FR-153 | 0 push notifications are sent after that action |
| AC-FR-154-1 | FR-154 | all reminders are off and the lead time shows 10 minutes |
| AC-FR-154-2 | FR-154 | 20 is shown |
| AC-FR-154-3 | FR-154 | 0 reminders are delivered |
| AC-FR-160-1 | FR-160 | it is 5 |
| AC-FR-160-2 | FR-160 | it is 4 and today is marked pending |
| AC-FR-160-3 | FR-160 | that day does not count |
| AC-FR-161-1 | FR-161 | the streak is 0 |
| AC-FR-161-2 | FR-161 | it is 1 |
| AC-FR-161-3 | FR-161 | it is not reset until the local day ends |
| AC-FR-162-1 | FR-162 | the freeze is consumed and the streak stays unchanged |
| AC-FR-162-2 | FR-162 | the streak resets to 0 |
| AC-FR-162-3 | FR-162 | 1 freeze is available again |
| AC-FR-163-1 | FR-163 | the longest becomes 12 |
| AC-FR-163-2 | FR-163 | it remains 12 |
| AC-FR-163-3 | FR-163 | both values are 0 |
| AC-FR-164-1 | FR-164 | the streak is 9 or higher right after the change |
| AC-FR-164-2 | FR-164 | that day does not reset the streak on the change day |
| AC-FR-164-3 | FR-164 | the longest remains 20 |
| AC-FR-170-1 | FR-170 | 25 XP is added |
| AC-FR-170-2 | FR-170 | 59 XP is added |
| AC-FR-170-3 | FR-170 | total XP is unchanged |
| AC-FR-171-1 | FR-171 | +20 XP is awarded |
| AC-FR-171-2 | FR-171 | no second +20 is awarded |
| AC-FR-171-3 | FR-171 | 0 bonus XP is awarded |
| AC-FR-172-1 | FR-172 | +10 XP is awarded |
| AC-FR-172-2 | FR-172 | 0 XP is awarded |
| AC-FR-172-3 | FR-172 | no second +10 is awarded |
| AC-FR-173-1 | FR-173 | only 10 XP is awarded |
| AC-FR-173-2 | FR-173 | 0 is added and the view states the cap is reached |
| AC-FR-173-3 | FR-173 | the daily counter starts at 0 |
| AC-FR-174-1 | FR-174 | 0 XP is awarded |
| AC-FR-174-2 | FR-174 | 0 XP is awarded |
| AC-FR-174-3 | FR-174 | 5 XP is awarded |
| AC-FR-175-1 | FR-175 | it is level 0 |
| AC-FR-175-2 | FR-175 | it is level 2 |
| AC-FR-175-3 | FR-175 | it is level 2 with 1 XP remaining to level 3 at 600 |
| AC-FR-176-1 | FR-176 | 0 new entries are created |
| AC-FR-176-2 | FR-176 | exactly 1 award exists |
| AC-FR-176-3 | FR-176 | total XP increases once |
| AC-FR-177-1 | FR-177 | a -30 entry is added and the original remains |
| AC-FR-177-2 | FR-177 | a -10 entry is added |
| AC-FR-177-3 | FR-177 | 0 entries are added |
| AC-FR-180-1 | FR-180 | exactly 4 options are shown: None, Rain, White noise, Cafe |
| AC-FR-180-2 | FR-180 | rain plays within 2 seconds |
| AC-FR-180-3 | FR-180 | audio stops |
| AC-FR-181-1 | FR-181 | playback volume is 40 |
| AC-FR-181-2 | FR-181 | no sound plays |
| AC-FR-181-3 | FR-181 | volume is still 40 |
| AC-FR-182-1 | FR-182 | 0 audio plays |
| AC-FR-182-2 | FR-182 | the selected loop starts within 2 seconds |
| AC-FR-182-3 | FR-182 | audio stops within 1 second |
| AC-FR-183-1 | FR-183 | Cafe at 60 is preselected |
| AC-FR-183-2 | FR-183 | None at 50 is the default |
| AC-FR-183-3 | FR-183 | the new choice replaces the old |
| AC-FR-184-1 | FR-184 | audio is silent within 1 second |
| AC-FR-184-2 | FR-184 | audio resumes within 2 seconds |
| AC-FR-184-3 | FR-184 | audio is silent |
| AC-FR-190-1 | FR-190 | the request form lists only topics of those exams' subjects and at least 1 topic must stay... |
| AC-FR-190-2 | FR-190 | the form is rejected with a message that hours must be between 1 and 168 |
| AC-FR-190-3 | FR-190 | exactly the sessions of the last 28 days are included as history and older sessions are not |
| AC-FR-190-4 | FR-190 | it is not selectable and the form states that only upcoming exams are allowed (BR-025) |
| AC-FR-191-1 | FR-191 | a progress state is shown within 1 second and the request is sent to the provider |
| AC-FR-191-2 | FR-191 | the request is stopped and an error is shown (EC-016) |
| AC-FR-191-3 | FR-191 | the second submission is ignored and only 1 request exists |
| AC-FR-191-4 | FR-191 | nothing is sent to the provider and the consent prompt is shown |
| AC-FR-192-1 | FR-192 | a consent dialog lists the data categories sent and no generation can start until they confirm |
| AC-FR-192-2 | FR-192 | it is unchecked by default |
| AC-FR-192-3 | FR-192 | the next generation attempt shows the consent dialog again and 0 requests are sent meanwhile |
| AC-FR-192-4 | FR-192 | no data is sent and the rest of the product keeps working unchanged |
| AC-FR-193-1 | FR-193 | 12 entries are listed with subject, date, start time and duration, and the user's plan... |
| AC-FR-193-2 | FR-193 | it shows "3 entries removed" |
| AC-FR-193-3 | FR-193 | that entry shows an overlap warning (BR-026) |
| AC-FR-193-4 | FR-193 | it is usable within the LCP threshold of NFR-001 and the overlap warning is not conveyed by... |
| AC-FR-194-1 | FR-194 | it is rejected; entries of 5 and 480 minutes are accepted |
| AC-FR-194-2 | FR-194 | it is rejected (BR-025) |
| AC-FR-194-3 | FR-194 | entries are dropped so the weekly total is at most 10 hours and the drop count is reported |
| AC-FR-194-4 | FR-194 | an error is shown and 0 entries are offered for acceptance |
| AC-FR-195-1 | FR-195 | exactly 12 plan entries are created and visible in the plan |
| AC-FR-195-2 | FR-195 | a confirmation naming the overlaps is required before any entry is saved (BR-026) |
| AC-FR-195-3 | FR-195 | 0 plan entries are created |
| AC-FR-195-4 | FR-195 | exactly 12 entries exist, not 24 |
| AC-FR-196-1 | FR-196 | it is refused with a message that the daily limit of 5 is reached |
| AC-FR-196-2 | FR-196 | the count stays 4 (EC-016) |
| AC-FR-196-3 | FR-196 | the count increases by 1 |
| AC-FR-196-4 | FR-196 | it displays remaining generations for today as a number from 0 to 5 |
| AC-FR-197-1 | FR-197 | an error message is shown within 2 seconds of detection and 0 plan entries are created |
| AC-FR-197-2 | FR-197 | the entered inputs are still present in the form |
| AC-FR-197-3 | FR-197 | it is unchanged from before the request |
| AC-FR-197-4 | FR-197 | it is ignored and not shown |
| AC-FR-198-1 | FR-198 | the request is disabled and a prompt to create an exam is shown |
| AC-FR-198-2 | FR-198 | the request is disabled and a prompt to add topics is shown |
| AC-FR-198-3 | FR-198 | the request is allowed and the history context is sent as empty |
| AC-FR-198-4 | FR-198 | submission is blocked until a value from 1 to 168 is given |
| AC-FR-200-1 | FR-200 | the group exists with 1 member and that user as its sole administrator |
| AC-FR-200-2 | FR-200 | creation is rejected and no group is created |
| AC-FR-200-3 | FR-200 | it succeeds and they hold 2 memberships, each with its own sharing setting |
| AC-FR-201-1 | FR-201 | a link valid for 7 days is shown |
| AC-FR-201-2 | FR-201 | using it afterwards fails |
| AC-FR-201-3 | FR-201 | joining is refused |
| AC-FR-201-4 | FR-201 | the action is denied |
| AC-FR-202-1 | FR-202 | they become the 20th member with sharing defaulting to off |
| AC-FR-202-2 | FR-202 | joining is refused and a new invite is required |
| AC-FR-202-3 | FR-202 | they return to the invite and can confirm |
| AC-FR-203-1 | FR-203 | they vanish from the member list and leaderboard immediately |
| AC-FR-203-2 | FR-203 | all their sessions and totals are unchanged |
| AC-FR-203-3 | FR-203 | it is blocked with a prompt to transfer administration or dissolve |
| AC-FR-203-4 | FR-203 | they cannot rejoin |
| AC-FR-204-1 | FR-204 | that member is gone from list and leaderboard immediately |
| AC-FR-204-2 | FR-204 | it is unchanged |
| AC-FR-204-3 | FR-204 | it is denied |
| AC-FR-204-4 | FR-204 | the action is refused and they are pointed to leave or transfer |
| AC-FR-205-1 | FR-205 | the group has 2 administrators |
| AC-FR-205-2 | FR-205 | the step down succeeds |
| AC-FR-205-3 | FR-205 | it is refused; at least 1 administrator remains |
| AC-FR-205-4 | FR-205 | the oldest member is promoted |
| AC-FR-206-1 | FR-206 | sharing is off |
| AC-FR-206-2 | FR-206 | the member's minutes are not shown |
| AC-FR-206-3 | FR-206 | their weekly total appears within 5 s |
| AC-FR-206-4 | FR-206 | their totals are hidden immediately |
| AC-FR-207-1 | FR-207 | those minutes are excluded |
| AC-FR-207-2 | FR-207 | it contributes 0 minutes |
| AC-FR-207-3 | FR-207 | they are ranked by weekly focused minutes in descending order |
| AC-FR-207-4 | FR-207 | they are not listed |
| AC-FR-208-1 | FR-208 | joining is refused |
| AC-FR-208-2 | FR-208 | 1 slot opens and a new join succeeds |
| AC-FR-208-3 | FR-208 | they are warned the group is full |
| AC-FR-209-1 | FR-209 | it is recorded and acknowledged |
| AC-FR-209-2 | FR-209 | it is rejected |
| AC-FR-209-3 | FR-209 | they are not notified of the reporter's identity |
| AC-FR-209-4 | FR-209 | a not-found response is returned |
| AC-FR-210-1 | FR-210 | the group and all its memberships are removed |
| AC-FR-210-2 | FR-210 | their sessions are unchanged |
| AC-FR-210-3 | FR-210 | it is denied |
| AC-FR-210-4 | FR-210 | joining fails |
| AC-FR-211-1 | FR-211 | 6 display names with roles appear |
| AC-FR-211-2 | FR-211 | no minutes are shown for them |
| AC-FR-211-3 | FR-211 | no subjects, notes or session details are visible |
| AC-FR-211-4 | FR-211 | they no longer appear |
| AC-FR-212-1 | FR-212 | all members see the new name |
| AC-FR-212-2 | FR-212 | it is rejected |
| AC-FR-212-3 | FR-212 | it is rejected with a reload prompt |
| AC-FR-212-4 | FR-212 | it is denied |
| AC-FR-220-1 | FR-220 | the full key is displayed once together with a warning that it cannot be shown again |
| AC-FR-220-2 | FR-220 | the full value is not shown and only name, creation date, scopes and last 4 characters are |
| AC-FR-220-3 | FR-220 | creation is refused with a message that the limit of 10 active keys is reached |
| AC-FR-220-4 | FR-220 | it is rejected with a message stating the allowed length 1-60 |
| AC-FR-221-1 | FR-221 | the response is 403 with error code "insufficient_scope" |
| AC-FR-221-2 | FR-221 | the response is 403 and no session is stored |
| AC-FR-221-3 | FR-221 | the response is 201 and the entry belongs to the key's owner |
| AC-FR-221-4 | FR-221 | the response is 404 as for a missing record |
| AC-FR-222-1 | FR-222 | the response is HTTP 429 |
| AC-FR-222-2 | FR-222 | it includes a retry-after value in seconds, between 1 and 60 |
| AC-FR-222-3 | FR-222 | the next request succeeds |
| AC-FR-222-4 | FR-222 | key 2 is still served normally |
| AC-FR-223-1 | FR-223 | the response is served normally |
| AC-FR-223-2 | FR-223 | the response is 404 with error code "unknown_version" |
| AC-FR-223-3 | FR-223 | the response is 404 and no data is returned |
| AC-FR-223-4 | FR-223 | responses carry a deprecation notice at least 90 days before removal |
| AC-FR-224-1 | FR-224 | 50 items are returned and a next-page reference is present |
| AC-FR-224-2 | FR-224 | the response is 400 with error code "invalid_page_size" |
| AC-FR-224-3 | FR-224 | it has no next-page reference |
| AC-FR-224-4 | FR-224 | the response is 400 and nothing is stored |
| AC-FR-225-1 | FR-225 | the body contains the fields "code", "message" and "details" |
| AC-FR-225-2 | FR-225 | "details" lists both fields with a reason each |
| AC-FR-225-3 | FR-225 | the body uses the same structure and the retry-after value is also given |
| AC-FR-225-4 | FR-225 | the response is 500 with the standard fields and no internal stack information |
| AC-FR-226-1 | FR-226 | the next request with that key returns 401 within 5 seconds of revocation |
| AC-FR-226-2 | FR-226 | it appears with status "revoked" and revocation date |
| AC-FR-226-3 | FR-226 | no such action exists and a new key must be created |
| AC-FR-226-4 | FR-226 | it is refused with 401 on the next call instead of 429 |

## 3. Non-functional acceptance criteria

Each criterion passes when the threshold is met using the stated method. Thresholds are proposed (see NON-FUNCTIONAL-REQUIREMENTS.md).

| AC ID | NFR ID | Pass/fail threshold | Measuring method |
|---|---|---|---|
| AC-NFR-001 | NFR-001 | Largest Contentful Paint <= 2.5 s for the dashboard (proposed) | Synthetic lab test on a throttled mid-tier mobile profile, 10 runs, median reported |
| AC-NFR-002 | NFR-002 | p95 <= 300 ms for reads and <= 500 ms for writes at 500 concurrent users (proposed) | Load test against a production-like environment |
| AC-NFR-003 | NFR-003 | Statistics for 24 months / 10,000 sessions respond p95 <= 1 s (proposed) | Load test with a seeded account of 10,000 sessions |
| AC-NFR-004 | NFR-004 | Start, pause, resume and stop acknowledged in the UI <= 200 ms (proposed) | Automated UI timing test, 50 repetitions, 95th percentile |
| AC-NFR-005 | NFR-005 | Export of an account with 10,000 sessions <= 60 s (proposed) | Timed export on a seeded account |
| AC-NFR-010 | NFR-010 | TLS 1.2 or higher on every connection; plain HTTP is refused or redirected (proposed) | Configuration scan; external TLS test |
| AC-NFR-011 | NFR-011 | Passwords >= 10 characters; stored only as salted adaptive hashes, never reversible (proposed) | Policy test on sign-up/reset; code and data review |
| AC-NFR-012 | NFR-012 | Account locked for 15 min after 5 consecutive failed sign-ins on that account (proposed) | Automated test: 5 failures then correct password is refused for 15 min |
| AC-NFR-013 | NFR-013 | Sign-in session expires after 30 days of inactivity; user can revoke any session and revocation takes effect <= 60 s (proposed) | Automated test with clock control; manual revoke test |
| AC-NFR-014 | NFR-014 | State-changing requests are protected against cross-site request forgery; all rendered user content is escaped against cross-site scripting (proposed) | Security test cases; penetration test checklist |
| AC-NFR-015 | NFR-015 | Rendered notes contain no executable script, event handlers or unsafe links; 0 failures on an XSS payload corpus (proposed) | Automated test with an XSS payload corpus |
| AC-NFR-016 | NFR-016 | Every request to a resource is checked against ownership; a user can never read or change another user's data (proposed) | Automated cross-user access tests for every resource; any failure is severity 1 |
| AC-NFR-017 | NFR-017 | OWASP ASVS Level 1 requirements satisfied (proposed) | Checklist audit before release |
| AC-NFR-018 | NFR-018 | Vulnerability scan on each release; 0 known critical or high findings unresolved at release (proposed) | Scan report attached to release |
| AC-NFR-019 | NFR-019 | No credential, key or private configuration is delivered to the browser (proposed) | Static review of the shipped client bundle |
| AC-NFR-020 | NFR-020 | Sign-in, failed sign-in, lockout, password reset, session revoke and account deletion events are recorded and retained 90 days (proposed) | Test that each event produces a record; retention check |
| AC-NFR-021 | NFR-021 | API keys stored only as hashes and shown once at creation (proposed) | Data review; creation-flow test |
| AC-NFR-030 | NFR-030 | Personal data collected is limited to what a documented FR needs; no field is collected without an FR (proposed) | Review of collected fields against FR list at each release |
| AC-NFR-031 | NFR-031 | After account deletion, personal data is purged within 30 days and from backups within 35 days (proposed) | Deletion test; backup purge audit |
| AC-NFR-032 | NFR-032 | A user can export all own data at any time without staff involvement | Functional test of export |
| AC-NFR-033 | NFR-033 | No third-party advertising or cross-site tracking scripts (proposed) | Network inspection of all pages |
| AC-NFR-034 | NFR-034 | Product analytics, if any, contain no name, email or free text and cannot be re-linked to an account (proposed) | Data review of analytics events |
| AC-NFR-035 | NFR-035 | Users must confirm they are 16 or older at sign-up; see inconsistency I-3 and decision U-6 (proposed) | Sign-up flow test |
| AC-NFR-036 | NFR-036 | Study data is sent to an AI provider only after explicit, per-feature, revocable consent (proposed) | Flow test; no outbound call without consent |
| AC-NFR-037 | NFR-037 | Each user's data is shared with a group only for fields the user has opted into (proposed) | Cross-member visibility tests |
| AC-NFR-040 | NFR-040 | WCAG 2.2 level AA (proposed) | Automated scan plus manual audit of core flows |
| AC-NFR-041 | NFR-041 | Every function, including the timer and calendar, is operable by keyboard alone with visible focus (proposed) | Manual keyboard walkthrough of all MVP flows |
| AC-NFR-042 | NFR-042 | Every drag-and-drop action has a keyboard-operable equivalent (proposed; R7) | Manual test of each drag action by keyboard |
| AC-NFR-043 | NFR-043 | Heatmap cells, priorities and goal states also carry text or numeric values (proposed) | Review in grayscale and with color-blindness simulation |
| AC-NFR-044 | NFR-044 | Timer state changes (started, paused, resumed, interval ended, stopped) are announced; the per-second count is not (proposed) | Screen-reader test on two readers |
| AC-NFR-045 | NFR-045 | Honors reduced-motion and color-scheme preferences (proposed) | Test with each preference set |
| AC-NFR-050 | NFR-050 | Monthly availability >= 99.5% excluding announced maintenance (proposed; U-5) | Uptime monitoring report |
| AC-NFR-051 | NFR-051 | No loss on refresh, tab close or network drop of <= 30 min (BR-006) | Fault-injection test cases for each trigger |
| AC-NFR-052 | NFR-052 | Saved duration within +/- 2 s of server wall-clock time (USER-JOURNEYS journey 4) | Automated comparison over runs of 1, 25 and 120 min, including a background tab |
| AC-NFR-053 | NFR-053 | Retrying a session save or XP award never creates a duplicate (EC-017, EC-021) | Replay tests sending each request twice |
| AC-NFR-054 | NFR-054 | A failed save shows an error with a retry action; unsaved note content is kept locally until saved (proposed) | Network-failure test during save |
| AC-NFR-060 | NFR-060 | The web client reaches data only through the internal API; it is not a public contract, undocumented externally and unsupported until Phase 3 (inconsistency I-8) | Architecture review |
| AC-NFR-061 | NFR-061 | Every business rule BR-001..BR-032 has at least one automated test | Traceability report (REQUIREMENT-TRACEABILITY.md section d) |
| AC-NFR-062 | NFR-062 | Numeric defaults (BR-007..BR-009, BR-013, XP values, review limit) are defined in one configurable place, not duplicated in code (proposed) | Code review; changing a value changes all behavior |
| AC-NFR-063 | NFR-063 | Every request logs a request ID and outcome in structured form; no passwords, tokens or note content are logged (proposed) | Log sampling test |
| AC-NFR-070 | NFR-070 | 10,000 registered users, 1,000 concurrent users, 5 million stored sessions (proposed) | Load test at target volumes |
| AC-NFR-071 | NFR-071 | Capacity can grow by adding resources, with no redesign of the data model; access by user and date is efficient and pre-computed aggregates can be added later (proposed) | Architecture review |
| AC-NFR-072 | NFR-072 | With 10x per-user data, statistics still meet NFR-003 (proposed) | Load test with 100,000-session account |
| AC-NFR-080 | NFR-080 | Latest 2 major versions of Chrome, Edge, Firefox and Safari (proposed) | Cross-browser test run of MVP E2E scenarios |
| AC-NFR-081 | NFR-081 | Safari on iOS 16+ and Chrome on Android, latest 2 major versions (proposed) | Cross-device test run |
| AC-NFR-082 | NFR-082 | Internet Explorer is not supported; unsupported browsers see a notice and not a broken page (proposed) | Test with an unsupported user agent |
| AC-NFR-085 | NFR-085 | 360 to 2560 px viewport width (proposed) | Visual and automated checks at 360, 768, 1280, 2560 px |
| AC-NFR-086 | NFR-086 | No horizontal page scroll at 360 px width (proposed) | Automated check on all MVP pages |
| AC-NFR-087 | NFR-087 | Interactive targets >= 44 x 44 px on touch devices (proposed) | Automated measurement plus manual review |
| AC-NFR-088 | NFR-088 | Starting, pausing and stopping a session is fully usable on a 360 px phone (proposed) | Manual phone test |
| AC-NFR-090 | NFR-090 | Durations are computed from stored start and end timestamps, never from tick counts | Test with throttled tab and wrong client clock (EC-010) |
| AC-NFR-091 | NFR-091 | Timestamps stored in UTC; each session keeps the timezone and local date at its start and they are never recomputed | Timezone-change and DST test cases |
| AC-NFR-092 | NFR-092 | No session, plan entry, to-do, note or exam exists without an owning user; links to deleted parents never dangle (proposed) | Integrity checks; deletion tests |
| AC-NFR-093 | NFR-093 | Archived subjects and topics keep history and statistics; hard purge happens only through account deletion | Archive/restore tests (EC-007, EC-008) |
| AC-NFR-094 | NFR-094 | Every editable record carries a version; a save on a stale version is rejected, never silently overwrites | Two-tab edit test |
| AC-NFR-095 | NFR-095 | Each XP award is unique per user, source event and rule | Duplicate-award tests |
| AC-NFR-096 | NFR-096 | Totals shown in statistics equal the sum of session durations for the same period, with 0 minutes difference (proposed) | Automated reconciliation test over seeded data |
| AC-NFR-100 | NFR-100 | Daily automated backups, retained 30 days (proposed) | Backup job report |
| AC-NFR-101 | NFR-101 | RPO <= 24 h (proposed; U-5) | Restore drill measurement |
| AC-NFR-102 | NFR-102 | RTO <= 8 h (proposed; U-5) | Restore drill measurement |
| AC-NFR-103 | NFR-103 | A restore drill is run every quarter and its result recorded (proposed) | Drill log |
| AC-NFR-104 | NFR-104 | After any restore, accounts deleted before the restore are purged again before service resumes (proposed) | Restore drill includes a deletion check |

## 4. MVP end-to-end acceptance scenarios

| AC ID | Scenario | Related requirements | Criterion |
|---|---|---|---|
| AC-E2E-01 | New user signs up, finishes onboarding and saves a first session within 3 minutes | FR-001, FR-134..137, FR-050, FR-040 | Given a new visitor, when they register, complete the onboarding wizard (goal 120 min default, timezone confirmed) and run a guided stopwatch session of at least 1 min, then the session is saved and the whole path takes <= 3 min of user time. |
| AC-E2E-02 | Core loop: plan, timer, record, statistics shows planned versus actual | FR-030, FR-041, FR-050, FR-040, FR-085, FR-036 | Given a plan entry of 30 min for a subject, when the user starts a timer linked to it, studies 20 min and stops, then statistics show planned 30, actual 20 and variance -10 min (BR-004), and planned and actual are stored separately (BR-002). |
| AC-E2E-03 | Refresh during a running timer recovers elapsed time | FR-054, FR-040 | Given a timer running for 10 min, when the page is refreshed, then the timer reappears within 2 s showing elapsed time within +/- 2 s of server time and keeps running; the saved session at stop has the correct duration (NFR-052, EC-001). |
| AC-E2E-04 | Second device start is rejected with a prompt | FR-053, FR-059 | Given a timer running on device A, when the user starts a timer on device B, then the start is rejected with the prompt "Stop current session and start new?"; confirming stops A at server time and starts B; device A converges to the stopped state within 5 s (EC-002, EC-020). |
| AC-E2E-05 | Midnight split yields two day totals | FR-047, FR-061, FR-080 | Given a session from 23:50 to 00:20 in the profile timezone, when it is saved, then the day before shows 10 min, the next day 20 min, and the session is displayed once with two day-allocations (BR-016, EC-009). |
| AC-E2E-06 | Timezone change keeps past days | FR-006, FR-072, FR-089 | Given sessions recorded in timezone A, when the user changes the profile timezone to B, then past sessions keep their original local date, today's progress counts only sessions whose frozen local date equals today's date in B, and no past day total changes (EC-006). |
| AC-E2E-07 | Archiving a subject retains statistics | FR-013, FR-083, FR-014 | Given a subject with 300 min of sessions, when it is archived, then statistics still include 300 min labelled "<name> (archived)", the subject is absent from pickers, and restoring it returns it to pickers (BR-029, EC-007). |
| AC-E2E-08 | Exam countdown and topic checklist | FR-120, FR-122, FR-123 | Given an exam 10 days ahead with 4 topics, when the user opens it, then "10 days" remaining is shown with a checklist of the 4 topics, and ticking one topic shows 3 remaining (BR-023). Readiness percentage is checked in Phase 2 (FR-126). |
| AC-E2E-09 | Export reconciles with statistics | FR-130, FR-131; FR-080, FR-082 | Given an account with 50 sessions, when the user exports CSV and JSON, then the sum of session durations in each file equals the statistics total for the same period with 0 min difference (NFR-096, EC-027). |
| AC-E2E-10 | Unauthorized access to another user's record returns not found | FR-010, FR-040, NFR-016 | Given user A's subject and session, when user B requests either by identifier, then the response is not found (not forbidden) and no field of A's record is returned; the same holds when unauthenticated requests are redirected to login with the target preserved (FR-002). |

## 5. MVP Definition of Done

The MVP is accepted when all of the following hold:

1. Every FR with priority Must Have and Phase MVP passes all of its acceptance criteria.
2. Every FR with priority Should Have and Phase MVP passes its criteria, or an explicit written waiver exists per FR approved by the product owner.
3. AC-E2E-01 to AC-E2E-10 pass.
4. Every NFR with Phase MVP has been measured and meets its threshold (section 3).
5. Every business rule BR-001..BR-032 that applies to the MVP has at least one passing automated test (NFR-061); BR-017..BR-022 (Phase 2) are excluded.
6. Zero open severity-1 or severity-2 defects. Severity 1: data loss, cross-user data exposure, or a core-loop blocker. Severity 2: a Must Have criterion fails with no workaround.
7. The WCAG 2.2 AA audit (NFR-040) is passed on the core flows.
8. No Phase 2 or Phase 3 behavior is reachable in the MVP build.
