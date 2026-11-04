# Lumora Design System

> Status: Proposal, pending approval. Source of truth: Phase 1 to 4 docs.

This file defines foundations and components. It references color and type tokens by name only; values live in COLOR-TYPOGRAPHY.md. Page layouts are in PAGE-SPECIFICATIONS.md, navigation components in NAVIGATION-STRUCTURE.md, and the build list in COMPONENT-INVENTORY.md.

Design Read: authenticated study-planning web app, calm, text-forward, low chrome. Dials: ENERGY 1, RHYTHM 2, MOTION 1.

## 1. Foundations

### 1.1 Spacing (4 px base)

| Token | px |
|---|---|
| space-0 | 0 |
| space-1 | 4 |
| space-2 | 8 |
| space-3 | 12 |
| space-4 | 16 |
| space-5 | 20 |
| space-6 | 24 |
| space-8 | 32 |
| space-10 | 40 |
| space-12 | 48 |
| space-16 | 64 |

| Usage | Value |
|---|---|
| Control inner padding | 12 x 8 or 16 x 8 |
| Card padding | 16 (mobile), 24 (desktop) |
| Gap between related fields | 12 |
| Gap between sections | 32 |
| Page gutter | 16 (mobile), 24 (tablet), 32 (desktop) |

Reason: tight spacing inside groups and loose spacing between groups gives the pages rhythm without decoration.

### 1.2 Content max widths

| Content | Max width (px) |
|---|---|
| Forms and notes | 720 |
| Lists | 960 |
| Dashboard, Statistics, Calendar | 1200 |

Wider screens (up to 2560, NFR-085) add side whitespace, not more columns. Reason: line length and scan distance stay constant at every supported width.

### 1.3 Radius

| Token | px | Used for |
|---|---|---|
| radius-sm | 4 | checkbox, chip |
| radius-md | 8 | button, input, menu item |
| radius-lg | 12 | card, dialog, popover |
| radius-xl | 16 | bottom sheet top corners |
| radius-full | full | avatar, switch, arc caps |

Reason: no pill buttons or pill cards; full rounding is reserved for objects that are round by nature.

### 1.4 Elevation

| Level | Used for | Light theme | Dark theme |
|---|---|---|---|
| 0 flat | cards, list containers, form panels | 1 px `border` token, no shadow | 1 px `border` token, no shadow |
| 1 | popover, menu, toast | offset y 4, blur 12, ink at 12 percent | `raised` surface plus 1 px `border` |
| 2 | dialog, sheet | offset y 12, blur 32, ink at 20 percent, scrim at 50 percent | `raised` surface plus 1 px `border`, scrim at 50 percent |

Reason: elevation marks overlap with content, it is never decoration. Dark theme has no shadows because they are invisible on dark surfaces.

### 1.5 Z-order

| Layer | Value |
|---|---|
| base | 0 |
| sticky header | 10 |
| navigation | 20 |
| popover and menu | 30 |
| scrim | 40 |
| dialog | 50 |
| toast | 60 |

### 1.6 Focus

- Ring: 2 px solid `focus` token, offset 2 px, on every focusable element via keyboard focus (focus-visible). Never removed (NFR-040, NFR-041).
- Filled components keep the 2 px gap so the ring contrasts with both the fill and the page.
- Mouse clicks do not show the ring; keyboard and programmatic focus from keyboard do.

Reason: a gapped ring stays visible on filled buttons in both themes.

### 1.7 Hit targets

- 44 x 44 minimum for all interactive elements below 1024 px and for coarse pointers (NFR-087).
- 40 high controls are allowed on fine-pointer desktop (above the 24 px WCAG 2.5.8 floor).
- Icon-only buttons always have a 44 x 44 hit area, even when the glyph is 20 px.
- Adjacent targets keep at least 8 px between hit areas.

Reason: the 44 px rule is a binding requirement (NFR-087) and the timer must be usable on a 360 px phone (NFR-088).

### 1.8 Motion

| Rule | Value |
|---|---|
| Durations | 0 or 120 ms |
| Properties | color, background, opacity only |
| Dialogs and sheets | fade in 120 ms, no translate |
| Skeletons | static, no shimmer |
| Charts | animation off |
| Arc | updates instantly, no sweep |
| prefers-reduced-motion | every transition 0 ms (NFR-045) |

Reason: MOTION 1; the only motion allowed is a short state change, and no rule depends on animation to convey meaning.

### 1.9 Iconography

