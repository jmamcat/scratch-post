# UX report

Generated 2026-10-16T19:14:56.190Z by `pnpm -C quire ux`. Engines: axe 4.13.0, Color.js 0.7.1, Playwright 1.56.1, Chromium 141.0.7390.37.
180 states. App total **94.8**, lowest state **89.98** (graph|1280x800|default|dark). WCAG contrast at 100% in 180 of 180 states.

**Gate:** hard checks pass; floors (85 per state, 70 per category) pass; ratchet passes. R-PLT-08 passes.

## Summary

State totals, mean over light and dark and both viewports.

| Screen | default | minimal | things | paper | atlas | Lowest state |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| editor | 95.2 | 95.4 | 95.1 | 94.5 | 93.8 | 91.86 (atlas 1280x800 dark) |
| reading | 95.1 | 95.5 | 95.2 | 95.2 | 93.8 | 91.93 (atlas 1280x800 dark) |
| folders | 96.6 | 96.7 | 96.5 | 95.9 | 95.4 | 93.92 (atlas 1280x800 dark) |
| tags | 96.4 | 96.6 | 96.3 | 95.7 | 95.3 | 93.56 (atlas 1280x800 dark) |
| board | 95.5 | 95.6 | 95.4 | 94.8 | 94.3 | 93.06 (atlas 1280x800 dark) |
| graph | 91.7 | 91.9 | 91.9 | 91.9 | 91.7 | 89.98 (default 1280x800 dark) |
| settings | 93.9 | 94.1 | 93.6 | 93.3 | 92.6 | 90.82 (atlas 1280x800 dark) |
| review | 95.8 | 95.9 | 95.6 | 95.1 | 94.4 | 92.88 (atlas 1280x800 dark) |
| vault-history | 96 | 96.2 | 95.9 | 95.3 | 94.7 | 93.25 (atlas 1280x800 dark) |
| **all** | **95.1** | **95.3** | **95.1** | **94.6** | **94** | **89.98** (graph default 1280x800 dark) |

## Hard checks

| Hard check | States passing | Failing (first three) |
| --- | ---: | --- |
| no critical or serious axe violations | 180 / 180 | - |
| WCAG 2.x text contrast at 100% | 180 / 180 | - |
| no horizontal scrolling at 320 px | 90 / 90 | - |
| every element reached by Tab shows a visible focus change | 180 / 180 | - |
| no text clipped under the WCAG 1.4.12 overrides | 180 / 180 | - |

## Categories

| Category (weight) | Mean | Lowest | Lowest state |
| --- | ---: | ---: | --- |
| A Accessibility conformance (30) | 100 | 100 | editor|1280x800|default|light |
| B Contrast (15) | 95.2 | 76.47 | graph|1280x800|default|dark |
| C Text and typography (15) | 87.9 | 74.5 | graph|1280x800|default|light |
| D Interaction (15) | 96.1 | 88 | editor|1280x800|default|dark |
| E Structure (10) | 100 | 100 | editor|1280x800|default|light |
| F Stability and responsiveness (10) | 100 | 100 | editor|1280x800|default|light |
| G Consistency and density (5) | 59.1 | 41.67 | settings|1280x800|things|dark |

## Against the baseline

The ratchet fails when a state total drops more than 1, a category more than 3, or a new violation appears.

No state total moved.

### New violations

None.

### Fixed violations

None.

## Violations by rule

| Rule | Category | Impact | States | Example selector |
| --- | --- | --- | ---: | --- |
| none | | | | |

## Lowest states

### graph|1280x800|default|dark: 89.98

- **A** 100: 15 more rules pass
- **B** 76.47: wcag-ratio 100 → 100; apca-lc 29.41 → 29 (advisory)
- **C** 74.5: body-size 74.5 → 75; line-height -; measure -
- **D** 93.33: target-size 0 of 4 too small → 100; focus-visible 83.3 → 83; not-obscured 0 obscured → 100; keyboard-reach 9 of 9 → 100
- **E** 100: 7 more rules pass
- **F** 100: cls 0 → 100; text-spacing 0 → 100; reduced-motion 0 → 100; endless-motion 0 → 100
- **G** 66.67: font-sizes 2 → 100; text-colours 3 → 100; spacing-grid 18.8 → 0
- reported: contrast-incomplete 5; ui-words 1; tab-stops 9; edge-density 0.0037; interactive-per-mpx 8.8; axe-incomplete-rules 0

