# backup (server)

Keeping every state recoverable. `history/`: change sets, whole-vault restore, compaction.
`bundles/`: chained backup bundles built from closed change sets, verify and restore.

- Public API: `backupRoutes`, `startBackup`, `beforeMigrate`, `backupCli`, `restoreCli`, `compactCli`.
- Depends on: `@quire/sync`, `vault/` (store, blobs), `ops/` (log, metrics), `platforms/`.
- Specs: `R-BAK-*`.
