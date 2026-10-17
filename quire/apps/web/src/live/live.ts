import { merge3 } from '@quire/merge';
import { Prec } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import type { WebsocketProvider } from 'y-websocket';
import type * as Y from 'yjs';
import { collabSlot } from '../vault/index.ts';
import { minimalChange } from '../vault/index.ts';
import type { Workspace } from '../sync/index.ts';

export type LiveState = 'off' | 'connecting' | 'live';

export interface LiveInfo {
  state: LiveState;
  /** Other people in the room (awareness states minus this one). */
  peers: string[];
}

/** Yjs and its bindings stay out of the first-load bundle (R-PLT-07): fetched when a note first joins a room. */
async function loadLiveLibs() {
  const [yjs, ycm, ysock] = await Promise.all([import('yjs'), import('y-codemirror.next'), import('y-websocket')]);
  return { Y: yjs, yCollab: ycm.yCollab, WebsocketProvider: ysock.WebsocketProvider };
}

type LiveLibs = Awaited<ReturnType<typeof loadLiveLibs>>;

const COLORS = ['#e8590c', '#2b8a3e', '#1971c2', '#c2255c', '#6741d9', '#0c8599', '#e67700', '#5c940d'];

export function colorFor(name: string): string {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return COLORS[h % COLORS.length]!;
}

/** `http(s)://host` to `ws(s)://host`. */
export function wsBase(serverUrl: string): string {
  return serverUrl.replace(/^http/i, 'ws').replace(/\/+$/, '');
}

/**
 * Live co-editing for the open note (R-LIV-05). While the server is reachable the editor is
 * bound to the room's `Y.Text("content")` and the document is marked live in the sync
 * engine. When the connection drops the binding is removed, the editor text stays as the
 * local copy (it was written there all along) and the offline path takes over. Rejoining
 * always syncs first, so local edits reach the head before the room is seeded from it.
 */
export class LiveSession {
  private provider: WebsocketProvider | null = null;
  private doc: Y.Doc | null = null;
  private bound = false;
  private stopped = false;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private retryDelay = 1000;
  private offOnline: (() => void) | null = null;
  private info: LiveInfo = { state: 'off', peers: [] };

  constructor(
    private readonly ws: Workspace,
    private readonly view: EditorView,
    private readonly path: string,
    private readonly onInfo: (info: LiveInfo) => void,
  ) {}

  start(): void {
    this.offOnline = this.ws.onOnline((online) => {
      if (!online) this.drop();
      else if (!this.provider) this.scheduleJoin(0);
    });
    this.scheduleJoin(0);
  }

  stop(): void {
    this.stopped = true;
    this.offOnline?.();
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.teardown();
  }

  private set(state: LiveState, peers: string[] = []): void {
    if (state === this.info.state && peers.join('\n') === this.info.peers.join('\n')) return;
    this.info = { state, peers };
    this.onInfo(this.info);
  }

