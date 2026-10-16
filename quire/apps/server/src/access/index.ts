import type { IncomingMessage } from 'node:http';
import type { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Config } from '../platforms/index.ts';
import type { SqliteRevisionStore } from '../vault/index.ts';
import { tokenGuard } from './guard.ts';

/** Access control for one server (R-ACC-01..06). Contract fixed by 0003/P00; P01 implements it. */
export interface Access {
  /** Throws `Error('no access token configured')` unless a token exists or the insecure flag is set. */
  assertConfigured(): void;
  /** Security headers, CORS, size limits, throttling and the token guard, in that order. */
  install(app: Hono): void;
  /** Live connection check: the name of the token (or ticket) that opened it, or null to refuse. */
  authorizeUpgrade(url: URL, req: IncomingMessage): string | null;
  /** Called with a token's name when it is revoked, so open connections can close (R-ACC-02). */
  onRevoke(fn: (name: string) => void): () => void;
  stop(): void;
}

export function createAccess(config: Config, _store: SqliteRevisionStore): Access {
  return {
    assertConfigured() {},
    install(app) {
      app.use('*', cors());
      app.use('/api/*', async (c, next) => (c.req.path === '/api/health' ? next() : tokenGuard(config.token)(c, next)));
    },
    authorizeUpgrade(url) {
      if (!config.token) return 'anonymous';
      return url.searchParams.get('token') === config.token ? 'admin' : null;
    },
    onRevoke: () => () => undefined,
    stop() {},
  };
}

/** `quire tokens add <name> [--token T] | list | revoke <name>`; returns the exit code. */
export async function tokensCli(_args: string[], _config: Config): Promise<number> {
  console.error('quire tokens: not implemented yet (0003/P01)');
  return 2;
}
