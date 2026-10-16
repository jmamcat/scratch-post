import { InvalidPathError, applyChoices, merge3, normalizePath } from '@quire/core';
import {
  DELETED_HASH,
  SyncError,
  hashText,
  type ChangeFeed,
  type Conflict,
  type ConflictStatus,
  type DocMeta,
  type PushItem,
  type PushRequest,
  type PushResult,
  type Resolution,
  type ServerEvent,
} from './protocol.ts';

export interface RevisionStore {
  head(path: string): DocMeta | null;
  text(rev: number): string | null;
  /** Metadata of any revision, or null. */
  revision(rev: number): DocMeta | null;
  commit(path: string, text: string | null, device: string, hash: string): DocMeta;
  changesSince(rev: number): DocMeta[];
  headRev(): number;
  history(path: string): DocMeta[];
  heads(): DocMeta[];
  saveConflict(c: Conflict): void;
  getConflict(id: string): Conflict | null;
  listConflicts(status?: ConflictStatus): Conflict[];
}

export interface SyncServerHooks {
  /** Called before a path is read for a write, so live rooms can commit pending text. */
  beforeWrite?(path: string): void;
  /** Called after a commit changed a path's head. */
  afterWrite?(path: string, text: string | null, meta: DocMeta): void;
  onEvent?(e: ServerEvent): void;
  now?(): Date;
  newId?(): string;
}

/** Storage-agnostic server half of the sync protocol (R-SYN-02..08, R-RVW-01/04/06/07). */
export class SyncServer {
  private queue: Promise<unknown> = Promise.resolve();

  constructor(
    readonly store: RevisionStore,
    private readonly hooks: SyncServerHooks = {},
  ) {}

  /** Pushes are serialised so every merge sees a stable head. */
  push(req: PushRequest): Promise<PushResult[]> {
    return this.serial(async () => {
      const out: PushResult[] = [];
      for (const item of req.items) out.push(await this.pushOne(req.device, item));
      return out;
    });
  }

  resolve(id: string, r: Resolution): Promise<PushResult> {
    return this.serial(async () => {
      const c = this.store.getConflict(id);
      if (!c) throw new SyncError(404, `no conflict ${id}`);
      if (c.status === 'resolved' || c.status === 'dismissed') throw new SyncError(409, `conflict ${id} is ${c.status}`);

      let result: PushResult;
      if (c.kind === 'delete-edit') {
        if (r.keep === 'delete') {
          result = await this.pushOne(r.device, { path: c.path, baseRev: c.rev, text: null });
        } else {
          result = this.current(c.path);
        }
      } else {
        const text = r.text ?? applyChoices(c.segments, r.choices ?? {});
        result = await this.pushOne(r.device, { path: c.path, baseRev: c.rev, text });
      }
      this.setStatus(c, 'resolved', result.meta.rev);
      return result;
    });
  }

  dismiss(id: string): Conflict {
    const c = this.store.getConflict(id);
    if (!c) throw new SyncError(404, `no conflict ${id}`);
    if (c.status !== 'review') throw new SyncError(409, `only items under review can be dismissed, ${id} is ${c.status}`);
    return this.setStatus(c, 'dismissed');
  }

  changes(since: number): ChangeFeed {
    return { cursor: this.store.headRev(), changes: this.store.changesSince(since) };
  }

  doc(path: string, rev?: number): { meta: DocMeta; text: string | null } {
    const p = checkPath(path);
    if (rev === undefined) {
      const head = this.store.head(p);
      if (!head) throw new SyncError(404, `no document ${p}`);
      return { meta: head, text: head.deleted ? null : this.store.text(head.rev) };
    }
    const meta = this.store.history(p).find((m) => m.rev === rev);
    if (!meta) throw new SyncError(404, `no revision ${rev} of ${p}`);
    return { meta, text: meta.deleted ? null : this.store.text(rev) };
  }

  /**
   * Run `fn` while no push or resolution is in progress. Live rooms use it to commit, so a
   * push never interleaves with another write to the same head.
   */
  exclusive<T>(fn: () => Promise<T> | T): Promise<T> {
    return this.serial(async () => fn());
  }

