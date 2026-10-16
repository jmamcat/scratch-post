---
id: 0003-production-hardening/P09
title: First-load budget and App split
lane: G
depends_on: [P04, P07, P08]
owns:
  - quire/apps/web/src/App.tsx
  - quire/apps/web/src/app/**
  - quire/scenarios/steps/budget.steps.ts
borrows:
  - quire/apps/web/vite.config.ts  # chunking only; keep P08's plugin
  - quire/apps/web/src/live/live.ts  # load Yjs and its bindings when a live room is first joined
  - quire/apps/web/src/main.tsx  # only if lazy loading needs it
  - quire/apps/web/src/vault/Editor.tsx  # only to load the collaboration binding lazily
reads:
  - quire/changes/0003-production-hardening/**
  - quire/spec/**
  - quire/apps/web/**
  - quire/scenarios/**
size: M
revision: 1
status: todo
---

# First-load budget and App split

## Context

Implements R-PLT-07 (`quire/changes/0003-production-hardening/spec/platforms/spec.md`). The
0002 build was one 1.25 MB chunk (428 kB gzip): `@codemirror/view` and React DOM about
110 kB each before minification, then `yaml`, `yjs` with `lib0`, `markdown-it`, and
eagerly loaded code-block languages. `App.tsx` is over the 300-line soft limit (structure
rule S8). Budget: first-load JavaScript (the entry chunk plus its static imports) under
320 kB gzip, without `d3-force` and without `yjs`.

## Contract

- Load on first use with `React.lazy` or dynamic `import()`: the graph view, vault history,
  review inbox, settings dialog, version history drawer, and the live editing stack (`yjs`,
  `y-websocket`, `y-codemirror.next`, `y-protocols`). Live editing must still start when a
  note opens (it just waits for its chunk). Code-block languages load lazily
  (`@codemirror/language-data` style).
- Split `App.tsx` into components under `apps/web/src/app/` (layout, commands, dialogs) so
  every file is under 300 lines. `App` keeps its props.
- Steps (`quire/scenarios/steps/budget.steps.ts`): `the web app is built` (build into a
  temporary folder with source maps), `the first-load JavaScript is under N kB gzip`
  (`index.html`'s entry script plus every `modulepreload` and static import, gzip level 9),
  `the first-load JavaScript does not include "pkg"` (no source in those chunks' source maps
  comes from `node_modules/<pkg>/`).

## Acceptance

```sh
export QUIRE_WEB_DIST=/tmp/quire-web-P09
pnpm -C quire --filter @quire/web exec vite build --outDir "$QUIRE_WEB_DIST" --emptyOutDir
playbook/bin/gate.sh check
playbook/bin/gate.sh scenarios
```

R-PLT-07 passes and the whole suite (except scenarios still waiting on P11 to P13) passes;
`check` shows no S8 warning for `App.tsx`.

## Decisions log
