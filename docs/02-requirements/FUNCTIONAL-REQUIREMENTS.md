# Lumora Functional Requirements

> Status: Proposal, pending approval. Source of truth: Phase 1 docs.

## 0. Conventions

- Each requirement is one `####` block with the fields ID, Feature, Description, User story, Acceptance criteria, Priority, Phase, Dependencies, Business rules, Expected system behavior, Errors and edge cases.
- Acceptance criteria IDs are `AC-FR-XXX-n`. Test cases are planned in REQUIREMENT-TRACEABILITY.md.
- Priority mapping from `docs/FEATURE-PRIORITIZATION.md` (MoSCoW): Must -> Must Have; Should -> Should Have; Could (Phase 2) -> Could Have; Won't (now) (Phase 3) -> Won't Have (this release; specified for forward planning). A sub-requirement may be Should Have inside a Must Have feature.
- Business rules BR-001..BR-032 are cited by ID and are defined in `docs/01-product-discovery/BUSINESS-RULES.md`. Edge cases EC-001..EC-028 are defined in EDGE-CASES.md. NFR IDs are defined in NON-FUNCTIONAL-REQUIREMENTS.md.
- FR ID gaps are intentional (room for additions within a group).
- Numeric values not fixed by Phase 1 are proposals.

## 1. Authentication and profile

Must Have, MVP (FR-008 and FR-009 are Should Have, MVP). Covers account creation, sign-in with email and password or Google, logout, password reset, profile (display name, IANA timezone, day rollover hour), session management and account deletion.

#### FR-001 — Register with email and password
**ID**: FR-001
**Feature**: Authentication and profile
**Description**: A guest creates an account with an email address and a password of at least 10 characters. The timezone is pre-filled from the browser as an IANA name and the user must confirm the user is 16 or older. All day-based computations use the stored timezone.
**User story**: As a Guest, I want to register with email and password, so that I can start tracking my study time.
**Acceptance criteria**:
1. AC-FR-001-1 — Given a guest on the sign-up form, when they submit a valid unused email, a 10-character password and the age confirmation, then an account is created, the user is signed in and the timezone is saved as an IANA name.
2. AC-FR-001-2 — Given a password of 9 characters, when the form is submitted, then registration is rejected and no account exists.
3. AC-FR-001-3 — Given the age confirmation is not ticked, when the form is submitted, then no account is created.
**Priority**: Must Have
**Phase**: MVP
**Dependencies**: NFR-010, NFR-011, NFR-030, NFR-035
**Business rules**: BR-030
**Expected system behavior**: The system stores the password only as a salted adaptive hash, stores the timezone, creates the account with default daily goal 120 minutes and signs the user in. Timestamps are stored in UTC.
**Errors and edge cases**: Email already registered: tell the user the email cannot be used, without confirming which accounts exist beyond a generic prompt to log in or reset. Invalid email format and short password: field-level messages stating the requirement. Unknown or invalid browser timezone: user must pick one from a list. EC-006: the timezone saved at registration is the baseline for later timezone changes.

#### FR-002 — Log in with email and password
**ID**: FR-002
**Feature**: Authentication and profile
**Description**: A guest authenticates with email and password. After 5 consecutive failures on one account, further attempts are locked for 15 minutes. A successful login starts a session that expires after 30 days of inactivity.
**User story**: As a Guest, I want to log in with my email and password, so that I can access my study data.
**Acceptance criteria**:
1. AC-FR-002-1 — Given a registered account, when the correct credentials are submitted, then the user is signed in and lands on their dashboard.
2. AC-FR-002-2 — Given 5 consecutive failed attempts on one account, when a 6th attempt is made within 15 minutes, then it is refused even with the correct password.
3. AC-FR-002-3 — Given a signed-in session idle for 30 days, when the user returns, then they are asked to log in again.
4. AC-FR-002-4 — Given a wrong email or wrong password, when submitted, then the same generic message is shown in both cases.
**Priority**: Must Have
**Phase**: MVP
**Dependencies**: NFR-011, NFR-012, NFR-013
**Business rules**: None
**Expected system behavior**: The system verifies credentials, counts consecutive failures per account, resets the count on success, and creates a revocable sign-in. An unauthenticated request to a protected page redirects to login and returns to the target after success.
**Errors and edge cases**: Wrong credentials: generic message that does not reveal which part was wrong. Locked account: message stating the lock lasts 15 minutes and offering password reset. No registered edge case.

#### FR-003 — Sign in with Google
**ID**: FR-003
**Feature**: Authentication and profile
**Description**: A guest authenticates with a Google account. If no account exists for the verified Google email one is created; otherwise the existing account is signed in. Google is the only third-party sign-in provider.
**User story**: As a Guest, I want to sign in with Google, so that I do not need another password.
**Acceptance criteria**:
1. AC-FR-003-1 — Given a guest with a verified Google account and no Lumora account, when they complete Google sign-in, then an account is created and they are signed in with timezone pre-filled from the browser.
2. AC-FR-003-2 — Given an existing account with the same verified email, when the user completes Google sign-in, then that account is signed in and no second account exists.
3. AC-FR-003-3 — Given the user cancels at Google, when returning to Lumora, then no account is created and the login page shows a cancellation notice.
**Priority**: Must Have
**Phase**: MVP
**Dependencies**: NFR-010, NFR-013
**Business rules**: None
**Expected system behavior**: The system accepts only a verified Google email, stores no Google password, creates a revocable sign-in and applies the same age confirmation as FR-001 for new accounts.
**Errors and edge cases**: Provider failure or denied consent: message that sign-in did not complete with a retry action. Unverified Google email: refused with explanation. No registered edge case.

#### FR-004 — Log out
**ID**: FR-004
**Feature**: Authentication and profile
**Description**: A signed-in user ends the current sign-in. The server invalidates it so it cannot be reused. Other sign-ins remain unaffected.
**User story**: As a Registered User, I want to log out, so that my account is safe on shared devices.
**Acceptance criteria**:
1. AC-FR-004-1 — Given a signed-in user, when they choose log out, then the current sign-in is invalidated and the login page is shown.
2. AC-FR-004-2 — Given a logged-out browser, when the Back button is used, then no private data is displayed and a login redirect occurs.
3. AC-FR-004-3 — Given a second device signed in, when this device logs out, then the second device stays signed in.
**Priority**: Must Have
**Phase**: MVP
**Dependencies**: NFR-013
**Business rules**: None
**Expected system behavior**: The system revokes the current sign-in server-side. A running timer is not stopped by logout; it remains running on the server and visible from other sign-ins.
**Errors and edge cases**: Logout request fails (network): message that logout is not confirmed and a retry action. No registered edge case.

#### FR-005 — Reset a forgotten password
**ID**: FR-005
**Feature**: Authentication and profile
**Description**: A guest requests a reset link by email and sets a new password of at least 10 characters. The link is single-use and valid for 60 minutes. Completing a reset revokes all existing sign-ins.
**User story**: As a Guest, I want to reset my password by email, so that I regain access to my account.
**Acceptance criteria**:
1. AC-FR-005-1 — Given any submitted email address, when a reset is requested, then the same neutral confirmation is shown whether or not an account exists.
2. AC-FR-005-2 — Given a valid link used within 60 minutes, when a 10-character new password is submitted, then the password changes and all previous sign-ins are revoked.
3. AC-FR-005-3 — Given a link already used or older than 60 minutes, when opened, then the password is not changed and a new request is offered.
**Priority**: Must Have
**Phase**: MVP
**Dependencies**: NFR-011, NFR-012, NFR-020
**Business rules**: None
**Expected system behavior**: The system emails a single-use link, applies password rules from FR-001, clears any lockout on success and records the event in the authentication audit log.
**Errors and edge cases**: Expired or used link: message stating it is no longer valid with a way to request another. Password too short: field message stating the 10-character minimum. Account created only with Google has no password: reset lets them set one. No registered edge case.

#### FR-006 — Edit profile display name and timezone
**ID**: FR-006
**Feature**: Authentication and profile
**Description**: A user changes the display name (1 to 50 characters) and the timezone, chosen as an IANA name. Existing sessions keep the local date frozen at their start. Changing timezone applies to day computations from the change onward.
**User story**: As a Registered User, I want to edit my display name and timezone, so that my daily progress follows the place where I study.
**Acceptance criteria**:
1. AC-FR-006-1 — Given a user with display name "Ana", when they save "Ana M", then the new name is shown everywhere immediately.
2. AC-FR-006-2 — Given a display name of 51 characters, when saved, then it is rejected and the old name is kept.
3. AC-FR-006-3 — Given a timezone change, when saved, then past sessions keep their original local date and today's progress counts sessions whose frozen local date equals today's date in the new timezone.
4. AC-FR-006-4 — Given a timezone change, when saved, then an existing streak value is unchanged.
**Priority**: Must Have
**Phase**: MVP
**Dependencies**: NFR-091
**Business rules**: BR-030
**Expected system behavior**: The system validates the zone against the IANA list, stores it and uses it for all subsequent day computations. Past records are never recomputed.
**Errors and edge cases**: Empty or over-long name: message stating the 1-50 limit. Unknown timezone: must select from the list. EC-006: timezone change never rewrites past local dates, never reduces a streak, and DST days of 23 or 25 hours do not alter durations.

#### FR-007 — Delete account with 30-day purge
**ID**: FR-007
**Feature**: Authentication and profile
**Description**: A user permanently deletes the account after re-entering the password (or confirming through Google) and typing a confirmation. All personal data is purged within 30 days and from backups within 35 days. The user may export first.
**User story**: As a Registered User, I want to delete my account and data, so that I keep ownership of my data.
**Acceptance criteria**:
1. AC-FR-007-1 — Given a signed-in user, when they confirm deletion with a correct password, then all sign-ins are revoked and the account can no longer log in.
2. AC-FR-007-2 — Given a deleted account, when 30 days have elapsed, then no personal data of that user remains in live storage.
3. AC-FR-007-3 — Given a wrong password at confirmation, when submitted, then the account is not deleted.
4. AC-FR-007-4 — Given a running timer at deletion, when confirmed, then the timer is discarded and no session is saved.
**Priority**: Must Have
**Phase**: MVP
**Dependencies**: NFR-031, NFR-104
**Business rules**: BR-032
**Expected system behavior**: The system immediately blocks access, discards any running timer, removes group memberships, and schedules purge within 30 days. Data of deleted accounts is purged again if a backup is restored.
**Errors and edge cases**: Wrong password or missing confirmation text: message that deletion was not performed. EC-019: account deleted while in groups or with a running timer discards the timer, removes memberships and purges per NFR-031.

#### FR-008 — View and revoke active sign-ins
**ID**: FR-008
**Feature**: Authentication and profile
**Description**: A user sees a list of active sign-ins with device description, approximate last-active time and a marker for the current one. The user can revoke any other sign-in, or all others at once.
**User story**: As a Registered User, I want to see and revoke my active sign-ins, so that I can cut off a lost or unknown device.
**Acceptance criteria**:
1. AC-FR-008-1 — Given 3 active sign-ins, when the user opens the list, then 3 rows are shown with the current one marked.
2. AC-FR-008-2 — Given a listed sign-in, when the user revokes it, then that sign-in is rejected on its next request.
3. AC-FR-008-3 — Given the user chooses revoke all others, when confirmed, then only the current sign-in stays active.
**Priority**: Should Have
**Phase**: MVP
**Dependencies**: NFR-013, NFR-020
**Business rules**: None
**Expected system behavior**: The system revokes the chosen sign-ins immediately and records each revocation in the authentication audit log kept 90 days.
**Errors and edge cases**: Sign-in already expired or revoked: message that it is no longer active and the list refreshes. Cannot revoke the current sign-in here; logout (FR-004) is offered. No registered edge case.

#### FR-009 — Configure day rollover hour
**ID**: FR-009
**Feature**: Authentication and profile
**Description**: A user sets the hour at which a study day begins as an integer 0 to 23, default 0. Days are computed in the profile timezone. The setting applies from the change onward and does not change past records.
**User story**: As a Registered User, I want to set when my study day rolls over, so that late-night study counts toward the day I consider it.
**Acceptance criteria**:
1. AC-FR-009-1 — Given the default of 0, when a user views settings, then the rollover hour shows 0.
2. AC-FR-009-2 — Given rollover hour 4, when a session is recorded at 02:00 local time, then it counts toward the previous calendar day.
3. AC-FR-009-3 — Given a value of 24 or -1, when saved, then it is rejected and the old value is kept.
4. AC-FR-009-4 — Given a changed rollover hour, when saved, then days already recorded keep their assigned local dates.
**Priority**: Should Have
**Phase**: MVP
**Dependencies**: NFR-091
**Business rules**: BR-014
**Expected system behavior**: The system stores the integer and uses it with the profile timezone as the day boundary for progress, statistics and midnight splitting. Past assignments are not recomputed.
**Errors and edge cases**: Non-integer or out-of-range value: message stating allowed values 0 to 23. EC-006: DST days may last 23 or 25 hours and BR-014 still applies; durations are unaffected.


## 2. Subjects and topics

Must Have, MVP (FR-012 and FR-017 are Should Have, MVP). Covers creation, editing, ordering, archiving and restoring of subjects and topics, bulk topic entry and topic status.

#### FR-010 — Create a subject
**ID**: FR-010
**Feature**: Subjects and topics
**Description**: A user creates a subject with a name of 1 to 100 characters and a color from a fixed palette. Names are unique among the user's active subjects, case-insensitive. A new subject is placed last in order.
**User story**: As a Registered User, I want to create a subject, so that I can attribute study time to it.
**Acceptance criteria**:
1. AC-FR-010-1 — Given a name of 100 characters and a color, when saved, then the subject is created and listed last.
2. AC-FR-010-2 — Given a name of 101 characters or an empty name, when saved, then it is rejected.
3. AC-FR-010-3 — Given an active subject "Math", when creating "math", then it is rejected as duplicate.
4. AC-FR-010-4 — Given a subject archived under the name "Math", when creating "Math", then creation is allowed.
**Priority**: Must Have
**Phase**: MVP
**Dependencies**: NFR-016
**Business rules**: BR-029
**Expected system behavior**: The system saves the subject owned by the user, visible only to them, and offers it in pickers across planning, timer, to-dos and notes.
**Errors and edge cases**: Empty or over-long name: message stating the 1-100 limit. Duplicate active name: message that the name is in use. No registered edge case.

#### FR-011 — Edit subject name and color
**ID**: FR-011
**Feature**: Subjects and topics
**Description**: A user changes the name or color of an active subject. Constraints equal FR-010. Changes appear on all existing sessions and plan entries of that subject. Saves carry a record version.
**User story**: As a Registered User, I want to edit a subject's name and color, so that my subjects stay accurate.
**Acceptance criteria**:
1. AC-FR-011-1 — Given subject "Math", when renamed to "Maths", then all past sessions and statistics show "Maths".
2. AC-FR-011-2 — Given a rename to an existing active name, when saved, then it is rejected.
3. AC-FR-011-3 — Given the subject was changed on another device after it was opened, when saving, then the save is rejected with a changed-elsewhere message and the latest data is reloaded.
**Priority**: Must Have
**Phase**: MVP
**Dependencies**: NFR-094
**Business rules**: None
**Expected system behavior**: The system validates, increments the version and updates the subject; history is linked by identity not name.
**Errors and edge cases**: Validation errors as FR-010. EC-020: stale version is rejected with a 'changed elsewhere' message and a reload.

#### FR-012 — Reorder subjects
**ID**: FR-012
**Feature**: Subjects and topics
**Description**: A user changes the display order of active subjects using drag handles or up/down controls. The order is saved per user and used in all subject pickers and lists.
**User story**: As a Registered User, I want to reorder my subjects, so that the most-used ones come first.
**Acceptance criteria**:
1. AC-FR-012-1 — Given 5 subjects, when the user moves the 5th to position 1, then the list shows it first after reload.
2. AC-FR-012-2 — Given keyboard only use, when the user activates move-up on the 3rd subject, then it becomes 2nd.
3. AC-FR-012-3 — Given an archived subject, when the list is reordered, then it is not included in the ordering.
**Priority**: Should Have
**Phase**: MVP
**Dependencies**: NFR-094, NFR-041, NFR-042
**Business rules**: None
**Expected system behavior**: The system stores positions as a contiguous order of active subjects and returns them in that order everywhere.
**Errors and edge cases**: Save failure: message that the order was not saved with the previous order restored. No registered edge case.

#### FR-013 — Archive (soft-delete) a subject
**ID**: FR-013
**Feature**: Subjects and topics
**Description**: A user archives a subject after confirmation. History and statistics are retained and shown labelled "<name> (archived)". Archiving is blocked while a session runs on that subject.
**User story**: As a Registered User, I want to archive a subject, so that I can tidy my list without losing history.
**Acceptance criteria**:
1. AC-FR-013-1 — Given a subject with 40 sessions, when archived, then all 40 sessions remain in statistics labelled "<name> (archived)".
2. AC-FR-013-2 — Given a running timer on the subject, when archive is attempted, then it is blocked with a message.
3. AC-FR-013-3 — Given an archived subject, when opening pickers, then it and its topics are absent.
**Priority**: Must Have
**Phase**: MVP
**Dependencies**: NFR-093
**Business rules**: BR-029
**Expected system behavior**: The system marks the subject archived, hides its open plan entries and to-dos and its topics from pickers, and keeps them for restore. Hard removal occurs only through account deletion.
**Errors and edge cases**: Running session: message asking to stop the timer first. Confirmation declined: nothing changes. EC-007: soft-delete with retained history, open plan entries and to-dos hidden and restored on restore.

#### FR-014 — Restore an archived subject
**ID**: FR-014
**Feature**: Subjects and topics
**Description**: A user restores a subject from the archived list. Its topics, open plan entries and to-dos reappear. If an active subject has the same name, the user must rename one.
**User story**: As a Registered User, I want to restore an archived subject, so that I can resume studying it.
**Acceptance criteria**:
1. AC-FR-014-1 — Given an archived subject, when restored, then it appears last among active subjects.
2. AC-FR-014-2 — Given restoration, when complete, then its previously hidden open plan entries and to-dos are visible again.
3. AC-FR-014-3 — Given an active subject of the same name, when restoring, then the user is asked for a new name before restoring.
**Priority**: Must Have
**Phase**: MVP
**Dependencies**: NFR-093
**Business rules**: BR-029
**Expected system behavior**: The system flips the subject to active, un-hides dependent records and keeps all history unchanged.
**Errors and edge cases**: Name conflict: message requesting a different name. Subject not found or not owned: not-found response. EC-007: restore only from the archived list; nothing was hard deleted.

#### FR-015 — Create a topic with optional weight
**ID**: FR-015
**Feature**: Subjects and topics
**Description**: A user adds a topic to an active subject with a name of 1 to 150 characters and an optional integer weight from 1 to 5 (default 1). Weights drive exam readiness. Topic status starts as Not started.
**User story**: As a Registered User, I want to add topics with an optional weight, so that I can track progress inside a subject.
**Acceptance criteria**:
1. AC-FR-015-1 — Given a subject, when a topic is added without weight, then its weight is 1 and status Not started.
2. AC-FR-015-2 — Given weight 5, when saved, then accepted; given 0 or 6 or 2.5, then rejected.
3. AC-FR-015-3 — Given a name of 151 characters, when saved, then it is rejected.
**Priority**: Must Have
**Phase**: MVP
**Dependencies**: NFR-016
**Business rules**: None
**Expected system behavior**: The system saves the topic under the subject, ordered last, owned by the user.
**Errors and edge cases**: Out-of-range or non-integer weight: message stating integer 1 to 5. Invalid name: message stating length limit. Archived subject: cannot add topics. No registered edge case.

#### FR-016 — Edit and reorder topics
**ID**: FR-016
**Feature**: Subjects and topics
**Description**: A user renames a topic, changes its weight, and reorders topics within a subject. Constraints equal FR-015. Saves carry a record version.
**User story**: As a Registered User, I want to edit and reorder topics, so that the topic list matches my syllabus.
**Acceptance criteria**:
1. AC-FR-016-1 — Given a topic weight 1, when changed to 3, then it saves and exam readiness uses 3 afterward.
2. AC-FR-016-2 — Given 4 topics, when the 4th is moved to position 2, then order persists after reload.
3. AC-FR-016-3 — Given a stale version, when saving, then the save is rejected with a changed-elsewhere message.
**Priority**: Must Have
**Phase**: MVP
**Dependencies**: NFR-094, NFR-041, NFR-042
**Business rules**: None
**Expected system behavior**: The system validates, increments the version and stores the order; sessions linked to the topic keep their link.
**Errors and edge cases**: Validation as FR-015. EC-020: stale version rejected with 'changed elsewhere' and a reload.

#### FR-017 — Bulk paste a topic list
**ID**: FR-017
**Feature**: Subjects and topics
**Description**: A user pastes text with one topic per line to add many topics at once. Blank lines are ignored, whitespace is trimmed, and at most 200 lines are accepted. A preview shows the topics before saving.
**User story**: As a Registered User, I want to paste a list of topics, so that setup takes seconds.
**Acceptance criteria**:
1. AC-FR-017-1 — Given 30 non-empty lines, when confirmed in preview, then 30 topics with weight 1 are created in order.
2. AC-FR-017-2 — Given 201 non-empty lines, when submitted, then nothing is saved and a message states the 200 limit.
3. AC-FR-017-3 — Given blank lines and a line over 150 characters, when previewed, then blanks are ignored and the long line is flagged and excluded until fixed.
**Priority**: Should Have
**Phase**: MVP
**Dependencies**: NFR-001
**Business rules**: None
**Expected system behavior**: The system parses lines, shows the preview, and saves all valid lines atomically only after confirmation. Duplicates of existing names are flagged.
**Errors and edge cases**: Over 200 lines: message with the limit. Invalid lines: flagged individually. Save failure: nothing partially saved. No registered edge case.

#### FR-018 — Archive and restore a topic
**ID**: FR-018
**Feature**: Subjects and topics
**Description**: A user archives a topic after confirmation and can restore it from the archived list of its subject. Sessions keep their subject and show the topic as archived.
**User story**: As a Registered User, I want to archive and restore topics, so that finished or wrong topics do not clutter lists.
**Acceptance criteria**:
1. AC-FR-018-1 — Given a topic with 5 sessions, when archived, then the 5 sessions remain with the subject and show the topic as archived.
2. AC-FR-018-2 — Given an archived topic, when pickers open, then it is absent.
3. AC-FR-018-3 — Given an archived topic, when restored, then it reappears in pickers with its prior status and weight.
**Priority**: Must Have
**Phase**: MVP
**Dependencies**: NFR-093
**Business rules**: BR-029
**Expected system behavior**: The system soft-deletes the topic. Exam checklists drop it from the readiness denominator and note the change; restore returns it.
**Errors and edge cases**: Topic not found or not owned: not-found response. EC-008: topic soft-deleted; sessions keep subject; exam readiness excludes it with a note.

#### FR-019 — Set topic status
**ID**: FR-019
**Feature**: Subjects and topics
**Description**: A user sets a topic's status to Not started, In progress or Done. Status is manual and independent of recorded time. Done topics feed exam readiness.
**User story**: As a Registered User, I want to mark topic status, so that I see my coverage of a subject.
**Acceptance criteria**:
1. AC-FR-019-1 — Given a new topic, when viewed, then its status is Not started.
2. AC-FR-019-2 — Given the user selects Done, when saved, then status shows Done after reload.
3. AC-FR-019-3 — Given a status value outside the three, when submitted, then it is rejected.
**Priority**: Must Have
**Phase**: MVP
**Dependencies**: NFR-094, NFR-043
**Business rules**: None
**Expected system behavior**: The system stores the status with the record version. Status never changes automatically from logged time.
**Errors and edge cases**: Stale version: changed-elsewhere message and reload. Invalid status: message listing the three allowed values. No registered edge case.


## 3. Dashboard
The Dashboard is the landing view after login. It is Should Have, Phase MVP. Note: the Dashboard is not a named Phase 1 feature; it is derived from statistics, goals and planning and is recorded as inconsistency I-1 (proposed resolution, needs approval). It is composed only of MVP data: today's progress, the running timer, the next three planned entries, due to-dos and seven-day minutes by subject.

#### FR-020 — Dashboard today's progress against goal
**ID**: FR-020
**Feature**: 3. Dashboard
**Description**: The dashboard shows minutes studied today against the daily goal, using the user's profile timezone to define today. A goal-met state is shown when progress is at least the target.
**User story**: As a Registered User, I want to see today's progress against my goal, so that I know how much more I need to study today.
**Acceptance criteria**:
1. AC-FR-020-1 — Given a goal of 120 minutes and 45 minutes studied today, when the dashboard loads, then it shows 45 of 120 minutes and 38% progress, with a numeric label.
2. AC-FR-020-2 — Given 120 or more minutes studied today against a 120-minute goal, when the dashboard loads, then it shows a goal-met state with a text label, not color alone.
3. AC-FR-020-3 — Given a user with no goal set, when the dashboard loads, then the target shown is the default 120 minutes.
**Priority**: Should Have
**Phase**: MVP
**Dependencies**: FR-070, FR-040, NFR-001
**Business rules**: BR-013, BR-014, BR-015
**Expected system behavior**: Progress is the sum of study minutes whose frozen local date is today in the profile timezone. A goal changed today applies to today forward. Past days keep their own target.
**Errors and edge cases**: EC-004: a missed goal yields no penalty or notification in MVP; the day is simply not marked met. EC-006: after a timezone change, today's progress counts only sessions whose frozen local date equals today in the new zone. If progress cannot load, a retryable message says the figures are temporarily unavailable.

