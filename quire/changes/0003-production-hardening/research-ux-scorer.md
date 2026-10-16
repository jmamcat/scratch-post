# Research: readability and UX scorer

Research hand-back for packet P12, 2026-10-16. Sources at the end.

# Design: a 0-100 readability and UX scorer for web UIs, driven by Playwright

I edited no repo files. Package versions and licenses come from `npm view` on 2026-10-16.

## Measurement unit

A **state** is one page plus a viewport (1280x800, 390x844, 320x640), a theme and a colour scheme (`page.emulateMedia({colorScheme})` plus the app's own theme switch; quire has paper, minimal, atlas and things). Each state is scored once the app reports it is ready and `document.fonts.ready` has resolved.

**Metric score** m in [0,1] is a linear ramp `m = clamp((x - poor)/(good - poor), 0, 1)`. Pass-rate metrics are weighted by characters (text) or by element (controls).

**Category score** `C = 100 * Σ w_i m_i / Σ w_i` over applicable metrics. A metric with nothing to measure drops out, as Lighthouse does with not-applicable audits.

**State total** `T = Σ W_c C_c / Σ W_c`. The app total is the mean over states, and the report also shows the lowest state.

## Categories

| # | Category (W) | Metrics, how measured, thresholds | Source |
|---|---|---|---|
| A | Accessibility conformance (30) | `@axe-core/playwright` with tags `wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa`. Scored like Lighthouse: each applicable rule is pass or fail, weighted by impact (critical 10, serious 7, moderate 3, minor 1). `color-contrast` and `target-size` are left out here because B and D score them. | Lighthouse a11y weights (the 10/7/3 groups match axe impact); axe tags |
| B | Contrast (15) | Reuses the fg/bg colour, font size and weight from axe's `color-contrast` results, so text is not walked twice. **WCAG 2.x ratio** (w=2): share of characters at 4.5:1, or 3:1 for large text. **Lc** via Color.js `contrast(…,"APCA")` (w=1, advisory). Lc targets: body text 75 (90 preferred); other readable text 60; large or bold text (24px/700 or 36px/400 and up) 45; placeholder and disabled text 30. The count of axe "incomplete" nodes (gradients, images) is reported. | WCAG 1.4.3; APCA bronze levels |
| C | Text and typography (15) | **Body size**: share of characters ≥16px (good) down to <12px (poor). **Line height** of prose blocks: ≥1.5 good, ≤1.2 poor. **Measure**: characters per line in blocks of 2+ lines, counting lines from `Range.getClientRects()` grouped by top; 45-80 good, ≤25 or ≥110 poor. **Plain language** of UI copy the product owns (help, empty states, errors), English only, ≥100 words, code excluded: Flesch Reading Ease ≥60 good, ≤30 poor; mean sentence length ≤20 words good, ≥30 poor. Flesch-Kincaid grade is reported. For rendered Markdown documents, score typography only and report Flesch without scoring it, because users write that content. | USWDS (16px, 1.5, 45-90 / 66); Baymard 50-75; WCAG 1.4.8 (≤80); Flesch (60 = plain English); WCAG 3.1.5; GOV.UK (25 words) |
| D | Interaction (15) | **Target size**: axe `target-size` rule (wcag22aa tag) plus a share of targets ≥24x24 CSS px or spaced, ≥44 on primary actions advisory. **Focus visible**: Tab through up to 50 elements and pixel-diff a padded crop blurred vs focused (`animations:'disabled'`). Full credit if the changed area is ≥ a 2px perimeter at ≥3:1 change contrast; half credit for any visible change. **Not obscured**: `elementFromPoint` at the focused element's centre returns it or a descendant. **Keyboard reach**: share of visible interactive elements reached by Tab. | WCAG 2.5.8, 2.5.5, 2.4.7, 2.4.11, 2.4.13 |
| E | Structure (10) | axe best-practice rules (`heading-order`, `page-has-heading-one`, `landmark-one-main`, `region`, `landmark-unique`), weighted the same way as A, plus `document-title` and `html-has-lang`. | axe rule list |
| F | Stability and responsiveness (10) | **CLS**: buffered `layout-shift` entries over load plus 2s settle, median of 3 runs; ≤0.1 good, ≥0.25 poor. **Reflow** at 320px: `scrollWidth ≤ innerWidth`. **Text spacing**: inject the 1.4.12 overrides and count clipped text (scroll size > client size where overflow is hidden). **Reduced motion**: with `reducedMotion:'reduce'`, count running `document.getAnimations()` that last over 0ms, and separately count infinite animations without the setting. | web.dev CLS; WCAG 1.4.10, 1.4.12, 2.3.3, 2.2.2 |
| G | Consistency and density (5, judged against the baseline) | Distinct computed font sizes (≤6 good, ≥12 poor). Distinct text colours grouped at ΔE2000 < 2 (≤6 good, ≥14 poor). Share of margin, padding and gap values on a 4px grid (≥90% good, ≤60% poor). Edge density of the screenshot and interactive elements per 1000x1000 px are reported only. **These thresholds are heuristics with no published source**, so use them mainly to see which way a change moved. | Material 4/8dp grid; Rosenholtz 2007 (edge density as a clutter measure); Miniukovich and De Angeli 2015, AIM |

## Gate

1. **Hard checks, in every state:**
   - zero axe critical or serious violations;
   - WCAG contrast at 100%;
   - no reflow failure at 320px;
   - every element reached by Tab shows a visible focus change;
   - no text clipped under the 1.4.12 overrides.
2. **Score floor:** every state total ≥85 and every category ≥70. Lighthouse colours scores 90 and above green, so start at 85 and raise the floor as the baseline improves.
3. **Ratchet against the baseline:** fail if a state total drops more than 1.0, a category drops more than 3.0, or a new violation appears (keyed on rule id plus selector hash). Improvements are re-approved with one command (`ux:approve`), following the module's approved-outputs pattern. This could also become a STEPS.md phrase, for example "Then the UX score of the page is at least 85".

**Baseline file** (`scenarios/ux/baseline.json`, committed):
- `{schema, engines:{axe, colorjs, playwright, chromium}, states:{"page|viewport|theme|scheme":{total, categories:{A:{score, metrics:{id:{raw, score, n}}}}, violations:[…]}}}`.
- The diff report is a Markdown table sorted by points lost from the total (W_c·ΔC_c/ΣW), followed by new and fixed violations with their selectors. Paste it as the evidence for a change.
- If engine versions differ from the baseline, show the deltas without gating on them, and re-baseline in a separate commit.

## Dependencies

| Package | Version | License | Use |
|---|---|---|---|
| @axe-core/playwright | 4.13.0 (2026-08-11) | MPL-2.0 | Engine. 4.14.0 came out 2026-10-15, so it is under two weeks old; upgrade later. |
| axe-core | ~4.13.0 (transitive) | MPL-2.0 | Fine to use unmodified. MPL's copyleft applies per file, so only edited axe files would need publishing. |
| colorjs.io | 0.7.1 | MIT | Colour parsing, APCA 0.0.98G-4g, ΔE2000 |
| syllable | 5.0.1 | MIT (pluralize, normalize-strings: MIT) | Syllable counts. Write Flesch and Flesch-Kincaid ourselves (about 20 lines, public formulas) to control tokenisation. `text-readability` 1.1.1 (ISC) is an alternative. |
| pngjs | 7.0.0 | MIT | Decode screenshots |
| pixelmatch | 7.2.0 | ISC | Focus diffs. 8.0.0 is too new. |

**Rejected:**
- **apca-w3 0.1.9**: "Limited W3 License" (non-commercial, no changes to its constants, field-of-use limits, AGPL fallback). Its helper `colorparsley` is AGPL v3.
- **Pa11y 10.0.0**: LGPL-3.0-only, bundles Puppeteer (a second browser), and uses axe underneath anyway.
- **Lighthouse 13.5.0**: Apache-2.0, so allowed. It would add a CDP port setup and repeat the axe checks, so at most an occasional cross-check.

## Gate vs advisory: contrast

- **Gate on WCAG 2.x.** It is the legal baseline. The WCAG 3 contrast method is still undecided ("yet to be determined", April 2026 draft). APCA was dropped from the drafts in 2023, and WCAG 3 is unlikely to be final before about 2030.
- **Use APCA as advisory only**, through Color.js. Formulas are generally not protected by copyright, but the apca-w3 license says implementations that do not conform breach it, and it controls the "APCA" name. A maintained MIT implementation lowers that risk. Label the result "Lc (APCA 0.0.98G-4g via Color.js)". This is not legal advice.

## Pitfalls

- **Flakiness:** fix the viewport, `deviceScaleFactor: 1`, locale, timezone and seed data. Wait for fonts and the app's ready signal, mask clocks, and take the median of 3 for CLS. Every other metric is deterministic for a given DOM.
- **Dynamic content:** virtualised lists and editors only render what is visible, so measure line length on the rendered reading view, not editor spans. Score menus and dialogs as their own states, because axe only sees what is in the DOM.
- **Themes:** score light and dark for every theme, through both `prefers-color-scheme` and the app's own switch. Add a smoke check with `forcedColors: 'active'`. Colours that are translucent or sit on images often end up as axe "incomplete": report them, never count them as passes.
- **Text:** readability formulas only work for English and are unstable below about 100 words. Exclude `pre`, `code`, tables and URLs. Score structure and size on short labels, not reading ease.
- **Gaming the score:** the hard checks stay binary. Any exclusion (selector or rule) needs a decision record. A high score does not replace a heuristic review by a person.
- **Double counting:** a rule is scored in exactly one category.

## Sources

- axe tags and rules: https://github.com/dequelabs/axe-core/blob/develop/doc/API.md and https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md
- Lighthouse scoring: https://developer.chrome.com/docs/lighthouse/accessibility/scoring and https://developer.chrome.com/docs/lighthouse/performance/performance-scoring
- APCA levels: https://git.apcacontrast.com/documentation/APCA_in_a_Nutshell.html
- apca-w3 license: https://github.com/Myndex/apca-w3/blob/master/LICENSE.md and https://github.com/Myndex/apca-w3/discussions/11
- WCAG 3 contrast status: https://adrianroselli.com/2026/04/wcag3-contrast-as-of-april-2026.html and https://www.w3.org/WAI/news/2026-03-03/wcag3
- Color.js contrast: https://colorjs.io/docs/contrast
- WCAG 2.2 Understanding pages: https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html, https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html, https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html, https://www.w3.org/WAI/WCAG22/Understanding/reflow.html, https://www.w3.org/WAI/WCAG22/Understanding/reading-level.html
- CLS: https://web.dev/articles/cls
- USWDS typography: https://designsystem.digital.gov/components/typography/
- Line length: https://baymard.com/research-articles/line-length-readability and https://journals.uc.edu/index.php/vl/article/view/5765
- GOV.UK sentence length: https://insidegovuk.blog.gov.uk/2014/08/04/sentence-length-why-25-words-is-our-limit/
- Plain-language targets: https://research.wayne.edu/irb/docs/readability_guidance-_tips_for_preparing_easy_to_easy_to_understand_docs9_6_23.pdf
- Rosenholtz 2007 (clutter): https://pubmed.ncbi.nlm.nih.gov/18217832
- Reinecke 2013: https://kgajos.seas.harvard.edu/papers/reinecke13aesthetics.pdf
- Miniukovich and De Angeli 2015: https://iris.unitn.it/handle/11572/116796
- AIM: https://aaltodoc.aalto.fi/items/a5da620f-fcbc-4e88-b0f4-e4143fc7147f
- Playwright emulation: https://playwright.dev/docs/emulation