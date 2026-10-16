import { normalizeFilePath } from '@quire/vault';
import type { FileSink } from './client.ts';
import { HttpError, type HttpTransport } from './http.ts';
import type { DocMeta, PushResult } from './protocol.ts';

/** Latest known state of one attachment on the server (R-VLT-11). */
export interface FileHead {
  path: string;
  rev: number;
  /** SHA-256 of the bytes; null for a deletion. */
  blob: string | null;
  size: number;
  deleted: boolean;
}

/** A change made while offline that still has to reach the server. */
export interface PendingFile {
  path: string;
  op: 'put' | 'delete';
  /** Server revision the change started from; null for a file never synced. */
  baseRev: number | null;
  /** The bytes to upload; present for `put`. */
  bytes?: Uint8Array;
}

export interface FileStore {
  heads(): Promise<FileHead[]>;
  putHead(h: FileHead): Promise<void>;
  pending(): Promise<PendingFile[]>;
  putPending(p: PendingFile): Promise<void>;
  removePending(path: string): Promise<void>;
}

/** Bytes kept on the device by content hash, so a file opens offline once it has been fetched. */
export interface BlobCache {
  get(hash: string): Promise<Uint8Array | undefined>;
  put(hash: string, bytes: Uint8Array): Promise<void>;
}

/**
 * Client half of attachments (R-VLT-11): remembers file heads from pulls, fetches bytes on
 * first use and caches them, uploads new files at once or queues them while offline.
 */
export class FileSync implements FileSink {
  private readonly transport: HttpTransport;
  private readonly store: FileStore;
  private readonly cache: BlobCache;
  private readonly device: string;
  /** Uploads, deletions and flushes run one after another. */
  private chain: Promise<unknown> = Promise.resolve();

  constructor(opts: { transport: HttpTransport; store: FileStore; cache: BlobCache; device: string }) {
    this.transport = opts.transport;
    this.store = opts.store;
    this.cache = opts.cache;
    this.device = opts.device;
  }

  /** Live files sorted by path, including ones added offline and not uploaded yet. */
  async list(): Promise<FileHead[]> {
    const byPath = new Map<string, FileHead>();
    for (const h of await this.store.heads()) if (!h.deleted) byPath.set(h.path, h);
    for (const p of await this.store.pending()) {
      if (p.op === 'delete') byPath.delete(p.path);
      else byPath.set(p.path, { path: p.path, rev: p.baseRev ?? 0, blob: null, size: p.bytes?.length ?? 0, deleted: false });
    }
    return [...byPath.values()].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  }