#### FR-021 — Dashboard running timer card
**ID**: FR-021
**Feature**: 3. Dashboard
**Description**: When a timer is running or paused, the dashboard shows a card with subject, elapsed time and state, with controls to open the timer. Without a running timer the card offers to start one.
**User story**: As a Registered User, I want to see my running timer on the dashboard, so that I can return to it quickly from any device.
**Acceptance criteria**:
1. AC-FR-021-1 — Given a timer running for 12 minutes 30 seconds, when the dashboard loads, then the card shows the subject and elapsed time 12:30 within 2 seconds of server time.
2. AC-FR-021-2 — Given a timer started on another device, when the dashboard is open, then the card shows that running state within 5 seconds.
3. AC-FR-021-3 — Given no running timer, when the dashboard loads, then the card shows a start action and no elapsed time.
**Priority**: Should Have
**Phase**: MVP
**Dependencies**: FR-050, FR-040, NFR-004
**Business rules**: BR-011
**Expected system behavior**: The card reflects server-authoritative timer state. Start and stop actions are acknowledged in the interface within 200 ms.
**Errors and edge cases**: EC-001: after refresh or close, the card shows the elapsed time and continues; a session auto-closed after 30 minutes without heartbeat is flagged "auto-closed". If state cannot be fetched, a message says the timer state is unknown and offers retry.

#### FR-022 — Dashboard next three planned entries
**ID**: FR-022
**Feature**: 3. Dashboard
**Description**: The dashboard lists the next three upcoming plan entries ordered by start date and time, each with subject, topic if any, start time and planned duration.
**User story**: As a Registered User, I want to see my next planned study blocks, so that I know what to study next.
**Acceptance criteria**:
1. AC-FR-022-1 — Given five upcoming plan entries, when the dashboard loads, then exactly 3 are listed, the earliest first.
2. AC-FR-022-2 — Given 2 upcoming plan entries, when the dashboard loads, then exactly 2 are listed.
3. AC-FR-022-3 — Given no upcoming entries, when the dashboard loads, then an empty state with an action to add a plan entry is shown.
**Priority**: Should Have
**Phase**: MVP
**Dependencies**: FR-030, NFR-001
**Business rules**: BR-001
**Expected system behavior**: Only entries not yet started and not marked missed are listed. Each entry shows its planned minutes. Selecting one opens that entry.
**Errors and edge cases**: No registered edge case. Failure to load shows a retryable message for this section only; other dashboard sections still render.

#### FR-023 — Dashboard due and overdue to-dos
**ID**: FR-023
**Feature**: 3. Dashboard
**Description**: The dashboard shows open to-dos that are due today or overdue, highest priority first, with overdue ones marked by a text label.
**User story**: As a Registered User, I want to see to-dos that are due or overdue, so that I do not miss deadlines.
**Acceptance criteria**:
1. AC-FR-023-1 — Given 2 open to-dos due today and 1 overdue, when the dashboard loads, then all 3 appear and the overdue one carries an "Overdue" text label.
2. AC-FR-023-2 — Given to-dos of High, Medium and Low priority due today, when the dashboard loads, then they are ordered High, Medium, Low.
3. AC-FR-023-3 — Given no open due or overdue to-dos, when the dashboard loads, then an empty state is shown.
**Priority**: Should Have
**Phase**: MVP
**Dependencies**: FR-090, NFR-001
**Business rules**: BR-031
**Expected system behavior**: Done to-dos are excluded. Marking one done from the dashboard removes it from the list immediately.
**Errors and edge cases**: No registered edge case. A failed completion shows an error saying the to-do was not updated and keeps it listed.

#### FR-024 — Dashboard seven-day minutes by subject
**ID**: FR-024
**Feature**: 3. Dashboard
**Description**: The dashboard shows study minutes for each of the last 7 local days, including today, split by subject, with numeric values alongside any chart.
**User story**: As a Registered User, I want to see my last seven days by subject, so that I see where my time went.
**Acceptance criteria**:
1. AC-FR-024-1 — Given sessions over the last 7 days, when the dashboard loads, then totals per subject for the 7 local days are shown with numeric minutes.
2. AC-FR-024-2 — Given a subject archived with history, when the dashboard loads, then its minutes appear labelled "<name> (archived)".
3. AC-FR-024-3 — Given no sessions in 7 days, when the dashboard loads, then an empty state is shown instead of zero-height bars.
**Priority**: Should Have
**Phase**: MVP
**Dependencies**: FR-080, FR-040, NFR-001, NFR-043
**Business rules**: BR-014
**Expected system behavior**: Days are bucketed by each session's frozen local date. Totals equal the sum of session durations. Colour is never the sole indicator.
**Errors and edge cases**: EC-006: a timezone change does not move past sessions between days. No other registered edge case.

## 4. Study planning
Study planning lets a user plan study blocks by form: subject, optional topic, date, start time and duration of 5 to 480 minutes. It is Should Have, Phase MVP. Overlaps need warning and confirmation, past entries are read-only except marking missed, and planned time is shown against actual time without either overwriting the other.

#### FR-030 — Create a plan entry
**ID**: FR-030
**Feature**: 4. Study planning
**Description**: The user creates a plan entry with a subject, optional topic, date, start time and duration between 5 and 480 minutes. Planned time is the entry's duration.
**User story**: As a Registered User, I want to plan a study block, so that I can decide ahead when to study.
**Acceptance criteria**:
1. AC-FR-030-1 — Given a valid subject, date in the future and 60 minutes, when the user saves, then the entry is created with planned time 60 minutes.
2. AC-FR-030-2 — Given a duration of 4 or 481 minutes, when the user saves, then it is rejected and the allowed range 5-480 is stated.
3. AC-FR-030-3 — Given no subject chosen, when the user saves, then it is rejected with a message that a subject is required.
4. AC-FR-030-4 — Given a start in the past, when the user saves, then it is rejected with a message that entries must be in the future.
**Priority**: Should Have
**Phase**: MVP
**Dependencies**: FR-010, NFR-016
**Business rules**: BR-001, BR-002
**Expected system behavior**: The entry is stored for the user only and appears in lists, the calendar and the dashboard. Creating it never alters recorded sessions.
**Errors and edge cases**: EC-003: overlapping entries are allowed after a warning and confirmation (see FR-034). Errors name the invalid field and the permitted range.

#### FR-031 — Edit an upcoming plan entry
**ID**: FR-031
**Feature**: 4. Study planning
**Description**: The user edits subject, topic, date, start time or duration of an entry that has not yet started. Saving uses the version loaded.
**User story**: As a Registered User, I want to adjust a plan, so that it matches changed circumstances.
**Acceptance criteria**:
1. AC-FR-031-1 — Given an upcoming entry of 60 minutes, when the user changes it to 90 and saves, then planned time shows 90 minutes.
2. AC-FR-031-2 — Given an entry whose start has passed, when edit is attempted, then it is refused as read-only.
3. AC-FR-031-3 — Given the entry changed in another tab, when the user saves a stale version, then the save is rejected with "changed elsewhere" and the entry reloads.
**Priority**: Should Have
**Phase**: MVP
**Dependencies**: FR-030, FR-035, NFR-094
**Business rules**: BR-028
**Expected system behavior**: Edits replace the entry values; linked sessions are unaffected. Overlap checks re-run on save.
**Errors and edge cases**: EC-003: new overlaps require warning and confirmation. EC-020: stale save is rejected, current version shown. Past entries: message says past entries cannot be edited.

#### FR-032 — Delete a plan entry
**ID**: FR-032
**Feature**: 4. Study planning
**Description**: The user deletes a plan entry after confirmation. Sessions linked to it are kept and become unlinked.
**User story**: As a Registered User, I want to remove a plan I no longer need, so that my plan stays accurate.
**Acceptance criteria**:
1. AC-FR-032-1 — Given an entry with 2 linked sessions, when the user confirms deletion, then the entry is removed and both sessions remain, unlinked.
2. AC-FR-032-2 — Given the confirmation dialog, when the user cancels, then the entry remains unchanged.
3. AC-FR-032-3 — Given another user's entry identifier, when deletion is requested, then a not-found response is returned.
**Priority**: Should Have
**Phase**: MVP
**Dependencies**: FR-030, NFR-092
**Business rules**: BR-003
**Expected system behavior**: Unlinked sessions still count toward goals and statistics with the same durations. Deletion cannot occur on a record the user does not own.
**Errors and edge cases**: EC-022: sessions are retained unlinked. Error intent: the deletion failed and nothing changed.

#### FR-033 — Mark a past plan entry as missed
**ID**: FR-033
**Feature**: 4. Study planning
**Description**: For a plan entry in the past with no linked sessions, the user can mark it as missed. The entry is not deleted.
**User story**: As a Registered User, I want to mark plans I skipped, so that my plan history is honest.
**Acceptance criteria**:
1. AC-FR-033-1 — Given a past entry with no linked sessions, when marked missed, then it shows status "Missed" and remains in lists.
2. AC-FR-033-2 — Given a past entry with 1 linked session, when marking missed is attempted, then it is refused with a message that it has recorded time.
3. AC-FR-033-3 — Given an upcoming entry, when marking missed is attempted, then it is refused because it has not passed.
**Priority**: Should Have
**Phase**: MVP
**Dependencies**: FR-030, FR-035, NFR-092
**Business rules**: BR-005, BR-028
**Expected system behavior**: Missed is the only change allowed on a past entry. A missed entry counts as planned time with zero actual.
**Errors and edge cases**: No registered edge case. Refusals explain which condition failed.

#### FR-034 — Overlap warning and confirmation for plan entries
**ID**: FR-034
**Feature**: 4. Study planning
**Description**: When a created or edited entry overlaps another entry of the same user, in any subject, a warning identifies the overlapping entries and saving needs explicit confirmation. Overlap is never blocked.
**User story**: As a Registered User, I want to be warned about double-booking, so that I choose knowingly.
**Acceptance criteria**:
1. AC-FR-034-1 — Given an entry 10:00-11:00, when a new entry 10:30-11:30 is saved, then a warning names the existing entry and requires confirmation.
2. AC-FR-034-2 — Given the user confirms, when saved, then both entries exist.
3. AC-FR-034-3 — Given entries 10:00-11:00 and 11:00-12:00, when saved, then no warning is shown because they only touch.
4. AC-FR-034-4 — Given the user declines, when the dialog closes, then nothing is saved.
**Priority**: Should Have
**Phase**: MVP
**Dependencies**: FR-030, FR-031, NFR-041
**Business rules**: BR-026
**Expected system behavior**: Overlap is computed per user across all subjects. The warning is text, keyboard operable and announced to screen readers.
**Errors and edge cases**: EC-003: overlaps allowed with warning and confirmation. Warning intent: this time overlaps entries X; continue?

#### FR-035 — Past plan entries are read-only
**ID**: FR-035
**Feature**: 4. Study planning
**Description**: Entries whose start time has passed cannot be edited or have time changed; only marking missed is available.
**User story**: As a Registered User, I want past entries to stay unchanged, so that history stays reliable.
**Acceptance criteria**:
1. AC-FR-035-1 — Given an entry that started 1 minute ago, when edit is opened, then fields are read-only.
2. AC-FR-035-2 — Given a past entry, when a change request for its duration is sent, then it is rejected.
3. AC-FR-035-3 — Given a past entry with no sessions, when the user opens it, then the mark-missed action is available.
**Priority**: Should Have
**Phase**: MVP
**Dependencies**: FR-031, FR-033, NFR-094
**Business rules**: BR-028
**Expected system behavior**: The system compares the entry start with current server time at each change attempt. Linked sessions can still be edited per FR-043.
**Errors and edge cases**: No registered edge case. Message intent: past entries cannot be edited; you may mark them missed.

#### FR-036 — Planned versus actual display
**ID**: FR-036
**Feature**: 4. Study planning
**Description**: For each entry, day and subject the system shows planned minutes, actual minutes and the signed variance (actual minus planned). Planned and actual are stored independently.
**User story**: As a Registered User, I want to compare planned and actual time, so that I see how my plan matched reality.
**Acceptance criteria**:
1. AC-FR-036-1 — Given an entry of 60 minutes with linked sessions totalling 75, when viewed, then it shows planned 60, actual 75, variance +15.
2. AC-FR-036-2 — Given an entry of 60 with 45 actual, when viewed, then variance shows -15.
3. AC-FR-036-3 — Given an entry with no linked sessions, when viewed, then actual shows 0 and variance equals minus planned.
**Priority**: Should Have
**Phase**: MVP
**Dependencies**: FR-030, FR-041, FR-080, NFR-003
**Business rules**: BR-001, BR-002, BR-003, BR-004
**Expected system behavior**: Actual is the sum of linked session durations, breaks excluded. Editing either value never changes the other. Unlinked sessions are excluded from an entry's actual but still count toward goals.
**Errors and edge cases**: No registered edge case. If actual cannot be computed, planned remains shown with a retry message.

#### FR-037 — List and filter plan entries
**ID**: FR-037
**Feature**: 4. Study planning
**Description**: The user views plan entries in a list, filtered by date range, subject and status (upcoming, done, missed), with dates shown in the profile timezone.
**User story**: As a Registered User, I want to find plan entries, so that I can review my schedule.
**Acceptance criteria**:
1. AC-FR-037-1 — Given 30 entries, when the user filters one subject and the next 7 days, then only matching entries are shown.
2. AC-FR-037-2 — Given status filter Missed, when applied, then only missed entries appear.
3. AC-FR-037-3 — Given no matches, when applied, then an empty state with a clear-filter action appears.
**Priority**: Should Have
**Phase**: MVP
**Dependencies**: FR-030, NFR-001
**Business rules**: BR-030
**Expected system behavior**: Results are ordered by date and start time, user-scoped, and shown in the profile timezone.
**Errors and edge cases**: EC-006: after a timezone change, entries are displayed in the new zone while sessions keep frozen dates.

#### FR-038 — Warn when planning after an exam date
**ID**: FR-038
**Feature**: 4. Study planning
**Description**: If the entry's subject has an upcoming exam and the entry falls after that exam date, a warning is shown but saving is allowed after confirmation.
**User story**: As a Registered User, I want to be warned about late planning, so that I do not plan study after the exam.
**Acceptance criteria**:
1. AC-FR-038-1 — Given an exam on 20 June, when an entry for that subject is dated 21 June, then a warning names the exam date.
2. AC-FR-038-2 — Given an entry on 20 June, when saved, then no warning is shown.
3. AC-FR-038-3 — Given the user confirms the warning, when saved, then the entry is created.
**Priority**: Should Have
**Phase**: MVP
**Dependencies**: FR-030, FR-120, NFR-041
**Business rules**: BR-025
**Expected system behavior**: Applies to the exam's subject and topics. The exam date is a fixed anchor. The warning is textual.
**Errors and edge cases**: EC-013: an exam edited to a past date stops raising the warning once it is in the past. Warning intent: this is after the exam on date X.

## 5. Study sessions and hours tracking
A study session is a recorded block of time linked to a subject, with an optional topic and optional plan entry. It is Must Have, Phase MVP. Sessions come from the timer or manual entry; durations come from server timestamps, and the system handles short sessions, idle auto-close, midnight splits and duplicate saves.

#### FR-040 — Save a timer session when it stops
**ID**: FR-040
**Feature**: 5. Study sessions and hours tracking
**Description**: Stopping a running timer creates a session whose duration is computed from stored server start and end timestamps. The client sends actions, not durations.
**User story**: As a Registered User, I want my timer sessions to be saved automatically, so that my hours are recorded accurately.
**Acceptance criteria**:
1. AC-FR-040-1 — Given a timer started at 10:00:00 and stopped at 10:25:30 server time, when stopped, then a session of 25 minutes 30 seconds is stored.
2. AC-FR-040-2 — Given the client clock is 2 hours wrong, when the session stops, then the duration still equals server end minus server start.
3. AC-FR-040-3 — Given the session is saved, when the user opens statistics, then it counts toward its day within 1 refresh.
**Priority**: Must Have
**Phase**: MVP
**Dependencies**: FR-050, NFR-051, NFR-090
**Business rules**: BR-006, BR-012
**Expected system behavior**: The session appears in the session list and totals with the subject chosen at start. Breaks are excluded.
**Errors and edge cases**: EC-001: a reload mid-session preserves elapsed time. EC-010: wrong client clock is ignored. Save failure says the session was not saved and offers retry without losing it.

#### FR-041 — Link a session to subject, topic and plan entry
**ID**: FR-041
**Feature**: 5. Study sessions and hours tracking
**Description**: Every session has one subject, an optional topic of that subject and an optional single plan entry. Unlinked sessions still count toward goals and statistics.
**User story**: As a Registered User, I want to link sessions to what I planned, so that planned versus actual is meaningful.
**Acceptance criteria**:
1. AC-FR-041-1 — Given a subject with topics, when a session is saved with a topic of another subject, then it is rejected.
2. AC-FR-041-2 — Given a session linked to one plan entry, when the user links a second entry, then it is refused: at most 1 entry.
3. AC-FR-041-3 — Given no plan entry, when the session is saved, then it counts toward the daily goal.
**Priority**: Must Have
**Phase**: MVP
**Dependencies**: FR-010, FR-030, NFR-092
**Business rules**: BR-003
**Expected system behavior**: The link can be changed or removed later by editing. The linked entry's actual time updates accordingly.
**Errors and edge cases**: EC-022: if the linked entry is deleted, the session remains unlinked. Error intent: the topic does not belong to the subject.

#### FR-042 — Add a manual session entry
**ID**: FR-042
**Feature**: 5. Study sessions and hours tracking
**Description**: The user records a past session by subject, optional topic, start and duration. It is stored with a manual flag and shown distinctly. It counts toward goals and statistics but not XP or leaderboards.
**User story**: As a Registered User, I want to log study done without the timer, so that my totals are complete.
**Acceptance criteria**:
1. AC-FR-042-1 — Given a valid past entry of 45 minutes, when saved, then it is stored flagged manual and counts 45 minutes toward its day.
2. AC-FR-042-2 — Given a start in the future, when saved, then it is rejected.
3. AC-FR-042-3 — Given a range overlapping a recorded session, when saved, then it is rejected naming the conflicting session.
4. AC-FR-042-4 — Given a duration over 24 hours, or a day total that would exceed 24 hours, when saved, then it is rejected.
**Priority**: Must Have
**Phase**: MVP
**Dependencies**: FR-010, NFR-090
**Business rules**: BR-010
**Expected system behavior**: Manual entries show a visible "manual" label. They are excluded from XP and leaderboards.
**Errors and edge cases**: EC-011: future entries rejected; overlap rejected with the conflicting session named; max 24 h per entry; per-day total capped at 24 h.

#### FR-043 — Edit a session
**ID**: FR-043
**Feature**: 5. Study sessions and hours tracking
**Description**: The user edits a session's subject, topic, plan link, start or end. The duration is recomputed from the timestamps. Edits cannot remove the manual flag from a manual entry or add it to a timer session.
**User story**: As a Registered User, I want to correct mistakes, so that history is accurate.
**Acceptance criteria**:
1. AC-FR-043-1 — Given a 30-minute session, when end time moves 15 minutes later, then duration becomes 45 minutes.
2. AC-FR-043-2 — Given a stale version, when saved, then rejected with "changed elsewhere" and the record reloads.
3. AC-FR-043-3 — Given edits that overlap another session or exceed 24 h per day, when saved, then rejected.
**Priority**: Must Have
**Phase**: MVP
**Dependencies**: FR-040, FR-042, NFR-094, NFR-096
**Business rules**: BR-010, BR-012
**Expected system behavior**: Totals and statistics update. Editing a session that earned XP makes a compensating adjustment later.
**Errors and edge cases**: EC-011: same limits as manual entry. EC-020: stale save rejected, current version shown.

#### FR-044 — Delete a session
**ID**: FR-044
**Feature**: 5. Study sessions and hours tracking
**Description**: The user deletes a session after confirmation. Totals, statistics and plan actuals update.
**User story**: As a Registered User, I want to remove a wrong session, so that my stats stay correct.
**Acceptance criteria**:
1. AC-FR-044-1 — Given a 40-minute session, when deletion is confirmed, then totals for its day fall by 40 minutes.
2. AC-FR-044-2 — Given cancellation in the dialog, when closed, then the session remains.
3. AC-FR-044-3 — Given a stale version, when deletion is attempted, then it is rejected with "changed elsewhere".
**Priority**: Must Have
**Phase**: MVP
**Dependencies**: FR-040, NFR-096
**Business rules**: None
**Expected system behavior**: The session is removed from the user's view and all sums. Cross-user identifiers return not-found.
**Errors and edge cases**: EC-020: stale deletion rejected. Error intent: deletion failed, nothing changed. No other registered edge case.

#### FR-045 — Discard sessions shorter than one minute
**ID**: FR-045
**Feature**: 5. Study sessions and hours tracking
**Description**: A timer session stopped with less than 1 minute of study time is discarded and not stored.
**User story**: As a Registered User, I want accidental starts to be dropped, so that my history is not cluttered.
**Acceptance criteria**:
1. AC-FR-045-1 — Given a timer stopped after 59 seconds, when stopped, then no session is stored.
2. AC-FR-045-2 — Given a timer stopped after exactly 60 seconds, when stopped, then a session is stored.
3. AC-FR-045-3 — Given a discard, when it happens, then a message states it was shorter than 1 minute and discarded.
**Priority**: Must Have
**Phase**: MVP
**Dependencies**: FR-040, NFR-090
**Business rules**: BR-008
**Expected system behavior**: The timer returns to idle. Discards add no minutes or XP.
**Errors and edge cases**: EC-012: result message states the outcome. For Pomodoro stopped at less than 5 minutes, 1 to under 5 minutes is saved as time only; under 1 minute is discarded.

#### FR-046 — Auto-close an idle session
**ID**: FR-046
**Feature**: 5. Study sessions and hours tracking
**Description**: If the server receives no heartbeat for more than 30 minutes, the session is closed at its last heartbeat and flagged "auto-closed".
**User story**: As a Registered User, I want forgotten timers not to inflate my hours, so that my records stay honest.
**Acceptance criteria**:
1. AC-FR-046-1 — Given last heartbeat at 10:00 and none until 10:31, when checked, then the session is closed at 10:00 flagged auto-closed.
2. AC-FR-046-2 — Given the heartbeat every 60 seconds, when a gap is 29 minutes, then the session remains running.
3. AC-FR-046-3 — Given an auto-closed session, when the user views it, then the auto-closed label is visible.
**Priority**: Must Have
**Phase**: MVP
**Dependencies**: FR-040, NFR-051
**Business rules**: BR-006
**Expected system behavior**: Time after the last heartbeat is not counted. The user can edit the end time afterward.
**Errors and edge cases**: EC-001: closure uses last heartbeat. EC-028: offline over 30 minutes is treated as auto-closed on reconnect; shorter outages continue. Message intent: your session was closed after inactivity.

#### FR-047 — Split a session at the day boundary
**ID**: FR-047
**Feature**: 5. Study sessions and hours tracking
**Description**: A session spanning midnight of its frozen timezone is split at that boundary, with each part counted toward its day. The session is displayed as one with two day-allocations.
**User story**: As a Registered User, I want late sessions to count on correct days, so that daily totals are right.
**Acceptance criteria**:
1. AC-FR-047-1 — Given a session 23:30-00:20 local, when saved, then 30 minutes count to the first day and 20 to the next.
2. AC-FR-047-2 — Given a timezone later changed, when the session is viewed, then its allocations do not change.
3. AC-FR-047-3 — Given a 23-hour or 25-hour DST day, when a session crosses it, then durations are unaffected.
**Priority**: Must Have
**Phase**: MVP
**Dependencies**: FR-040, NFR-091
**Business rules**: BR-016, BR-014
**Expected system behavior**: The boundary uses the zone and local date stored at session start. The list shows one session.
**Errors and edge cases**: EC-009: one session, two allocations. EC-006: dates frozen, DST day length 23/25 h tolerated.

#### FR-048 — Idempotent session save
**ID**: FR-048
**Feature**: 5. Study sessions and hours tracking
**Description**: Each session save carries a client-generated request key. A repeated request with the same key returns the same session and creates no second one.
**User story**: As a Registered User, I want double clicks and retries not to duplicate, so that totals are correct.
**Acceptance criteria**:
1. AC-FR-048-1 — Given two identical save requests with one key, when processed, then 1 session exists.
2. AC-FR-048-2 — Given a retry after a network timeout, when it succeeds, then the user sees one session.
3. AC-FR-048-3 — Given two different keys, when processed, then 2 sessions are stored.
**Priority**: Must Have
**Phase**: MVP
**Dependencies**: FR-040, FR-042, NFR-053
**Business rules**: None
**Expected system behavior**: The second response returns the first result. Keys are scoped to the user.
**Errors and edge cases**: EC-021: duplicate save yields one stored session. Error intent: save failed, retry is safe.

#### FR-049 — Post-session topic status and note prompt
**ID**: FR-049
**Feature**: 5. Study sessions and hours tracking
**Description**: After a session is saved, the user may optionally mark the topic's status and add a short note. The prompt is dismissible and never blocks saving.
**User story**: As a Registered User, I want to log progress right after studying, so that I keep context.
**Acceptance criteria**:
1. AC-FR-049-1 — Given a saved session with a topic, when the prompt shows, then the user can set a status and add a note up to the note limit.
2. AC-FR-049-2 — Given the user dismisses it, when closed, then the session remains saved unchanged.
3. AC-FR-049-3 — Given a session without a topic, when saved, then the status choice is not offered.
**Priority**: Should Have
**Phase**: MVP
**Dependencies**: FR-040, FR-100, NFR-004
**Business rules**: None
**Expected system behavior**: Choices update the topic status and save a note for the topic. Dismissal changes nothing.
**Errors and edge cases**: No registered edge case. If the note save fails, the session stays saved and a message offers retry with the text kept.


