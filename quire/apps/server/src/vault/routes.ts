import type { RevisionStore, SyncServer } from '@quire/sync';
import type { Hono } from 'hono';
import { requirePath, toInt } from '../shared/http.ts';

/** Read side of the vault: note list, one note (any revision), history (R-VLT-03, R-VLT-06). */
export function vaultRoutes(app: Hono, deps: { store: RevisionStore; sync: SyncServer }): void {
  const { store, sync } = deps;

  // Notes by default; `?kind=file` lists attachment heads instead (R-VLT-11).
  app.get('/api/docs', (c) => {
    const files = c.req.query('kind') === 'file';
    return c.json(store.heads().filter((m) => !m.deleted && (m.kind === 'file') === files));
  });

  app.get('/api/doc', (c) => {
    const rev = c.req.query('rev');
    return c.json(sync.doc(requirePath(c), rev === undefined ? undefined : toInt(rev, 'rev')));
  });

  app.get('/api/history', (c) => c.json(store.history(sync.doc(requirePath(c)).meta.path)));
}
