import { statSync } from 'node:fs';
import { join } from 'node:path';
import type { Hono } from 'hono';
import type { Config } from '../platforms/index.ts';
import type { SqliteRevisionStore } from '../vault/index.ts';
import { failingChecks } from './ready.ts';
import type { Registry } from './metrics.ts';

export interface EndpointDeps {
  config: Config;
  store: SqliteRevisionStore;
  metrics: Registry;
  live: () => { rooms: number; connections: number };
}

/** `/api/ready` (no token) and `/api/metrics` (behind the token guard), R-OPS-01 and R-OPS-03. */
export function opsRoutes(app: Hono, deps: EndpointDeps): void {
  const { config, store, metrics } = deps;

  app.get('/api/ready', (c) => {
    const failing = failingChecks({ config, store });
    if (failing.length === 0) return c.json({ ok: true });
    return c.json({ ok: false, failing }, 503);
  });

  app.get('/api/metrics', (c) => {
    // Gauges that are read on scrape rather than kept up to date.
    const live = deps.live();
    metrics.set('quire_conflicts_open', store.listConflicts('open').length);
    metrics.set('quire_live_rooms', live.rooms);
    metrics.set('quire_live_connections', live.connections);
    metrics.set('quire_backup_last_success_timestamp_seconds', lastBackupSeconds(store));
    metrics.set('quire_db_bytes', databaseBytes(config.dataDir));
    return c.body(metrics.text(), 200, { 'Content-Type': 'text/plain; version=0.0.4; charset=utf-8' });
  });
}

function lastBackupSeconds(store: SqliteRevisionStore): number {
  const at = Date.parse(store.getKv('backup.lastSuccessAt') ?? '');
  return Number.isNaN(at) ? 0 : at / 1000;
}

/** `quire.db` plus its write-ahead log; a missing file counts as zero. */
function databaseBytes(dataDir: string): number {
  let total = 0;
  for (const name of ['quire.db', 'quire.db-wal']) {
    try {
      total += statSync(join(dataDir, name)).size;
    } catch {
      // not there yet
    }
  }
  return total;
}
