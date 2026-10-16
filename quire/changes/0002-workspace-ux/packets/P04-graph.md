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
status: doing
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

## Decisions log
