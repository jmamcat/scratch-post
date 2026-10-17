You are a RefSpec worker. Work autonomously and never stop to ask questions.

Repository root: /home/user/scratch-post
Change folder: quire/changes/0002-workspace-ux
Your packet: quire/changes/0002-workspace-ux/packets/P07-changes-search.md

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
id: 0002-workspace-ux/P07
title: Changes view and search operators
lane: F
depends_on: [P00]
owns:
  - quire/apps/web/src/vault/changelog/**
  - quire/packages/navigate/src/search.ts
  - quire/scenarios/steps/changes.steps.ts
borrows:
  - quire/apps/web/src/navigate/SearchPane.tsx  # remove its own tag: handling once search() supports operators
reads:
  - quire/changes/0002-workspace-ux/spec/vault/spec.md
  - quire/changes/0002-workspace-ux/spec/navigate/spec.md
  - quire/spec/STEPS.md
  - quire/apps/web/src/shared/GroupList.tsx
  - quire/apps/web/src/sync/head-meta.ts
  - quire/packages/render/src/**
  - quire/packages/vault/src/**
  - quire/scenarios/support/**
  - quire/scenarios/steps/sidebar.steps.ts
size: S
revision: 1
status: todo
---

# Changes view and search operators

## Context

Two small, separate tasks.

**A. Changes view (R-VLT-08).** Replace the stub body in
`apps/web/src/vault/changelog/ChangesView.tsx`; keep its props
(`{ ws, version, active, onOpen }`). Show the 50 most recently changed notes, newest first.

**B. Search operators (R-NAV-10).** Extend `search()` in
`quire/packages/navigate/src/search.ts`.

## Steps

A. Changes view:

1. `const meta = useHeadMeta(ws, version)` (import from `../../sync/index.ts`). It is a
   `Map<path, { rev, device, at }>`.
2. Sort entries by `rev` descending, keep 50, skip paths the workspace no longer has
   (`ws.has(path)`).
3. Render with `GroupList` from `../../shared/GroupList.tsx`: one group labelled `Changes`;
   each item `{ path, detail: <>{device} · {relative time}</> }`. Relative time: "just now",
   "5 min ago", "2 h ago", or the date.
4. Each item's detail text must contain the device name.

B. Search operators, inside `search(docs, query, limit)`:

1. Split the query into terms, keeping `"quoted phrases"` together.
2. `path:x` or `file:x`: keep notes whose path (or file name for `file:`) contains `x`
   (case-insensitive).
3. `tag:x` or `tag:#x`: keep notes having tag `x` or a nested tag `x/...` (use
   `extractTags` from `@quire/render`).
4. `-x`: drop notes containing `x` (in path or text).
5. Every other term or phrase must appear in path or text, as today.
6. Ranking stays as today, computed from the plain terms only.
7. In `SearchPane.tsx`, remove the separate `tag:` handling so all queries go through
   `search()` (keep a short hint line listing the operators).

## Contract

```ts
export function search(docs: Iterable<{ path: string; text: string }>, query: string, limit?: number): SearchHit[]; // unchanged signature
export function ChangesView(props: { ws: Workspace; version: number; active: string | null; onOpen: (path: string) => void }): JSX.Element;
```

Steps to implement in `quire/scenarios/steps/changes.steps.ts`. Use `appDevice` from
`../support/app.ts`. Copy the style of `steps/sidebar.steps.ts`:

- `the sidebar on "d" shows "title" changed by "device"`: in `.left-pane`, the element
  `[data-item="title"]` is visible and contains text `device` (wait up to 10 s).

The search scenario reuses existing steps (`"d" searches for "q"`, `the search results on
"d" list "p" only`). Add the missing `only` step to the same file:
`the search results on "d" list "p" only`: the `Search results` list has exactly one
item and it contains `p` without `.md`.

## Acceptance

```sh
export QUIRE_WEB_DIST=/tmp/quire-web-P07
pnpm -C quire --filter @quire/web exec vite build --outDir "$QUIRE_WEB_DIST" --emptyOutDir
pnpm -C quire --filter @quire/web typecheck
pnpm -C quire --filter @quire/navigate typecheck
playbook/bin/gate.sh scenarios "@R-VLT-08|@R-NAV-10|@R-NAV-04"
```

All pass (`@R-NAV-04` is the existing search scenario; it must still pass).

## Decisions log
