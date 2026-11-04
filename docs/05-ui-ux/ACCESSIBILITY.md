# Accessibility

> Status: Proposal, pending approval. Source of truth: Phase 1 to 4 docs.

Target: WCAG 2.2 level AA (NFR-040). This file records design decisions that make each criterion pass. Token names refer to COLOR-TYPOGRAPHY.md and DESIGN-SYSTEM.md; page IDs refer to PAGE-SPECIFICATIONS.md and INFORMATION-ARCHITECTURE.md. Reason: one accessibility contract that every page spec points to avoids per-page drift.

## 1. Conformance map

Only criteria that need a design decision are listed. Criteria not listed (for example 1.2.x media alternatives) have no corresponding feature in the MVP; ambient audio (Phase 2, FR-180 to FR-184) is user-initiated sound only, with no speech content.

| SC | Name | Decision | Applies to |
|---|---|---|---|
| 1.1.1 | Non-text content | Decorative icons are hidden from assistive tech. Icon-only buttons carry an accessible name (section 4 table). The Arc and charts carry a text value built at runtime from real data. No images of text, no illustrations. | All pages |
| 1.3.1 | Info and relationships | Semantic landmarks, one h1 per page, real tables with captions and scope headers, lists for lists, fieldset and legend for radio groups, labels bound to inputs. Stacked rows on mobile switch to list semantics with per-item headings. | All pages |
| 1.3.4 | Orientation | Orientation is never locked. Landscape phone rules for the timer are in RESPONSIVE-DESIGN.md. | A-3 and all pages |
| 1.3.5 | Identify input purpose | Autocomplete tokens: name, email, new-password, current-password on sign-up, log-in, reset and profile fields. | PU-2, PU-3, PU-5, A-15 |
| 1.4.1 | Use of color | Every color state also has text and a shape or icon or weight change (NFR-043): priority chips with text and icon, goal met with check icon and words "Goal met", overdue with words, running timer with the word "Running", heatmap with printed minutes, subject color always beside the printed name. | A-2, A-3, A-5, A-6, A-9, A-14 |
| 1.4.3 | Contrast (minimum) | All text pairs at 4.5:1 or more in both themes, as tabulated in COLOR-TYPOGRAPHY.md. Placeholders and caption text also meet 4.5:1. | All pages |
| 1.4.4 | Resize text | Text scales to 200 percent browser zoom with no loss of content. Sizes are relative units in the implementation. | All pages |
| 1.4.10 | Reflow | Content reflows to 320 CSS px with no two-dimensional scroll. Data tables are exempt but prefer stacked rows. | All pages |
| 1.4.11 | Non-text contrast | Control borders (border-strong), focus ring, chart series boundaries, Arc fill against track, heatmap cell outlines all at 3:1 or more. Decorative dividers (border token) are not relied on. | Controls, A-2, A-3, A-5, A-14 |
| 1.4.12 | Text spacing | Layouts tolerate line height 1.5, paragraph spacing 2x, letter spacing 0.12em and word spacing 0.16em without clipping. No fixed-height text containers. | All pages |
| 1.4.13 | Content on hover or focus | Tooltips are dismissible with Esc, hoverable, persistent while focused, and never the sole carrier of information. | Icon rail, truncated names |
| 2.1.1 | Keyboard | Every function works by keyboard (NFR-041), including timer, calendar grid and week planner. | All pages |
| 2.1.2 | No keyboard trap | Dialogs and drawers trap focus by design but always close with Esc and return focus. No other traps. | Dialogs, drawer, sheets |
| 2.1.4 | Character key shortcuts | No global single-key shortcuts in the MVP. The flashcard review shortcuts (1 to 4, Space) exist only inside the review view and have a visible "Keyboard shortcuts" switch to turn them off (B-3). Ctrl or Cmd+S in the note editor is a modifier shortcut. | B-3, A-11 |
| 2.2.1 | Timing adjustable | No session time limit in the UI. Toasts that auto-dismiss pause on hover and focus, and never carry the only copy of a result. Errors persist until dismissed. | Toasts |
| 2.2.2 | Pause, stop, hide | Nothing auto-moves. Timer face updates are user-requested content. Skeletons are static. Carousels and tickers are not used. | All pages |
| 2.3.1 | Three flashes | No flashing content. Interval-end alert is a persistent text region plus sound, not a flash. | A-3 |
| 2.4.1 | Bypass blocks | "Skip to main content" is the first focusable element, visible on focus. Landmarks provide secondary bypass. | All pages |
| 2.4.2 | Page titled | Title pattern "<Page name> · Lumora". While a timer runs the tab title shows the elapsed time and mode (FR-056). | All pages |
| 2.4.3 | Focus order | Tab order follows visual order. After route change focus moves to the new h1. After dialog close focus returns to the trigger. | All pages |
| 2.4.4 | Link purpose | Link text names the destination. Row links include the object name. Mini-bar link is named "Open timer, <subject>, <state>". | All pages |
| 2.4.6 | Headings and labels | Descriptive headings and visible labels on every field. Sentence case. | All pages |
| 2.4.7 | Focus visible | 2 px focus ring with 2 px offset on every focusable element, never removed (section 3). | All pages |
| 2.4.11 | Focus not obscured (minimum) | Scroll padding of 72 px at the top and 88 px at the bottom so the sticky page header, the mini-bar and the bottom tab bar never cover the focused element. Sticky action bars follow the same bottom padding. | All pages with sticky chrome |
| 2.5.1 | Pointer gestures | No multipoint or path-based gesture is required. Drag has button and form alternatives. | A-7, A-8, B-1 |
| 2.5.2 | Pointer cancellation | Actions fire on release (click), not on press. Drag drops can be cancelled with Esc or by dropping outside a valid slot. | All pages, B-1 |
| 2.5.3 | Label in name | Accessible names begin with the visible label text. Icon-plus-text buttons use the visible text as the name. | All controls |
| 2.5.7 | Dragging movements | Every drag has a single-pointer alternative: Move up and Move down buttons for lists (A-7, A-8), edit form and keyboard move mode for the calendar (B-1, FR-065 to FR-069, NFR-042). See section 9. | A-7, A-8, B-1 |
| 2.5.8 | Target size (minimum) | 44 x 44 px hit area under 1024 px and for coarse pointers (NFR-087); 40 px high controls only on fine-pointer desktop, still above 24 px. Minimum gap 8 px between adjacent targets. | All pages |
| 3.1.1 | Language of page | Document language declared as English. | All pages |
| 3.2.1 | On focus | Focus never triggers a context change. | All pages |
| 3.2.2 | On input | Changing a select, switch or filter updates only the controlled region and announces the result; no navigation on change. Theme switch applies immediately and is announced. | A-6, A-9, A-14, A-15 |
| 3.2.3 | Consistent navigation | One navigation structure per breakpoint with the same order of items (NAVIGATION-STRUCTURE.md). | App pages |
| 3.2.4 | Consistent identification | Same icon and same label for the same concept everywhere (mapping in DESIGN-SYSTEM.md). | All pages |
| 3.2.6 | Consistent help | No help mechanism exists in the MVP (decision U-D6), so there is nothing to align. If one is added it keeps the same position on every page. | All pages |
| 3.3.1 | Error identification | Errors are described in text, linked to the field with `aria-invalid` and `aria-describedby`, and use messages from the error catalog (ERROR-HANDLING.md). | Forms |
| 3.3.2 | Labels or instructions | Visible labels always. Only optional fields are marked "(optional)". Format hints under the field (for example "10 characters or more"). | Forms |
| 3.3.3 | Error suggestion | Messages say what happened and what to do, including allowed ranges (goal 5 to 1440, focus 1 to 120). | Forms |
| 3.3.4 | Error prevention (legal, financial, data) | Destructive actions use a confirm dialog naming the object; account deletion requires re-authentication plus typing DELETE (FR-007); group dissolve requires typing the group name. Entries are archivable and reversible where possible. | Delete flows, A-15, C-4 |
| 3.3.7 | Redundant entry | Failed submits keep typed input (FR-197, NFR-054). Timezone and age are not asked twice. Timer setup is preselected from the last used subject and mode. | Forms, A-2, A-3 |
| 3.3.8 | Accessible authentication (minimum) | Paste allowed in password fields, password managers supported via autocomplete tokens, show/hide toggle, Google sign-in alternative, no CAPTCHA or cognitive test. | PU-2, PU-3, PU-5 |
| 4.1.2 | Name, role, value | Native elements first; Radix primitives for dialogs, menus, tabs, select, toast. Custom widgets (Arc, heatmap grid, week grid, timer face) specify role, name and value. | All pages |
| 4.1.3 | Status messages | One global polite live region and one alert region (section 4). Save status, filter result counts, timer state changes and drag moves are announced without moving focus. | All pages |

