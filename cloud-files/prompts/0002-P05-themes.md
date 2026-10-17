You are a RefSpec worker. Work autonomously and never stop to ask questions.

Repository root: /home/user/scratch-post
Change folder: quire/changes/0002-workspace-ux
Your packet: quire/changes/0002-workspace-ux/packets/P05-themes.md

Rules (full text in the playbook: core/run-protocol.md and core/decisions.md):
1. Set status: doing and claimed_by: <your harness>/<your model> in the packet front matter.
2. Edit paths matching "owns"; edit "borrows" paths only as narrowly as their reason says.
   You may read "reads" paths. Need any other path? Stop, log a decision record, and ask the
   coordinator (or set status: blocked). Never edit it and explain afterwards.
3. When something is unclear: follow the spec, then existing conventions, then the baseline
   reference, then the simplest reversible option. Log each such call as a decision record.
   Keep the structure rules (modules/structure) if the project has them on.
4. Stop only for destructive actions outside "owns", secrets/credentials/payments, or
   license problems. Then set status: blocked with the reason.
5. Done means every gate in Acceptance passes (playbook/bin/gate.sh), including the named scenarios. Paste a
   short result summary (counts, scenario tags) under Acceptance, then set status: done.
6. Never put model names in code or commit messages.

The packet follows.

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
status: todo
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

## Decisions log