### graph|390x844|default|dark: 89.98

- **A** 100: 15 more rules pass
- **B** 76.47: wcag-ratio 100 → 100; apca-lc 29.41 → 29 (advisory)
- **C** 74.5: body-size 74.5 → 75; line-height -; measure -
- **D** 93.33: target-size 0 of 4 too small → 100; focus-visible 83.3 → 83; not-obscured 0 obscured → 100; keyboard-reach 9 of 9 → 100
- **E** 100: 7 more rules pass
- **F** 100: cls 0 → 100; text-spacing 0 → 100; reduced-motion 0 → 100; endless-motion 0 → 100; reflow pass → 100
- **G** 66.67: font-sizes 2 → 100; text-colours 3 → 100; spacing-grid 18.8 → 0
- reported: contrast-incomplete 5; ui-words 1; tab-stops 9; edge-density 0.0116; interactive-per-mpx 27.3; axe-incomplete-rules 0

### graph|1280x800|atlas|dark: 89.98

- **A** 100: 15 more rules pass
- **B** 76.47: wcag-ratio 100 → 100; apca-lc 29.41 → 29 (advisory)
- **C** 74.5: body-size 74.5 → 75; line-height -; measure -
- **D** 93.33: target-size 0 of 4 too small → 100; focus-visible 83.3 → 83; not-obscured 0 obscured → 100; keyboard-reach 9 of 9 → 100
- **E** 100: 7 more rules pass
- **F** 100: cls 0 → 100; text-spacing 0 → 100; reduced-motion 0 → 100; endless-motion 0 → 100
- **G** 66.67: font-sizes 2 → 100; text-colours 3 → 100; spacing-grid 18.8 → 0
- reported: contrast-incomplete 5; ui-words 1; tab-stops 9; edge-density 0.0037; interactive-per-mpx 8.8; axe-incomplete-rules 0

### graph|390x844|atlas|dark: 89.98

- **A** 100: 15 more rules pass
- **B** 76.47: wcag-ratio 100 → 100; apca-lc 29.41 → 29 (advisory)
- **C** 74.5: body-size 74.5 → 75; line-height -; measure -
- **D** 93.33: target-size 0 of 4 too small → 100; focus-visible 83.3 → 83; not-obscured 0 obscured → 100; keyboard-reach 9 of 9 → 100
- **E** 100: 7 more rules pass
- **F** 100: cls 0 → 100; text-spacing 0 → 100; reduced-motion 0 → 100; endless-motion 0 → 100; reflow pass → 100
- **G** 66.67: font-sizes 2 → 100; text-colours 3 → 100; spacing-grid 18.8 → 0
- reported: contrast-incomplete 5; ui-words 1; tab-stops 9; edge-density 0.0115; interactive-per-mpx 27.3; axe-incomplete-rules 0

### graph|1280x800|minimal|dark: 90.31

- **A** 100: 15 more rules pass
- **B** 76.47: wcag-ratio 100 → 100; apca-lc 29.41 → 29 (advisory)
- **C** 74.5: body-size 74.5 → 75; line-height -; measure -
- **D** 95.56: target-size 0 of 4 too small → 100; focus-visible 88.9 → 89; not-obscured 0 obscured → 100; keyboard-reach 9 of 9 → 100
- **E** 100: 7 more rules pass
- **F** 100: cls 0 → 100; text-spacing 0 → 100; reduced-motion 0 → 100; endless-motion 0 → 100
- **G** 66.67: font-sizes 2 → 100; text-colours 3 → 100; spacing-grid 18.8 → 0
- reported: contrast-incomplete 5; ui-words 1; tab-stops 9; edge-density 0.0038; interactive-per-mpx 8.8; axe-incomplete-rules 0

