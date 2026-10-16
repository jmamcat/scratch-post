import { HttpTransport, type LocalDoc, type LocalStore, type RevisionStore, SyncClient, type SyncReport, type SyncServer, type Transport } from '@quire/sync';
import type { EventHub } from '../shared/events.ts';

/** A revision store that also keeps small key-value records (the upstream bases). */
export interface ReplicaStore extends RevisionStore {
  getKv(key: string): string | null;
  setKv(key: string, value: string): void;
  deleteKv(key: string): void;
  kvKeys(prefix: string): string[];
}

/** What the replicator needs from the local node it runs in. */
export interface ReplicatorDeps {
  store: ReplicaStore;
  sync: SyncServer;
  events: EventHub;
}

export interface Replicator {
  start(): void;
  stop(): Promise<void>;
  syncNow(): Promise<SyncReport>;
}

interface Base {
  rev: number | null;
  text: string | null;
}

const BASE_PREFIX = 'upstream:base:';
const CURSOR_KEY = 'upstream:cursor';

/**
 * A LocalStore view over this node's own revision log, so the node can sync upstream with
 * the same SyncClient a browser uses. The node's heads are "local text"; the upstream
 * revision each head was last reconciled with is the "base".
 */
class NodeStore implements LocalStore {
  /** Local head revision observed by the last get(), used as the base of local commits. */
  private seen = new Map<string, number | null>();

  constructor(private readonly q: ReplicatorDeps) {}

  private base(path: string): Base | null {
    const raw = this.q.store.getKv(BASE_PREFIX + path);
    return raw ? (JSON.parse(raw) as Base) : null;
  }

  private setBase(path: string, base: Base | null): void {
    if (base) this.q.store.setKv(BASE_PREFIX + path, JSON.stringify(base));
    else this.q.store.deleteKv(BASE_PREFIX + path);
  }

  async get(path: string): Promise<LocalDoc | undefined> {
    const head = this.q.store.head(path);
    const base = this.base(path);
    this.seen.set(path, head?.rev ?? null);
    if (!head) {
      return base ? { path, text: '', baseRev: base.rev, baseText: base.text, deleted: true } : undefined;
    }
    if (head.deleted) {
      return base ? { path, text: '', baseRev: base.rev, baseText: base.text, deleted: true } : undefined;
    }
    const text = this.q.store.text(head.rev) ?? '';
    return { path, text, baseRev: base?.rev ?? null, baseText: base?.text ?? null, deleted: false };
  }

  async put(doc: LocalDoc): Promise<void> {
    this.setBase(doc.path, { rev: doc.baseRev, text: doc.baseText });
    if (doc.deleted) return;
    const head = this.q.store.head(doc.path);
    const headText = head && !head.deleted ? this.q.store.text(head.rev) : null;
    if (headText === doc.text) return;
    const baseRev = this.seen.has(doc.path) ? this.seen.get(doc.path)! : (head?.rev ?? null);
    const [res] = await this.q.sync.push({ device: 'upstream', items: [{ path: doc.path, baseRev, text: doc.text }] });
    this.seen.set(doc.path, res?.meta.rev ?? null);
  }

  async remove(path: string): Promise<void> {
    this.setBase(path, null);
    const head = this.q.store.head(path);
    if (!head || head.deleted) return;
    const baseRev = this.seen.has(path) ? this.seen.get(path)! : head.rev;
    await this.q.sync.push({ device: 'upstream', items: [{ path, baseRev, text: null }] });
  }

  async all(): Promise<LocalDoc[]> {
    // Attachments do not replicate through a local node yet (D-C-1 in the 0003 run report).
    const paths = new Set(this.q.store.heads().filter((m) => m.kind !== 'file').map((m) => m.path));
    for (const key of this.q.store.kvKeys(BASE_PREFIX)) paths.add(key.slice(BASE_PREFIX.length));
    const docs: LocalDoc[] = [];
    for (const p of paths) {
      const d = await this.get(p);
      if (d) docs.push(d);
    }
    return docs;
  }

  async getCursor(): Promise<number> {
    return Number(this.q.store.getKv(CURSOR_KEY) ?? 0);
  }

  async setCursor(n: number): Promise<void> {
    this.q.store.setKv(CURSOR_KEY, String(n));
  }
}

/** R-SYN-09: replicate a local node with its upstream, retrying with backoff while it is down. */
export function createReplicator(
  q: ReplicatorDeps,
  upstream: { url: string; token?: string; device: string; transport?: Transport },
  opts: { intervalMs?: number; debounceMs?: number; maxBackoffMs?: number } = {},
): Replicator {
  const intervalMs = opts.intervalMs ?? 10_000;
  const debounceMs = opts.debounceMs ?? 1_000;
  const maxBackoffMs = opts.maxBackoffMs ?? 60_000;
  const client = new SyncClient({
    store: new NodeStore(q),
    transport: upstream.transport ?? new HttpTransport(upstream.url, upstream.token),
    device: upstream.device,
  });

  let timer: NodeJS.Timeout | null = null;
  let failures = 0;
  let stopped = true;
  let off: (() => void) | null = null;

  const plan = (ms: number) => {
    if (stopped) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(run, ms);
  };

  async function run(): Promise<void> {
    timer = null;
    const report = await client.sync();
    if (stopped) return;
    if (report.error) {
      failures += 1;
      plan(Math.min(maxBackoffMs, intervalMs * 2 ** Math.min(failures - 1, 6)));
    } else {
      failures = 0;
      plan(intervalMs);
    }
  }

  return {
    start() {
      stopped = false;
      off = q.events.subscribe((e) => {
        if (e.type === 'commit' && e.device !== 'upstream' && failures === 0) plan(debounceMs);
      });
      plan(0);
    },
    async stop() {
      stopped = true;
      off?.();
      if (timer) clearTimeout(timer);
      await client.sync().catch(() => undefined);
    },
    syncNow: () => client.sync(),
  };
}
