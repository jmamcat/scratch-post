---
id: 0002-workspace-ux/P05
title: Five themes with distinct heading levels
lane: D
depends_on: [P00]
owns:
  - quire/apps/web/src/platforms/themes/**
  - quire/scenarios/steps/themes.steps.ts
borrows:
  - quire/apps/web/src/styles.css  # only to route hard-coded heading/colour values through CSS variables the themes can override
reads:
  - quire/changes/0002-workspace-ux/**
  - quire/spec/STEPS.md
  - quire/apps/web/src/**
  - quire/scenarios/support/**
  - references/obsidian/product/**
  - references/notion/product/**
  - references/confluence/product/**
size: M
revision: 1
claimed_by: claude-code/tier-B
status: done
---

# Themes

## Context

Implements R-PLT-05. Spec: `quire/changes/0002-workspace-ux/spec/platforms/spec.md`. P00
created `platforms/themes/index.ts` (THEMES, `loadTheme`, `applyTheme` which sets
`document.documentElement.dataset.quireTheme` and stores the id) and `ThemePicker.tsx` (a
`<select aria-label="Theme">` in Settings that applies immediately); `main.tsx` applies the
saved theme at startup. You write the CSS and refine those files.

## Contract

- One CSS file per theme in `platforms/themes/`, imported by `themes/index.ts`, scoped as
  `:root[data-quire-theme="<id>"]` for light and
  `@media (prefers-color-scheme: dark) { :root[data-quire-theme="<id>"] { ... } }` for dark.
  Themes override the CSS custom properties already used by `apps/web/src/styles.css`
  (backgrounds, text, accent, borders, fonts) and style headings in both the reading view
  (`.reader h1..h3`) and Live Preview (`.cm-lp-h1..h3`, classes from P01).
- Themes and their heading idea:

  | id | name | heading idea |
  | --- | --- | --- |
  | default | Default | Obsidian-like: size scale, one accent colour |
  | minimal | Minimal | quiet type; levels by weight, letter spacing and spacing |
  | things | Things | a different colour per level (e.g. red, orange/yellow, blue), bold |
  | paper | Paper | Notion-like: large serif H1 (Georgia/"Iowan Old Style"/serif), roomy |
  | atlas | Atlas | Confluence-like: Atlassian-style blue headings, a rule under H1, compact |

  Write your own CSS. Do not copy CSS from Obsidian themes, Notion or Atlassian; take only
  the idea in the table. Keep contrast at WCAG AA (4.5:1 for body text) in light and dark.
- Requirement: in every theme, H1, H2 and H3 differ from each other in computed style, by
  more than font size alone (colour, weight, family, letter spacing, border or margin).
- If `styles.css` hard-codes heading sizes or colours, route them through variables (your
  borrowed edit), keeping the Default theme looking as it does now.

Steps you implement in `quire/scenarios/steps/themes.steps.ts` (use `appDevice`):

- `"d" picks the theme "Name"`: open Settings (command palette "Open settings" or the
  "Open settings" button), choose `Name` in the `Theme` select, close the dialog (Escape or
  Cancel; the theme already applied).
- `the app on "d" uses the theme "Name"`: `<html data-quire-theme>` equals the theme's id.
- `in every theme the headings on "d" look different from each other`: for each theme,
  apply it (`document.documentElement.dataset.quireTheme = id` via `page.evaluate` is fine
  here), read `getComputedStyle` of the reading view's `h1`, `h2`, `h3` (font-size,
  font-weight, font-family, color, letter-spacing, border-bottom-style, margin-top), and
  assert the three signatures are pairwise different and also differ in something besides
  font-size.

## Acceptance

```sh
export QUIRE_WEB_DIST=/tmp/quire-web-P05
pnpm -C quire --filter @quire/web exec vite build --outDir "$QUIRE_WEB_DIST" --emptyOutDir
pnpm -C quire --filter @quire/web typecheck
playbook/bin/gate.sh scenarios "@R-PLT-05"
```

Both theme scenarios pass. Also attach one screenshot per theme (light) of the demo seed's
`Formatting` note in reading view, saved under `/tmp/quire-themes/` (not in git), and list
the paths here.

Results (all Acceptance commands run with `QUIRE_WEB_DIST=/tmp/quire-web-P05`):

- Web build: ok. `@quire/web typecheck`: ok. `pnpm -C quire check`: types, dependency rules
  and structure rules pass (0 violations; 5 existing S8 size warnings, none in my files).
- `gate.sh scenarios "@R-PLT-05"`: 2 passed, 0 failed (`Pick a theme`, `Heading levels look
  different in every theme`).
- Contrast: light and dark body text, muted text, link and heading colours of all five themes
  checked against `--bg` and `--bg-alt`: all at least 4.5:1 (lowest 4.77). Dark primary
  buttons in the four new themes use a dark `--accent-text` (at least 6:1 on the accent).
- Screenshots (light, `Formatting` note, reading view, demo seed), not in git:
  - `/tmp/quire-themes/default-light.png`
  - `/tmp/quire-themes/minimal-light.png`
  - `/tmp/quire-themes/things-light.png`
  - `/tmp/quire-themes/paper-light.png`
  - `/tmp/quire-themes/atlas-light.png`

Files: `apps/web/src/platforms/themes/{index.ts,default.css,minimal.css,things.css,paper.css,atlas.css,live-preview-headings.css}`,
`quire/scenarios/steps/themes.steps.ts`, borrowed edit in `apps/web/src/styles.css` (heading rules
and body line height read variables with Default fallbacks).

## Decisions log


- D1 (confidence: high) Themes only set CSS variables (`--hN-size/weight/family/color/spacing/
  margin-top/margin-bottom/pad-bottom/border`, plus `--text-line-height`, `--heading-line-height`);
  `styles.css` and `live-preview-headings.css` read them with the Default values as fallbacks.
  One place styles headings, so reading view and Live Preview cannot drift.
- D2 (confidence: medium) Default now has H3 in the link colour and H2 at weight 600 (was all
  bold, text colour), because the requirement needs levels to differ by more than size. The
  rest of the Default look is unchanged.
- D3 (confidence: medium) `live-preview-headings.css` styles `.cm-editor .cm-line.cm-lp-h1..h3`
  (the P01 contract puts the class on the line) and uses padding-top (half the reading-view
  margin) instead of margin so the editor can measure lines. Untested against the real P01
  output, which was not merged when this ran. If P01 puts the class on a span, drop `.cm-line`
  from the selectors.
- D4 (confidence: medium) The scenario compares margin-top relative to font size, since margins
  in em always change with the size and would otherwise count as a non-size difference.
- D5 (confidence: low) Minimal, Things, Paper and Atlas also set their own palettes (warm
  neutrals, blue tint, Atlassian-like blue) beyond the heading idea; the spec only requires
  headings to differ, so these are cosmetic and easy to revert.
- D6 (confidence: high) Dark Default primary buttons (white on `#8b7cf6`, 3.3:1) were already
  below AA before this packet; left unchanged because Default must keep its look and
  `styles.css` is borrowed only for heading variables. The four new themes avoid the problem.