- Library: Phosphor. Regular weight by default. Fill weight for: the active nav item, a checked checkbox glyph, a completed topic, a running timer.
- Sizes: 16 inline, 20 in controls, 24 in navigation, 32 in empty states.
- Decorative icons are `aria-hidden`. Icon-only buttons have an accessible name (visible tooltip only on the tablet rail and truncated names).
- Components accept any icon as a child, so one library serves the whole product.
- Forbidden icons: sparkle, star, magic wand, lightning, robot, diamond. Reason: these are generic AI-product signals and carry no Lumora meaning.
- Reason for Fill on active states: the weight change gives a state cue that is not color (NFR-043).

Concept to Phosphor icon name:

| Concept | Icon | Concept | Icon |
|---|---|---|---|
| Dashboard | House | Statistics | ChartBar |
| Timer | Timer | Sessions | ClockCounterClockwise |
| Calendar | CalendarBlank | Settings | Gear |
| Plan list | ListBullets | Flashcards | Cards |
| To-dos | CheckSquare | Groups | UsersThree |
| Subjects | Books | API keys | Key |
| Notes | Notebook | Start | Play |
| Exams | Exam | Pause | Pause |
| Stop | Stop | Add | Plus |
| Edit | PencilSimple | Delete | Trash |
| Archive | Archive | Restore | ArrowCounterClockwise |
| Close | X | Menu | List |
| More | DotsThree | Drag handle | DotsSixVertical |
| Warning | Warning | Error | WarningCircle |
| Success | CheckCircle | Info | Info |
| Export | DownloadSimple | Theme | Sun and Moon |
| Notifications | Bell | Sound | SpeakerHigh |
| Priority High | CaretDoubleUp | Priority Medium | Equals |
| Priority Low | CaretDown | Generate schedule | CalendarPlus |

Individual icon names are unverified against `@phosphor-icons/react`. The implementer confirms each; if one is missing, use the closest same-concept icon and record it in COMPONENT-INVENTORY.md.

## 2. Components

State vocabulary used below: default, hover, active (pressed), focus, disabled, loading, error. Only states that apply are listed.

### 2.1 Button

**Anatomy:** optional leading icon (20), label (`label` style), optional trailing icon.

**Variants:**

| Variant | Appearance | Use |
|---|---|---|
| primary | `primary` fill, `on-primary` text | one per view, the main action |
| secondary | `surface` fill, `border-strong` outline | alternative actions |
| ghost | no outline, `ink-2` text | tertiary, toolbar |
| destructive | `error` fill, white text | only inside confirm dialogs |
| link | inline text, underlined, `primary` color | navigation in prose |

**Sizes:** md 40 high (44 on touch), lg 48, timer-primary 56 high and at least 160 wide.

**States:**
- Hover: background darkens one step (`primary-hover`); active darkens two. Hover also changes background lightness, never hue alone.
- Focus: ring per section 1.6.
- Loading: a spinner replaces the leading icon, width stays fixed, `aria-busy="true"`, label remains. The button is disabled against double activation (NFR-053).
- Disabled: label stays legible, cursor not-allowed. A disabled primary action always has helper text nearby saying what is missing (for example "Choose a subject to start").

**Keyboard:** Enter and Space activate. Link variant activates with Enter.

**A11y:** native `button` or `a` element; links that navigate are links, actions are buttons. Name equals visible label (WCAG 2.5.3).

**Content rules:** verb plus object, sentence case: "Save note", "Add task", "Start session", "Add to my plan". Banned labels: Get Started, Learn More, Try Now, Explore, Discover.

Reason: verb plus object tells the user what will happen before they click.

### 2.2 Input family

**Common anatomy:** label above (always visible), control, helper text below, error text below with icon. Height 40 (44 touch), 1 px `border-strong`, radius 8, 16 px minimum font size.

**Common states:** default; hover (outline stays, background `surface`); focus (ring); disabled (`sunken` background, label legible); error (`error` outline 2 px, icon plus message under the field, `aria-invalid="true"`, message linked by `aria-describedby`); loading (only combobox, while options load, with "Loading" text in the list).

**Common rules:** required is the default, so only optional fields get "(optional)" in the label. Placeholders never replace labels and use `muted`. Validation runs on blur, not while typing the first time. Typed input is preserved on failure (WCAG 3.3.7, FR-197).

| Control | Notes |
|---|---|
| Text | `autocomplete` token where one exists |
| Textarea | min 3 rows, vertical resize, character count shown only near a limit |
| Number | `inputmode` numeric; allowed range stated in helper text and in the out-of-range message |
| Select | native for short lists; Radix select for subject lists so the subject dot can show next to the name |
| Combobox | subject, topic, timezone; ARIA 1.2 combobox pattern with listbox popup; type to filter; arrow keys move, Enter selects, Esc closes and keeps typed text |
| Date | native date input (Reason: best screen reader and mobile support, avoids a custom calendar widget burden) |
| Time | native time input |
| Checkbox | 24 box visual in a 44 hit area, radius 4; checked shows Fill check glyph |
| Radio group | `fieldset` plus `legend`; arrow keys move selection; rows with visible text, not decorative cards |
| Switch | 44 hit area, state text "On" or "Off" next to it so state is not color or position alone (NFR-043) |
| Segmented control | Pomodoro or Stopwatch, list or month; radio semantics, arrow keys; selected segment has `primary-soft` background, weight 600 and Fill icon where an icon exists |
| Slider (Phase 2) | ambient volume (FR-180 to FR-184); arrow keys 1 step, PageUp and PageDown 10 steps; numeric value shown as text |
| Swatch radio group | subject color (FR-010); radio group where each option is a swatch plus its visible name; selected has a check glyph and 2 px ring |

