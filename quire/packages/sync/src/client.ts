import { merge3 } from '@quire/merge';
import type { ChangeFeed, DocMeta, PushItem, PushRequest, PushResult } from './protocol.ts';
import type { SyncServer } from './server.ts';

export interface LocalDoc {
  path: string;
  text: string;
  /** Server revision this copy is based on; null for a document never synced. */
  baseRev: number | null;
  /** Text of baseRev; null when never synced or when the base is a deletion. */
  baseText: string | null;
  /** True when the user deleted the document and the deletion is not synced yet. */
  deleted: boolean;
  /** Set until the push succeeds when this copy was created by renaming that path (R-VLT-09). */
  renamedFrom?: string;
}

export interface LocalStore {
  get(path: string): Promise<LocalDoc | undefined>;
  put(doc: LocalDoc): Promise<void>;
  remove(path: string): Promise<void>;
  all(): Promise<LocalDoc[]>;
  getCursor(): Promise<number>;
  setCursor(n: number): Promise<void>;
}

export interface Transport {
  push(req: PushRequest): Promise<PushResult[]>;
  changes(since: number): Promise<ChangeFeed>;
  doc(path: string, rev?: number): Promise<{ meta: DocMeta; text: string | null }>;
}

export function isDirty(d: LocalDoc): boolean {
  if (d.deleted) return d.baseRev !== null;
  return d.baseText === null || d.text !== d.baseText;
}

/** Receives attachment heads from pulls (R-VLT-11); files never enter the note store. */
export interface FileSink {
  onRemote(meta: DocMeta): Promise<void>;
  /** Upload files added or removed while offline; called at the start of every sync cycle. */
  flush?(): Promise<void>;
}

export interface SyncReport {
  pushed: number;
  pulled: number;
  /** Conflict ids created or touched by this cycle. */
  conflicts: string[];
  error?: string;
}

/** Client half of the sync protocol (R-SYN-01, R-SYN-07, R-SYN-08). */
export class SyncClient {
  readonly store: LocalStore;
  readonly device: string;
  private readonly transport: Transport;
  private readonly live = new Set<string>();
  private readonly listeners = new Set<(paths: string[]) => void>();
  private running: Promise<SyncReport> | null = null;
  private again = false;
  /** Attachment handler; file heads are skipped when none is set. */
  files: FileSink | null = null;

  constructor(opts: { store: LocalStore; transport: Transport; device: string }) {
    this.store = opts.store;
    this.transport = opts.transport;
    this.device = opts.device;
  }

  async write(path: string, text: string): Promise<void> {
    const doc = (await this.store.get(path)) ?? { path, text: '', baseRev: null, baseText: null, deleted: false };
    if (doc.text === text && !doc.deleted) return;
    await this.store.put({ ...doc, text, deleted: false });
    this.emit([path]);
  }

  async remove(path: string): Promise<void> {
    const doc = await this.store.get(path);
    if (!doc) return;
    if (doc.baseRev === null) await this.store.remove(path);
    else await this.store.put({ ...doc, deleted: true });
    this.emit([path]);
  }

  /**
   * Moves a note locally (R-VLT-09). The next push sends `{ path: to, renamedFrom: from }`
   * and the deletion of `from`, so the server keeps one history across both names.
   */
  async rename(from: string, to: string): Promise<void> {
    if (from === to) return;
    const doc = await this.store.get(from);
    if (!doc || doc.deleted) throw new Error(`no note ${from} to rename`);
    const target = await this.store.get(to);
    if (target && !target.deleted) throw new Error(`${to} already exists`);
    // A path that never reached the server passes on where it came from, if anywhere.
    const origin = doc.renamedFrom ?? (doc.baseRev === null ? undefined : from);
    const moved: LocalDoc = target
      ? // Back onto a path whose deletion is still pending: that is an edit of it.
        { ...withoutRename(target), text: doc.text, deleted: false }
      : { path: to, text: doc.text, baseRev: null, baseText: null, deleted: false };
    if (!target && origin !== undefined && origin !== to) moved.renamedFrom = origin;
    await this.store.put(moved);
    if (doc.baseRev === null) await this.store.remove(from);
    else await this.store.put({ ...withoutRename(doc), deleted: true });
    this.emit([from, to]);
  }

