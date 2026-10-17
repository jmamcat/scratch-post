---
id: 0003-production-hardening/P12
title: UX scorer tooling, playbook module, contrast fixes
lane: H
depends_on: [P00]
owns:
  - quire/scenarios/ux/**
  - quire/scenarios/steps/ux.steps.ts
  - playbook/modules/ux/**
borrows:
  - quire/package.json  # scripts: ux, ux:approve
  - quire/apps/web/src/platforms/themes/*.css  # colour changes for contrast only
  - quire/apps/web/src/styles.css  # colour variables for contrast only
  - .gitignore  # the UX report output
reads:
  - quire/changes/0003-production-hardening/research-ux-scorer.md
  - quire/changes/0003-production-hardening/**
  - quire/spec/**
  - quire/apps/web/**
  - quire/scenarios/**
  - quire/demo/**
  - playbook/**
size: M
revision: 1
status: done
claimed_by: claude-code/tier-A
---

# UX scorer

## Context

The owner asked for common tooling that judges readability and UX, so agents can measure and
improve with evidence. Research is done: `research-ux-scorer.md` in this change (categories
A to G, the formula, the gate, the baseline ratchet, dependencies, pitfalls, sources). Build
it in two parts: a **project-agnostic playbook module** that describes the method so any
project can adopt it, and **Quire's runner** that implements it with Playwright. Then fix
colour contrast in every theme (the Default dark primary button is 3.3:1, D-P05-6 of 0002).
P00 added the dependencies to `quire/scenarios/package.json`: `@axe-core/playwright` 4.13.0,
`colorjs.io` 0.7.1, `syllable` 5.0.1, `pngjs` 7.0.0, `pixelmatch` 7.2.0.

R-PLT-08 (the full gate over every screen) is the last packet's job (P14, after every screen
exists); this packet makes the tool, the baseline and contrast.

## Contract

- `playbook/modules/ux/README.md` (the method: states, categories and weights, metric
  ramps, score formula, hard checks, floors, the baseline ratchet, what counts as evidence
  for an amendment, how to approve a new baseline, pitfalls) and `sources.md` (the research
  sources, with what each supports). Project-agnostic: no Quire paths in the README except
  as an example.
- `quire/scenarios/ux/`: a library `scoreState(page, state) -> StateScore` and
  `scoreApp(...)`, one file per category, a runner script (`pnpm -C quire ux`: start a cloud
  server with the demo seed, open the standard screens that exist (editor, reading view,
  sidebar views Folders/Tags/Board, graph, settings, review inbox, vault history when
  present) in every theme, light and dark, at 1280x800 and 390x844, plus the 320 px reflow
  check; write `quire/scenarios/ux/report.md` (gitignored) and compare with
  `quire/scenarios/ux/baseline.json` (committed)), and `pnpm -C quire ux:approve` to write the
  baseline. Per the research: gate on WCAG 2.x contrast, APCA advisory only.
- `quire/scenarios/steps/ux.steps.ts`: `device "d" with the demo notes` and `in every theme the
  standard screens on "d" pass the UX gate` (raise the test timeout inside the step; run the
  same library as the runner).
- Contrast: after this packet, the WCAG contrast hard check passes in every theme, light and
  dark, on every screen the runner covers. Change colour values only.

## Acceptance

```sh
export QUIRE_WEB_DIST=/tmp/quire-web-P12
pnpm -C quire --filter @quire/web exec vite build --outDir "$QUIRE_WEB_DIST" --emptyOutDir
playbook/bin/gate.sh check
playbook/bin/gate.sh ux
playbook/bin/gate.sh scenarios "@R-PLT-05"
```

`gate.sh ux` produces a report, shows contrast at 100% in every state, and the baseline is
written. Paste the report's summary table (per screen and theme totals, lowest state) under
Acceptance. R-PLT-08 may still fail on other hard checks; list what fails.


### Result (2026-10-16)

- `vite build` into `/tmp/quire-web-P12`: built.
- `gate.sh check`: types pass, no dependency violations (251 modules), structure 0 violations (5 soft-limit warnings in files this packet does not touch).
- `gate.sh ux`: passes (11 tests: 10 theme and scheme runs, 1 report; about 10 minutes). 180 states (9 screens, 5 themes, light and dark, 1280x800 and 390x844, reflow at 320 px from the 390 states). **WCAG contrast at 100% in 180 of 180 states.** Against the approved baseline (`quire/scenarios/ux/baseline.json`, written by `ux:approve`): "No state total moved", no new violations, no fixed violations. Two more check runs after approving gave the same result.
- `gate.sh scenarios "@R-PLT-05"`: 2 passed (Pick a theme; Heading levels look different in every theme).
- `gate.sh scenarios "@R-PLT-08"` (not in this packet's Acceptance, run to try the step): runs in 6.8 minutes, 99 states, contrast 100% in 99 of 99, ratchet passes against the runner's baseline, and fails on the known hard checks and floors below (P14's job).

Summary table from `report.md` (state totals, mean over light and dark and both viewports):

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

Hard checks: contrast 180/180, reflow at 320 px 90/90, text spacing 180/180; **no serious axe violations 20/180** and **focus visible 100/180** still fail.

What R-PLT-08 still fails on (for P14):

- `scrollable-region-focusable` (A, serious, 140 states): the editor's `.cm-scroller` is a scrollable region that cannot get keyboard focus.
- `link-in-text-block` (A, serious, 20 states, reading view): internal links in paragraphs are told apart by colour only.
- Focus visible (D, 80 states): the note editor (`div[aria-label="Note editor"]`) shows no change when Tab reaches it (probably because the cursor sits in the hidden front matter); on narrow screens with the sidebar open, focus moves to controls behind the overlay (header buttons, note title), which are covered (`focus-obscured`, 90 states) and so show nothing.
- `page-has-heading-one` (E, moderate, 70 states): screens without a level-1 heading.
- Floors: graph totals 75.9 to 80.9 in all 20 graph states; graph C = 0 (labels under 12 px, nothing else to measure) and B 66.7 in dark (APCA Lc of the small labels, advisory); D under 70 in the narrow Folders and Review states (focus behind the overlay, keyboard reach). G is not floored (D-P12-3; 41.7 to 66.7, mainly the 4 px spacing grid).

## Decisions log

- **D-P12-1** · confidence: med
  - Question: the coordinator note says not to edit package.json files, but this packet borrows `quire/package.json` for the `ux` and `ux:approve` scripts, and `playbook.yaml` already declares `ux: pnpm -C quire ux`.
  - Did: added exactly those two scripts (no dependency changes); they run `build:web:if-needed` then `playwright test -c ux/playwright.config.ts` in `@quire/scenarios`.
  - Why: the packet's borrow is specific and the gate cannot run without the script; the note's concern (dependencies) is untouched.
  - Reverse: delete the two script lines in `quire/package.json`.
- **D-P12-2** · confidence: med
  - Question: should `pnpm -C quire ux` fail on every hard-check and floor failure, or only on regressions? The packet expects `gate.sh ux` to pass while R-PLT-08 still fails other hard checks.
  - Did: the runner's exit status is the ratchet (state total drop > 1, category drop > 3, new violation, or no baseline). Hard checks and floors are reported in `report.md` and enforced by the R-PLT-08 step (`gateFailures`). Every hard-check failure is also a violation, so a new one fails the runner too.
  - Why: approved-outputs pattern from modules/scenarios; keeps the gate green while P14 fixes known failures and red on any regression.
  - Reverse: in `quire/scenarios/ux/report.ux.ts`, assert `gateFailures(verdict)` instead of `verdict.ratchet`.
- **D-P12-3** · confidence: med
  - Question: R-PLT-08 says 70 per category; the research says G (consistency) has no published thresholds and is "judged against the baseline".
  - Did: floors apply to A-F; G is ratcheted only (`FLOORED` in `gate.ts`), and the module README says so.
  - Why: research table and pitfalls; G alone would fail the floor in almost every state on heuristic numbers (4 px grid share).
  - Reverse: add `'G'` to `FLOORED` in `quire/scenarios/ux/gate.ts` and the README's Gate section.
- **D-P12-4** · confidence: high
  - Question: how to run the runner (TypeScript, browser, server).
  - Did: a separate Playwright config in `scenarios/ux/`: global setup starts one cloud server on the demo seed, one test per theme and scheme (3 workers), a dependent `report` project merges the states, writes `report.md` and the baseline.
  - Why: same browser setup as the scenarios, TS support, parallel run (about 6 min for 180 states instead of about 20).
  - Reverse: replace with a single serial script.
- **D-P12-5** · confidence: med
  - Question: which colours to change so WCAG contrast passes everywhere (Change colour values only).
  - Did: in `styles.css`: `--text-faint` light `#9a9ca4` → `#6c6e76` (at least 4.62:1 on every theme's bg and bg-alt), dark `#6f6f78` → `#8e8e98` (at least 4.65:1); default dark `--accent-text: #14161a` (5.44:1 on `#8b7cf6`, what the other themes' dark variants already do); and `select { background-color: var(--bg) }` because the unstyled Theme select took the browser's grey (`#6b6b6b`, 3.4 to 4.2:1) in dark. Theme files unchanged (they never override `--text-faint`).
  - Why: the report's contrast failures were `.link-meta`, `.status-device` (text-faint), the default dark primary button and the Theme select. The select rule is a new declaration, colour only. Faint text is now almost as dark as muted text in light themes; WCAG leaves no room for a lighter grey on these backgrounds.
  - Reverse: restore the three values and remove the `select` rule in `quire/apps/web/src/styles.css`; per-theme `--text-faint` values would bring back some hierarchy.
- **D-P12-6** · confidence: med
  - Question: the research asks for CLS as the median of 3 runs over load plus a 2 s settle.
  - Did: `pnpm -C quire ux` loads every screen three times and takes the median CLS (`clsSamples: 3`), the last load being the one scored; each load waits a 1 s settle plus a 400 ms quiet DOM (max 5 s) instead of 2 s. The R-PLT-08 scenario takes one sample (D-P12-10).
  - Why: the quiet-DOM wait covers late renders better than a longer fixed settle; CLS is 0 in every state today.
  - Reverse: `settleMs` and `quietMs` in `scoreApp` (`quire/scenarios/ux/score.ts`).
- **D-P12-7** · confidence: med
  - Question: how to score "share of characters >= 16 px down to < 12 px" and where the 320 px reflow runs.
  - Did: body size is a per-character ramp (14 px UI text earns 0.5). Reflow is measured from each 390x844 state (resize to 320x640, measure, restore) and is not applicable to 1280x800 states.
  - Why: the research's ramp wording; WCAG 1.4.10 is about the viewport width, and the 390 layout is the one that reflows.
  - Reverse: `c-text.ts` (body-size) and `reflowFrom` in `quire.ts`.
- **D-P12-8** · confidence: med
  - Question: what the standard screens look like and how the Tab walk starts.
  - Did: editor and reading view on `Welcome.md` with the left sidebar closed and the right pane open; Folders, Tags, Board with the left sidebar open (opened by its button on narrow screens); graph; settings, review inbox (empty) and vault history over the editor; vault history counts only when its command opens a dialog. The walk starts where the app left focus, presses Escape before Tab inside CodeMirror (its documented way out of `indentWithTab`), wraps past the end of the page once, and stops when an element comes round again (up to 50 stops).
  - Why: the R-PLT-08 screen list; no editing of the seed during scoring; a person reaches the top of the page by Tab too.
  - Reverse: `SCREENS` and `tabEscapes` in `quire/scenarios/ux/quire.ts`; the loop in `categories/d-interaction.ts`.
- **D-P12-9** · confidence: high
  - Question: `scenarios/tsconfig.json` (not owned) only includes `support` and `steps`.
  - Did: `pnpm check` typechecks the library through `steps/ux.steps.ts`; added `scenarios/ux/tsconfig.json` so the runner files can be checked with `tsc -p ux`.
  - Reverse: add `"ux"` to `quire/scenarios/tsconfig.json` and delete `ux/tsconfig.json`.
- **D-P12-10** · confidence: med
  - Question: the coordinator asked that R-PLT-08 stays usable inside the everyday `scenarios` gate (about 5 minutes), while `ux` keeps the full matrix.
  - Did: the R-PLT-08 step scores every theme, light and dark, at 1280x800 (90 states), and 390x844 with the 320 px reflow check in the Default theme, light only (9 states); one CLS sample, no settle, 250 ms quiet DOM, one browser context (the device's) for everything. It judges against the same baseline (states it does not score are listed, not gated). Timeout 10 minutes: measured 6.8 minutes for the scenario (7.6 for the gate) on the shared 4-core machine with tracing on, so 8 minutes left too little room. To get there the Tab walk now takes one round trip per stop and CSS motion is frozen once per state instead of per screenshot (the baseline was re-approved after that). `pnpm -C quire ux` keeps both viewports for every theme and 3 CLS samples (about 10 minutes, 3 workers).
  - Why: coordinator note for P12; the phone layout's colours are the same variables already scored in dark at the desktop size.
  - Reverse: in `quire/scenarios/steps/ux.steps.ts`, call `scoreApp(page, quireApp, { clsSamples: 3 })` once (the full matrix) and raise the timeout to about 60 minutes; or add `'dark'` to the phone pass's `schemes`.
- **D-P12-11** · confidence: high
  - Question: the first runner design shared one server between the parallel score tests.
  - Did: one cloud server per score test (theme and scheme). With a shared server every worker's device showed up in the others' editor as a live collaborator, which changed font sizes and colours and made G move between runs.
  - Why: each scenario starts from a fresh system (modules/scenarios); two runs after approving then reported "No state total moved" and no new violations.
  - Reverse: none needed.
