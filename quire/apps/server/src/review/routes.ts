import { type ConflictStatus, type Resolution, type RevisionStore, SyncError, type SyncServer } from '@quire/sync';
import type { Hono } from 'hono';

const STATUSES = new Set<ConflictStatus>(['open', 'review', 'resolved', 'dismissed']);

/** Conflict records and their resolution (R-RVW-01, R-RVW-04, R-RVW-06, R-RVW-07). */
export function reviewRoutes(app: Hono, deps: { store: RevisionStore; sync: SyncServer }): void {
  const { store, sync } = deps;

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
}
