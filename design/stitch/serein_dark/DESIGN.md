---
name: Serein Dark
colors:
  surface: '#131312'
  surface-dim: '#131312'
  surface-bright: '#3a3938'
  surface-container-lowest: '#0e0e0d'
  surface-container-low: '#1c1c1a'
  surface-container: '#20201e'
  surface-container-high: '#2a2a29'
  surface-container-highest: '#353533'
  on-surface: '#e5e2e0'
  on-surface-variant: '#c1c8c3'
  inverse-surface: '#e5e2e0'
  inverse-on-surface: '#31302f'
  outline: '#8b928e'
  outline-variant: '#414845'
  surface-tint: '#a7cfbe'
  primary: '#b7e0ce'
  on-primary: '#10372b'
  primary-container: '#9cc4b3'
  on-primary-container: '#2d5245'
  inverse-primary: '#406658'
  secondary: '#cac6c0'
  on-secondary: '#31302c'
  secondary-container: '#484742'
  on-secondary-container: '#b8b5ae'
  tertiary: '#ffcbc6'
  on-tertiary: '#4a2623'
  tertiary-container: '#e6aea9'
  on-tertiary-container: '#69403d'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#c2ecda'
  primary-fixed-dim: '#a7cfbe'
  on-primary-fixed: '#002117'
  on-primary-fixed-variant: '#294e41'
  secondary-fixed: '#e6e2db'
  secondary-fixed-dim: '#cac6c0'
  on-secondary-fixed: '#1c1c18'
  on-secondary-fixed-variant: '#484742'
  tertiary-fixed: '#ffdad6'
  tertiary-fixed-dim: '#f2b9b4'
  on-tertiary-fixed: '#311210'
  on-tertiary-fixed-variant: '#643c39'
  background: '#131312'
  on-background: '#e5e2e0'
  surface-variant: '#353533'
typography:
  display:
    fontFamily: Hanken Grotesk
    fontSize: 44px
    fontWeight: '500'
    lineHeight: 52px
    letterSpacing: -0.03em
  display-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '500'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '500'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 26px
    fontWeight: '500'
    lineHeight: 34px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 22px
    fontWeight: '500'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 24px
    letterSpacing: -0.005em
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
    letterSpacing: 0em
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
    letterSpacing: 0em
  body-sm:
    fontFamily: Hanken Grotesk
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0.005em
  label-md:
    fontFamily: Hanken Grotesk
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Hanken Grotesk
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.04em
spacing:
  gutter: 1.5rem
  margin: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system delivers an austere, contemplative editorial environment designed for high-focus reading, intellectual organization, and quiet workflows. Built upon an ethos of intentional restraint, the aesthetic balances modern reductionism with warm, architectural discipline.

- **Design Philosophy:** Minimalist neo-grotesque structure. The UI removes decorative friction entirely—no visual gradients, no cast shadows, and no atmospheric glows. Structure is articulated strictly through precise typographic scale, disciplined negative space, and gossamer 1px borders.
- **Audience & Context:** Targeted toward authors, researchers, curators, and knowledge workers who require long-duration visual comfort and zero cognitive noise in low-light environments.
- **Emotional Resonance:** Quiet authority, permanence, focus, and deliberate poise.

## Colors

The color system operates on an absolute economy of means. High contrast is avoided in favor of gentle, tactile legibility:

- **Canvas & Surfaces:**
  - Base Background: `#0F0F0E` (deep, warm charcoal-black).
  - Elevated Container / Hover Surface: `#171716` (subtle step for interactive hit targets).
- **Typography & Foreground:**
  - Primary Text & Structural Strokes: `#EDEBE6` (chalk white, providing crisp legibility without harsh eye strain).
  - Secondary Text: `#A3A09A` (muted stone, calibrated for supporting metadata and secondary navigation).
  - Tertiary / Disabled Text: `#575551`.
- **Accent Philosophy:**
  - Active Sage Accent: `#9CC4B3`. Restricted exclusively to functional states: active tab underlines, tiny status indicators, and selected state identifiers. It must never be applied to button surface fills or generalized iconography.
- **Dividers & Outlines:**
  - Structural Borders: `#EDEBE6` rendered at `10%` opacity (`rgba(237, 235, 230, 0.10)`).

## Typography

The design system uses Hanken Grotesk across all functional tiers to maintain a crisp, clean neo-grotesque rhythm. The typeface offers balanced proportions, open apertures, and subtle contemporary details that remain grounded under low-light conditions.