Reason: listing each criterion with a decision turns the NFR-040 target into something a reviewer can tick.

## 2. Keyboard

General rules:
- Tab order follows visual order. No positive tabindex.
- Skip link first. No traps. Esc closes the topmost overlay (dialog, sheet, drawer, popover, menu) and restores focus to its trigger.
- No global single-key shortcuts in the MVP. Reason: avoids 2.1.4 risk and conflicts with screen reader keys.
- Every hover-only reveal is also available on focus; no hover-only controls.

Key maps:

| Widget | Keys |
|---|---|
| Buttons, links | Enter activates; Space also activates buttons |
| Checkbox, switch | Space toggles |
| Radio group | Arrow keys move and select; Tab leaves the group |
| Segmented control | Arrow keys move; Enter or Space selects (roving tabindex) |
| Tabs | Left and Right arrows move between tabs; Home and End jump; activation follows focus for Month and Plan list, manual activation for heavy panels |
| Menu (DropdownMenu) | Enter, Space or Down opens; Up and Down move; type-ahead; Esc closes and returns focus; Tab closes |
| Select (Radix) | Enter or Space opens; arrows move; type-ahead; Esc closes |
| Combobox (ARIA 1.2) | Typing filters; Down opens and moves; Enter selects; Esc closes the list, a second Esc clears; Tab accepts nothing unselected |
| Dialog | Focus moves to first field or heading; Tab cycles inside; Esc closes (not blocked by unsaved input without a confirm) |
| Calendar month grid (A-5) | Single tab stop; Arrow keys move by day and week; Home and End move to row start and end; PageUp and PageDown change month; Enter or Space selects the day and moves focus to the day panel h2 |
| Week planner (B-1) | Tab to an entry; Space or Enter picks up; Up and Down move 15 minutes; Left and Right move one day; Shift+Up or Shift+Down switches to resize; Space or Enter drops; Esc cancels (INTERACTION-SPECIFICATIONS.md, FR-065 to FR-069) |
| Data table sort | Enter or Space on the header button toggles sort |
| Flashcard review (B-3) | Space or Enter shows the answer; 1 to 4 rate; shortcuts only inside the view and can be switched off |
| Note editor (A-11) | Ctrl or Cmd+S saves now; everything else is standard text editing |
| Timer (A-3) | Native buttons only; no custom keys |