**Keyboard:** native behavior for native controls; combobox, segmented control, radio group and slider as described.

**A11y:** every control has a programmatic label; groups have a legend; error text announced through `aria-describedby` and, on submit, the error summary (section 2.17).

**Content rules:** labels are nouns ("Subject", "Daily goal in minutes"); helper text states a range or a consequence; error text says what happened and what to do ("Enter a task title").

### 2.3 Card kinds

| Kind | Structure | Used for |
|---|---|---|
| Stat card | h2 or h3 title, arc or large number, one supporting line | Dashboard goal, exam countdown |
| List container | header row, rows separated by 1 px `border`, no per-row card | to-dos, sessions, plan entries |
| Form panel | heading, fields, action row at the bottom | settings, sign-up, dialogs content |

Common: 1 px `border` token, radius 12, `surface` fill, no shadow, no nesting of cards. Sizes differ by importance on the Dashboard (goal and timer cards are widest). Each card is a `section` with a heading.

Reason: three structurally different cards, not one repeated box (R-14).

### 2.4 Chips

Only functional status chips: 24 high, radius 4, required text label, optional 16 px icon. Never uppercase, never a dot alone.

| Chip | Tone |
|---|---|
| Priority High, Medium, Low | neutral, with priority icon |
| Overdue | `accent-soft` with Warning icon |
| Due today | neutral |
| Manual | neutral |
| Auto-closed | `accent-soft` |
| Archived | neutral |
| Missed | `accent-soft` |
| Done | `primary-soft` with check icon |
| Upcoming | neutral |
| Today (exam) | neutral |
| Proposed (Phase 3 preview) | neutral |

Tones: neutral (`sunken` plus `ink-2`), `primary-soft` (done, success), `accent-soft` (warning), `error-soft` (blocking error only). Chips are not interactive; filters use selects. Reason: a chip that looks clickable but is not breaks expectation.

### 2.5 Dialog

**Anatomy:** header (h2) with Close button, body, footer with right-aligned buttons, primary last.

**Sizes:** sm 400, md 560, lg 720; radius 12; level 2 elevation with scrim.

**Behavior (Radix Dialog):**
- Focus moves to the first field, or the heading when there is no field. Focus returns to the trigger on close. Focus is trapped. `aria-modal`.
- Esc closes. Overlay click closes only dialogs that are non-destructive and have no form.
- Under 768 px dialogs become bottom sheets: top radius 16, max height 90 percent, internal scroll, sticky footer. Long forms (plan entry, manual session) become full-height sheets.
- Destructive confirmation names the object ("Delete task 'Read chapter 4'?") and the primary button repeats the verb ("Delete task"). Typing a name is required only for dissolving a group and deleting an account (FR-210, FR-007).

**States:** loading on the primary button; error as inline error text above the footer.

**A11y:** title via `aria-labelledby`; destructive default focus is on the safe button, not the destructive one (WCAG 3.3.4).

Reason: naming the object and repeating the verb prevents confirming the wrong action.

### 2.6 Menus and dropdowns

Radix DropdownMenu, Popover, Select. Item radius 8, item height 40 (44 touch), level 1 elevation.

- Keyboard: Arrow keys move, Home and End jump, type-ahead, Enter or Space activates, Esc closes and returns focus to the trigger.
- Destructive item last, separated by a divider and with the destructive icon.
- Row action menu: a "More actions for <row title>" button (DotsThree), always visible, never hover-only.
- Disabled items stay visible with a text reason when it helps ("Read only").

Reason: hover-only controls fail touch and keyboard users (NFR-041, NFR-087).

### 2.7 Navigation components

Sidebar, icon rail, bottom tab bar, More sheet, mini-bar, page header, tabs, breadcrumbs: specified in NAVIGATION-STRUCTURE.md. Page header and tabs rules are in sections 2.13 and 2.14 below.

### 2.8 Table

