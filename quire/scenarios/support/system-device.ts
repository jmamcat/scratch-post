import { HttpTransport, MemoryLocalStore, type Resolution, SyncClient, isDirty } from '@quire/sync';
import WS from 'ws';
import { WebsocketProvider } from 'y-websocket';
import * as Y from 'yjs';
import type { Device } from './device.ts';

interface LiveSession {
  doc: Y.Doc;
  text: Y.Text;
  provider: WebsocketProvider;
}

/** A device driven at the protocol level: the same SyncClient the web app uses, over real HTTP. */
export class SystemDevice implements Device {
  readonly client: SyncClient;
  readonly transport: HttpTransport;
  private online = true;
  private live = new Map<string, LiveSession>();

  constructor(
    readonly name: string,
    readonly serverUrl: string,
    token?: string,
  ) {
    this.transport = new HttpTransport(serverUrl, token, (input, init) => {
      if (!this.online) return Promise.reject(new TypeError('Failed to fetch (offline)'));
      return fetch(input, init);
    });
    this.client = new SyncClient({ store: new MemoryLocalStore(), transport: this.transport, device: name });
  }

  async setText(path: string, text: string): Promise<void> {
    const session = this.live.get(path);
    if (session?.provider.wsconnected) {
      session.doc.transact(() => {
        session.text.delete(0, session.text.length);
        session.text.insert(0, text);
      });
      return;
    }
    await this.client.write(path, text);
  }

  async append(path: string, text: string): Promise<void> {
    await this.setText(path, `${(await this.read(path)) ?? ''}${text}`);
  }

  async replace(path: string, find: string, replacement: string): Promise<void> {
    const cur = (await this.read(path)) ?? '';
    if (!cur.includes(find)) throw new Error(`"${find}" not found in ${path} on ${this.name}: ${JSON.stringify(cur)}`);
    await this.setText(path, cur.replace(find, replacement));
  }

  async remove(path: string): Promise<void> {
    await this.client.remove(path);
  }

  async read(path: string): Promise<string | undefined> {
    const session = this.live.get(path);
    if (session?.provider.wsconnected) return session.text.toString();
    const doc = await this.client.store.get(path);
    return doc && !doc.deleted ? doc.text : undefined;
  }

  async isPending(path: string): Promise<boolean> {
    const doc = await this.client.store.get(path);
    return !!doc && isDirty(doc);
  }

  async sync(): Promise<void> {
    await this.client.sync();
  }

  async goOffline(): Promise<void> {
    this.online = false;
  }

  /** Like the app: back online means push and pull straight away. */
  async comeOnline(): Promise<void> {
    this.online = true;
    const report = await this.client.sync();
    if (report.error) throw new Error(`${this.name} could not sync: ${report.error}`);
  }

  async conflicts() {
    return this.transport.conflicts();
  }

  async resolve(id: string, r: Omit<Resolution, 'device'>): Promise<void> {
    await this.transport.resolve(id, { ...r, device: this.name });
    await this.client.sync();
  }

  async dismiss(id: string): Promise<void> {
    await this.transport.dismiss(id);
  }

  // ---- live editing (system layer only) ----

  async joinLive(path: string): Promise<void> {
    await this.client.sync();
    const doc = new Y.Doc();
    const provider = new WebsocketProvider(`${this.serverUrl.replace(/^http/, 'ws')}/live`, '', doc, {
      params: { path },
      WebSocketPolyfill: WS as unknown as typeof WebSocket,
      disableBc: true,
    });
    await new Promise<void>((resolve) => provider.on('sync', (synced: boolean) => synced && resolve()));
    this.client.setLive(path, true);
    this.live.set(path, { doc, text: doc.getText('content'), provider });
  }

  livePaths(): string[] {
    return [...this.live.keys()];
  }

  isLive(path: string): boolean {
    return !!this.live.get(path)?.provider.wsconnected;
  }

  insertLive(path: string, at: 'start' | 'end', text: string): void {
    const s = this.live.get(path);
    if (!s) throw new Error(`${this.name} is not editing ${path} live`);
    s.text.insert(at === 'start' ? 0 : s.text.length, text);
  }

  /** The app's behaviour when the socket drops: keep the editor text as the local copy. */
  async dropLive(path: string): Promise<void> {
    const s = this.live.get(path);
    if (!s) throw new Error(`${this.name} is not editing ${path} live`);
    s.provider.disconnect();
    this.client.setLive(path, false);
    await this.client.write(path, s.text.toString());
  }

  /** Reconnect: push local changes through the offline path first, then rejoin the room. */
  async rejoinLive(path: string): Promise<void> {
    const s = this.live.get(path);
    if (!s) throw new Error(`${this.name} was not editing ${path} live`);
    s.provider.destroy();
    s.doc.destroy();
    this.live.delete(path);
    await this.joinLive(path);
  }

  async close(): Promise<void> {
    for (const s of this.live.values()) {
      s.provider.destroy();
      s.doc.destroy();
    }
    this.live.clear();
  }
}
