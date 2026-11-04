# Design Principles

> Status: Proposal, pending approval. Source of truth: Phase 1 to 4 docs.

## 1. Design Read and dials

Reading this as: authenticated study-planning web app for students and self-learners, in a calm, text-forward, low-chrome style, dial ENERGY 1 / RHYTHM 2 / MOTION 1.

| Dial | Value | Reason |
|---|---|---|
| ENERGY | 1 | The brief asks for calm, minimal, focused. |
| RHYTHM | 2 | Pages differ by content kind (list, timer, calendar), so layouts vary by page purpose, not by decoration. |
| MOTION | 1 | Motion is limited to short state transitions. |

Antislop mode for this phase: "during" (session override).

Product name is Lumora. Token values in these docs (hex, px) are specification, not code. Only COLOR-TYPOGRAPHY.md holds hex values and font names, apart from the decision register below.

## 2. Principles

1. **Honest numbers.** Planned and actual hours always appear side by side and are never merged. Manual and auto-closed entries are labelled. Where there is no data, show an empty state, never a placeholder figure.
   Reason: the product's value is trustworthy numbers (PRODUCT-VISION principle 1, BR-002, BR-010, FR-088).
2. **One focal point per screen.** Dashboard: the daily goal arc plus the start-session form. Timer: the time. Calendar: the month grid. Lists: the add row. Everything else defers.
   Reason: a single focal point keeps a calm screen readable at a glance.
3. **Start a session in 3 interactions or fewer.** The Dashboard start form preselects the last used subject and mode, so the usual case is one click.
   Reason: PRODUCT-VISION sets the three-interaction limit; friction at start loses sessions.
4. **Never color alone.** Every color state also carries text and a shape or icon change.
   Reason: NFR-043.
5. **Calm feedback.** No confetti, no reward sounds, no celebratory modals. XP, streak and goal feedback appear inline as plain text lines.
   Reason: BR-017, BR-018 and BR-022 reward effort, not game-like engagement.
6. **The server is the truth.** The UI shows a pending state within 200 ms and then reconciles with the server result. Errors never interrupt a running timer.
   Reason: NFR-004, SDD section 4, ERROR-HANDLING section 5.
7. **Forgiving by default.** Archive over delete, confirm destructive actions, keep unsaved input after a failure.
   Reason: NFR-054 and BR-029.
8. **Phase-gated surface.** Only shipped features appear in navigation. There are no "coming soon" entries. Phase 2 and 3 screens are specified but listed as gated.
   Reason: showing unavailable features misleads users (antislop R-24, R-26).
9. **Reading comfort.** Body text is 16 px; notes use a maximum line length of 65 characters.
   Reason: long-form reading of notes needs a stable measure and a size that does not trigger mobile zoom.

## 3. Identity

Lumora means light. The identity motif is **the Arc**: an open ring that always encloses a number.

- The Arc is used for exactly three bounded quantities: daily goal progress (FR-072), Pomodoro interval remaining (FR-050), and exam topic coverage (FR-126, Phase 2).
- It is never decorative.
- Typographic voice: large tabular numerals in Atkinson Hyperlegible Next.

Reason: the product's value is honest numbers, so the number is the hero and the ring is its frame.

### Accent rule

There is exactly one accent, amber, used for three meanings only:

| Meaning | Presentation |
|---|---|
| Goal met | Arc stroke turns amber, plus a check icon, plus the words "Goal met". |
| A timer running right now | Indicator dot plus the word "Running". |
| Today in the calendar | Outline plus the word "Today" in the cell label for assistive tech. |

Reason: amber reads as "lamp on" and ties to the name Lumora; limiting it to achieved or active states makes it a signal, not decoration.

## 4. Decision register

