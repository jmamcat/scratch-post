---
id: 0003-production-hardening/P05
title: Rename keeps links and history
lane: C
depends_on: [P00]
owns:
  - quire/packages/navigate/src/rename.ts
  - quire/scenarios/steps/rename.steps.ts
borrows:
  - quire/packages/navigate/src/index.ts  # export line for rename.ts
  - quire/packages/sync/src/client.ts  # SyncClient.rename and handling PushResult.movedTo
  - quire/packages/sync/src/server.ts  # pass renamedFrom to commit; redirect edits to renamed paths; RevisionStore.renamedTo
  - quire/apps/server/src/vault/store.ts  # renamedTo() for SqliteRevisionStore
  - quire/apps/web/src/sync/workspace.ts  # rename(): use SyncClient.rename and rewrite links
  - quire/apps/web/src/navigate/FileTree.tsx  # only if it has no Rename action yet
reads:
  - quire/changes/0003-production-hardening/**
  - quire/spec/**
  - quire/packages/**
  - quire/apps/server/src/**
  - quire/apps/web/src/**
  - quire/scenarios/**
  - references/obsidian/product/features.md
size: M
revision: 1
status: done
claimed_by: claude-code/tier-A
---

# Rename keeps links and history

## Context

Implements R-VLT-09 and R-VLT-10 (`quire/changes/0003-production-hardening/spec/vault/spec.md`).
Baseline: Obsidian rewrites links on rename (OBS-F-042). P00 added `PushItem.renamedFrom`,
`PushResult.movedTo`, `DocMeta.renamedFrom`, the `revisions.renamed_from` column, commit
extras (`store.commit(path, text, device, hash, extra)`), and `store.history(path)`, which
already follows `renamed_from` back to earlier names.

## Contract

```ts
// @quire/navigate (pure)
export interface RenameEdit { path: string; text: string }
/** Notes whose links resolved to `from` and must change when it becomes `to`. */
export function planRename(notes: Iterable<{ path: string; text: string }>, from: string, to: string): RenameEdit[];
// SyncClient
rename(from: string, to: string): Promise<void>;   // local move; next push sends { path: to, renamedFrom: from } and the deletion of `from`
// RevisionStore (both implementations)
renamedTo(path: string, afterRev: number): string | null;   // the newest path `path` was renamed to after `afterRev`, following chains
```

Rules:

- `planRename` resolves links with the same rules the app uses (`@quire/navigate`
  resolve-link; build the path list after the rename). Wikilinks and embeds keep `!`,
  `#heading`, `^block` and `|alias` and use the shortest unique link text for the new path
  (as Obsidian); Markdown links keep their fragment and become the relative path from the
  linking note's folder, percent-encoding spaces the way the original did. Text outside
  links never changes; links inside code spans and blocks are left alone.
- `LocalDoc` may carry `renamedFrom?: string` until the push succeeds, so an offline rename
  survives restarts (the web store saves whole objects).
- Server push of an item whose `baseRev` is older than a rename of its path: merge into the
  renamed path (`merge3` of base text, the renamed head and the pushed text, like any stale
  push), commit there, return `movedTo`. Do this before the delete-versus-edit rule, so the
  old path is not recreated. The client then drops its copy of the old path and keeps the
  new head.
- Web: `Workspace.rename(from, to)` writes the `planRename` edits through `write` (so open
  editors and live rooms see them) and calls the client's rename. The inline title already
  calls `ws.rename`.
- Steps (`quire/scenarios/steps/rename.steps.ts`): `"d" renames "p" to "q"` for system
  devices (apply `planRename` over the device's notes with `client.write`, then
  `client.rename`); `"d" renames the open note to "title"` for browser devices (edit the
  inline title `Note title`, press Enter); `within N seconds the cloud server has "p"
  reading "t"` already exists.

## Acceptance

```sh
export QUIRE_WEB_DIST=/tmp/quire-web-P05
pnpm -C quire --filter @quire/web exec vite build --outDir "$QUIRE_WEB_DIST" --emptyOutDir
playbook/bin/gate.sh check
playbook/bin/gate.sh scenarios "@R-VLT-09|@R-VLT-10|@cap-sync|@cap-review|@R-VLT-06|@R-NAV-02"
```

The rename scenarios pass; sync, review, history and link resolution scenarios still pass.

Result (2026-10-16, shared tree, web build in `/tmp/quire-web-P05`):

- `gate.sh check`: pass (types, dependency rules: 0 violations; structure: 0 violations, S8
  soft-size warnings only, including `sync/src/client.ts` 323 and `sync/src/server.ts` 355 lines).
- `gate.sh scenarios "@R-VLT-09|@R-VLT-10|@cap-sync|@cap-review|@R-VLT-06|@R-NAV-02"`:
  **28 passed** (R-VLT-09 ×2, R-VLT-10 ×1, R-SYN-01..10, R-RVW-01..07, R-VLT-06, R-NAV-02).
  One later rerun under load had R-RVW-03 "Keep incoming from the inbox" (@ui) fail once with
  "no open review item"; alone it passed (1 passed). No rename code runs in that scenario.
