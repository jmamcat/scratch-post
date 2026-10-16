import { join } from 'node:path';
import { type DocMeta, SyncServer } from '@quire/sync';
import { Hono } from 'hono';
import { type Access, createAccess } from './access/index.ts';
import { type BackupDeps, backupRoutes, beforeMigrate } from './backup/index.ts';
import { eventRoutes } from './live/index.ts';
import { type Ops, createOps } from './ops/index.ts';
import { type Config, serveWebClient } from './platforms/index.ts';
import { reviewRoutes } from './review/index.ts';
import { EventHub } from './shared/events.ts';
import { onError } from './shared/http.ts';
import { syncRoutes } from './sync/index.ts';
import { type Files, SqliteRevisionStore, VaultMirror, createFiles, vaultRoutes } from './vault/index.ts';

/** Everything one server process holds. Built here, the composition root for HTTP. */
export interface QuireServer {
  config: Config;
  app: Hono;
  sync: SyncServer;
  store: SqliteRevisionStore;
  vault: VaultMirror;
  events: EventHub;
  access: Access;
  ops: Ops;
  files: Files;
  /** Everything the backup module needs, built once. */
  backupDeps: BackupDeps;
  hooks: {
    beforeWrite: Set<(path: string) => void>;
    afterWrite: Set<(path: string, text: string | null, meta: DocMeta) => void>;
  };
  /** Record a commit made outside SyncServer (live rooms): mirror it to disk and announce it. */
  committed(path: string, text: string | null, meta: DocMeta): void;
  close(): Promise<void>;
}

export async function createQuireServer(config: Config): Promise<QuireServer> {
  const dbFile = join(config.dataDir, 'quire.db');
  const store = new SqliteRevisionStore(dbFile, { beforeMigrate: beforeMigrate(config, dbFile) });
  const access = createAccess(config, store);
  access.assertConfigured();
  const hooks: QuireServer['hooks'] = { beforeWrite: new Set(), afterWrite: new Set() };
  const ops = createOps({ config, store, hooks });
  const vaultDir = join(config.dataDir, 'vault');
  const vault = new VaultMirror(vaultDir, store);
  const events = new EventHub();
  let files: Files | null = null;

  // Every commit lands on disk first, then reaches live rooms and other listeners.
  const afterCommit = (path: string, text: string | null, meta: DocMeta) => {
    if (meta.kind === 'file') files?.mirror(meta);
    else vault.write(path, text, meta.rev);
    for (const fn of hooks.afterWrite) fn(path, text, meta);
  };
  const committed = (path: string, text: string | null, meta: DocMeta) => {
    afterCommit(path, text, meta);
    events.emit({ type: 'commit', path, rev: meta.rev, hash: meta.hash, device: meta.device, deleted: meta.deleted });
  };

  const sync = new SyncServer(store, {
    beforeWrite: (path) => {
      for (const fn of hooks.beforeWrite) fn(path);
    },
    afterWrite: afterCommit,
    onEvent: (e) => events.emit(e),
  });

  files = createFiles({ config, store, sync, vaultDir, committed, emit: (e) => events.emit(e) });
  const backupDeps: BackupDeps = { config, store, sync, vaultDir, hooks, committed, log: ops.log, metrics: ops.metrics };

  const app = new Hono();
  ops.installFirst(app);
  app.onError(onError);
  access.install(app);
  app.get('/api/health', (c) => c.json({ ok: true, mode: config.mode, device: config.device, rev: store.headRev() }));
  ops.routes(app);
  vaultRoutes(app, { store, sync });
  files.routes(app);
  backupRoutes(app, backupDeps);
  syncRoutes(app, { sync });
  reviewRoutes(app, { store, sync });
  eventRoutes(app, { events, headRev: () => store.headRev() });
  app.all('/api/*', (c) => c.json({ error: 'not found' }, 404));
  serveWebClient(app, config.webDist);

  await vault.scan(sync);
  if (config.watch) vault.watch(sync);

  return {
    config,
    app,
    sync,
    store,
    vault,
    events,
    access,
    ops,
    files,
    backupDeps,
    hooks,
    committed,
    async close() {
      access.stop();
      await vault.close();
      await sync.exclusive(() => undefined);
      store.close();
    },
  };
}
