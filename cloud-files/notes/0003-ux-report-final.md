# UX report

Generated 2026-10-16T17:06:38.793Z by `pnpm -C quire ux`. Engines: axe 4.13.0, Color.js 0.7.1, Playwright 1.56.1, Chromium 141.0.7390.37.
180 states. App total **89.1**, lowest state **75.85** (graph|1280x800|default|dark). WCAG contrast at 100% in 180 of 180 states.

**Gate:** hard checks fail in 160 states; floors (85 per state, 70 per category) fail 96 times; ratchet passes. R-PLT-08 fails.

## Summary

State totals, mean over light and dark and both viewports.

| Screen | default | minimal | things | paper | atlas | Lowest state |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| editor | 91.9 | 92.4 | 92.1 | 91.5 | 91.4 | 89.8 (atlas 1280x800 dark) |
| reading | 93.3 | 93.9 | 93.7 | 93.7 | 92.6 | 91.07 (atlas 1280x800 dark) |
| folders | 91.5 | 92.5 | 92.3 | 91.7 | 91.3 | 90.29 (default 390x844 dark) |
| tags | 91.5 | 92.2 | 91.9 | 91.4 | 90.8 | 90.26 (default 390x844 dark) |
| board | 92 | 92.5 | 92.3 | 91.7 | 91.1 | 90.73 (default 390x844 dark) |
| graph | 78 | 78.8 | 78.6 | 78.6 | 78.7 | 75.85 (default 1280x800 dark) |
| settings | 89.7 | 89.9 | 89.5 | 89.2 | 88.6 | 86.87 (atlas 1280x800 dark) |
| review | 86.8 | 86.9 | 86.7 | 86.1 | 85.6 | 84.65 (atlas 1280x800 dark) |
| vault-history | 87.4 | 87.7 | 87.5 | 86.9 | 86.4 | 85.44 (atlas 1280x800 dark) |
| **all** | **89.1** | **89.7** | **89.4** | **89** | **88.5** | **75.85** (graph default 1280x800 dark) |

## Hard checks

| Hard check | States passing | Failing (first three) |
| --- | ---: | --- |
| no critical or serious axe violations | 20 / 180 | editor|1280x800|default|light: 1: scrollable-region-focusable<br>editor|390x844|default|light: 1: scrollable-region-focusable<br>editor|1280x800|default|dark: 1: scrollable-region-focusable |
| WCAG 2.x text contrast at 100% | 180 / 180 | - |
| no horizontal scrolling at 320 px | 90 / 90 | - |
| every element reached by Tab shows a visible focus change | 100 / 180 | folders|390x844|default|light: 4 of 21 reached elements show no focus change: #root button[aria-label="Switch to reading view"]; #root input[aria-label="Note title"]; #root div[aria-label="Note editor"]<br>folders|390x844|default|dark: 4 of 21 reached elements show no focus change: #root button[aria-label="Switch to reading view"]; #root input[aria-label="Note title"]; #root div[aria-label="Note editor"]<br>folders|390x844|minimal|light: 4 of 21 reached elements show no focus change: #root button[aria-label="Switch to reading view"]; #root input[aria-label="Note title"]; #root div[aria-label="Note editor"] |
| no text clipped under the WCAG 1.4.12 overrides | 180 / 180 | - |

## Categories

| Category (weight) | Mean | Lowest | Lowest state |
| --- | ---: | ---: | --- |
| A Accessibility conformance (30) | 96.4 | 95.33 | editor|390x844|default|light |
| B Contrast (15) | 95 | 66.67 | graph|1280x800|default|dark |
| C Text and typography (15) | 79.5 | 0 | graph|1280x800|default|light |
| D Interaction (15) | 77.4 | 44 | review|390x844|default|light |
| E Structure (10) | 95.6 | 88.46 | editor|1280x800|default|light |
| F Stability and responsiveness (10) | 100 | 100 | editor|1280x800|default|light |
| G Consistency and density (5) | 57.2 | 41.67 | settings|1280x800|things|dark |

## Under the floors

