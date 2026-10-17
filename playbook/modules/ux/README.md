# Module: ux

A 0-100 readability and UX score for a web UI, with hard checks, floors and a ratchet
against an approved baseline, so an agent can measure a UI change and paste the evidence
instead of describing it. It is driven by a browser automation tool (Playwright or
equivalent) and runs locally as its own gate (`ux` in `playbook.yaml`).

Use it whenever the project has a UI. It does not replace a heuristic review by a person: a
high score means no known rule fails, not that the screen is good. Sources in `sources.md`.

## States

A **state** is one screen at one viewport, in one theme and one colour scheme. Score:

- every **standard screen** the product names in its spec (editor, list views, settings,
  dialogs, ...). Menus, dialogs and drawers are their own states: rule engines only see what
  is in the DOM;
- at **1280x800 and 390x844**, plus a **320 px reflow check** run from the narrow state
  (narrow the viewport, measure, restore);
- in **every theme, light and dark**, through both `prefers-color-scheme` and the app's own
  theme switch.

Fix the viewport, `deviceScaleFactor: 1`, locale, time zone and seed data. Score a state only
once the app reports it is ready, fonts have loaded, a settle time has passed (1 s) and the
DOM has been quiet for 400 ms. A state id is `screen|viewport|theme|scheme`.

## Categories and weights

| # | Category (weight) | Metrics (weight inside the category) |
| --- | --- | --- |
| A | Accessibility conformance (30) | axe-core rules tagged `wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa`, each pass or fail, weighted by impact (critical 10, serious 7, moderate 3, minor 1) as Lighthouse does. Rules another category scores are left out. |
| B | Contrast (15) | **WCAG 2.x ratio** (2): share of characters at 4.5:1, or 3:1 for large text, from axe's `color-contrast` data. **APCA Lc** (1, advisory) via a maintained MIT implementation: body text 75, other text 60, large or bold text (24 px/700, 36 px/400) 45, placeholder and disabled 30. Nodes axe cannot decide (gradients, images) are reported, never passed. |
| C | Text and typography (15) | **Body size** (1): per character, 16 px and up 1, under 12 px 0. **Line height** (1) of blocks of 2+ lines: 1.5 good, 1.2 poor. **Measure** (1): characters per full line, 45-80 good, 25 or 110 poor. **Plain language** (1 each) of UI copy the product owns, English, 100 words or more, code left out: Flesch Reading Ease 60 good, 30 poor; mean sentence length 20 good, 30 poor. Content the user wrote gets typography only; its Flesch score is reported. |
| D | Interaction (15) | **Target size** (1): axe `target-size` (24 px or spaced); 44 px on primary actions reported. **Focus visible** (2): Tab through up to 50 stops; compare a padded crop focused and unfocused; full credit when pixels changed at 3:1 or more cover a 2 px perimeter, half for any visible change. **Not obscured** (1): the focused element is on screen and on top at its centre. **Keyboard reach** (1): share of visible interactive elements Tab reaches (wrapping past the end of the page once). |
| E | Structure (10) | axe `heading-order`, `page-has-heading-one`, `landmark-one-main`, `region`, `landmark-unique`, `document-title`, `html-has-lang`, weighted like A. |
| F | Stability and responsiveness (10) | **CLS** (1): largest session window of shifts without recent input since load, 0.1 good, 0.25 poor. **Reflow** (1, narrow states): no sideways scrolling and no text past the right edge at 320 px, except inside boxes that scroll sideways. **Text spacing** (1): elements newly cut off under the WCAG 1.4.12 overrides, 0 good, 5 poor. **Reduced motion** (1): animations still running with `reduce`, 0 good, 3 poor. **Endless motion** (1): infinite animations without it, 0 good, 2 poor. |
| G | Consistency and density (5) | Distinct font sizes (6 good, 12 poor), distinct text colours grouped at ΔE2000 < 2 (6 good, 14 poor), share of margins, paddings and gaps on a 4 px grid (90% good, 60% poor). Edge density of the screenshot and interactive elements per megapixel are reported. **No published thresholds:** read G against the baseline, to see which way a change moved. |

A rule or metric is scored in exactly one category.

## Score

- **Metric**: a linear ramp `m = clamp((x - poor) / (good - poor), 0, 1)`, or a band (good
  between two values, falling to 0 at two poor values). Pass-rate metrics are weighted by
  characters (text) or elements (controls).
- **Category**: `C = 100 * sum(w_i * m_i) / sum(w_i)` over metrics that measured something;
  a metric with nothing to measure drops out, as Lighthouse does with not-applicable audits.
- **State total**: `T = sum(W_c * C_c) / sum(W_c)` over categories that applied.
- **App**: the mean of the state totals, and the lowest state, always shown together.

## Gate

