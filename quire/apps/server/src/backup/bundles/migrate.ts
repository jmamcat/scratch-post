import { randomBytes } from 'node:crypto';
import { mkdirSync, renameSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { Config } from '../../platforms/index.ts';

/**
 * Before migrations run on an existing database with a backup folder, copies it whole with
 * `VACUUM INTO` to `pre-migrate-v<from>-to-v<to>-<time>.db` in the backup folder (R-BAK-01).
 * A copy, not a bundle: bundles need the latest schema, which the database does not have yet.
 * A failed copy throws, so the server never migrates without it.
 */
export function beforeMigrate(config: Config, dbFile: string): (from: number, to: number) => void {
  return (from, to) => {
    const dir = config.backupDir;
    if (!dir) return;
    mkdirSync(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const tmp = join(dir, `.tmp-${randomBytes(6).toString('hex')}.db`);
    const db = new DatabaseSync(dbFile);
    try {
      db.prepare('VACUUM INTO ?').run(tmp);
      renameSync(tmp, join(dir, `pre-migrate-v${from}-to-v${to}-${stamp}.db`));
    } catch (e) {
      rmSync(tmp, { force: true });
      throw new Error(`could not copy the database to ${dir} before migrating: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      db.close();
    }
  };
}