## 6. Timer
The timer records focused study time as Pomodoro or stopwatch sessions, with pause and resume, one running timer per user, and recovery after refresh. Durations come from server timestamps. Group priority: Must Have (FR-056 is Should Have); Phase: MVP.

#### FR-050 — Start a Pomodoro timer
**ID**: FR-050
**Feature**: 6. Timer
**Description**: The user starts a Pomodoro for a chosen subject, with an optional topic. The system begins a focus interval using the configured durations (default 25 min focus, 5 min break, long break 15 min after 4 cycles). Break time is not study time.
**User story**: As a Registered User, I want to start a Pomodoro for a subject, so that I can study in focused intervals.
**Acceptance criteria**:
1. AC-FR-050-1 — Given no running timer and default settings, when the user starts a Pomodoro for a subject, then a running session with a 25:00 focus countdown is shown within 200 ms.
2. AC-FR-050-2 — Given a Pomodoro whose 4th focus interval has ended, when the break begins, then the break length is 15 min instead of 5 min.
3. AC-FR-050-3 — Given a running Pomodoro break, when 5 min of break elapse, then no minutes are added to the study total of the day.
4. AC-FR-050-4 — Given the user has not chosen a subject, when they press start, then the timer is not started and a subject selection prompt is shown.
**Priority**: Must Have
**Phase**: MVP
**Dependencies**: FR-010, FR-053, FR-057, NFR-004
**Business rules**: BR-009
**Expected system behavior**: The system records the start at server time, creates a running session linked to the subject (and topic if chosen), and alternates focus and break intervals per the configured durations. Focus time counts as study time; break time does not.
**Errors and edge cases**: Missing subject: message asks the user to pick a subject. A subject archived or deleted cannot be chosen. No registered edge case.
#### FR-051 — Start a stopwatch
**ID**: FR-051
**Feature**: 6. Timer
**Description**: The user starts an open-ended stopwatch for a subject and optional topic. It counts up until the user stops it. Sessions of 1 min or more are saved.
**User story**: As a Registered User, I want to start a stopwatch, so that I can track study time without fixed intervals.
**Acceptance criteria**:
1. AC-FR-051-1 — Given no running timer, when the user starts a stopwatch for a subject, then a running session with an elapsed counter at 00:00 is shown within 200 ms.
2. AC-FR-051-2 — Given a stopwatch running for 42 min, when the user stops it, then a completed session of 42 min (±2 s) is saved.
3. AC-FR-051-3 — Given a stopwatch running for 45 s, when the user stops it, then the session is discarded and a message states it was under 1 min.
4. AC-FR-051-4 — Given the user's device clock is 10 min ahead, when a stopwatch runs for 20 min of real time, then the saved duration is 20 min (±2 s).
**Priority**: Must Have
**Phase**: MVP
**Dependencies**: FR-010, FR-053, NFR-004
**Business rules**: BR-008, BR-012
**Expected system behavior**: Elapsed time is computed from stored server start and stop timestamps, not from ticks. On stop, the system saves or discards per the 1-minute rule and tells the user which happened.
**Errors and edge cases**: Session under 1 min: message states it was discarded as shorter than 1 minute. Stop failing to save: message offers retry. No registered edge case.
#### FR-052 — Pause and resume a timer
**ID**: FR-052
**Feature**: 6. Timer
**Description**: The user can pause a running timer and resume it later. Paused time is not counted as study time. A paused session stays recoverable until auto-closed by inactivity.
**User story**: As a Registered User, I want to pause and resume my timer, so that interruptions do not inflate my study time.
**Acceptance criteria**:
1. AC-FR-052-1 — Given a stopwatch running 10 min, when the user pauses for 5 min and resumes then runs 10 min more, then the stopped session counts 20 min (±2 s).
2. AC-FR-052-2 — Given a paused session, when the user reloads the page, then the session is shown as paused with the same elapsed value.
3. AC-FR-052-3 — Given a running session with no heartbeat for more than 30 min, when the next check occurs, then the session is closed at the last heartbeat time and flagged "auto-closed".
4. AC-FR-052-4 — Given a running timer, when the user presses pause, then the UI shows the paused state within 200 ms.
**Priority**: Must Have
**Phase**: MVP
**Dependencies**: FR-050, FR-051, NFR-052, NFR-004
**Business rules**: BR-006, BR-012
**Expected system behavior**: Pause and resume are stored as actions with server timestamps. The client sends a heartbeat every 60 s while running. Session states are running, paused, completed, discarded.
**Errors and edge cases**: EC-001: a refresh or close during a running timer must not lose the session; no heartbeat for more than 30 min closes it at the last heartbeat and the user is told it was auto-closed. Failed pause: message states the action was not saved and offers retry.
#### FR-053 — Allow only one running timer
**ID**: FR-053
**Feature**: 6. Timer
**Description**: Each user can have at most one running or paused timer at any time, across all tabs and devices. Starting a second one asks the user to stop the first.
**User story**: As a Registered User, I want only one timer to run at a time, so that my study time is never double-counted.
**Acceptance criteria**:
1. AC-FR-053-1 — Given a timer running on device A, when the user starts a timer on device B, then the start is rejected and the prompt "Stop current session and start new?" is shown.
2. AC-FR-053-2 — Given that prompt, when the user confirms, then the first session is stopped at the server time of confirmation and the new one starts.
3. AC-FR-053-3 — Given two start requests arriving at the same moment, when the server processes them, then exactly 1 is accepted (the first) and the other receives the stop-and-start prompt.
4. AC-FR-053-4 — Given the user cancels the prompt, when it closes, then the original session continues unchanged.
**Priority**: Must Have
**Phase**: MVP
**Dependencies**: FR-050, FR-051, NFR-053
**Business rules**: BR-011
**Expected system behavior**: The server enforces the single-timer rule. A confirmed replacement stops the first session with the normal save or discard outcome, then starts the new one.
**Errors and edge cases**: EC-002: a second start from another tab or device is rejected with a stop-and-start prompt; simultaneous starts resolve to the first accepted.
#### FR-054 — Recover a running timer after refresh or network loss
**ID**: FR-054
**Feature**: 6. Timer
**Description**: If the page is refreshed, closed, or the network drops, the timer state is restored from the server. Elapsed time continues from the stored start time. Offline periods over 30 min are handled by the auto-close rule.
**User story**: As a Registered User, I want my timer to survive a refresh or lost connection, so that I never lose a study session.
**Acceptance criteria**:
1. AC-FR-054-1 — Given a timer running 12 min, when the user refreshes the page, then the timer shows 12 min (±2 s) and keeps counting.
2. AC-FR-054-2 — Given the network is lost for 10 min during a session, when it returns, then the session is still running and the elapsed value is within 2 s of server time.
3. AC-FR-054-3 — Given the network is lost for 40 min, when the connection returns, then the session is closed at the last heartbeat and flagged "auto-closed".
4. AC-FR-054-4 — Given the device clock is wrong by 1 h, when the timer is recovered, then displayed elapsed time is based on server timestamps only.
**Priority**: Must Have
**Phase**: MVP
**Dependencies**: FR-052, FR-053, NFR-051, NFR-052
**Business rules**: BR-012, BR-006
**Expected system behavior**: The client sends actions, never durations. While offline, the timer keeps counting locally from the stored start time, and the state syncs on reconnect.
**Errors and edge cases**: EC-001: refresh or close recovers the session. EC-010: a wrong client clock never affects durations. EC-028: offline over 30 min is treated per the 30-minute rule on reconnect, with a message saying the session was auto-closed.
#### FR-055 — Interval-end notification
**ID**: FR-055
**Feature**: 6. Timer
**Description**: When a Pomodoro focus or break interval ends, the user is alerted by a sound and, if permitted, a browser notification. If neither is available, an in-app indicator is shown.
**User story**: As a Registered User, I want to be alerted when an interval ends, so that I can switch between focus and break without watching the clock.
**Acceptance criteria**:
1. AC-FR-055-1 — Given a Pomodoro focus interval of 25 min, when it reaches 00:00, then an alert is shown within 2 s of the end.
2. AC-FR-055-2 — Given browser notification permission is denied, when an interval ends, then an in-app indicator is shown and a prompt to enable notifications is offered.
3. AC-FR-055-3 — Given audio autoplay is blocked, when an interval ends, then a visible in-app indicator is shown instead of sound.
4. AC-FR-055-4 — Given a screen reader is active, when an interval ends, then the change is announced once, not every second.
**Priority**: Must Have
**Phase**: MVP
**Dependencies**: FR-050, NFR-044
**Business rules**: BR-009
**Expected system behavior**: The system compares the stored interval end time with server-based time and triggers the alert. Alerts degrade gracefully to the in-app indicator.
**Errors and edge cases**: EC-024: denied permission or blocked autoplay degrades to an in-app indicator with a prompt to enable.
#### FR-056 — Tab title countdown
**ID**: FR-056
**Feature**: 6. Timer
**Description**: While a timer runs, the browser tab title shows the remaining (Pomodoro) or elapsed (stopwatch) time. The title returns to normal when no timer runs.
**User story**: As a Registered User, I want the tab title to show my timer, so that I can see it while working in another tab.
**Acceptance criteria**:
1. AC-FR-056-1 — Given a Pomodoro with 18 min left, when the user views another tab, then the Lumora tab title contains "18:00" (±1 s).
2. AC-FR-056-2 — Given a stopwatch running, when 61 s have elapsed, then the title shows 01:01.
3. AC-FR-056-3 — Given the timer is stopped, when the session ends, then the tab title reverts to the default within 1 s.
4. AC-FR-056-4 — Given a screen reader is active, when the title updates every second, then no per-second announcement is made.
**Priority**: Should Have
**Phase**: MVP
**Dependencies**: FR-050, FR-051, NFR-044
**Business rules**: None
**Expected system behavior**: The title updates about once per second from the server-based timestamps and is reset on stop or discard.
**Errors and edge cases**: No error state. No registered edge case.
#### FR-057 — Configure timer durations
**ID**: FR-057
**Feature**: 6. Timer
**Description**: The user can change Pomodoro durations within allowed ranges. Defaults are 25 min focus, 5 min break, 15 min long break and 4 cycles before a long break. Changes apply to timers started afterward.
**User story**: As a Registered User, I want to configure Pomodoro durations, so that the timer fits how I study.
**Acceptance criteria**:
1. AC-FR-057-1 — Given default settings, when the user opens timer settings, then values 25, 5, 15 and 4 are shown.
2. AC-FR-057-2 — Given focus is set to 120 min, when saved, then the value is accepted; set to 121 min, then it is rejected.
3. AC-FR-057-3 — Given break is set to 0 min or long break to 61 min, when saved, then each is rejected; 1 and 60 are accepted.
4. AC-FR-057-4 — Given cycles before long break is set to 1 or 9, when saved, then it is rejected; 2 and 8 are accepted.
**Priority**: Must Have
**Phase**: MVP
**Dependencies**: FR-050, NFR-062
**Business rules**: BR-009
**Expected system behavior**: Accepted ranges: focus 1-120 min, break 1-60 min, long break 1-60 min, cycles 2-8. Settings persist per user and do not alter a running timer.
**Errors and edge cases**: Out-of-range value: message states the allowed range for that field and keeps the previous value. No registered edge case.
#### FR-058 — Stop a Pomodoro and classify the result
**ID**: FR-058
**Feature**: 6. Timer
**Description**: When the user stops a Pomodoro early, the system classifies the outcome. Stopped at 5 min of focus or more counts as a completed pomodoro. From 1 min to under 5 min it is saved as time only. Under 1 min it is discarded.
**User story**: As a Registered User, I want a clear result when I stop a Pomodoro early, so that I know what was recorded.
**Acceptance criteria**:
1. AC-FR-058-1 — Given a Pomodoro with 6 min of focus, when the user stops it, then it is saved and counted as a completed pomodoro.
2. AC-FR-058-2 — Given a Pomodoro with 3 min of focus, when the user stops it, then 3 min are saved as time only and not counted as a completed pomodoro.
3. AC-FR-058-3 — Given a Pomodoro with 40 s of focus, when the user stops it, then it is discarded and nothing is saved.
4. AC-FR-058-4 — Given a focus interval that runs to its end, when it reaches 00:00, then it counts as a completed pomodoro.
**Priority**: Must Have
**Phase**: MVP
**Dependencies**: FR-050, FR-052, NFR-090
**Business rules**: BR-007, BR-008
**Expected system behavior**: The system computes focus time from timestamps excluding paused and break time, applies the thresholds, and shows a message stating the outcome.
**Errors and edge cases**: EC-012: an outcome message states the result (completed, saved as time only, or discarded under 1 minute).
#### FR-059 — Converge timer state across devices
**ID**: FR-059
**Feature**: 6. Timer
**Description**: All of a user's open tabs and devices display the same timer state. A change on one converges on the others within 5 s. The server holds the authoritative state.
**User story**: As a Registered User, I want my timer to look the same on every device, so that I can control it from any of them.
**Acceptance criteria**:
1. AC-FR-059-1 — Given the timer is started on device A, when 5 s pass, then device B shows it running with the same elapsed value (±2 s).
2. AC-FR-059-2 — Given the timer is paused on device B, when 5 s pass, then device A shows it paused.
3. AC-FR-059-3 — Given the timer is stopped on device A, when 5 s pass, then device B shows no running timer.
4. AC-FR-059-4 — Given a stale device sends a pause for a session already stopped, when processed, then it is rejected and the device is refreshed to the stopped state.
**Priority**: Must Have
**Phase**: MVP
**Dependencies**: FR-053, FR-054, NFR-052
**Business rules**: BR-011
**Expected system behavior**: The server is authoritative; clients update their view to match. Stale actions are rejected, not merged.
**Errors and edge cases**: EC-002: conflicting starts are resolved in favor of the first accepted. EC-020: a stale timer action is rejected with a "changed elsewhere" message and the client reloads the state.

## 7. Calendar
The calendar shows study minutes and planned entries by month and day. Group priority: Should Have; Phase: MVP for FR-060 to FR-062.

#### FR-060 — Month heatmap of study minutes
**ID**: FR-060
**Feature**: 7. Calendar
**Description**: The calendar shows a month grid where each day displays its study minutes in one of 4 intensity buckets: 0, 1-59, 60-119, and 120 min or more. The number of minutes is always shown with the color. Days are assigned by the user's profile timezone.
**User story**: As a Registered User, I want a month heatmap of my study, so that I can see my consistency at a glance.
**Acceptance criteria**:
1. AC-FR-060-1 — Given a day with 0 min, 45 min, 90 min and 150 min, when the month is shown, then they appear in buckets 0, 1-59, 60-119 and >=120 respectively.
2. AC-FR-060-2 — Given any day cell, when it is displayed, then its minute value is visible as text, not only as color.
3. AC-FR-060-3 — Given the profile timezone is changed, when the month is reloaded, then past sessions stay on the frozen local date of their start.
4. AC-FR-060-4 — Given a month with 10,000 sessions of data in the account, when opened, then it loads within 1 s at p95.
**Priority**: Should Have
**Phase**: MVP
**Dependencies**: FR-040, FR-044, NFR-003, NFR-043
**Business rules**: BR-014, BR-030
**Expected system behavior**: Daily totals sum study minutes per local day. Break time is excluded. Navigation moves between months, and today is highlighted.
**Errors and edge cases**: EC-006: after a timezone change, past days keep their original local date, and today's total counts sessions whose frozen local date equals today in the new zone. A load failure shows a message with retry.
#### FR-061 — Calendar day detail
**ID**: FR-061
**Feature**: 7. Calendar
**Description**: Selecting a day shows its study sessions with subject, start, end and minutes, and the day total. A session spanning midnight appears as one session with two day-allocations.
**User story**: As a Registered User, I want to open a day, so that I can see exactly what I studied.
**Acceptance criteria**:
1. AC-FR-061-1 — Given a day with 3 sessions, when the user selects it, then 3 sessions are listed with subject, start time and minutes, and a day total equal to their sum.
2. AC-FR-061-2 — Given a session from 23:30 to 00:30, when either day is opened, then the session appears with 30 min allocated to that day.
3. AC-FR-061-3 — Given a session of an archived subject, when listed, then the subject is labelled "<name> (archived)".
4. AC-FR-061-4 — Given a day with no sessions, when selected, then an empty state shows 0 min.
**Priority**: Should Have
**Phase**: MVP
**Dependencies**: FR-060, FR-040, NFR-001
**Business rules**: BR-016
**Expected system behavior**: The system groups sessions by frozen local date, splitting midnight-crossing sessions at the day boundary. The detail can be opened by keyboard.
**Errors and edge cases**: EC-009: a midnight-crossing session is displayed as one session with two day-allocations, and each part counts toward its own day.
#### FR-062 — Planned entries on the calendar
**ID**: FR-062
**Feature**: 7. Calendar
**Description**: The calendar lists plan entries for the selected day or month alongside actual study. Each entry shows subject, time, duration, and status (planned, done, missed).
**User story**: As a Registered User, I want my plan on the calendar, so that I can compare what I planned with what I did.
**Acceptance criteria**:
1. AC-FR-062-1 — Given 2 plan entries on a day, when it is opened, then both appear with subject, start time and duration.
2. AC-FR-062-2 — Given a plan entry with a linked session of 50 min against 60 planned, when shown, then both 60 and 50 min are visible.
3. AC-FR-062-3 — Given an entry with status missed, when displayed, then status is shown as text, not only as color.
4. AC-FR-062-4 — Given a day with no entries, when opened, then an empty state offers to add a plan entry.
**Priority**: Should Have
**Phase**: MVP
**Dependencies**: FR-030, FR-061, NFR-001
**Business rules**: BR-001
**Expected system behavior**: Read-only view; editing goes through study planning. Entries of archived subjects are hidden.
**Errors and edge cases**: No registered edge case. A load failure shows a message with retry.

### 7.1 Drag-and-drop calendar (Could Have, Phase 2)
FR-065 to FR-069 add drag-and-drop planning on a 15-minute grid with a keyboard alternative and overlap confirmation. Could Have, Phase 2.

#### FR-065 — Create a plan entry by dragging
**ID**: FR-065
**Feature**: 7. Calendar
**Description**: The user drags across free time in the day or week view to create a plan entry. The range snaps to a 15-minute grid and opens a form to choose subject and topic. Overlap requires confirmation.
**User story**: As a Registered User, I want to drag on the calendar to create a plan entry, so that planning is fast.
**Acceptance criteria**:
1. AC-FR-065-1 — Given a drag from 09:00 to 10:30, when released, then a form opens with start 09:00 and duration 90 min.
2. AC-FR-065-2 — Given a drag ending at 09:07, when released, then the end snaps to the nearest 15-minute mark (09:00 or 09:15).
3. AC-FR-065-3 — Given a drag shorter than 5 min or longer than 480 min, when released, then no entry is created and the allowed range is stated.
4. AC-FR-065-4 — Given the drag overlaps an existing entry, when saved, then the overlap warning is shown and saving needs confirmation.
**Priority**: Could Have
**Phase**: 2
**Dependencies**: FR-030, FR-062, NFR-087
**Business rules**: BR-026
**Expected system behavior**: Nothing is saved until the user completes the form. Cancelling discards the drag.
**Errors and edge cases**: EC-003: overlap across all subjects shows a warning and requires confirmation, never a hard block. Past start times are refused with a message.
#### FR-066 — Move a plan entry by dragging
**ID**: FR-066
**Feature**: 7. Calendar
**Description**: The user drags an existing future plan entry to another time or day. The new start snaps to 15 minutes and the duration is unchanged. Past entries cannot be moved.
**User story**: As a Registered User, I want to drag a plan entry to a new slot, so that I can reschedule quickly.
**Acceptance criteria**:
1. AC-FR-066-1 — Given a future 60 min entry at 09:00, when dragged to 14:00, then it saves with start 14:00 and duration 60 min.
2. AC-FR-066-2 — Given a past entry, when the user tries to drag it, then the move is refused with a message that past entries are read-only except marking missed.
3. AC-FR-066-3 — Given a drop at 14:10, when released, then the start snaps to 14:15 or 14:00 (nearest).
4. AC-FR-066-4 — Given a drop onto an overlapping entry, when released, then a warning is shown and confirmation is required.
**Priority**: Could Have
**Phase**: 2
**Dependencies**: FR-030, FR-065, NFR-087
**Business rules**: BR-027, BR-028
**Expected system behavior**: The move saves only after any needed confirmation. Linked sessions stay linked.
**Errors and edge cases**: EC-003: overlap warns and needs confirmation. Refused move on a past entry: message explains the entry is read-only.
#### FR-067 — Resize a plan entry on the 15-minute grid
**ID**: FR-067
**Feature**: 7. Calendar
**Description**: The user drags the edge of a plan entry to change its duration in 15-minute steps. Duration must remain within 5-480 min.
**User story**: As a Registered User, I want to resize a plan entry, so that I can adjust its length quickly.
**Acceptance criteria**:
1. AC-FR-067-1 — Given a 60 min entry, when its end is dragged by 30 min, then the duration becomes 90 min.
2. AC-FR-067-2 — Given a resize that would give 480 min plus 15, when released, then it is refused and 480 min is the maximum.
3. AC-FR-067-3 — Given a resize below 5 min, when released, then it is refused and the duration stays.
4. AC-FR-067-4 — Given a resize causing overlap, when released, then a warning and confirmation are required before saving.
**Priority**: Could Have
**Phase**: 2
**Dependencies**: FR-030, FR-065, NFR-087
**Business rules**: BR-027
**Expected system behavior**: The resize snaps to 15-minute steps and saves only after confirmation when overlapping. Past entries cannot be resized.
**Errors and edge cases**: EC-003: overlap warns and needs confirmation. Out-of-range duration: message states 5-480 min.
#### FR-068 — Keyboard alternative for calendar planning
**ID**: FR-068
**Feature**: 7. Calendar
**Description**: Every drag action has an equivalent using keyboard only. The user can select a slot, create, move or resize an entry with keys, and changes are announced to assistive technology.
**User story**: As a Registered User, I want to plan on the calendar with the keyboard, so that I can use it without a pointer.
**Acceptance criteria**:
1. AC-FR-068-1 — Given focus on a calendar slot, when the user presses the create key and confirms, then the same form as drag-create opens.
2. AC-FR-068-2 — Given a focused entry, when the user presses the move key 4 times by one step, then it moves 60 min.
3. AC-FR-068-3 — Given a focused entry, when the user resizes with the keyboard, then it changes in 15-minute steps.
4. AC-FR-068-4 — Given any keyboard change, when it is applied, then an announcement states the new time and duration.
**Priority**: Could Have
**Phase**: 2
**Dependencies**: FR-065, FR-066, FR-067, NFR-041, NFR-042
**Business rules**: BR-027
**Expected system behavior**: The keyboard path uses the same validation, snapping and overlap confirmation as dragging.
**Errors and edge cases**: No registered edge case. Invalid keyboard moves show the same intent messages as dragging (past entry read-only, range 5-480 min).
#### FR-069 — Overlap confirmation on drag-and-drop
**ID**: FR-069
**Feature**: 7. Calendar
**Description**: When a drag-and-drop action results in overlap with another entry of the same user, a warning names the conflicting entry and asks for confirmation. Overlap is checked across all subjects.
**User story**: As a Registered User, I want a warning when I drop onto an overlap, so that I do not double-book by accident.
**Acceptance criteria**:
1. AC-FR-069-1 — Given an entry dropped overlapping a 10:00-11:00 entry, when released, then a warning names that entry and the time overlapped.
2. AC-FR-069-2 — Given the warning, when the user confirms, then the change is saved with both entries kept.
3. AC-FR-069-3 — Given the warning, when the user cancels, then the entry returns to its original position unchanged.
4. AC-FR-069-4 — Given an overlap with an entry of a different subject, when dropped, then the warning is still shown.
**Priority**: Could Have
**Phase**: 2
**Dependencies**: FR-065, FR-066, FR-067, NFR-041
**Business rules**: BR-027
**Expected system behavior**: No hard blocking exists; the warning is shown for create, move and resize, by pointer or keyboard.
**Errors and edge cases**: EC-003: overlap is allowed with warning and confirmation, computed per user across all subjects.


## 8. Daily goals

The daily goals group lets a Registered User set a target number of study minutes per day, optionally per subject, and see progress and the met state. The default target is 120 minutes (BR-013) and the allowed range is 5-1440 minutes. Progress follows the profile-timezone day (BR-014) and target changes apply from the current day forward (BR-015). Priority: Must Have, Phase: MVP (per-subject goals are Should Have within this group).

#### FR-070 — Set the daily goal
**ID**: FR-070
**Feature**: Daily goals
**Description**: A user sets one overall daily study target in minutes. A new account starts with a target of 120 minutes (BR-013). The accepted range is 5 to 1440 minutes, whole numbers only.
**User story**: As a Registered User, I want to set my daily study goal, so that I know how much to study each day.
**Acceptance criteria**:
1. AC-FR-070-1 — Given a new account, when the user opens goal settings, then the target shows 120 minutes.
2. AC-FR-070-2 — Given the goal form, when the user saves 90, then the target is stored as 90 minutes and shown as 90 on the next page load.
3. AC-FR-070-3 — Given the goal form, when the user saves 5 or 1440, then the value is accepted; when the user saves 4 or 1441, then it is rejected and the stored target is unchanged.
4. AC-FR-070-4 — Given the goal form, when the user saves 0, a negative number, a decimal or non-numeric text, then it is rejected with a message stating the allowed range 5-1440.
**Priority**: Must Have
**Phase**: MVP
**Dependencies**: FR-072, NFR-016, NFR-062
**Business rules**: BR-013
**Expected system behavior**: The system stores one target per user, initialised from the data-driven default of 120 minutes. Validation runs on every save and the user sees the saved value immediately. Only the owner can read or change it.
**Errors and edge cases**: The message states that the goal must be a whole number of minutes from 5 to 1440 and the previous value is kept. EC-023: goal of 0 or above 1440 is rejected (range 5-1440).

