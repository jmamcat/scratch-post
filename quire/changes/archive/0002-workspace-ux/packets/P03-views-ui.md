---
id: 0002-workspace-ux/P03
title: Sidebar views - Recent, Domains, Tags, Timeline, Board
lane: B
depends_on: [P02]
owns:
  - quire/apps/web/src/views/**
  - quire/scenarios/steps/views.steps.ts
borrows: []
reads:
  - quire/changes/0002-workspace-ux/**
  - quire/spec/STEPS.md
  - quire/apps/web/src/**
  - quire/packages/views/src/**
  - quire/packages/vault/src/**
  - quire/scenarios/support/**
  - quire/scenarios/steps/sidebar.steps.ts
size: M
revision: 1
status: done
claimed_by: claude-code/tier-B
---

# Sidebar views

## Context

Implements R-VIEW-01 (the switcher is already wired by P00 in `apps/web/src/Sidebar.tsx`),
R-VIEW-02 Domains, R-VIEW-03 Tags, R-VIEW-04 Timeline, R-VIEW-05 Board and R-VIEW-06
Recent. Spec: `quire/changes/0002-workspace-ux/spec/views/spec.md`. Replace the stub bodies
in `apps/web/src/views/*.tsx`; keep the props exactly (Sidebar.tsx passes them).

## Contract

Props (already declared in the stubs):

```ts
{ ws: Workspace; version: number; active: string | null; onOpen: (path: string) => void }
// RecentView also: recent: string[]   (paths, newest first, from App)
// TagsView also:   onTag: (tag: string) => void   (opens a tag: search)
// BoardView also:  onEdit: (path: string, text: string) => void   (write a note's new text)
```

Data: notes are `[...ws.notes()]` (`{ path, text }`), recomputed when `version` changes.
Revision times and devices: `useHeadMeta(ws, version)` from `../sync/index.ts` gives
`Map<path, { rev, device, at }>` (cached offline). Grouping functions: `@quire/views`
(`groupByDomain`, `tagTree`, `groupByTime`, `groupByProperty`); property writes:
`setProperty` from `@quire/vault`.

DOM contract (scenarios read it): show notes with `GroupList` from
`../shared/GroupList.tsx`, which renders `[data-group="<label>"]` sections holding
`[data-item="<title>"]` buttons.

- Recent: one group labelled `Recent`, items in the given order (not sorted).
- Domains, Timeline: `GroupList` of the computed groups.
- Tags: a nested tree. Each tag node is a `[data-group="<name>"]` element (use the segment
  name, e.g. `idea`) containing its child tags as `[data-item="<child name>"]` buttons (and
  their own nested groups), plus a count element `[data-count]` with the note count. Clicking
  a tag calls `onTag(fullTag)`. A tag node's own notes need not be listed.
- Board: a group selector `<select aria-label="Group by">` with property keys found in the
  vault (default `status`); `GroupList` of `groupByProperty`; each card has a
  `<select aria-label="Move <title> to">` listing the other columns; choosing one calls
  `onEdit(path, setProperty(text, key, column))` (choosing `No <key>` removes the key).
  Drag and drop is optional; the select is the accessible way.

Styles in `views/views.css` imported by your components.

Steps you implement in `quire/scenarios/steps/views.steps.ts` (use `appDevice` from
`support/app.ts`):

- `the sidebar on "d" shows the tag "t" with N notes`: `[data-group="t"] [data-count]`
  (first) has text `N`.
- `"d" moves "title" to the "Column" column`: select `Column` in the `Move <title> to`
  select.

Other steps used by the views scenarios already exist in `steps/sidebar.steps.ts`.

## Acceptance

```sh
export QUIRE_WEB_DIST=/tmp/quire-web-P03
pnpm -C quire --filter @quire/web exec vite build --outDir "$QUIRE_WEB_DIST" --emptyOutDir
pnpm -C quire --filter @quire/web typecheck
playbook/bin/gate.sh scenarios "@R-VIEW-0"
```

All 7 views scenarios pass.

## Acceptance result

- `vite build` (QUIRE_WEB_DIST=/tmp/quire-web-P03): ok. `@quire/web typecheck`: clean.
- `gate.sh scenarios "@R-VIEW-0"`: 7 passed (R-VIEW-01, 02, 03, 04, 05 x2, 06).
- Also: `pnpm deps` no violations; structure check 0 violations.
- Initially blocked on `@quire/views` missing from apps/web/package.json (not owned); the coordinator added it. Verified in the meantime with a scratch alias config outside the repo.

## Decisions log

- **D-P03-1** · confidence: med
  - Question: the "Moving a card" scenario has one column (`todo`) and moves to `done`; where does `done` come from.
  - Did: for the `status` key the move select also offers starter columns `todo`, `doing`, `done` not yet used, plus `No status` last (removes the key). Other keys offer existing columns and `No <key>`.
  - Why: R-VIEW-05 scenario requires moving to a column that does not exist yet; no UI for naming new columns is in the contract.
  - Reverse: `STARTER_COLUMNS` and `targets` in `apps/web/src/views/BoardView.tsx`.
- **D-P03-2** · confidence: med
  - Question: which column a note lacking server revision metadata takes in Timeline.
  - Did: treated as changed now (Today).
  - Why: a just-created local note has no head meta until the server refresh; `groupByTime` would otherwise put it in Older and move it a moment later.
  - Reverse: `modifiedAt: m?.at ?? now.toISOString()` in `TimelineView.tsx`.
- **D-P03-3** · confidence: med
  - Question: Tags DOM for nodes with children.
  - Did: each node is a `section[data-group=name]` holding its own `button[data-item=name]` with `[data-count]` first, then child sections in a `ul`; a click calls `onTag(fullTag)`. Root tags are also `data-item` buttons. No collapse/expand.
  - Why: satisfies `[data-group="idea"] [data-item="raw"]` and the first-`[data-count]` step for every level.
  - Reverse: `TagsView.tsx`.
- **D-P03-4** · confidence: high
  - Question: Board property keys and errors.
  - Did: keys are all front matter keys in the vault plus `status` (default, first); `setProperty` errors show in a `role=alert` line.
  - Why: contract and P02 decision D-P02-5.
  - Reverse: `BoardView.tsx`.
