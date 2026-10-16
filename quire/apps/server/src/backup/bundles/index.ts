import type { Config } from '../../platforms/index.ts';
import type { Background, BackupDeps } from '../deps.ts';

/**
 * Backup bundles and restore (R-BAK-05, R-BAK-06, the backup step of R-BAK-01). Contract fixed
 * by 0003/P00; P03 implements it. Bundles are built from closed change sets (`changesets.closed`
 * is set by the history module) and recorded in the `backups` table. Readiness reads kv keys
 * `backup.lastSuccessAt` and `backup.lastError` (ISO time / message, cleared on success).
 */
export function startBundles(_deps: BackupDeps): Background {
  return { stop: async () => undefined };
}

/** Called by the store before migrations run on an existing database. */
export function beforeMigrate(_config: Config, _dbFile: string): (from: number, to: number) => void {
  return () => undefined;
}

/** `quire backup now|verify|list` and `quire restore <dir> --to <data-dir> [--at <rev>]`. */
export async function backupCli(_args: string[], _config: Config): Promise<number> {
  console.error('quire backup: not implemented yet (0003/P03)');
  return 2;
}

export async function restoreCli(_args: string[], _config: Config): Promise<number> {
  console.error('quire restore: not implemented yet (0003/P03)');
  return 2;
}