| State | What | Score |
| --- | --- | ---: |
| folders|390x844|default|light | D Interaction | 68.57 |
| folders|390x844|default|dark | D Interaction | 69.52 |
| folders|390x844|minimal|light | D Interaction | 69.52 |
| folders|390x844|things|light | D Interaction | 69.52 |
| folders|390x844|paper|light | D Interaction | 69.52 |
| graph|1280x800|default|light | total | 80.18 |
| graph|1280x800|default|light | C Text and typography | 0 |
| graph|390x844|default|light | total | 80.18 |
| graph|390x844|default|light | C Text and typography | 0 |
| graph|1280x800|default|dark | total | 75.85 |
| graph|1280x800|default|dark | B Contrast | 66.67 |
| graph|1280x800|default|dark | C Text and typography | 0 |
| graph|390x844|default|dark | total | 75.85 |
| graph|390x844|default|dark | B Contrast | 66.67 |
| graph|390x844|default|dark | C Text and typography | 0 |
| graph|1280x800|minimal|light | total | 80.51 |
| graph|1280x800|minimal|light | C Text and typography | 0 |
| graph|390x844|minimal|light | total | 80.18 |
| graph|390x844|minimal|light | C Text and typography | 0 |
| graph|1280x800|minimal|dark | total | 77.18 |
| graph|1280x800|minimal|dark | B Contrast | 66.67 |
| graph|1280x800|minimal|dark | C Text and typography | 0 |
| graph|390x844|minimal|dark | total | 77.18 |
| graph|390x844|minimal|dark | B Contrast | 66.67 |
| graph|390x844|minimal|dark | C Text and typography | 0 |
| graph|1280x800|things|light | total | 80.51 |
| graph|1280x800|things|light | C Text and typography | 0 |
| graph|390x844|things|light | total | 80.18 |
| graph|390x844|things|light | C Text and typography | 0 |
| graph|1280x800|things|dark | total | 76.85 |
| graph|1280x800|things|dark | B Contrast | 66.67 |
| graph|1280x800|things|dark | C Text and typography | 0 |
| graph|390x844|things|dark | total | 76.85 |
| graph|390x844|things|dark | B Contrast | 66.67 |
| graph|390x844|things|dark | C Text and typography | 0 |
| graph|1280x800|paper|light | total | 80.18 |
| graph|1280x800|paper|light | C Text and typography | 0 |
| graph|390x844|paper|light | total | 79.85 |
| graph|390x844|paper|light | C Text and typography | 0 |
| graph|1280x800|paper|dark | total | 77.18 |
| graph|1280x800|paper|dark | B Contrast | 66.67 |
| graph|1280x800|paper|dark | C Text and typography | 0 |
| graph|390x844|paper|dark | total | 77.18 |
| graph|390x844|paper|dark | B Contrast | 66.67 |
| graph|390x844|paper|dark | C Text and typography | 0 |
| graph|1280x800|atlas|light | total | 80.85 |
| graph|1280x800|atlas|light | C Text and typography | 0 |
| graph|390x844|atlas|light | total | 80.85 |
| graph|390x844|atlas|light | C Text and typography | 0 |
| graph|1280x800|atlas|dark | total | 76.51 |
| graph|1280x800|atlas|dark | B Contrast | 66.67 |
| graph|1280x800|atlas|dark | C Text and typography | 0 |
| graph|390x844|atlas|dark | total | 76.51 |
| graph|390x844|atlas|dark | B Contrast | 66.67 |
| graph|390x844|atlas|dark | C Text and typography | 0 |
| review|1280x800|default|light | D Interaction | 51.25 |
| review|390x844|default|light | D Interaction | 44 |
| review|1280x800|default|dark | D Interaction | 52.5 |
| review|390x844|default|dark | D Interaction | 46 |
| review|1280x800|minimal|light | D Interaction | 51.25 |
| … 36 more | | |

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
| scrollable-region-focusable | A | serious | 140 | `.cm-scroller` |
| focus-obscured | D | moderate | 90 | `#root button[aria-label="Switch to reading view"]` |
| focus-visible | D | serious | 80 | `#root button[aria-label="Switch to reading view"]` |
| page-has-heading-one | E | moderate | 70 | `html` |
| link-in-text-block | A | serious | 20 | `p > .internal-link[data-path="Projects/Alpha.md"][href$="#/Projects/Alpha.md"]` |

## Lowest states

### graph|1280x800|default|dark: 75.85