#### FR-071 — Set per-subject daily goals
**ID**: FR-071
**Feature**: Daily goals
**Description**: A user may optionally set a daily target in minutes for individual subjects, in addition to the overall goal. Each per-subject target uses the same 5-1440 range and can be removed to return to no target. Per-subject targets are optional and do not change the overall goal.
**User story**: As a Registered User, I want a daily target for specific subjects, so that I can balance my time across them.
**Acceptance criteria**:
1. AC-FR-071-1 — Given a subject without a target, when the user sets 45 minutes, then the subject shows a 45-minute daily target.
2. AC-FR-071-2 — Given a subject with a target, when the user clears it, then the subject shows no target and the overall goal is unchanged.
3. AC-FR-071-3 — Given the form, when the user enters 4 or 1441 for a subject, then it is rejected and nothing is stored.
4. AC-FR-071-4 — Given an archived subject, when the user views goals, then its target is hidden and not counted until the subject is restored.
**Priority**: Should Have
**Phase**: MVP
**Dependencies**: FR-010, FR-070, NFR-016
**Business rules**: BR-013
**Expected system behavior**: The system keeps at most one target per subject per user. Per-subject progress counts only sessions of that subject in the local day. Archived subjects' targets are suspended and return on restore.
**Errors and edge cases**: The message states that the subject target must be 5-1440 minutes. A per-subject target above the overall goal is allowed. EC-023: values outside 5-1440 are rejected.

#### FR-072 — Show daily goal progress
**ID**: FR-072
**Feature**: Daily goals
**Description**: The system shows today's progress as study minutes against the target. Progress is the sum of study minutes whose frozen local date equals today in the profile timezone (BR-014), including manual entries, with sessions split at the day boundary. The display includes the numbers and a percentage, not color alone.
**User story**: As a Registered User, I want to see today's progress toward my goal, so that I can decide whether to keep studying.
**Acceptance criteria**:
1. AC-FR-072-1 — Given a target of 120 and sessions totalling 45 minutes today, when the user opens the goal view, then it shows 45 of 120 minutes (38%).
2. AC-FR-072-2 — Given a timer session running, when the user views progress, then the running elapsed minutes are included and the figure updates within 5 seconds of a state change.
3. AC-FR-072-3 — Given a user whose timezone changes to a new zone, when progress is shown, then it counts only sessions whose frozen local date equals today's date in the new zone.
4. AC-FR-072-4 — Given a session of 30 minutes crossing local midnight with 10 minutes before and 20 after, when viewing each day, then the earlier day counts 10 and the later day counts 20.
**Priority**: Must Have
**Phase**: MVP
**Dependencies**: FR-040, FR-070, NFR-091, NFR-044
**Business rules**: BR-014
**Expected system behavior**: Progress is recomputed from server-recorded session durations and shows minutes, target and percentage. Percentages above 100 are displayed as-is (for example 150%). Screen readers receive the numbers as text.
**Errors and edge cases**: If progress cannot load, the message says progress is temporarily unavailable and offers retry. EC-006: timezone change never recomputes frozen local dates; DST days of 23 or 25 hours still use the day rule.

#### FR-073 — Show goal-met state
**ID**: FR-073
**Feature**: Daily goals
**Description**: The system marks a day as goal met when progress is at least the target in force that day (BR-015). The met state is shown with text and icon, never color alone. A day that ends below target is recorded as goal not met with no penalty or notification in MVP.
**User story**: As a Registered User, I want to see when I have met my goal, so that I feel rewarded for reaching it.
**Acceptance criteria**:
1. AC-FR-073-1 — Given a target of 120 and progress of 119, when the user views today, then the state is 'not met'.
2. AC-FR-073-2 — Given a target of 120, when progress reaches exactly 120, then the state changes to 'met' with a text label.
3. AC-FR-073-3 — Given a past day with progress below its target, when the user views it in the calendar or statistics, then it is labelled 'goal not met' and no notification was sent.
4. AC-FR-073-4 — Given a met day, when the user deletes a session so that progress falls to 100 of 120, then the state returns to 'not met'.
**Priority**: Must Have
**Phase**: MVP
**Dependencies**: FR-072, NFR-043
**Business rules**: BR-015
**Expected system behavior**: Met state is derived from progress and target and re-evaluated whenever sessions change. Past days keep the met or not-met result computed against their own target. No streak effect exists in MVP.
**Errors and edge cases**: No error message is expected; a missed day shows 'goal not met' only. EC-004: missed daily goal causes no penalty or notification in MVP.

#### FR-074 — Apply goal changes from today forward
**ID**: FR-074
**Feature**: Daily goals
**Description**: When the user changes the daily target, the new target applies to the current local day and later days. Past days keep the target that was in force on each of those days (BR-015). The system therefore keeps a dated history of targets.
**User story**: As a Registered User, I want my goal changes to leave past results intact, so that my history stays honest.
**Acceptance criteria**:
1. AC-FR-074-1 — Given a target of 120 for last week, when the user changes it to 60 today, then today shows target 60 and last week's days still show target 120.
2. AC-FR-074-2 — Given 90 minutes studied today and a target of 120 (not met), when the user lowers the target to 60 mid-day, then today shows met immediately.
3. AC-FR-074-3 — Given two changes on the same day (120 to 60 to 80), when viewing today, then only 80 applies and no extra history entry affects past days.
4. AC-FR-074-4 — Given a user who changes timezone, when a target was changed earlier, then each past day still shows the target in force on its frozen local date.
**Priority**: Must Have
**Phase**: MVP
**Dependencies**: FR-070, FR-072, NFR-091
**Business rules**: BR-015
**Expected system behavior**: The new target takes effect for the current local day without rewriting past days. Statistics for goal-hit rate use the target in force per day. The change is visible at once to all the user's clients.
**Errors and edge cases**: The save confirmation states that the change applies from today. EC-005: goal changed mid-day applies to current day forward. EC-004 applies to days previously marked not met, which are unchanged.

## 9. Statistics

The statistics group presents study totals and comparisons over a chosen date range of up to 24 months. All figures are derived from recorded session durations and plan entries, bucketed by the user's profile-timezone local day (BR-030). Weeks start on Monday by default (proposed). Priority: Must Have, Phase: MVP.

#### FR-080 — Daily study totals
**ID**: FR-080
**Feature**: Statistics
**Description**: The system shows total study minutes per local day over the selected range. Each day's total is the sum of session durations allocated to that day (BR-014). Days with no sessions show 0.
**User story**: As a Registered User, I want to see my study minutes per day, so that I can spot my daily pattern.
**Acceptance criteria**:
1. AC-FR-080-1 — Given sessions of 40 and 35 minutes on one day, when the user opens daily totals, then that day shows 75 minutes.
2. AC-FR-080-2 — Given a day with no sessions, when viewing the range, then it shows 0 minutes rather than being omitted.
3. AC-FR-080-3 — Given 10,000 sessions over 24 months, when the daily view loads, then it returns within 1 second at p95 (NFR-003).
4. AC-FR-080-4 — Given the daily totals, when summed over the range, then the sum equals the sum of all session durations in the range exactly.
**Priority**: Must Have
**Phase**: MVP
**Dependencies**: FR-040, FR-086, NFR-003, NFR-096
**Business rules**: BR-014
**Expected system behavior**: Totals are computed from server timestamps and frozen local dates. Sessions crossing midnight contribute to both days. Results are visible only to the owner.
**Errors and edge cases**: If loading fails, the message says statistics could not load and offers retry. EC-006: day buckets use frozen local dates across timezone changes.

#### FR-081 — Weekly study totals
**ID**: FR-081
**Feature**: Statistics
**Description**: The system shows total study minutes per week over the selected range. Weeks start on Monday by default (proposed) and use local days. A partial first or last week in the range is labelled as partial.
**User story**: As a Registered User, I want weekly totals, so that I can compare my weeks.
**Acceptance criteria**:
1. AC-FR-081-1 — Given sessions on Monday (60 min) and Sunday (30 min) of one week, when viewing weekly totals, then that week shows 90 minutes.
2. AC-FR-081-2 — Given a range starting on a Wednesday, when viewing weekly totals, then the first week is labelled partial and counts only days in the range.
3. AC-FR-081-3 — Given a session at 23:30 Sunday to 00:30 Monday local time, when viewing weeks, then 30 minutes fall in the earlier week and 30 minutes in the next.
4. AC-FR-081-4 — Given weekly totals, when summed, then they equal the daily totals sum for the same range.
**Priority**: Must Have
**Phase**: MVP
**Dependencies**: FR-080, NFR-003, NFR-096
**Business rules**: BR-014
**Expected system behavior**: Weekly values aggregate the same day allocations as daily totals, so the two views always reconcile. The week-start day is a data-driven default.
**Errors and edge cases**: Loading failure shows a retry message. EC-006: weeks follow frozen local dates, so DST weeks of 167 or 169 hours do not alter minute totals.

#### FR-082 — Monthly study totals
**ID**: FR-082
**Feature**: Statistics
**Description**: The system shows total study minutes per calendar month over the selected range. Months are based on local days in the profile timezone. A month still in progress is labelled as current.
**User story**: As a Registered User, I want monthly totals, so that I can see long-term trends.
**Acceptance criteria**:
1. AC-FR-082-1 — Given sessions totalling 1,200 minutes in March, when viewing monthly totals, then March shows 1,200 minutes.
2. AC-FR-082-2 — Given a session from 23:50 on 31 March to 00:20 on 1 April local time, when viewing months, then 10 minutes fall in March and 20 in April.
3. AC-FR-082-3 — Given the current month, when viewing totals, then it is labelled 'current' and shows minutes to date.
4. AC-FR-082-4 — Given a 24-month range, when the monthly view loads, then it returns within 1 second at p95 and 24 monthly rows are shown.
**Priority**: Must Have
**Phase**: MVP
**Dependencies**: FR-080, NFR-003, NFR-096
**Business rules**: BR-014
**Expected system behavior**: Monthly values aggregate daily allocations and always sum to the daily totals of the range. Months with no sessions show 0.
**Errors and edge cases**: Loading failure shows a retry message. EC-006: month boundaries use frozen local dates across zone changes.

#### FR-083 — Study totals by subject
**ID**: FR-083
**Feature**: Statistics
**Description**: The system breaks total study minutes down by subject for the selected range, with each subject's share of the total. Archived subjects remain included and are labelled '<name> (archived)' (BR-029).
**User story**: As a Registered User, I want minutes per subject, so that I can see where my time goes.
**Acceptance criteria**:
1. AC-FR-083-1 — Given 120 minutes on Maths and 60 on History, when viewing by subject, then Maths shows 120 (67%) and History 60 (33%).
2. AC-FR-083-2 — Given an archived subject with 90 recorded minutes, when viewing by subject, then it appears as '<name> (archived)' with 90 minutes.
3. AC-FR-083-3 — Given a subject restored from archive, when viewing by subject, then its label no longer shows 'archived' and its minutes are unchanged.
4. AC-FR-083-4 — Given the subject rows, when summed, then they equal the total for the range.
**Priority**: Must Have
**Phase**: MVP
**Dependencies**: FR-010, FR-040, NFR-003, NFR-096
**Business rules**: BR-029
**Expected system behavior**: Each session is attributed to its subject and, where recorded, a topic. Soft-deleted subjects keep their history. Percentages use whole numbers and rows sum to the range total.
**Errors and edge cases**: Loading failure shows a retry message. EC-007: deleted subject history is retained and labelled archived.

#### FR-084 — Goal-hit rate
**ID**: FR-084
**Feature**: Statistics
**Description**: The system shows the percentage of days in the range on which the goal was met, using the target in force on each day (BR-015). Days marked 'goal not met' count in the denominator. The view also shows the count of met days out of total days.
**User story**: As a Registered User, I want my goal-hit rate, so that I can judge my consistency.
**Acceptance criteria**:
1. AC-FR-084-1 — Given 7 days of which 5 met their goal, when viewing goal-hit rate, then it shows 5 of 7 days (71%).
2. AC-FR-084-2 — Given a target lowered from 120 to 60 on day 4, when viewing the rate, then days 1-3 are judged against 120 and days 4 onward against 60.
3. AC-FR-084-3 — Given a range containing days before the account was created, when the rate is computed, then those days are excluded from the denominator.
4. AC-FR-084-4 — Given a range with no eligible days, when viewing the rate, then it shows 'no data' rather than 0% or an error.
**Priority**: Must Have
**Phase**: MVP
**Dependencies**: FR-073, FR-074, FR-086, NFR-003
**Business rules**: BR-015
**Expected system behavior**: Each day is evaluated once against its own target and its own totals. Results re-evaluate when sessions are edited or deleted.
**Errors and edge cases**: With no eligible days the message says there is not yet enough data. EC-004: missed days appear as 'goal not met' without penalty. EC-005: target changes mid-day apply forward only.

#### FR-085 — Planned versus actual statistics
**ID**: FR-085
**Feature**: Statistics
**Description**: The system compares planned minutes (sum of plan entry durations) with actual minutes (sum of session durations) per day, subject and entry. Variance is actual minus planned and can be negative or positive (BR-004). Planned and actual are never merged (BR-002).
**User story**: As a Registered User, I want planned versus actual time, so that I can see how closely I follow my plan.
**Acceptance criteria**:
1. AC-FR-085-1 — Given 120 planned and 90 actual minutes for a day, when viewing the comparison, then variance shows -30 minutes.
2. AC-FR-085-2 — Given 60 planned and 80 actual minutes for a subject, when viewing the comparison, then variance shows +20 minutes.
3. AC-FR-085-3 — Given sessions not linked to any plan entry, when viewing totals, then they count in actual but add 0 planned minutes.
4. AC-FR-085-4 — Given a plan entry marked missed with no sessions, when viewing the comparison, then its planned minutes count and its actual is 0.
**Priority**: Must Have
**Phase**: MVP
**Dependencies**: FR-030, FR-040, NFR-003
**Business rules**: BR-001, BR-002, BR-004
**Expected system behavior**: Planned and actual are computed independently from plan entries and sessions and presented side by side with the signed variance. Totals by day and subject reconcile with the other statistics views.
**Errors and edge cases**: If no plan entries exist, the view states that no planned time is recorded in the range and shows actual only. No registered edge case.

#### FR-086 — Date ranges up to 24 months
**ID**: FR-086
**Feature**: Statistics
**Description**: The user can pick a preset or custom date range with a maximum span of 24 months. Range boundaries are local dates in the profile timezone (BR-030). Ranges longer than 24 months are rejected.
**User story**: As a Registered User, I want to choose the period I analyse, so that I can review recent weeks or the full history.
**Acceptance criteria**:
1. AC-FR-086-1 — Given the range picker, when the user selects the last 7 days, then all statistics views use exactly 7 local days including today.
2. AC-FR-086-2 — Given a custom range of exactly 24 months, when applied, then it is accepted and loads within 1 second at p95 for up to 10,000 sessions.
3. AC-FR-086-3 — Given a custom range of 24 months plus 1 day, when applied, then it is rejected and the previous range stays active.
4. AC-FR-086-4 — Given a start date after the end date, when applied, then it is rejected with a message.
**Priority**: Must Have
**Phase**: MVP
**Dependencies**: FR-080, NFR-003, NFR-072
**Business rules**: BR-030
**Expected system behavior**: The chosen range applies to all statistics views at once. The default range is the last 30 days (proposed). Data growth at 10 times the per-user volume must not degrade results beyond NFR-003.
**Errors and edge cases**: Messages state the 24-month maximum or that the start must precede the end. EC-006: range boundaries use the profile timezone at query time and frozen local dates of records.

#### FR-087 — Statistics empty state
**ID**: FR-087
**Feature**: Statistics
**Description**: When the user has fewer than 3 distinct days with recorded study data, the system shows an empty state instead of charts. The empty state explains how to record a first session and links to the timer. Once 3 days exist the full views appear.
**User story**: As a Registered User, I want clear guidance when there is too little data, so that I am not shown misleading empty charts.
**Acceptance criteria**:
1. AC-FR-087-1 — Given an account with 0 sessions, when opening statistics, then an empty state with a start-timer action is shown and no chart.
2. AC-FR-087-2 — Given sessions on exactly 2 distinct days, when opening statistics, then the empty state is still shown.
3. AC-FR-087-3 — Given sessions on 3 distinct days, when opening statistics, then the full views are shown.
4. AC-FR-087-4 — Given the empty state, when read by a screen reader, then its heading and action are announced as text.
**Priority**: Must Have
**Phase**: MVP
**Dependencies**: FR-040, NFR-044
**Business rules**: None
**Expected system behavior**: The system counts distinct local days with at least one session and chooses the empty state or the full views. Totals never divide by zero.
**Errors and edge cases**: The empty state tells the user to record more sessions; it is not an error. No registered edge case.

#### FR-088 — Show manual entries distinctly in statistics
**ID**: FR-088
**Feature**: Statistics
**Description**: Manual entries count toward all totals, goals and statistics (BR-010) but are marked distinctly from timer sessions. The user can see manual minutes as a separate portion of each total. Manual entries remain excluded from XP and leaderboards.
**User story**: As a Registered User, I want manual time to be visible as such, so that I can tell tracked from estimated time.
**Acceptance criteria**:
1. AC-FR-088-1 — Given 60 timer minutes and 30 manual minutes in a day, when viewing daily totals, then the total is 90 and the manual portion is shown as 30.
2. AC-FR-088-2 — Given a manual entry, when viewing the session list in statistics, then it carries a text label 'manual', not color alone.
3. AC-FR-088-3 — Given a manual entry deleted, when viewing totals, then the total falls by its minutes immediately.
4. AC-FR-088-4 — Given manual and timer minutes, when summed, then the total equals the sum of all session durations.
**Priority**: Must Have
**Phase**: MVP
**Dependencies**: FR-040, FR-080, NFR-096
**Business rules**: BR-010
**Expected system behavior**: Each session carries a manual flag and totals expose timer and manual parts. Goal progress includes manual minutes.
**Errors and edge cases**: Loading failure shows a retry message. EC-011: manual entries are bounded by no future, no overlap and 24 hours per entry and per day.

#### FR-089 — Correct day buckets across timezone and DST
**ID**: FR-089
**Feature**: Statistics
**Description**: Day, week and month buckets use the frozen local date stored with each session, computed in the zone active at session start (BR-030, BR-014). Changing timezone never moves old sessions to other days. DST days of 23 or 25 hours bucket correctly.
**User story**: As a Registered User, I want my history to stay on the correct days, so that travel or clock changes do not distort my statistics.
**Acceptance criteria**:
1. AC-FR-089-1 — Given a session started 23:30 on a day in zone A, when the user changes the profile to zone B, then the session stays on its original local date.
2. AC-FR-089-2 — Given a 25-hour DST day, when a user studies 60 minutes in each of two repeated hours, then the day total is 120 minutes.
3. AC-FR-089-3 — Given a 23-hour DST day, when viewing totals, then session durations are unchanged and no minutes are lost or duplicated.
4. AC-FR-089-4 — Given any range, when daily totals are summed, then the sum equals the sum of session durations in UTC-based elapsed time.
**Priority**: Must Have
**Phase**: MVP
**Dependencies**: FR-072, FR-080, NFR-091
**Business rules**: BR-030, BR-014
**Expected system behavior**: Bucketing uses the stored date and never recomputes it from the current profile zone. Durations derive from UTC timestamps, so they are unaffected by clock changes.
**Errors and edge cases**: No error is shown; any inconsistency is a defect. EC-006: timezone change freezes local dates, streak is never reduced, DST days of 23/25 h follow BR-014.


## 10. Task management

Task management lets a user keep to-dos: tasks to be done, with optional subject, topic and due date and a priority of High, Medium or Low (BR-031). To-dos are not plan entries; plan entries are time blocks. Phase-1 priority: Must Have, phase MVP.

#### FR-090 — Create a to-do
**ID**: FR-090
**Feature**: 10. Task management
**Description**: The user creates a to-do with a title of 1 to 200 characters, an optional subject, an optional topic of that subject, an optional due date and a priority. A to-do is a task to complete; it is not a time block and has no start time or duration.
**User story**: As a Registered User, I want to create a to-do with an optional subject, topic and due date, so that I can track what I need to do for my studies.
**Acceptance criteria**:
1. AC-FR-090-1 — Given the user is signed in, when they save a to-do titled "Read chapter 4" with no other fields, then the to-do appears in the list as not done with priority Medium and no due date.
2. AC-FR-090-2 — Given the title field, when the user submits a title of 201 characters, then the save is rejected and no to-do is created; a title of exactly 200 characters is accepted.
3. AC-FR-090-3 — Given a to-do is created with subject Biology and a topic that belongs to Biology, when it is saved, then the list shows both the subject and the topic on that to-do.
4. AC-FR-090-4 — Given the user chooses a topic that does not belong to the chosen subject, when they save, then the save is rejected and nothing is stored.
**Priority**: Must Have
**Phase**: MVP
**Dependencies**: FR-010,FR-096,NFR-016
**Business rules**: BR-031
**Expected system behavior**: The system stores the to-do for the owner only and shows it immediately in the to-do list and in the dashboard due/overdue view. A new to-do is not done and defaults to priority Medium when none is chosen.
**Errors and edge cases**: Empty or whitespace-only title: message says a title is required. Title over 200 characters: message states the 200-character limit. Topic not in the chosen subject, or subject archived: message asks the user to pick a valid subject/topic. No registered edge case.

#### FR-091 — Edit a to-do
**ID**: FR-091
**Feature**: 10. Task management
**Description**: The user changes the title, subject, topic, due date or priority of an existing to-do. The same validation as creation applies.
**User story**: As a Registered User, I want to edit a to-do, so that I can correct or reschedule a task.
**Acceptance criteria**:
1. AC-FR-091-1 — Given a to-do with priority Medium, when the user changes it to High and saves, then the list shows High and the to-do moves to the High group in the priority sort.
2. AC-FR-091-2 — Given a to-do, when the user clears its due date and saves, then the to-do shows no due date and no longer counts as due or overdue.
3. AC-FR-091-3 — Given the same to-do is open in two tabs and the first tab saves a change, when the second tab saves its older version, then the save is rejected with a "changed elsewhere" message and the current version is loaded.
4. AC-FR-091-4 — Given an edit that makes the title 201 characters, when saved, then it is rejected and the stored title is unchanged.
**Priority**: Must Have
**Phase**: MVP
**Dependencies**: FR-090,NFR-094
**Business rules**: BR-031
**Expected system behavior**: The system applies a valid edit atomically and shows the updated to-do at once. Each editable to-do carries a version so a stale save never overwrites a newer change.
**Errors and edge cases**: Stale version: message says the to-do changed elsewhere and the latest version was reloaded. Invalid title or topic: same intents as FR-090. EC-020: concurrent edits are rejected, not merged.

#### FR-092 — Delete a to-do
**ID**: FR-092
**Feature**: 10. Task management
**Description**: The user permanently deletes a to-do they own after a confirmation. To-dos have no archive state, and deletion does not affect sessions, plan entries or statistics.
**User story**: As a Registered User, I want to delete a to-do, so that I can remove tasks I no longer need.
**Acceptance criteria**:
1. AC-FR-092-1 — Given a to-do in the list, when the user chooses delete and confirms, then the to-do disappears from every list and the dashboard within 1 second.
2. AC-FR-092-2 — Given the delete confirmation is shown, when the user cancels, then the to-do remains unchanged.
3. AC-FR-092-3 — Given a to-do that was deleted, when another request tries to open it by its identifier, then a not-found response is returned.
4. AC-FR-092-4 — Given a to-do is deleted, when statistics are viewed, then total study minutes are unchanged.
**Priority**: Must Have
**Phase**: MVP
**Dependencies**: FR-090,NFR-092
**Business rules**: None
**Expected system behavior**: The system removes the to-do and its references from the owner's views. Deletion is limited to the owner; other users receive not-found.
**Errors and edge cases**: Delete of an already deleted to-do: message says the to-do no longer exists and the list is refreshed. No registered edge case.

#### FR-093 — Mark a to-do done or undone
**ID**: FR-093
**Feature**: 10. Task management
**Description**: The user marks a to-do done or reopens it as not done. Marking done records the completion time; reopening clears it.
**User story**: As a Registered User, I want to mark a to-do done or undone, so that I can see my progress on tasks.
**Acceptance criteria**:
1. AC-FR-093-1 — Given an open to-do, when the user marks it done, then it shows as done with a completion time and leaves the default open list.
2. AC-FR-093-2 — Given a done to-do, when the user marks it undone, then it returns to the open list and its completion time is cleared.
3. AC-FR-093-3 — Given the user toggles the same to-do twice quickly with a network retry, when the requests are processed, then the final state matches the last user action and exactly one state is stored.
4. AC-FR-093-4 — Given a to-do is marked done, when the screen is read with a screen reader, then the state change is announced as done.
**Priority**: Must Have
**Phase**: MVP
**Dependencies**: FR-090,NFR-053,NFR-044
**Business rules**: None
**Expected system behavior**: The system updates the done state and shows it immediately. Repeating the same request does not create duplicate state changes.
**Errors and edge cases**: Failed save: message says the change was not saved and offers retry, keeping the previous state shown. No registered edge case.

