import { join } from 'node:path';
import { type DocMeta, SyncServer } from '@quire/sync';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { eventRoutes } from './live/index.ts';
import { type Config, serveWebClient, tokenGuard } from './platforms/index.ts';
import { reviewRoutes } from './review/index.ts';
import { EventHub } from './shared/events.ts';
import { onError } from './shared/http.ts';
import { syncRoutes } from './sync/index.ts';
import { SqliteRevisionStore, VaultMirror, vaultRoutes } from './vault/index.ts';

/** Everything one server process holds. Built here, the composition root for HTTP. */
export interface QuireServer {
  config: Config;
  app: Hono;
  sync: SyncServer;
  store: SqliteRevisionStore;
  vault: VaultMirror;
  events: EventHub;
  hooks: {
    beforeWrite: Set<(path: string) => void>;
    afterWrite: Set<(path: string, text: string | null, meta: DocMeta) => void>;
  };
  /** Record a commit made outside SyncServer (live rooms): mirror it to disk and announce it. */
  committed(path: string, text: string | null, meta: DocMeta): void;
  close(): Promise<void>;
}

export async function createQuireServer(config: Config): Promise<QuireServer> {
  const store = new SqliteRevisionStore(join(config.dataDir, 'quire.db'));
  const vault = new VaultMirror(join(config.dataDir, 'vault'), store);
  const events = new EventHub();
  const hooks: QuireServer['hooks'] = { beforeWrite: new Set(), afterWrite: new Set() };

  // Every commit lands on disk first, then reaches live rooms and other listeners.
  const afterCommit = (path: string, text: string | null, meta: DocMeta) => {
    vault.write(path, text, meta.rev);
    for (const fn of hooks.afterWrite) fn(path, text, meta);
  };

  const sync = new SyncServer(store, {
    beforeWrite: (path) => {
      for (const fn of hooks.beforeWrite) fn(path);
    },
    afterWrite: afterCommit,
    onEvent: (e) => events.emit(e),
  });

  const app = new Hono();
  app.use('*', cors());
  app.onError(onError);
  app.get('/api/health', (c) => c.json({ ok: true, mode: config.mode, device: config.device, rev: store.headRev() }));
  app.use('/api/*', tokenGuard(config.token));
  vaultRoutes(app, { store, sync });
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
    hooks,
    committed: (path, text, meta) => {
      afterCommit(path, text, meta);
      events.emit({ type: 'commit', path, rev: meta.rev, hash: meta.hash, device: meta.device, deleted: meta.deleted });
    },
    async close() {
      await vault.close();
      await sync.exclusive(() => undefined);
      store.close();
    },
  };
}