- **Weight Discipline:** The hierarchy relies on two primary weights: Medium (`500`) for structural anchor points (headers, actions, indicators) and Regular (`400`) for continuous text runs. Heavy or light weights are avoided to prevent optical vibration against `#0F0F0E`.
- **Rhythm & Proportions:** Headlines employ negative letter-spacing to present a deliberate, composed silhouette. Small labels feature expanded letter-spacing for effortless scannability at small sizes.

## Layout & Spacing

A fluid grid architecture governs layouts across breakpoints, relying on strict proportional cadence and structural gutters rather than background layering:

- **Desktop (1024px+):** 12-column grid, `margin`: `2.5rem`, `gutter`: `1.5rem`. Content columns align with clear vertical hairline rails.
- **Tablet (640px – 1023px):** 6-column grid, `margin`: `1.5rem`, `gutter`: `1rem`. Secondary sidebars collapse into toggleable drawer planes or horizontal strips.
- **Mobile (< 640px):** 4-column grid, `margin`: `1rem`, `gutter`: `0.75rem`. Full-width modular stacking with 1px border separators.
- **Spacing Rhythm:** Internal layout gaps conform strictly to multiples of `0.25rem` (4px baseline system). Vertical stacking between distinct functional modules defaults to `space-xl` (`2.5rem`) to allow deliberate breathing room.

## Elevation & Depth

Visual depth is purely tectonic and flat.

- **Zero Diffusion Policy:** Box shadows, drop shadows, ambient blur halos, and glow effects are prohibited across all components and viewports.
- **Hairline Partitioning:** Hierarchy and spatial grouping are communicated solely through 1px border dividers tinted with `#EDEBE6` at 10% opacity (`rgba(237, 235, 230, 0.10)`).
- **Surface Elevation:** Overlays (such as dialogs, dropdowns, and flyout menus) do not float with ambient shadows. Instead, they share the base `#0F0F0E` background, bounded by a continuous 1px `#EDEBE6` 10% stroke, floating over an unobtrusive backdrop mask (`rgba(15, 15, 14, 0.80)`).
- **Hover & Focus Depths:** Interactive rows and list nodes articulate feedback via an instantaneous or 100ms surface shift to `#171716`.

## Shapes

The geometric framework is uncompromisingly sharp (`roundedness: 0`). 

- **Corner Radii:** All UI elements—including buttons, input fields, cards, popovers, and segmented controls—feature a 0px border-radius.
- **Architectural Tenet:** Rectilinear geometry mirrors technical blueprints and classic Swiss editorial layouts, reinforcing the quiet discipline of the interface.

## Components

### Buttons
- **Primary Action:** Solid background of `#EDEBE6` with `#0F0F0E` text in `label-md`. 0px border-radius. No accent color applied. Hover shifts background to `#D8D5CE`.
- **Secondary / Ghost Action:** Transparent background with a 1px border of `#EDEBE6` at 10% opacity. Text `#EDEBE6`. Hover shifts surface to `#171716` and border to 20% opacity.
- **Tertiary / Inline Action:** Borderless, transparent surface. Text `#A3A09A`. Hover transitions text to `#EDEBE6`.

### Underline & Tab Indicators
- **Active Navigation Tabs:** Transparent background with `#EDEBE6` text. Active state is signified exclusively by a solid 1px horizontal rule in `#9CC4B3` positioned flush against the bottom edge. Inactive tabs sit in `#A3A09A` without an underline.

### Input Fields & Controls
- **Text Inputs:** Transparent background, 1px bottom or perimeter border in `#EDEBE6` at 10%. Value text is `#EDEBE6`, placeholder is `#575551`. Focus state transitions the border to `#EDEBE6` at 40% (never glowing).
- **Checkboxes & Radios:** Sharp square containers (16px x 16px) bounded by 1px at 20% opacity. When checked, the inner glyph or pip renders in `#9CC4B3` against the `#0F0F0E` background.

### Cards & Grouping Containers
- **Content Cards:** Flat `#0F0F0E` fill, enclosed entirely by a 1px hairline border (`#EDEBE6` at 10%). Inner padding calibrated to `space-md` or `space-lg`. Never layered with drop shadows or ambient gradients.

### Lists & Dividers
- **Data Rows & Lists:** Separated by horizontal 1px hairline rules (`rgba(237, 235, 230, 0.10)`). Hovering over a list item fills the row with `#171716`.
- **Status Dots / Indicators:** Tiny 6px square or dot rendered in `#9CC4B3` to signal active processes, live documents, or synchronization states.