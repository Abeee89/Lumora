# Responsive Design

> Status: Proposal, pending approval. Source of truth: Phase 1 to 4 docs.

This file defines how Lumora adapts across supported widths (FR-139, NFR-085). Tokens, widths and component rules are referenced by name from DESIGN-SYSTEM.md; page IDs come from INFORMATION-ARCHITECTURE.md and PAGE-SPECIFICATIONS.md. This file contains no color values or font names.

## 1. Breakpoints and principles

| Class | Width (px) | Notes |
|---|---|---|
| Mobile | 360 to 767 | Bottom tab bar, top app bar, sheets |
| Tablet | 768 to 1023 | Icon rail, drawer menu, centered dialogs |
| Desktop | 1024 to 1535 | Fixed sidebar, two-column layouts |
| Wide | 1536 to 2560 | Extra side whitespace only; content max widths from DESIGN-SYSTEM.md apply |

Below 360 the layout degrades gracefully down to 320 CSS px so zoom reflow works, but widths under 360 are not a supported device class. Reason: NFR-085 sets the supported range at 360 to 2560.

Principles:
1. Redesign navigation and complex interactions per class instead of shrinking the desktop layout. Reason: a scaled-down calendar or table fails the 44 px target rule (NFR-087) and the 360 px no-scroll rule (NFR-086).
2. Wider screens add whitespace, not columns or density. Reason: the content max widths (forms and notes 720, lists 960, dashboard, statistics and calendar 1200) keep line lengths readable up to 2560.
3. The same content and order at every width; only the arrangement changes. Reason: users who switch devices mid-day must find the same things (FR-139).
4. Starting a session stays the first mobile task: the Dashboard puts the Timer card first on mobile. Reason: PRODUCT-VISION asks for 3 interactions or fewer, and NFR-088 requires a usable timer on a 360 px phone.

## 2. Pattern table

| Pattern | Mobile | Tablet | Desktop |
|---|---|---|---|
| Navigation | Top app bar 56 plus bottom tab bar 64 with safe area (Dashboard, Timer, Calendar, To-dos, More) | Icon rail 72 plus Menu button opening a left drawer | Fixed sidebar 256 |
| Running timer | Mini-bar 48 docked above the tab bar | Mini-bar docked at the bottom of the content area | Mini-bar inside the sidebar Timer item suffix plus the same mini-bar rules on non-timer pages |
| Page header actions | Primary action below the title, full width, 48 high; secondary actions in a "More actions" menu | Primary action right-aligned; secondary in menu | Primary action right-aligned; secondary in menu |
| Dialogs | Bottom sheet, radius 16 on top corners, max height 90 percent, sticky footer; long forms become full-height sheets | Centered dialog, sizes sm 400, md 560, lg 720 | Centered dialog, same sizes |
| Forms | Single column | Single column; field pairs such as date plus time sit side by side | Single column; field pairs side by side |
| Tables | Stacked rows ("label: value" pairs in one list item, same content and order) | Table | Table |
| Charts | Full width, 240 high, legend below | Full width, 280 high, legend below | Full width, 320 high, legend right |
| Calendar month | Grid cells 44 high with minute numbers under the date; day panel below the grid | Day panel below the grid under 900; right of the grid at 900 and up | Grid left (max 720), day panel right (360) |
| Week planner (Phase 2) | Day view as agenda list; creation through the "Add plan entry" form; drag only from the grip handle | Three-day or full week with drag | Full week with drag |
| Timer | Stacked, face first, full-width buttons | Two-column at 900 and up, single column below | Two-column: setup, face and controls (max 480) left; recent sessions and audio right |
| Dashboard order | Timer card, Goal card, Next plan, To-dos, Exams, Last 7 days | Row 1 two columns (Goal, Timer), rest single-column full-width sections | 12 columns: Goal (5) beside Timer (7); Next plan, To-dos, Exams (4 each); Last 7 days full width |
| Settings navigation | Horizontal tab list scrolling inside a labelled region | Same horizontal tab list | Vertical list, left column 220 |
| Notes editor | Edit and Preview tabs | Edit and Preview tabs | Side by side, each max 65 characters |
| Flashcard review (Phase 2) | Full screen | Full screen | Full screen |
| Group leaderboard (Phase 3) | Table stacks into a list | Table | Table |

