import type { DocMeta } from '@quire/sync';
import type { Config } from '../platforms/index.ts';
import type { SqliteRevisionStore } from '../vault/index.ts';
import { opsRoutes } from './endpoints.ts';
import { createLogger } from './logger.ts';
import { createMetrics } from './metrics.ts';
import { installRequests } from './requests.ts';
import type { Ops } from './types.ts';

export type { LogLevel, Logger, Metrics, Ops } from './types.ts';

export interface OpsDeps {
  config: Config;
  store: SqliteRevisionStore;
  /** Commit listeners (for `quire_commits_total`). */
  hooks: { afterWrite: Set<(path: string, text: string | null, meta: DocMeta) => void> };
}

/** Logs, metrics, readiness (R-OPS-01..03). */
export function createOps(deps: OpsDeps): Ops {
  const { config, store, hooks } = deps;
  const log = createLogger(config.logLevel);
  const metrics = createMetrics();
  hooks.afterWrite.add(() => metrics.inc('quire_commits_total'));
  let live = () => ({ rooms: 0, connections: 0 });
  return {
    log,
    metrics,
    installFirst(app) {
      installRequests(app, log, metrics);
    },
    routes(app) {
      opsRoutes(app, { config, store, metrics, live: () => live() });
    },
    setLiveStats(fn) {
      live = fn;
    },
  };
}
