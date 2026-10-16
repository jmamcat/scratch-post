import type { MiddlewareHandler } from 'hono';

/**
 * R-PLT-04: when a token is configured, every /api route except health needs it, as a bearer
 * header or, for EventSource and WebSocket which cannot set headers, as ?token=.
 */
export function tokenGuard(token: string | undefined): MiddlewareHandler {
  return async (c, next) => {
    if (!token) return next();
    const header = c.req.header('authorization');
    const supplied = header?.startsWith('Bearer ') ? header.slice(7) : c.req.query('token');
    if (supplied !== token) return c.json({ error: 'unauthorized' }, 401);
    return next();
  };
}