#### FR-094 — Filter to-dos
**ID**: FR-094
**Feature**: 10. Task management
**Description**: The user filters the to-do list by status (open, done, all), subject, priority and due state (overdue, due today, due within 7 days, no due date). Filters combine with AND.
**User story**: As a Registered User, I want to filter my to-dos, so that I can focus on the tasks that matter now.
**Acceptance criteria**:
1. AC-FR-094-1 — Given 10 to-dos of which 4 are done, when the user filters by status open, then exactly 6 to-dos are shown.
2. AC-FR-094-2 — Given to-dos with priorities High, Medium and Low, when the user filters by priority High, then only High to-dos are shown.
3. AC-FR-094-3 — Given a to-do due yesterday that is not done, when the user filters by overdue, then it appears and a to-do due today does not.
4. AC-FR-094-4 — Given filters that match no to-do, when applied, then an empty state with an option to clear filters is shown.
**Priority**: Must Have
**Phase**: MVP
**Dependencies**: FR-090,FR-096,NFR-001
**Business rules**: BR-031
**Expected system behavior**: Filtering is computed on the owner's to-dos only; due state uses the profile timezone for today. The chosen filter stays while the user stays on the page.
**Errors and edge cases**: No match: empty state, not an error. Subject filter on an archived subject shows its to-dos only if the user selects archived. No registered edge case.

#### FR-095 — Sort to-dos by priority then due date
**ID**: FR-095
**Feature**: 10. Task management
**Description**: The to-do list is ordered by priority (High, then Medium, then Low) and, within the same priority, by due date ascending with to-dos without a due date last. Ties are ordered by creation time, oldest first.
**User story**: As a Registered User, I want to see my to-dos sorted by priority then due date, so that I do the most important and urgent task first.
**Acceptance criteria**:
1. AC-FR-095-1 — Given a Low to-do due tomorrow and a High to-do with no due date, when the list is shown, then the High to-do appears before the Low to-do.
2. AC-FR-095-2 — Given two Medium to-dos due 3 May and 1 May, when the list is shown, then the 1 May to-do appears first.
3. AC-FR-095-3 — Given two High to-dos, one with a due date and one without, when sorted, then the one with a due date appears first.
4. AC-FR-095-4 — Given a list of 500 to-dos, when sorted and displayed, then the list responds within the NFR-002 read limit (p95 300 ms).
**Priority**: Must Have
**Phase**: MVP
**Dependencies**: FR-090,FR-096,NFR-002
**Business rules**: BR-031
**Expected system behavior**: Sorting is the default order and is deterministic. Done to-dos are listed after open to-dos when status is all.
**Errors and edge cases**: No error state. No registered edge case.

#### FR-096 — Assign to-do priority
**ID**: FR-096
**Feature**: 10. Task management
**Description**: Each to-do has a priority of High, Medium or Low. Medium is the default, and priority is shown with a text label as well as any color.
**User story**: As a Registered User, I want to set a priority on a to-do, so that I can mark what is most important.
**Acceptance criteria**:
1. AC-FR-096-1 — Given a new to-do with no priority chosen, when saved, then its priority is Medium.
2. AC-FR-096-2 — Given a to-do, when the user selects High, Medium or Low, then exactly that value is stored and shown.
3. AC-FR-096-3 — Given a request with a priority value other than High, Medium or Low, when submitted, then it is rejected and the stored priority is unchanged.
4. AC-FR-096-4 — Given a High to-do is displayed, when viewed without color perception, then the word High is visible as text.
**Priority**: Must Have
**Phase**: MVP
**Dependencies**: FR-090,NFR-043
**Business rules**: BR-031
**Expected system behavior**: The system accepts only the three BR-031 values and shows them as text labels in lists and forms.
**Errors and edge cases**: Invalid priority: message lists the three allowed values. No registered edge case.

## 11. Notes and revision

Notes (FR-100..104, Should Have, MVP) hold markdown per subject or topic with safe rendering, autosave and conflict handling. Revision flashcards (FR-107..112) are Could Have, Phase 2, with a daily review queue and spaced-repetition scheduling specified by observable behavior only.

#### FR-100 — Create and edit a markdown note
**ID**: FR-100
**Feature**: 11. Notes and revision
**Description**: The user writes a note in markdown attached to a subject or to one topic of that subject. A subject or topic may have several notes, each with a title and body. The user can edit the note after saving.
**User story**: As a Registered User, I want to create and edit markdown notes per subject or topic, so that I can keep my study knowledge next to my study data.
**Acceptance criteria**:
1. AC-FR-100-1 — Given a subject, when the user saves a note with a title and body of 5,000 characters, then the note appears under that subject with the title shown.
2. AC-FR-100-2 — Given a note attached to a topic, when the user opens the topic, then the note is listed there.
3. AC-FR-100-3 — Given an existing note, when the user edits the body and saves, then the new body is shown and the version number increases by 1.
4. AC-FR-100-4 — Given a body longer than 100,000 characters, when saved, then it is rejected with a message stating the limit and the stored note is unchanged.
**Priority**: Should Have
**Phase**: MVP
**Dependencies**: FR-010,FR-101,NFR-094
**Business rules**: None
**Expected system behavior**: The system stores the markdown source exactly as typed and shows a rendered preview (FR-101). Notes are visible only to the owner.
**Errors and edge cases**: Missing subject: message asks to choose a subject. Over-size body: message states the limit. EC-020: a stale save is handled by FR-103.

#### FR-101 — Render notes with sanitization
**ID**: FR-101
**Feature**: 11. Notes and revision
**Description**: A note is displayed as formatted content produced from its markdown. Any script, event handler, raw HTML or dangerous link in the markdown is neutralised before display so that it can never execute.
**User story**: As a Registered User, I want to see my notes rendered safely, so that I can read formatted notes without security risk.
**Acceptance criteria**:
1. AC-FR-101-1 — Given a note containing a script tag, when rendered, then no script runs and the tag is shown as inert text or removed.
2. AC-FR-101-2 — Given a note with a link using the javascript scheme, when rendered, then the link is not clickable as an executable link.
3. AC-FR-101-3 — Given a note with headings, lists, bold text and code blocks, when rendered, then each is shown with the matching formatting.
4. AC-FR-101-4 — Given a note with an image from an external address, when rendered, then no request carrying user identifiers is sent to that address without the user choosing to load it.
**Priority**: Should Have
**Phase**: MVP
**Dependencies**: FR-100,NFR-014,NFR-015
**Business rules**: None
**Expected system behavior**: The system sanitizes at display time, so stored markdown is unchanged and stays exportable. The same sanitizing applies in every place a note is shown.
**Errors and edge cases**: Unsafe content is removed silently from the render with a small notice that some content was blocked. No registered edge case.

#### FR-102 — Autosave notes
**ID**: FR-102
**Feature**: 11. Notes and revision
**Description**: While the user edits a note, the system saves the draft automatically after 5 seconds without typing (proposed interval). A saved/saving/failed indicator is visible, and unsent text is kept locally if the save fails.
**User story**: As a Registered User, I want to have my note autosaved, so that I never lose text I have typed.
**Acceptance criteria**:
1. AC-FR-102-1 — Given the user stops typing in a note, when 5 seconds pass, then the note is saved and the indicator shows Saved.
2. AC-FR-102-2 — Given an autosave fails because the network is down, when the failure occurs, then the indicator shows Not saved, the typed text stays in the editor and is kept locally.
3. AC-FR-102-3 — Given a failed autosave, when the connection returns, then the system retries and the indicator shows Saved within 10 seconds.
4. AC-FR-102-4 — Given a note that is unchanged, when 5 seconds pass, then no save request is made.
**Priority**: Should Have
**Phase**: MVP
**Dependencies**: FR-100,FR-103,NFR-054
**Business rules**: None
**Expected system behavior**: Each autosave is a normal save carrying the known version. The indicator state is announced to assistive technology without announcing every save separately more than once per state change.
**Errors and edge cases**: Save failure: message says the note is not saved yet, text is kept, and a retry will happen. EC-020: version mismatch during autosave triggers FR-103.

#### FR-103 — Resolve note version conflicts
**ID**: FR-103
**Feature**: 11. Notes and revision
**Description**: When a save of a note is based on an outdated version because it was changed in another tab or device, the system shows both versions and lets the user keep their version, keep the other version, or keep both as two notes. Nothing is overwritten without a choice.
**User story**: As a Registered User, I want to resolve a conflict when a note changed elsewhere, so that I never silently lose edits from another device.
**Acceptance criteria**:
1. AC-FR-103-1 — Given a note changed in tab A, when tab B saves from the older version, then the save is rejected and a conflict view shows both versions.
2. AC-FR-103-2 — Given the conflict view, when the user selects keep mine, then the stored note becomes the user's text and the version increases by 1.
3. AC-FR-103-3 — Given the conflict view, when the user selects keep both, then two notes exist, the second titled with the suffix "(copy)".
4. AC-FR-103-4 — Given the conflict view is open, when the user dismisses it, then both versions remain available and nothing is deleted.
**Priority**: Should Have
**Phase**: MVP
**Dependencies**: FR-100,FR-102,NFR-094
**Business rules**: None
**Expected system behavior**: The system detects conflicts by version only for multi-tab or multi-device use. The other version is shown as stored; the local text is kept until a choice is made.
**Errors and edge cases**: Message says the note changed elsewhere and asks which version to keep. EC-020: stale save rejected; no automatic merge.

#### FR-104 — Delete a note
**ID**: FR-104
**Feature**: 11. Notes and revision
**Description**: The user deletes a note after confirmation. Notes follow the soft-delete rule of their subject: a note on an archived subject is hidden with it and returns when the subject is restored.
**User story**: As a Registered User, I want to delete a note, so that I can remove notes I no longer need.
**Acceptance criteria**:
1. AC-FR-104-1 — Given a note, when the user confirms delete, then the note disappears from the subject and topic views.
2. AC-FR-104-2 — Given a subject is soft-deleted, when the user views notes, then notes of that subject are not listed.
3. AC-FR-104-3 — Given the subject is restored, when the user views notes, then its notes are listed again with unchanged content.
4. AC-FR-104-4 — Given the delete confirmation, when cancelled, then the note remains.
**Priority**: Should Have
**Phase**: MVP
**Dependencies**: FR-100,FR-017,NFR-093
**Business rules**: BR-029
**Expected system behavior**: A direct note deletion removes it from the owner's views; a subject archive hides notes without deleting them. Hard purge happens only on account deletion.
**Errors and edge cases**: Deleting a note on an archived subject is not offered; message says to restore the subject first. EC-007: archived subject hides its notes.

#### FR-107 — Create a flashcard
**ID**: FR-107
**Feature**: 11. Notes and revision
**Description**: The user creates a flashcard with a front text and a back text, each 1 to 1,000 characters, optionally linked to a subject and topic. A new card is due immediately.
**User story**: As a Registered User, I want to create a flashcard, so that I can practise recall of what I study.
**Acceptance criteria**:
1. AC-FR-107-1 — Given front "Capital of France" and back "Paris", when saved, then the card exists and is due today.
2. AC-FR-107-2 — Given an empty front or back, when saved, then it is rejected and no card is created.
3. AC-FR-107-3 — Given a front of 1,001 characters, when saved, then it is rejected with a limit message.
4. AC-FR-107-4 — Given a card linked to a topic of Geography, when saved, then it is listed under that topic.
**Priority**: Could Have
**Phase**: 2
**Dependencies**: FR-010,NFR-016
**Business rules**: None
**Expected system behavior**: The system stores the card for the owner only and adds it to the next review queue (FR-109) as due now.
**Errors and edge cases**: Empty text: message says both sides are required. Over-length: limit stated. No registered edge case.

#### FR-108 — Edit and delete a flashcard
**ID**: FR-108
**Feature**: 11. Notes and revision
**Description**: The user edits the front, back or link of a flashcard and deletes cards after confirmation. Editing text does not reset the card's schedule.
**User story**: As a Registered User, I want to edit and delete flashcards, so that I can fix mistakes and drop obsolete cards.
**Acceptance criteria**:
1. AC-FR-108-1 — Given a card with an upcoming review in 6 days, when the user edits the back text, then the next review date stays in 6 days.
2. AC-FR-108-2 — Given a card, when deleted and confirmed, then it never appears in any queue again.
3. AC-FR-108-3 — Given a stale edit from a second tab, when saved, then it is rejected with a "changed elsewhere" message and reloaded.
4. AC-FR-108-4 — Given a card deleted, when its identifier is requested, then a not-found response is returned.
**Priority**: Could Have
**Phase**: 2
**Dependencies**: FR-107,NFR-094
**Business rules**: None
**Expected system behavior**: The system applies changes with version checks and removes deleted cards from queues immediately.
**Errors and edge cases**: Stale version: card changed elsewhere, reloaded. EC-020: optimistic version rejection.

#### FR-109 — Daily review queue
**ID**: FR-109
**Feature**: 11. Notes and revision
**Description**: The review queue lists cards due today, where today is the user's profile-timezone day, ordered with overdue cards first. The user reviews one card at a time: front is shown, then the back on request.
**User story**: As a Registered User, I want to review the cards due today, so that I practise recall at the right time.
**Acceptance criteria**:
1. AC-FR-109-1 — Given 12 cards due today or earlier, when the user opens the queue, then 12 cards are offered (subject to the daily limit in FR-111).
2. AC-FR-109-2 — Given a card shown, when the user reveals it, then the back is displayed and rating options appear.
3. AC-FR-109-3 — Given the user's timezone changes to a zone where it is the next day, when the queue is opened, then due status uses the new zone's current date.
4. AC-FR-109-4 — Given no cards are due, when the queue is opened, then an empty state shows the date of the next due card.
**Priority**: Could Have
**Phase**: 2
**Dependencies**: FR-107,FR-110,FR-111,NFR-001
**Business rules**: BR-030
**Expected system behavior**: The queue is computed from card schedules and the profile timezone. Reviewing does not require a running study session.
**Errors and edge cases**: No cards due: friendly empty state, not an error. EC-006: due date follows current profile timezone.

#### FR-110 — Rate a reviewed flashcard
**ID**: FR-110
**Feature**: 11. Notes and revision
**Description**: After the back is revealed, the user rates the card Again, Hard, Good or Easy. The rating is recorded once per review and updates the card's schedule (FR-112).
**User story**: As a Registered User, I want to rate a reviewed card, so that the system schedules it according to how well I recalled it.
**Acceptance criteria**:
1. AC-FR-110-1 — Given a revealed card, when the user selects Good, then one review is recorded and the card leaves today's queue.
2. AC-FR-110-2 — Given a revealed card, when the user selects Again, then the card is shown again later the same day.
3. AC-FR-110-3 — Given the rating request is sent twice because of a retry with the same request key, when processed, then only one review is recorded.
4. AC-FR-110-4 — Given a value other than Again, Hard, Good or Easy, when submitted, then it is rejected.
**Priority**: Could Have
**Phase**: 2
**Dependencies**: FR-109,FR-112,NFR-053
**Business rules**: None
**Expected system behavior**: The system records the rating with the server time and applies the schedule result before showing the next card.
**Errors and edge cases**: Failed save: message says rating was not saved, card stays in the queue. EC-021: duplicate submission is idempotent.

#### FR-111 — Daily review limit
**ID**: FR-111
**Feature**: 11. Notes and revision
**Description**: The user may set a daily review limit, default 50 cards, range 1 to 500 (proposed). The queue offers at most that many cards per day, overdue first; the remainder stay due.
**User story**: As a Registered User, I want to limit how many cards I review per day, so that reviews stay manageable.
**Acceptance criteria**:
1. AC-FR-111-1 — Given no change to settings, when the user views limits, then the daily limit is 50.
2. AC-FR-111-2 — Given 80 due cards and the limit 50, when the queue is opened, then 50 cards are offered and 30 remain due.
3. AC-FR-111-3 — Given the user has reviewed 50 cards today, when the queue is opened, then it shows that the daily limit is reached.
4. AC-FR-111-4 — Given a limit of 0 or 501, when saved, then it is rejected.
**Priority**: Could Have
**Phase**: 2
**Dependencies**: FR-109,NFR-062
**Business rules**: None
**Expected system behavior**: The default is held as configuration, not repeated in features. Changes apply from the current day. A review limit counts reviews, including Again repeats once per card per day.
**Errors and edge cases**: Invalid limit: message states the allowed range 1-500. No registered edge case.

#### FR-112 — Spaced-repetition scheduling
**ID**: FR-112
**Feature**: 11. Notes and revision
**Description**: The system schedules each card's next review from the user's ratings. The algorithm is a design choice; observable behavior is: Again brings the card back the same day, Hard gives a shorter interval than Good, Good gives a longer interval than Hard, and Easy gives the longest interval.
**User story**: As a Registered User, I want to have cards scheduled by my ratings, so that I see hard cards more often and easy cards less often.
**Acceptance criteria**:
1. AC-FR-112-1 — Given a card rated Again, when the rating is saved, then the card is due again on the same local day.
2. AC-FR-112-2 — Given the same new card rated Good in one case and Easy in another, when the next due dates are compared, then the Easy interval is greater than the Good interval.
3. AC-FR-112-3 — Given the same card rated Hard and Good in turn, when compared, then the Hard interval is shorter than or equal to the Good interval and is at least 1 day.
4. AC-FR-112-4 — Given any rating result, when the due date is computed, then it is derived from the profile-timezone date at review time.
**Priority**: Could Have
**Phase**: 2
**Dependencies**: FR-110,NFR-062
**Business rules**: BR-030
**Expected system behavior**: The system updates the card's next due date on each rating and keeps the interval history so the schedule is reproducible.
**Errors and edge cases**: No user-facing error. EC-006: day boundary follows the current profile timezone and past reviews are not recomputed.

## 12. Exam preparation

Exams link one subject, a date and a topic checklist, show a countdown, and archive after the date (FR-120..125, Should Have, MVP). Readiness as labelled topic coverage (FR-126..128, BR-024) is Could Have, Phase 2.

#### FR-120 — Create an exam
**ID**: FR-120
**Feature**: 12. Exam preparation
**Description**: The user creates an exam with a title, one subject and a date. The date must be today or later. Topics are linked through FR-122.
**User story**: As a Registered User, I want to create an exam, so that I can prepare against a fixed date.
**Acceptance criteria**:
1. AC-FR-120-1 — Given subject Chemistry, title "Midterm" and a date 30 days ahead, when saved, then the exam is listed with a countdown of 30 days.
2. AC-FR-120-2 — Given an exam date earlier than today in the profile timezone, when saved, then it is rejected and no exam is created.
3. AC-FR-120-3 — Given an exam with no subject, when saved, then it is rejected.
4. AC-FR-120-4 — Given a title of 201 characters, when saved, then it is rejected.
**Priority**: Should Have
**Phase**: MVP
**Dependencies**: FR-010,FR-122,NFR-016
**Business rules**: BR-023
**Expected system behavior**: The exam is linked to exactly one subject and has a date as a fixed anchor. Plan entries after the exam date for its topics later show a warning (BR-025).
**Errors and edge cases**: Past date: message says exam date cannot be in the past. Missing subject or title: message says it is required. EC-013: past date on create rejected.

#### FR-121 — Edit an exam
**ID**: FR-121
**Feature**: 12. Exam preparation
**Description**: The user edits an exam's title, subject, date or topics. The date may be edited to a past date after creation.
**User story**: As a Registered User, I want to edit an exam, so that my exam details stay current.
**Acceptance criteria**:
1. AC-FR-121-1 — Given an exam, when the date is moved from 10 May to 12 May, then the countdown increases by 2 days.
2. AC-FR-121-2 — Given an exam date edited to yesterday, when saved, then the edit is accepted and the exam archives automatically the next day.
3. AC-FR-121-3 — Given a stale edit from another tab, when saved, then it is rejected with a "changed elsewhere" message.
4. AC-FR-121-4 — Given the subject is changed, when saved, then topics linked from the old subject are removed from the checklist.
**Priority**: Should Have
**Phase**: MVP
**Dependencies**: FR-120,NFR-094
**Business rules**: BR-023
**Expected system behavior**: Edits take effect at once in the countdown and plan warnings. Changing the subject clears topics that do not belong to the new subject.
**Errors and edge cases**: Stale version: exam changed elsewhere. EC-013: past date allowed on edit. EC-020: optimistic version rejection.

#### FR-122 — Exam topic checklist
**ID**: FR-122
**Feature**: 12. Exam preparation
**Description**: The user selects which topics of the exam's subject are on the exam and marks each topic complete or not complete. Topics soft-deleted later are dropped from the checklist and the change is noted.
**User story**: As a Registered User, I want to keep a topic checklist for an exam, so that I can see what is left to prepare.
**Acceptance criteria**:
1. AC-FR-122-1 — Given an exam with 5 topics, when the user marks 2 complete, then the checklist shows 2 of 5 complete.
2. AC-FR-122-2 — Given a topic that is soft-deleted, when the checklist is viewed, then the topic is no longer counted and a note says one topic was removed.
3. AC-FR-122-3 — Given an exam with zero topics, when viewed, then an "add topics" empty state is shown with no error.
4. AC-FR-122-4 — Given a topic of another subject, when added, then it is rejected.
**Priority**: Should Have
**Phase**: MVP
**Dependencies**: FR-120,FR-013
**Business rules**: BR-023
**Expected system behavior**: Completion marks are per exam. Counts never divide by zero; with no topics no ratio is shown.
**Errors and edge cases**: Add topic of wrong subject: message asks to choose topics of the exam subject. EC-008: deleted topic dropped with a note. EC-014: zero topics shows empty state.

#### FR-123 — Exam countdown
**ID**: FR-123
**Feature**: 12. Exam preparation
**Description**: Each upcoming exam shows the number of whole days remaining from today in the profile timezone: 0 on exam day and "Today" label. The countdown is also shown on the dashboard.
**User story**: As a Registered User, I want to see days remaining to an exam, so that I know how much time I have left.
**Acceptance criteria**:
1. AC-FR-123-1 — Given an exam 14 days ahead, when viewed, then the countdown reads 14 days.
2. AC-FR-123-2 — Given an exam today, when viewed, then it reads "Today" (0 days).
3. AC-FR-123-3 — Given the user changes timezone so that today moves by one day, when viewed, then the countdown uses the new local date.
4. AC-FR-123-4 — Given several upcoming exams, when listed, then the nearest exam is first.
**Priority**: Should Have
**Phase**: MVP
**Dependencies**: FR-120,NFR-001
**Business rules**: BR-025, BR-030
**Expected system behavior**: Days are computed from calendar dates in the user's timezone, not from 24-hour blocks, so DST days do not shift the count.
**Errors and edge cases**: No error state. EC-006: timezone change recomputes only the countdown, not stored history.

#### FR-124 — Archive exams after the exam date
**ID**: FR-124
**Feature**: 12. Exam preparation
**Description**: An exam whose date has passed is archived automatically at the start of the next day in the profile timezone. It is not deleted.
**User story**: As a Registered User, I want to have past exams archived, so that my active list holds only upcoming exams.
**Acceptance criteria**:
1. AC-FR-124-1 — Given an exam dated yesterday, when today starts, then it is in the archive and not in the upcoming list.
2. AC-FR-124-2 — Given an exam dated today, when viewed today, then it is still upcoming.
3. AC-FR-124-3 — Given an exam edited to a past date, when the next day starts, then it is archived.
4. AC-FR-124-4 — Given an archived exam, when its date is edited to a future date, then it returns to upcoming.
**Priority**: Should Have
**Phase**: MVP
**Dependencies**: FR-120,NFR-093
**Business rules**: BR-025
**Expected system behavior**: Archiving is a state, so the exam, checklist and links remain stored. Plan warnings for archived exams stop.
**Errors and edge cases**: No error state. EC-013: past date after creation is auto-archived next day.

#### FR-125 — View archived exams
**ID**: FR-125
**Feature**: 12. Exam preparation
**Description**: The user opens the list of archived exams to see title, subject, date and final checklist completion. Archived exams are read-only apart from a date change that restores them.
**User story**: As a Registered User, I want to view archived exams, so that I can look back at past exams.
**Acceptance criteria**:
1. AC-FR-125-1 — Given 3 archived exams, when the archive is opened, then 3 exams are listed newest first.
2. AC-FR-125-2 — Given an archived exam, when opened, then title, subject, date and checklist completion are shown.
3. AC-FR-125-3 — Given an archived exam, when the user tries to mark a topic, then the change is not allowed.
4. AC-FR-125-4 — Given no archived exams, when opened, then an empty state is shown.
**Priority**: Should Have
**Phase**: MVP
**Dependencies**: FR-124,NFR-001
**Business rules**: BR-025
**Expected system behavior**: The archive is limited to the owner. It loads within the performance limit of the main exam list.
**Errors and edge cases**: No error state. No registered edge case.

#### FR-126 — Exam readiness score
**ID**: FR-126
**Feature**: 12. Exam preparation
**Description**: The exam shows readiness as completed-topic weight divided by total topic weight, as a percentage, with equal weights by default, together with days remaining. Phase 2.
**User story**: As a Registered User, I want to see a readiness percentage for an exam, so that I can gauge my preparation.
**Acceptance criteria**:
1. AC-FR-126-1 — Given 10 equally weighted topics with 4 complete, when viewed, then readiness shows 40%.
2. AC-FR-126-2 — Given all topics complete, when viewed, then readiness is 100%.
3. AC-FR-126-3 — Given zero topics, when viewed, then no percentage is shown and the "add topics" state appears.
4. AC-FR-126-4 — Given a topic is soft-deleted, when viewed, then the denominator excludes it and a note records the change.
**Priority**: Could Have
**Phase**: 2
**Dependencies**: FR-122,NFR-003
**Business rules**: BR-024
**Expected system behavior**: Readiness updates immediately on checklist changes. The result is rounded to a whole percent.
**Errors and edge cases**: Zero topics: empty state, no divide-by-zero. EC-008: deleted topic leaves denominator. EC-014: all complete gives 100%.