1. **Hard checks**, in every state, binary:
   - no critical or serious axe violation (any scored rule);
   - WCAG 2.x text contrast at 100% (gate on WCAG 2.x; APCA stays advisory while the WCAG 3
     contrast method is undecided);
   - no reflow failure at 320 px;
   - every element reached by Tab shows a visible focus change;
   - no text cut off under the 1.4.12 text-spacing overrides.
2. **Floors**: every state total at least 85, every category A to F at least 70. G is not
   floored. Raise the floors as the baseline improves.
3. **Ratchet** against the committed baseline: fail when a state total drops more than 1.0,
   a category more than 3.0, or a new violation appears (keyed on rule id plus a hash of the
   selector). Every hard-check failure is also a violation, so a new one always fails the
   ratchet. If the engine versions differ from the baseline, show the deltas without gating
   and re-baseline in a separate commit.

The project's `ux` gate runs the ratchet over the full matrix, so it stays green while known
failures are being fixed and turns red on any regression. The spec requirement for the UX gate
(a scenario) runs all three parts on a subset that fits the everyday scenarios gate (for
example every theme and scheme at the desktop viewport, the phone viewport in one theme, one
CLS sample), against the same baseline.

## Baseline

`baseline.json` is committed next to the runner:
`{schema, engines: {axe, colorjs, playwright, chromium}, states: {"<state id>": {total, violations: [keys], categories: {A: {score, metrics: {id: {raw, score, n}}}}}}}`.
Axe rules that pass are counted, not listed. One line per state and category keeps a
re-approval readable as a diff.

**The baseline is only as portable as the fonts.** A font stack that names system fonts
resolves differently on each machine. Line length, line count and wrapping then move with
it, and so does every text metric. Install in CI the fonts that the machine which approved
the baseline used (or ship the font with the product), and name them in the CI file next
to the install step (amendment 0010).

**Approving a new baseline** follows the scenarios module's approved-outputs pattern:

1. Run the gate (`ux`) and read the report: every change in it must be intended.
2. Run the approve command (`ux:approve`); it refuses a run narrowed to some themes or
   screens, because the baseline must cover every state.
3. Commit the baseline with the change that caused it, and paste the report's summary and
   "Against the baseline" tables into the packet as evidence.

## Evidence

A change that touches the UI pastes, under its Acceptance:

- the summary table (per screen and theme totals, the lowest state);
- the hard-check table and what still fails;
- the "Against the baseline" table (states sorted by points lost, with the categories that
  moved) and the new and fixed violations.

For a playbook amendment about UX ("this rule is wrong", "this threshold is too strict"),
the evidence is a report from at least two products or two themes showing the rule
misjudging a screen a person would accept, plus the source the new threshold comes from.
A score alone is never evidence that a threshold is right.

## Pitfalls

- **Flakiness.** Fixed viewport, scale, locale, time zone and seed data; wait for the app's
  ready signal, fonts and a quiet DOM; stop CSS animations and transitions and hide the caret
  while taking screenshots; give text fields and editors a moment after each Tab to draw
  their own cursor. Take CLS as the median of three loads. Give every parallel worker its own
  server: shared state (another worker's device showing as a live collaborator) changes what
  is on screen. Run the gate twice after approving: "No state total moved" is the check that
  the runner is deterministic.
- **Dynamic content.** Virtualised lists and editors only render what is visible: measure
  line length on rendered blocks, and score menus and dialogs as their own states.
- **Widgets that keep Tab** (code editors): the runner presses the widget's documented way
  out (Escape, then Tab) and reports a trap if focus still does not move.
- **Themes.** Translucent colours and text on images often come back from axe as
  "incomplete": report them, never count them as passes. A forced-colours smoke check
  (`forcedColors: 'active'`) is worth adding once the basics pass.
- **Text.** Readability formulas only work for English and are unstable under about 100
  words. Leave out `pre`, `code`, tables and URLs. Score size and structure on short labels,
  not reading ease.
- **Gaming the score.** The hard checks stay binary. Excluding a rule or a selector needs a
  decision record saying why the rule does not apply.
- **Double counting.** Each rule belongs to one category (`color-contrast` to B,
  `target-size` to D, the structure rules to E).
- **Licences.** Use maintained, permissively licensed engines (axe-core MPL-2.0 unmodified,
  Color.js MIT). Do not use `apca-w3` (non-commercial licence) or bundle a second browser.

## Layout in a project

Example, from the Quire project: `quire/scenarios/ux/` holds the library (`score.ts` with
`scoreState(page, state)` and `scoreApp(page, app)`, one file per category in `categories/`,
`gate.ts`, `report.ts`), the product's screen list (`quire.ts`: themes, viewports, how to open
each screen), the runner (`playwright.config.ts`, `score.ux.ts`, `report.ux.ts`) and
`baseline.json`; `pnpm -C quire ux` writes `report.md` (gitignored). The step for the spec's
UX scenario calls the same library.
