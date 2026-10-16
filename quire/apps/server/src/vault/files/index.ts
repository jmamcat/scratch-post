import { join } from 'node:path';
import type { DocMeta, SyncServer } from '@quire/sync';
import type { Hono } from 'hono';
import type { Config } from '../../platforms/index.ts';
import type { SqliteRevisionStore } from '../store.ts';

/** Where the bytes of an attachment live: `<dataDir>/blobs/<first two hex>/<sha256>` (R-VLT-11). */
export function blobPath(dataDir: string, hash: string): string {
  return join(dataDir, 'blobs', hash.slice(0, 2), hash);
}

export interface FileDeps {
  config: Config;
  store: SqliteRevisionStore;
  sync: SyncServer;
  vaultDir: string;
  /** Record a commit made outside SyncServer: mirror it and announce it. */
  committed(path: string, text: string | null, meta: DocMeta): void;
}

/** Attachment storage and routes. Contract fixed by 0003/P00; P06 implements it. */
export interface Files {
  /** `PUT /api/files?path=&baseRev=` (bytes), `GET /api/files?path=` and `GET /api/blobs/<hash>`. */
  routes(app: Hono): void;
  /** Write (or remove) a file revision's bytes in the vault folder; called for every file commit. */
  mirror(meta: DocMeta): void;
}

export function createFiles(_deps: FileDeps): Files {
  return { routes() {}, mirror() {} };
}