Reason: documented key maps give testers an exact expectation for NFR-041.

## 3. Focus visibility

- Ring: 2 px solid in the `focus` token, 2 px offset, applied on keyboard focus (focus-visible) for every focusable element. Never removed.
- Contrast: the `focus` token measures 5.76 on the light canvas and 10.71 on the dark canvas (values from COLOR-TYPOGRAPHY.md), well above the 3:1 non-text requirement. Filled components keep the 2 px gap so the ring contrasts with both the fill and the surrounding surface.
- Forced colors: the ring falls back to the system `Highlight` color. Listed as a verification item in section 10.
- Focus restoration:
  - Dialog close: returns to the trigger. If the trigger no longer exists (deleted row), focus goes to the next row, then the previous row, then the list heading.
  - Delete in a list: focus moves to the next row, or to the add field when the list becomes empty (A-9).
  - Route change: focus moves to the new h1 (tabindex -1) and the title updates.
  - Month change in the calendar: focus stays on the Previous or Next button; the month label is a polite live region.
  - Post-session panel: focus moves to its heading when it appears after Stop; Skip returns focus to the Start button.
  - Error summary: focus moves to the summary on failed submit with 4 or more fields; each link focuses its field.
- Focus is never moved by background updates (sync, polling, cross-tab convergence). Reason: a timer-focused user must not lose their place (FR-059).