  private scheduleJoin(ms: number): void {
    if (this.stopped || this.retryTimer) return;
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      void this.join();
    }, ms);
  }

  private retryLater(): void {
    const wait = this.retryDelay;
    this.retryDelay = Math.min(this.retryDelay * 2, 30_000);
    this.scheduleJoin(wait);
  }

  private async join(): Promise<void> {
    if (this.stopped || this.provider) return;
    this.set('connecting');
    const libsLoading = loadLiveLibs();
    libsLoading.catch(() => undefined); // reported below, once the join gets that far
    // Sync first: local edits must be in the head the room is seeded from.
    await this.ws.flush();
    const report = await this.ws.syncNow();
    if (this.stopped || this.provider) return;
    if (report.error || !this.ws.has(this.path)) {
      this.set('off');
      if (!report.error) return; // not on the server yet (deleted): stay local
      this.retryLater();
      return;
    }

    // The merge base for `bind` is the server text the room is seeded from (the head this sync
    // agreed on), not the editor text: typing that lands after the push but before the room
    // connects is then carried into the room instead of being replaced by the older head.
    const joinText = (await this.ws.client.store.get(this.path))?.baseText ?? this.view.state.doc.toString();
    let libs: LiveLibs;
    try {
      libs = await libsLoading;
    } catch {
      // The chunk could not be fetched (offline, flaky network): try again later.
      this.set('off');
      this.retryLater();
      return;
    }
    if (this.stopped || this.provider) return;

    const doc = new libs.Y.Doc();
    let auth: Record<string, string>;
    try {
      auth = await this.ws.transport.streamParams();
    } catch {
      this.set('off');
      this.retryLater();
      return;
    }
    if (this.stopped || this.provider) return;
    const provider = new libs.WebsocketProvider(`${wsBase(this.ws.settings.serverUrl)}/live`, '', doc, {
      params: { path: this.path, device: this.ws.device, ...auth },
      disableBc: true,
      maxBackoffTime: 5000,
    });
    this.doc = doc;
    this.provider = provider;
    const color = colorFor(this.ws.device);
    provider.awareness.setLocalStateField('user', { name: this.ws.device, color, colorLight: `${color}33` });
    provider.awareness.on('change', () => {
      if (this.bound) this.set('live', this.peers());
    });

    let connectedOnce = false;
    provider.on('status', ({ status }: { status: string }) => {
      if (this.provider !== provider) return;
      if (status === 'connected') connectedOnce = true;
      if (status === 'disconnected') {
        // The room is gone or unreachable: fall back to offline editing, then rejoin.
        this.drop();
        if (!connectedOnce || !this.bound) this.retryLater();
      }
    });
    // A refused handshake (spent or expired ticket) never reports "disconnected", and the
    // provider would retry the same URL forever: start a new join with a fresh ticket instead.
    provider.on('connection-close', () => {
      if (this.provider !== provider || connectedOnce) return;
      this.drop();
      this.retryLater();
    });
    provider.on('sync', (synced: boolean) => {
      if (synced && !this.bound && this.provider === provider) this.bind(libs, doc, provider, joinText);
    });
  }

  private bind(libs: LiveLibs, doc: Y.Doc, provider: WebsocketProvider, joinText: string): void {
    const ytext = doc.getText('content');
    const typed = this.view.state.doc.toString();
    // Typing during the handshake: carry it into the room instead of dropping it.
    if (typed !== joinText) {
      const merged = merge3(joinText, typed, ytext.toString()).text;
      const change = minimalChange(ytext.toString(), merged);
      if (change) {
        doc.transact(() => {
          if (change.to > change.from) ytext.delete(change.from, change.to - change.from);
          if (change.insert) ytext.insert(change.from, change.insert);
        });
      }
    }
    // Adopt the room text (a normal edit, so it reaches the local copy), then bind.
    const change = minimalChange(this.view.state.doc.toString(), ytext.toString());
    if (change) this.view.dispatch({ changes: change });
    const undoManager = new libs.Y.UndoManager(ytext);
    this.view.dispatch({ effects: collabSlot.reconfigure(Prec.high(libs.yCollab(ytext, provider.awareness, { undoManager }))) });
    this.bound = true;
    this.retryDelay = 1000;
    this.ws.setLive(this.path, true);
    this.set('live', this.peers());
  }

  private peers(): string[] {
    const p = this.provider;
    if (!p) return [];
    const out: string[] = [];
    p.awareness.getStates().forEach((s: { user?: { name?: string } }, id: number) => {
      if (id !== p.awareness.clientID && s.user?.name) out.push(s.user.name);
    });
    return out;
  }

  /** Leave the room now and rejoin when the server is reachable again. */
  private drop(): void {
    if (!this.provider) return;
    const wasBound = this.bound;
    this.teardown();
    if (this.stopped) return;
    this.set('off');
    if (wasBound) {
      // Push what was typed while live (or offline) through the offline path first.
      this.ws.syncSoon(0);
      this.retryLater();
    }
  }

  private teardown(): void {
    if (this.bound) {
      try {
        this.view.dispatch({ effects: collabSlot.reconfigure([]) });
      } catch {
        // view already destroyed
      }
    }
    this.bound = false;
    this.ws.setLive(this.path, false);
    const p = this.provider;
    this.provider = null;
    if (p) {
      p.awareness.setLocalState(null);
      p.destroy();
    }
    this.doc?.destroy();
    this.doc = null;
  }
}
