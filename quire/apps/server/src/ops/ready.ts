import { randomUUID } from 'node:crypto';
import { rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Config } from '../platforms/index.ts';
import type { SqliteRevisionStore } from '../vault/index.ts';

export interface ReadyDeps {
  config: Config;
  store: SqliteRevisionStore;
}

/** Names of the checks that fail right now; empty when the server is ready (R-OPS-01). */
export function failingChecks({ config, store }: ReadyDeps): string[] {
  const failing: string[] = [];
  if (!databaseWritable(store)) failing.push('db');
  if (!folderWritable(join(config.dataDir, 'vault'))) failing.push('vault');
  if (config.backupDir && !backupOk(config.backupDir, store)) failing.push('backup');
  return failing;
}

/** A write inside a transaction that is rolled back, so nothing is kept. */
function databaseWritable(store: SqliteRevisionStore): boolean {
  try {
    store.db.exec('BEGIN IMMEDIATE');
    try {
      store.db.prepare("INSERT INTO kv (key, value) VALUES ('ops.readiness', '1')").run();
    } finally {
      store.db.exec('ROLLBACK');
    }
    return true;
  } catch {
    return false;
  }
}

function backupOk(dir: string, store: SqliteRevisionStore): boolean {
  return folderWritable(dir) && !store.getKv('backup.lastError');
}

/**
 * Creates and removes a probe file. The name starts with a dot, which the vault mirror
 * ignores, so the probe never becomes a note.
 */
function folderWritable(dir: string): boolean {
  try {
    if (!statSync(dir).isDirectory()) return false;
    const probe = join(dir, `.quire-ready-${randomUUID()}`);
    writeFileSync(probe, '');
    rmSync(probe);
    return true;
  } catch {
    return false;
  }
}
