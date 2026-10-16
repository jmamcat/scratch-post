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
status: todo
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
