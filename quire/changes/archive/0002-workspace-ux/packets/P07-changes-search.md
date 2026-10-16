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
status: done
claimed_by: claude-code/tier-C
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

**Result (claude-code/tier-C, 2026-10-16): not done, blocked.**

- Web build to `/tmp/quire-web-P07`: pass. `@quire/web` typecheck: pass. `@quire/navigate` typecheck: pass.
  Also pass: `@quire/scenarios` typecheck, `check-structure.py` (0 violations), `pnpm -C quire deps` (no violations).
- `gate.sh scenarios "@R-VLT-08|@R-NAV-10|@R-NAV-04"`: 3 run, 2 passed, 1 failed.
  - `@R-NAV-04 Title matches first, offline`: pass.
  - `@R-NAV-10 Combined operators`: pass.
  - `@R-VLT-08 Who changed what`: fails at `the sidebar on "pixel" shows "report" changed by "laptop"`.
    The row renders `report`, `live · just now`, so the list works but the device is `live`, not `laptop`.
    Cause: the server stamps every live-room commit with the constant device `live`
    (`quire/apps/server/src/live/rooms.ts`, `flushRoom`, `q.store.commit(room.path, text, 'live', ...)`).
    The browser device's `has ... reading` step types into the editor, which commits through the live room.
    Fixing it needs the live join to carry the editing device name, which touches paths outside this packet's
    `owns` and `borrows`. The scenario was not weakened. See D-P07-1.

**Unblocked by the coordinator (2026-10-16), per D-P07-1's reverse note.** The web live client
now sends `device` on join (`apps/web/src/live/live.ts`), and `apps/server/src/live/rooms.ts`
commits with the device of the last connection that edited the room (`'live'` only when none
is known). `gate.sh scenarios "@R-VLT-08|@R-NAV-10|@R-NAV-04|@R-LIV"`: 8 passed, 0 failed.
The scenario was not changed.

## Decisions log
- **D-P07-1** · confidence: high
  - Question: the Changes scenario expects `changed by laptop`, but a browser device's edits are committed by the live room with device `live` (server constant). Where should the device name come from?
  - Did: stopped. Did not edit `quire/apps/server/src/live/**` or the web live client, and did not change the scenario or the step's expectation.
  - Why: the packet's step definition and R-VLT-08 both require the real editing device. The fix is outside P07's paths.
  - Reverse / unblock: have the web live client send the device name on join (`quire/apps/web/src/live/live.ts`), have `rooms.ts` commit with that name instead of `'live'`, and add those paths to `borrows` (or give them to the live packet's owner). Then rerun the gate; the R-VLT-08 scenario should pass unchanged.
- **D-P07-2** · confidence: med
  - Question: `ChangesView` skips paths the workspace no longer has. Does "keep 50" apply before or after that skip?
  - Did: skip first, then keep 50 (`filter(ws.has)` then `slice(0, 50)`).
  - Why: R-VLT-08 says "the 50 most recently changed notes"; keeping 50 and then skipping would list fewer than 50 even when more notes exist.
  - Reverse: move `.slice(0, LIMIT)` before `.filter(...)` in `vault/changelog/ChangesView.tsx`.
- **D-P07-3** · confidence: med
  - Question: the `only` step must check that the one hit "contains p without .md", but the hit's visible text is the note title and snippet, not the folder path (`Projects/alpha` would never be visible text).
  - Did: the step checks the hit button's `title` attribute, which holds the full path, with a regex for the path without `.md`.
  - Why: that is the only place the path appears in the hit, and it avoids changing `SearchPane` markup outside the packet's borrow.
  - Reverse: show the path in the hit, or change the step to read the visible text.
- **D-P07-4** · confidence: low
  - Question: should `file:x` match the file name with or without `.md`?
  - Did: with `.md` (substring match on the basename of the lower-case path).
  - Why: "file name contains x"; `file:alpha` and `file:alpha.md` both match.
  - Reverse: strip the extension before matching in `packages/navigate/src/search.ts`.
- **D-P07-5** · confidence: low
  - Question: should the operators also negate (`-tag:x`, `-path:x`), and should a query of only negated terms return hits?
  - Did: negation applies to any operator. A query of only negated terms returns the notes that match none of them. A query with no terms returns no hits, as today.
  - Why: the spec says `-term` combined with AND; a generic negation is the simplest consistent reading. The empty-query rule is unchanged.
  - Reverse: in `parseQuery` and `search`, reject negation for non-text operators, or return no hits when there are no positive terms.
- **D-P07-6** · confidence: low
  - Question: where does the operator hint line go in `SearchPane`?
  - Did: a `muted small` paragraph under the search input, reading `path:x · file:x · tag:x · "phrase" · -term`.
  - Why: packet step 7 asks for a short hint line; placement is the simplest option.
  - Reverse: move or drop the `<p>` in `apps/web/src/navigate/SearchPane.tsx`.
