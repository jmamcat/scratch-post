import type { Conflict, PushResult, Resolution } from '@quire/sync';
import type { Workspace } from '../sync/index.ts';

export interface ConflictSnapshot {
  open: Conflict[];
  review: Conflict[];
  loaded: boolean;
  error?: string;
}

const META_KEY = 'conflicts';

/**
 * Open conflicts and "review suggested" items (R-RVW-02), fetched from the server and kept
 * in IndexedDB so the badge still shows the last known count offline. Refreshed on start,
 * on conflict events, after a sync that touched conflicts and when the server comes back.
 */
export class ConflictStore {
  private snap: ConflictSnapshot = { open: [], review: [], loaded: false };
  private readonly subscribers = new Set<() => void>();
  private disposers: Array<() => void> = [];
  private inflight: Promise<void> | null = null;
  private again = false;

  constructor(private readonly ws: Workspace) {}

  start(): void {
    void this.ws.store.getMeta<{ open: Conflict[]; review: Conflict[] }>(META_KEY).then((cached) => {
      if (cached && !this.snap.loaded) this.set({ ...cached, loaded: true });
    });
    this.disposers.push(
      this.ws.onServerEvent((e) => {
        if (e.type === 'conflict') void this.refresh();
      }),
      this.ws.onSynced((r) => {
        if (!r.error && (r.conflicts.length > 0 || !this.snap.loaded || this.snap.error)) void this.refresh();
      }),
      this.ws.onOnline((up) => {
        if (up) void this.refresh();
      }),
    );
    void this.refresh();
  }

  stop(): void {
    for (const d of this.disposers) d();
    this.disposers = [];
  }

  subscribe = (fn: () => void): (() => void) => {
    this.subscribers.add(fn);
    return () => this.subscribers.delete(fn);
  };

  getSnapshot = (): ConflictSnapshot => this.snap;

  /** The open conflict for a note, if any (for the banner, R-RVW-05). */
  openFor(path: string): Conflict | undefined {
    return this.snap.open.find((c) => c.path === path);
  }

  refresh(): Promise<void> {
    if (this.inflight) {
      this.again = true;
      return this.inflight;
    }
    this.inflight = (async () => {
      do {
        this.again = false;
        try {
          const [open, review] = await Promise.all([this.ws.transport.conflicts('open'), this.ws.transport.conflicts('review')]);
          const byNewest = (a: Conflict, b: Conflict) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0);
          open.sort(byNewest);
          review.sort(byNewest);
          this.set({ open, review, loaded: true });
          void this.ws.store.setMeta(META_KEY, { open, review }).catch(() => undefined);
        } catch (e) {
          this.set({ ...this.snap, error: e instanceof Error ? e.message : String(e) });
        }
      } while (this.again);
    })().finally(() => {
      this.inflight = null;
    });
    return this.inflight;
  }

  /** Applies a resolution (R-RVW-03/04/07), then pulls the result. */
  async resolve(id: string, r: Omit<Resolution, 'device'>): Promise<PushResult> {
    const result = await this.ws.transport.resolve(id, { ...r, device: this.ws.device });
    this.drop(id);
    await this.ws.syncNow();
    await this.refresh();
    return result;
  }

  /** Accepts an auto-resolved item as merged (R-RVW-06). */
  async dismiss(id: string): Promise<void> {
    await this.ws.transport.dismiss(id);
    this.drop(id);
    await this.refresh();
  }

  private drop(id: string): void {
    this.set({ ...this.snap, open: this.snap.open.filter((c) => c.id !== id), review: this.snap.review.filter((c) => c.id !== id) });
  }

  private set(s: ConflictSnapshot): void {
    this.snap = s;
    for (const fn of this.subscribers) fn();
  }
}
