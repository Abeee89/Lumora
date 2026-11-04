# Lumora Color and Typography

> Status: Proposal, pending approval. Source of truth: Phase 1 to 4 docs.

This file is the only place (besides the decision register in DESIGN-PRINCIPLES.md) that holds hex values and font names. Every other Phase 5 file refers to the token names below. Changing a hue or the typeface means editing this file only, then rechecking contrast.

Token values are specification, not implementation. Contrast ratios were recomputed with the WCAG 2.x relative luminance formula from the hex values in this file.

## 1. Palette rule

Core is deep teal plus warm neutrals. Accent is amber. The only semantic hue is red for errors.

- Success: teal family (primary-soft surface) plus a check icon.
- Warning: accent-soft surface plus a warning icon.
- Info: neutral surface plus an info icon.
- Error: error-soft surface plus an error icon and text.

Reason: three hues in the chrome keep the interface calm and stop status colors from competing with each other (R-29).

State is never carried by color alone: every color state also has text and a shape or icon change (NFR-043).

Accent rule: amber is used for exactly three meanings.

| Meaning | Color treatment | Non-color carrier |
|---|---|---|
| Goal met | Arc stroke turns accent-strong | Check icon and the words "Goal met" (FR-072) |
| Timer running now | Indicator dot in accent | The word "Running" (FR-050) |
| Today in the calendar | 2 px accent-strong outline on the cell | The word "Today" in the cell label for assistive tech (FR-060) |

Reason: amber reads as "lamp on" and ties to the name Lumora; limiting it to achieved or active states makes it a signal, not decoration.

## 2. Color tokens, light theme

| Token | Hex | Role | Key contrast |
|---|---|---|---|
| canvas | #F6F4EE | Page background | ink on canvas 14.36 |
| surface | #FFFFFF | Cards, inputs, dialogs | ink on surface 15.79 |
| sunken | #ECE8DF | Table header, code, tracks | muted on sunken 4.89 |
| border | #D9D4C8 | Decorative dividers only | 1.34 on canvas (not relied on) |
| border-strong | #847E70 | Input, checkbox, control outlines | 3.67 on canvas, 4.04 on surface |
| ink | #1B2428 | Primary text | 14.36 on canvas, 15.79 on surface |
| ink-2 | #454F55 | Secondary text | 7.63 on canvas |
| muted | #5B656A | Tertiary text, placeholders | 5.43 on canvas, 5.98 on surface, 4.89 on sunken |
| primary | #0E5A58 | Primary button, links, arc fill | white on primary 8.01; primary on canvas 7.28 |
| primary-hover | #0A4846 | Hover and active primary | white on primary-hover 10.35 |
| on-primary | #FFFFFF | Text on primary | see primary |
| primary-soft | #DCEBE8 | Selected nav, success surface | on-primary-soft 8.43; ink 12.85 |
| on-primary-soft | #0A4846 | Text on primary-soft | 8.43 |
| accent | #E9A514 | Amber fill, only behind ink text | ink on accent 7.41 |
| on-accent | #1B2428 | Text on accent | 7.41 |
| accent-strong | #9C6500 | Amber strokes and icons | 4.47 on canvas, 4.91 on surface, 4.02 on sunken |
| accent-soft | #FBEBC4 | Warning surface | on-accent-soft 7.18 |
| on-accent-soft | #6B4500 | Warning text | 7.18 |
| error | #B3261E | Error text, destructive button fill | 6.54 on surface; white on error 6.54 |
| error-soft | #FBE3E0 | Error surface | error on error-soft 5.34 |
| focus | #0B6B68 | Focus ring | 5.76 on canvas, 6.33 on surface, 5.18 on sunken |

Notes:
- border is decorative. Control boundaries use border-strong, which clears the 3:1 non-text minimum on canvas and surface (NFR-040).
- accent-strong is used for strokes and icons (non-text, 3:1 required); it is not used for body text.
- accent-strong on sunken is 4.02, which is enough for non-text use only.

