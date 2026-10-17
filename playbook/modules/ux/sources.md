# Sources (ux module)

Researched 2026-10-16. Package versions and licences were read from `npm view` on that date.

## Rules, thresholds and formulas

| Source | Supports |
| --- | --- |
| axe-core API and rule list: https://github.com/dequelabs/axe-core/blob/develop/doc/API.md, https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md | Tags `wcag2a` to `wcag22aa`; the rules in A and E; rule impacts; `color-contrast` data reused by B; `target-size` in D |
| Lighthouse accessibility scoring: https://developer.chrome.com/docs/lighthouse/accessibility/scoring | Pass or fail per rule, weighted by impact (10/7/3/1 groups); not-applicable rules drop out |
| Lighthouse performance scoring: https://developer.chrome.com/docs/lighthouse/performance/performance-scoring | 90 and up is "good", so the floor starts at 85 and rises |
| WCAG 2.2 Understanding pages: https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html, https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html, https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html, https://www.w3.org/WAI/WCAG22/Understanding/reflow.html, https://www.w3.org/WAI/WCAG22/Understanding/reading-level.html | 24 px targets (2.5.8) and 44 px (2.5.5); the 2 px perimeter at 3:1 focus test (2.4.13), focus visible (2.4.7) and not obscured (2.4.11); the 1.4.12 overrides; 320 px reflow (1.4.10); reading level (3.1.5); 80-character lines (1.4.8) |
| WCAG 3 contrast status: https://adrianroselli.com/2026/04/wcag3-contrast-as-of-april-2026.html, https://www.w3.org/WAI/news/2026-03-03/wcag3 | Why the gate is WCAG 2.x and APCA is advisory: the WCAG 3 contrast method is still undecided |
| APCA levels: https://git.apcacontrast.com/documentation/APCA_in_a_Nutshell.html | Lc targets 75 / 60 / 45 / 30 |
| apca-w3 licence: https://github.com/Myndex/apca-w3/blob/master/LICENSE.md, https://github.com/Myndex/apca-w3/discussions/11 | Why `apca-w3` is not used (non-commercial, AGPL helper) |
| Color.js contrast: https://colorjs.io/docs/contrast | APCA 0.0.98G-4g and ΔE2000 in a maintained MIT library |
| CLS: https://web.dev/articles/cls | Session windows; 0.1 good, 0.25 poor |
| USWDS typography: https://designsystem.digital.gov/components/typography/ | 16 px body text, line height 1.5, line length 45-90 (66 ideal) |
| Line length: https://baymard.com/research-articles/line-length-readability, https://journals.uc.edu/index.php/vl/article/view/5765 | 50-75 characters per line |
| GOV.UK sentence length: https://insidegovuk.blog.gov.uk/2014/08/04/sentence-length-why-25-words-is-our-limit/ | Sentence length limits for plain language |
| Plain-language targets: https://research.wayne.edu/irb/docs/readability_guidance-_tips_for_preparing_easy_to_easy_to_understand_docs9_6_23.pdf | Flesch Reading Ease 60 as plain English |
| Rosenholtz 2007: https://pubmed.ncbi.nlm.nih.gov/18217832 | Edge density as a clutter measure (G, reported only) |
| Reinecke 2013: https://kgajos.seas.harvard.edu/papers/reinecke13aesthetics.pdf | Visual complexity and colourfulness predict first impressions (G is a heuristic) |
| Miniukovich and De Angeli 2015: https://iris.unitn.it/handle/11572/116796; AIM: https://aaltodoc.aalto.fi/items/a5da620f-fcbc-4e88-b0f4-e4143fc7147f | Computational aesthetics metrics; no agreed thresholds, so G is judged against the baseline |
| Material 4/8 dp grid | The 4 px spacing grid in G |
| Playwright emulation: https://playwright.dev/docs/emulation | `colorScheme`, `reducedMotion`, `forcedColors`, viewport and scale emulation |

## Engines

| Package | Version | Licence | Use |
| --- | --- | --- | --- |
| @axe-core/playwright, axe-core | 4.13.0 | MPL-2.0 | Rule engine, used unmodified (MPL copyleft is per file) |
| colorjs.io | 0.7.1 | MIT | Colour parsing, APCA, ΔE2000 |
| syllable | 5.0.1 | MIT | Syllable counts; Flesch and Flesch-Kincaid are computed by the runner |
| pngjs | 7.0.0 | MIT | Decoding screenshots |
| pixelmatch | 7.2.0 | ISC | Focus diffs |

Rejected: `apca-w3` 0.1.9 (Limited W3 licence, AGPL helper), Pa11y 10 (LGPL, bundles a
second browser, runs axe anyway), Lighthouse 13 (Apache-2.0, allowed, but repeats the axe
checks and needs a CDP port; at most an occasional cross-check).