## 4. Screen reader

### Landmarks

| Landmark | Content |
|---|---|
| `header` | Wordmark (guest) or page header with h1 (app) |
| `nav` (labelled "Primary") | Sidebar, rail or bottom tab bar, one per breakpoint |
| `nav` (labelled "Breadcrumb") | Detail pages only |
| `main` | Page content, one per page |
| `region` (labelled) | Day detail panel, preview pane, charts' figures, scrollable settings tabs |

### Headings per page type

| Page type | Structure |
|---|---|
| Dashboard | h1 page title; h2 per card (section) |
| List pages | h1; h2 for groups (by day, by subject); dialogs have own h2 |
| Detail pages | h1 is the object name; h2 for sections |
| Timer | h1; h2 "Recent sessions"; post-session panel h2 |
| Statistics | h1; h2 per chart section with figure and table |
| Forms and auth | h1; legend for groups |

No skipped levels. Reason: heading navigation is the main way screen reader users scan.

### Accessible names for icon-only buttons

| Control | Accessible name |
|---|---|
| Row menu | "More actions for <row title>" |
| Close in dialog, toast | "Close" |
| Menu (tablet) | "Open menu" |
| User menu | "Account menu for <display name>" |
| Previous or next month | "Previous month" / "Next month" |
| Pause or resume in mini-bar | "Pause timer" / "Resume timer" |
| Drag handle | "Reorder <item>, drag or use the menu" |
| Show or hide password | "Show password" / "Hide password" |
| Theme options | Visible text labels, no icon-only version |
| Reminder bell (Phase 2) | "Notifications, <N> unread" with real count |
| Copy invite link (Phase 3) | "Copy invite link" |

### Live regions

Two regions, mounted once in the app shell:
- Polite region: status messages. Content is replaced, never appended in bursts; messages are queued with a minimum gap so none are dropped.
- Alert region: errors that need immediate attention (failed save, failed timer action, interval end alert text mirrored).

Announcements:

| Event | Region | Text pattern |
|---|---|---|
| Timer started, paused, resumed, interval ended, stopped | Polite (interval end also in the persistent in-app alert) | "Timer started, Physics", "Timer paused", "Timer resumed", "Focus interval finished", "Session stopped, saved 24 minutes". No per-second count (NFR-044) |
| Timer changed in another tab | Polite | "Timer paused on another device" (FR-059) |
| Save status (notes, settings) | Polite | "Saved", "Saving", "Not saved. Retry" |
| Task added, marked done, priority changed | Polite | "Task added", "Task marked done", "Priority changed to High, moved to position 2 of 8" |
| Filter or range change | Polite | "<N> results" or "No results" |
| Month change | Polite | Month label, for example "March 2026" (example) |
| Toasts | Polite for success and info; alert for errors | Same text as the toast |
| Drag moves | Polite | "Picked up Physics, Tuesday 09:00 to 10:00", "Moved to Tuesday 09:15 to 10:15", "Dropped", "Cancelled, back to original time", "Overlaps Maths 09:30" |
| XP, goal and streak lines (Phase 2) | Polite, once per saved session | "+24 XP", "Daily goal met", "Streak: 7 days" |
| Offline | Polite | "You are offline" and "Back online" |
| Copy link | Polite | "Link copied" |

