---
name: Serein
colors:
  surface: '#faf9f5'
  surface-dim: '#dbdad6'
  surface-bright: '#faf9f5'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f4f0'
  surface-container: '#efeeea'
  surface-container-high: '#e9e8e4'
  surface-container-highest: '#e3e2df'
  on-surface: '#1b1c1a'
  on-surface-variant: '#414845'
  inverse-surface: '#30312e'
  inverse-on-surface: '#f2f1ed'
  outline: '#717975'
  outline-variant: '#c1c8c3'
  surface-tint: '#416658'
  primary: '#093126'
  on-primary: '#ffffff'
  primary-container: '#23483c'
  on-primary-container: '#8fb6a6'
  inverse-primary: '#a7cfbf'
  secondary: '#5f5e5a'
  on-secondary: '#ffffff'
  secondary-container: '#e2dfda'
  on-secondary-container: '#64635e'
  tertiary: '#44221c'
  on-tertiary: '#ffffff'
  tertiary-container: '#5e3731'
  on-tertiary-container: '#d7a198'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#c3ebdb'
  primary-fixed-dim: '#a7cfbf'
  on-primary-fixed: '#002118'
  on-primary-fixed-variant: '#294e41'
  secondary-fixed: '#e5e2dd'
  secondary-fixed-dim: '#c9c6c1'
  on-secondary-fixed: '#1c1c19'
  on-secondary-fixed-variant: '#474743'
  tertiary-fixed: '#ffdad4'
  tertiary-fixed-dim: '#f2b9b0'
  on-tertiary-fixed: '#31120e'
  on-tertiary-fixed-variant: '#643c36'
  background: '#faf9f5'
  on-background: '#1b1c1a'
  surface-variant: '#e3e2df'
typography:
  display:
    fontFamily: Geist
    fontSize: 40px
    fontWeight: '500'
    lineHeight: 48px
    letterSpacing: -0.03em
  headline-lg:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '500'
    lineHeight: 40px
    letterSpacing: -0.025em
  headline-lg-mobile:
    fontFamily: Geist
    fontSize: 26px
    fontWeight: '500'
    lineHeight: 34px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Geist
    fontSize: 22px
    fontWeight: '500'
    lineHeight: 30px
    letterSpacing: -0.02em
  headline-sm:
    fontFamily: Geist
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.015em
  body-lg:
    fontFamily: Geist
    fontSize: 17px
    fontWeight: '400'
    lineHeight: 26px
    letterSpacing: -0.01em
  body-md:
    fontFamily: Geist
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
    letterSpacing: -0.005em
  body-sm:
    fontFamily: Geist
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: '0'
  label-md:
    fontFamily: Geist
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Geist
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-lg: 2rem
  margin: 1.5rem
  margin-md: 3rem
  margin-lg: 4.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 2rem
  space-xl: 3.5rem
  space-2xl: 4.5rem
---

## Brand & Style

This design system embodies serene academic discipline and quiet focus. Tailored for deep work, immersive learning, and scholarly contemplation, the interface strips away the algorithmic anxiety typical of modern streaming platforms. The aesthetic merges tactile editorial restraint with the precision of high-end industrial design.

Key visual attributes:
- **Calm & Editorial:** Generous whitespace, quiet surfaces, and high typographic rigor prioritize sustained attention over dopamine hooks.
- **Strict Minimalism:** No decorative ornaments, gamified metrics, likes, subscriber numbers, or attention-grabbing badges.
- **Architectural Precision:** Structural integrity relies on hairlines, pure layout proportions, and intentional alignment rather than elevation effects.

## Colors

The palette is anchored by natural paper tones and deep botanical pigments, creating an eye-resting environment optimized for prolonged visual study sessions.

- **Background (`#F5F4F0`):** A warm off-white that avoids the harsh glare of `#FFFFFF`, serving as the primary canvas.
- **Text Primary (`#141413`):** High-contrast, near-black ink for maximum legibility and editorial presence.
- **Text Secondary / Muted (`#5C5B57`):** Soft charcoal for metadata, secondary navigations, and inactive states.
- **Accent (`#23483C`):** Deep forest green, applied sparingly strictly for focused inputs, active playback state, and structural progress indicators.
- **Hairline Dividers:** Set to `rgba(20, 20, 19, 0.10)` at physical 1px thickness.
- **Surface Elevation:** Do not introduce tinted shadow scales or elevated surface layers; hierarchy is expressed through layout density and line separation.

## Typography

Typography is set in **Geist** across all roles to project an understated, neutral precision reminiscent of contemporary architectural monographs.

