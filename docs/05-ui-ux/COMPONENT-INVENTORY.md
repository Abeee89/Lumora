# Component Inventory

> Status: Proposal, pending approval. Source of truth: Phase 1 to 4 docs.

This file lists every UI component the design needs, so Phase 7 can plan the build. Behavior and anatomy live in DESIGN-SYSTEM.md; token values live in COLOR-TYPOGRAPHY.md. This file only names tokens, never values. Page IDs refer to the route inventory in INFORMATION-ARCHITECTURE.md.

Reason: one inventory with a source column separates "add from shadcn/ui" work from custom work, which is the planning question Phase 7 has to answer (ADR-001).

## How to read the table

- **Source**: shadcn/Radix means add the shadcn/ui component, which wraps a Radix primitive. Native means a plain browser element with project styling. Custom means built in this project. Recharts and dnd-kit are the libraries fixed by ADR-001.
- **Build**: "shadcn add" or "custom". Native elements styled with tokens are "custom (native)".
- **Tokens consumed**: names from the token tables (color, spacing, radius, elevation, type, motion). Every component also consumes the focus token and the motion rule (0 or 120 ms, color and opacity only).
- **Phase**: MVP, Phase 2 or Phase 3, matching the phase split in the requirements (NFR-040 applies to all).
- Pages named "all app pages" means A-1 to A-15 unless stated.

## Icon name verification

Individual Phosphor icon names in the DESIGN-SYSTEM.md mapping are unverified against `@phosphor-icons/react`. If a name does not exist, use the closest same-concept icon and record the substitution in the table below.

| Concept | Planned Phosphor name | Substitution used |
|---|---|---|
| (none recorded yet) | Confirm during Phase 7 | Record here |

Reason: the plan could not verify each name, so the substitution log lives next to the components that use the icons.

## Inputs and form controls