  private serial<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.queue.then(fn, fn);
    this.queue = run.catch(() => undefined);
    return run;
  }

  private now(): string {
    return (this.hooks.now?.() ?? new Date()).toISOString();
  }

  private current(path: string): PushResult {
    const head = this.store.head(path);
    if (!head) throw new SyncError(404, `no document ${path}`);
    return { path, status: 'noop', meta: head, text: head.deleted ? null : this.store.text(head.rev) };
  }

  private async commit(path: string, text: string | null, device: string): Promise<DocMeta> {
    const hash = text === null ? DELETED_HASH : await hashText(text);
    const meta = this.store.commit(path, text, device, hash);
    this.hooks.afterWrite?.(path, text, meta);
    this.hooks.onEvent?.({ type: 'commit', path, rev: meta.rev, hash, device, deleted: meta.deleted });
    return meta;
  }

  private async pushOne(device: string, item: PushItem): Promise<PushResult> {
    const path = checkPath(item.path);
    this.hooks.beforeWrite?.(path);
    const head = this.store.head(path);

    if (!head) {
      if (item.text === null) {
        const meta: DocMeta = { path, rev: 0, hash: DELETED_HASH, deleted: true, device, createdAt: this.now() };
        return { path, status: 'noop', meta, text: null };
      }
      const meta = await this.commit(path, item.text, device);
      return { path, status: 'applied', meta, text: item.text };
    }

    const headText = head.deleted ? null : this.store.text(head.rev);
    if (item.text === headText) return { path, status: 'noop', meta: head, text: headText };

    if (item.baseRev === head.rev) {
      const meta = await this.commit(path, item.text, device);
      return { path, status: 'applied', meta, text: item.text };
    }

    // A base from another path (or a made-up rev) is treated as "no common base".
    const baseMeta = item.baseRev === null ? null : this.store.revision(item.baseRev);
    const baseText = baseMeta && baseMeta.path === path ? (this.store.text(baseMeta.rev) ?? '') : '';

    // Incoming delete against a head that changed since the client's base.
    if (item.text === null) {
      if (headText === baseText) {
        const meta = await this.commit(path, null, device);
        return { path, status: 'applied', meta, text: null };
      }
      const conflict = this.openDeleteEdit(path, head, head.rev, headText ?? '', device, true);
      return { path, status: 'conflict', meta: head, text: headText, conflictId: conflict.id };
    }

    // Incoming edit against a deleted head.
    if (headText === null) {
      if (item.text === baseText) return { path, status: 'noop', meta: head, text: null };
      const meta = await this.commit(path, item.text, device);
      const conflict = this.openDeleteEdit(path, head, meta.rev, item.text, device, false);
      return { path, status: 'conflict', meta, text: item.text, conflictId: conflict.id };
    }

    const m = merge3(baseText, headText, item.text);
    const meta = m.text === headText ? head : await this.commit(path, m.text, device);
    if (m.clean && m.review.length === 0) return { path, status: 'merged', meta, text: m.text };

    const conflict: Conflict = {
      id: this.newId(),
      path,
      kind: 'content',
      status: m.clean ? 'review' : 'open',
      rev: meta.rev,
      createdAt: this.now(),
      current: { device: head.device, rev: head.rev, at: head.createdAt },
      incoming: { device, at: this.now(), deleted: false },
      segments: m.segments,
    };
    this.store.saveConflict(conflict);
    this.hooks.onEvent?.({ type: 'conflict', id: conflict.id, path, status: conflict.status });
    return { path, status: m.clean ? 'merged' : 'conflict', meta, text: m.text, conflictId: conflict.id };
  }

  /**
   * The edit always wins (R-SYN-06). `incomingDeleted` says which side deleted:
   * true when the pushing device deleted, false when the head was the deletion.
   */
  private openDeleteEdit(
    path: string,
    head: DocMeta,
    rev: number,
    keptText: string,
    device: string,
    incomingDeleted: boolean,
  ): Conflict {
    const conflict: Conflict = {
      id: this.newId(),
      path,
      kind: 'delete-edit',
      status: 'open',
      rev,
      createdAt: this.now(),
      current: { device: head.device, rev: head.rev, at: head.createdAt },
      incoming: { device, at: this.now(), deleted: incomingDeleted },
      segments: keptText ? [{ type: 'stable', text: keptText }] : [],
    };
    this.store.saveConflict(conflict);
    this.hooks.onEvent?.({ type: 'conflict', id: conflict.id, path, status: 'open' });
    return conflict;
  }

  private setStatus(c: Conflict, status: ConflictStatus, resolvedRev?: number): Conflict {
    const next: Conflict = { ...c, status, ...(resolvedRev === undefined ? {} : { resolvedRev }) };
    this.store.saveConflict(next);
    this.hooks.onEvent?.({ type: 'conflict', id: c.id, path: c.path, status });
    return next;
  }

  private newId(): string {
    return this.hooks.newId?.() ?? globalThis.crypto.randomUUID();
  }
}

function checkPath(path: string): string {
  try {
    return normalizePath(path);
  } catch (e) {
    if (e instanceof InvalidPathError) throw new SyncError(400, e.message);
    throw e;
  }
}

/** In-memory RevisionStore for tests and ephemeral servers. */
export class MemoryRevisionStore implements RevisionStore {
  private revs: { meta: DocMeta; text: string | null }[] = [];
  private headIdx = new Map<string, number>();
  private conflicts = new Map<string, Conflict>();

  head(path: string): DocMeta | null {
    const i = this.headIdx.get(path);
    return i === undefined ? null : { ...this.revs[i]!.meta };
  }

  text(rev: number): string | null {
    return this.revs[rev - 1]?.text ?? null;
  }

  revision(rev: number): DocMeta | null {
    const r = this.revs[rev - 1];
    return r ? { ...r.meta } : null;
  }

  commit(path: string, text: string | null, device: string, hash: string): DocMeta {
    const meta: DocMeta = { path, rev: this.revs.length + 1, hash, deleted: text === null, device, createdAt: new Date().toISOString() };
    this.revs.push({ meta, text });
    this.headIdx.set(path, this.revs.length - 1);
    return { ...meta };
  }

  changesSince(rev: number): DocMeta[] {
    return [...this.headIdx.values()]
      .map((i) => this.revs[i]!.meta)
      .filter((m) => m.rev > rev)
      .sort((a, b) => a.rev - b.rev)
      .map((m) => ({ ...m }));
  }

  headRev(): number {
    return this.revs.length;
  }

  history(path: string): DocMeta[] {
    return this.revs
      .filter((r) => r.meta.path === path)
      .map((r) => ({ ...r.meta }))
      .reverse();
  }

  heads(): DocMeta[] {
    return this.changesSince(0);
  }

  saveConflict(c: Conflict): void {
    this.conflicts.set(c.id, structuredClone(c));
  }

  getConflict(id: string): Conflict | null {
    const c = this.conflicts.get(id);
    return c ? structuredClone(c) : null;
  }

  listConflicts(status?: ConflictStatus): Conflict[] {
    return [...this.conflicts.values()].filter((c) => !status || c.status === status).map((c) => structuredClone(c));
  }
}
