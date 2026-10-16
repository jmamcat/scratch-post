import { merge3 } from '@quire/merge';
import { HttpTransport, isDirty, type LocalDoc, type ServerEvent, SyncClient, type SyncReport } from '@quire/sync';
import { Mutex } from './lock.ts';
import type { Settings } from '../platforms/index.ts';
import { EventStream } from './server-events.ts';
import { IdbLocalStore } from './idb-store.ts';
import { LinkIndex } from '@quire/navigate';

export type SyncState = 'idle' | 'syncing' | 'offline' | 'error';

export interface WorkspaceStatus {
  sync: SyncState;
  /** True when the server answered the last request or the event stream is open. */
  online: boolean;
  /** Documents with local changes not yet on the server (live documents excluded). */
  pending: number;
  error?: string;
  lastSyncAt?: number;
}

export interface WorkspaceSnapshot {
  version: number;
  loaded: boolean;
  /** Visible (not deleted) note paths, sorted. Same array until the set of paths changes. */
  paths: readonly string[];
  status: WorkspaceStatus;
}

type TextListener = (path: string, text: string | undefined) => void;

const NETWORK_ERROR = /fetch|network|load failed|offline|timed? ?out|ECONNREFUSED|abort/i;

/**
 * The client's view of the vault: an in-memory mirror of the IndexedDB copy, the sync
 * engine and its schedule (on start, on `online`, on server events, 1 s after edits and
 * every 30 s). The UI reads and writes only through this object, so it works offline.
 *
 * Writes from the UI are optimistic: the mirror changes at once and the store is written
 * in the background. Store writes and sync cycles never interleave (one mutex), and an
 * edit whose store copy changed underneath it (a pull or a push reply) is rebased with
 * merge3, local typing winning overlapping hunks.
 */
export class Workspace {
  readonly store: IdbLocalStore;
  readonly transport: HttpTransport;
  readonly client: SyncClient;
  readonly links = new LinkIndex();
  readonly device: string;

  private readonly docs = new Map<string, LocalDoc>();
  /** For paths with UI edits not yet in the store: the store text those edits started from. */
  private readonly synced = new Map<string, string>();
  private readonly flushQueued = new Set<string>();
  private readonly lock = new Mutex();
  private readonly events: EventStream;
  private readonly subscribers = new Set<() => void>();
  private readonly textListeners = new Set<TextListener>();
  private readonly eventListeners = new Set<(e: ServerEvent) => void>();
  private readonly syncListeners = new Set<(r: SyncReport) => void>();
  private readonly onlineListeners = new Set<(online: boolean) => void>();
  private channel: BroadcastChannel | null = null;
  private syncTimer: ReturnType<typeof setTimeout> | null = null;
  private interval: ReturnType<typeof setInterval> | null = null;
  private pathsDirty = true;
  private queuedSync: Promise<SyncReport> | null = null;
  private snap: WorkspaceSnapshot = {
    version: 0,
    loaded: false,
    paths: [],
    status: { sync: 'idle', online: false, pending: 0 },
  };
  private status: WorkspaceStatus = { sync: 'idle', online: false, pending: 0 };
  private disposers: Array<() => void> = [];

  constructor(
    readonly settings: Settings,
    opts: { store?: IdbLocalStore; transport?: HttpTransport; createEventSource?: (url: string) => EventSource } = {},
  ) {
    this.device = settings.device;
    this.store = opts.store ?? new IdbLocalStore();
    this.transport = opts.transport ?? new HttpTransport(settings.serverUrl, settings.token || undefined);
    this.client = new SyncClient({ store: this.store, transport: this.transport, device: settings.device });
    this.events = new EventStream({
      url: this.transport.url('/api/events'),
      ...(opts.createEventSource ? { createSource: opts.createEventSource } : {}),
      onEvent: (e) => this.handleEvent(e),
      onStatus: (up) => {
        if (up) {
          this.setOnline(true);
          this.syncSoon(0);
        } else this.syncSoon(500);
      },
    });
  }

  // ---- lifecycle -------------------------------------------------------------------

  async start(): Promise<void> {
    await prepareStoreForServer(this.store, this.settings.serverUrl);
    for (const d of await this.store.all()) this.docs.set(d.path, d);
    this.pathsDirty = true;
    this.snap = { ...this.snap, loaded: true };
    this.bump();

    this.disposers.push(this.client.onChange((paths) => this.queueReload(paths, true)));
    if (typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel(`quire:${this.store.name}`);
      this.channel.onmessage = (m: MessageEvent<string[]>) => {
        if (Array.isArray(m.data)) this.queueReload(m.data, false);
      };
    }
    if (typeof window !== 'undefined') {
      const online = () => {
        this.events.retryNow();
        this.syncSoon(0);
      };
      const offline = () => this.setOnline(false);
      window.addEventListener('online', online);
      window.addEventListener('offline', offline);
      this.disposers.push(() => {
        window.removeEventListener('online', online);
        window.removeEventListener('offline', offline);
      });
    }
    this.events.start();
    this.interval = setInterval(() => void this.syncNow(), 30_000);
    void this.syncNow();
  }