| Component | Source | Variants | Pages | Phase | A11y notes | Tokens consumed | Build |
|---|---|---|---|---|---|---|---|
| Button | shadcn/Radix (Button) | primary, secondary, ghost, destructive (confirm dialogs only), link; sizes md, lg, timer-primary | all pages | MVP | Visible text label, verb plus object; loading keeps label and sets busy state; 44 px hit area on touch (NFR-087) | primary, primary-hover, on-primary, surface, border-strong, ink-2, error, radius 8, label type, spacing 12 and 8 | shadcn add |
| IconButton | shadcn/Radix (Button, icon size) | ghost, secondary; always 44 x 44 hit area | A-4 to A-13 row menus, mini-bar, header, dialogs | MVP | Accessible name required on every instance; decorative glyph hidden from assistive tech | ink-2, surface, radius 8, icon size 20 | shadcn add |
| Input | shadcn/Radix (Input) | text, email, password with show/hide toggle | PU-2 to PU-5, A-1, A-4 to A-15 | MVP | Visible label above, helper and error text linked to the field, invalid state with icon and message (NFR-043), paste allowed | surface, border-strong, ink, muted (placeholder), error, radius 8, body type | shadcn add |
| Textarea | shadcn/Radix (Textarea) | default, note body (16/26) | A-3 post-session note, A-11, A-4 | MVP | Labelled, character count as text where limited | surface, border-strong, ink, radius 8, note-body type | shadcn add |
| NumberField | Native number input with Input styling | minutes, hours, count | A-1, A-2 goal dialog, A-3 duration dialog, A-4, A-6, A-15 | MVP | Numeric input mode, allowed range stated in the label or error message, no spinner-only entry | surface, border-strong, error, radius 8, tabular numerals | custom (native) |
| Select | shadcn/Radix (Select) plus native select | native for short lists, Radix with subject color dot for subject lists | A-4, A-6, A-8, A-9, A-14 | MVP | Arrow keys and type-ahead; status values always shown as text | surface, border-strong, radius 8, 12 px dot from subject palette | shadcn add |
| Combobox | shadcn/Radix (Popover plus Command) | subject, topic, timezone | PU-2, PU-6, A-1, A-2, A-3, A-4, A-6, A-9, A-11, A-15 | MVP | ARIA 1.2 combobox pattern, results announced, Esc closes and returns focus | surface, raised, border-strong, radius 8 and 12, elevation level 1 | shadcn add |
| DateInput | Native date input | single date, range pair | A-4, A-6, A-9, A-12, A-14 | MVP | Native picker for screen reader and mobile support; format hint in helper text | surface, border-strong, radius 8 | custom (native) |
| TimeInput | Native time input | start, end | A-4, A-6, B-1 form path, B-4, C-1 | MVP | Native picker; always paired with a label | surface, border-strong, radius 8 | custom (native) |
| Checkbox | shadcn/Radix (Checkbox) | default, indeterminate | A-9, A-13, A-1, PU-2 | MVP | Fill-weight check glyph is the non-color cue; label clickable; 44 px hit area (NFR-043, NFR-087) | border-strong, primary, on-primary, radius 4 | shadcn add |
| RadioGroup | shadcn/Radix (RadioGroup) | plain rows, with description | A-1 goal choice, A-15 theme, C-7 scope | MVP | Arrow-key navigation, group label, selected state also shown by filled indicator | border-strong, primary, surface | shadcn add |
| Switch | shadcn/Radix (Switch) | default | B-4, C-4 share switch, flashcard shortcuts | Phase 2 (B-4), Phase 3 (C-4) | On and Off text beside the control, so state is not color alone | primary, border-strong, radius full | shadcn add |
| SegmentedControl | shadcn/Radix (ToggleGroup, single) | Pomodoro/Stopwatch, Daily/Weekly/Monthly | A-2, A-3, A-14 | MVP | Roving tabindex, selected shown by weight and background, not hue (NFR-043) | primary-soft, on-primary-soft, border-strong, radius 8 | shadcn add |
| SwatchPicker | Custom on Radix RadioGroup | 10 subject colors | A-1, A-7 add dialog, A-8 edit | MVP | Radio group, swatch plus visible color name, selected state has check glyph (FR-010) | subject palette 1 to 10, border-strong, radius 4 | custom |
| Slider | shadcn/Radix (Slider) | ambient volume | A-3 audio panel | Phase 2 | Arrow-key steps, value shown as text (FR-180 to FR-184 range) | primary, sunken, border-strong | shadcn add |
| Label and FieldMessage | shadcn/Radix (Label) plus custom message | label, helper, error, optional marker | all forms | MVP | Labels always visible, error text with icon and `aria-invalid` link, "(optional)" only on optional fields | ink, muted, error, label type, caption type | shadcn add (Label), custom (message) |
| ErrorSummary | Custom | form-level summary | PU-2, A-4 manual entry, A-6 plan entry, A-15 forms | MVP | Shown with four or more fields in error, receives focus, links to each field | error-soft, error, radius 8 | custom |
| TopicStatusSelect | Native select with custom styling | Not started, In progress, Done | A-3 post-session, A-8 | MVP | Text value always visible, change announced politely | surface, border-strong, primary-soft | custom (native) |
| PriorityChip and PriorityIcon | Custom (Chip plus icon) | High, Medium, Low | A-2, A-9, A-6 | MVP | Text plus distinct icon for each level, never color alone (NFR-043) | neutral chip tokens, accent-soft for High emphasis, 16 px icon | custom |

## Display and content