- Semantic `table` with `caption`, `th scope` headers. Header row on `sunken`; row height 48; 1 px row dividers; numeric columns right-aligned with tabular numerals; sticky header allowed.
- Sortable columns use a button inside the header with `aria-sort`; sort state also shown by an arrow icon (not color).
- Under 768 px tables become stacked rows: each record is one list item with "label: value" pairs in the same order and with the same content. Semantics switch to a list with a heading per item.
- Statistics numeric tables may scroll horizontally inside a labelled region only as a last resort (WCAG 1.4.10 exempts data tables); stacked rows are preferred.
- States: loading uses LOAD-LIST skeleton rows (PAGE-SPECIFICATIONS.md); empty uses the empty state; error uses the section error.

Reason: the same content in every layout means nothing is hidden on mobile (NFR-086).

### 2.9 Toast

Radix Toast via shadcn. Bottom-right on desktop; bottom-center above the tab bar or mini-bar on mobile; maximum 3 visible.

| Kind | Role | Dismissal |
|---|---|---|
| Success, info | `role="status"` | auto-dismiss after 6 s, paused on hover and focus |
| Error | `role="alert"` | persists until dismissed, carries Retry |

Every toast has an accessible Close button. A toast is never the only place a result is shown: the changed UI state or an inline indicator also shows it (WCAG 2.2.1). Toasts are never used for timer state or for rewards.

Reason: transient messages are missed by many users, so the durable state must carry the result.

### 2.10 Empty state

32 px icon in `muted`, h3 title, one sentence, one primary action (a secondary link is allowed). No illustration. Copy is per page in PAGE-SPECIFICATIONS.md. Where no data exists the UI shows this state, never a placeholder figure (honest numbers principle).

### 2.11 Loading state

- Static skeleton blocks with the same dimensions as the final content, so nothing shifts when data arrives. Lists show 5 rows; cards show 1 block each.
- Loading region: `aria-busy="true"` plus a visually hidden "Loading <name>" status.
- Spinners only inside buttons and for the AI request progress (Phase 3).
- Timer actions show a pending state within 200 ms (NFR-004).
- A skeleton is never used as a product screenshot.

### 2.12 Error state

| Level | Presentation |
|---|---|
| 1 Field | text under the field, `aria-invalid`, icon plus message |
| 2 Section | bordered `error-soft` panel in place of the content: message from the error catalog, Retry button, request ID in caption text |
| 3 Page | full content-area panel with h1 retained, message, Retry, link to Dashboard |

Specific cases:
- Stale version (EC-020): panel "This changed in another tab or device" with a Reload button.
- Offline (EC-028): persistent banner under the page header, "You are offline. The timer keeps counting and will sync when you reconnect." No dialog.
- Not found, including other users' records: "We could not find that page" with a link to Dashboard.
- Unsupported browser: static notice (NFR-082).
- Errors never interrupt a running timer; the clock keeps running and the error appears inline (ERROR-HANDLING section 5).

Messages say what happened and what to do. Reason: an error without a next step leaves the user stuck.

### 2.13 Form patterns

- Single column; 12 px between fields; action row at the bottom; Enter submits.
- Submit failure with 4 or more fields shows an error summary at the top: focus moves to it, it lists links to each field.
- Inline validation on blur, never while typing for the first time.
- Typed input is preserved on failure (WCAG 3.3.7, FR-197).
- `autocomplete`: `name` for display name, `email`, `new-password`, `current-password`.
- Password fields allow paste and have a show or hide toggle (WCAG 3.3.8).
- Double-submit guard: the button is disabled while pending (NFR-053).
- Forms with explicit save show an inline "Saved" status after success.

### 2.14 Page header, tabs, tooltips

**Page header:** h1, optional one-line description, primary action right-aligned. Under 768 px the primary action sits below the title, full width, 48 high. Secondary actions collapse into a "More actions" menu.

**Tabs and segmented controls:** Radix Tabs, arrow keys move, roving tabindex, active tab shown by underline plus weight 600 (not color only). Tab panels are labelled by their tab.

**Tooltips:** only for icon-only navigation on the tablet rail and truncated names. Dismissible with Esc, hoverable, persistent while focused (WCAG 1.4.13). Never the sole carrier of information.

## 3. Cross-component rules

| Rule | Detail | Source |
|---|---|---|
| Color never alone | every color state also has text and a shape or icon change | NFR-043 |
| Keyboard | every control reachable and operable; no traps | NFR-041 |
| Drag alternative | every drag has a button path | NFR-042 |
| Reduced motion | all transitions 0 ms | NFR-045 |
| Widths | designed for 360 to 2560, no horizontal scroll at 360 | NFR-085, NFR-086 |
| Targets | 44 px below 1024 | NFR-087 |
| Pending feedback | within 200 ms for timer actions | NFR-004 |
| Unsaved input | preserved on failure | NFR-054 |
| Sentence case | no uppercase labels, no exclamation marks, no emoji | copy rules |