Reason for the 900 split on Calendar and Timer: a 720 grid plus a 360 panel needs room that tablet portrait does not have, while 900 and up does.

## 3. Per-page responsive summary

Details live in PAGE-SPECIFICATIONS.md under each page ID.

| Page ID | Name | Mobile | Tablet | Desktop |
|---|---|---|---|---|
| PU-1 | Entry | One column max 560; buttons stack full width | Same column, buttons side by side | Same column |
| PU-2 | Sign up | Form panel full width, submit full width | Panel max 440, centered | Same |
| PU-3 | Log in | As PU-2 | As PU-2 | As PU-2 |
| PU-4 | Forgot password | As PU-2 | As PU-2 | As PU-2 |
| PU-5 | Reset password | As PU-2 | As PU-2 | As PU-2 |
| PU-6 | Confirm age and timezone | As PU-2 | As PU-2 | As PU-2 |
| SY-1 to SY-3 | System pages | One column, link or button full width | Centered column | Centered column |
| A-1 | Onboarding | Full screen without navigation; panel full width | Panel max 560 centered | Panel max 560 centered |
| A-2 | Dashboard | Single column, Timer card first | Two-column first row, then single column | 12-column grid |
| A-3 | Timer | Face 240; Start, Pause, Resume 56 high and Stop 48 high, full width; landscape face is the smaller of 240 and half the viewport height | Single column below 900, two-column at 900 and up; face 280 | Two-column; face 280 |
| A-4 | Sessions | Stacked rows; manual entry as full-height sheet | Table | Table max 960 |
| A-5 | Calendar | Cells 44 high; day panel below, focus moves to its heading on selection | Panel below under 900, right at 900 and up | Grid plus right panel |
| A-6 | Plan list | Stacked rows; entry dialog as full-height sheet | Table-like grouped list | Grouped list max 960 |
| A-7 | Subjects | Meta under the name; Move up and Move down in row menu | Row layout | Row layout |
| A-8 | Subject details | Single column | Single column | Two columns (topics 8, side column 4) |
| A-9 | To-dos | Quick-add shows title only; subject and due date behind "More fields" | All quick-add fields inline | All quick-add fields inline |
| A-10 | Notes | Grouped list, stacked meta | Grouped list | Grouped list max 960 |
| A-11 | Note editor | Edit and Preview tabs | Edit and Preview tabs | Side by side |
| A-12 | Exams | Stacked rows | Table | Table |
| A-13 | Exam details | Single column | Single column | Single column max 720 |
| A-14 | Statistics | Charts 240 high; range control becomes a select plus date inputs; tables stack | Charts 280 high; tables as tables | Charts 320 high; legend right |
| A-15 | Settings | Scrolling tab list | Scrolling tab list | Left list 220 plus form panel |
| B-1 | Calendar week (Phase 2) | Day agenda | Three-day or week | Full week |
| B-2 | Flashcards (Phase 2) | Stacked rows | Table | Table |
| B-3 | Flashcard review (Phase 2) | Full screen; rating buttons stacked, 56 high | Full screen; rating buttons in a row | Full screen; rating buttons in a row |
| B-4 | Settings notifications (Phase 2) | As A-15 | As A-15 | As A-15 |
| C-1, C-2 | Generate schedule and preview (Phase 3) | Single column; sticky action bar above the tab bar | Single column | Single column max 720 form; preview max 960 |
| C-3 | Groups (Phase 3) | Stacked rows | Table | Table |
| C-4 | Group details (Phase 3) | Leaderboard as list | Table | Table |
| C-5 | Join group (Phase 3) | Centered panel full width | Panel max 440 | Panel max 440 |
| C-6, C-7 | AI consent, API keys (Phase 3) | As A-15; key list stacks | As A-15 | As A-15 |

## 4. Touch rules

