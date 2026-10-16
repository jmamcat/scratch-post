import { existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { serveStatic } from '@hono/node-server/serve-static';
import type { Hono } from 'hono';

/** R-PLT-01: serve the built web client from the same port, when it exists. */
export function serveWebClient(app: Hono, dist: string): void {
  if (!existsSync(join(dist, 'index.html'))) return;
  const root = relative(process.cwd(), dist) || '.';
  app.use('/*', serveStatic({ root }));
  app.get('/*', serveStatic({ root, path: 'index.html' }));
}