| Component | Source | Variants | Pages | Phase | A11y notes | Tokens consumed | Build |
|---|---|---|---|---|---|---|---|
| Card (3 kinds) | shadcn/Radix (Card) adapted | stat card, list container, form panel | A-2, A-8, A-12, A-14, A-15, PU-2 to PU-6 | MVP | `section` with h2 or h3, no nested cards | surface, border, radius 12, spacing 16 and 24 | shadcn add |
| Chip | Custom | neutral, primary-soft, accent-soft, error-soft; with optional 16 px icon | A-2, A-4, A-5, A-6, A-9, A-12, A-13, C-4, C-7, C-2 | MVP | Text label required, never uppercase, never dot-only | sunken, ink-2, primary-soft, on-primary-soft, accent-soft, on-accent-soft, error-soft, radius 4, caption type | custom |
| SubjectDot | Custom | 12 px dot, 4 px bar | A-2, A-3, A-4, A-6 to A-10, A-12 to A-14 | MVP | Decorative, subject name always printed beside it (FR-010) | subject palette 1 to 10 | custom |
| Arc | Custom SVG | daily goal, Pomodoro interval, exam coverage; goal-met state | A-2, A-3, A-13 | MVP (goal, interval), Phase 2 (coverage) | Image role with a label built from real values; number inside is the accessible value; goal met also shown by text and check icon (FR-072, FR-050, FR-126) | border (track), primary, accent-strong, stat and timer-display type, 10 px stroke, round caps | custom |
| ProgressBar | shadcn/Radix (Progress) | labelled, with value text | A-1, A-15 export, B-3, Dashboard XP strip | MVP | Progress role with value text, status text beside the bar | sunken, primary, radius 4 | shadcn add |
| EmptyState | Custom | per page copy, one action | all list pages | MVP | h3 title, one sentence, one primary action, 32 px icon hidden from assistive tech | muted, h3 type, body type, spacing 24 | custom |
| Skeleton | shadcn/Radix (Skeleton), static | list rows, card, chart, grid cells | all data pages | MVP | Parent region marked busy with hidden "Loading" status; no animation (MOTION 1) | sunken, radius 8 | shadcn add |
| InlineError | Custom | field, row-level | forms, A-3, A-9 | MVP | Icon plus text, alert role only when it interrupts | error, error-soft, caption type | custom |
| SectionError | Custom | with Retry and request ID | A-2 cards, A-4, A-5, A-14 | MVP | Panel replaces content, Retry is a button, request ID as caption text (ERROR-HANDLING) | error-soft, error, border, radius 12 | custom |
| PageError | Custom | not found, server error, unsupported browser | SY-1, SY-2, SY-3, all pages on failure | MVP | h1 kept, link to Dashboard, focus to h1 | surface, h1 type, body type | custom |
| OfflineBanner | Custom | persistent | all app pages | MVP | Status role, text states the timer keeps counting (EC-028) | accent-soft, on-accent-soft, warning icon | custom |
| Toast | shadcn/Radix (Sonner or Toast) | success, info, error with Retry | all app pages | MVP | Status role for success, alert role for errors, pause on hover and focus, Close button, never sole result indicator | raised, border, elevation level 1, z-order toast | shadcn add |
| Tooltip | shadcn/Radix (Tooltip) | icon rail, truncated names | IconRail, A-4 to A-10 | MVP | Esc dismisses, hoverable, shown on focus, never the only carrier | raised, ink, caption type, elevation level 1 | shadcn add |
| LiveRegionAnnouncer | Custom | one polite region, one alert region | app layout | MVP | Single global instance; timer announcements without per-second count (NFR-044) | none (visually hidden) | custom |

## Overlays and menus

| Component | Source | Variants | Pages | Phase | A11y notes | Tokens consumed | Build |
|---|---|---|---|---|---|---|---|
| Dialog | shadcn/Radix (Dialog) | sm, md, lg | A-2 goal, A-3 durations, A-4, A-6, A-7, A-9, A-12, C-3, C-7 | MVP | Focus trap, focus to first field or heading, returns to trigger, Esc closes | raised, border, radius 12, elevation level 2, scrim, z-order dialog | shadcn add |
| Sheet (mobile dialog) | shadcn/Radix (Sheet or Drawer) | bottom sheet, full-height sheet, left drawer | all dialogs under 768, tablet menu drawer | MVP | Same focus rules as Dialog, sticky footer, scroll padding keeps fields visible | raised, radius 16 top, scrim, elevation level 2 | shadcn add |
| ConfirmDialog | Dialog preset | destructive, overlap warning, replace timer | A-3, A-4, A-6, A-7, A-9, A-15, C-4 | MVP | Names the object, primary button repeats the verb; typed confirmation only for account and group dissolve (FR-007, FR-210) | error (destructive button), raised, radius 12 | custom on Dialog |
| DropdownMenu | shadcn/Radix (DropdownMenu) | row actions, user menu, page More actions | A-4 to A-13, UserMenu | MVP | "More actions for <row title>" trigger always visible, arrow keys, type-ahead, destructive item last | raised, radius 8 and 12, elevation level 1, z-order menu | shadcn add |
| Popover | shadcn/Radix (Popover) | formatting help, reminder list, plan entry popover | A-11, B-1, B-4 | MVP (A-11), Phase 2 | Focus moves in and returns, Esc closes | raised, radius 12, elevation level 1 | shadcn add |
| ConflictDialog | Custom on Dialog | two-pane compare | A-11, A-15 forms, rename flows | MVP | Panes labelled "Your version" and "Saved elsewhere", differences not shown by color only (EC-020) | raised, sunken, border-strong | custom on Dialog |

## Navigation and layout

