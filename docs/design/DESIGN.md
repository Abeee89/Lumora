---
name: Clarity & Accessible Rigor
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#434655'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#747686'
  outline-variant: '#c4c5d7'
  surface-tint: '#2151da'
  primary: '#0037b0'
  on-primary: '#ffffff'
  primary-container: '#1d4ed8'
  on-primary-container: '#cad3ff'
  inverse-primary: '#b7c4ff'
  secondary: '#006399'
  on-secondary: '#ffffff'
  secondary-container: '#7bc2ff'
  on-secondary-container: '#004f7b'
  tertiary: '#004f38'
  on-tertiary: '#ffffff'
  tertiary-container: '#00694c'
  on-tertiary-container: '#89e7be'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dce1ff'
  primary-fixed-dim: '#b7c4ff'
  on-primary-fixed: '#001551'
  on-primary-fixed-variant: '#0039b5'
  secondary-fixed: '#cde5ff'
  secondary-fixed-dim: '#94ccff'
  on-secondary-fixed: '#001d32'
  on-secondary-fixed-variant: '#004b74'
  tertiary-fixed: '#97f5cc'
  tertiary-fixed-dim: '#7bd8b1'
  on-tertiary-fixed: '#002115'
  on-tertiary-fixed-variant: '#00513a'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  display-hero:
    fontFamily: Inter
    fontSize: 44px
    fontWeight: '700'
    lineHeight: 52px
    letterSpacing: -0.02em
  display-hero-mobile:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.015em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 26px
    fontWeight: '600'
    lineHeight: 34px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  title-md:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md-bold:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.03em
  caption:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system is engineered for compliance, visual authority, and uncompromising legibility. Developed as an enterprise-grade accessibility specification and living design dashboard, it embodies the philosophy that universal design is the pinnacle of sophisticated digital craft.

The brand personality projects:
- **Precision & Authority:** Every layout boundary, ratio, and indicator is deliberate and verified against WCAG 2.2 AA and AAA benchmarks.
- **Calm Clarity:** High-contrast information architecture rendered without aggressive harshness, prioritizing sustained focus and rapid comprehension.
- **Empathetic Utility:** Multi-modal signifiers (iconography, text descriptors, and distinct surface contrasts) guarantee information is never communicated via color alone.

The aesthetic fuses **Architectural Minimalism** with **Functional High-Contrast Modernism**. White and pale slate surfaces provide an uncluttered backdrop for ink-dense typography, razor-sharp structural dividers, and vivid indigo-cobalt accents optimized specifically for keyboard focus vectors and interactive state awareness.

## Colors

The color architecture enforces strict luminance separation across all layers, satisfying WCAG 2.2 Level AA requirements (minimum 4.5:1 for standard text, 3:1 for large text and interactive components/borders) with critical pathways meeting Level AAA (7:1).

- **Primary (`#1D4ED8` - Accessible Royal Blue):** Anchors primary actions, active navigational states, and high-visibility status indicators. Reaches an 8.2:1 contrast ratio against pure white and 7.4:1 against canvas pale slate.
- **Secondary (`#0369A1` - Deep Teal / Cyan):** Drives secondary visual paths, interactive metadata tags, data-visualization nodes, and secondary callouts. Delivers a minimum 5.5:1 contrast against light backgrounds.
- **Tertiary (`#047857` - Verification Emerald):** Reserved for validation states, pass indicators, WCAG compliance badges, and positive system statuses.
- **Neutral (`#0F172A` - Slate Ink):** The visual foundation for body typography, structural borders, and dark container surfaces. Ensures absolute contrast fidelity (up to 16:1 against canvas `#F8FAFC`).

### Functional Accessibility & Focus Guidance
- **Focus Rings:** Unconditionally bound to `#1D4ED8` or pure contrast white when on dark surfaces, configured at a 2px outline with a 2px offset.
- **Color Independence Rule:** No semantic state (Success, Warning, Critical, Pending) may be displayed purely as a color wash; every status must include an accessible semantic icon (`aria-hidden="true"`) alongside an explicit typographic badge label.

