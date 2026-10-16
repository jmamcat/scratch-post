---
id: 0002-workspace-ux/P04
title: Global and local graph view
lane: C
depends_on: [P02]
owns:
  - quire/apps/web/src/navigate/graph/**
  - quire/scenarios/steps/graph.steps.ts
borrows: []
reads:
  - quire/changes/0002-workspace-ux/**
  - quire/spec/STEPS.md
  - quire/apps/web/src/**
  - quire/packages/views/src/**
  - quire/scenarios/support/**
size: M
revision: 1
status: done
claimed_by: claude-code/tier-A
---

# Graph view

## Context

Implements R-NAV-08 (global graph, route `#/~graph`, command "Open graph view", Mod+G) and
R-NAV-09 (local graph in the right pane's Graph tab, depth 2). Both are already wired by P00
to `GraphView` in `apps/web/src/navigate/graph/GraphView.tsx`; replace the stub, keep the
props. Baseline: Obsidian's graph view (OBS-F-070, OBS-F-140, OBS-F-141).

## Contract

```ts
export function GraphView(props: {
  ws: Workspace; version: number;
  focus?: string | null;   // set: local graph around this path
  depth?: number;          // local graph depth (default 2)
  onOpen: (path: string) => void;
}): JSX.Element;
```

- Data: `linkGraph([...ws.notes()], (t, from) => ws.links.resolve(t, from))` from
  `@quire/views`; local graph: `neighbourhood(graph, focus, depth)`.
- Layout: `d3-force` (already a dependency: `forceSimulation`, `forceLink`,
  `forceManyBody`, `forceCenter`, `forceCollide`); node radius grows with degree; the focus
  node is highlighted; labels under nodes; pan and zoom with the wheel and drag on the
  background; hovering a node dims unrelated nodes. Stop the simulation when it settles and
  on unmount. Respect `prefers-reduced-motion` (run the simulation to rest before drawing).
- DOM contract (scenarios read it): one `<svg aria-label="Graph">` (global) or
  `<svg aria-label="Local graph">` (focus set); each node a `<g data-node="<path>"
  role="button" aria-label="<title>">` that calls `onOpen(path)` on click or Enter; each
  edge a `<line data-from="<path>" data-to="<path>">`.
- Fill the available space (the global graph sits in `.graph-content`, the local one in the
  right pane body); use theme variables from `apps/web/src/styles.css` for colours. Styles
  in `navigate/graph/graph.css`.

Steps you implement in `quire/scenarios/steps/graph.steps.ts` (use `appDevice`):

- `the graph on "d" shows a link from "a" to "b"`: `svg[aria-label="Graph"] line[data-from="a"][data-to="b"]` attached.
- `the graph on "d" shows N notes`: count of `svg[aria-label="Graph"] [data-node]` is N.
- `"d" clicks "p" in the graph`: click `svg[aria-label="Graph"] [data-node="p"]`.
- `the local graph on "d" shows "p"` / `does not show "p"`: open the right pane's `Graph` tab
  (`getByRole('tab', { name: 'Graph' })`), then check `svg[aria-label="Local graph"] [data-node="p"]`.

## Acceptance

```sh
export QUIRE_WEB_DIST=/tmp/quire-web-P04
pnpm -C quire --filter @quire/web exec vite build --outDir "$QUIRE_WEB_DIST" --emptyOutDir
pnpm -C quire --filter @quire/web typecheck
playbook/bin/gate.sh scenarios "@R-NAV-08|@R-NAV-09"
```

All 3 graph scenarios pass.

### Results

- `vite build --outDir /tmp/quire-web-P04`: ok. `@quire/web typecheck`: clean (after the
  coordinator added `@quire/views` to `apps/web/package.json`).
- `gate.sh scenarios "@R-NAV-08|@R-NAV-09"`: 3 passed, 0 failed (`@R-NAV-08` Links become
  edges, `@R-NAV-08` Click to open, `@R-NAV-09` Neighbours only).
- Also ran `pnpm deps` (no violations, 162 modules) and `check-structure.py` (0 violations;
  the 5 existing S8 warnings, none in `navigate/graph`).
- For P00: `apps/web/src/navigate/README.md` "Depends on" and ARCHITECTURE.md could name
  `@quire/views` for `navigate` (the table already allows any package for web capabilities).

## Decisions log

- **D-P04-1** · confidence: high
  - Question: `@quire/web` had no `@quire/views` dependency, so the import did not resolve.
  - Did: imported the package's public entry by relative path while waiting, flagged it for P00; the coordinator added the dependency and the code now imports `@quire/views`.
  - Why: run protocol "Needs from P00"; `package.json` is not owned.
  - Reverse: nothing left to reverse.
- **D-P04-2** · confidence: med
  - Question: node size in the local graph, where `neighbourhood()` recomputes degree over kept edges.
  - Did: both graphs size nodes by full-vault degree (`radius = min(4 + 2.5·√degree, 18)`), so a note looks the same in both.
  - Why: coordinator note on D-P02-4; Obsidian sizes by link count.
  - Reverse: the `degree` map in `GraphView.tsx` and `radius` in `force-layout.ts`.
- **D-P04-3** · confidence: med
  - Question: initial zoom and what happens after the person pans or zooms.
  - Did: the view auto-fits the graph (never zooming in past 1:1) until the person wheels or drags; double-clicking the background fits again; opening another note resets the local graph to fitted.
  - Why: the local graph lives in a narrow pane and must show the whole neighbourhood; Obsidian has no auto-fit but has a re-centre action.
  - Reverse: `fit` and `usePanZoom` in `navigate/graph/viewport.ts`.
- **D-P04-4** · confidence: med
  - Question: forces beyond the five named in the contract.
  - Did: added weak `forceX`/`forceY` (strength 0.04) towards the centre, `distanceMax(400)` on the charge and `alphaDecay(0.04)` (settles in about 170 ticks).
  - Why: with only many-body plus center, notes without links drift far and auto-fit makes everything tiny; Obsidian has a "center force" setting for the same reason.
  - Reverse: the `forceSimulation` chain in `force-layout.ts`.
- **D-P04-5** · confidence: med
  - Question: when the layout restarts.
  - Did: only when the set of nodes or edges changes (structural key in `useStableGraph`); typing in a note does not restart it. Known positions are kept and the restart uses alpha 0.3, so an edit nudges instead of reshuffling.
  - Why: `version` changes on every edit; a full restart per keystroke would be distracting.
  - Reverse: `useStableGraph` in `GraphView.tsx`, `alpha(0.3)` in `force-layout.ts`.
- **D-P04-6** · confidence: med
  - Question: what part of a node is clickable.
  - Did: a transparent rect covers the dot and its label, so clicking the name opens the note too; Enter and Space open a focused node; keyboard focus dims unrelated nodes like hover does.
  - Why: the centre of the node's box falls between the dot and its label, so a click there hit the background (this is what failed the first run of "Click to open"); `role="button"` conventionally takes Space.
  - Reverse: `.graph-hit` in `GraphView.tsx` and `graph.css`.
- **D-P04-7** · confidence: low
  - Question: how the local graph fills the right pane body, whose padding and scrolling belong to RightPane.
  - Did: `graph.css` sets `.right-pane .pane-body:has(> .graph-local)` to no padding, no overflow, flex column; the graph is at least 240 px tall.
  - Why: the contract says fill the available space; RightPane.tsx is not owned. Uses `:has()` (all current engines).
  - Reverse: delete that rule in `navigate/graph/graph.css`, or give the pane body a graph modifier class in `RightPane.tsx`.
- **D-P04-8** · confidence: med
  - Question: labels when zoomed far out, and empty graphs.
  - Did: labels hide below zoom 0.45, except the focus and the hovered or focused node. An empty graph keeps its `<svg>` and shows "No notes yet." (global) or "This note is not in the graph yet." (local).
  - Why: Obsidian fades labels on zoom-out; scenarios need the svg there whatever the contents.
  - Reverse: `.graph.far` in `graph.css`; `graph-empty` in `GraphView.tsx`.
