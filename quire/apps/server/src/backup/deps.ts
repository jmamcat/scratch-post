import type { DocMeta, SyncServer } from '@quire/sync';
import type { Logger, Metrics } from '../ops/index.ts';
import type { Config } from '../platforms/index.ts';
import type { SqliteRevisionStore } from '../vault/index.ts';

/** What versioning and backup need from the server they run in. */
export interface BackupDeps {
  config: Config;
  store: SqliteRevisionStore;
  sync: SyncServer;
  vaultDir: string;
  hooks: {
    /** Run for a path before writing it, so live rooms commit pending text first. */
    beforeWrite: Set<(path: string) => void>;
    afterWrite: Set<(path: string, text: string | null, meta: DocMeta) => void>;
  };
  /** Record a commit made outside SyncServer: mirror it to disk and announce it. */
  committed(path: string, text: string | null, meta: DocMeta): void;
  log: Logger;
  metrics: Metrics;
}

export interface Background {
  stop(): Promise<void>;
}