## 3. Color tokens, dark theme

| Token | Hex | Key contrast |
|---|---|---|
| canvas | #111618 | ink on canvas 15.30 |
| surface | #181E21 | ink on surface 14.13 |
| raised | #1F272B | Popovers and dialogs; ink on raised 12.74 |
| sunken | #0C1012 | muted on sunken 7.39 |
| border | #2C363A | Decorative only |
| border-strong | #7B8788 | 4.92 on canvas, 4.54 on surface, 4.09 on raised |
| ink | #E8ECEA | Primary text |
| ink-2 | #BCC5C4 | 9.56 on surface |
| muted | #99A3A3 | 6.52 on surface, 5.87 on raised |
| primary | #5CC8BF | 8.40 on surface |
| primary-hover | #7AD6CE | Hover and active primary |
| on-primary | #0A1F1E | 8.53 on primary |
| primary-soft | #173433 | on-primary-soft #A5E4DE, 9.36 |
| accent | #F0B232 | on-accent #0A1F1E, 9.06 |
| accent-strong | #F0B232 | 8.92 on surface |
| accent-soft | #3A2C0C | on-accent-soft #F5C96A, 8.70 |
| error | #F2877F | 6.86 on surface; on-error #111618, 7.42 |
| error-soft | #3C1A18 | error on error-soft 6.32 |
| focus | #7AD6CE | 10.71 on canvas, 9.90 on surface, 8.92 on raised |

Elevation in the dark theme uses lighter surfaces (surface, then raised) plus a 1 px border, not shadows. Reason: shadows are barely visible on dark canvases, and a lighter surface marks overlap more clearly (R-12).

## 4. Calendar heatmap buckets

Buckets follow FR-060: 0, 1 to 59, 60 to 119, and 120 or more minutes. The minute number is printed in every cell and the legend lists the four ranges as text, so the fill is never the only carrier (NFR-043).

| Bucket | Light fill / text | Dark fill / text |
|---|---|---|
| 0 | #ECE8DF / #1B2428 (12.92) | #1F272B / #E8ECEA (12.74) |
| 1 to 59 | #DCEBE8 / #1B2428 (12.85) | #173433 / #E8ECEA (11.18) |
| 60 to 119 | #8FC3BD / #1B2428 (8.05) | #2C6E6A / #FFFFFF (5.92) |
| 120+ | #0E5A58 / #FFFFFF (8.01) | #5CC8BF / #0A1F1E (8.53) |

Every cell carries a 1 px border-strong outline so the grid cell boundary clears 3:1 against the canvas and adjacent low buckets stay distinguishable in grayscale. Reason: the outline separates cells where the fill steps are small; the printed number, not the fill, distinguishes buckets.

## 5. Arc