  /** Live documents are owned by their room while connected: not pushed, and pulls only move their base. */
  setLive(path: string, live: boolean): void {
    if (live) this.live.add(path);
    else this.live.delete(path);
  }

  isLive(path: string): boolean {
    return this.live.has(path);
  }

  onChange(fn: (paths: string[]) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** One push-then-pull cycle. Concurrent calls share a run; a call during a run schedules one more. */
  sync(): Promise<SyncReport> {
    if (this.running) {
      this.again = true;
      return this.running;
    }
    this.running = (async () => {
      let report: SyncReport;
      do {
        this.again = false;
        report = await this.cycle();
      } while (this.again && !report.error);
      return report;
    })().finally(() => {
      this.running = null;
    });
    return this.running;
  }

  private emit(paths: string[]): void {
    if (paths.length === 0) return;
    for (const fn of this.listeners) fn(paths);
  }

  private async cycle(): Promise<SyncReport> {
    const report: SyncReport = { pushed: 0, pulled: 0, conflicts: [] };
    const changed: string[] = [];
    try {
      await this.files?.flush?.();
      await this.pushDirty(report, changed);
      await this.pull(report, changed);
    } catch (e) {
      report.error = e instanceof Error ? e.message : String(e);
    }
    this.emit(changed);
    return report;
  }

  private async pushDirty(report: SyncReport, changed: string[]): Promise<void> {
    const dirty = (await this.store.all()).filter((d) => isDirty(d) && !this.live.has(d.path));
    if (dirty.length === 0) return;
    // Renamed copies go first, so the server sees the rename before the old path's deletion.
    dirty.sort((a, b) => Number(!a.renamedFrom) - Number(!b.renamedFrom));
    // Batches keep each request under the server's body limit (R-ACC-06).
    for (const batch of pushBatches(dirty)) {
      const items: PushItem[] = batch.map((d) => ({
        path: d.path,
        baseRev: d.baseRev,
        text: d.deleted ? null : d.text,
        ...(d.renamedFrom && !d.deleted ? { renamedFrom: d.renamedFrom } : {}),
      }));
      let results: PushResult[];
      try {
        results = await this.transport.push({ device: this.device, items });
      } catch (e) {
        // One note over the limit must not hold back every other edit.
        if (batch.length === 1 && (e as { status?: number }).status === 413) {
          report.error = `${batch[0]!.path} is larger than the server accepts`;
          continue;
        }
        throw e;
      }
      report.pushed += results.length;

      for (const [n, res] of results.entries()) {
        const sent = batch[n]!;
        if (res.conflictId) report.conflicts.push(res.conflictId);
        const stored = await this.store.get(sent.path);
        const cur = stored && withoutRename(stored);
        const untouched = !!cur && cur.text === sent.text && cur.deleted === sent.deleted;

        if (res.movedTo && res.movedTo !== sent.path) {
          await this.moved(sent, cur, untouched, res);
          changed.push(sent.path, res.movedTo);
          continue;
        }
        if (res.text === null) {
          if (!cur || untouched) await this.store.remove(sent.path);
          else await this.store.put({ ...cur, baseRev: res.meta.rev, baseText: null, deleted: false });
        } else if (!cur) {
          // Deleted locally while the push was in flight: keep the deletion pending.
          await this.store.put({ path: sent.path, text: res.text, baseRev: res.meta.rev, baseText: res.text, deleted: true });
        } else if (untouched) {
          await this.store.put({ path: sent.path, text: res.text, baseRev: res.meta.rev, baseText: res.text, deleted: false });
        } else {
          // R-SYN-07: typed during the round trip. Local typing wins overlapping hunks; the
          // server's version stays in its history.
          const text = cur.deleted ? res.text : merge3(sent.text, cur.text, res.text).text;
          await this.store.put({ ...cur, text, baseRev: res.meta.rev, baseText: res.text });
        }
        changed.push(sent.path);
      }
    }
  }

  /**
   * The server renamed the path after this copy's base and put the edit on `movedTo`
   * (R-VLT-09): drop the old path and keep the new head, with any typing from the round trip.
   */
  private async moved(sent: LocalDoc, cur: LocalDoc | undefined, untouched: boolean, res: PushResult): Promise<void> {
    const to = res.movedTo!;
    const there = await this.store.get(to);
    if (!there || !isDirty(there)) {
      if (res.text === null) {
        if (there) await this.store.remove(to);
      } else {
        const typed = cur && !untouched && !cur.deleted;
        const text = typed ? merge3(sent.text, cur.text, res.text).text : res.text;
        await this.store.put({ path: to, text, baseRev: res.meta.rev, baseText: res.text, deleted: false });
      }
    }
    if (cur) await this.store.remove(sent.path);
  }

  private async pull(report: SyncReport, changed: string[]): Promise<void> {
    const since = await this.store.getCursor();
    const feed = await this.transport.changes(since);
    for (const ch of feed.changes) {
      if (ch.kind === 'file') {
        await this.files?.onRemote(ch);
        continue;
      }
      const local = await this.store.get(ch.path);
      if (local && local.baseRev !== null && local.baseRev >= ch.rev) continue;

      if (this.live.has(ch.path)) {
        if (!local) continue;
        const { meta, text } = await this.transport.doc(ch.path, ch.rev);
        await this.store.put({ ...local, baseRev: meta.rev, baseText: text });
        // The text did not change, but the base did: listeners holding a copy must reload it.
        changed.push(ch.path);
        continue;
      }
      if (local && isDirty(local)) continue;

      if (ch.deleted) {
        if (local) {
          await this.store.remove(ch.path);
          changed.push(ch.path);
          report.pulled += 1;
        }
        continue;
      }
      const { meta, text } = await this.transport.doc(ch.path);
      if (text === null) {
        if (local) await this.store.remove(ch.path);
      } else {
        await this.store.put({ path: ch.path, text, baseRev: meta.rev, baseText: text, deleted: false });
      }
      changed.push(ch.path);
      report.pulled += 1;
    }
    await this.store.setCursor(feed.cursor);
  }
}

function withoutRename(d: LocalDoc): LocalDoc {
  if (d.renamedFrom === undefined) return d;
  const { renamedFrom: _, ...rest } = d;
  return rest;
}

export class MemoryLocalStore implements LocalStore {
  private docs = new Map<string, LocalDoc>();
  private cursor = 0;