- **Weight Disciplines:** Restrict use exclusively to weights 400 (Regular), 500 (Medium), and 600 (Semi-Bold). Do not use light or ultra-bold weights.
- **Monospace Exceptions:** For timestamps, elapsed durations, and chapter scrubbers, use `font-variant-numeric: tabular-nums` to ensure numerical alignment.
- **Casing:** Avoid uppercase transformations except for micro structural metadata (`label-sm`).

## Layout & Spacing

The layout is built around deliberate pacing and generous, uncluttered negative space that prevents visual competition between study subjects.

- **Grid Model:** Fixed-max fluid grid centered at `1280px` desktop width. Uses an 8-column system on tablet and a 12-column system on desktop.
- **Rhythmic Vertical Intervals:**
  - `space-xl` (`56px` / `3.5rem`): Mandatory vertical distance between video content grid rows.
  - `space-2xl` (`72px` / `4.5rem`): Vertical separation between top-level content sections, collections, and catalog headers.
- **Breakpoints & Adaptation:**
  - **Desktop (≥ 1024px):** 3-column video grid; 72px section rhythm; 4.5rem side gutters.
  - **Tablet (640px – 1023px):** 2-column video grid; 48px section rhythm; 3rem side gutters.
  - **Mobile (< 640px):** Single-column stacked grid; 32px vertical card spacing; 1.5rem side gutters.

## Elevation & Depth

This system operates entirely in a flat, 2D architectural plane.

- **Zero Drop Shadows:** Shadows of any kind (box-shadow, drop-shadow, ambient blur) are strictly forbidden across every component.
- **No Glassmorphism:** Avoid backdrop-filter blurs, acrylic overlays, and semi-transparent milky fills. Surfaces are solid `#F5F4F0`.
- **Pure Hairlines:** Spatial hierarchy and structural demarcation are achieved exclusively through 1px border rules colored `rgba(20, 20, 19, 0.10)`.
- **Interactive State Transitions:** Reveal depth not by lifting elements, but through instant or micro-timed (150ms ease) color shifts to `#141413` or `#23483C`.

## Shapes

Corner radii are restrained, geometric, and purpose-specific:

- **Thumbnails & Media Containers:** Strictly `12px` border-radius with `overflow: hidden`.
- **Search & Primary Inputs:** Strictly `10px` border-radius.
- **Pills / Subtle Switches:** `4px` or `6px` radius for understated interactive targets.
- **Full Bleed Sheets / Popovers:** `12px` radius when floating, otherwise squared with 1px hairline delimiters.

## Components

### Video Card
- **Structure:** Consists solely of a 16:9 media thumbnail (`12px` radius), followed by a 12px gap, video title (`headline-sm`, `#141413`), speaker/channel name (`body-sm`, `#5C5B57`), and runtime (`body-sm`, `#5C5B57`, tabular numerals).
- **Prohibitions:** Strictly no border wrapper, no container card background, no view counts, no date timestamps ("2 days ago"), no channel avatars, and no "verified" badges.
- **Hover Behavior:** Slight opacity adjustment on media thumbnail (from `1.0` to `0.92`), text remains crisp `#141413`.

### Search Input
- **Container:** Height of 44px, radius of `10px`, background of `#FFFFFF` or a half-step lighter tint (`#FAF9F6`), bounded by a 1px `rgba(20, 20, 19, 0.10)` hairline.
- **Focus State:** 1px hairline shifts cleanly to `#23483C`. No glow ring, no outline spread.
- **Typography:** `body-md` in `#141413`, placeholder in `#5C5B57`.

### Interactive Buttons & Selectors
- **Primary Button:** Solid `#23483C` fill, `#F5F4F0` text, 40px height, `8px` radius, `label-md` typography.
- **Secondary / Ghost Button:** Transparent background, 1px `rgba(20, 20, 19, 0.10)` hairline, `#141413` text. Hover shifts border to `rgba(20, 20, 19, 0.3)`.
- **Active Filter Chips:** Text-only or minimalist underlined tabs. Inactive states use `#5C5B57`; active state uses `#141413` with a 1.5px solid `#23483C` bottom rule. No pill backgrounds.

### Scrub Bars & Progress Indicators
- **Track:** 2px solid hairline colored `rgba(20, 20, 19, 0.08)`.
- **Elapsed Track:** Solid `#23483C`.
- **Thumb:** 0px or completely invisible until hover/scrub interaction, then reveals a crisp 8px circular dot without drop shadow.

### Form Elements (Checkboxes & Radios)
- **Checkboxes:** 16x16px square with 3px radius. Unchecked: 1px hairline in `rgba(20, 20, 19, 0.20)`. Checked: Solid `#23483C` with sharp `#F5F4F0` checkmark.
- **Radio Buttons:** 16x16px circle with a centered 6px solid `#23483C` core upon selection.