Further rules:
- `aria-busy="true"` on loading regions with a visually hidden "Loading <name>" status.
- The timer face is `role="timer"` with `aria-live="off"`. Reason: the per-second change must not be announced (NFR-044).
- Navigation uses `aria-current="page"` on the active item. Sortable table headers use `aria-sort`.
- Progress bars (onboarding, export, review, XP) carry `role="progressbar"` with value text and an accessible name.
- Arc: `role="img"` with a label from real data, for example "Daily goal: 95 of 120 minutes, 79 percent" (example values). The state "Goal met" is also visible text.
- Interval-end permission prompt only after the explicit "Enable alerts" link (EC-024). Notifications blocked: persistent in-app region still announces.
- Auto-closed session notice (EC-001) is a text panel on load, not a toast.
- Offline mode shows a persistent banner under the page header (EC-028).

## 5. Color contrast

- All contrast values are in COLOR-TYPOGRAPHY.md for light and dark themes; this file does not repeat them. Reason: one place to change a value keeps the docs consistent.
- Text on images: none. The product has no photographic or illustrated backgrounds.
- Disabled controls are exempt from 1.4.3 but keep a legible label and `cursor: not-allowed`.
- Links inside text are underlined and use the `primary` token; hover adds a lightness change, not only a hue change.
- Non-text 3:1: control outlines use `border-strong`; focus ring uses `focus`; Arc fill uses `primary` or `accent-strong` against the track; heatmap cells carry a `border-strong` outline.
- Heatmap: the minute number is printed in every cell; legend lists the four ranges (0, 1 to 59, 60 to 119, 120+) as text (FR-060). Bucket text meets 4.5:1 per the COLOR-TYPOGRAPHY.md table.
- Charts: series separated by 2 px surface-colored gaps, patterns (hatch for planned) and labels, never color alone.
- Subject colors appear only as a dot or bar beside the printed name; they carry no meaning alone.
- Status chips always have text; semantic hues are limited to neutral, primary-soft, accent-soft and error-soft.
- Both themes are checked; dark theme uses lighter surfaces plus 1 px border instead of shadows.

## 6. Forms

- Visible label above every field. Placeholders never replace labels.
- Required is the default; only optional fields are marked "(optional)" (3.3.2).
- Instructions and formats are linked via `aria-describedby`: password length, date range limits, allowed ranges.
- Validation on blur, not while typing the first time. After a failed submit, inline validation updates as the user corrects.
- Errors: text under the field with an icon, `aria-invalid="true"`, and a summary at the top when the form has 4 or more fields; focus moves to the summary; each link focuses its field.
- Error text states what happened and the fix, for example "Goal must be between 5 and 1440 minutes" (`goal_out_of_range`).
- Autocomplete tokens: name, email, new-password, current-password; timezone combobox prefilled from the browser (FR-001).
- Confirmation for destructive actions: confirm dialog naming the object; primary button repeats the verb. Account deletion: re-authentication plus typing DELETE (FR-007). Group dissolve: type the group name.
- Time limits: none. The log-in lock message shows remaining time as text that updates on submit only.
- Double-submit guard: button disabled and `aria-busy` while pending, label unchanged (NFR-053).
- Native date and time inputs for best support. Number fields use numeric input mode.
- Unsaved input kept on failure and in the note editor (NFR-054, FR-102).

## 7. Reduced motion and preferences

- prefers-reduced-motion: all transitions are 0 ms. Because the system already limits motion to 120 ms color and opacity changes, no information depends on motion (NFR-045).
- prefers-color-scheme drives the System theme option and follows live changes (FR-138). Reduced-motion and color scheme are read from the browser; an explicit theme choice overrides the scheme.
- prefers-contrast: not specially handled. The default palette already meets AA. Noted as a possible later enhancement, not a requirement.
- forced-colors: the focus ring falls back to the system Highlight color; borders on controls and heatmap cells remain visible because they are real borders. Listed as a verification item.
- Browser text size and zoom preferences are honored (1.4.4, 1.4.10).
- Sound: interval-end chime is a single short sound with a visible text alert; ambient audio (Phase 2) is off by default and user-started (FR-180 to FR-184).

## 8. Charts