  async get(path: string): Promise<LocalDoc | undefined> {
    const d = this.docs.get(path);
    return d ? { ...d } : undefined;
  }

  async put(doc: LocalDoc): Promise<void> {
    this.docs.set(doc.path, { ...doc });
  }

  async remove(path: string): Promise<void> {
    this.docs.delete(path);
  }

  async all(): Promise<LocalDoc[]> {
    return [...this.docs.values()].map((d) => ({ ...d }));
  }

  async getCursor(): Promise<number> {
    return this.cursor;
  }

  async setCursor(n: number): Promise<void> {
    this.cursor = n;
  }
}

/** Transport that calls a SyncServer in-process, with JSON round-tripping like a real network. */
export function memoryTransport(server: SyncServer, opts: { online?: () => boolean } = {}): Transport {
  const check = () => {
    if (opts.online && !opts.online()) throw new Error('offline');
  };
  const wire = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
  return {
    async push(req) {
      check();
      return wire(await server.push(wire(req)));
    },
    async changes(since) {
      check();
      return wire(server.changes(since));
    },
    async doc(path, rev) {
      check();
      return wire(server.doc(path, rev));
    },
  };
}

/** Largest push request body the client builds; the server accepts more (R-ACC-06). */
const MAX_BATCH_BYTES = 1024 * 1024;
const MAX_BATCH_ITEMS = 200;

/** Splits pushes in order into batches under MAX_BATCH_BYTES; a larger note goes alone. */
function* pushBatches(docs: LocalDoc[]): Generator<LocalDoc[]> {
  let batch: LocalDoc[] = [];
  let bytes = 0;
  for (const d of docs) {
    const size = d.deleted ? 64 : d.text.length * 3 + 64;
    if (batch.length && (bytes + size > MAX_BATCH_BYTES || batch.length >= MAX_BATCH_ITEMS)) {
      yield batch;
      batch = [];
      bytes = 0;
    }
    batch.push(d);
    bytes += size;
  }
  if (batch.length) yield batch;
}
