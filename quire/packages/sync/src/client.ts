import { merge3 } from '@quire/core';
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
    const items: PushItem[] = dirty.map((d) => ({ path: d.path, baseRev: d.baseRev, text: d.deleted ? null : d.text }));
    const results = await this.transport.push({ device: this.device, items });
    report.pushed += results.length;

    for (const [n, res] of results.entries()) {
      const sent = dirty[n]!;
      if (res.conflictId) report.conflicts.push(res.conflictId);
      const cur = await this.store.get(sent.path);
      const untouched = !!cur && cur.text === sent.text && cur.deleted === sent.deleted;

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

  private async pull(report: SyncReport, changed: string[]): Promise<void> {
    const since = await this.store.getCursor();
    const feed = await this.transport.changes(since);
    for (const ch of feed.changes) {
      const local = await this.store.get(ch.path);
      if (local && local.baseRev !== null && local.baseRev >= ch.rev) continue;

      if (this.live.has(ch.path)) {
        if (!local) continue;
        const { meta, text } = await this.transport.doc(ch.path, ch.rev);
        await this.store.put({ ...local, baseRev: meta.rev, baseText: text });
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