| Component | Source | Variants | Pages | Phase | A11y notes | Tokens consumed | Build |
|---|---|---|---|---|---|---|---|
| Tabs | shadcn/Radix (Tabs) | underline, scrollable in region | A-5, A-6, A-7, A-12, A-11 under 1024, Settings under 1024 | MVP | Roving tabindex, active shown by underline plus weight 600 | primary, border, label type | shadcn add |
| Breadcrumb | shadcn/Radix (Breadcrumb) | full, mobile Back link | A-8, A-11, A-13, C-4 | MVP (A-8, A-11, A-13), Phase 3 (C-4) | Navigation landmark labelled Breadcrumb, current page marked | ink-2, primary (link), body-sm type | shadcn add |
| Sidebar | shadcn/Radix (Sidebar) adapted | 256 px fixed, groups | all app pages at 1024 and up | MVP | Navigation landmark, current page marked, group headings in sentence case | surface, border, primary-soft, on-primary-soft, label type, z-order navigation | shadcn add |
| IconRail | Custom on Sidebar primitives | 72 px rail with Menu button | all app pages 768 to 1023 | MVP | Every icon has accessible name and tooltip, Menu opens drawer | surface, border, primary-soft, icon size 24 | custom |
| BottomTabBar | Custom | five items, 64 px plus safe area | all app pages under 768 | MVP | 44 px items, icon above 12 px label, current page marked | surface, border, primary, caption type, z-order navigation | custom |
| MoreSheet | Custom on Sheet | list of secondary destinations | all app pages under 768 | MVP | Opens as bottom sheet, items are links, Esc closes | raised, radius 16 top, label type | custom on Sheet |
| MiniTimerBar | Custom | running, paused; desktop, tablet, mobile placement | all app pages except A-3 | MVP | Timer role, live updates off, state changes via global region, Pause/Resume 44 x 44 (NFR-044, FR-056) | surface, border, accent (running dot), stat-sm type, primary | custom |
| PageHeader | Custom | with action, with description, mobile full-width action | A-2 to A-15 | MVP | One h1 per page, focus target on navigation | h1 type, body-sm type, muted, spacing 16 | custom |
| SkipLink | Custom | single | app and public layouts | MVP | First focusable element, visible on focus, text "Skip to main content" | primary, on-primary, z-order sticky header and above | custom |
| UserMenu | shadcn/Radix (DropdownMenu) plus Avatar | initials avatar button | app layout | MVP | Button named with display name, items Settings and Log out | primary-soft, on-primary-soft, radius full, 32 px | shadcn add |

## Data display

| Component | Source | Variants | Pages | Phase | A11y notes | Tokens consumed | Build |
|---|---|---|---|---|---|---|---|
| DataTable | shadcn/Radix (Table) | sortable, numeric columns, sticky header | A-4, A-14 tables, C-4 | MVP (A-4, A-14), Phase 3 (C-4) | Semantic table with caption and scoped headers, sort button with sort state | sunken (header), border, body-sm type, tabular numerals, row height 48 | shadcn add |
| StackedRowList | Custom | label and value pairs under 768 | A-4, A-14, C-4 | MVP | Switches to list semantics with same content and order | surface, border, body-sm type | custom |
| ChartTable | Custom | numeric table paired with each chart | A-2, A-14 | MVP | Always visible, equivalent data to the chart | same as DataTable | custom |
| Figure | Custom | figure with figcaption summary | A-2, A-14 | MVP | Summary sentence in the caption, chart not the sole data source | body-sm type, ink-2 | custom |
| Chart wrapper: Bar | Recharts | totals, single series | A-14 | MVP | Animation off, axis units labelled, data labels when space allows | primary, border (grid), caption type | custom on Recharts |
| Chart wrapper: StackedBar | Recharts | per-subject stack, manual share segment with hatch | A-2, A-14 | MVP | Subject palette with surface gaps, legend text, paired table | subject palette, surface, hatch pattern | custom on Recharts |
| Chart wrapper: PlannedActualBar | Recharts | planned hatched outline, actual solid | A-14 | MVP | Hatch reproduced in legend, signed variance column in the table | primary, border-strong, hatch pattern | custom on Recharts |
| HeatmapGrid | Custom (no chart library) | month grid, four buckets | A-5 | MVP | ARIA grid pattern, single tab stop, minutes printed in every cell, Today outlined and labelled (FR-060, NFR-043) | heatmap bucket tokens, border-strong, accent-strong (today), radius 4 | custom |
| DayDetailPanel | Custom | sessions, planned entries, empty | A-5 | MVP | Focus moves to its h2 on selection on mobile | surface, border, radius 12, status chips | custom |
| SortableList with MoveUpDown buttons | Custom; dnd-kit for drag | handle plus menu path | A-7, A-8 topics | MVP (Move up and down), Phase 2 (drag, FR-065 to FR-069 scope applies to calendar) | Move up/down buttons are the non-drag path (WCAG 2.5.7), position announced politely | surface, border, drag-handle icon, ink-2 | custom |

