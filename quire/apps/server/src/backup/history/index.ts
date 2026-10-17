import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { SyncError } from '@quire/sync';
import type { Hono } from 'hono';
import type { Config } from '../../platforms/index.ts';
import { SqliteRevisionStore } from '../../vault/index.ts';
import { beforeMigrate } from '../bundles/index.ts';
import type { Background, BackupDeps } from '../deps.ts';
import { ChangeSets } from './changesets.ts';
import { compactHistory, describe } from './compact.ts';
import { restoreVault } from './restore.ts';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
/** A second process (`quire compact`) may hold the write lock briefly; wait instead of failing. */
const BUSY_TIMEOUT_MS = 5000;

/**
 * Change sets and whole-vault restore (R-BAK-02, R-BAK-03).
 *
 * - `GET /api/changesets?limit=50&before=<id>` -> `ChangeSet[]` newest first.
 * - `POST /api/changesets/:id/restore` with `{ device }` -> `{ changeset }`, the set the restore wrote.
 */
export function historyRoutes(app: Hono, deps: BackupDeps): void {
  const sets = new ChangeSets(deps.store.db, deps.config.changesetGapMs);
  app.get('/api/changesets', (c) => {
    const limit = Math.min(500, Math.max(1, positive(c.req.query('limit') ?? '50', 'limit')));
    const before = c.req.query('before');
    return c.json(sets.list(limit, before === undefined ? undefined : positive(before, 'before')));
  });

  app.post('/api/changesets/:id/restore', async (c) => {
    const id = positive(c.req.param('id'), 'id');
    const body = await c.req.json<{ device?: unknown }>();
    if (typeof body?.device !== 'string' || !body.device) throw new SyncError(400, 'expected { device }');
    const changeset = await restoreVault(deps, sets, id, body.device);
    deps.metrics.inc('quire_vault_restores_total');
    return c.json({ changeset });
  });
}

/**
 * Assigns every commit to a change set, closes quiet sets every half gap and compacts history
 * once a day, the first time an hour after start (R-BAK-02, R-BAK-04).
 */
export function startHistory(deps: BackupDeps): Background {
  const sets = new ChangeSets(deps.store.db, deps.config.changesetGapMs);
  deps.store.db.exec(`PRAGMA busy_timeout = ${BUSY_TIMEOUT_MS}`);
  sets.assignPending();
  // A failed assignment must not fail the commit that triggered it; the next commit catches up.
  const onWrite = () => guarded(deps, 'assigning change sets', () => sets.assignPending());
  deps.hooks.afterWrite.add(onWrite);

  const gap = deps.config.changesetGapMs;
  const closer = setInterval(() => guarded(deps, 'closing change sets', () => sets.closeQuiet()), Math.max(50, gap / 2));
  let daily: NodeJS.Timeout | null = null;
  let running: Promise<unknown> = Promise.resolve();
  const compact = () => {
    running = deps.sync.exclusive(() =>
      guarded(deps, 'compaction', () => {
        const r = compactHistory(deps.store.db, sets, options(deps.config));
        deps.log.info('history compacted', { ...r });
        deps.metrics.inc('quire_compacted_revisions_total', {}, r.revisions);
      }),
    );
  };
  const first = setTimeout(() => {
    compact();
    daily = setInterval(compact, DAY_MS);
  }, HOUR_MS);

  return {
    async stop() {
      deps.hooks.afterWrite.delete(onWrite);
      clearInterval(closer);
      clearTimeout(first);
      if (daily) clearInterval(daily);
      await running;
    },
  };
}

/** `quire compact`; returns the exit code. */
export async function compactCli(args: string[], config: Config): Promise<number> {
  if (args.length) {
    console.error('usage: quire compact');
    return 2;
  }
  const dbFile = join(config.dataDir, 'quire.db');
  if (!existsSync(dbFile)) {
    console.error(`quire compact: no database at ${dbFile}`);
    return 1;
  }
  const store = new SqliteRevisionStore(dbFile, { beforeMigrate: beforeMigrate(config, dbFile) });
  try {
    store.db.exec(`PRAGMA busy_timeout = ${BUSY_TIMEOUT_MS}`);
    const sets = new ChangeSets(store.db, config.changesetGapMs);
    for (const line of describe(compactHistory(store.db, sets, options(config)))) console.log(line);
    return 0;
  } catch (e) {
    console.error(`quire compact: ${e instanceof Error ? e.message : String(e)}`);
    return 1;
  } finally {
    store.close();
  }
}

function options(config: Config) {
  return { dataDir: config.dataDir, gapMs: config.changesetGapMs, keepAllDays: config.keepAllDays, backupsOn: !!config.backupDir };
}

function guarded(deps: BackupDeps, what: string, fn: () => void): void {
  try {
    fn();
  } catch (e) {
    deps.log.error(`${what} failed`, { error: e instanceof Error ? e.message : String(e) });
  }
}

function positive(v: string, name: string): number {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1) throw new SyncError(400, `${name} must be a positive integer`);
  return n;
}
