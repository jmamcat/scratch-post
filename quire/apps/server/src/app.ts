import { existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { serveStatic } from '@hono/node-server/serve-static';
import { InvalidPathError } from '@quire/core';
import { type ConflictStatus, type DocMeta, type PushRequest, type Resolution, SyncError, SyncServer } from '@quire/sync';
import { Hono, type Context } from 'hono';
import { cors } from 'hono/cors';
import { streamSSE } from 'hono/streaming';
import type { Config } from './config.ts';
import { EventHub } from './events.ts';
import { SqliteRevisionStore } from './store.ts';
import { VaultMirror } from './vault.ts';

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

const STATUSES = new Set<ConflictStatus>(['open', 'review', 'resolved', 'dismissed']);

export async function createQuireServer(config: Config): Promise<QuireServer> {
  const store = new SqliteRevisionStore(join(config.dataDir, 'quire.db'));
  const vault = new VaultMirror(join(config.dataDir, 'vault'), store);
  const events = new EventHub();
  const hooks: QuireServer['hooks'] = { beforeWrite: new Set(), afterWrite: new Set() };

  const committed = (path: string, text: string | null, meta: DocMeta) => {
    vault.write(path, text, meta.rev);
    for (const fn of hooks.afterWrite) fn(path, text, meta);
  };

  const sync = new SyncServer(store, {
    beforeWrite: (path) => {
      for (const fn of hooks.beforeWrite) fn(path);
    },
    afterWrite: committed,
    onEvent: (e) => events.emit(e),
  });

  const app = new Hono();
  app.use('*', cors());

  app.onError((err, c) => {
    if (err instanceof SyncError) return c.json({ error: err.message }, err.status);
    if (err instanceof InvalidPathError) return c.json({ error: err.message }, 400);
    if (err instanceof SyntaxError) return c.json({ error: 'invalid JSON body' }, 400);
    console.error(err);
    return c.json({ error: 'internal error' }, 500);
  });

  app.get('/api/health', (c) => c.json({ ok: true, mode: config.mode, device: config.device, rev: store.headRev() }));

  // R-PLT-04: optional bearer token on everything else.
  app.use('/api/*', async (c, next) => {
    if (!config.token) return next();
    const header = c.req.header('authorization');
    const supplied = header?.startsWith('Bearer ') ? header.slice(7) : c.req.query('token');
    if (supplied !== config.token) return c.json({ error: 'unauthorized' }, 401);
    return next();
  });

  app.get('/api/docs', (c) => c.json(store.heads().filter((m) => !m.deleted)));

  app.get('/api/doc', (c) => {
    const rev = c.req.query('rev');
    return c.json(sync.doc(requirePath(c), rev === undefined ? undefined : toInt(rev, 'rev')));
  });

  app.get('/api/history', (c) => c.json(store.history(sync.doc(requirePath(c)).meta.path)));

  app.post('/api/sync/push', async (c) => {
    const body = await c.req.json<PushRequest>();
    if (typeof body?.device !== 'string' || !Array.isArray(body.items)) throw new SyncError(400, 'expected { device, items[] }');
    for (const it of body.items) {
      const okBase = it.baseRev === null || Number.isInteger(it.baseRev);
      const okText = it.text === null || typeof it.text === 'string';
      if (typeof it.path !== 'string' || !okBase || !okText) throw new SyncError(400, 'invalid push item');
    }
    return c.json(await sync.push(body));
  });

  app.get('/api/sync/changes', (c) => c.json(sync.changes(toInt(c.req.query('since') ?? '0', 'since'))));

  app.get('/api/conflicts', (c) => {
    const status = c.req.query('status') as ConflictStatus | undefined;
    if (status && !STATUSES.has(status)) throw new SyncError(400, `unknown status ${status}`);
    return c.json(store.listConflicts(status));
  });

  app.get('/api/conflicts/:id', (c) => {
    const conflict = store.getConflict(c.req.param('id'));
    if (!conflict) throw new SyncError(404, 'no such conflict');
    return c.json(conflict);
  });

  app.post('/api/conflicts/:id/resolve', async (c) => {
    const body = await c.req.json<Resolution>();
    if (typeof body?.device !== 'string') throw new SyncError(400, 'expected { device, ... }');
    return c.json(await sync.resolve(c.req.param('id'), body));
  });

  app.post('/api/conflicts/:id/dismiss', (c) => c.json(sync.dismiss(c.req.param('id'))));

  // R-LIV-04: commits and conflict changes as Server-Sent Events.
  app.get('/api/events', (c) =>
    streamSSE(c, async (stream) => {
      const queue: string[] = [];
      let wake: (() => void) | null = null;
      const off = events.subscribe((e) => {
        queue.push(JSON.stringify(e));
        wake?.();
      });
      stream.onAbort(() => {
        off();
        wake?.();
      });
      await stream.writeSSE({ event: 'hello', data: JSON.stringify({ rev: store.headRev() }) });
      while (!stream.aborted) {
        if (queue.length === 0) {
          await new Promise<void>((r) => {
            wake = r;
            setTimeout(r, 25_000);
          });
          wake = null;
          if (queue.length === 0 && !stream.aborted) await stream.writeSSE({ event: 'ping', data: '{}' });
          continue;
        }
        await stream.writeSSE({ event: 'message', data: queue.shift()! });
      }
      off();
    }),
  );

  app.all('/api/*', (c) => c.json({ error: 'not found' }, 404));

  // R-PLT-01: serve the web client from the same port when it has been built.
  if (existsSync(join(config.webDist, 'index.html'))) {
    const root = relative(process.cwd(), config.webDist) || '.';
    app.use('/*', serveStatic({ root }));
    app.get('/*', serveStatic({ root, path: 'index.html' }));
  }

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
      committed(path, text, meta);
      events.emit({ type: 'commit', path, rev: meta.rev, hash: meta.hash, device: meta.device, deleted: meta.deleted });
    },
    async close() {
      await vault.close();
      await sync.exclusive(() => undefined);
      store.close();
    },
  };
}

function requirePath(c: Context): string {
  const path = c.req.query('path');
  if (!path) throw new SyncError(400, 'missing ?path=');
  return path;
}

function toInt(v: string, name: string): number {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 0) throw new SyncError(400, `${name} must be a non-negative integer`);
  return n;
}