#### FR-127 — Weighted topics in readiness
**ID**: FR-127
**Feature**: 12. Exam preparation
**Description**: Topics carry an optional weight of 1 to 5 (default 1). Readiness uses the weights. Phase 2.
**User story**: As a Registered User, I want to weight topics in readiness, so that harder topics count for more.
**Acceptance criteria**:
1. AC-FR-127-1 — Given topics with weights 3 and 1, when only the weight-3 topic is complete, then readiness is 75%.
2. AC-FR-127-2 — Given topics with no weights set, when viewed, then all weights are 1.
3. AC-FR-127-3 — Given a weight of 6 or 0, when saved, then it is rejected.
4. AC-FR-127-4 — Given all weights are changed, when viewed, then readiness is recomputed at once.
**Priority**: Could Have
**Phase**: 2
**Dependencies**: FR-126,FR-011
**Business rules**: BR-024
**Expected system behavior**: Readiness equals the sum of completed weights over the sum of all weights (BR-024).
**Errors and edge cases**: Invalid weight: message states 1 to 5. EC-014: zero topics shows empty state.

#### FR-128 — Label readiness as topic coverage
**ID**: FR-128
**Feature**: 12. Exam preparation
**Description**: Wherever readiness is displayed, it is labelled "topic coverage" with a note that it is not a prediction of the exam result. Phase 2.
**User story**: As a Registered User, I want to see readiness described honestly, so that I do not mistake it for a score prediction.
**Acceptance criteria**:
1. AC-FR-128-1 — Given a readiness value is shown, when viewed, then the label reads topic coverage and not score.
2. AC-FR-128-2 — Given the readiness panel, when the user opens its help, then it states it is not a grade prediction.
3. AC-FR-128-3 — Given a screen reader, when the value is read, then the label and percentage are announced together.
4. AC-FR-128-4 — Given the dashboard and exam page, when both show readiness, then both use the same label.
**Priority**: Could Have
**Phase**: 2
**Dependencies**: FR-126,NFR-044
**Business rules**: BR-024
**Expected system behavior**: BR-024 defines readiness as a coverage measure. The label is fixed for all places.
**Errors and edge cases**: No error state. No registered edge case.

## 13. Data export

Users own their data and can export it as CSV or JSON as a point-in-time snapshot (BR-032). Phase-1 priority: Should Have, phase MVP.

#### FR-130 — Export data as CSV
**ID**: FR-130
**Feature**: 13. Data export
**Description**: The user exports their own data as CSV: subjects, topics, sessions, plan entries, to-dos, notes and exams, one file per data type. Dates are in UTC with the recorded timezone.
**User story**: As a Registered User, I want to export my data as CSV, so that I own and can reuse my data.
**Acceptance criteria**:
1. AC-FR-130-1 — Given an account with data of all 7 types, when CSV export is requested, then 7 files are provided.
2. AC-FR-130-2 — Given 10,000 sessions, when exported, then the export finishes within 60 seconds.
3. AC-FR-130-3 — Given the export, when session durations are summed, then the total equals the total shown in statistics.
4. AC-FR-130-4 — Given the user requests the export, when it runs, then it contains no data of other users.
**Priority**: Should Have
**Phase**: MVP
**Dependencies**: FR-132,NFR-005,NFR-032
**Business rules**: BR-032
**Expected system behavior**: The export is a point-in-time snapshot taken when it starts. Changes made while it runs are not included.
**Errors and edge cases**: Failure: message says export failed and may be retried. EC-027: snapshot; later changes not included.

#### FR-131 — Export data as JSON
**ID**: FR-131
**Feature**: 13. Data export
**Description**: The user exports the same data as one JSON file preserving relations between subjects, topics, sessions, plan entries, to-dos, notes and exams.
**User story**: As a Registered User, I want to export my data as JSON, so that I can move my data to another tool.
**Acceptance criteria**:
1. AC-FR-131-1 — Given the data set, when JSON export is requested, then one file is produced containing all 7 types.
2. AC-FR-131-2 — Given a session linked to a topic, when exported, then the link to the topic is present.
3. AC-FR-131-3 — Given archived subjects, when exported, then they are included and marked archived.
4. AC-FR-131-4 — Given a 10,000-session account, when exported, then it completes within 60 seconds.
**Priority**: Should Have
**Phase**: MVP
**Dependencies**: FR-132,NFR-005,NFR-032
**Business rules**: BR-032
**Expected system behavior**: Markdown notes are exported as stored source. The file is a snapshot at start time.
**Errors and edge cases**: Failure: message with retry. EC-027: snapshot semantics.

#### FR-132 — Export progress and failure handling
**ID**: FR-132
**Feature**: 13. Data export
**Description**: The system shows export progress, offers the file for download on completion, and handles failure without partial downloads. Only one export per user runs at a time.
**User story**: As a Registered User, I want to see progress and clear failure of an export, so that I know whether my export worked.
**Acceptance criteria**:
1. AC-FR-132-1 — Given an export is running, when the user views the page, then a progress indicator is visible.
2. AC-FR-132-2 — Given an export is running, when the user starts another, then the request is refused with a message that one is in progress.
3. AC-FR-132-3 — Given the export fails, when the failure occurs, then no partial file is offered and retry is available.
4. AC-FR-132-4 — Given a finished export, when downloaded, then the file stays available for download for at least 24 hours.
**Priority**: Should Have
**Phase**: MVP
**Dependencies**: FR-130,FR-131,NFR-054
**Business rules**: BR-032
**Expected system behavior**: Export requests are limited to the owner and the result is a snapshot. The completion state is announced to assistive technology.
**Errors and edge cases**: In progress: message says an export is already running. Failure: message says nothing was exported. EC-027: snapshot semantics.

## 14. Onboarding

A skippable wizard gets a new user to a first saved session in under 3 minutes (USER-JOURNEYS journey 1). Only account creation is mandatory. Phase-1 priority: Should Have, phase MVP.

#### FR-134 — Onboarding wizard
**ID**: FR-134
**Feature**: 14. Onboarding
**Description**: After first sign-up, a wizard guides the user through choosing a primary goal, creating a first subject, confirming a daily goal (default 120 minutes) and the timezone, and starting a guided first session. The whole wizard can be completed in under 3 minutes.
**User story**: As a Registered User, I want to go through a short onboarding wizard, so that I can start tracking quickly.
**Acceptance criteria**:
1. AC-FR-134-1 — Given a newly registered user, when they first land, then the wizard begins at step 1.
2. AC-FR-134-2 — Given the user accepts defaults, when they finish all steps, then the elapsed time from start to saved first session is under 3 minutes.
3. AC-FR-134-3 — Given the daily goal step, when the user accepts defaults, then the goal is 120 minutes.
4. AC-FR-134-4 — Given the timezone step, when the detected zone is shown, then the user can confirm or change it before finishing.
**Priority**: Should Have
**Phase**: MVP
**Dependencies**: FR-001,FR-070,NFR-001
**Business rules**: BR-013
**Expected system behavior**: The wizard writes each choice at once, so leaving mid-way keeps completed steps. Completion is recorded so it is not shown again.
**Errors and edge cases**: Invalid goal outside 5-1440: message states range. EC-006: timezone confirmed here becomes the profile zone.

#### FR-135 — Skip onboarding steps
**ID**: FR-135
**Feature**: 14. Onboarding
**Description**: Every wizard step except account creation may be skipped, and the whole wizard can be dismissed. The user can reopen it later from settings.
**User story**: As a Registered User, I want to skip onboarding steps, so that I am not forced through setup.
**Acceptance criteria**:
1. AC-FR-135-1 — Given any wizard step, when the user selects skip, then the next step is shown and nothing is saved for the skipped step.
2. AC-FR-135-2 — Given the user dismisses the wizard, when they reach the dashboard, then defaults are used: goal 120 minutes, detected timezone.
3. AC-FR-135-3 — Given a skipped wizard, when the user opens settings, then an option to restart it is present.
4. AC-FR-135-4 — Given a keyboard-only user, when on a step, then skip is reachable by keyboard.
**Priority**: Should Have
**Phase**: MVP
**Dependencies**: FR-134,NFR-041
**Business rules**: None
**Expected system behavior**: Skipping never blocks use of the product; missing items show empty states.
**Errors and edge cases**: No error state. No registered edge case.

#### FR-136 — Guided first session
**ID**: FR-136
**Feature**: 14. Onboarding
**Description**: The last step offers a guided first session: the user picks the subject and starts a timer with a hint at each control. Sessions under 1 minute are discarded as usual.
**User story**: As a Registered User, I want to do a guided first session, so that I learn how the timer works.
**Acceptance criteria**:
1. AC-FR-136-1 — Given a created subject, when the user chooses the guided session, then a timer starts and acknowledges within 200 ms.
2. AC-FR-136-2 — Given the guided session is stopped after 30 seconds, when stopped, then it is discarded and a message states that sessions under 1 minute are not saved.
3. AC-FR-136-3 — Given the guided session lasts 10 minutes, when stopped, then 10 minutes are saved to the chosen subject.
4. AC-FR-136-4 — Given the user skips the guided session, when finishing, then the wizard completes without a session.
**Priority**: Should Have
**Phase**: MVP
**Dependencies**: FR-134,FR-050,NFR-004
**Business rules**: BR-008
**Expected system behavior**: The guided session is a normal session with extra hints; there are no special rules.
**Errors and edge cases**: Discard under 1 minute: message states the result. No registered edge case.

#### FR-137 — Choose primary goal in onboarding
**ID**: FR-137
**Feature**: 14. Onboarding
**Description**: The first wizard step asks for a primary goal: exam preparation, coursework or self-learning. The answer tailors suggested next steps only and does not change features or rules.
**User story**: As a Registered User, I want to say what I am studying for, so that suggestions fit my situation.
**Acceptance criteria**:
1. AC-FR-137-1 — Given the first step, when displayed, then exactly 3 options are shown.
2. AC-FR-137-2 — Given the user chooses exam preparation, when the wizard ends, then a suggestion to add an exam is shown on the dashboard.
3. AC-FR-137-3 — Given the user skips the step, when finishing, then no goal is stored and generic suggestions appear.
4. AC-FR-137-4 — Given the answer, when exporting data, then the choice is included in profile data.
**Priority**: Should Have
**Phase**: MVP
**Dependencies**: FR-134,NFR-030
**Business rules**: None
**Expected system behavior**: The answer is stored on the profile as an optional preference, limited to data minimization.
**Errors and edge cases**: No error state. No registered edge case.

## 15. Appearance and responsiveness

Theme choice and responsive layout for widths 360 to 2560 px. Phase-1 priority: Should Have, phase MVP.

#### FR-138 — Light, dark and system theme
**ID**: FR-138
**Feature**: 15. Appearance and responsiveness
**Description**: The user chooses light, dark or system theme. System follows the device setting and changes live. The choice persists across sessions and devices.
**User story**: As a Registered User, I want to choose light, dark or system theme, so that the app is comfortable to read.
**Acceptance criteria**:
1. AC-FR-138-1 — Given no choice, when first used, then the theme is system.
2. AC-FR-138-2 — Given the user selects dark, when the page reloads, then dark remains.
3. AC-FR-138-3 — Given system theme and the device switches to dark, when the app is open, then the theme changes without reload.
4. AC-FR-138-4 — Given any theme, when text is measured, then contrast meets WCAG 2.2 AA (4.5:1 for normal text).
**Priority**: Should Have
**Phase**: MVP
**Dependencies**: FR-001,NFR-045,NFR-040
**Business rules**: None
**Expected system behavior**: The preference is stored on the profile and applied before first paint to avoid a flash where possible.
**Errors and edge cases**: Save failure: message says preference was not saved but is applied now. No registered edge case.

#### FR-139 — Responsive layout
**ID**: FR-139
**Feature**: 15. Appearance and responsiveness
**Description**: All features work and remain readable at viewport widths 360 to 2560 px without horizontal scrolling at 360 px, with touch targets of at least 44 by 44 px and a fully usable timer on a phone.
**User story**: As a Registered User, I want to use Lumora on any screen size, so that I can study from my phone or desktop.
**Acceptance criteria**:
1. AC-FR-139-1 — Given a 360 px wide viewport, when any main page is opened, then no horizontal scrolling is needed.
2. AC-FR-139-2 — Given a touch device, when interactive controls are measured, then each is at least 44 by 44 px.
3. AC-FR-139-3 — Given a 2560 px wide viewport, when pages are opened, then content stays readable and not stretched past a comfortable line length.
4. AC-FR-139-4 — Given a phone, when the timer is used, then start, pause and stop are all reachable in one view.
**Priority**: Should Have
**Phase**: MVP
**Dependencies**: NFR-085,NFR-086,NFR-087,NFR-088
**Business rules**: None
**Expected system behavior**: Layouts adapt by width; no feature is desktop-only.
**Errors and edge cases**: No error state. No registered edge case.


## 16. Reminders

Reminders nudge the user to study at a chosen local time and before planned entries. Phase 1 lists Reminders for Phase 2 but defines no business rule for them, so the defaults here (10-minute lead time, in-app plus opt-in browser push) are introduced by this document and recorded as inconsistency I-6. Group priority: Could Have, Phase 2.

#### FR-150 — Daily study reminder
**ID**: FR-150
**Feature**: 16. Reminders
**Description**: The user may enable a daily study reminder delivered at a time of day they choose, interpreted in their profile timezone. The reminder is not sent on a day when the daily goal is already met.
**User story**: As a Registered User, I want a daily reminder at a time I choose, so that I remember to start studying.
**Acceptance criteria**:
1. AC-FR-150-1 — Given reminders are enabled with time 18:00 and goal not met, when local time reaches 18:00, then one reminder is delivered that day.
2. AC-FR-150-2 — Given the daily goal is already met at 17:00, when 18:00 arrives, then 0 reminders are delivered.
3. AC-FR-150-3 — Given the user changes timezone from Europe/Paris to Asia/Tokyo, when the next 18:00 local occurs, then it fires at 18:00 Tokyo time and not twice that day.
**Priority**: Could Have
**Phase**: 2
**Dependencies**: FR-152, FR-153, FR-154, FR-070, NFR-034
**Business rules**: BR-030
**Expected system behavior**: The reminder time is stored as a local time of day and resolved per day in the profile timezone (BR-030). At most one daily reminder is sent per local day. Disabling it takes effect immediately.
**Errors and edge cases**: Invalid time input: tell the user to choose a time between 00:00 and 23:59. EC-006: timezone change re-resolves the reminder in the new zone without duplicate or skipped reminders. EC-024: if push permission is denied, only the in-app indicator is used and the user is prompted to enable push.

#### FR-151 — Plan entry reminder
**ID**: FR-151
**Feature**: 16. Reminders
**Description**: The user may enable a reminder before each plan entry starts. The lead time defaults to 10 minutes and is configurable.
**User story**: As a Registered User, I want a reminder before a planned entry begins, so that I start on time.
**Acceptance criteria**:
1. AC-FR-151-1 — Given a plan entry starts at 15:00 and lead time is the default 10 minutes, when local time is 14:50, then one reminder naming the subject is delivered.
2. AC-FR-151-2 — Given the lead time is set to 30 minutes, when the entry starts at 15:00, then the reminder is delivered at 14:30.
3. AC-FR-151-3 — Given an entry is marked missed or deleted before its reminder time, when 14:50 arrives, then 0 reminders are delivered.
**Priority**: Could Have
**Phase**: 2
**Dependencies**: FR-030, FR-152, FR-153, FR-154, NFR-034
**Business rules**: BR-001
**Expected system behavior**: Reminders are derived from current plan entries; editing the start time reschedules the reminder, and entries created less than the lead time before start remind immediately once. Planned time itself is unchanged (BR-001).
**Errors and edge cases**: Lead time outside 0-120 minutes: tell the user the allowed range. EC-024: if push is blocked, deliver the in-app indicator only and prompt to enable push.

#### FR-152 — In-app notifications
**ID**: FR-152
**Feature**: 16. Reminders
**Description**: While the app is open, the user sees reminders as an in-app notification showing the reminder text and a dismiss action. The notification is exposed to assistive technology.
**User story**: As a Registered User, I want reminders shown inside the app, so that I get them without enabling browser push.
**Acceptance criteria**:
1. AC-FR-152-1 — Given a reminder is due and the app is open, when it fires, then an in-app notification appears within 5 seconds with a dismiss control.
2. AC-FR-152-2 — Given a notification is dismissed, when the page is reloaded, then the same reminder is not shown again.
3. AC-FR-152-3 — Given a screen reader is active, when a reminder appears, then it is announced once.
**Priority**: Could Have
**Phase**: 2
**Dependencies**: FR-150, FR-151, NFR-044
**Business rules**: None
**Expected system behavior**: In-app delivery is available whenever reminders are enabled and requires no permission. Reminders due while the app was closed are shown once, as a single summary, on next open if still relevant.
**Errors and edge cases**: Failed loading of reminders: show a retryable message. EC-024: when browser notifications or sound are blocked, the in-app notification is the fallback and the user is prompted to enable push.

#### FR-153 — Browser push opt-in
**ID**: FR-153
**Feature**: 16. Reminders
**Description**: The user may opt in to browser push notifications for reminders. Permission is requested only after explicit user action, never on page load.
**User story**: As a Registered User, I want to opt in to browser push, so that reminders reach me when the tab is closed.
**Acceptance criteria**:
1. AC-FR-153-1 — Given push is off, when the user clicks Enable push and grants permission, then push is marked on and a test notification arrives within 10 seconds.
2. AC-FR-153-2 — Given the user denies permission, when the prompt closes, then push remains off and a message explains how to enable it in browser settings.
3. AC-FR-153-3 — Given push is on, when the user turns it off, then 0 push notifications are sent after that action.
**Priority**: Could Have
**Phase**: 2
**Dependencies**: FR-154, NFR-030
**Business rules**: None
**Expected system behavior**: Push is per browser and off by default. Turning it off removes the stored subscription. Notification content contains only the reminder text and subject name.
**Errors and edge cases**: Permission denied or unsupported browser: explain the state and keep in-app reminders. EC-024: denied permission degrades to the in-app indicator and prompts the user to enable.

#### FR-154 — Reminder preferences
**ID**: FR-154
**Feature**: 16. Reminders
**Description**: The user manages reminder preferences in one place: daily reminder on/off and time, plan-entry reminders on/off and lead time, and push on/off.
**User story**: As a Registered User, I want one place for reminder preferences, so that I control when I am interrupted.
**Acceptance criteria**:
1. AC-FR-154-1 — Given a new account, when preferences are opened, then all reminders are off and the lead time shows 10 minutes.
2. AC-FR-154-2 — Given the user changes the lead time to 20 minutes and saves, when the page is reloaded, then 20 is shown.
3. AC-FR-154-3 — Given the user turns all reminders off, when any reminder time passes, then 0 reminders are delivered.
**Priority**: Could Have
**Phase**: 2
**Dependencies**: FR-150, FR-151, FR-153, NFR-030
**Business rules**: None
**Expected system behavior**: Preferences are saved per account and apply to all of the user's devices, except push which is per browser.
**Errors and edge cases**: Save failure: show a retryable error and keep the entered values (NFR-054). No registered edge case.

## 17. Streaks

Streaks reward daily consistency. A day counts when the daily goal is met (BR-020, decision (b)); a missed day resets the streak unless the weekly freeze covers it (BR-021); the longest streak is kept and timezone changes never reduce a streak (BR-022). Group priority: Could Have, Phase 2.

#### FR-160 — Current streak
**ID**: FR-160
**Feature**: 17. Streaks
**Description**: The current streak is the number of consecutive days, ending today or yesterday, on which the daily goal was met. A day counts only when its goal is met (BR-020, decision (b)).
**User story**: As a Registered User, I want to see my current streak, so that I stay consistent.
**Acceptance criteria**:
1. AC-FR-160-1 — Given the goal was met on each of the last 5 days including today, when the streak is shown, then it is 5.
2. AC-FR-160-2 — Given the goal was met for the previous 4 days and today is in progress and not yet met, when the streak is shown, then it is 4 and today is marked pending.
3. AC-FR-160-3 — Given a day with 30 minutes studied against a target of 120, when the streak is computed, then that day does not count.
**Priority**: Could Have
**Phase**: 2
**Dependencies**: FR-070, FR-072, NFR-091
**Business rules**: BR-020
**Expected system behavior**: Days are evaluated in the profile timezone using the target in force that day (BR-015). The streak is recomputed when sessions are added, edited or deleted.
**Errors and edge cases**: EC-004: a missed day is marked goal not met with no penalty in MVP. EC-006: day boundaries use each session's frozen local date.

#### FR-161 — Streak reset after a missed day
**ID**: FR-161
**Feature**: 17. Streaks
**Description**: When a full local day passes without the goal met and no freeze applies, the current streak resets to 0 (BR-021).
**User story**: As a Registered User, I want the streak to reset after a missed day, so that it reflects real consistency.
**Acceptance criteria**:
1. AC-FR-161-1 — Given a streak of 7 and yesterday's goal was not met with no freeze, when today begins, then the streak is 0.
2. AC-FR-161-2 — Given the goal is met today after a reset, when the streak is shown, then it is 1.
3. AC-FR-161-3 — Given the user is mid-day with goal unmet, when the streak is shown, then it is not reset until the local day ends.
**Priority**: Could Have
**Phase**: 2
**Dependencies**: FR-160, FR-162, NFR-091
**Business rules**: BR-021
**Expected system behavior**: The reset happens only after the local day ends. The longest streak is unaffected by the reset.
**Errors and edge cases**: The user is told in plain terms why the streak reset. EC-004: in Phase 2 a missed day resets the streak unless a freeze covers it.

#### FR-162 — Weekly streak freeze
**ID**: FR-162
**Feature**: 17. Streaks
**Description**: One freeze per week may cover one missed day so that it does not reset the streak (BR-021). A covered day does not add to the streak count.
**User story**: As a Registered User, I want a weekly freeze for one missed day, so that one bad day does not erase my streak.
**Acceptance criteria**:
1. AC-FR-162-1 — Given an available freeze and one missed day, when the day ends, then the freeze is consumed and the streak stays unchanged.
2. AC-FR-162-2 — Given the freeze was already used this week and a second day is missed, when that day ends, then the streak resets to 0.
3. AC-FR-162-3 — Given a new week begins, when the streak page is opened, then 1 freeze is available again.
**Priority**: Could Have
**Phase**: 2
**Dependencies**: FR-160, FR-161, NFR-091
**Business rules**: BR-021
**Expected system behavior**: The freeze is applied automatically to the first missed day of the week; the week is defined by the profile timezone. Used freezes are visible in the streak history.
**Errors and edge cases**: Message states a freeze was used or that none remain this week. EC-004: a freeze exempts the reset for one missed day only.

#### FR-163 — Longest streak
**ID**: FR-163
**Feature**: 17. Streaks
**Description**: The longest streak ever reached is stored and shown next to the current streak (BR-022). It never decreases.
**User story**: As a Registered User, I want to see my longest streak, so that I have a personal best to beat.
**Acceptance criteria**:
1. AC-FR-163-1 — Given a current streak of 12 and a stored longest of 10, when the streak is shown, then the longest becomes 12.
2. AC-FR-163-2 — Given the current streak resets to 0, when the longest is shown, then it remains 12.
3. AC-FR-163-3 — Given a new account, when streaks are shown, then both values are 0.
**Priority**: Could Have
**Phase**: 2
**Dependencies**: FR-160, NFR-091
**Business rules**: BR-022
**Expected system behavior**: The longest value is updated whenever the current streak exceeds it and persists across resets.
**Errors and edge cases**: Deleting sessions may lower the current streak but the stored longest is kept. No registered edge case.

#### FR-164 — Streak stability across timezone change
**ID**: FR-164
**Feature**: 17. Streaks
**Description**: Changing the profile timezone never reduces an existing streak (BR-022). Past days keep the local date frozen at the time of study.
**User story**: As a Registered User, I want my streak preserved after a timezone change, so that travel does not cost me progress.
**Acceptance criteria**:
1. AC-FR-164-1 — Given a streak of 9, when the timezone changes from America/New_York to Asia/Tokyo, then the streak is 9 or higher right after the change.
2. AC-FR-164-2 — Given the change creates a local day with no study, when computed, then that day does not reset the streak on the change day.
3. AC-FR-164-3 — Given a longest streak of 20, when the timezone changes, then the longest remains 20.
**Priority**: Could Have
**Phase**: 2
**Dependencies**: FR-160, FR-163, NFR-091
**Business rules**: BR-022
**Expected system behavior**: Past days are not recomputed. Only days after the change use the new zone's boundaries.
**Errors and edge cases**: EC-006: sessions keep their frozen local date; a DST day may be 23 or 25 hours and does not alter the rule.

## 18. XP and levels

XP converts focused study into progress through an append-only ledger with a daily cap and level thresholds. The level formula (level n requires 100*n*(n+1)/2 cumulative XP) is a proposal pending approval (U-2). Group priority: Could Have, Phase 2.

