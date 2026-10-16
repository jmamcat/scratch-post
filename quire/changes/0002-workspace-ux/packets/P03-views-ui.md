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
status: todo
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

## Decisions log