- Each chart sits in a `figure` with a `figcaption` summary sentence and a numeric table directly below, always visible (NFR-043, FR-080 to FR-089).
- Series differ by pattern plus label plus position, not by color alone.
- Planned versus actual: planned is outlined with diagonal hatch, actual is solid; legend swatches reproduce the hatch; variance is a signed text column.
- No animation. Axes labelled with units.
- Keyboard access is through the table. Recharts tooltip keyboard support is unverified, so tooltips are a convenience only and nothing depends on them.
- The Arc and heatmap follow the same rule: the number is the accessible value.
- Statistics sections that fail to load show a section error with Retry; the table and chart fail together.

## 9. Drag-and-drop alternatives

Reference: INTERACTION-SPECIFICATIONS.md, interaction 1 (Phase 2).

| Drag action | Pointer | Keyboard | Alternative form or buttons |
|---|---|---|---|
| Create plan entry (FR-065) | Drag across empty slots | Enter on a focusable slot cell opens the popover form | Add plan entry form (FR-031) |
| Move entry (FR-066, FR-067) | Drag the block | Space or Enter picks up; arrows move 15 minutes or one day; Space drops; Esc cancels | Entry menu "Edit time" |
| Resize entry (FR-068) | Drag top or bottom edge | Shift+Up or Shift+Down enters resize; arrows change duration | Edit form duration field (5 to 480) |
| Overlap on drop (FR-069, BR-026) | Dashed outline plus label, then confirm dialog | Same dialog | Same dialog |
| Reorder subjects and topics | Drag handle | Handle is focusable | Move up and Move down in the row menu (WCAG 2.5.7) |

Rules: touch drag starts only from the 44 x 44 grip handle after a 250 ms press; scrolling elsewhere works normally. Past entries cannot be changed and announce "Past entries cannot be changed". Failure restores the original position and shows an inline error with Retry. Reason: three equivalent paths satisfy NFR-042 and 2.5.7.

## 10. Testing plan (design acceptance)

These are design acceptance checks, run after implementation in Phase 7 and later. They do not replace the NFR verification methods.

| Check | Method | Scope | Source |
|---|---|---|---|
| Automated scan | axe on every page, both themes, at 360 and 1280 px | All pages in INFORMATION-ARCHITECTURE.md route inventory | NFR-040 |
| Keyboard walkthrough | Manual, per flow: sign up, onboarding, start and stop session, post-session panel, manual session, plan entry, to-do add and complete, note edit, exam checklist, settings, export, delete account | MVP flows; Phase 2 and 3 flows when shipped | NFR-041 |
| Screen reader pass | Two readers: one desktop pairing and one mobile pairing, chosen by the team at test time | Timer announcements, forms, calendar grid, dialogs, live regions | NFR-044 |
| Grayscale and color-blindness simulation | Heatmap, priority chips, goal states, charts, subject dots | A-2, A-5, A-6, A-9, A-14 | NFR-043 |
| Zoom and reflow | 200 percent zoom and 320 CSS px width, text-spacing override | All pages | NFR-085, NFR-086 |
| Reduced motion | Set the preference, confirm no transitions | Dialogs, buttons, theme switch, skeletons | NFR-045 |
| Color scheme | Switch system scheme with System theme selected; check no flash on load | A-15, all pages | NFR-045, FR-138 |
| Touch target measurement | Measure hit areas at 360 and 768 px | All interactive elements | NFR-087 |
| Timer on a phone | Use the timer at 360 px, portrait and landscape | A-3 | NFR-088 |
| Contrast recheck | Recompute the pairs in COLOR-TYPOGRAPHY.md after any palette change | Both themes | NFR-040 |
| Forced colors | Windows high contrast mode pass | Focus ring, borders, Arc, heatmap | Verification item |
| Cross-tab announcements | Open two tabs, act in one, confirm the polite message in the other | A-3 | FR-059, NFR-044 |
| Offline | Disable network, confirm banner and timer behavior | A-3, A-11 | EC-028, NFR-054 |

Pass rule: zero critical or serious automated findings, every manual flow completes without a mouse, and no information is lost in grayscale.
