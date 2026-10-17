import { type DocMeta, type FileSink, HttpError, type HttpTransport, type PushResult } from '@quire/sync';
import type { Files } from '../vault/index.ts';

/** What NodeFiles reads and writes on the node: its heads and small key-value records. */
export interface FileReplicaStore {
  heads(): DocMeta[];
  head(path: string): DocMeta | null;
  getKv(key: string): string | null;
  setKv(key: string, value: string): void;
  deleteKv(key: string): void;
}

/** The upstream head a local file last agreed with, and the local revision that matched it. */
interface FileBase {
  rev: number;
  blob: string | null;
  local: number | null;
}

const FILE_PREFIX = 'upstream:file:';

/**
 * Attachments between a local node and its upstream (R-SYN-09). Unlike a browser, the node
 * keeps every file's bytes, because its own clients read them from it.
 */
export class NodeFiles implements FileSink {
  constructor(
    private readonly store: FileReplicaStore,
    private readonly files: Pick<Files, 'put' | 'remove' | 'blob'>,
    private readonly up: HttpTransport,
    private readonly device: string,
  ) {}

  private base(path: string): FileBase | null {
    const raw = this.store.getKv(FILE_PREFIX + path);
    return raw ? (JSON.parse(raw) as FileBase) : null;
  }

  private setBase(path: string, base: FileBase | null): void {
    if (base) this.store.setKv(FILE_PREFIX + path, JSON.stringify(base));
    else this.store.deleteKv(FILE_PREFIX + path);
  }

  /** A local file head that changed since it last matched upstream. */
  private isDirty(head: DocMeta, base: FileBase | null): boolean {
    return base ? base.local !== head.rev : !head.deleted;
  }

  /** Upload local changes. A refused change is not retried; the first refusal is thrown. */
  async flush(): Promise<void> {
    let refused: HttpError | null = null;
    for (const head of this.store.heads()) {
      const base = this.base(head.path);
      if (head.kind !== 'file' || !this.isDirty(head, base)) continue;
      try {
        await this.upload(head, base);
      } catch (e) {
        if (!(e instanceof HttpError)) throw e;
        if (e.status === 404) this.setBase(head.path, null);
        else if (base) this.setBase(head.path, { ...base, local: head.rev });
        else this.setBase(head.path, { rev: 0, blob: null, local: head.rev });
        if (e.status !== 404) refused ??= e;
      }
    }
    if (refused) throw refused;
  }

  private async upload(head: DocMeta, base: FileBase | null): Promise<void> {
    const sent = head.deleted ? null : (head.blob ?? null);
    const bytes = sent ? this.files.blob(sent) : null;
    if (sent && !bytes) return;
    const res = await this.send(head.path, base?.rev ?? null, bytes);
    if (res.status === 'conflict' || res.meta.path !== head.path || (res.meta.deleted ? null : (res.meta.blob ?? null)) !== sent) {
      // Upstream kept another version at this path (ours went to a copy, or an edit beat our
      // deletion): take that version; the copy arrives with the next pull.
      await this.adopt(head.path);
      return;
    }
    this.setBase(head.path, { rev: res.meta.rev, blob: sent, local: head.rev });
  }

  /** A file head from the upstream's change feed. */
  async onRemote(meta: DocMeta): Promise<void> {
    if (meta.kind !== 'file') return;
    const base = this.base(meta.path);
    if (base && base.rev >= meta.rev) return;
    const local = this.store.head(meta.path);
    // A local change not uploaded yet stays; the next flush sends it against the old base,
    // and upstream keeps both versions.
    if (local?.kind === 'file' && this.isDirty(local, base)) return;
    await this.apply(meta);
  }

  /** Make the local head match an upstream head, fetching its bytes when they are new here. */
  private async apply(meta: DocMeta): Promise<void> {
    const local = this.store.head(meta.path);
    const blob = meta.deleted ? null : (meta.blob ?? null);
    let localRev = local?.rev ?? null;
    if (!blob) {
      if (local && !local.deleted) localRev = (await this.files.remove(meta.path, local.rev, 'upstream')).meta.rev;
    } else if (!local || local.deleted || local.blob !== blob) {
      const bytes = await this.fetchBlob(blob);
      localRev = (await this.files.put(meta.path, bytes, local?.rev ?? null, 'upstream')).meta.rev;
    }
    this.setBase(meta.path, { rev: meta.rev, blob, local: localRev });
  }

  /** Take whatever upstream has at `path` now; a path upstream does not list is deleted there. */
  private async adopt(path: string): Promise<void> {
    const heads = await this.request<DocMeta[]>('/api/docs?kind=file', { method: 'GET' });
    const there = heads.find((m) => m.path === path);
    if (there) {
      await this.apply(there);
      return;
    }
    const local = this.store.head(path);
    const localRev = local && !local.deleted ? (await this.files.remove(path, local.rev, 'upstream')).meta.rev : (local?.rev ?? null);
    this.setBase(path, { rev: this.base(path)?.rev ?? 0, blob: null, local: localRev });
  }

  private async fetchBlob(hash: string): Promise<Uint8Array> {
    const res = await this.up.fetcher(`${this.up.baseUrl}/api/blobs/${hash}`, { method: 'GET', headers: this.up.authHeaders() });
    if (!res.ok) throw new HttpError(res.status, res.statusText);
    return new Uint8Array(await res.arrayBuffer());
  }

  private send(path: string, baseRev: number | null, bytes: Uint8Array | null): Promise<PushResult> {
    const q = new URLSearchParams({ path, ...(baseRev === null ? {} : { baseRev: String(baseRev) }) });
    return this.request<PushResult>(`/api/files?${q}`, {
      method: bytes ? 'PUT' : 'DELETE',
      headers: { 'x-quire-device': encodeURIComponent(this.device), ...(bytes ? { 'content-type': 'application/octet-stream' } : {}) },
      ...(bytes ? { body: bytes as unknown as NonNullable<RequestInit['body']> } : {}),
    });
  }

  private async request<T>(route: string, init: RequestInit): Promise<T> {
    const res = await this.up.fetcher(`${this.up.baseUrl}${route}`, { ...init, headers: { ...this.up.authHeaders(), ...(init.headers as Record<string, string>) } });
    if (!res.ok) {
      let message = res.statusText;
      try {
        message = ((await res.json()) as { error?: string }).error ?? message;
      } catch {
        // keep statusText
      }
      throw new HttpError(res.status, message);
    }
    return (await res.json()) as T;
  }
}
