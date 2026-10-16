import type { Hono } from 'hono';
import { startBundles } from './bundles/index.ts';
import type { Background, BackupDeps } from './deps.ts';
import { historyRoutes, startHistory } from './history/index.ts';

export { backupCli, beforeMigrate, restoreCli } from './bundles/index.ts';
export type { Background, BackupDeps } from './deps.ts';
export { compactCli } from './history/index.ts';

export function backupRoutes(app: Hono, deps: BackupDeps): void {
  historyRoutes(app, deps);
}

/** Change-set tracking first, so bundles always see assigned revisions. */
export function startBackup(deps: BackupDeps): Background {
  const history = startHistory(deps);
  const bundles = startBundles(deps);
  return {
    async stop() {
      await bundles.stop();
      await history.stop();
    },
  };
}
