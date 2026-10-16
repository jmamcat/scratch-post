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
status: todo
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

## Decisions log