- Interactive targets are at least 44 x 44 at widths under 1024 and for coarse pointers (NFR-087); 40 high controls are allowed only for fine pointers on desktop. Reason: NFR-087 and WCAG 2.5.8.
- Adjacent targets keep at least 8 px between them. Reason: prevents mis-taps in dense rows such as the to-do row and the calendar grid.
- No hover-only controls; row action menus are always visible. Reason: touch has no hover.
- No gesture-only actions: every drag or swipe has a button path (Move up and Move down, "Edit time" form, grip handle plus form for the week planner) (NFR-042).
- Bottom tab bar respects the safe-area inset; sheets and primary actions sit in the lower reach of the screen so one thumb can use them. Reason: NFR-088 asks for a fully usable phone timer.
- Sticky action bars and the mini-bar never cover a focused field: scroll padding reserves space above and below (values in ACCESSIBILITY.md, criterion 2.4.11).
- Drag from the grip handle starts after a 250 ms press so normal scrolling is not captured (INTERACTION-SPECIFICATIONS.md, calendar drag-and-drop).

## 5. Input rules

- Minute and count fields use a numeric input mode. Reason: opens the numeric keypad on phones (FR-057, FR-070).
- Date and time fields use native date and time inputs. Reason: best screen reader and mobile support.
- Inputs carry the correct `autocomplete` token (name, email, new-password, current-password).
- Input text is at least 16 px at every width. Reason: smaller text makes iOS Safari zoom the page on focus.
- Password fields allow paste and offer show and hide.

## 6. Orientation

Orientation is not locked (WCAG 1.3.4). Landscape phone rules for the timer: the face size is the smaller of 240 and half the viewport height, the controls sit beside the face instead of below it when width allows, and the tab bar stays visible. Reason: a landscape phone has about 360 px of height, and the Start and Pause buttons must remain reachable without scrolling (NFR-088).

## 7. Zoom and text size

- The layout works at 200 percent browser zoom and reflows at 320 CSS px (400 percent of a 1280 viewport) without two-dimensional scrolling. Data tables are the only exempt content, and the preferred pattern is still stacked rows.
- Text-spacing overrides (line height 1.5, paragraph spacing 2x, letter spacing 0.12 em, word spacing 0.16 em) do not clip or overlap content: containers grow in height, no fixed-height text boxes.
- Text sizes use relative units so a user's browser font size setting is honored. Reason: WCAG 1.4.4 and 1.4.12.

## 8. Viewport

The viewport meta tag must not disable pinch zoom or set a maximum scale. Reason: WCAG 1.4.4 and 1.4.10.

## 9. Verification matrix

Widths from NFR-085. Every check runs on all MVP pages in both themes.

| Check | 360 | 768 | 1280 | 2560 |
|---|---|---|---|---|
| No horizontal page scroll (NFR-086) | Required | Required | Required | Required |
| Navigation form matches section 2 | Tab bar | Rail plus drawer | Sidebar | Sidebar |
| Targets at least 44 x 44 (NFR-087) | Required | Required | Fine-pointer 40 allowed | Fine-pointer 40 allowed |
| Timer start, pause, resume, stop usable (NFR-088) | Required, portrait and landscape | Required | Required | Required |
| Dialogs: sheet or centered as specified | Sheet | Centered | Centered | Centered |
| Tables: stacked or tabular as specified | Stacked | Table | Table | Table |
| Charts at specified height, table visible | 240 | 280 | 320 | 320, content capped at max width |
| Content stays within max width, centered | Not applicable | Not applicable | Required | Required |
| Focus never hidden under sticky bars | Required | Required | Required | Required |
| 200 percent zoom and 320 reflow | Required | Not applicable | Required | Not applicable |

## 10. Performance guardrails tied to layout

- Charts and skeletons reserve their final dimensions so content does not shift while loading. Reason: layout shift hurts the 2.5 s LCP budget feel and breaks focus position (NFR-001).
- Statistics chart components load lazily (TECHNOLOGY-DECISIONS.md). Reason: keeps the first load of other pages small on mobile networks (NFR-001).
- The Dashboard LCP element is the Goal card heading or arc text, rendered on the server, with no image and no hero asset. Reason: nothing to download means the element paints with the document (NFR-001).
- No decorative images, so no responsive image set is needed.