| Decision | Choice | Reason |
|---|---|---|
| Core color | Deep teal (#0E5A58 light) | Calm, high contrast with white text (8.01:1), not the blue/purple AI default (R-01). |
| Accent | Amber (#E9A514 fill, #9C6500 stroke) | Signal for achieved or active only. |
| Neutrals | Warm paper canvas (#F6F4EE), white cards | Reduces glare during long sessions, avoids sterile pure white (R-20). |
| Typeface | Atkinson Hyperlegible Next | Built for character disambiguation (1/l/I, 0/O) which matters for times and durations; variable weight 200 to 800; has tabular numerals (verified: font specimen lists tnum). Not the Inter/Geist default (R-06). |
| Icons | Phosphor, Regular weight; Fill weight for active or selected | Weight change gives a non-color state cue (NFR-043); not the Lucide default look (R-04); supported by shadcn `iconLibrary: "phosphor"` (verified in shadcn icon docs). |
| Radius | 4 / 8 / 12 / 16; full only for avatars and switches | No pill buttons or cards (R-11). |
| Shadows | Only for layers over content (popover, dialog, toast) | Elevation marks overlap, not decoration (R-12). |
| Blur and glass | None | R-10 dose cap satisfied by zero use. |
| Glow | Focus ring only | R-13. |
| Background | Flat canvas, no grid, dots or gradients | R-07, R-01. |
| Cards | Three card kinds with different structure (stat card with arc, list container, form panel); no nested cards | R-14. |
| Illustrations | None; empty states use a 32 px icon plus text | R-22. |
| Motion | Color and opacity transitions 120 ms; dialogs fade 120 ms; no translate, parallax, count-up or shimmer | MOTION 1, R-19. |
| Theme | Light, dark and system toggle | FR-138; both themes specified and contrast-checked (R-34). |
| Date and time inputs | Native date and time inputs | Best screen reader and mobile support; avoids the accessibility burden of a custom calendar widget. |
| Logo | Text wordmark "Lumora" in Atkinson 700 plus a `[LOGO]` placeholder slot (24 px) | No logo supplied (R-23). |
| Avatar | Initials in a 32 px circle on primary-soft | No photos supplied (R-23). |

## 5. Unresolved design decisions

These need owner input. The default column is what every spec in `docs/05-ui-ux/` assumes. Requirement changes are recorded here, never as edits to Phase 1 to 4 docs.

| ID | Decision needed | Recommended default used in the specs | Affects |
|---|---|---|---|
| U-D1 | App logo and icon | Text wordmark "Lumora" plus `[LOGO]` slot; no mark invented | Navigation, public pages |
| U-D2 | Brand palette (teal core, amber accent, warm paper canvas) | Approve as specified; changing the hues changes COLOR-TYPOGRAPHY only, contrast must be rechecked | COLOR-TYPOGRAPHY |
| U-D3 | Typeface Atkinson Hyperlegible Next, self-hosted | Approve; fallback is the system UI stack if payload or licensing review objects | COLOR-TYPOGRAPHY |
| U-D4 | Pomodoro auto-start of next interval and interval-end sound asset (CC0, mute option) | No auto-start; one short chime; no mute setting in the MVP because FR-055 does not define one | Timer, INTERACTION-SPECIFICATIONS |
| U-D5 | Terms of Service, Privacy Policy pages and AI consent wording (PRD U-4) | Footer links appear only when the pages exist; consent text marked "[LEGAL REVIEW PENDING]" | Entry page, AI consent |
| U-D6 | In-app help or contact channel | None in the MVP, so no help link is shown | Navigation, ACCESSIBILITY (3.2.6) |
| U-D7 | Landing page depth | Minimal entry page (PU-1); no marketing sections | PU-1 |
| U-D8 | Extra routes beyond SYSTEM-ARCHITECTURE section 4: `/sessions`, `/onboarding`, `/notes` index, `/exams/[id]`, `/calendar` tabs | Include; the SDD route list is not exhaustive | INFORMATION-ARCHITECTURE |
| U-D9 | Week starts on Monday in the calendar | Monday, matching the PRD proposal for statistics | Calendar, Statistics |
| U-D10 | Bottom tab bar items (Dashboard, Timer, Calendar, To-dos, More) | Approve; Statistics is under More | NAVIGATION-STRUCTURE |
| U-D11 | Icon library swap from shadcn default Lucide to Phosphor | Approve; adds `@phosphor-icons/react` and `iconLibrary: "phosphor"` in Phase 7 | DESIGN-SYSTEM, COMPONENT-INVENTORY |
| U-D12 | Subject color palette values and names | Approve the 10 specified | COLOR-TYPOGRAPHY |
| U-D13 | Notes search and tagging | Not specified in any FR; excluded | Notes pages |
| U-D14 | PWA install UI | None; PWA has no requirement (PRD section 4 mapping note) | Whole app |
