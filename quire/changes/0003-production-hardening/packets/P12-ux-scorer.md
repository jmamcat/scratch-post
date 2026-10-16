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
status: doing
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
  - Did: one run per state: the screen is opened by a reload, CLS is the largest session window of shifts without recent input since that load, after a 1 s settle plus a 400 ms quiet DOM (max 5 s).
  - Why: 3 loads per state would triple a 6-minute run; CLS is 0 in every state today.
  - Reverse: loop the load in `scoreApp` (`score.ts`) and take the median.
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
