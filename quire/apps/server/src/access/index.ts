import type { IncomingMessage } from 'node:http';
import type { Context, Hono, MiddlewareHandler } from 'hono';
import type { Config } from '../platforms/index.ts';
import type { SqliteRevisionStore } from '../vault/index.ts';
import { OPEN_ROUTES, Throttle, addressOf, incomingOf, originPolicy, securityHeaders, sizeLimits, throttle } from './guard.ts';
import { Tickets } from './tickets.ts';
import { TokenTable } from './tokens.ts';

export { tokensCli } from './tokens-cli.ts';

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

const ANONYMOUS = 'anonymous';
/** Revocations by the CLI (another process) are noticed within this long, well inside the 5 s of R-ACC-02. */
const POLL_MS = 1000;

export function createAccess(config: Config, store: SqliteRevisionStore): Access {
  const listeners = new Set<(name: string) => void>();
  const tickets = new Tickets(config.ticketTtlMs);
  const failures = new Throttle();
  const tokens = new TokenTable(store.db, config.token, (name) => {
    tickets.voidFor(name);
    for (const fn of listeners) fn(name);
  });
  const timer = setInterval(() => {
    try {
      tokens.refresh();
    } catch {
      // database closing during shutdown
    }
    tickets.sweep();
    failures.sweep();
  }, POLL_MS);
  timer.unref();

  const bearer = (c: Context) => {
    const h = c.req.header('authorization');
    return h && /^Bearer /i.test(h) ? h.slice(7).trim() : null;
  };

  const guard: MiddlewareHandler = async (c, next) => {
    if (OPEN_ROUTES.has(c.req.path)) return next();
    if (c.req.query('token') !== undefined) return c.json({ error: 'tokens in URLs are not accepted' }, 401);
    const supplied = bearer(c);
    const ticket = c.req.method === 'GET' && c.req.path === '/api/events' ? c.req.query('ticket') : undefined;
    const name = supplied ? tokens.verify(supplied) : ticket ? tickets.redeem(ticket) : null;
    // Development mode lets everyone in; a valid token still names the caller in the log.
    if (name || config.insecureNoAuth) {
      c.set('principal', name ?? ANONYMOUS);
      return next();
    }
    // Only a credential that fails counts as a guess; a client with none configured is not throttled.
    if (supplied || ticket) failures.fail(addressOf(incomingOf(c), config.trustProxy));
    return c.json({ error: 'unauthorized' }, 401);
  };

  return {
    assertConfigured() {
      if (config.token || tokens.any()) return;
      if (!config.insecureNoAuth) throw new Error('no access token configured');
      console.log(
        JSON.stringify({ time: new Date().toISOString(), level: 'warn', msg: 'running without access tokens (QUIRE_INSECURE_NO_AUTH=1): anyone who can reach this server can read and change the vault' }),
      );
    },

    install(app) {
      app.use('*', securityHeaders());
      app.use('*', originPolicy(config));
      app.use('*', sizeLimits(config));
      app.use('/api/*', throttle(failures, config.trustProxy));
      app.use('/api/*', guard);
      app.post('/api/tickets', (c) => c.json(tickets.issue(c.get('principal'))));
    },

    authorizeUpgrade(url, req) {
      const addr = addressOf(req, config.trustProxy);
      if (failures.blocked(addr)) return null;
      const ticket = url.searchParams.get('ticket');
      const name = ticket ? tickets.redeem(ticket) : null;
      if (name) return name;
      if (config.insecureNoAuth) return ANONYMOUS;
      if (ticket) failures.fail(addr);
      return null;
    },

    onRevoke(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },

    stop() {
      clearInterval(timer);
    },
  };
}