  stop(): void {
    this.events.stop();
    if (this.interval) clearInterval(this.interval);
    if (this.syncTimer) clearTimeout(this.syncTimer);
    this.channel?.close();
    for (const d of this.disposers) d();
    this.disposers = [];
  }

  // ---- reading ---------------------------------------------------------------------

  subscribe = (fn: () => void): (() => void) => {
    this.subscribers.add(fn);
    return () => this.subscribers.delete(fn);
  };

  getSnapshot = (): WorkspaceSnapshot => this.snap;

  read(path: string): string | undefined {
    const d = this.docs.get(path);
    return d && !d.deleted ? d.text : undefined;
  }

  has(path: string): boolean {
    return this.read(path) !== undefined;
  }

  /** Visible documents, for search and backlinks. */
  *notes(): Iterable<{ path: string; text: string }> {
    for (const d of this.docs.values()) if (!d.deleted) yield d;
  }

  isPending(path: string): boolean {
    const d = this.docs.get(path);
    return !!d && isDirty(d) && !this.client.isLive(path);
  }

  /** Fires when a document's text changes for a reason other than `write` (sync, rebase, other tab). */
  onText(fn: TextListener): () => void {
    this.textListeners.add(fn);
    return () => this.textListeners.delete(fn);
  }

  onServerEvent(fn: (e: ServerEvent) => void): () => void {
    this.eventListeners.add(fn);
    return () => this.eventListeners.delete(fn);
  }

  onSynced(fn: (r: SyncReport) => void): () => void {
    this.syncListeners.add(fn);
    return () => this.syncListeners.delete(fn);
  }

  onOnline(fn: (online: boolean) => void): () => void {
    this.onlineListeners.add(fn);
    return () => this.onlineListeners.delete(fn);
  }

  // ---- writing ---------------------------------------------------------------------

  write(path: string, text: string): void {
    const cur = this.docs.get(path);
    if (cur && !cur.deleted && cur.text === text) return;
    if (!this.synced.has(path)) this.synced.set(path, cur && !cur.deleted ? cur.text : '');
    if (!cur || cur.deleted) this.pathsDirty = true;
    this.docs.set(path, { path, baseRev: null, baseText: null, ...cur, text, deleted: false });
    this.bump();
    this.queueFlush(path);
    this.syncSoon(1000);
  }

  /** Creates an empty note unless it exists. */
  create(path: string, text = ''): void {
    if (!this.has(path)) this.write(path, text);
  }

  async remove(path: string): Promise<void> {
    const cur = this.docs.get(path);
    if (!cur || cur.deleted) return;
    this.synced.delete(path);
    if (cur.baseRev === null) this.docs.delete(path);
    else this.docs.set(path, { ...cur, deleted: true });
    this.pathsDirty = true;
    this.bump();
    this.emitText(path, undefined);
    await this.lock.run(() => this.client.remove(path));
    this.syncSoon(1000);
  }

  /** Moves a note to a new path (a create plus a delete). Links to it are not rewritten. */
  async rename(from: string, to: string): Promise<boolean> {
    const text = this.read(from);
    if (text === undefined || from === to || this.has(to)) return false;
    this.write(to, text);
    await this.remove(from);
    return true;
  }

  /** Marks a document as owned by its live room (not pushed; pulls only move its base). */
  setLive(path: string, live: boolean): void {
    if (this.client.isLive(path) === live) return;
    this.client.setLive(path, live);
    this.bump();
  }

  /** Writes every queued edit to the store now. */
  flush(): Promise<void> {
    return this.lock.run(() => undefined);
  }

  // ---- sync ------------------------------------------------------------------------

  syncSoon(ms: number): void {
    if (this.syncTimer) clearTimeout(this.syncTimer);
    this.syncTimer = setTimeout(() => {
      this.syncTimer = null;
      void this.syncNow();
    }, ms);
  }

  async syncNow(): Promise<SyncReport> {
    if (this.syncTimer) clearTimeout(this.syncTimer);
    this.syncTimer = null;
    if (this.queuedSync) return this.queuedSync;
    const run = this.lock.run(() => {
      this.queuedSync = null;
      this.setStatus({ sync: 'syncing' });
      return this.client.sync();
    });
    this.queuedSync = run;
    const report = await run;
    await this.lock.run(() => undefined); // let reloads queued by the cycle land
    if (report.error) {
      const offline = (typeof navigator !== 'undefined' && navigator.onLine === false) || NETWORK_ERROR.test(report.error);
      if (offline) this.setOnline(false);
      this.setStatus({ sync: offline ? 'offline' : 'error', error: report.error });
    } else {
      this.setOnline(true);
      this.setStatus({ sync: 'idle', lastSyncAt: Date.now() });
      delete this.status.error;
    }
    for (const fn of this.syncListeners) fn(report);
    return report;
  }

