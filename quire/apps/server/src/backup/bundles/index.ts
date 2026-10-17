/**
 * Backup bundles and restore (R-BAK-05, R-BAK-06, the backup step of R-BAK-01). Bundles are
 * built from closed change sets (`changesets.closed`, set by the history module) and recorded in
 * the `backups` table. Readiness reads kv `backup.lastSuccessAt` and `backup.lastError` (ISO
 * time / message, cleared on success). The file format is described in `format.ts`.
 */
export { backupCli, restoreCli } from './cli.ts';
export { beforeMigrate } from './migrate.ts';
export { startBundles } from './writer.ts';