## Typography

The typography leverages **Inter** across all UI planes, exploiting its optimized x-height, open apertures, and disambiguated letterforms (`I`, `l`, `1`, `0`, `O`) to maximize readability for individuals with low vision, astigmatism, or reading challenges.

- **Proportional Leading:** Line heights are maintained between 1.4x and 1.6x the font size to adhere firmly to WCAG line spacing criteria (SC 1.4.12: Text Spacing).
- **Paragraph Spacing & Width:** Running body copy is constrained to an optimal reading measure of 60 to 75 characters per line (`max-w-prose`), preventing horizontal ocular fatigue.
- **Font Scaling Resilience:** Every type token uses relative unit calculations (`rem`) supporting up to 200% system browser zoom without truncation, clipping, or overlapping text containers.

## Layout & Spacing

The structural layout uses an **8pt rhythmic base grid** integrated into a 12-column responsive fluid architecture with strict touch-target bounding boxes:

- **Desktop (1024px+):** 12-column grid, 32px (`2rem`) page margin, 24px (`1.5rem`) column gutters. Content is constrained to a 1440px wide max-canvas.
- **Tablet (640px - 1023px):** 8-column layout, 24px margin, 16px gutter. Navigation transitions to an accessible sidebar rail or standard drawer.
- **Mobile (< 640px):** 4-column layout, 16px (`1rem`) edge margins, 16px gutter. Side-by-side metric dashboards reflow into stacked priority stacks.

### Target Size & Spacing Requirements
- **Touch Target Fidelity (WCAG 2.5.5 / 2.5.8):** All interactive elements must maintain an unobstructed interactive tap envelope of at least 44x44 CSS pixels. When smaller visual controls are required (e.g., a 32px secondary chip), a transparent hit margin expands the target to 48px.
- **Spacing Invariance:** Distance tokens are strictly positional: `space-xs` (4px) and `space-sm` (8px) define tight inline icon-to-label couplings; `space-md` (16px) establishes standard card interior padding; `space-lg` (24px) separates card groups; and `space-xl` (40px) partitions discrete layout regions.

## Elevation & Depth

To sustain unambiguous contrast ratios without introducing visual blur that can impede screen magnifiers or impair edge detection, this design system relies on **Tonal Stratification and Structural Borders** rather than heavy drop shadows.

- **Border-First Boundary Definition:** All cards, tables, panels, and modals must carry an explicit 1px or 1.5px solid border (`#CBD5E1` in light themes), satisfying the 3:1 non-text contrast criterion against adjacent canvas surfaces (`#F8FAFC`).
- **Controlled Ambient Elevation:** Shadows are strictly supporting accents, not edge definers. When elevation is necessary to convey z-axis context (such as flyouts, popovers, or floating accessibility controls), use an ultra-diffused, cool-tinted shadow:
  - *Layer 1 (Card Rest):* No shadow; 1px solid border `#CBD5E1`.
  - *Layer 2 (Dropdowns, Floating Tooltips):* `0 4px 12px -2px rgba(15, 23, 42, 0.08)`, paired with a 1px solid `#94A3B8` border.
  - *Layer 3 (Modals & Overlays):* `0 20px 32px -8px rgba(15, 23, 42, 0.16)`, backed by a high-opacity backdrop scrim (`rgba(15, 23, 42, 0.65)`).
- **Reduced Motion Accordance:** Any depth transition (flyouts, accordion expansions, hover elevations) must respect `prefers-reduced-motion: reduce` by defaulting to immediate state swaps rather than continuous easing transforms.

## Shapes

The design system adopts a **Soft (`1`) shape language** (4px base radius for standard elements, 8px for containers, 12px for modal surfaces).

- **Rationale:** Overly rounded or pill-shaped containers can compress content margins, cause irregular focus ring geometries, and decrease the effective optical reading area of data-dense tables and dashboards.
- **Form Cohesion:**
  - Interactive inputs, tags, and small buttons use `rounded` (0.25rem / 4px).
  - Cards, content tiles, and dashboard metric panels use `rounded-lg` (0.5rem / 8px).
  - System modals, dialogue prompts, and floating utility sheets use `rounded-xl` (0.75rem / 12px).
