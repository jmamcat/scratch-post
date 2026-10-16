import type { MiddlewareHandler } from 'hono';

/**
 * Stub carried over from 0002 (R-PLT-04): one optional token, as a bearer header or `?token=`.
 * Packet 0003/P01 replaces it with R-ACC-01 to R-ACC-06.
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
