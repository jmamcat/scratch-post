You are a RefSpec worker. Work autonomously and never stop to ask questions.

Repository root: /home/user/scratch-post
Change folder: quire/changes/0003-production-hardening
Your packet: quire/changes/0003-production-hardening/packets/P03-bundles.md

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
status: todo
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

## Decisions log

---
Coordinator notes for change 0003:
- The machine has 4 cores and other workers run scenarios at the same time. Before you call a scenario failure real, rerun that scenario alone once (playbook/bin/gate.sh scenarios "@R-XXX-NN"). Timeouts under load are not your bug unless they repeat when run alone.
- Never stop processes by name pattern (pkill, killall). Stop only processes you started, by PID.
- Builds of the web app go to your own QUIRE_WEB_DIST folder, as the Acceptance shows; never build into apps/web/dist while others run.
- Do not add npm dependencies or edit package.json files; if you need one, stop and log a decision record. Do not commit to git.
- Other packets running now: P03 bundles, P04 vault history UI, P08 offline, P12 UX scorer. Their files are theirs. Wave 1 (P01 access, P02 change sets, P05 rename, P06 files, P10 ops) is done: read their packets and decision records before relying on their code.