- Earlier runs failed only because the cloud server could not start (`RangeError` from the
  in-progress `access/guard.ts` size-limit middleware, P01); confirmed in an isolated copy with
  that one hunk reverted (28 passed) before the shared tree recovered.

## Decisions log

- **D-P05-1** · confidence: med
  - Question: should `planRename` change only links that resolved to `from`?
  - Did: rewrites every link that resolved before the rename and would resolve somewhere else
    after it: links to `from`, the renamed note's own links (its folder changes), and links the
    new name would capture. Unresolved links are never touched. The renamed note's edit uses
    its old path (`RenameEdit.path === from`), so writing it and then renaming moves the text.
  - Why: R-VLT-09 "every link ... that resolved to it" plus "text outside links never
    changes"; keeping every resolved link on its target is the same rule applied evenly.
  - Reverse: `packages/navigate/src/rename.ts`, skip links where `was !== from`.
- **D-P05-2** · confidence: med
  - Question: "the newest path `path` was renamed to after `afterRev`" when it was renamed more
    than once.
  - Did: take the first rename of `path` after `afterRev`, then follow later renames of each new
    name to the end of the chain; "newest" read as the newest name of that note. A note
    re-created under the old name and renamed again later is a different note.
  - Why: the edit's base belongs to the note that left `path` first after the base.
  - Reverse: `renamedTo` in `apps/server/src/vault/store.ts` and `MemoryRevisionStore` in
    `packages/sync/src/server.ts` (`ORDER BY rev DESC`, and `findLast`).
- **D-P05-3** · confidence: med
  - Question: R-VLT-10 also names "the file tree's Rename action"; `FileTree.tsx` has none.
  - Did: not added. A working action needs a prop passed from `Sidebar.tsx` and a handler in
    `App.tsx` (open the note, focus the inline title), and neither file is borrowed. The R-VLT-10
    scenario covers only the inline title and passes. **Needs from coordinator:** borrow
    `quire/apps/web/src/Sidebar.tsx` and `quire/apps/web/src/App.tsx` for this, or a follow-up
    packet. Note: file rows are `<a>` elements, so the button must sit beside the link, not in it.
  - Why: run protocol, never edit an unlisted path.
  - Reverse: add `onRename(path)` to `FileTree`, pass it through `Sidebar`, and in `App` open the
    note and bump `setTitleFocus`.
- **D-P05-4** · confidence: high
  - Question: should a stale deletion of a renamed path follow the rename too?
  - Did: no. Only edits are redirected. A stale delete of the old path meets the deletion that
    the rename left there and is a noop, so the renamed note survives.
- **D-P05-5** · confidence: med
  - Question: link text for the new path.
  - Did: wikilinks use the file name when no other path shares it (case-insensitive, without
    `.md`), else the vault path without `.md`, else `/path`. `.md` is kept if the original link
    had it. Markdown links use the relative path from the linking note's folder, falling back to
    `/path` when the relative one would resolve elsewhere (resolution tries vault paths first).
    They keep `<...>`, the fragment, the title and `.md` or no `.md`. Spaces become `%20` and
    parentheses `%28`/`%29`. If the original had other percent escapes, the whole path is
    `encodeURI`d. Every candidate is checked with `resolveLink` before it is used.
  - Why: OBS-F-042 ("shortest path when possible"; Markdown links relative); packet rule on
    encoding spaces the way the original did.
  - Reverse: `rewriteWiki` and `rewriteMarkdown` in `packages/navigate/src/rename.ts`.
- **D-P05-6** · confidence: med
  - Question: push order and when `renamedFrom` is recorded.
  - Did: the client pushes renamed copies before other dirty notes, so the server sees the
    rename before the old path's deletion. The server stores `renamedFrom` only when the new
    path has no head or a deleted head; a rename onto a live note merges like any create and
    does not link the histories. A chain of offline renames (A→B→C) sends `C` with
    `renamedFrom: A`. Renaming back onto a path whose deletion is pending turns it into an
    edit of that path. `renamedFrom` is dropped once any push result for the copy arrives.
  - Why: `store.history` stops at the first `renamed_from`; simplest reversible option.
  - Reverse: `pushDirty` and `rename` in `packages/sync/src/client.ts`; `extra` in `pushAt`
    in `packages/sync/src/server.ts`.
- **D-P05-7** · confidence: med
  - Question: the in-memory `MemoryRevisionStore.history` does not follow renames (only the
    SQLite store does, from P00), and the local node replicator (`apps/server/src/sync/
    replicator.ts`) pushes upstream without `renamedFrom`.
  - Did: left both as they are. Neither is borrowed, and no scenario runs a rename through a
    local node. A rename made on a local node reaches the cloud as a create plus a delete, so
    the cloud history does not follow it there. Edits still follow renames, because the
    redirect is server-side.
  - Reverse: a follow-up that forwards `renamedFrom` in the replicator and mirrors the SQLite
    `history` walk in `MemoryRevisionStore`.