## Notes, timer and study components

| Component | Source | Variants | Pages | Phase | A11y notes | Tokens consumed | Build |
|---|---|---|---|---|---|---|---|
| TimerFace | Custom (uses Arc) | Pomodoro with arc, Stopwatch without arc, 280 px and 240 px | A-3, A-1 guided session | MVP | Timer role with live updates off, state text under the time, cycle indicators also readable as text (NFR-044, FR-050) | timer-display type, primary, accent (running dot), border (track) | custom |
| MarkdownEditor | Native textarea with custom toolbar-free layout | edit, side-by-side, tab mode | A-11 | MVP | Labelled "Note body", 65ch line length, Ctrl or Cmd+S saves (FR-102) | surface, border-strong, note-body type | custom |
| MarkdownPreview | Custom (server-sanitized HTML) | preview region | A-11 | MVP | Labelled region, links announced as links | surface, note-body type, primary (links) | custom |
| SaveStatus | Custom | Saved, Saving, Not saved with Retry | A-11, A-15 forms | MVP | Status role, icon plus text | muted, error, caption type | custom |
| ScheduleDraftList | Custom | grouped by date, overlap warning rows | C-2 | Phase 3 | Warning icon plus text naming the overlapped entry, entries read-only (FR-190 to FR-198 scope) | surface, border, accent-soft, "Proposed" chip | custom |

## Phase 2 and Phase 3 components

| Component | Source | Variants | Pages | Phase | A11y notes | Tokens consumed | Build |
|---|---|---|---|---|---|---|---|
| WeekGrid | Custom with dnd-kit (Pointer and Keyboard sensors) | full week, day view on mobile | B-1 | Phase 2 | Keyboard move mode, edit form path, polite announcements (NFR-042, FR-065 to FR-069) | surface, border, sunken, accent-strong (overlap outline), hatch pattern | custom |
| CalendarEntryBlock | Custom with dnd-kit | planned (solid), actual (outlined), pending | B-1 | Phase 2 | Focusable block with full label, 44 px resize handle hit area | primary-soft, border-strong, subject palette, caption type | custom |
| FlashcardPanel | Custom | front, back revealed | B-3 | Phase 2 | Focus moves to card region on each card, answer revealed by button | surface, border, stat type | custom |
| RatingButtons | Custom on Button | Again, Hard, Good, Easy | B-3 | Phase 2 | Equal size, text labels only, shortcuts 1 to 4 with off switch (WCAG 2.1.4) | secondary button tokens, 56 px height | custom on Button |
| LeaderboardTable | Custom on DataTable | with "You" row, stacked on mobile | C-4 | Phase 3 | Rank and name in text, viewer row marked in text (FR-207 scope) | sunken, border, tabular numerals | custom on DataTable |
| InviteLinkField | Custom | read-only field with Copy | C-4 | Phase 3 | Button text changes to "Link copied" and is announced politely | surface, border-strong, secondary button tokens | custom |

## Shadcn components to add (summary for Phase 7)

Button, Input, Textarea, Select, Combobox (Popover plus Command), Checkbox, RadioGroup, Switch, ToggleGroup, Slider, Label, Card, Progress, Skeleton, Toast or Sonner, Tooltip, Dialog, Sheet, DropdownMenu, Popover, Tabs, Breadcrumb, Sidebar, Avatar, Table.

Reason: these cover Radix behavior for focus, keyboard and ARIA, so only visual tokens need customizing.

## Custom builds (summary for Phase 7)

NumberField, DateInput, TimeInput, SwatchPicker, ErrorSummary, TopicStatusSelect, PriorityChip and PriorityIcon, Chip, SubjectDot, Arc, EmptyState, InlineError, SectionError, PageError, OfflineBanner, LiveRegionAnnouncer, ConfirmDialog, ConflictDialog, IconRail, BottomTabBar, MoreSheet, MiniTimerBar, PageHeader, SkipLink, StackedRowList, ChartTable, Figure, chart wrappers, HeatmapGrid, DayDetailPanel, SortableList, TimerFace, MarkdownEditor, MarkdownPreview, SaveStatus, ScheduleDraftList, WeekGrid, CalendarEntryBlock, FlashcardPanel, RatingButtons, LeaderboardTable, InviteLinkField.

Reason: these encode Lumora-specific rules (status text beside color, the Arc motif, paired chart tables) that no stock component provides.
