import { type PushRequest, SyncError, type SyncServer } from '@quire/sync';
import type { Hono } from 'hono';
import { toInt } from '../shared/http.ts';

/** Push and change feed (R-SYN-02, R-SYN-03, R-SYN-08). */
export function syncRoutes(app: Hono, deps: { sync: SyncServer }): void {
  const { sync } = deps;

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
}
