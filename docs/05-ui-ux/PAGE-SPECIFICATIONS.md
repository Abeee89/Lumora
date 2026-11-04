# Lumora Page Specifications

> Status: Proposal, pending approval. Source of truth: Phase 1 to 4 docs.

Per-page UI specification for every page in the route inventory of INFORMATION-ARCHITECTURE.md. Components, tokens and states are defined in DESIGN-SYSTEM.md and COMPONENT-INVENTORY.md; colors and type styles in COLOR-TYPOGRAPHY.md; navigation in NAVIGATION-STRUCTURE.md; interaction detail in INTERACTION-SPECIFICATIONS.md. Pages here cite those by token or ID only. Example numbers are labelled "example"; real values at runtime are written [REAL DATA].

## Shared copy rules

Sentence case, no exclamation marks, no emoji, button labels are a verb plus object, error messages say what happened and what to do. Reason: calm tone matches the product principle of honest, quiet feedback (DESIGN-PRINCIPLES.md principle 5).

## Shared page patterns

Pages cite these IDs and add only page-specific content.

#### Pattern index

| ID | Pattern | Definition | Reason |
|---|---|---|---|
| LOAD-LIST | List loading | Five static skeleton rows with the same height as final rows (48), no shimmer. Region has `aria-busy="true"` and a visually hidden status "Loading <name>". | Static skeletons avoid layout shift and respect MOTION 1 (NFR-001, NFR-045). |
| LOAD-CARD | Card loading | One static skeleton block per card with the card's final dimensions. Cards load independently of each other. | One slow query must not hold back the page. |
| ERR-SECTION | Section error | Bordered error-soft panel replaces only the failed section: message from the error catalog (ERROR-HANDLING.md section 4), a Retry button, request ID in caption text. The page header and other sections stay usable. Stale version (`stale_version`, EC-020) uses the panel "This changed in another tab or device" with a Reload button. | Isolated failure keeps the rest of the page working (ERROR-HANDLING.md section 5). |
| ERR-PAGE | Page error | Content-area panel with the h1 retained, one sentence on what happened, Retry, and a link to Dashboard. Not found (`not_found`, also for another user's record, NFR-016) shows "We could not find that page" with a link to Dashboard. Offline shows the persistent banner "You are offline. The timer keeps counting and will sync when you reconnect." under the page header, never a dialog (EC-028). | A retained h1 keeps orientation for screen reader users. |
| A11Y-BASE | Baseline accessibility | Skip link "Skip to main content" is the first focusable element; landmarks `header`, `nav`, `main`; exactly one h1; focus moves to the h1 on navigation; unique document title "<Page name> · Lumora"; one global polite live region and one alert region; all targets 44 px at widths under 1024 (NFR-087); visible focus ring (NFR-041); every control has a visible label or an accessible name; color is never the sole indicator (NFR-043). | WCAG 2.2 AA is binding (NFR-040). |

Every page below also inherits the global offline banner from ERR-PAGE and the shell from NAVIGATION-STRUCTURE.md unless it states otherwise.

## Public pages

### PU-1 Entry

**Purpose:** Let a guest sign in or create an account and explain the product in one sentence.
**Primary user actions:** Create account; Log in.
**Main components:** Wordmark with `[LOGO]` slot; one h1 "Plan what you study. Time it. Compare it with the plan."; one supporting sentence "Lumora records your study sessions and shows your actual hours next to the hours you planned."; two buttons "Create account" (primary) and "Log in" (secondary), both links.
**Layout:** Single centered column, max width 560. No feature grid, no screenshots, no stats, no testimonials. Reason: nothing real to show yet and the product promise fits one sentence (decision U-D7).
**Information hierarchy:** h1 first, supporting sentence second, buttons third.
**Responsive behavior:** Same column at all widths; buttons stack full width and 48 high under 768.
**Loading state:** Not applicable, the page is static.
**Empty state:** Not applicable, no data is shown.
**Error state:** Not applicable, no data is fetched. A signed-in user is redirected to `/dashboard`.
**Accessibility requirements:** A11Y-BASE; the two buttons are links with visible text to `/signup` and `/login`; Terms and Privacy footer links appear only once those pages exist (decision U-D5).
**Requirements:** FR-001, FR-002, NFR-040.
**Phase:** MVP.

### PU-2 Sign up

**Purpose:** Create an account with email and password or with Google.
**Primary user actions:** Fill the form and submit; Continue with Google; go to Log in.
**Main components:** Form panel with fields email, password (hint "10 characters or more" showing the live count), checkbox "I am 16 or older" (required), timezone combobox prefilled from the browser; primary button "Create account"; secondary button "Continue with Google"; link "Log in".
**Layout:** Centered form panel, max width 440, single column, 12 px between fields.
**Information hierarchy:** h1 "Create your account", fields, submit, then the Google alternative below a text divider "or".
**Responsive behavior:** Panel fills the width minus gutters under 768; buttons full width, 48 high.
**Loading state:** Submit button shows the loading state (spinner replaces the leading icon, width fixed, `aria-busy`) and is disabled while pending (NFR-053).
**Empty state:** Not applicable, this is an input form.
**Error state:** Field errors from `duplicate_email`, `password_too_short`, `age_confirmation_required`, `invalid_timezone`; with 4 or more fields failing, an error summary at the top receives focus and links to each field. `rate_limited` and `internal_error` use an ERR-SECTION panel above the form. Typed input is preserved on failure. On success route to `/onboarding`.
**Accessibility requirements:** A11Y-BASE; `autocomplete` tokens `email` and `new-password`; paste allowed in the password field; show/hide password toggle; no CAPTCHA or cognitive test (WCAG 3.3.8); inline validation on blur, not while typing the first time.
**Requirements:** FR-001, FR-003, FR-004, NFR-035, NFR-053.
**Phase:** MVP.

### PU-3 Log in

**Purpose:** Sign in to an existing account.
**Primary user actions:** Submit credentials; Continue with Google; open Forgot password; open Create account.
**Main components:** Form panel with email, password, primary button "Log in", secondary button "Continue with Google", links "Forgot password" and "Create account".
**Layout:** Centered form panel, max width 440.
**Information hierarchy:** h1 "Log in", fields, submit, Google alternative, links.
**Responsive behavior:** As PU-2.
**Loading state:** Submit button loading and disabled while pending.
**Empty state:** Not applicable, this is an input form.
**Error state:** `invalid_credentials` shows one generic message under the form ("Email or password is not correct.") without saying which. `account_locked` shows an error-soft panel "Too many attempts. Try again in 14 minutes." [example] with the remaining time as text that updates only on submit, not every second; the submit button is disabled until the lock time passes and the time is shown (ERROR-HANDLING.md section 5). `session_expired` and `session_revoked` show the banner "Your session ended. Log in to continue." and the target URL is preserved (FR-002). `rate_limited` uses ERR-SECTION.
**Accessibility requirements:** A11Y-BASE; `autocomplete` tokens `email` and `current-password`; lock message in the alert region once, not repeated.
**Requirements:** FR-002, FR-004, FR-005, NFR-040.
**Phase:** MVP.

### PU-4 Forgot password

**Purpose:** Request a password reset link.
**Primary user actions:** Enter email and send the link; return to Log in.
**Main components:** One email field, button "Send reset link", link "Log in".
**Layout:** Centered form panel, max width 440.
**Information hierarchy:** h1 "Reset your password", one explanatory sentence, field, button.
**Responsive behavior:** As PU-2.
**Loading state:** Button loading and disabled while pending.
**Empty state:** Not applicable, this is an input form.
**Error state:** After any submission the confirmation panel always reads "If an account exists for that address, a reset link is on its way." so accounts cannot be enumerated. `email_delivery_failed` and `rate_limited` use ERR-SECTION with Retry. Reason: FR-005 forbids account enumeration.
**Accessibility requirements:** A11Y-BASE; confirmation panel is `role="status"` and receives focus.
**Requirements:** FR-005, NFR-040.
**Phase:** MVP.

### PU-5 Reset password

**Purpose:** Set a new password using a reset link.
**Primary user actions:** Enter a new password and save; request a new link when the token is invalid.
**Main components:** New password field with show/hide toggle and the hint "10 characters or more"; button "Save new password".
**Layout:** Centered form panel, max width 440.
**Information hierarchy:** h1 "Choose a new password", field, button.
**Responsive behavior:** As PU-2.
**Loading state:** Button loading and disabled while pending.
**Empty state:** Not applicable, this is an input form.
**Error state:** `reset_token_invalid` replaces the form with an error panel "This reset link is invalid or has expired." and a link "Request a new link" to PU-4. `password_too_short` is a field error.
**Accessibility requirements:** A11Y-BASE; `autocomplete="new-password"`; paste allowed.
**Requirements:** FR-005, FR-004, NFR-040.
**Phase:** MVP.

### PU-6 Confirm age and timezone

**Purpose:** Collect the age confirmation and timezone on first Google sign-in.
**Primary user actions:** Tick the age checkbox, confirm timezone, continue.
**Main components:** Checkbox "I am 16 or older" (required), timezone combobox prefilled from the browser, button "Continue".
**Layout:** Centered form panel, max width 440.
**Information hierarchy:** h1 "Confirm a few details", one sentence naming the Google account email, fields, button.
**Responsive behavior:** As PU-2.
**Loading state:** Button loading and disabled while pending.
**Empty state:** Not applicable, this is an input form.
**Error state:** Field errors `age_confirmation_required` and `invalid_timezone`; failure to save uses ERR-SECTION with Retry and keeps the values. On success route to `/onboarding`.
**Accessibility requirements:** A11Y-BASE; combobox follows the ARIA 1.2 pattern.
**Requirements:** FR-003, FR-001, NFR-035.
**Phase:** MVP.

## System pages

### SY-1 Not found

**Purpose:** Tell the user the page or record does not exist, including records owned by other users.
**Primary user actions:** Go to Dashboard (signed in) or Entry (guest).
**Main components:** h1 "We could not find that page", one sentence "The link may be wrong, or the item was removed.", one link.
**Layout:** Centered column, max width 560, inside the shell when signed in.
**Information hierarchy:** h1, sentence, link.
**Responsive behavior:** Same column at all widths.
**Loading state:** Not applicable, static.
**Empty state:** Not applicable, static.
**Error state:** Not applicable, this page is the error state for `not_found`.
**Accessibility requirements:** A11Y-BASE; document title "Page not found · Lumora".
**Requirements:** NFR-016.
**Phase:** MVP.

### SY-2 Something went wrong

**Purpose:** Catch unexpected failures (`internal_error`, `database_unavailable`) at page level.
**Primary user actions:** Retry; go to Dashboard.
**Main components:** h1 "Something went wrong", one sentence "The page did not load. Try again in a moment.", Retry button, link to Dashboard, request ID as caption text.
**Layout:** Centered column, max width 560.
**Information hierarchy:** h1, sentence, Retry, request ID.
**Responsive behavior:** Buttons full width under 768.
**Loading state:** Retry button shows its loading state.
**Empty state:** Not applicable, static.
**Error state:** Not applicable, this page is the error state; a repeated failure keeps the same panel with the same request ID updated.
**Accessibility requirements:** A11Y-BASE; message in the alert region once.
**Requirements:** NFR-050, NFR-051.
**Phase:** MVP.

### SY-3 Unsupported browser

**Purpose:** Static notice when the browser lacks required features.
**Primary user actions:** None beyond reading; the notice names supported browsers.
**Main components:** h1 "This browser is not supported", one sentence naming supported browsers, [REAL DATA] list taken from NFR-082.
**Layout:** Centered column, max width 560, no JavaScript dependency.
**Information hierarchy:** h1, sentence, list.
**Responsive behavior:** Same column at all widths.
**Loading state:** Not applicable, static HTML.
**Empty state:** Not applicable, static.
**Error state:** Not applicable, this page is the notice.
**Accessibility requirements:** A11Y-BASE; works without scripts.
**Requirements:** NFR-082.
**Phase:** MVP.

## App pages, MVP

### A-1 Onboarding

**Purpose:** Reach a first saved session in under 3 minutes (FR-134).
**Primary user actions:** Choose a primary goal (Exam preparation, Coursework, Self-learning); create the first subject (name plus color swatches); confirm daily goal and timezone; start the guided first session; "Skip this step" on every step; "Leave setup".
**Main components:** Step text "Step 2 of 4" plus a labelled progress bar; plain radio rows for the goal choice (not decorative cards); subject name input with swatch radio group; daily goal number field in minutes (default 120) with the hours equivalent as text; timezone combobox; the Timer UI in guided mode with one dismissible hint line under each control.
**Layout:** Full screen without app navigation, centered panel max width 560.
**Information hierarchy:** Step text and h1 first, the step's fields second, "Skip this step" and "Leave setup" as secondary links.
**Responsive behavior:** Panel full width under 768 with 16 px gutters; buttons full width.
**Loading state:** No skeleton between steps; saving shows the button loading state.
**Empty state:** Not applicable, each step is an input.
**Error state:** Field errors inline; a save failure uses ERR-SECTION with Retry and the step keeps the typed values.
**Accessibility requirements:** A11Y-BASE except the shell; each step moves focus to its h1; progress bar `role="progressbar"` with value text "Step 2 of 4"; hints are text, dismissible with a labelled button. Reopened from Settings > Data via "Open setup guide" (FR-135).
**Requirements:** FR-134, FR-135, FR-136, FR-137, FR-010, FR-070, FR-001.
**Phase:** MVP.

### A-2 Dashboard

**Purpose:** Show today at a glance and let the user start studying.
**Primary user actions:** Start a session; open the timer; edit the daily goal; tick a to-do; open an upcoming plan entry; open Statistics.
**Main components:** Goal card with Arc (minutes studied today inside the arc, "of 120 min" text [example], percentage text, "Goal met" chip with Check icon when met, "Edit goal" button opening a dialog with the number field range 5 to 1440). Timer card (idle: inline start form with subject combobox preselecting the last used subject, mode segmented control Pomodoro/Stopwatch, "Start session" button; active: subject, state chip, elapsed time, Pause/Resume and "Open timer"). Next plan entries list (3 rows: subject dot and name, topic, start time, planned duration). Due and overdue to-dos list (priority chip with text, "Overdue" chip, checkbox). Last 7 days by subject (stacked bars plus numeric table). Exam countdown strip showing active exams with "N days" text. Phase 2: streak and level strip.
**Layout:** At 1024 and up, 12 columns. Row 1: Goal card (5) beside Timer card (7). Row 2: Next plan (4), To-dos (4), Exams (4). Row 3: Last 7 days full width. Content max width 1200.
**Information hierarchy:** Goal card and Timer card are the focal pair; the other cards are secondary. Reason: one focal point per screen, here the goal arc plus the start form (DESIGN-PRINCIPLES.md principle 2).
**Responsive behavior:** Tablet: row 1 two columns, the rest single-column full-width sections. Mobile: single column in the order Timer card, Goal card, Next plan, To-dos, Exams, Last 7 days. Reason: starting a session is the primary mobile task.
**Loading state:** LOAD-CARD per card so cards load independently. The LCP element is the Goal card heading or arc text, server rendered (NFR-001).
**Empty state:** Goal: "No study recorded today" plus "Start session". Next plan: "No planned sessions" plus "Add plan entry". To-dos: "Nothing due today" plus "Add task". Exams: "No upcoming exams" plus "Add exam". Last 7 days: "No study in the last 7 days". With no subjects at all, the start form is disabled and an inline panel reads "Add a subject to start tracking" with the link "Add subject", and Last 7 days shows "Add your first subject".
**Error state:** Each card uses ERR-SECTION independently so one failure does not blank the page.
**Accessibility requirements:** A11Y-BASE; the arc is `role="img"` with a label built at runtime, for example "Daily goal: 95 of 120 minutes, 79 percent" [example], and goal-met state is also written as text; each card is a `section` with an h2; the stacked-bar chart sits in a `figure` paired with its numeric table; running timer state is announced through the live region, not per second (NFR-044).
**Requirements:** FR-020, FR-021, FR-022, FR-023, FR-024, FR-072, FR-074, FR-123, FR-053, NFR-004, NFR-044.
**Phase:** MVP; streak and level strip is Phase 2 (FR-160 to FR-164, FR-170 to FR-177).

### A-3 Timer

**Purpose:** Record study time accurately.
**Primary user actions:** Choose subject, topic and optional plan entry; choose mode; start, pause, resume, stop; adjust timer durations; save the post-session panel.
**Main components:** Subject combobox; optional Topic combobox; optional "Link to a planned session" select listing today's entries; mode segmented control; timer face (Pomodoro: Arc showing the remaining focus interval with timer-display time inside; Stopwatch: time only); state text under the time ("Focus", "Break", "Paused", "Stopwatch"); cycle text "Focus 2 of 4" with four small indicators that also read as text; controls row; link "Timer durations" opening a dialog (focus 1 to 120, break 1 to 60, long break 1 to 60, cycles 2 to 8; out-of-range message states the allowed range); "Recent sessions" list (last 5) with a link to Sessions; Phase 2 ambient audio panel. Controls by state: idle: Start; running: Pause and Stop; paused: Resume and Stop; break: label "Break" with the same controls (break time is not study time, BR-009).
**Layout:** At 1024 and up, left column (max 480) holds setup, face and controls; right column holds Recent sessions and audio. Below 1024, a single column with the face first.
**Information hierarchy:** The time is the focal point (timer-display), the Arc is secondary, controls tertiary. Setup fields appear before start and collapse to a read-only summary line once running.
**Responsive behavior:** Face 280 px on desktop, 240 px on mobile, `min(240px, 50vh)` in landscape phones. At 360, controls are full width and stacked (Start, Pause, Resume 56 high; Stop 48 high). The tab bar stays visible. Two-column layout at 900 and up (RESPONSIVE-DESIGN.md).
**Loading state:** Setup fields use skeletons. On load with a running timer, the face shows the last known state from the store and the text "Syncing" until the server state arrives.
**Empty state:** With no subjects: panel "Add a subject to start a session" with a link "Add subject". Before a subject is chosen Start is disabled with helper "Choose a subject to start".
**Error state:** Buttons show pending within 200 ms (NFR-004). A failed action keeps the clock running and shows an inline error under the controls, for example "Pause was not saved. Try again." with Retry. `timer_already_running` opens the replace dialog (EC-002). Offline uses the banner from ERR-PAGE (EC-028). Archived subjects cannot be chosen. Errors never interrupt a running timer (ERROR-HANDLING.md section 5).
**Accessibility requirements:** A11Y-BASE; the clock is `role="timer"` with `aria-live="off"`; live region announces started, paused, resumed, interval ended, stopped, never per second (NFR-044); controls have visible text labels; interval end triggers a sound, a browser notification if permitted, and a persistent in-app alert region; the notification permission prompt appears only after the explicit link "Enable alerts" (EC-024). Post-session panel (non-modal, in place of the setup, dismissible, never blocks): summary line "Saved: Physics, 24 min" [example], optional Topic status select (Not started, In progress, Done), optional note textarea, buttons "Save" and "Skip". Outcome messages: completed pomodoro; "Saved as time only (under 5 minutes of focus)"; "Not saved: shorter than 1 minute" (EC-012). Auto-closed (EC-001): on next load the panel "Your session was closed automatically after 30 minutes without activity. It counts up to [last activity time]." with the link "Edit session". Phase 2 streak and XP lines appear in the panel (INTERACTION-SPECIFICATIONS.md).
**Requirements:** FR-040, FR-041, FR-049, FR-050, FR-051, FR-052, FR-053, FR-054, FR-055, FR-056, FR-057, FR-058, FR-059, BR-009, EC-001, EC-002, EC-012, EC-024, EC-028, NFR-004, NFR-044, NFR-088.
**Phase:** MVP; ambient audio panel Phase 2 (FR-180 to FR-184).

### A-4 Sessions

**Purpose:** Review and correct recorded sessions.
**Primary user actions:** Add a manual session; edit; delete; filter by date range and subject; load more.
**Main components:** Page header with "Add manual session"; filter bar (two native date inputs, subject select); table with columns Date, Subject, Topic, Start, End, Minutes, Source (chips Timer or Manual, and Auto-closed), row actions menu; manual entry dialog (subject, topic, start date and time, duration in minutes); "Load more" button (page size 25).
**Layout:** Content max width 960: header, filters, table, Load more.
**Information hierarchy:** The table rows are primary; filters secondary. A midnight-crossing session is one row with the text "Spans two days: 40 min and 20 min" [example] (EC-009). Manual and auto-closed entries are labelled with chips, never merged silently (BR-010).
**Responsive behavior:** Under 768 the table becomes stacked rows with the same content and order; the manual entry dialog becomes a full-height sheet.
**Loading state:** LOAD-LIST.
**Empty state:** "No sessions yet" with buttons "Start a session" and "Add manual session".
**Error state:** ERR-SECTION for the list. Manual entry validation as field or dialog errors: `manual_entry_in_future`, `manual_entry_too_long`, `daily_total_exceeded`, `manual_entry_overlaps_session` naming the conflicting session, `duration_out_of_range`. `stale_version` on edit uses the stale panel. Delete opens a confirm dialog naming the session ("Delete session 'Physics, 12 Mar'?") with the primary button "Delete session". `session_already_closed` shows "This session was already stopped."
**Accessibility requirements:** A11Y-BASE; table semantics with caption and `scope` headers; per-row menu button named "More actions for <subject>, <date>"; chips carry text.
**Requirements:** FR-040, FR-042, FR-043, FR-044, FR-045, FR-046, FR-047, FR-048, FR-088, BR-010, EC-009, EC-011.
**Phase:** MVP.

### A-5 Calendar

**Purpose:** Show when the user studied and what is planned.
**Primary user actions:** Move between months; select a day; add a plan entry for a day; switch to Plan list.
**Main components:** Tab strip (Month, Plan list; Week in Phase 2); month header (Previous month button, label such as "March 2026" [example] as a polite live region, Next month button, Today button); timezone text; weekday header starting Monday (decision U-D9); 7 by 6 heatmap grid; legend with the four ranges (0, 1 to 59, 60 to 119, 120+ minutes) as text; day detail panel (sessions with subject, start, end, minutes, day total; planned entries with subject, time, duration, status chip Planned, Done or Missed; planned versus actual line; button "Add plan entry for this day").
**Layout:** At 1024 and up, grid left (max 720) and day panel right (360). At 768 to 1023, grid full width and day panel below. Reason: the month grid is the focal point (DESIGN-PRINCIPLES.md principle 2).
**Information hierarchy:** Grid first, legend second, day panel third.
**Responsive behavior:** Mobile: cells 44 high with the minute number in 12 px under the date; the day panel appears below the grid and focus moves to its h2 on selection. Day panel moves below the grid under 900 (RESPONSIVE-DESIGN.md).
**Loading state:** Grid skeleton of 42 cells.
**Empty state:** The grid is still shown with zeros; day panel text "No sessions or plans on this day" with the action "Add plan entry for this day".
**Error state:** ERR-SECTION replaces the grid with Retry; the tab strip and header stay.
**Accessibility requirements:** A11Y-BASE; the grid follows the ARIA grid pattern with a single tab stop and arrow-key navigation (Home and End within the row, PageUp and PageDown change month), Enter or Space selects a day; each cell is a button labelled "<date>, <N> minutes studied, <M> planned entries[, today]"; color is never the only carrier: the minute number is printed in every cell, Today has a 2 px outline and the word "Today" in the cell label, the legend is text (NFR-043).
**Requirements:** FR-060, FR-061, FR-062, FR-063, FR-072, NFR-043, NFR-085.
**Phase:** MVP; week view Phase 2 (B-1).

### A-6 Plan list

**Purpose:** Create and manage plan entries and compare planned with actual time.
**Primary user actions:** Add, edit, delete a plan entry; mark a past entry as missed; filter.
**Main components:** Filters (date range, subject, status Upcoming, Done, Missed); list of entries grouped by day, each row with planned minutes, actual minutes, signed variance text ("+10 min" or "-15 min" [example], never color alone), status chip, row menu (Edit, Delete, "Mark as missed" for past entries without sessions); plan entry dialog (subject, topic, date, start time, duration 5 to 480, "Save"). After Save with a conflict, a confirm dialog "This overlaps <subject> at <time>. Save anyway?" with buttons "Save anyway" and "Change time". The exam-date warning uses the same pattern.
**Layout:** Content max width 960, list under the filter bar; page header action "Add plan entry". This is the second tab of Calendar.
**Information hierarchy:** Day groups as h2, rows beneath; variance is a text column next to actual.
**Responsive behavior:** Under 768 rows stack: meta lines under the title; the entry dialog becomes a full-height sheet.
**Loading state:** LOAD-LIST.
**Empty state:** "No planned sessions" with "Add plan entry".
**Error state:** ERR-SECTION. `overlap_confirmation_required` and `exam_date_warning_confirmation_required` open the confirm dialogs above. `past_entry_read_only`: past entries show the text "Read only" and only offer Mark as missed. `duration_out_of_range` is a field error stating 5 to 480. `stale_version` uses the stale panel.
**Accessibility requirements:** A11Y-BASE; row menu named "More actions for <subject>, <date>"; variance and status are text.
**Requirements:** FR-030, FR-031, FR-032, FR-033, FR-034, FR-035, FR-036, FR-037, FR-038, BR-026.
**Phase:** MVP.

### A-7 Subjects

**Purpose:** Manage the subjects that sessions, plans, tasks and notes belong to.
**Primary user actions:** Add, reorder, archive, restore a subject.
**Main components:** Tabs Active | Archived; rows with color dot, name, topic count, "Done" count text, row menu (Edit, Move up, Move down, Archive); drag handle for pointer reorder; Add subject dialog (name 1 to 100 characters, color swatch radio group with visible names); Archived tab rows with Restore.
**Layout:** Content max width 960; page header action "Add subject".
**Information hierarchy:** Subject name first, counts second; color dot only decorates the printed name.
**Responsive behavior:** Rows stack meta under the name on mobile; drag handle stays and Move up and Move down remain in the menu.
**Loading state:** LOAD-LIST.
**Empty state:** "No subjects yet" with "Add subject". Archived tab: "No archived subjects".
**Error state:** ERR-SECTION. Restore name conflict (`duplicate`) asks to rename before restoring. Archive while a session runs returns `subject_has_running_session` with a message naming the subject. Archive uses a confirm dialog.
**Accessibility requirements:** A11Y-BASE; reorder has a non-drag path (Move up and Move down, WCAG 2.5.7, NFR-042); swatch picker is a radio group with swatch plus visible name.
**Requirements:** FR-010, FR-011, FR-012, FR-013, FR-014, FR-015, FR-016, BR-029, EC-007, NFR-042.
**Phase:** MVP; drag reorder gesture Phase 2 (FR-065 to FR-069 covers calendar drag; list reorder uses buttons in MVP).

### A-8 Subject details

**Purpose:** Manage one subject's topics, goal, notes and exams.
**Primary user actions:** Edit or archive the subject; add, reorder, archive topics; set topic status; paste a topic list; set or remove the per-subject daily goal; open notes and exams.
**Main components:** Header with color dot, name, Edit, Archive; summary row (minutes studied this month [REAL DATA], per-subject daily goal with Set and Remove); Topics list (name, weight chip "Weight 3" [example], status select Not started, In progress, Done, drag handle, menu with Move up and Move down, archive); inline "Add topic" row; "Paste a list" dialog with a textarea and a preview list before saving (max 200 lines); Notes list for this subject with a "New note" button; Exams list; collapsed Archived topics section.
**Layout:** Two columns at 1024 and up (topics 8, side column 4 with summary, goal, notes, exams); single column below. Breadcrumb "Subjects > <name>".
**Information hierarchy:** Topics are primary; the side column is secondary.
**Responsive behavior:** Single column; side sections follow the topics; breadcrumb collapses to "Back to Subjects".
**Loading state:** LOAD-LIST for topics and LOAD-CARD for the side sections.
**Empty state:** Topics: "No topics yet" with "Add topic" and "Paste a list". Notes: "No notes for this subject". Exams: "No exams for this subject".
**Error state:** ERR-SECTION per section; ERR-PAGE with `not_found` for another user's id; `input_too_large` for an oversized pasted list names the 200 line limit.
**Accessibility requirements:** A11Y-BASE; status is a native select with text, never color alone; reorder alternatives as in A-7.
**Requirements:** FR-010, FR-011, FR-012, FR-013, FR-014, FR-015, FR-016, FR-017, FR-018, FR-019, FR-071, FR-101, EC-008.
**Phase:** MVP.

### A-9 To-dos

**Purpose:** Track tasks tied to subjects.
**Primary user actions:** Add a task; filter; complete; edit; delete.
**Main components:** Quick-add row (title input, priority select defaulting to Medium, due date native input, subject combobox; subject and due date sit behind a "More fields" disclosure on mobile); filter row (Status Open, Done, All; Subject; Priority; Due: Overdue, Due today, Within 7 days, No due date; filters combine); list with the text "Sorted by priority, then due date"; rows with checkbox, title, subject dot and name, due text ("Due Mar 12" or "Overdue by 2 days" [example]), priority chip with text and icon, row menu (Edit, Delete).
**Layout:** Content max width 960: quick-add row on top, filters, list.
**Information hierarchy:** The quick-add row is the focal point; rows are sorted by rule, so no manual order exists.
**Responsive behavior:** Filters collapse into selects in a two-column grid under 768; the row menu stays visible.
**Loading state:** LOAD-LIST.
**Empty state:** "No tasks"; focus goes to the quick-add title field whose helper text reads "Add your first task". It is helper text, not a button.
**Error state:** ERR-SECTION. A failed toggle reverts the checkbox and shows an inline error with Retry. Empty title: "Enter a task title". Delete opens a confirm dialog naming the task.
**Accessibility requirements:** A11Y-BASE; completing keeps the row in place until reload or filter change, with line-through plus a "Done" chip; announcements "Task added", "Task marked done" through the polite region.
**Requirements:** FR-090, FR-091, FR-092, FR-093, FR-094, FR-095, FR-096, BR-031.
**Phase:** MVP.

### A-10 Notes

**Purpose:** Find and open notes grouped by subject.
**Primary user actions:** Open a note; create a note; filter by subject and topic.
**Main components:** Filter selects (subject, topic); list grouped by subject, each row with title, owner (subject or subject > topic), last edited text; "New note" button opening a dialog that picks owner and title, then opens the editor.
**Layout:** Content max width 960.
**Information hierarchy:** Subject group headings as h2, notes beneath.
**Responsive behavior:** Rows stack owner and edited text under the title on mobile.
**Loading state:** LOAD-LIST.
**Empty state:** "No notes yet" with "New note".
**Error state:** ERR-SECTION. Notes on archived subjects are hidden (FR-104).
**Accessibility requirements:** A11Y-BASE; note titles are links with unique text.
**Requirements:** FR-100, FR-101, FR-104.
**Phase:** MVP.

### A-11 Note editor

**Purpose:** Write and save a markdown note.
**Primary user actions:** Edit title, owner and body; preview; delete.
**Main components:** Title input; owner combobox; markdown textarea in body font 16/26; formatting help popover listing supported syntax; Preview (server-sanitized); save status text ("Saved", "Saving", "Not saved. Retry" with icon, `role="status"`); overflow menu (Delete). Autosave after 5 s without typing; Ctrl or Cmd+S saves now; unsent text is kept locally and restored. Conflict dialog with two labelled panes "Your version" and "Saved elsewhere" and buttons "Keep mine", "Keep theirs", "Keep both as two notes".
**Layout:** At 1024 and up, edit and preview side by side, each at most 65 characters wide; under 1024 a tab control Edit | Preview. Breadcrumb "Notes > <title>".
**Information hierarchy:** The text area is the focal point; save status is a quiet text line.
**Responsive behavior:** Tabs Edit | Preview under 1024; breadcrumb collapses to "Back to Notes".
**Loading state:** Editor skeleton.
**Empty state:** A new note shows an empty body with placeholder-free label "Note body".
**Error state:** A failed save keeps the text and shows Retry. `stale_version` opens the conflict dialog (EC-020). `not_found` uses ERR-PAGE.
**Accessibility requirements:** A11Y-BASE; textarea labelled "Note body"; preview is a labelled region; differences in the conflict dialog are identified by labels, not color; a leave-page guard appears only when unsent local text exists.
**Requirements:** FR-100, FR-101, FR-102, FR-103, FR-104, EC-020, NFR-054.
**Phase:** MVP.

### A-12 Exams

**Purpose:** List upcoming and past exams with countdowns.
**Primary user actions:** Add an exam; open an exam; change the date of an archived exam.
**Main components:** Tabs Active | Archived; Active rows with title, subject dot and name, exam date, countdown text ("12 days", "Today" [example]), topic progress text "5 of 9 topics done" [example]; Add exam dialog (title, subject, date today or later); Archived rows read-only with final completion text, the only action "Change date".
**Layout:** Content max width 960; page header action "Add exam".
**Information hierarchy:** Countdown and title lead each row; progress text second.
**Responsive behavior:** Rows stack date and progress under the title on mobile.
**Loading state:** LOAD-LIST.
**Empty state:** "No upcoming exams" with "Add exam". Archived tab: "No past exams".
**Error state:** ERR-SECTION. `exam_date_in_past` is a field error.
**Accessibility requirements:** A11Y-BASE; countdown is text, not an icon or color.
**Requirements:** FR-120, FR-121, FR-123, FR-124, FR-125.
**Phase:** MVP.

### A-13 Exam details

**Purpose:** Track topic coverage for one exam and plan study for it.
**Primary user actions:** Tick topics done; edit topics; plan study sessions; edit or archive the exam.
**Main components:** Header with title, date, countdown; topic checklist (checkbox and topic name per row, weight text in Phase 2); "Edit topics" dialog selecting from the subject's topics; link "Plan study sessions" to `/plan` prefilled; note "1 topic was removed because it was archived" [example] when topics dropped. Phase 2: Readiness Arc labelled "Topic coverage" with the sentence "This is the share of topic weight marked done, not a prediction of your result."
**Layout:** Single column, content max width 720; breadcrumb "Exams > <title>".
**Information hierarchy:** Countdown and checklist lead; Readiness Arc (Phase 2) is the stat card at the top.
**Responsive behavior:** Single column; breadcrumb collapses to "Back to Exams".
**Loading state:** LOAD-LIST for the checklist, LOAD-CARD for the header.
**Empty state:** "Add topics to track progress" with the "Edit topics" button (EC-014).
**Error state:** ERR-SECTION; ERR-PAGE for `not_found`; a failed checkbox toggle reverts with an inline Retry.
**Accessibility requirements:** A11Y-BASE; checklist is a group labelled with the exam title; Arc has `role="img"` with a runtime label.
**Requirements:** FR-120, FR-121, FR-122, FR-123, FR-124, FR-125, FR-126, FR-127, FR-128, EC-014.
**Phase:** MVP; Readiness Arc Phase 2.

### A-14 Statistics

**Purpose:** Show totals and planned versus actual time over a range.
**Primary user actions:** Choose a range; switch Daily, Weekly, Monthly view; read charts and tables.
**Main components:** Range control (presets 7 days, 30 days, This month, Last 3 months, Custom with two native date inputs; maximum 24 months, otherwise a message); view tabs Daily | Weekly | Monthly; total bar chart (primary color) plus numeric table; by-subject section (horizontal bars with percent text, archived label "<name> (archived)"); manual share as a second hatched segment with text "Manual 2 h 10 min" [example]; goal-hit text "Goal met on 12 of 30 days (40 percent)" [example, real at runtime]; planned versus actual chart (hatched planned, solid actual, signed variance column). Every chart sits in a `figure` with a `figcaption` summary sentence and the numeric table directly below, always visible.
**Layout:** Content max width 1200; sections stacked; charts full width.
**Information hierarchy:** Totals first, then by-subject, then planned versus actual.
**Responsive behavior:** Charts full width, 240 high on mobile and 320 on desktop; tables stack under 768; the range control becomes a select plus date inputs. Chart components are lazy loaded and reserve their dimensions.
**Loading state:** Chart-sized skeletons (LOAD-CARD) to avoid layout shift.
**Empty state:** Fewer than 3 days of data: panel "Record study on 3 different days to see statistics" with "Start a session" (FR-087).
**Error state:** ERR-SECTION per section. A range over 24 months shows an inline message stating the limit.
**Accessibility requirements:** A11Y-BASE; no animation; no color-only series (patterns and labels); axes labelled with units "minutes", and hours when a total exceeds 120 minutes; tooltips are a convenience only (NFR-043).
**Requirements:** FR-080, FR-081, FR-082, FR-083, FR-084, FR-085, FR-086, FR-087, FR-088, FR-089, BR-002, BR-010, NFR-043.
**Phase:** MVP.

### A-15 Settings

**Purpose:** Manage profile, study defaults, appearance, security and data.
**Primary user actions:** Edit each section and save; revoke sign-ins; export data; open the setup guide; delete the account.
**Main components:** Profile: display name (1 to 50), timezone combobox, day rollover hour select (0 to 23, text "Your study day starts at 00:00"), warning text "Changing timezone applies from now on. Past days keep their dates." Study: daily goal (5 to 1440), timer durations (same fields as the Timer dialog), link to per-subject goals. Appearance: theme radio group Light | Dark | System with immediate preview. Security: active sign-ins list (device description, last active text, "This device" chip, Revoke, "Revoke all others"). Data: buttons "Export as CSV" and "Export as JSON", progress as a labelled progressbar plus status text, download link on completion; "Open setup guide"; a Danger area "Delete account" requiring password or Google confirmation plus typing `DELETE`, with text explaining the 30-day purge. Each form saves with "Save changes" and confirms with an inline "Saved" status.
**Layout:** Vertical section list (left column 220) at 1024 and up; content max width 720.
**Information hierarchy:** One section at a time; Danger area last, separated, in its own bordered panel.
**Responsive behavior:** Under 1024 the section list becomes a horizontal tab list scrolling inside a labelled region; fields single column.
**Loading state:** LOAD-CARD for the form panel; sign-in list uses LOAD-LIST.
**Empty state:** Security: if only this device is active the text "No other sign-ins" replaces the "Revoke all others" button.
**Error state:** Field errors inline (`goal_out_of_range`, `invalid_timezone`, `duration_out_of_range`); ERR-SECTION for load or save failure with typed values kept; `export_limit_reached` shows "An export is already in progress. Wait for it to finish." Account deletion failure keeps the dialog open with the message.
**Accessibility requirements:** A11Y-BASE; theme change is announced "Theme set to Dark"; export progress is `role="progressbar"` with value text and the completion is announced; destructive confirmation names the object (WCAG 3.3.4).
**Requirements:** FR-006, FR-007, FR-008, FR-009, FR-057, FR-070, FR-074, FR-130, FR-131, FR-132, FR-135, FR-138, NFR-054.
**Phase:** MVP; Notifications, AI consent, API keys sections are Phase 2 and 3 (B-4, C-6, C-7).

## App pages, Phase 2

### B-1 Calendar week planner

**Purpose:** Plan and adjust sessions on a time grid.
**Primary user actions:** Create an entry by dragging over empty slots; move or resize an entry; use the edit form; add an entry by form.
**Main components:** Time grid with 15-minute rows (16 px visual row; 44 px minimum interaction through the form path), days as columns, planned entries as blocks (subject dot, name, time), actual sessions as outlined blocks beside planned ones, a now-line, grip handles, live region.
**Layout:** Content max width 1200; tab strip shared with A-5 (Month, Plan list, Week).
**Information hierarchy:** The grid is primary; blocks show time text so position is not the only carrier.
**Responsive behavior:** Mobile: day view with an agenda list; creation through the "Add plan entry" form; drag only with the grip handle. Tablet: 3-day view with drag. Desktop: full week.
**Loading state:** Grid skeleton with reserved height.
**Empty state:** Grid shown; text "No planned sessions this week" with "Add plan entry".
**Error state:** ERR-SECTION replaces the grid; a failed drop restores the block and shows an inline error row under the grid with Retry. Past slots cannot be changed (`past_entry_read_only`).
**Accessibility requirements:** A11Y-BASE; three equivalent paths (pointer, keyboard move mode, edit form); announcements as defined in INTERACTION-SPECIFICATIONS.md (WCAG 2.5.7, NFR-042).
**Requirements:** FR-065, FR-066, FR-067, FR-068, FR-069, FR-031, BR-026, NFR-042.
**Phase:** Phase 2.

### B-2 Flashcards

**Purpose:** Manage cards and start review.
**Primary user actions:** Create, edit, delete cards; filter; start review.
**Main components:** Filter selects (subject, topic); table with columns Front, Back (truncated), Next review text, row menu; "New card" dialog (front and back 1 to 1000 characters, optional subject and topic); primary button "Review N due cards" shown when cards are due (N [REAL DATA]).
**Layout:** Content max width 960.
**Information hierarchy:** The review button leads when cards are due; the table follows.
**Responsive behavior:** Table stacks under 768.
**Loading state:** LOAD-LIST.
**Empty state:** "No cards yet" with "New card".
**Error state:** ERR-SECTION; field errors for length.
**Accessibility requirements:** A11Y-BASE; table semantics; per-row menu named "More actions for card <front text>".
**Requirements:** FR-107, FR-108, FR-109, FR-110, FR-111, FR-112.
**Phase:** Phase 2.

### B-3 Flashcard review

**Purpose:** Review due cards one at a time.
**Primary user actions:** Show answer; rate Again, Hard, Good, Easy; exit review.
**Main components:** Minimal header with "Exit review" link, text "Card 12 of 50" [example], progressbar; card front in a plain bordered panel in stat size; "Show answer" button; four equal rating buttons (56 high, labels only); optional keyboard shortcuts 1 to 4 and Space with a visible switch "Keyboard shortcuts" to turn them off (WCAG 2.1.4); end summary with counts of Again, Hard, Good, Easy [REAL DATA] and a link "Back to flashcards".
**Layout:** Full-width focused view without app navigation; centered panel max 720.
**Information hierarchy:** The card text is the focal point; buttons beneath.
**Responsive behavior:** Full screen at all sizes; rating buttons stack two by two under 768.
**Loading state:** Card panel skeleton of the same size.
**Empty state:** "No cards due today" with "Back to flashcards". Daily limit: "You reached today's review limit of 50. Remaining cards stay due." [example] (FR-111).
**Error state:** A failed rating shows an inline error with Retry; ratings are idempotent (EC-021).
**Accessibility requirements:** A11Y-BASE except the shell; focus moves to the card region when a card appears; announcement "Rated Good. Next card."; shortcuts only active inside the view.
**Requirements:** FR-107, FR-108, FR-109, FR-110, FR-111, FR-112, EC-021.
**Phase:** Phase 2.

### B-4 Settings notifications

**Purpose:** Configure reminders.
**Primary user actions:** Toggle daily and plan-entry reminders, set times, enable push.
**Main components:** Daily reminder switch plus time; plan-entry reminder switch plus lead time (default 10 minutes); push switch with prerequisite text when permission is blocked; reminder bell in the header opening a popover of recent in-app notifications with Dismiss.
**Layout:** Settings section layout as A-15, max width 720.
**Information hierarchy:** Switches with their dependent fields grouped.
**Responsive behavior:** As A-15.
**Loading state:** LOAD-CARD.
**Empty state:** Bell popover: "No notifications".
**Error state:** ERR-SECTION; a failed switch reverts with an inline error. Blocked permission shows text on how to allow notifications in the browser (EC-024).
**Accessibility requirements:** A11Y-BASE; switches labelled; the bell button named "Notifications"; the popover traps no focus beyond Esc to close.
**Requirements:** FR-150, FR-151, FR-152, FR-153, FR-154, EC-024.
**Phase:** Phase 2.

## App pages, Phase 3

### C-1 Generate schedule

**Purpose:** Collect inputs for an AI-drafted schedule.
**Primary user actions:** Accept consent; choose exams, topics, weekly hours, availability; submit.
**Main components:** Prerequisite panel; consent dialog (unchecked checkbox, lists data categories: exams, topics, weekly hours, last 28 days of sessions; wording marked "[LEGAL REVIEW PENDING]"); form (exams multi-select showing only upcoming, topic checklist limited to chosen exams, weekly hours 1 to 168, availability windows per weekday with start and end and "Add window"); remaining quota text "3 of 5 generations left today" [example]; button "Generate draft". On submit an indeterminate progress panel "Generating a draft schedule. This can take up to 30 seconds."
**Layout:** Form panel, max width 720.
**Information hierarchy:** Prerequisites and quota first, then the form.
**Responsive behavior:** Single column; availability windows stack.
**Loading state:** The progress panel is `role="status"`; repeated submit is ignored.
**Empty state:** Prerequisite panel when data is missing (no upcoming exam or topics) names the missing item with a link (FR-198).
**Error state:** `consent_required` opens the consent dialog; `ai_daily_limit_reached` states the limit; `ai_provider_unavailable` and `ai_provider_timeout` show "The AI service is unavailable. Nothing was saved and no generation was used." with Retry; inputs kept.
**Accessibility requirements:** A11Y-BASE; checkbox lists are fieldsets with legends; copy avoids marketing terms and sparkle icons; entry icon is CalendarPlus.
**Requirements:** FR-190, FR-191, FR-192, FR-196, FR-197, FR-198.
**Phase:** Phase 3.

### C-2 Schedule preview

**Purpose:** Review the draft and accept or discard it.
**Primary user actions:** Add entries to the plan; discard the draft.
**Main components:** Summary sentence ("12 entries proposed, 3 removed by checks, 2 overlap your plan" [example]); entries grouped by date with time range, duration, subject dot and name, topic, chip "Proposed"; overlapping rows show a warning icon and text naming the overlapped entry; sticky action bar with "Discard draft" (secondary) and "Add N entries to my plan" (primary, N [REAL DATA]); overlap confirmation dialog listing overlaps. Entries cannot be edited here.
**Layout:** Content max width 960.
**Information hierarchy:** Summary first, entries second, action bar pinned.
**Responsive behavior:** Rows stack; the sticky bar never covers a focused field (scroll padding).
**Loading state:** LOAD-LIST.
**Empty state:** `ai_no_valid_entries`: panel "No usable entries. Nothing was saved." with a Back link.
**Error state:** ERR-SECTION; accept is double-press safe (button pending); success routes to `/plan` with status "N entries added".
**Accessibility requirements:** A11Y-BASE; sticky bar does not obscure focus; overlap is text plus icon.
**Requirements:** FR-193, FR-194, FR-195, FR-197, FR-198, BR-026.
**Phase:** Phase 3.

### C-3 Groups

**Purpose:** List the user's study groups.
**Primary user actions:** Create a group; open a group.
**Main components:** List (name, role text, member count); "Create group" dialog (name 1 to 60).
**Layout:** Content max width 960.
**Information hierarchy:** Group names lead.
**Responsive behavior:** Rows stack meta under the name.
**Loading state:** LOAD-LIST.
**Empty state:** "You are not in a group" with "Create group" and the note "Have an invite link? Open it to join."
**Error state:** ERR-SECTION; `group_full` and `role_not_allowed` as inline messages.
**Accessibility requirements:** A11Y-BASE; role is text.
**Requirements:** FR-200, FR-201, FR-209.
**Phase:** Phase 3.

### C-4 Group details

**Purpose:** Show the weekly leaderboard and manage the group.
**Primary user actions:** Toggle sharing; invite; manage members; leave; dissolve; report.
**Main components:** Header with name and role; Weekly leaderboard table (Rank, Name, Focused minutes) with the viewer row marked "You" in text; switch "Share my weekly total with this group" off by default with the sentence "Only your weekly focused minutes are shared. Subjects, notes and sessions are never shared."; Members list with roles; admin-only Invite (7-day expiry link shown as text, copy button, email invite, active invites with Revoke), Rename, Transfer admin, Remove member, Dissolve; member actions Report member, Leave.
**Layout:** Content max width 960; breadcrumb "Groups > <name>".
**Information hierarchy:** Leaderboard and sharing switch lead; member and admin actions follow.
**Responsive behavior:** Leaderboard table stacks into a list under 768; breadcrumb collapses to "Back to Groups".
**Loading state:** LOAD-LIST.
**Empty state:** Leaderboard: "No one has shared their weekly total yet" plus an explanation of opt-in (FR-207).
**Error state:** ERR-SECTION; `last_administrator` message names the next step; `stale_version` on rename uses the stale panel; a failed switch reverts with an inline error.
**Accessibility requirements:** A11Y-BASE; ranks are numbers in text; dissolving requires typing the group name (FR-210).
**Requirements:** FR-203, FR-204, FR-205, FR-206, FR-207, FR-208, FR-210, FR-211, FR-212.
**Phase:** Phase 3.

### C-5 Join group

**Purpose:** Confirm joining a group from an invite link.
**Primary user actions:** Join group; Cancel.
**Main components:** Group name and member count, buttons "Join group" and "Cancel".
**Layout:** Centered panel, max width 440.
**Information hierarchy:** Group name leads.
**Responsive behavior:** Buttons full width under 768.
**Loading state:** Panel skeleton.
**Empty state:** Not applicable, the page always shows an invite result.
**Error state:** Invalid, expired or revoked invite (`invite_expired`) shows "This invite is no longer valid. Ask for a new one." with no group details (FR-202). `already_member` links to the group; `group_full` states the group is full.
**Accessibility requirements:** A11Y-BASE; guests are redirected to login with the target preserved.
**Requirements:** FR-201, FR-202, FR-002.
**Phase:** Phase 3.

### C-6 Settings AI consent

**Purpose:** Show and withdraw AI data consent.
**Primary user actions:** Withdraw consent.
**Main components:** Current consent status with date; "Withdraw consent" button with a confirm dialog.
**Layout:** Settings layout as A-15.
**Information hierarchy:** Status first, action second.
**Responsive behavior:** As A-15.
**Loading state:** LOAD-CARD.
**Empty state:** No consent given: "You have not given consent" with a link to Generate schedule.
**Error state:** ERR-SECTION with Retry.
**Accessibility requirements:** A11Y-BASE; wording marked "[LEGAL REVIEW PENDING]" until decision U-D5 resolves.
**Requirements:** FR-190, FR-191.
**Phase:** Phase 3.

### C-7 Settings API keys

**Purpose:** Manage public API keys.
**Primary user actions:** Create, view, revoke keys.
**Main components:** Key list (name, scopes summary, last 4 characters, created date, status Active or Revoked); "Create key" dialog (name 1 to 60, per-resource scope radio None, Read, Write); one-time reveal dialog with Copy button and warning "This key will not be shown again"; Revoke confirm. Limit of 10 active keys. Public API documentation is external and out of scope here.
**Layout:** Settings layout as A-15.
**Information hierarchy:** Key list first.
**Responsive behavior:** List stacks under 768.
**Loading state:** LOAD-LIST.
**Empty state:** "No API keys" with "Create key".
**Error state:** ERR-SECTION; at the limit the Create button is disabled with the text "You have 10 active keys. Revoke one to create another." `scope_missing` is not shown here (it is an API response).
**Accessibility requirements:** A11Y-BASE; Copy button text changes to "Copied" and the live region announces it; the revealed key is selectable text.
**Requirements:** FR-220, FR-221, FR-222, FR-223, FR-224, FR-225, FR-226.
**Phase:** Phase 3.
