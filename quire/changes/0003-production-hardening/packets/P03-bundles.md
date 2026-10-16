---
id: 0003-production-hardening/P03
title: Backup bundles, verify and restore
lane: B
depends_on: [P02]
owns:
  - quire/apps/server/src/backup/bundles/**
  - quire/scenarios/steps/backup-bundles.steps.ts
borrows: []
reads:
  - quire/changes/0003-production-hardening/**
  - quire/spec/**
  - quire/apps/server/src/**
  - quire/packages/sync/src/**
  - quire/scenarios/**
size: M
revision: 1
status: done
claimed_by: claude-code/tier-A
---

# Backup bundles, verify and restore

## Context

Implements R-BAK-05, R-BAK-06 and the backup step of R-BAK-01
(`quire/changes/0003-production-hardening/spec/backup/spec.md`), and makes R-OPS-01 pass by
recording backup failures. P02 (done) maintains `changesets` and sets `closed = 1`; you build
bundles from closed change sets. P00 wrote the stub `backup/bundles/index.ts` (mounted by
`backup/index.ts`, called from `app.ts` and `cli.ts`) and the `backups` table. Replace the
stub; keep its exports. The readiness check (P10, done) reads kv `backup.lastError` and
`backup.lastSuccessAt`.

## Contract

```ts
export function startBundles(deps: BackupDeps): Background;
export function beforeMigrate(config: Config, dbFile: string): (from: number, to: number) => void;
export async function backupCli(args: string[], config: Config): Promise<number>;   // now | verify | list
export async function restoreCli(args: string[], config: Config): Promise<number>;  // <backup-dir> --to <data-dir> [--at <rev>]
```

Rules:

- **Format** (yours to define, documented in `bundles/README.md` or a comment): one file per
  bundle, gzip (`node:zlib`), atomically written (temp file, then rename), named so `ls`
  sorts them in chain order, plus enough manifest data to verify without trusting the
  database: kind (`full` or `incremental`), sequence number, revision range, time span,
  devices, paths, change set ids, SHA-256 of the previous bundle file, and a content table
  where each distinct text and each blob appears once (keyed by SHA-256). A full bundle holds
  the whole revision log up to its last revision, the `changesets`, `conflicts` and `tokens`
  tables (token hashes only) and every referenced blob; an incremental bundle holds the
  revisions of the change sets that closed since the previous bundle, the conflicts they
  touched, and new blobs.
- **When**: with `config.backupDir` set, write a full bundle at start when there is none, then
  check every `max(250 ms, changesetGapMs / 2)` for closed change sets past the last bundled
  revision. Start a new full bundle after 7 days or 200 incrementals. Record each bundle in
  `backups`; on success set kv `backup.lastSuccessAt` and clear `backup.lastError`; on
  failure set `backup.lastError`, log through `deps.log`, keep running and retry next tick.
- **Verify** (`quire backup verify [--dir D]`): every file matches its recorded SHA-256, the
  previous-bundle links form one chain per full bundle, every content entry matches its key.
  Exit 0 and print `ok`, or exit 1 and name the first broken bundle.
- **Restore**: rebuild `quire.db` (latest schema via `SqliteRevisionStore`) and the vault and
  blob folders in `--to` from the newest chain, up to `--at <rev>` when given (stop at that
  revision; heads are the newest revision per path at or below it). Refuse a non-empty
  target. A server started on the folder serves the notes, files and history.
- **beforeMigrate**: before migrations run on an existing database with a backup folder,
  write a full copy first (a full bundle, or `VACUUM INTO` a dated file in the backup folder;
  log a decision for the choice).
- Steps (`quire/scenarios/steps/backup-bundles.steps.ts`): the bundle rows of STEPS.md
  "Versioning and backup". `a cloud server with a backup folder` starts the cloud server with
  `QUIRE_BACKUP_DIR` in its own temporary folder (not inside the data folder). `the cloud
  server's data is lost and restored from the backup folder [as of the first change set]`:
  read the change sets first when needed, stop the server, empty its data folder, run
  `quire restore`, start it again on the same port.

## Acceptance

```sh
playbook/bin/gate.sh check
playbook/bin/gate.sh scenarios "@R-BAK-0|@R-OPS-01|@cap-sync"
```

Every `@R-BAK-0*` scenario (R-BAK-01 to R-BAK-07 except R-BAK-07, which P04 owns) and
R-OPS-01 pass.

### Result

- `playbook/bin/gate.sh check`: typecheck clean, `no dependency violations found (235 modules)`,
  structure `0 violations` (6 soft-limit warnings, none in `backup/bundles/`).
- `playbook/bin/gate.sh scenarios "@R-BAK-0|@R-OPS-01|@cap-sync"`: 30 scenarios, **29 passed, 1 failed**.
  Passed: R-BAK-01 (2), R-BAK-02 (2), R-BAK-03 (2), R-BAK-04 (2), R-BAK-05 (3), R-BAK-06 (2),
  R-OPS-01 (1), `@cap-sync` (15). The one failure is R-BAK-07 "Restore from the app" (`@ui`,
  "the vault history on pixel lists 2 change sets: 0 listed"). That scenario belongs to P04,
  which is still running.
- Checked by hand as well: attachments are bundled once (the second path with the same bytes
  adds no blob) and restored byte for byte, `/api/files` and `/api/blobs` serve them after a
  restore, a restart continues the existing chain, a restore into a non-empty folder is refused,
  `--at 1` cuts a change set, the v1 to v2 migration writes `pre-migrate-v1-to-v2-<time>.db`
  (user_version 0, 1 revision), a full bundle is written again once the chain is older than
  7 days, a flipped gzip header byte is caught by the name checksum, a flipped middle byte is
  caught by the gzip check, and `backup list` and `backup now` work.

## Decisions log

- **D-P03-1** · confidence: med
  - Question: Where is the newest bundle's SHA-256 recorded? No later bundle links to it, and verify may not trust the database.
  - Did: Each file is named `<seq:8>-<full|incremental>-<sha256 of the file>.bundle.gz`. Verify checks every file against its name, and also checks each incremental's `prevSha256` against the file before it.
  - Why: The tamper scenario changes the newest bundle. A change in the gzip header (for example the mtime bytes) gets past gunzip, so a checksum stored outside the file is needed. The name keeps it at "one file per bundle", and `ls` still sorts in chain order.
  - Reverse: `bundleName` and `listBundles` in `bundles/format.ts`, plus `BUNDLE` in `scenarios/steps/backup-bundles.steps.ts`. The alternative is a `.sha256` sidecar per bundle.
- **D-P03-2** · confidence: med
  - Question: What is the layout inside the gzip?
  - Did: The line `quire-bundle 1`, then the manifest as one JSON line (kind, seq, prevSha256, revision range, span, devices, paths, change set ids, rows, content table), then the raw bytes of each content entry in table order. Content is written and read as streams. Each entry is checked against its key both when it is written and when it is read.
  - Why: Blobs go in as raw bytes with no base64 and are never held whole in memory. The manifest comes first, so the range and the needed entries are known before any content is read.
  - Reverse: `format.ts` (writer) and `reader.ts`.
- **D-P03-3** · confidence: med
  - Question: `beforeMigrate`: write a full bundle or `VACUUM INTO`?
  - Did: `VACUUM INTO <backupDir>/pre-migrate-v<from>-to-v<to>-<time>.db`, through a temp file and a rename. If the copy fails, it throws, so the server refuses to start rather than migrate without a copy.
  - Why: A bundle needs the latest schema (`changesets`, `blobs`, `tokens`, `backups`), and the database does not have that yet. `VACUUM INTO` is an exact, consistent copy. Verify and restore skip these files.
  - Reverse: `bundles/migrate.ts`.
- **D-P03-4** · confidence: high
  - Question: Which revisions can a bundle hold?
  - Did: Up to the end of the newest closed change set, and only when every revision before that point is in a closed set (no open set and no unassigned revision before it). A full bundle covers 1 to that point. An incremental covers the previous `lastRev + 1` to that point, and verify checks that the ranges join up. A full bundle written at start can therefore be empty (`1..0`).
  - Why: The packet says bundles are built from closed change sets, and the next bundle has to start exactly where the last one ended.
  - Reverse: `bundleableRev` in `bundles/plan.ts`.
- **D-P03-5** · confidence: med
  - Question: What goes into an incremental besides revisions and change sets?
  - Did: The conflicts it touched: those on one of its paths, or that name a revision in its range (`rev`, `resolvedRev` or `current.rev`). Also the whole `tokens` table (hashes only) in every bundle, not just in full ones. Restore takes the tokens from the newest bundle it restores.
  - Why: Tokens change without any revision. If only full bundles carried them, a restore would lose every token added since the last full bundle (up to 7 days). The table is at most `maxTokens` rows.
  - Reverse: `planBundle` (tokens and conflicts filter) and `insertBundle` in `restore.ts`.
- **D-P03-6** · confidence: med
  - Question: How does the writer find "new blobs" without reading earlier bundles?
  - Did: An incremental holds a blob unless some revision before its range that is still in the database references it. After compaction removes that revision, the blob may be stored a second time. That costs space but never loses data. Verify requires every blob reference to resolve within the bundle or earlier in the same chain.
  - Why: The packet adds no table for bundled blobs. Every revision in the database below the range belongs to the current chain (its full bundle, or an incremental after it).
  - Reverse: the `known` query in `planBundle`.
- **D-P03-7** · confidence: med
  - Question: When does a new full bundle start, and how are bundle numbers chosen?
  - Did: A full bundle is written right away when `backups` is empty or its newest file is missing from the folder. A full bundle replaces the next incremental once the chain's full bundle is 7 days old or 200 incrementals follow it; with nothing new, nothing is written. `seq` is max(table, folder) + 1.
  - Why: A restored server has an empty `backups` table but writes into the old folder. Its numbers must not collide, and its new chain must start after the old one.
  - Reverse: `nextKind` in `plan.ts` and `writeNext` in `writer.ts`.
- **D-P03-8** · confidence: med
  - Question: Should a restore fill in `backups` so the restored server continues the old chain?
  - Did: No. A restored server starts a new chain (a full bundle at start) in the same folder. Until then, compaction protects everything, because `MAX(backups.last_rev)` is 0.
  - Why: After an `--at` restore, the old chain holds revisions the database no longer has, so continuing it would produce a broken chain. Starting a new chain is always correct.
  - Reverse: `restoreBundles` in `restore.ts`. It could insert the chain's rows when `--at` is not given.
- **D-P03-9** · confidence: low
  - Question: What does `--at <rev>` do with change sets and conflicts after the cut?
  - Did: Change sets that start after the cut are dropped. The set that contains the cut ends at the cut, with its `ended_at` and count recomputed, and all restored sets are closed. Conflicts that name a revision after the cut are dropped. Other conflicts keep the newest status found in the restored bundles.
  - Why: The spec says only "up to that point". Conflict rows carry no history, so a status as of an earlier revision cannot be reconstructed.
  - Reverse: `finish` in `restore.ts`.
- **D-P03-10** · confidence: med
  - Question: How does restore check the chain, and what happens when it fails?
  - Did: Restore uses only the newest chain. A first pass checks it up to `--at` and stops before any bundle that starts after the cut, so a broken bundle past the cut does not block an earlier restore. A second pass writes the data. If anything fails after writing has started, restore empties the target again. The target was checked to be empty first, so nothing else is removed.
  - Why: R-BAK-06 says "checking each against its manifest and the chain". Nothing gets written from a broken chain, and a half-built data folder is never left behind.
  - Reverse: `restoreBundles` in `restore.ts`.
- **D-P03-11** · confidence: med
  - Question: `quire backup verify` on a folder with no bundles.
  - Did: Exit 1 with `broken: <dir>: no backup bundles`. On success it prints `ok` on the first line and a summary on the second.
  - Why: An "ok" for an empty folder would hide a backup that never ran.
  - Reverse: `verifyFolder` in `verify.ts`.
- **D-P03-12** · confidence: med
  - Question: Retries happen every tick. How much should be logged?
  - Did: A failure is logged at error level when its message differs from the stored `backup.lastError`, and `backup recovered` is logged when it clears. `backup.lastError` is rewritten on every failed attempt. Each written bundle is logged at info level, and counted in a new counter `quire_backups_total{kind}`, which has no help text because `ops/metrics.ts` is not owned.
  - Why: With the default 10-minute gap, retries come every 5 minutes. In scenarios they come every 500 ms.
  - Reverse: `recordOutcome` and `startBundles` in `writer.ts`. Register the counter's help text in `ops/metrics.ts` if it stays.
- **D-P03-13** · confidence: med
  - Question: `quire backup now`, which runs in another process.
  - Did: It opens the database the way `quire compact` does (migrations with the backup hook, `busy_timeout` 5 s), assigns pending revisions, closes quiet sets and writes one bundle if there is anything to write. It prints `wrote <file>` or `nothing new to back up`. It reads `ChangeSets` from `../history/changesets.ts`; the import is inside the module and makes no cycle.
  - Why: On a stopped server, the last change set would otherwise never close. A `backup now` running at the same moment as a running server's write can collide on `seq`. In that case one of the two fails and the next tick retries.
  - Reverse: `now` in `bundles/cli.ts`.
- **D-P03-14** · confidence: med
  - Question: How do the scenario steps read bundles when scenarios may not import the server?
  - Did: The steps match the file name pattern and parse the layout directly (gunzip, two lines, then the content table) to count stored texts. Verify and restore run as `tsx src/cli.ts` processes, the same way the compaction step does.
  - Why: Same dependency rule as D-P02-8.
  - Reverse: `BUNDLE` and `bundleTexts` in `scenarios/steps/backup-bundles.steps.ts`. They must follow any format change.
- **D-P03-15** · confidence: high
  - Question: Should a full bundle link to the previous chain?
  - Did: No. A full bundle has `prevSha256: null` and starts its own chain. Verify checks each chain separately and requires the first bundle in the folder to be a full one.
  - Why: The packet says "one chain per full bundle".
  - Reverse: `walkChains` in `verify.ts`.