  // ---- internals -------------------------------------------------------------------

  private queueFlush(path: string): void {
    if (this.flushQueued.has(path)) return;
    this.flushQueued.add(path);
    void this.lock.run(async () => {
      this.flushQueued.delete(path);
      await this.flushPath(path);
    });
  }

  private async flushPath(path: string): Promise<void> {
    const base = this.synced.get(path);
    const mine = this.docs.get(path);
    if (base === undefined || !mine || mine.deleted) return;
    const ui = mine.text;
    const stored = await this.store.get(path);
    // The store moved since the edit started (a pull or a push reply): rebase the edit.
    const text = stored && !stored.deleted && stored.text !== base ? merge3(base, ui, stored.text).text : ui;
    // SyncClient.write skips a new empty document, so create those directly.
    if (stored) await this.client.write(path, text);
    else await this.store.put({ path, text, baseRev: null, baseText: null, deleted: false });

    const fresh = (await this.store.get(path)) ?? { path, text, baseRev: null, baseText: null, deleted: false };
    const now = this.docs.get(path);
    if (!now || now.deleted || !this.synced.has(path)) return; // removed meanwhile
    if (now.text === ui) {
      this.synced.delete(path);
      this.docs.set(path, fresh);
      if (text !== ui) this.emitText(path, text);
    } else {
      // More typing while the store write ran: carry the rebase over to it.
      const next = text === ui ? now.text : merge3(ui, now.text, text).text;
      this.synced.set(path, text);
      this.docs.set(path, { ...fresh, text: next });
      if (next !== now.text) this.emitText(path, next);
      this.queueFlush(path);
    }
    this.bump();
    this.channel?.postMessage([path]);
  }

  private queueReload(paths: string[], broadcast: boolean): void {
    void this.lock.run(async () => {
      for (const path of paths) await this.reloadPath(path);
      this.bump();
      if (broadcast) this.channel?.postMessage(paths);
    });
  }

  private async reloadPath(path: string): Promise<void> {
    const stored = await this.store.get(path);
    const prev = this.docs.get(path);
    if (this.synced.has(path)) {
      // UI edits are waiting: keep their text, take the new base; the flush rebases.
      if (stored) this.docs.set(path, { ...stored, text: prev?.text ?? stored.text, deleted: false });
      if (!this.flushQueued.has(path)) this.queueFlush(path);
      return;
    }
    if (!stored) {
      if (!prev) return;
      this.docs.delete(path);
      this.pathsDirty = true;
      if (!prev.deleted) this.emitText(path, undefined);
      return;
    }
    this.docs.set(path, stored);
    if (!prev || prev.deleted !== stored.deleted) this.pathsDirty = true;
    const was = prev && !prev.deleted ? prev.text : undefined;
    const is = stored.deleted ? undefined : stored.text;
    if (was !== is) this.emitText(path, is);
  }

  private handleEvent(e: ServerEvent): void {
    this.setOnline(true);
    for (const fn of this.eventListeners) fn(e);
    if (e.type === 'commit' && e.device !== this.device) this.syncSoon(150);
  }

  private emitText(path: string, text: string | undefined): void {
    for (const fn of this.textListeners) fn(path, text);
  }

  private setOnline(online: boolean): void {
    if (this.status.online === online) return;
    this.status = { ...this.status, online };
    if (!online && this.status.sync === 'idle') this.status.sync = 'offline';
    if (online && this.status.sync === 'offline') this.status.sync = 'idle';
    for (const fn of this.onlineListeners) fn(online);
    this.bump();
  }

  private setStatus(patch: Partial<WorkspaceStatus>): void {
    this.status = { ...this.status, ...patch };
    this.bump();
  }

  private bump(): void {
    let pending = 0;
    for (const d of this.docs.values()) if (isDirty(d) && !this.client.isLive(d.path)) pending++;
    this.status = { ...this.status, pending };
    let paths = this.snap.paths;
    if (this.pathsDirty) {
      paths = [...this.docs.values()].filter((d) => !d.deleted).map((d) => d.path).sort();
      this.links.setPaths(paths);
      this.pathsDirty = false;
    }
    this.snap = { version: this.snap.version + 1, loaded: this.snap.loaded, paths, status: this.status };
    for (const fn of this.subscribers) fn();
  }
}

/**
 * Revisions and the feed cursor belong to one server. When the configured server changes,
 * keep unsynced edits as new documents for the new server and drop everything else, so
 * the next sync pulls a fresh copy.
 */
export async function prepareStoreForServer(store: IdbLocalStore, serverUrl: string): Promise<void> {
  const known = await store.getMeta<string>('serverUrl');
  if (known === serverUrl) return;
  if (known !== undefined) {
    for (const d of await store.all()) {
      if (!isDirty(d) || d.deleted) await store.remove(d.path);
      else await store.put({ ...d, baseRev: null, baseText: null });
    }
    await store.setCursor(0);
  }
  await store.setMeta('serverUrl', serverUrl);
}