#### FR-170 — Award XP for focused minutes
**ID**: FR-170
**Feature**: 18. XP and levels
**Description**: The user earns 1 XP for each focused minute of a qualifying timer session (BR-017). Awards are written to the XP ledger when the session completes.
**User story**: As a Registered User, I want XP for focused minutes, so that studying feels rewarded.
**Acceptance criteria**:
1. AC-FR-170-1 — Given a completed 25-minute timer session, when it ends, then 25 XP is added.
2. AC-FR-170-2 — Given a 59-minute session, when it ends, then 59 XP is added.
3. AC-FR-170-3 — Given the save request is repeated, when processed, then total XP is unchanged.
**Priority**: Could Have
**Phase**: 2
**Dependencies**: FR-040, FR-050, FR-176, NFR-095
**Business rules**: BR-017
**Expected system behavior**: Focused minutes come from server-recorded durations (BR-012), excluding breaks. The XP total updates in the user's view immediately after completion.
**Errors and edge cases**: EC-017: repeat awards are no-ops; retries cannot double-award.

#### FR-171 — Award XP for meeting the daily goal
**ID**: FR-171
**Feature**: 18. XP and levels
**Description**: The user earns +20 XP once per day when the daily goal is met (BR-017).
**User story**: As a Registered User, I want a bonus when I meet my daily goal, so that consistency is rewarded.
**Acceptance criteria**:
1. AC-FR-171-1 — Given target 120 and progress reaches 120 minutes, when the goal is first met, then +20 XP is awarded.
2. AC-FR-171-2 — Given progress later reaches 200 minutes the same day, when evaluated, then no second +20 is awarded.
3. AC-FR-171-3 — Given progress is 119 minutes, when evaluated, then 0 bonus XP is awarded.
**Priority**: Could Have
**Phase**: 2
**Dependencies**: FR-070, FR-072, FR-176, NFR-095
**Business rules**: BR-017
**Expected system behavior**: The bonus is keyed to the local day and awarded once. Goal met uses progress >= target (BR-015).
**Errors and edge cases**: EC-017: the bonus is unique per user, day and rule; if later edits drop progress below target, a compensating adjustment is applied.

#### FR-172 — Award XP for completed High-priority to-dos
**ID**: FR-172
**Feature**: 18. XP and levels
**Description**: The user earns +10 XP when a High-priority to-do is completed (BR-017). Medium and Low priority to-dos award nothing.
**User story**: As a Registered User, I want XP for completed High-priority to-dos, so that important work is rewarded.
**Acceptance criteria**:
1. AC-FR-172-1 — Given an open High to-do, when marked done, then +10 XP is awarded.
2. AC-FR-172-2 — Given a Medium to-do, when marked done, then 0 XP is awarded.
3. AC-FR-172-3 — Given a High to-do is reopened and marked done again, when evaluated, then no second +10 is awarded.
**Priority**: Could Have
**Phase**: 2
**Dependencies**: FR-093, FR-096, FR-176, NFR-095
**Business rules**: BR-017
**Expected system behavior**: The award is tied to the to-do's completion event; re-completion is a no-op. The award counts toward the daily cap (BR-018).
**Errors and edge cases**: EC-017: duplicate completion events award once.

#### FR-173 — Daily XP cap
**ID**: FR-173
**Feature**: 18. XP and levels
**Description**: Total XP earned per local day is capped at 600 (BR-018). The cap is applied at award time and the configured value is data-driven.
**User story**: As a Registered User, I want a daily XP cap, so that progress reflects consistent effort.
**Acceptance criteria**:
1. AC-FR-173-1 — Given 590 XP earned today, when a new 25-minute session would earn 25 XP, then only 10 XP is awarded.
2. AC-FR-173-2 — Given 600 XP earned today, when more XP is earned, then 0 is added and the view states the cap is reached.
3. AC-FR-173-3 — Given a new local day begins, when XP is earned, then the daily counter starts at 0.
**Priority**: Could Have
**Phase**: 2
**Dependencies**: FR-170, FR-171, FR-172, NFR-062
**Business rules**: BR-018
**Expected system behavior**: The cap counts all rule awards of the local day. Awards that would exceed the cap are truncated, not deferred.
**Errors and edge cases**: Message says the daily cap of 600 XP is reached. EC-017: the cap is applied at award time and retries cannot bypass it.

#### FR-174 — XP exclusions
**ID**: FR-174
**Feature**: 18. XP and levels
**Description**: No XP is awarded for manual entries or for sessions shorter than 5 minutes (BR-018, BR-010).
**User story**: As a Registered User, I want XP only for real timer sessions of 5 minutes or more, so that XP is trustworthy.
**Acceptance criteria**:
1. AC-FR-174-1 — Given a manual entry of 60 minutes, when saved, then 0 XP is awarded.
2. AC-FR-174-2 — Given a timer session of 4 minutes, when it ends, then 0 XP is awarded.
3. AC-FR-174-3 — Given a timer session of exactly 5 minutes, when it ends, then 5 XP is awarded.
**Priority**: Could Have
**Phase**: 2
**Dependencies**: FR-170, FR-042, NFR-095
**Business rules**: BR-018,BR-010
**Expected system behavior**: Excluded sessions still count toward time and statistics. The result is stated to the user.
**Errors and edge cases**: Message explains that the session earned no XP and why. EC-017: exclusions are evaluated once per source event.

#### FR-175 — Levels
**ID**: FR-175
**Feature**: 18. XP and levels
**Description**: Levels are derived from cumulative XP using a fixed threshold table: level n requires 100*n*(n+1)/2 cumulative XP, i.e. 100, 300, 600, 1000 (BR-019; proposal U-2). The table is data-driven.
**User story**: As a Registered User, I want a level and progress bar, so that I see how far I have come.
**Acceptance criteria**:
1. AC-FR-175-1 — Given 99 cumulative XP, when the level is shown, then it is level 0.
2. AC-FR-175-2 — Given 300 cumulative XP, when the level is shown, then it is level 2.
3. AC-FR-175-3 — Given 599 cumulative XP, when the level is shown, then it is level 2 with 1 XP remaining to level 3 at 600.
**Priority**: Could Have
**Phase**: 2
**Dependencies**: FR-176, NFR-062
**Business rules**: BR-019
**Expected system behavior**: Level is a pure function of cumulative XP. Progress shows XP in the current level and XP needed for the next.
**Errors and edge cases**: Level never decreases except after session deletion or correction (BR-019). No registered edge case.

#### FR-176 — Idempotent XP ledger
**ID**: FR-176
**Feature**: 18. XP and levels
**Description**: Every XP change is a ledger entry unique by user, source event and rule. Repeating an award is a no-op (BR-019).
**User story**: As a Registered User, I want each award recorded once, so that XP is never duplicated.
**Acceptance criteria**:
1. AC-FR-176-1 — Given an award exists for a session, when the same award is submitted again, then 0 new entries are created.
2. AC-FR-176-2 — Given a failed request is retried 3 times, when finished, then exactly 1 award exists.
3. AC-FR-176-3 — Given two concurrent identical requests, when processed, then total XP increases once.
**Priority**: Could Have
**Phase**: 2
**Dependencies**: FR-170, FR-171, FR-172, NFR-053, NFR-095
**Business rules**: BR-019
**Expected system behavior**: Ledger entries are never deleted; total XP is the sum of entries.
**Errors and edge cases**: EC-017: duplicates are silently ignored and the user sees the single result.

#### FR-177 — XP adjustment on session edit or delete
**ID**: FR-177
**Feature**: 18. XP and levels
**Description**: When a session is edited or deleted, the system adds a compensating entry (negative or positive); original entries remain (BR-019).
**User story**: As a Registered User, I want XP corrected when I edit or delete a session, so that XP matches real study.
**Acceptance criteria**:
1. AC-FR-177-1 — Given a 30-minute session that earned 30 XP is deleted, when processed, then a -30 entry is added and the original remains.
2. AC-FR-177-2 — Given the session is edited from 30 to 20 minutes, when saved, then a -10 entry is added.
3. AC-FR-177-3 — Given the session is edited again to 20 minutes, when saved, then 0 entries are added.
**Priority**: Could Have
**Phase**: 2
**Dependencies**: FR-170, FR-176, FR-043, FR-044, NFR-095
**Business rules**: BR-019
**Expected system behavior**: Adjustments respect exclusions and the cap. Total XP never goes below 0.
**Errors and edge cases**: EC-017: adjustments are compensating entries and never delete ledger rows.

## 19. Ambient audio

Ambient audio offers built-in background loops (rain, white noise, cafe) during a running session. Only CC0 or properly licensed assets are used. Group priority: Could Have, Phase 2.

#### FR-180 — Choose an ambient loop
**ID**: FR-180
**Feature**: 19. Ambient audio
**Description**: The user may choose one built-in ambient loop (rain, white noise, cafe) or none. Only CC0 or licensed assets are used.
**User story**: As a Registered User, I want to choose an ambient loop, so that I can focus with background sound.
**Acceptance criteria**:
1. AC-FR-180-1 — Given the audio picker, when opened, then exactly 4 options are shown: None, Rain, White noise, Cafe.
2. AC-FR-180-2 — Given Rain is selected during a running session, when applied, then rain plays within 2 seconds.
3. AC-FR-180-3 — Given None is selected, when applied, then audio stops.
**Priority**: Could Have
**Phase**: 2
**Dependencies**: FR-181, FR-182, NFR-041
**Business rules**: None
**Expected system behavior**: Loops play seamlessly. The picker is keyboard operable.
**Errors and edge cases**: Asset fails to load: say the sound is unavailable and continue silently. No registered edge case.

#### FR-181 — Ambient volume
**ID**: FR-181
**Feature**: 19. Ambient audio
**Description**: Volume is adjustable from 0 to 100 and persists across sessions.
**User story**: As a Registered User, I want to set ambient volume, so that it does not distract me.
**Acceptance criteria**:
1. AC-FR-181-1 — Given the slider, when set to 40, then playback volume is 40.
2. AC-FR-181-2 — Given volume 0, when applied, then no sound plays.
3. AC-FR-181-3 — Given the page is reloaded, when audio resumes, then volume is still 40.
**Priority**: Could Have
**Phase**: 2
**Dependencies**: FR-180, NFR-041
**Business rules**: None
**Expected system behavior**: Default volume is 50. Values outside 0-100 are not accepted.
**Errors and edge cases**: Invalid value: clamp to 0-100 and tell the user. No registered edge case.

#### FR-182 — Play audio only while a session runs
**ID**: FR-182
**Feature**: 19. Ambient audio
**Description**: Ambient audio plays only while a timer session is running.
**User story**: As a Registered User, I want audio only during a running session, so that it never plays unexpectedly.
**Acceptance criteria**:
1. AC-FR-182-1 — Given a loop is selected and no session runs, when the page loads, then 0 audio plays.
2. AC-FR-182-2 — Given a session starts, when running, then the selected loop starts within 2 seconds.
3. AC-FR-182-3 — Given the session stops, when it ends, then audio stops within 1 second.
**Priority**: Could Have
**Phase**: 2
**Dependencies**: FR-180, FR-050, NFR-044
**Business rules**: None
**Expected system behavior**: Audio state follows the server-authoritative session state.
**Errors and edge cases**: EC-024: if autoplay is blocked, show an in-app indicator and prompt the user to enable sound.

#### FR-183 — Remember last audio choice
**ID**: FR-183
**Feature**: 19. Ambient audio
**Description**: The last chosen loop and volume are remembered per account.
**User story**: As a Registered User, I want my last audio choice remembered, so that I do not reselect each time.
**Acceptance criteria**:
1. AC-FR-183-1 — Given Cafe at 60 was chosen, when the next session starts on another device, then Cafe at 60 is preselected.
2. AC-FR-183-2 — Given a new account, when first opened, then None at 50 is the default.
3. AC-FR-183-3 — Given the choice is changed, when saved, then the new choice replaces the old.
**Priority**: Could Have
**Phase**: 2
**Dependencies**: FR-180, FR-181, NFR-030
**Business rules**: None
**Expected system behavior**: Only loop identifier and volume are stored.
**Errors and edge cases**: Save failure: keep the local choice and retry. No registered edge case.

#### FR-184 — Mute audio on pause
**ID**: FR-184
**Feature**: 19. Ambient audio
**Description**: Audio is muted when the timer is paused or during a break, and resumes when focus resumes.
**User story**: As a Registered User, I want audio to mute on pause, so that breaks are quiet.
**Acceptance criteria**:
1. AC-FR-184-1 — Given audio is playing, when the timer is paused, then audio is silent within 1 second.
2. AC-FR-184-2 — Given the timer is resumed, when focus restarts, then audio resumes within 2 seconds.
3. AC-FR-184-3 — Given a Pomodoro break starts, when it begins, then audio is silent.
**Priority**: Could Have
**Phase**: 2
**Dependencies**: FR-182, FR-052, NFR-044
**Business rules**: None
**Expected system behavior**: Pause state is announced to assistive technology without per-second chatter.
**Errors and edge cases**: No registered edge case.


## 20. AI-generated study schedule

Group priority: Won't Have this release; specified for forward planning. Phase 3. A Registered User asks the system to propose a study schedule from their exam(s), topics, declared available weekly hours and the last 4 weeks of session history. The proposal is produced by an external AI provider, is validated entry by entry, is shown as a preview, and nothing is saved as plan entries until the user accepts. Study data is sent to the provider only with explicit per-feature consent, and each user may generate at most 5 schedules per day.

#### FR-190 — AI schedule inputs
**ID**: FR-190
**Feature**: 20. AI-generated study schedule
**Description**: The user supplies the inputs for a schedule request: one or more upcoming exams, the topics to cover, the available hours per week and the days and time windows on which they can study. The system adds the user's session history for the last 4 weeks as context. Available weekly hours are the user-declared limit used later for validation.
**User story**: As a Registered User, I want to choose the exams, topics and weekly hours the schedule should be based on, so that the proposal fits my real availability.
**Acceptance criteria**:
1. AC-FR-190-1 — Given a user with 2 upcoming exams, when they select both exams, then the request form lists only topics of those exams' subjects and at least 1 topic must stay selected to continue.
2. AC-FR-190-2 — Given the input form, when the user enters available weekly hours of 0 or more than 168, then the form is rejected with a message that hours must be between 1 and 168.
3. AC-FR-190-3 — Given a user with 28 days of recorded sessions, when a request is built, then exactly the sessions of the last 28 days are included as history and older sessions are not.
4. AC-FR-190-4 — Given a selected exam whose date is in the past, when the user tries to select it, then it is not selectable and the form states that only upcoming exams are allowed (BR-025).
**Priority**: Won't Have
**Phase**: 3
**Dependencies**: FR-198, FR-192, NFR-036
**Business rules**: BR-025
**Expected system behavior**: The system keeps the chosen inputs for the current request, derives the history window of the last 4 weeks from recorded sessions, and treats the declared weekly hours and available windows as the limits for validation. Nothing is sent to the provider until the user submits the request with consent.
**Errors and edge cases**: A message tells the user which input is missing or out of range (no exam, no topic, hours outside 1-168). A past exam cannot be chosen because exams are fixed anchors. EC-015: entries beyond the exam date or outside declared hours are later removed during validation.

#### FR-191 — Request an AI schedule
**ID**: FR-191
**Feature**: 20. AI-generated study schedule
**Description**: The user submits the completed inputs and the system asks the AI provider for a proposed schedule. The request is rejected before sending if consent is missing or the daily limit is reached. While the provider is working the user sees a progress state and the provider call is abandoned after 30 seconds.
**User story**: As a Registered User, I want to request a generated schedule with one action, so that I do not have to plan every week by hand.
**Acceptance criteria**:
1. AC-FR-191-1 — Given valid inputs and recorded consent, when the user submits, then a progress state is shown within 1 second and the request is sent to the provider.
2. AC-FR-191-2 — Given a request in progress, when 30 seconds pass without a provider response, then the request is stopped and an error is shown (EC-016).
3. AC-FR-191-3 — Given a request in progress, when the user submits again, then the second submission is ignored and only 1 request exists.
4. AC-FR-191-4 — Given no recorded consent, when the user submits, then nothing is sent to the provider and the consent prompt is shown.
**Priority**: Won't Have
**Phase**: 3
**Dependencies**: FR-190, FR-192, FR-196, FR-197, NFR-036
**Business rules**: None
**Expected system behavior**: The system sends only the data needed for the request to the provider, waits up to 30 seconds, and on success passes the response to validation. The user may leave the page; the result is not saved as plan entries.
**Errors and edge cases**: Messages state that consent is required, that the daily limit is reached, or that the provider did not answer in time and may be retried. EC-016: on provider unavailability or timeout nothing is saved and no quota is consumed.

#### FR-192 — Consent to share study data with the AI provider
**ID**: FR-192
**Feature**: 20. AI-generated study schedule
**Description**: Before the first generation the system explains which study data is sent to the provider (exams, topics, available hours, 4 weeks of session history) and asks for explicit consent. Consent is given for this feature only and can be withdrawn at any time in settings. The consent wording is subject to legal review.
**User story**: As a Registered User, I want to decide explicitly whether my study data may be shared with an AI provider, so that I stay in control of my data.
**Acceptance criteria**:
1. AC-FR-192-1 — Given a user who never consented, when they open AI schedule generation, then a consent dialog lists the data categories sent and no generation can start until they confirm.
2. AC-FR-192-2 — Given the consent checkbox, when the dialog opens, then it is unchecked by default.
3. AC-FR-192-3 — Given consent was given, when the user withdraws it in settings, then the next generation attempt shows the consent dialog again and 0 requests are sent meanwhile.
4. AC-FR-192-4 — Given consent was given, when the user declines on a later prompt, then no data is sent and the rest of the product keeps working unchanged.
**Priority**: Won't Have
**Phase**: 3
**Dependencies**: NFR-036, NFR-030
**Business rules**: None
**Expected system behavior**: The system records the consent decision with its date for the user and checks it before every provider request. Withdrawal takes effect immediately for future requests and does not delete previously accepted plan entries.
**Errors and edge cases**: If consent cannot be saved, the user is told the choice was not stored and no request is sent. No registered edge case.

#### FR-193 — Preview an AI schedule
**ID**: FR-193
**Feature**: 20. AI-generated study schedule
**Description**: After validation the system shows the proposed plan entries as a preview, grouped by day, with subject, topic, start time and duration. The preview states how many entries were removed by validation and flags entries that overlap existing plan entries. Nothing in the preview is stored as a plan entry.
**User story**: As a Registered User, I want to review the proposed schedule before anything is saved, so that I can judge it before it affects my plan.
**Acceptance criteria**:
1. AC-FR-193-1 — Given a validated response with 12 valid entries, when the preview opens, then 12 entries are listed with subject, date, start time and duration, and the user's plan still has 0 new entries.
2. AC-FR-193-2 — Given 3 entries were rejected by validation, when the preview opens, then it shows "3 entries removed".
3. AC-FR-193-3 — Given a proposed entry that overlaps an existing plan entry, when the preview opens, then that entry shows an overlap warning (BR-026).
4. AC-FR-193-4 — Given a preview of 50 entries, when it opens, then it is usable within the LCP threshold of NFR-001 and the overlap warning is not conveyed by color alone.
**Priority**: Won't Have
**Phase**: 3
**Dependencies**: FR-194, FR-195, NFR-001, NFR-043
**Business rules**: BR-026
**Expected system behavior**: The preview is held for the current user only. Closing it without accepting leaves the plan unchanged. Overlap is computed across all of the user's subjects.
**Errors and edge cases**: If the preview cannot be displayed the user sees an error and may regenerate within the daily limit. EC-015: removed entries are counted, never silently hidden, and overlaps are warnings, not blocks.

#### FR-194 — Validate AI-proposed entries
**ID**: FR-194
**Feature**: 20. AI-generated study schedule
**Description**: Every entry returned by the provider is validated one by one before it reaches the preview. An entry is rejected if it is malformed, in the past, after its exam date, outside the user-declared available hours, of a duration outside 5-480 minutes, for an unknown subject or topic, or if it makes the total exceed the declared weekly hours. Rejected entries are dropped and counted.
**User story**: As a Registered User, I want invalid entries filtered out automatically, so that the preview never contains impossible plans.
**Acceptance criteria**:
1. AC-FR-194-1 — Given an entry with a duration of 3 or 500 minutes, when validated, then it is rejected; entries of 5 and 480 minutes are accepted.
2. AC-FR-194-2 — Given an entry dated after the exam date of its topic's exam, when validated, then it is rejected (BR-025).
3. AC-FR-194-3 — Given a response whose entries sum to 12 hours in a week with 10 declared hours, when validated, then entries are dropped so the weekly total is at most 10 hours and the drop count is reported.
4. AC-FR-194-4 — Given a response with 0 valid entries, when validated, then an error is shown and 0 entries are offered for acceptance.
**Priority**: Won't Have
**Phase**: 3
**Dependencies**: FR-191, FR-190, NFR-054
**Business rules**: BR-025, BR-026
**Expected system behavior**: Validation runs on the server side of the product before any preview, checks each entry independently, and reports the number of removed entries. Overlaps with existing plan entries are not rejections; they become warnings.
**Errors and edge cases**: With no valid entry the message says the generated schedule could not be used and nothing was saved. EC-015: rejection reasons are malformed, past, after exam date, outside available hours, duration outside 5-480, unknown subject or topic, weekly total exceeded.

#### FR-195 — Accept or discard an AI schedule
**ID**: FR-195
**Feature**: 20. AI-generated study schedule
**Description**: From the preview the user either accepts the schedule, which creates the shown entries as ordinary plan entries, or discards it. If any accepted entry overlaps an existing one the user must confirm before saving. Accepting is a single all-or-nothing action.
**User story**: As a Registered User, I want to accept or discard the proposal as a whole, so that my plan changes only when I decide.
**Acceptance criteria**:
1. AC-FR-195-1 — Given a preview with 12 entries and no overlaps, when the user accepts, then exactly 12 plan entries are created and visible in the plan.
2. AC-FR-195-2 — Given a preview with 2 overlapping entries, when the user accepts, then a confirmation naming the overlaps is required before any entry is saved (BR-026).
3. AC-FR-195-3 — Given a preview, when the user discards it, then 0 plan entries are created.
4. AC-FR-195-4 — Given the accept button pressed twice quickly, when both arrive, then exactly 12 entries exist, not 24.
**Priority**: Won't Have
**Phase**: 3
**Dependencies**: FR-193, FR-194, NFR-092, NFR-053
**Business rules**: BR-026
**Expected system behavior**: On acceptance all entries are created together or none are. Accepted entries behave exactly like manually created plan entries and can be edited, deleted or marked missed afterwards.
**Errors and edge cases**: If saving fails, the user is told nothing was saved and may retry. EC-015: nothing persists until acceptance, and overlaps require confirmation rather than blocking.

#### FR-196 — AI generation daily limit
**ID**: FR-196
**Feature**: 20. AI-generated study schedule
**Description**: Each user may generate at most 5 AI schedules per day. The limit is shown to the user and applies by the user's profile day. A generation counts only if a response from the provider was received. The limit value is configurable data, not fixed in several places.
**User story**: As a Registered User, I want to know how many generations I have left today, so that I can use them deliberately.
**Acceptance criteria**:
1. AC-FR-196-1 — Given a user with 5 counted generations today, when they request a sixth, then it is refused with a message that the daily limit of 5 is reached.
2. AC-FR-196-2 — Given a user with 4 counted generations, when a request times out after 30 seconds, then the count stays 4 (EC-016).
3. AC-FR-196-3 — Given a provider response that fails validation completely, when it was received, then the count increases by 1.
4. AC-FR-196-4 — Given the request screen, when it opens, then it displays remaining generations for today as a number from 0 to 5.
**Priority**: Won't Have
**Phase**: 3
**Dependencies**: FR-191, NFR-062
**Business rules**: None
**Expected system behavior**: The system counts a generation when a provider response is received and resets the count at the start of the user's next day in their profile timezone. Retries after provider failure do not use quota.
**Errors and edge cases**: The message states the limit and when it resets. EC-015: a retry counts toward the 5 per day only if a provider response was received. EC-016: timeout or unavailability consumes no quota.

#### FR-197 — AI provider failure handling
**ID**: FR-197
**Feature**: 20. AI-generated study schedule
**Description**: When the provider is unavailable, returns an error, or does not answer within 30 seconds, the system shows a clear error and keeps the user's inputs so they can retry. No partial result is saved and no quota is consumed.
**User story**: As a Registered User, I want a clear error and an easy retry when the provider fails, so that I do not lose my inputs or my daily quota.
**Acceptance criteria**:
1. AC-FR-197-1 — Given the provider returns an error, when the failure is detected, then an error message is shown within 2 seconds of detection and 0 plan entries are created.
2. AC-FR-197-2 — Given a failure, when the error is shown, then the entered inputs are still present in the form.
3. AC-FR-197-3 — Given a failure, when the daily count is read, then it is unchanged from before the request.
4. AC-FR-197-4 — Given a timeout at 30 seconds, when a late response arrives afterwards, then it is ignored and not shown.
**Priority**: Won't Have
**Phase**: 3
**Dependencies**: FR-191, FR-196, NFR-054
**Business rules**: None
**Expected system behavior**: The system treats any failure or timeout as a failed request, discards anything received late, and offers a retry action. The rest of the product is unaffected by provider failure.
**Errors and edge cases**: The message says the AI service is currently unavailable and no data was saved or counted. EC-016: provider unavailable or timeout at 30 seconds results in an error, no partial save, no quota consumed.

