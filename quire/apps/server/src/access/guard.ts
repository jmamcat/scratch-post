import type { IncomingMessage } from 'node:http';
import type { Context, MiddlewareHandler } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { cors } from 'hono/cors';
import type { Config } from '../platforms/index.ts';

declare module 'hono' {
  interface ContextVariableMap {
    /** Name of the token that authorized the request (`anonymous` without auth); request logs read it. */
    principal: string;
  }
}

/** Routes anyone may call: load balancers and orchestrators probe them without a token. */
export const OPEN_ROUTES = new Set(['/api/health', '/api/ready']);
const JSON_OVERHEAD = 64 * 1024;
const WINDOW_MS = 60_000;
const MAX_FAILURES = 10;

// ---- security headers and origins (R-ACC-05) ----

function csp(host: string | undefined): string {
  const ws = host ? ` ws://${host} wss://${host}` : '';
  return [
    "default-src 'self'",
    "script-src 'self'",
    // Table alignment and editor decorations use style attributes.
    "style-src 'self' 'unsafe-inline'",
    // Attachments are shown from blob: URLs; notes may embed remote images, as in the baseline.
    "img-src 'self' blob: data: https:",
    "font-src 'self' data:",
    `connect-src 'self'${ws}`,
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
}

export function securityHeaders(): MiddlewareHandler {
  return async (c, next) => {
    await next();
    const h = c.res.headers;
    // Files served from the vault set their own, stricter policy (inert SVG).
    if (!h.has('content-security-policy')) h.set('content-security-policy', csp(c.req.header('host')));
    h.set('x-content-type-options', 'nosniff');
    h.set('referrer-policy', 'no-referrer');
  };
}

/** Same origin always, plus `QUIRE_ALLOWED_ORIGINS`; any other origin gets no allow header. */
export function originPolicy(config: Config): MiddlewareHandler {
  const allowed = new Set(config.allowedOrigins);
  return cors({
    origin: (origin, c) => {
      if (allowed.has(origin)) return origin;
      try {
        return new URL(origin).host === c.req.header('host') ? origin : null;
      } catch {
        return null;
      }
    },
    allowHeaders: ['authorization', 'content-type', 'x-quire-device'],
    allowMethods: ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    exposeHeaders: ['x-request-id'],
    maxAge: 600,
  });
}

// ---- size limits (R-ACC-06) ----

const tooLarge = (c: Context, what = 'request') => c.json({ error: `${what} too large` }, 413);

/** Body size caps, then the per-note cap on texts inside JSON bodies that write notes. */
export function sizeLimits(config: Config): MiddlewareHandler {
  const files = bodyLimit({ maxSize: config.maxFileBytes, onError: (c) => tooLarge(c, 'file') });
  const other = bodyLimit({ maxSize: config.maxNoteBytes + JSON_OVERHEAD, onError: (c) => tooLarge(c) });
  const over = (s: unknown) => typeof s === 'string' && Buffer.byteLength(s, 'utf8') > config.maxNoteBytes;
  const textCheck: MiddlewareHandler = async (c, next) => {
    if (c.req.method !== 'POST') return next();
    if (c.req.path === '/api/sync/push') {
      const body = await c.req.json<{ items?: { text?: unknown }[] }>();
      if (Array.isArray(body?.items) && body.items.some((it) => over(it?.text))) return tooLarge(c, 'note');
    } else if (/^\/api\/conflicts\/[^/]+\/resolve$/.test(c.req.path)) {
      const body = await c.req.json<{ text?: unknown; choices?: Record<string, unknown> }>();
      if (over(body?.text) || Object.values(body?.choices ?? {}).some(over)) return tooLarge(c, 'note');
    }
    return next();
  };
  return async (c, next) => {
    const limit = c.req.path === '/api/files' ? files : other;
    return limit(c, () => textCheck(c, next));
  };
}

// ---- throttling failed checks (R-ACC-06) ----

export function addressOf(req: IncomingMessage | undefined, trustProxy: boolean): string {
  if (trustProxy) {
    const fwd = req?.headers['x-forwarded-for'];
    const first = (Array.isArray(fwd) ? fwd[0] : fwd)?.split(',')[0]?.trim();
    if (first) return first;
  }
  return req?.socket.remoteAddress ?? 'unknown';
}

/** The Node request behind a Hono context (absent when the app is called without a server). */
export function incomingOf(c: Context): IncomingMessage | undefined {
  const env = c.env as { incoming?: IncomingMessage; server?: { incoming?: IncomingMessage } } | undefined;
  return env?.server?.incoming ?? env?.incoming;
}

/** More than 10 failed checks from one address within a minute: 429 until that minute ends. */
export class Throttle {
  private readonly windows = new Map<string, { start: number; failures: number }>();

  blocked(addr: string, now = Date.now()): boolean {
    const w = this.windows.get(addr);
    return !!w && now - w.start < WINDOW_MS && w.failures > MAX_FAILURES;
  }

  fail(addr: string, now = Date.now()): void {
    const w = this.windows.get(addr);
    if (!w || now - w.start >= WINDOW_MS) this.windows.set(addr, { start: now, failures: 1 });
    else w.failures++;
  }

  sweep(now = Date.now()): void {
    for (const [addr, w] of this.windows) if (now - w.start >= WINDOW_MS) this.windows.delete(addr);
  }
}

export function throttle(t: Throttle, trustProxy: boolean): MiddlewareHandler {
  return async (c, next) => {
    if (OPEN_ROUTES.has(c.req.path)) return next();
    if (t.blocked(addressOf(incomingOf(c), trustProxy))) return c.json({ error: 'too many failed token checks; try again in a minute' }, 429);
    return next();
  };
}
