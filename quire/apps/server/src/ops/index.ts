import type { DocMeta } from '@quire/sync';
import type { Hono } from 'hono';
import type { Config } from '../platforms/index.ts';
import type { SqliteRevisionStore } from '../vault/index.ts';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type Logger = Record<LogLevel, (msg: string, fields?: Record<string, unknown>) => void>;

export interface Metrics {
  inc(name: string, labels?: Record<string, string>, by?: number): void;
  observe(name: string, seconds: number, labels?: Record<string, string>): void;
  set(name: string, value: number, labels?: Record<string, string>): void;
}

/** Logs, metrics, readiness (R-OPS-01..03). Contract fixed by 0003/P00; P10 implements it. */
export interface Ops {
  log: Logger;
  metrics: Metrics;
  /** Request id, JSON request log and request metrics: install before every other middleware. */
  installFirst(app: Hono): void;
  /** `/api/ready` and `/api/metrics`, installed after the token guard. */
  routes(app: Hono): void;
  /** Live rooms report here once they exist (they are created after the HTTP app). */
  setLiveStats(fn: () => { rooms: number; connections: number }): void;
}

export interface OpsDeps {
  config: Config;
  store: SqliteRevisionStore;
  /** Commit listeners (for `quire_commits_total`). */
  hooks: { afterWrite: Set<(path: string, text: string | null, meta: DocMeta) => void> };
}

export function createOps(_deps: OpsDeps): Ops {
  const write = (level: LogLevel) => (msg: string, fields?: Record<string, unknown>) =>
    (level === 'error' || level === 'warn' ? console.error : console.log)(fields ? `${msg} ${JSON.stringify(fields)}` : msg);
  const noop = () => undefined;
  return {
    log: { debug: noop, info: write('info'), warn: write('warn'), error: write('error') },
    metrics: { inc: noop, observe: noop, set: noop },
    installFirst() {},
    routes() {},
    setLiveStats() {},
  };
}
