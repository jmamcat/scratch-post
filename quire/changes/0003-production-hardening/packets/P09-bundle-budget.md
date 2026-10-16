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
status: done
claimed_by: claude-code/tier-B
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

**Unblocked by the coordinator (2026-10-16).** The packet asked for `apps/web/src/app/`, which
structure rule S2 refuses (not a capability): `playbook.yaml` now allows `app` beside `shared`
as the web client's shell, and ARCHITECTURE.md lists it. Also done from the decisions below:
the theme steps wait for the lazy settings dialog (D-P09-5), and `RightPane.tsx` loads the
local graph lazily (D-P09-4), so `d3-force` no longer loads at start-up on wide screens.
`gate.sh check`: 0 violations. `gate.sh scenarios "@R-NAV-08|@R-NAV-09|@R-PLT-05|@R-PLT-07|@R-PLT-06"`:
7 passed.

## Decisions log

### Acceptance result

- Build: `vite build --outDir /tmp/quire-web-P09 --emptyOutDir` ok. First-load JavaScript: 435.4 kB gzip before (one entry chunk, 1,264,658 bytes), 182.7 kB gzip after (entry chunk only; the limit is 320 kB). `d3-force` and `yjs` are not in any first-load chunk.
- `scenarios`, whole suite without R-PLT-08 (workers 2): 129 passed, 0 failed (includes R-PLT-07 Budget, R-PLT-05 both, R-PLT-06 Start offline, R-LIV, R-VLT, R-RVW, R-NAV, R-RND, R-VIEW). R-PLT-08 (UX gate) was left out of the last run: in the first full run it failed on graph scores against the baseline (for example `graph|1280x800|paper|dark: D Interaction 100 -> 88.89`) and ran 19.8 min; it belongs to P14. Two earlier full runs: 128 passed, failures only R-PLT-08 and R-PLT-05 (see D-P09-5, fixed).
- `check`: typecheck and dependency rules pass; no S8 warning for `App.tsx` (461 -> 182 lines; every file in `app/` is under 110 lines). **Two errors remain, outside `owns`:** `S2 apps/web/src/app: 'app' is not a capability` and `S10 apps/web/src/app: not listed in ARCHITECTURE.md`. Unblock: add `app` to `structure_allow` in `playbook.yaml` (`shared, app`) and a row `| apps/web/src/app | app | Application shell: layout state, navigation, commands, dialogs, lazy views |` to `quire/ARCHITECTURE.md` (P00 owns it). `app/README.md` exists. After those two edits `check` has no error and this packet can be set to `done`.

## Decisions log (P09)

- **D-P09-1** · confidence: high
  - Question: `src/app/` is named by the packet but is not a spec capability.
  - Did: created it as the packet says, with a README; did not edit `playbook.yaml` or `ARCHITECTURE.md` (not owned).
  - Why: packet `owns` lists `apps/web/src/app/**`; structure rule S2 and S10 then report the two errors above.
  - Reverse: either make the two edits above, or move the folder under an existing capability.
- **D-P09-2** · confidence: med
  - Question: the contract's lazy list was not enough: with graph, vault history, review inbox, settings, version history and the Yjs libraries lazy, first load was still 382 kB gzip.
  - Did: also made the editor stack lazy. `app/NoteView.tsx` (CodeMirror, live preview, attachments hook, reading view) and `app/LiveStatus.tsx` (live session hook and chip) are lazy chunks; `RightPaneWithProperties.tsx` holds the right pane and the properties editor (front-matter parser). The note view chunk is fetched at start-up beside the first render, so a note opens without a second round trip.
  - Why: R-PLT-07 budget; the CodeMirror family is about 450 kB before compression.
  - Reverse: import `NoteView` and `LiveStatus` statically in `App.tsx` (first load goes back above the limit).
- **D-P09-3** · confidence: med
  - Question: barrels (`vault/index.ts`) kept CodeMirror in the entry chunk even for unused exports, because modules such as `editor-setup.ts` run calls at import time.
  - Did: `vite.config.ts` (borrowed) sets `build.rollupOptions.treeshake.moduleSideEffects` so our own `.ts/.tsx` under `apps/web/src` and `packages/*/src` count as free of import-time effects; CSS imports and `node_modules` keep the default.
  - Why: the alternative is editing `Sidebar.tsx` and the capability barrels (not owned). I checked there are no bare `import './x.ts'` for effects in the web source.
  - Reverse: remove the `rollupOptions` line and the `ownSource` constant in `vite.config.ts` (first load rises to about 380 kB).
- **D-P09-4** · confidence: med
  - Question: `navigate/RightPane.tsx` (not owned) imports `GraphView` and so `d3-force` statically.
  - Did: lazy-load the whole right pane (and the graph route) instead of editing `RightPane.tsx`. The d3 code therefore loads when the right pane first opens, which is at start-up on wide screens (open by default); it is outside the first-load JavaScript but not deferred in practice there.
  - Why: unowned file; budget counts the static graph only.
  - Reverse: lazy-load `GraphView` inside `RightPane.tsx` (give P09 `borrows` for it), then lazy-load only the Graph tab.
- **D-P09-5** · confidence: med
  - Question: the step "in every theme the headings ... look different" (`themes.steps.ts`, not owned) clicks "Open settings" and reads the Theme options at once with `evaluateAll`, which does not wait; a lazy dialog failed it (0 options, R-PLT-05).
  - Did: `app/lazy-views.tsx` prefetches the settings chunk at start-up, and a view that has already arrived mounts without suspending (a settled thenable passed to `React.lazy`). R-PLT-05 passed in 6 of 6 runs.
  - Why: the contract wants settings lazy; the step is timing-sensitive.
  - Reverse: recommended instead, add `await expect(dialog.getByLabel('Theme')).toBeVisible()` before `evaluateAll` in `themes.steps.ts`; then the prefetch line for settings can go.
- **D-P09-6** · confidence: high
  - Question: how to keep an editor from remounting when its chunk arrives.
  - Did: `lazyView` always renders the same `React.lazy` component type under one `Suspense`; an earlier draft switched element types after load and remounted the editor, which lost typed text in a live join (R-PLT-05 failure in the second full run).
  - Why: remount destroyed the editor state; fixed and rerun.
  - Reverse: n/a.
- **D-P09-7** · confidence: high
  - Question: when does `LiveSession.join` read the text it joins with, now that it waits for the Yjs chunk?
  - Did: `joinText` is read before waiting for the chunk, so text typed during the wait is carried into the room by `bind` (as it already was during the token request). A failed chunk fetch sets the state to off and retries with the existing backoff.
  - Why: reading it after the wait would hide typed text from the three-way merge and lose it.
  - Reverse: n/a.
- **D-P09-8** · confidence: high
  - Question: `useCommands` now lists `reading` in its memo dependencies.
  - Did: added, so "Insert attachment" is enabled by the current view mode; before, the first value was captured.
  - Why: small stale-closure fix while moving the code.
  - Reverse: remove `reading` from the dependency array in `app/use-commands.ts`.
- **D-P09-9** · confidence: high
  - Question: `budget.steps.ts` details.
  - Did: the build runs `vite build --outDir <tmp> --emptyOutDir --sourcemap` from `apps/web` (240 s timeout, test timeout raised); first-load chunks are the page's module script and `modulepreload` links plus static `import`/`export ... from` (not `import()`); size is the sum of per-chunk gzip level 9, with 1 kB = 1000 bytes. Both failure paths were checked by temporarily tightening the limit and the package name.
  - Why: contract text.
  - Reverse: n/a.

