---
id: 0001-mvp-foundation/P07
title: Local-first web client shell
lane: D
depends_on: [P01, P03]
owns:
  - quire/apps/web/**
reads:
  - quire/packages/**
  - quire/changes/0001-mvp-foundation/design.md
  - quire/changes/0001-mvp-foundation/spec/navigate/spec.md
  - quire/changes/0001-mvp-foundation/spec/sync/spec.md
  - references/obsidian/product/ux-principles.md
size: L
status: done
claimed_by: claude-code/claude
---

# Web client shell

## Context

Implements R-SYN-01, R-NAV-01, R-NAV-04..07, R-RND (via `renderMarkdown`) and the
Settings part of R-PLT-03 with React, Vite and CodeMirror 6. Server routes and types are
in P03/P04 contracts. Split into sub-steps when working with a tier B or C model:
store + transport, layout + file tree, editor + preview, right pane, switcher + palette.

## Contract

- `src/store/idb.ts`: `IdbLocalStore implements LocalStore` (`idb`, database `quire`,
  stores `docs` keyed by path and `meta`).
- Transport: use `HttpTransport` from `@quire/sync` (already has `push`, `changes`,
  `doc`, `history`, `conflicts`, `resolve`, `dismiss`, `health`, and `url(path, params)`
  for EventSource/WebSocket URLs with the token). `src/store/events.ts` wraps
  `EventSource(transport.url('/api/events'))` and reconnects.
- `src/settings.ts`: `{ serverUrl, token, device }` in localStorage; default server URL
  is the page origin; device defaults to a random readable name.
- Layout: left file tree (folders from paths, new note, new folder by path prefix),
  centre editor (CodeMirror markdown source) with a Reading toggle (Ctrl/Cmd+E),
  right pane tabs Backlinks, Outgoing, Outline, Properties, status bar with sync state
  (Synced / Syncing / Offline / N pending) and a conflicts badge placeholder for P08.
- Routing by hash: `#/<path>`; internal links navigate; clicking an unresolved link
  creates the note.
- Quick switcher (Ctrl/Cmd+O), command palette (Ctrl/Cmd+P) with: New note, Open today's
  daily note, Toggle reading view, Delete note, Sync now, Open settings.

## Acceptance

```sh
pnpm -C quire --filter @quire/web typecheck
pnpm -C quire --filter @quire/web build
pnpm -C quire --filter @quire/web test
```

Result (2026-10-16): typecheck exit 0; build exit 0 (368 modules, main chunk about 1.1 MB, 374 kB
gzip; CodeMirror code languages split into lazy chunks); test exit 0 (3 files, 15 tests:
IndexedDB store with fake-indexeddb, workspace sync/offline/rebase/server switch against an
in-process SyncServer, tree, fuzzy match, notes helpers, link index).

Manual check against the real server (`apps/server`, built web served from it, Playwright
Chromium, two browser contexts): open note, Ctrl+E reading view, unresolved link click creates
the note, New note + inline title rename, Ctrl+O switcher, Ctrl+P palette (daily note), right
pane backlinks/outline, an edit on device B shows on device A, offline edit shows
"Offline · 1 pending" and syncs to "Synced" after reconnect, search pane, 390 px wide layout.

Per the coordinator's later instruction, no further unit tests were added after the first set;
the UI carries accessible roles and labels plus a few `data-testid`s for scenario tests.

## Needs from P00

- None. Note for the core owner: `@quire/core` imports `markdown-it-footnote` and
  `markdown-it-mark`, whose types live in `packages/core/src/markdown/vendor.d.ts`; that file is
  only in a program that includes it, so `apps/web/tsconfig.json` lists it in `include`. A
  `/// <reference path="./vendor.d.ts" />` in `md.ts` would make that unnecessary.

## Decisions log

- **D-P07-1** · confidence: med
  - Question: `SyncClient.write` and a sync cycle can interleave (read then put in separate
    IndexedDB transactions), which could put a stale `baseRev` under a newer edit and let the
    next push fast-forward over a remote change.
  - Did: `src/store/workspace.ts` serialises store writes and sync cycles with one mutex. UI
    edits are applied to an in-memory mirror at once and written in the background; if the stored
    text moved since the edit started (pull or push reply), the edit is rebased with
    `merge3(base, local, stored)` (local wins overlapping hunks, as in R-SYN-07), and the editor
    gets the merged text.
  - Why: R-SYN-05/07 (no silent loss) with the unchanged `@quire/sync` API.
  - Reverse: drop the mutex and call `client.write` directly in `Workspace.write`.
- **D-P07-2** · confidence: med
  - Question: "New folder by path prefix": folders have no existence of their own in the
    revision log.
  - Did: New folder asks for a folder path and creates `<folder>/Untitled.md` there (focused
    title, so the user names it at once). No empty-folder state is kept.
  - Why: storage model (documents only, `.md` paths); simplest and identical on every device.
  - Reverse: keep a list of empty folders in `meta` and pass it to `buildTree(paths, extra)`.
- **D-P07-3** · confidence: med
  - Question: How to rename a note (Obsidian's inline title) with path identity.
  - Did: editable inline title above the editor and a "Rename note" command; a rename is a
    create plus a delete. Links to the note are not rewritten.
  - Why: design.md risks (rename tracking is a follow-up); OBS-UX-07 (create by naming).
  - Reverse: remove `InlineTitle` and the command, or add link rewriting in `Workspace.rename`.
- **D-P07-4** · confidence: high
  - Question: Ctrl+N cannot be intercepted by pages in Chrome.
  - Did: "New note" is bound to Mod+N and Alt+N; both are listed in the palette.
  - Why: Obsidian default is Mod+N; Alt+N keeps a working hotkey in browsers.
  - Reverse: `commands` list in `src/App.tsx`.
- **D-P07-5** · confidence: med
  - Question: What happens to the local copy when the server URL changes in Settings.
  - Did: on start, if the stored `serverUrl` (IndexedDB `meta`) differs, documents with unsynced
    edits are kept as new documents (`baseRev: null`) and everything else is dropped, cursor 0.
    Settings warns about this before saving; saving reloads the page.
  - Why: revisions and the cursor are per server; R-SYN-05 forbids losing unsynced edits.
  - Reverse: `prepareStoreForServer` in `src/store/workspace.ts`.
- **D-P07-6** · confidence: high
  - Question: Editor mode. Obsidian defaults to Live Preview; the packet says source mode.
  - Did: CodeMirror Markdown source mode (with a front matter block parser so YAML is not read
    as a setext heading) plus reading view on Ctrl/Cmd+E; the reading view is the
    `renderMarkdown` output with properties shown on top.
  - Why: packet contract; Live Preview is a follow-up.
  - Reverse: n/a.
- **D-P07-7** · confidence: med
  - Question: Syntax colours in dark mode without importing `@lezer/highlight` (not a direct
    dependency, so not resolvable under pnpm).
  - Did: reuse `defaultHighlightStyle.specs` from `@codemirror/language` with each colour
    routed through a CSS variable (`--hl-708` ...) redefined in the dark theme.
  - Why: no new dependency (packet rule).
  - Reverse: add `@lezer/highlight` (P00) and define a `HighlightStyle` with tags directly in
    `src/components/editorSetup.ts`.
- **D-P07-8** · confidence: med
  - Question: Sync state wording and tag search.
  - Did: status bar shows Synced, Syncing (only when a cycle lasts over 400 ms, to avoid
    flicker), Offline (plus "· N pending"), N pending, Sync error; clicking it syncs now. Tag
    clicks open the left Search pane with `tag:<name>` (matches nested tags too).
  - Why: packet wording; Obsidian opens tag search in the search pane.
  - Reverse: `src/components/StatusBar.tsx`, `src/components/SearchPane.tsx`.
- **D-P07-9** · confidence: high
  - Question: Delete confirmation.
  - Did: an in-app confirm dialog (role `alertdialog`) instead of `window.confirm`.
  - Why: Obsidian "Confirm file deletion" on; easier to drive in scenario tests.
  - Reverse: `ConfirmDialog` use in `src/App.tsx`.