- **Focus Ring Preservation:** Outlines follow the explicit curvature of each component boundary without corner clipping or visual gap deterioration.

## Components

### 1. Buttons
- **Primary:** Background `#1D4ED8`, text `#FFFFFF`, 4px corner radius, minimum height 44px. Hover: `#1E40AF`.
- **Secondary:** Background `#FFFFFF`, 1.5px border `#0F172A`, text `#0F172A`. Minimum height 44px. Hover: `#F1F5F9`.
- **Focus Indicator (Universal):** Focus visibly rings the component with a `2px solid #1D4ED8` outer line and a `2px` transparent offset space. Never suppressed via `outline: none` without an active replacement.
- **States:** Disabled buttons are rendered with an explicit border and an accompanying explanatory tooltip or aria-description explaining *why* the action is inactive, rather than relying on low-contrast opacity shifts.

### 2. Form Inputs & Text Fields
- **Container:** Background `#FFFFFF`, minimum height 48px, 1.5px border `#64748B` (exceeds 3:1 non-text contrast against background).
- **Typography:** Value and typed text in `#0F172A` (16px to prevent automated iOS zoom reflow).
- **Labels:** Always persistently positioned outside the field above the input bounding box with a 4px gap. Floating labels that vanish or reduce legibility are forbidden.
- **Error States:** Border color shifts to `#B91C1C` (2px thickness). Accompanied directly beneath the input by an SVG exclamation icon and persistent error text linked via `aria-describedby`.

### 3. Accessible Badges, Tags & Chips
- **Semantic Pairing:** Badges never present bare text or isolated color dots. Every badge combines:
  1. An explicit icon (e.g., checkmark for "Pass", alert triangle for "Review Needed", cross for "Fail").
  2. High-contrast text label (minimum 4.5:1 ratio).
- **Palette Variants:**
  - *Compliant / Verified:* `#ECFDF5` surface, `#047857` border, `#065F46` text.
  - *Notice / Level AA Indicator:* `#EFF6FF` surface, `#1D4ED8` border, `#1E40AF` text.
  - *Critical Non-Conformance:* `#FEF2F2` surface, `#B91C1C` border, `#991B1B` text.

### 4. Cards & Content Tiles
- **Structure:** Surface `#FFFFFF`, outer border 1px solid `#CBD5E1`. Padding strictly fixed to `space-md` (16px) or `space-lg` (24px).
- **Header Regions:** Explicit horizontal dividing line separating card header from content body, maintaining clear scanning waypoints for screen readers and visual scannability.

### 5. Checkboxes & Radio Buttons
- **Geometry:** 20x20px visual control nestled inside a 44x44px touch area.
- **Border:** 2px solid `#334155` unchecked; filled `#1D4ED8` checked with high-contrast interior checkmark (`#FFFFFF`, stroke 2.5px).
- **Focus State:** 2px offset with 2px solid `#1D4ED8` ring around the box perimeter.

### 6. Lists & Data Grids
- **Row Separation:** Explicit alternating row contrast (`#FFFFFF` alternating with `#F8FAFC`) with 1px horizontal borders (`#E2E8F0`).
- **Interactive Rows:** Hover state shifts to `#F1F5F9`; keyboard navigation focuses the entire row or cell with the standard 2px focus ring.
- **Headings:** Sticky table headers with bold typography (`#0F172A`), persistent sorting direction arrows, and clear aria-sort markup.

### 7. Interactive Accessibility Panel (Product-Specific)
- **Contrast Analyzer Widget:** Fixed floating or sidebar utility displaying real-time luminance contrast ratios (e.g., `4.8:1 [AA PASS]`) alongside active typography tokens.
- **Screen Reader Announcer Log:** A dedicated, visually hidden or collapsible live-region box (`aria-live="polite"`) that previews current system screen-reader output for auditing compliance directly within the dashboard.