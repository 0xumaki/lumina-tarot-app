---
version: "alpha"
name: "Lumina Cybernetics - Mobile Flow"
description: "Lumina Cybernetics Feature Section is designed for highlighting product capabilities and value points. Key features include reusable structure, responsive behavior, and production-ready presentation. It is suitable for component libraries and responsive product interfaces."
colors:
  primary: "#C5A87C"
  secondary: "#7A8680"
  tertiary: "#B5CD7E"
  neutral: "#7A8680"
  background: "#000000"
  surface: "#121815"
  text-primary: "#7A8680"
  text-secondary: "#E8EBE9"
  border: "#FFFFFF"
  accent: "#C5A87C"
typography:
  headline-lg:
    fontFamily: "Inter"
    fontSize: "24px"
    fontWeight: 300
    lineHeight: "30px"
    letterSpacing: "-0.025em"
  body-md:
    fontFamily: "Inter"
    fontSize: "12px"
    fontWeight: 300
    lineHeight: "16px"
  label-md:
    fontFamily: "Inter"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: "16px"
rounded:
  full: "9999px"
spacing:
  base: "4px"
  sm: "4px"
  md: "6px"
  lg: "8px"
  xl: "12px"
  gap: "4px"
  card-padding: "8px"
  section-padding: "24px"
components:
  button-primary:
    backgroundColor: "{colors.text-secondary}"
    textColor: "#050806"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    padding: "6px"
  button-secondary:
    textColor: "{colors.secondary}"
    typography: "{typography.body-md}"
    rounded: "{rounded.full}"
    padding: "6px"
  card:
    rounded: "16px"
    padding: "12px"
---

## Overview

- **Composition cues:**
  - Layout: Grid
  - Content Width: Full Bleed
  - Framing: Glassy
  - Grid: Strong

## Colors

The color system uses light mode with #C5A87C as the main accent and #7A8680 as the neutral foundation.

- **Primary (#C5A87C):** Main accent and emphasis color.
- **Secondary (#7A8680):** Supporting accent for secondary emphasis.
- **Tertiary (#B5CD7E):** Reserved accent for supporting contrast moments.
- **Neutral (#7A8680):** Neutral foundation for backgrounds, surfaces, and supporting chrome.

- **Usage:** Background: #000000; Surface: #121815; Text Primary: #7A8680; Text Secondary: #E8EBE9; Border: #FFFFFF; Accent: #C5A87C

- **Gradients:** bg-gradient-to-r from-brand-accent/10 to-transparent, bg-gradient-to-br from-brand-accent/20 to-transparent

## Typography

Typography relies on Inter across display, body, and utility text.

- **Headlines (`headline-lg`):** Inter, 24px, weight 300, line-height 30px, letter-spacing -0.025em.
- **Body (`body-md`):** Inter, 12px, weight 300, line-height 16px.
- **Labels (`label-md`):** Inter, 12px, weight 500, line-height 16px.

## Layout

Layout follows a grid composition with reusable spacing tokens. Preserve the grid, full bleed structural frame before changing ornament or component styling. Use 4px as the base rhythm and let larger gaps step up from that cadence instead of introducing unrelated spacing values.

Treat the page as a grid / full bleed composition, and keep that framing stable when adding or remixing sections.

- **Layout type:** Grid
- **Content width:** Full Bleed
- **Base unit:** 4px
- **Scale:** 4px, 6px, 8px, 12px, 16px, 24px, 32px, 40px
- **Section padding:** 24px, 48px, 56px
- **Card padding:** 8px, 12px, 16px
- **Gaps:** 4px, 6px, 8px, 16px

## Elevation & Depth

Depth is communicated through glass, border contrast, and reusable shadow or blur treatments. Keep those recipes consistent across hero panels, cards, and controls so the page reads as one material system.

Surfaces should read as glass first, with borders, shadows, and blur only reinforcing that material choice.

- **Surface style:** Glass
- **Borders:** 1px #FFFFFF; 1px #121815
- **Shadows:** rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0.8) 0px 0px 20px 0px inset; rgba(0, 0, 0, 0.9) 0px 40px 80px -20px, rgba(255, 255, 255, 0.08) 0px 2px 4px 0px inset; rgba(255, 255, 255, 0.05) 0px 1px 0px 0px inset
- **Blur:** 24px, 12px

### Techniques
- **Gradient border shell:** Use a thin gradient border shell around the main card. Wrap the surface in an outer shell with 16px padding and a 16px radius. Drive the shell with linear-gradient(rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%) so the edge reads like premium depth instead of a flat stroke. Keep the actual stroke understated so the gradient shell remains the hero edge treatment. Inset the real content surface inside the wrapper with a slightly smaller radius so the gradient only appears as a hairline frame.

## Shapes

Shapes rely on a tight radius system anchored by 12px and scaled across cards, buttons, and supporting surfaces. Icon geometry should stay compatible with that soft-to-controlled silhouette.

Use the radius family intentionally: larger surfaces can open up, but controls and badges should stay within the same rounded DNA instead of inventing sharper or pill-only exceptions.

- **Corner radii:** 12px, 16px, 36px, 48px, 9999px
- **Icon treatment:** Linear
- **Icon sets:** Solar

## Components

Anchor interactions to the detected button styles. Reuse the existing card surface recipe for content blocks.

### Buttons
- **Primary:** background #E8EBE9, text #050806, radius 9999px, padding 6px, border 0px solid rgb(229, 231, 235).
- **Secondary:** text #7A8680, radius 9999px, padding 6px, border 1px solid rgba(255, 255, 255, 0.06).

### Cards and Surfaces
- **Card surface:** background rgba(18, 24, 21, 0.5), border 1px solid rgba(255, 255, 255, 0.06), radius 16px, padding 12px, shadow none.
- **Card surface:** border 1px solid rgba(255, 255, 255, 0.06), radius 16px, padding 16px, shadow rgba(255, 255, 255, 0.05) 0px 1px 0px 0px inset.

### Iconography
- **Treatment:** Linear.
- **Sets:** Solar.

## Do's and Don'ts

Use these constraints to keep future generations aligned with the current system instead of drifting into adjacent styles.

### Do
- Do use the primary palette as the main accent for emphasis and action states.
- Do keep spacing aligned to the detected 4px rhythm.
- Do reuse the Glass surface treatment consistently across cards and controls.
- Do keep corner radii within the detected 12px, 16px, 36px, 48px, 9999px family.

### Don't
- Don't introduce extra accent colors outside the core palette roles unless the page needs a new semantic state.
- Don't mix unrelated shadow or blur recipes that break the current depth system.
- Don't exceed the detected moderate motion intensity without a deliberate reason.

## Motion

Motion feels controlled and interface-led across text, layout, and section transitions. Timing clusters around 150ms and 700ms. Easing favors ease and 0. Hover behavior focuses on text and color changes.

**Motion Level:** moderate

**Durations:** 150ms, 700ms

**Easings:** ease, 0, 0.2, 1), cubic-bezier(0.4, cubic-bezier(0

**Hover Patterns:** text, color