  /** Bytes of a file: from the cache, else from the server (then cached); null when there is no such file. */
  async read(path: string): Promise<Uint8Array | null> {
    const queued = (await this.store.pending()).find((p) => p.path === path);
    if (queued) return queued.op === 'put' ? (queued.bytes ?? null) : null;
    const head = (await this.store.heads()).find((h) => h.path === path);
    if (!head || head.deleted || !head.blob) return null;
    const hit = await this.cache.get(head.blob);
    if (hit) return hit;
    const res = await this.transport.fetcher(`${this.transport.baseUrl}/api/blobs/${head.blob}`, {
      method: 'GET',
      headers: this.transport.authHeaders(),
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new HttpError(res.status, res.statusText);
    const bytes = new Uint8Array(await res.arrayBuffer());
    await this.cache.put(head.blob, bytes);
    return bytes;
  }

  /** Upload now, or queue the file while the server cannot be reached. */
  add(path: string, bytes: Uint8Array): Promise<FileHead> {
    const p = normalizeFilePath(path);
    return this.locked(async () => {
      const known = (await this.store.heads()).find((h) => h.path === p);
      const queued = (await this.store.pending()).find((q) => q.path === p);
      const baseRev = queued ? queued.baseRev : (known?.rev ?? null);
      try {
        return await this.upload({ path: p, op: 'put', baseRev, bytes });
      } catch (e) {
        if (e instanceof HttpError) throw e;
        await this.store.putPending({ path: p, op: 'put', baseRev, bytes });
        return { path: p, rev: baseRev ?? 0, blob: null, size: bytes.length, deleted: false };
      }
    });
  }

  remove(path: string): Promise<void> {
    const p = normalizeFilePath(path);
    return this.locked(async () => {
      const known = (await this.store.heads()).find((h) => h.path === p);
      const queued = (await this.store.pending()).find((q) => q.path === p);
      if (queued) await this.store.removePending(p);
      if (!known || known.deleted) return;
      try {
        await this.upload({ path: p, op: 'delete', baseRev: known.rev });
      } catch (e) {
        if (e instanceof HttpError) throw e;
        await this.store.putPending({ path: p, op: 'delete', baseRev: known.rev });
      }
    });
  }

  /** A file head arrived in a pull. Bytes are not fetched until the file is first read. */
  async onRemote(meta: DocMeta): Promise<void> {
    if (meta.kind !== 'file') return;
    const known = (await this.store.heads()).find((h) => h.path === meta.path);
    if (known && known.rev >= meta.rev) return;
    await this.store.putHead({
      path: meta.path,
      rev: meta.rev,
      blob: meta.deleted ? null : (meta.blob ?? null),
      size: meta.size ?? 0,
      deleted: meta.deleted,
    });
  }

  /**
   * Upload what was added or removed while offline. Stops quietly while the server cannot be
   * reached; a change the server refuses is dropped and the first such error is thrown.
   */
  flush(): Promise<void> {
    return this.locked(async () => {
      let refused: HttpError | null = null;
      for (const p of await this.store.pending()) {
        try {
          await this.upload(p);
        } catch (e) {
          if (!(e instanceof HttpError)) return;
          await this.store.removePending(p.path);
          refused ??= e;
        }
      }
      if (refused) throw refused;
    });
  }

  private locked<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.chain.then(fn, fn);
    this.chain = run.catch(() => undefined);
    return run;
  }

  /** Send one change. On success the pending entry is gone and the head and cache are updated. */
  private async upload(p: PendingFile): Promise<FileHead> {
    const q = new URLSearchParams({ path: p.path, ...(p.baseRev === null ? {} : { baseRev: String(p.baseRev) }) });
    const isPut = p.op === 'put';
    const res = await this.transport.fetcher(`${this.transport.baseUrl}/api/files?${q}`, {
      method: isPut ? 'PUT' : 'DELETE',
      headers: {
        ...this.transport.authHeaders(),
        'x-quire-device': encodeURIComponent(this.device),
        ...(isPut ? { 'content-type': 'application/octet-stream' } : {}),
      },
      ...(isPut ? { body: p.bytes as unknown as NonNullable<RequestInit['body']> } : {}),
    });
    if (!res.ok) {
      let message = res.statusText;
      try {
        message = ((await res.json()) as { error?: string }).error ?? message;
      } catch {
        // keep statusText
      }
      throw new HttpError(res.status, message);
    }
    const { meta } = (await res.json()) as PushResult;
    await this.store.removePending(p.path);
    const head: FileHead = {
      path: meta.path,
      rev: meta.rev,
      blob: meta.deleted ? null : (meta.blob ?? null),
      size: meta.size ?? 0,
      deleted: meta.deleted,
    };
    await this.store.putHead(head);
    if (isPut && head.blob && p.bytes) await this.cache.put(head.blob, p.bytes);
    return head;
  }
}

export class MemoryFileStore implements FileStore {
  private readonly byPath = new Map<string, FileHead>();
  private readonly queue = new Map<string, PendingFile>();

  async heads(): Promise<FileHead[]> {
    return [...this.byPath.values()].map((h) => ({ ...h }));
  }

  async putHead(h: FileHead): Promise<void> {
    this.byPath.set(h.path, { ...h });
  }

  async pending(): Promise<PendingFile[]> {
    return [...this.queue.values()].map((p) => ({ ...p }));
  }

  async putPending(p: PendingFile): Promise<void> {
    this.queue.set(p.path, { ...p });
  }

  async removePending(path: string): Promise<void> {
    this.queue.delete(path);
  }
}

export class MemoryBlobCache implements BlobCache {
  private readonly blobs = new Map<string, Uint8Array>();

  async get(hash: string): Promise<Uint8Array | undefined> {
    return this.blobs.get(hash);
  }

  async put(hash: string, bytes: Uint8Array): Promise<void> {
    this.blobs.set(hash, bytes);
  }
}