#### FR-198 — AI schedule prerequisites
**ID**: FR-198
**Feature**: 20. AI-generated study schedule
**Description**: AI schedule generation is available only when the user has at least one upcoming exam and at least one topic for that exam's subject. If not, the feature explains what is missing and links to creating it. The user must also have declared available weekly hours.
**User story**: As a Registered User, I want to be told what I need before I can generate a schedule, so that I am not left with a failing request.
**Acceptance criteria**:
1. AC-FR-198-1 — Given a user with 0 upcoming exams, when they open the feature, then the request is disabled and a prompt to create an exam is shown.
2. AC-FR-198-2 — Given an exam whose subject has 0 topics, when the user selects it, then the request is disabled and a prompt to add topics is shown.
3. AC-FR-198-3 — Given a user with no recorded session history, when they request a schedule, then the request is allowed and the history context is sent as empty.
4. AC-FR-198-4 — Given a user who did not declare weekly hours, when they try to submit, then submission is blocked until a value from 1 to 168 is given.
**Priority**: Won't Have
**Phase**: 3
**Dependencies**: FR-190, NFR-030
**Business rules**: None
**Expected system behavior**: The system checks prerequisites before showing an enabled request action and sends no data to the provider when a prerequisite is missing. A user with an empty history still gets a schedule based on exams and topics.
**Errors and edge cases**: Messages state exactly which prerequisite is missing (exam, topics or weekly hours). EC-015: this prevents requests that could only produce schedules with no valid entries.



## 21. Study groups and leaderboards
Study groups let up to 20 registered users (aged 16+, NFR-035) study with peers through opt-in weekly leaderboards. Won't Have this release; specified for forward planning. Phase 3. Administrators manage membership but never see members' subjects, notes or session details.

#### FR-200 — Create a study group
**ID**: FR-200
**Feature**: Study groups and leaderboards
**Description**: A Registered User creates a group by giving it a name. The creator becomes its first Group Administrator and the group starts with one member.
**User story**: As a Registered User, I want to create a study group, so that I can study alongside peers with mutual accountability.
**Acceptance criteria**:
1. AC-FR-200-1 — Given a signed-in user aged 16+, when they create a group named "Exam Crew" (1-60 characters), then the group exists with 1 member and that user as its sole administrator.
2. AC-FR-200-2 — Given a blank name or one longer than 60 characters, when the user submits, then creation is rejected and no group is created.
3. AC-FR-200-3 — Given a user already in a group, when they create another, then it succeeds and they hold 2 memberships, each with its own sharing setting.
**Priority**: Won't Have
**Phase**: 3
**Dependencies**: FR-001, NFR-035, NFR-037
**Business rules**: None
**Expected system behavior**: The group is created immediately; the creator sees it in their group list as administrator. Nothing about the creator's study data is shared until they opt in (FR-206).
**Errors and edge cases**: Name missing or too long: tell the user the allowed length. No registered edge case.

#### FR-201 — Invite members to a group
**ID**: FR-201
**Feature**: Study groups and leaderboards
**Description**: An administrator generates an invite link or sends an invitation to an email address. Each invite is single-purpose for this group and expires after 7 days unless revoked sooner.
**User story**: As a Group Administrator, I want to invite people by link or email, so that peers can join my group.
**Acceptance criteria**:
1. AC-FR-201-1 — Given an administrator of a group with fewer than 20 members, when they generate an invite link, then a link valid for 7 days is shown.
2. AC-FR-201-2 — Given an issued invite, when the administrator revokes it, then using it afterwards fails.
3. AC-FR-201-3 — Given an invite older than 7 days, when someone opens it, then joining is refused.
4. AC-FR-201-4 — Given a non-administrator member, when they try to create an invite, then the action is denied.
**Priority**: Won't Have
**Phase**: 3
**Dependencies**: FR-200, FR-208, NFR-037
**Business rules**: None
**Expected system behavior**: The system issues an unguessable invite token, optionally emails it, and lists active invites for revocation. Invites never reveal group content to non-members.
**Errors and edge cases**: Expired or revoked invite: tell the user it is no longer valid and to ask for a new one. Full group: see FR-208. No registered edge case.

#### FR-202 — Join a group
**ID**: FR-202
**Feature**: Study groups and leaderboards
**Description**: A signed-in user opens a valid invite and confirms joining. After removal or leaving, a new invite is required to rejoin.
**User story**: As a Registered User, I want to join a group through an invite, so that I can take part in its leaderboard.
**Acceptance criteria**:
1. AC-FR-202-1 — Given a valid invite and a group with 19 members, when the user confirms, then they become the 20th member with sharing defaulting to off.
2. AC-FR-202-2 — Given a user who left the group earlier, when they use their old invite, then joining is refused and a new invite is required.
3. AC-FR-202-3 — Given a signed-out visitor opening an invite, when they sign in, then they return to the invite and can confirm.
**Priority**: Won't Have
**Phase**: 3
**Dependencies**: FR-201, FR-206, FR-208, NFR-035
**Business rules**: None
**Expected system behavior**: Membership is created on confirmation; the new member's totals are hidden until they opt in. The user sees the group's name and member count before confirming.
**Errors and edge cases**: Invalid, expired or revoked invite: say so without revealing group details. Group already at 20: see FR-208. EC-018: rejoin after leaving requires a new invite.

#### FR-203 — Leave a group
**ID**: FR-203
**Feature**: Study groups and leaderboards
**Description**: A member leaves a group voluntarily. The last administrator may not leave until administration is transferred or the group is dissolved.
**User story**: As a Group Member, I want to leave a group, so that I stop appearing to its members.
**Acceptance criteria**:
1. AC-FR-203-1 — Given a member who is not the last administrator, when they confirm leaving, then they vanish from the member list and leaderboard immediately.
2. AC-FR-203-2 — Given the user leaves, when they check their own statistics, then all their sessions and totals are unchanged.
3. AC-FR-203-3 — Given the sole administrator of a group with 5 members, when they try to leave, then it is blocked with a prompt to transfer administration or dissolve.
4. AC-FR-203-4 — Given a user who left, when they use an old invite, then they cannot rejoin.
**Priority**: Won't Have
**Phase**: 3
**Dependencies**: FR-202, FR-205, FR-210
**Business rules**: None
**Expected system behavior**: Membership ends at once; group-scoped shared stats of the user are no longer visible to the group; the user's own data is untouched.
**Errors and edge cases**: Last administrator: tell them to transfer admin or dissolve first. EC-018: immediate removal, own data unaffected, rejoin needs new invite.

#### FR-204 — Remove a group member
**ID**: FR-204
**Feature**: Study groups and leaderboards
**Description**: An administrator removes another member after confirmation. The removed person disappears from member list and leaderboards at once.
**User story**: As a Group Administrator, I want to remove a member, so that I can keep the group appropriate.
**Acceptance criteria**:
1. AC-FR-204-1 — Given an administrator and a member, when removal is confirmed, then that member is gone from list and leaderboard immediately.
2. AC-FR-204-2 — Given the removed member, when they view their own data, then it is unchanged.
3. AC-FR-204-3 — Given a non-administrator member, when they attempt removal, then it is denied.
4. AC-FR-204-4 — Given an administrator targeting themselves, when they try to remove themselves, then the action is refused and they are pointed to leave or transfer.
**Priority**: Won't Have
**Phase**: 3
**Dependencies**: FR-203, FR-205, NFR-016
**Business rules**: None
**Expected system behavior**: Removal applies immediately; the former member sees the group no longer in their list and needs a new invite to rejoin.
**Errors and edge cases**: Removing yourself: direct to leave flow. Cross-group target: not-found response. EC-018: removal semantics.

#### FR-205 — Transfer group administration
**ID**: FR-205
**Feature**: Study groups and leaderboards
**Description**: An administrator promotes another member to administrator and may step down. A group always has at least 1 administrator. If the only administrator's account is deleted, the oldest member is promoted automatically.
**User story**: As a Group Administrator, I want to hand administration to another member, so that the group continues when I step away.
**Acceptance criteria**:
1. AC-FR-205-1 — Given a group with 4 members, when the administrator promotes member B, then the group has 2 administrators.
2. AC-FR-205-2 — Given an administrator who then steps down, when the group has 1 other administrator, then the step down succeeds.
3. AC-FR-205-3 — Given the only administrator, when they try to step down without a successor, then it is refused; at least 1 administrator remains.
4. AC-FR-205-4 — Given the sole administrator's account is deleted, when the group has other members, then the oldest member is promoted.
**Priority**: Won't Have
**Phase**: 3
**Dependencies**: FR-200, FR-203, NFR-016
**Business rules**: None
**Expected system behavior**: Roles change immediately and are shown in the member list. Admin rights never include access to members' subjects, notes or session details.
**Errors and edge cases**: Target not a member: not-found. Last administrator stepping down: say a successor is required. EC-018: auto-promotion of the oldest member.

#### FR-206 — Per-user sharing setting
**ID**: FR-206
**Feature**: Study groups and leaderboards
**Description**: Each member decides, per group, whether their weekly focused-minute total is shared with that group. The default is not shared (opt-in).
**User story**: As a Group Member, I want to control whether my totals are visible to the group, so that my privacy stays under my control.
**Acceptance criteria**:
1. AC-FR-206-1 — Given a new member, when they join, then sharing is off.
2. AC-FR-206-2 — Given sharing is off, when others view the leaderboard, then the member's minutes are not shown.
3. AC-FR-206-3 — Given the member turns sharing on, when the leaderboard reloads, then their weekly total appears within 5 s.
4. AC-FR-206-4 — Given the member turns sharing off, when others view, then their totals are hidden immediately.
**Priority**: Won't Have
**Phase**: 3
**Dependencies**: FR-202, NFR-037
**Business rules**: None
**Expected system behavior**: Only focused-minute totals are ever shareable; subjects, topics, notes and session details are never shared. The setting is stored per group.
**Errors and edge cases**: Save failure: say the setting was not changed and offer retry. No registered edge case.

#### FR-207 — Weekly leaderboard
**ID**: FR-207
**Feature**: Study groups and leaderboards
**Description**: Each group shows a weekly ranking of members who opted in, by focused minutes. Only server-recorded timer sessions of at least 5 minutes count; manual entries do not.
**User story**: As a Group Member, I want a weekly leaderboard, so that I feel motivated by my peers.
**Acceptance criteria**:
1. AC-FR-207-1 — Given a member with a 4-minute timer session, when the board is computed, then those minutes are excluded.
2. AC-FR-207-2 — Given a member with a manual entry of 90 min, when the board is computed, then it contributes 0 minutes.
3. AC-FR-207-3 — Given 3 opted-in members, when the board loads, then they are ranked by weekly focused minutes in descending order.
4. AC-FR-207-4 — Given a member who has not opted in, when the board loads, then they are not listed.
**Priority**: Won't Have
**Phase**: 3
**Dependencies**: FR-206, FR-040, NFR-003
**Business rules**: BR-010
**Expected system behavior**: The week follows each viewer's group-agreed boundary of Monday to Sunday in the profile timezone. Ranking uses only counted minutes; ties share a rank.
**Errors and edge cases**: Empty board: show an empty-state explaining opt-in. EC-025: manual entries and sessions under 5 min excluded.

#### FR-208 — Group size cap
**ID**: FR-208
**Feature**: Study groups and leaderboards
**Description**: A group holds at most 20 members. Invites and joins that would exceed the cap are refused.
**User story**: As a Group Administrator, I want a member limit, so that groups stay small and manageable.
**Acceptance criteria**:
1. AC-FR-208-1 — Given a group with 20 members, when someone confirms an invite, then joining is refused.
2. AC-FR-208-2 — Given a group with 20 members, when a member leaves, then 1 slot opens and a new join succeeds.
3. AC-FR-208-3 — Given a group with 20 members, when the administrator generates an invite, then they are warned the group is full.
**Priority**: Won't Have
**Phase**: 3
**Dependencies**: FR-201, FR-202, NFR-070
**Business rules**: None
**Expected system behavior**: The cap is configurable data, default 20, and enforced at join time so concurrent joins cannot exceed it.
**Errors and edge cases**: Full group: tell the user the group has reached 20 members. No registered edge case.

#### FR-209 — Report a group member
**ID**: FR-209
**Feature**: Study groups and leaderboards
**Description**: A member can report another member of the same group with a reason. The report is recorded for follow-up outside the product, and the reporter receives acknowledgement.
**User story**: As a Group Member, I want to report abusive behavior, so that the group stays safe.
**Acceptance criteria**:
1. AC-FR-209-1 — Given two members of the same group, when one submits a report with a reason of 1-500 characters, then it is recorded and acknowledged.
2. AC-FR-209-2 — Given a report with an empty reason, when submitted, then it is rejected.
3. AC-FR-209-3 — Given the reported member, when the report is made, then they are not notified of the reporter's identity.
4. AC-FR-209-4 — Given a user not in the group, when they try to report, then a not-found response is returned.
**Priority**: Won't Have
**Phase**: 3
**Dependencies**: FR-211, NFR-020
**Business rules**: None
**Expected system behavior**: Report is stored with reporter, target, group and time; no automated sanction occurs. Reporters may also remove themselves via FR-203.
**Errors and edge cases**: Empty or overlong reason: state the 1-500 character range. No registered edge case.

#### FR-210 — Dissolve a group
**ID**: FR-210
**Feature**: Study groups and leaderboards
**Description**: An administrator deletes the whole group after explicit confirmation. All memberships end; members' own study data is unaffected.
**User story**: As a Group Administrator, I want to dissolve a group, so that it no longer exists when it is finished.
**Acceptance criteria**:
1. AC-FR-210-1 — Given an administrator, when they confirm dissolution by typing the group name, then the group and all its memberships are removed.
2. AC-FR-210-2 — Given dissolution, when a former member opens their statistics, then their sessions are unchanged.
3. AC-FR-210-3 — Given a non-administrator, when they attempt dissolution, then it is denied.
4. AC-FR-210-4 — Given a dissolved group, when anyone opens an old invite, then joining fails.
**Priority**: Won't Have
**Phase**: 3
**Dependencies**: FR-200, FR-203, NFR-016
**Business rules**: None
**Expected system behavior**: Confirmation is mandatory and irreversible. Leaderboard and shared stats disappear for all members immediately.
**Errors and edge cases**: Unconfirmed request: nothing changes. EC-018: leaving semantics apply to each member.

#### FR-211 — View group members
**ID**: FR-211
**Feature**: Study groups and leaderboards
**Description**: Members see the member list with display names and roles. Totals are shown only for those who opted in, and no subjects, notes or session details are ever shown.
**User story**: As a Group Member, I want to see who is in my group, so that I know my peers.
**Acceptance criteria**:
1. AC-FR-211-1 — Given a group of 6, when a member opens the list, then 6 display names with roles appear.
2. AC-FR-211-2 — Given a member with sharing off, when the list is viewed, then no minutes are shown for them.
3. AC-FR-211-3 — Given an administrator, when they open a member's entry, then no subjects, notes or session details are visible.
4. AC-FR-211-4 — Given a user who left, when the list reloads, then they no longer appear.
**Priority**: Won't Have
**Phase**: 3
**Dependencies**: FR-202, FR-206, NFR-037
**Business rules**: None
**Expected system behavior**: Only display name, role and opted-in weekly total are visible. Removed or departed members disappear at once.
**Errors and edge cases**: Non-member access: not-found response. EC-018: departed members vanish immediately.

#### FR-212 — Rename a group
**ID**: FR-212
**Feature**: Study groups and leaderboards
**Description**: An administrator changes the group name. Concurrent edits are detected through record versions.
**User story**: As a Group Administrator, I want to rename my group, so that its name stays accurate.
**Acceptance criteria**:
1. AC-FR-212-1 — Given an administrator, when they set a name of 1-60 characters, then all members see the new name.
2. AC-FR-212-2 — Given a name of 61 characters, when submitted, then it is rejected.
3. AC-FR-212-3 — Given two administrators editing simultaneously, when the second saves a stale version, then it is rejected with a reload prompt.
4. AC-FR-212-4 — Given a regular member, when they try to rename, then it is denied.
**Priority**: Won't Have
**Phase**: 3
**Dependencies**: FR-200, NFR-094
**Business rules**: None
**Expected system behavior**: The new name appears immediately in lists and invites already issued.
**Errors and edge cases**: Stale version: say the group changed elsewhere and reload. Invalid length: state 1-60. EC-020: stale save rejected.


## 22. REST API

Group priority: Won't Have this release; specified for forward planning. Phase 3. A Registered User may create API keys and use them to read and write their own data through a documented, versioned public REST API using JSON. A key acts as delegated access for exactly one user within its granted scopes; it is a credential, not a role. The internal API serving the web client is not covered here; it is not public and is addressed in NFR-060. Public resources are the user's own subjects, topics, sessions, plan entries, to-dos, notes and exams.

#### FR-220 — Create an API key
**ID**: FR-220
**Feature**: 22. REST API
**Description**: A signed-in user can create a named API key. The full key value is shown exactly once at creation; afterwards only a label and a short non-secret hint are visible. The system stores only a hashed form of the key.
**User story**: As a Registered User, I want to create an API key for my own scripts, so that I can access my study data programmatically.
**Acceptance criteria**:
1. AC-FR-220-1 — Given a signed-in user, when they create a key named "export-script", then the full key is displayed once together with a warning that it cannot be shown again.
2. AC-FR-220-2 — Given a key was created, when the user reopens the key list, then the full value is not shown and only name, creation date, scopes and last 4 characters are.
3. AC-FR-220-3 — Given a user with 10 active keys, when they create an 11th, then creation is refused with a message that the limit of 10 active keys is reached.
4. AC-FR-220-4 — Given a key name of 0 or more than 60 characters, when saved, then it is rejected with a message stating the allowed length 1-60.
**Priority**: Won't Have
**Phase**: 3
**Dependencies**: FR-221, NFR-021, NFR-019
**Business rules**: None
**Expected system behavior**: The system generates a key that cannot be guessed, stores only its hash, and shows the value once. A lost key cannot be recovered; the user creates a new one and revokes the old.
**Errors and edge cases**: Messages explain name length, the active key limit, and that a lost key must be replaced. No registered edge case.

#### FR-221 — API key scopes
**ID**: FR-221
**Feature**: 22. REST API
**Description**: When creating a key the user chooses for each resource whether the key has read access, write access or none. A write scope includes the matching read scope. A request outside the key's scopes is refused, and a key can never reach data of any other user.
**User story**: As a Registered User, I want to limit what each key can do, so that a leaked key causes limited harm.
**Acceptance criteria**:
1. AC-FR-221-1 — Given a key with read scope on sessions only, when it requests to-dos, then the response is 403 with error code "insufficient_scope".
2. AC-FR-221-2 — Given a key with read scope on sessions, when it tries to create a session, then the response is 403 and no session is stored.
3. AC-FR-221-3 — Given a key with write scope on plan entries, when it creates a plan entry, then the response is 201 and the entry belongs to the key's owner.
4. AC-FR-221-4 — Given a key owned by user A, when it requests a record owned by user B, then the response is 404 as for a missing record.
**Priority**: Won't Have
**Phase**: 3
**Dependencies**: FR-220, NFR-016, NFR-021
**Business rules**: None
**Expected system behavior**: The scopes are fixed at creation and checked on every request. Changing scopes requires creating a new key. Business rules of the product apply equally to writes made through a key.
**Errors and edge cases**: A scope violation tells the caller which scope is missing without revealing other data. Access to another user's record returns not-found. No registered edge case.

#### FR-222 — API rate limit
**ID**: FR-222
**Feature**: 22. REST API
**Description**: Each API key is limited to 60 requests per minute. Requests above the limit are refused with HTTP 429 and a retry-after value until the window allows more. The limit applies per key, not per user.
**User story**: As a Registered User, I want predictable rate limits on my keys, so that my scripts behave reliably and the service stays available for everyone.
**Acceptance criteria**:
1. AC-FR-222-1 — Given a key that made 60 requests in the current minute, when it makes the 61st, then the response is HTTP 429.
2. AC-FR-222-2 — Given an HTTP 429 response, when the caller reads it, then it includes a retry-after value in seconds, between 1 and 60.
3. AC-FR-222-3 — Given a key blocked by the limit, when the minute window passes, then the next request succeeds.
4. AC-FR-222-4 — Given a user with 2 keys, when key 1 reaches 60 requests, then key 2 is still served normally.
**Priority**: Won't Have
**Phase**: 3
**Dependencies**: FR-220, FR-225, NFR-002
**Business rules**: None
**Expected system behavior**: The system counts requests per key over one-minute windows, includes remaining-allowance information in responses, and returns 429 once exceeded. The limit value is configurable data.
**Errors and edge cases**: The 429 message says the rate limit of 60 requests per minute was exceeded and when to retry. EC-026: exceeding the limit returns HTTP 429 with retry-after, and the key remains revocable at once.

#### FR-223 — Versioned API
**ID**: FR-223
**Feature**: 22. REST API
**Description**: The public API is served under a version prefix "/v1". A breaking change is introduced only under a new version, and the previous version stays available for a defined notice period. Requests without a valid version prefix are not served.
**User story**: As a Registered User, I want a stable versioned API, so that my scripts do not break unexpectedly.
**Acceptance criteria**:
1. AC-FR-223-1 — Given a valid key, when it calls a resource under "/v1", then the response is served normally.
2. AC-FR-223-2 — Given a call to an unknown version such as "/v9", then the response is 404 with error code "unknown_version".
3. AC-FR-223-3 — Given a call without any version prefix, then the response is 404 and no data is returned.
4. AC-FR-223-4 — Given a version scheduled for retirement, when it is called, then responses carry a deprecation notice at least 90 days before removal.
**Priority**: Won't Have
**Phase**: 3
**Dependencies**: FR-220, NFR-060
**Business rules**: None
**Expected system behavior**: The version is part of every public resource address. The internal API of the web client is separate and not subject to this versioning promise.
**Errors and edge cases**: Unknown versions return a message listing the supported versions. No registered edge case.

#### FR-224 — JSON responses and pagination
**ID**: FR-224
**Feature**: 22. REST API
**Description**: All API requests and responses use JSON. List resources are paginated, with a default page size of 50 and a maximum of 100, and each page tells the caller how to fetch the next one. Timestamps are returned in UTC.
**User story**: As a Registered User, I want consistent JSON and paged lists, so that my scripts can process large data sets safely.
**Acceptance criteria**:
1. AC-FR-224-1 — Given a user with 120 sessions, when a key lists sessions without parameters, then 50 items are returned and a next-page reference is present.
2. AC-FR-224-2 — Given a page size request of 101, when processed, then the response is 400 with error code "invalid_page_size".
3. AC-FR-224-3 — Given the last page of a list, when returned, then it has no next-page reference.
4. AC-FR-224-4 — Given a request body that is not valid JSON, when sent, then the response is 400 and nothing is stored.
**Priority**: Won't Have
**Phase**: 3
**Dependencies**: FR-220, FR-225, NFR-002
**Business rules**: None
**Expected system behavior**: Responses carry a JSON content type, list responses are ordered stably so pages do not repeat items, and UTC timestamps are used. Read requests meet the NFR-002 latency target.
**Errors and edge cases**: A malformed body or invalid page size returns an error stating the parameter at fault. No registered edge case.

#### FR-225 — Standard API error format
**ID**: FR-225
**Feature**: 22. REST API
**Description**: Every API error uses one JSON structure with the fields code, message and details. The code is a stable machine-readable value, the message is human-readable, and the details give field-level or limit information. A request identifier is included to support troubleshooting.
**User story**: As a Registered User, I want errors in one predictable format, so that my scripts can handle failures correctly.
**Acceptance criteria**:
1. AC-FR-225-1 — Given any failed request, when the response is read, then the body contains the fields "code", "message" and "details".
2. AC-FR-225-2 — Given a validation failure on 2 fields, when returned, then "details" lists both fields with a reason each.
3. AC-FR-225-3 — Given an HTTP 429 response, when read, then the body uses the same structure and the retry-after value is also given.
4. AC-FR-225-4 — Given an unexpected server failure, when returned, then the response is 500 with the standard fields and no internal stack information.
**Priority**: Won't Have
**Phase**: 3
**Dependencies**: FR-220, NFR-063
**Business rules**: None
**Expected system behavior**: Success and error responses are distinguishable by status and structure. Errors never expose internals or the existence of other users' records.
**Errors and edge cases**: Error messages state what went wrong and what the caller can change. EC-026: the rate-limit error follows this structure.

#### FR-226 — Revoke an API key
**ID**: FR-226
**Feature**: 22. REST API
**Description**: The user can revoke any of their API keys at any time. Revocation takes effect immediately for all new requests, and the revoked key is kept in the list as revoked for reference. A revoked key cannot be reactivated.
**User story**: As a Registered User, I want to revoke a key instantly, so that a leaked or abusive key stops working at once.
**Acceptance criteria**:
1. AC-FR-226-1 — Given an active key, when the user revokes it, then the next request with that key returns 401 within 5 seconds of revocation.
2. AC-FR-226-2 — Given a revoked key, when listed, then it appears with status "revoked" and revocation date.
3. AC-FR-226-3 — Given a revoked key, when the user tries to reactivate it, then no such action exists and a new key must be created.
4. AC-FR-226-4 — Given a key that is currently rate limited with HTTP 429, when revoked, then it is refused with 401 on the next call instead of 429.
**Priority**: Won't Have
**Phase**: 3
**Dependencies**: FR-220, FR-222, NFR-021
**Business rules**: None
**Expected system behavior**: Revocation is recorded and checked on every request. Data already created through the key stays with the user. Deleting the account also invalidates all keys.
**Errors and edge cases**: A request with a revoked key returns an error stating the key is no longer valid. EC-026: a key suspected of abuse is revocable immediately.
