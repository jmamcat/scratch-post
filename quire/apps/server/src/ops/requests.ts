import { randomUUID } from 'node:crypto';
import type { Hono } from 'hono';
import type { Logger, Metrics } from './types.ts';

const PUSH_PATH = '/api/sync/push';

/**
 * Request id, one JSON log line per request and request metrics (R-OPS-02, R-OPS-03).
 * The route is the matched pattern, so query strings and note paths never reach the log.
 * The request id is generated here, never taken from the client.
 */
export function installRequests(app: Hono, log: Logger, metrics: Metrics): void {
  app.use('*', async (c, next) => {
    const id = randomUUID();
    const started = performance.now();
    c.header('X-Request-Id', id);
    await next();
    const ms = performance.now() - started;
    const method = c.req.method;
    const route = c.req.routePath;
    const status = c.res.status;

    metrics.inc('quire_http_requests_total', { route, status: String(status) });
    if (method === 'POST' && c.req.path === PUSH_PATH) metrics.observe('quire_push_duration_seconds', ms / 1000);

    const device = c.get('principal' as never);
    const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
    log[level]('request', {
      id,
      method,
      route,
      status,
      ms: Math.round(ms * 10) / 10,
      device: typeof device === 'string' && device ? device : '-',
    });
  });
}
