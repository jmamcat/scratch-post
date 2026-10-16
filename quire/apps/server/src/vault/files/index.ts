import { createHash, randomBytes } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { InvalidPathError, mimeOf, normalizeFilePath } from '@quire/vault';
import { DELETED_HASH, type DocMeta, type Conflict, type PushResult, type ServerEvent, SyncError, type SyncServer } from '@quire/sync';
import type { Context, Hono } from 'hono';
import type { Config } from '../../platforms/index.ts';
import { requirePath, toInt } from '../../shared/http.ts';
import type { SqliteRevisionStore } from '../store.ts';

/** Where the bytes of an attachment live: `<dataDir>/blobs/<first two hex>/<sha256>` (R-VLT-11). */
export function blobPath(dataDir: string, hash: string): string {
  return join(dataDir, 'blobs', hash.slice(0, 2), hash);
}

export interface FileDeps {
  /** Announce a server event (file conflicts). */
  emit?(e: ServerEvent): void;
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

const HASH = /^[0-9a-f]{64}$/;

const sha256Bytes = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');

/** Write a file atomically: a temp file in the same folder, then a rename. */
function writeAtomic(file: string, bytes: Uint8Array): void {
  mkdirSync(dirname(file), { recursive: true });
  const tmp = join(dirname(file), `.quire-${randomBytes(6).toString('hex')}.tmp`);
  writeFileSync(tmp, bytes);
  renameSync(tmp, file);
}

function checkFilePath(path: string): string {
  try {
    return normalizeFilePath(path);
  } catch (e) {
    if (e instanceof InvalidPathError) throw new SyncError(400, e.message);
    throw e;
  }
}

/** A device name made safe to appear inside a file name. */
const safeDevice = (device: string) => device.replace(/[^\p{L}\p{N} _.-]/gu, '_').replace(/^\.+/, '') || 'device';

/** `a/cat.png` + `b` gives `a/cat (b).png`; `n` > 1 adds a counter: `a/cat (b 2).png`. */
function copyName(path: string, device: string, n: number): string {
  const slash = path.lastIndexOf('/') + 1;
  const dot = path.lastIndexOf('.');
  const stem = path.slice(0, dot);
  const ext = path.slice(dot);
  return `${path.slice(0, slash)}${stem.slice(slash)} (${safeDevice(device)}${n > 1 ? ` ${n}` : ''})${ext}`;
}

function deviceOf(c: Context): string {
  const raw = c.req.header('x-quire-device');
  if (!raw) return 'unknown';
  try {
    return decodeURIComponent(raw) || 'unknown';
  } catch {
    return raw;
  }
}

function baseRevOf(c: Context): number | null {
  const raw = c.req.query('baseRev');
  return raw === undefined || raw === '' ? null : toInt(raw, 'baseRev');
}

export function createFiles(deps: FileDeps): Files {
  const { config, store, sync, vaultDir, committed } = deps;
  const inVault = (path: string) => {
    const file = resolve(vaultDir, path);
    if (!file.startsWith(resolve(vaultDir) + sep)) throw new SyncError(400, 'path escapes the vault');
    return file;
  };

  const mirror = (meta: DocMeta): void => {
    const file = inVault(meta.path);
    if (meta.deleted || !meta.blob) {
      rmSync(file, { force: true });
      return;
    }
    const source = blobPath(config.dataDir, meta.blob);
    if (!existsSync(source)) return;
    mkdirSync(dirname(file), { recursive: true });
    const tmp = join(dirname(file), `.quire-${randomBytes(6).toString('hex')}.tmp`);
    copyFileSync(source, tmp);
    renameSync(tmp, file);
  };

  // A file head whose copy is missing from the vault folder is restored at startup, never deleted.
  for (const head of store.heads()) {
    if (head.kind !== 'file' || head.deleted) continue;
    try {
      if (!existsSync(inVault(head.path))) mirror(head);
    } catch (e) {
      console.error(`could not restore ${head.path}`, e);
    }
  }

  /** Store the bytes once per distinct content (R-VLT-11). */
  const storeBlob = (bytes: Uint8Array, path: string): string => {
    const hash = sha256Bytes(bytes);
    const file = blobPath(config.dataDir, hash);
    if (!existsSync(file)) writeAtomic(file, bytes);
    store.db
      .prepare('INSERT OR IGNORE INTO blobs (hash, size, mime, created_at) VALUES (?, ?, ?, ?)')
      .run(hash, bytes.length, mimeOf(path), new Date().toISOString());
    return hash;
  };

  const commitFile = (path: string, device: string, blob: string | null, size: number): DocMeta => {
    const meta = store.commit(path, null, device, blob ?? DELETED_HASH, { kind: 'file', ...(blob ? { blob, size } : {}) });
    committed(path, null, meta);
    return meta;
  };

  const put = (path: string, bytes: Uint8Array, baseRev: number | null, device: string): Promise<PushResult> => {
    const hash = storeBlob(bytes, path);
    return sync.exclusive((): PushResult => {
      const head = store.head(path);
      if (head && !head.deleted && head.blob === hash) return { path, status: 'noop', meta: head, text: null };
      if (!head || head.deleted || baseRev === head.rev) {
        const meta = commitFile(path, device, hash, bytes.length);
        return { path, status: 'applied', meta, text: null };
      }

      // Changed on two devices: keep both. The later upload is saved next to the original.
      let n = 1;
      let copy = copyName(path, device, n);
      for (let other = store.head(copy); other && !other.deleted && other.blob !== hash; other = store.head(copy)) {
        n += 1;
        copy = copyName(path, device, n);
      }
      const existing = store.head(copy);
      if (existing && !existing.deleted && existing.blob === hash) return { path, status: 'noop', meta: existing, text: null };
      const meta = commitFile(copy, device, hash, bytes.length);
      const conflict: Conflict = {
        id: globalThis.crypto.randomUUID(),
        path,
        kind: 'file',
        status: 'review',
        rev: meta.rev,
        createdAt: meta.createdAt,
        current: { device: head.device, rev: head.rev, at: head.createdAt },
        incoming: { device, at: meta.createdAt, deleted: false },
        segments: [{ type: 'stable', text: `Both versions were kept:\n${path}\n${copy}\n` }],
      };
      store.saveConflict(conflict);
      deps.emit?.({ type: 'conflict', id: conflict.id, path, status: conflict.status });
      return { path, status: 'conflict', meta, text: null, conflictId: conflict.id };
    });
  };

  const del = (path: string, baseRev: number | null, device: string): Promise<PushResult> =>
    sync.exclusive((): PushResult => {
      const head = store.head(path);
      if (!head) throw new SyncError(404, `no file ${path}`);
      if (head.deleted) return { path, status: 'noop', meta: head, text: null };
      // A deletion against a file that changed since the sender's base loses: the edit wins (R-SYN-06).
      if (baseRev !== null && baseRev !== head.rev && store.revision(baseRev)?.blob !== head.blob) {
        return { path, status: 'noop', meta: head, text: null };
      }
      const meta = commitFile(path, device, null, 0);
      return { path, status: 'applied', meta, text: null };
    });

  /** Bytes with their content type. Headers are given at construction: the server's lightweight Response ignores later changes. */
  const send = (bytes: Uint8Array, mime: string, extra: Record<string, string> = {}): Response =>
    new Response(bytes, {
      headers: {
        'content-type': mime,
        'x-content-type-options': 'nosniff',
        // SVG can carry scripts: serve it as an inert image.
        ...(mime.startsWith('image/svg') ? { 'content-security-policy': "sandbox; default-src 'none'; style-src 'unsafe-inline'" } : {}),
        ...extra,
      },
    });

  return {
    mirror,
    routes(app) {
      app.put('/api/files', async (c) => {
        const path = checkFilePath(requirePath(c));
        const bytes = new Uint8Array(await c.req.arrayBuffer());
        return c.json(await put(path, bytes, baseRevOf(c), deviceOf(c)));
      });

      app.delete('/api/files', async (c) => {
        const path = checkFilePath(requirePath(c));
        return c.json(await del(path, baseRevOf(c), deviceOf(c)));
      });

      app.get('/api/files', (c) => {
        const path = checkFilePath(requirePath(c));
        const head = store.head(path);
        if (!head || head.deleted || !head.blob) throw new SyncError(404, `no file ${path}`);
        const file = blobPath(config.dataDir, head.blob);
        if (!existsSync(file)) throw new SyncError(404, `no bytes for ${path}`);
        return send(new Uint8Array(readFileSync(file)), mimeOf(path));
      });

      app.get('/api/blobs/:hash', (c) => {
        const hash = c.req.param('hash');
        const row = HASH.test(hash)
          ? (store.db.prepare('SELECT mime FROM blobs WHERE hash = ?').get(hash) as { mime: string | null } | undefined)
          : undefined;
        const file = blobPath(config.dataDir, hash);
        if (!row || !existsSync(file)) throw new SyncError(404, 'no such blob');
        return send(new Uint8Array(readFileSync(file)), row.mime ?? 'application/octet-stream', {
          'cache-control': 'private, max-age=31536000, immutable',
        });
      });
    },
  };
}
