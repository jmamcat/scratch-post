import { InvalidPathError } from '@quire/core';
import { SyncError } from '@quire/sync';
import type { Context, ErrorHandler } from 'hono';

/** Maps domain errors to HTTP status codes; everything unknown is a 500. */
export const onError: ErrorHandler = (err, c) => {
  if (err instanceof SyncError) return c.json({ error: err.message }, err.status);
  if (err instanceof InvalidPathError) return c.json({ error: err.message }, 400);
  if (err instanceof SyntaxError) return c.json({ error: 'invalid JSON body' }, 400);
  console.error(err);
  return c.json({ error: 'internal error' }, 500);
};

export function requirePath(c: Context): string {
  const path = c.req.query('path');
  if (!path) throw new SyncError(400, 'missing ?path=');
  return path;
}

export function toInt(v: string, name: string): number {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 0) throw new SyncError(400, `${name} must be a non-negative integer`);
  return n;
}