- **A** 100: 15 more rules pass
- **B** 66.67: wcag-ratio 100 → 100; apca-lc 0 → 0 (advisory)
- **C** 0: body-size 0 → 0; line-height -; measure -
- **D** 91.11: target-size 0 of 4 too small → 100; focus-visible 77.8 → 78; not-obscured 0 obscured → 100; keyboard-reach 9 of 9 → 100
- **E** 88.46: page-has-heading-one 1 failing → 0; 5 more rules pass
- **F** 100: cls 0 → 100; text-spacing 0 → 100; reduced-motion 0 → 100; endless-motion 0 → 100
- **G** 66.67: font-sizes 2 → 100; text-colours 3 → 100; spacing-grid 18.8 → 0
- reported: contrast-incomplete 5; ui-words 1; tab-stops 9; edge-density 0.0024; interactive-per-mpx 8.8; axe-incomplete-rules 0

### graph|390x844|default|dark: 75.85

- **A** 100: 15 more rules pass
- **B** 66.67: wcag-ratio 100 → 100; apca-lc 0 → 0 (advisory)
- **C** 0: body-size 0 → 0; line-height -; measure -
- **D** 91.11: target-size 0 of 4 too small → 100; focus-visible 77.8 → 78; not-obscured 0 obscured → 100; keyboard-reach 9 of 9 → 100
- **E** 88.46: page-has-heading-one 1 failing → 0; 5 more rules pass
- **F** 100: cls 0 → 100; text-spacing 0 → 100; reduced-motion 0 → 100; endless-motion 0 → 100; reflow pass → 100
- **G** 66.67: font-sizes 2 → 100; text-colours 3 → 100; spacing-grid 18.8 → 0
- reported: contrast-incomplete 5; ui-words 1; tab-stops 9; edge-density 0.0075; interactive-per-mpx 27.3; axe-incomplete-rules 0

### graph|1280x800|atlas|dark: 76.51

- **A** 100: 15 more rules pass
- **B** 66.67: wcag-ratio 100 → 100; apca-lc 0 → 0 (advisory)
- **C** 0: body-size 0 → 0; line-height -; measure -
- **D** 95.56: target-size 0 of 4 too small → 100; focus-visible 88.9 → 89; not-obscured 0 obscured → 100; keyboard-reach 9 of 9 → 100
- **E** 88.46: page-has-heading-one 1 failing → 0; 5 more rules pass
- **F** 100: cls 0 → 100; text-spacing 0 → 100; reduced-motion 0 → 100; endless-motion 0 → 100
- **G** 66.67: font-sizes 2 → 100; text-colours 3 → 100; spacing-grid 18.8 → 0
- reported: contrast-incomplete 5; ui-words 1; tab-stops 9; edge-density 0.0024; interactive-per-mpx 8.8; axe-incomplete-rules 0

### graph|390x844|atlas|dark: 76.51

- **A** 100: 15 more rules pass
- **B** 66.67: wcag-ratio 100 → 100; apca-lc 0 → 0 (advisory)
- **C** 0: body-size 0 → 0; line-height -; measure -
- **D** 95.56: target-size 0 of 4 too small → 100; focus-visible 88.9 → 89; not-obscured 0 obscured → 100; keyboard-reach 9 of 9 → 100
- **E** 88.46: page-has-heading-one 1 failing → 0; 5 more rules pass
- **F** 100: cls 0 → 100; text-spacing 0 → 100; reduced-motion 0 → 100; endless-motion 0 → 100; reflow pass → 100
- **G** 66.67: font-sizes 2 → 100; text-colours 3 → 100; spacing-grid 18.8 → 0
- reported: contrast-incomplete 5; ui-words 1; tab-stops 9; edge-density 0.0076; interactive-per-mpx 27.3; axe-incomplete-rules 0

### graph|1280x800|things|dark: 76.85

- **A** 100: 15 more rules pass
- **B** 66.67: wcag-ratio 100 → 100; apca-lc 0 → 0 (advisory)
- **C** 0: body-size 0 → 0; line-height -; measure -
- **D** 97.78: target-size 0 of 4 too small → 100; focus-visible 94.4 → 94; not-obscured 0 obscured → 100; keyboard-reach 9 of 9 → 100
- **E** 88.46: page-has-heading-one 1 failing → 0; 5 more rules pass
- **F** 100: cls 0 → 100; text-spacing 0 → 100; reduced-motion 0 → 100; endless-motion 0 → 100
- **G** 66.67: font-sizes 2 → 100; text-colours 3 → 100; spacing-grid 18.8 → 0
- reported: contrast-incomplete 5; ui-words 1; tab-stops 9; edge-density 0.0024; interactive-per-mpx 8.8; axe-incomplete-rules 0