| Part | Light | Dark | Note |
|---|---|---|---|
| Track | border (#D9D4C8) | border (#2C363A) | Decorative |
| Fill | primary | primary | Progress |
| Goal met fill | accent-strong | accent-strong | Plus check icon and "Goal met" |

Stroke 10 px, round caps. The number inside the arc is the accessible value; the stroke is a frame for it. Reason: the product's value is honest numbers, so the number is the hero and the ring is its frame.

## 6. Subject colors

FR-010 requires a fixed palette of exactly 10 colors. These are user content, not chrome. They appear only as a 12 px dot or a 4 px bar beside the subject name, never as text color or row background, and the name is always printed, so a red subject cannot be mistaken for error styling. The picker is a radio group with swatch and visible name.

| # | Name | Light | Dark |
|---|---|---|---|
| 1 | Teal | #0E5A58 | #5CC8BF |
| 2 | Red | #B3261E | #F2877F |
| 3 | Blue | #2F5D8A | #8DB8E6 |
| 4 | Brown | #7A4B00 | #F0B232 |
| 5 | Violet | #5B3F8C | #B9A2E6 |
| 6 | Green | #2E6B2E | #82D18A |
| 7 | Plum | #9A3B6B | #EE93BE |
| 8 | Slate | #4A5258 | #B5BFC0 |
| 9 | Rust | #A04A12 | #F2A06B |
| 10 | Cyan | #1F6F86 | #74CBE0 |

Contrast (recomputed): light values are at least 5.19 on canvas and 5.71 on surface; dark values are at least 7.42 on canvas and 6.86 on surface (lowest is Red on surface). All clear the 3:1 non-text minimum.

Reason: a categorical palette is required by FR-010; it is a data palette governed by this system, not 10 decorative UI colors.

## 7. Chart rules

- Totals use primary only.
- Per-subject stacks use the subject palette with 2 px surface-colored gaps between segments.
- Planned versus actual: planned is an outlined bar with diagonal hatch, actual is a solid bar. Legend swatches reproduce the hatch.
- Manual share is a second segment with hatch and a text label (BR-002, FR-088).
- Data labels appear on bars when space allows. Tooltips are a convenience only.
- Animation is always off.
- Every chart is paired with a numeric table (NFR-043).

Reason: pattern plus label means no series depends on hue alone, and a table gives keyboard and screen reader access.

## 8. Typography

Family: Atkinson Hyperlegible Next, variable weight 200 to 800, self-hosted because third-party font delivery may drop OpenType features such as tabular numerals. Fallback stack: system-ui, Segoe UI, Roboto, sans-serif. Code (in notes only): the ui-monospace stack at 0.9em.

Reason: the typeface is built for character disambiguation (1, l, I and 0, O), which matters for times and durations, and it has tabular numerals.

Tabular numerals apply to every duration, time, count, table number and the timer.

| Style | Size / line height (px) | Weight | Use |
|---|---|---|---|
| timer-display | 56/60 (48/52 under 768) | 600, tabular | Timer face; the mini-bar uses stat-sm |
| stat | 32/40 | 600, tabular | Arc center, large numbers |
| stat-sm | 20/28 | 600, tabular | Mini-bar, card numbers |
| h1 | 28/36 (24/32 under 768) | 700 | Page title, one per page |
| h2 | 22/30 | 600 | Section |
| h3 | 18/26 | 600 | Card title |
| body | 16/24 | 400 | Default |
| body-strong | 16/24 | 600 | Emphasis |
| label | 14/20 | 500 | Form labels, nav, buttons |
| body-sm | 14/20 | 400 | Secondary text, table cells |
| caption | 12/16 | 400 | Metadata only, never the sole carrier of required info; 4.5:1 minimum |
| note-body | 16/26, max 65ch | 400 | Rendered notes |

Rules:
- Sentence case everywhere. No uppercase tracking labels. Reason: all-caps is slower to read and is an AI-template tell (R-06).
- No text under 12 px. Body text and input text are 16 px minimum (also prevents iOS input zoom on phones, NFR-088).
- No italics as the only means of emphasis in UI; use body-strong.
- Honor user text-spacing overrides (WCAG 1.4.12), 200 percent browser zoom (WCAG 1.4.4), and reflow down to 320 CSS px (NFR-040, NFR-086).
- Notes use a 65 character maximum line length. Reason: reading comfort for long text.

## 9. Pairing guide

| Text role | Allowed on | Token |
|---|---|---|
| Primary text | canvas, surface, sunken, primary-soft | ink |
| Secondary text | canvas, surface | ink-2 |
| Tertiary text and placeholders | canvas, surface, sunken | muted |
| Link | canvas, surface | primary, underlined |
| Button label on filled primary | primary | on-primary |
| Warning text | accent-soft | on-accent-soft |
| Error text | surface, error-soft | error |

Disabled controls keep a legible label and are exempt from the contrast minimum (WCAG 1.4.3), but never rely on color alone to show the disabled state (NFR-043).
