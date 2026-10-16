---
id: 0003-production-hardening/P02
title: Change sets, whole-vault restore, compaction
lane: B
depends_on: [P00]
owns:
  - quire/apps/server/src/backup/history/**
  - quire/scenarios/steps/backup-history.steps.ts
borrows: []
reads:
  - quire/changes/0003-production-hardening/**
  - quire/spec/**
  - quire/apps/server/src/**
  - quire/packages/sync/src/**
  - quire/scenarios/**
size: M
revision: 1
status: doing
claimed_by: claude-code/tier-A
---

# Change sets, whole-vault restore, compaction

## Context

Implements R-BAK-01 (both scenarios), R-BAK-02, R-BAK-03 and R-BAK-04
(`quire/changes/0003-production-hardening/spec/backup/spec.md`). P00 wrote the schema
migration (version 2 in `apps/server/src/vault/schema.ts`: tables `changesets`, column
`revisions.changeset`) and the stub `backup/history/index.ts`, which `backup/index.ts`
mounts (`historyRoutes`) and starts (`startHistory`) before the bundle writer (P03, a later
packet, which reads `changesets.closed`). Replace the stub; keep its signatures.

## Contract

```ts
export function historyRoutes(app: Hono, deps: BackupDeps): void;
// GET  /api/changesets?limit=50&before=<id>  -> ChangeSet[] newest first (type in @quire/sync)
// POST /api/changesets/:id/restore  { device }  -> { changeset: ChangeSet }
export function startHistory(deps: BackupDeps): Background;   // { stop(): Promise<void> }
export async function compactCli(args: string[], config: Config): Promise<number>;
```

Rules:

- **Assignment.** A change set is a maximal run of consecutive revisions (global revision
  order) by one device with gaps under `config.changesetGapMs`. Register a
  `deps.hooks.afterWrite` listener: extend the newest open set when the device matches and
  the gap is short, otherwise close it and open a new one. Every commit goes through that
  hook (sync pushes, live rooms, files, restores). On start, assign revisions whose
  `changeset` is NULL (databases from schema version 1) the same way, using `created_at`.
- **Closing.** A set closes when another set starts, when it has been quiet for the gap (a
  timer every `gap / 2`), or at 500 revisions. Set `closed = 1`.
- **Restore.** Inside `deps.sync.exclusive(...)`: close the open set; for every path whose
  state at the end of the target set (latest revision with `rev <= last_rev`) differs from
  its head, call every `deps.hooks.beforeWrite` listener for the path, then commit the old
  state with `deps.store.commit(...)` (text, deletion, or for `kind = 'file'` the same `blob`
  and `size` with `extra`) and `deps.committed(...)`; the device is the requester. Then close
  the restore's set at once, so it is always its own change set. Return it.
- **Compaction** (`quire compact` and once a day while running, first run an hour after
  start): for change sets that are closed (or quiet for the gap) and ended more than
  `config.keepAllDays` days ago, keep only the last revision of each path in each set.
  Never delete a head (`heads` table), a revision a conflict refers to (parse
  `conflicts.data`: `rev`, `resolvedRev`, `current.rev`), or, when `config.backupDir` is set,
  a revision above the highest `backups.last_rev`. Delete `blobs` rows and files
  (`blobPath` from `vault/index.ts`) no remaining revision refers to. Print what was removed.
- `"d" restores the vault to change set N` resolves the Nth newest set from the list and
  posts the restore with the device's name.
- `a data folder from schema version 1 with "p" reading "t"`: build a temporary data folder
  whose `quire.db` has the version 1 tables only (copy the version 1 SQL from
  `vault/schema.ts`; `user_version` 0) and one revision plus head for the note, and the note
  file in `vault/`; set `world.preparedDataDir`. `a data folder from a newer schema version`:
  an empty database with `PRAGMA user_version = 99`. `the database has the latest schema
  version`: open the cloud server's `quire.db` read-only and compare with `SCHEMA_VERSION`.

Steps go in `quire/scenarios/steps/backup-history.steps.ts`: every phrase in
`quire/spec/STEPS.md`, section "Versioning and backup", about schema versions, change sets,
restore, compaction and `"p" is gone from "d"`. Bundle phrases belong to P03.

## Acceptance

```sh
playbook/bin/gate.sh check
playbook/bin/gate.sh scenarios "@R-BAK-01|@R-BAK-02|@R-BAK-03|@R-BAK-04|@cap-sync|@cap-vault"
```

All scenarios of R-BAK-01 to R-BAK-04 pass; sync and vault scenarios still pass.

## Decisions log

- **D-P02-1** · confidence: high
  - Question: Assign each commit from the `afterWrite` arguments, or from the database?
  - Did: The hook (and start-up, and `quire compact`) runs one catch-up, `ChangeSets.assignPending()`: every revision with `changeset IS NULL`, in revision order, inside `BEGIN IMMEDIATE`. Commits made before the hook existed (the start-up vault scan) or by another process are picked up the same way.
  - Why: The packet asks for the same rule on start and per commit. One code path keeps the grouping in global revision order even if a commit path skips the hook.
  - Reverse: `backup/history/changesets.ts`, `assignPending`.
- **D-P02-2** · confidence: med
  - Question: What does a restore return when the vault already matches the target set (nothing to commit, so no new set)?
  - Did: `409 the vault already matches change set N`. No empty change set is created.
  - Why: A change set needs at least one revision (`first_rev NOT NULL`). The contract has no "nothing changed" shape.
  - Reverse: `backup/history/restore.ts`. Return `{ changeset: null }` instead, and update the web client (P04).
- **D-P02-3** · confidence: med
  - Question: Live rooms flush pending typing in `beforeWrite`. Those flushes are commits by another device, so they could split the restore's change set.
  - Did: Restore calls `beforeWrite` for every differing path first. Then it closes the open set, computes the plan again from the new heads, and commits. The restore therefore stays in a single set of its own.
  - Why: R-BAK-03 says "all in one new change set".
  - Reverse: `restoreVault` in `restore.ts`.
- **D-P02-4** · confidence: med
  - Question: When `quire compact` (another process) holds the write lock, a server commit fails at once with SQLITE_BUSY.
  - Did: `startHistory` and `compactCli` set `PRAGMA busy_timeout = 5000` on their connections. The server's connection is the store's shared one.
  - Why: A push should not fail with a 500 while a compaction runs. Compaction transactions are short.
  - Reverse: Remove the pragma line in `history/index.ts`, or move it into `vault/store.ts` (not owned by P02).
- **D-P02-5** · confidence: med
  - Question: Compaction deletes a revision that carried `renamed_from` (a rename followed by edits in the same set). `history()` then stops following the rename.
  - Did: The kept last revision of that path in that set inherits the latest deleted `renamed_from`, when it has none of its own.
  - Why: Keep R-VLT-09 history across renames after compaction.
  - Reverse: `compactSet` in `history/compact.ts`.
- **D-P02-6** · confidence: med
  - Question: Should compaction update a set's `first_rev` and `last_rev`?
  - Did: Only `revisions` (the count) is updated. The range stays as recorded. `last_rev` always survives, because it is the last revision of some path.
  - Why: The range still describes the span the set covered. P03 bundles work with revision ranges.
  - Reverse: `compactHistory`, the UPDATE statement.
- **D-P02-7** · confidence: low
  - Question: A blob uploaded moments ago may not have its revision yet, and compaction would delete it as unreferenced.
  - Did: Unreferenced blobs are only removed when `created_at` is older than one change-set gap.
  - Why: The files upload flow (P06) was not written yet, so its ordering is unknown. Keeping a blob for one gap is the cautious choice.
  - Reverse: `compactHistory`, the blobs query.
- **D-P02-8** · confidence: med
  - Question: `the database has the latest schema version` should compare with `SCHEMA_VERSION`, but scenarios may not import the server.
  - Did: The step reads `apps/server/src/vault/schema.ts` as text and takes the highest `version: N`.
  - Why: Dependency rule: scenarios reach servers only as processes. Reading the source text keeps the step correct as migrations are added.
  - Reverse: `latestSchemaVersion()` in `scenarios/steps/backup-history.steps.ts`. Expose the version on `/api/health` instead.
- **D-P02-9** · confidence: med
  - Question: How does `quire compact` see the server's settings, and what does it do with an unmigrated database?
  - Did: It opens the store through `SqliteRevisionStore` with `beforeMigrate` from bundles, so it migrates as the server would. It assigns pending revisions and closes quiet sets before compacting. The scenario step passes the cloud server's environment, with gap 1000 ms.
  - Why: Compaction needs change sets. Without this, a version 1 database compacted before its first server start would have none.
  - Reverse: `compactCli` in `history/index.ts`.
- **D-P02-10** · confidence: high
  - Question: Can restore and in-server compaction interleave with pushes?
  - Did: Both run inside `deps.sync.exclusive`.
  - Why: The packet requires it for restore. For compaction, a push merge should never see its base revision deleted mid-push.
  - Reverse: `startHistory`.
- **D-P02-11** · confidence: med
  - Question: How should a file revision be restored or deleted?
  - Did: A file restore commits `text = null` with `{ kind: 'file', blob, size }` and the old hash. Deleting a path whose head is a file commits `{ kind: 'file' }` with no blob, so `files.mirror` (P06) removes it from the vault folder.
  - Why: Matches the packet ("the same blob and size with extra"). Deletions need `kind` so they reach the files mirror rather than the note mirror.
  - Reverse: `restoreVault` in `restore.ts`.
