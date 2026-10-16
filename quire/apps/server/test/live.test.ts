import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { serve } from '@hono/node-server';
import { HttpTransport } from '@quire/sync';
import { afterEach, describe, expect, it } from 'vitest';
import WS from 'ws';
import { WebsocketProvider } from 'y-websocket';
import * as Y from 'yjs';
import { createQuireServer } from '../src/app.ts';
import { createLiveRooms } from '../src/live.ts';
import { waitFor } from './helpers.ts';

const cleanups: (() => Promise<void> | void)[] = [];
afterEach(async () => {
  while (cleanups.length) await cleanups.pop()!();
});

async function boot() {
  const dataDir = mkdtempSync(join(tmpdir(), 'quire-live-'));
  const q = await createQuireServer({ dataDir, port: 0, mode: 'cloud', device: 't', webDist: join(dataDir, 'none'), watch: false });
  const http = await new Promise<Server>((resolve) => {
    const s = serve({ fetch: q.app.fetch, port: 0 }, () => resolve(s as Server));
  });
  const live = createLiveRooms(q, { idleMs: 100, maxMs: 400 });
  live.attach(http);
  const url = `http://127.0.0.1:${(http.address() as AddressInfo).port}`;
  cleanups.push(async () => {
    await live.close();
    await new Promise<void>((r) => {
      http.closeAllConnections();
      http.close(() => r());
    });
    await q.close();
    rmSync(dataDir, { recursive: true, force: true });
  });
  return { q, live, url, api: new HttpTransport(url) };
}

function client(url: string, path: string) {
  const doc = new Y.Doc();
  const provider = new WebsocketProvider(url.replace('http', 'ws') + '/live', '', doc, {
    params: { path },
    WebSocketPolyfill: WS as unknown as typeof WebSocket,
    disableBc: true,
  });
  cleanups.push(() => {
    provider.destroy();
    doc.destroy();
  });
  const text = doc.getText('content');
  const synced = new Promise<void>((r) => provider.on('sync', (s: boolean) => s && r()));
  return { doc, text, provider, synced };
}

describe('live rooms', () => {
  it('R-LIV-01: seeds from the head and relays edits between clients', async () => {
    const { url, api } = await boot();
    await api.push({ device: 'x', items: [{ path: 'a.md', baseRev: null, text: 'start\n' }] });
    const a = client(url, 'a.md');
    const b = client(url, 'a.md');
    await Promise.all([a.synced, b.synced]);
    expect(a.text.toString()).toBe('start\n');
    a.text.insert(a.text.length, 'hello');
    await waitFor(() => b.text.toString() === 'start\nhello');
  });

  it('R-LIV-02: commits live text after the idle delay', async () => {
    const { url, api } = await boot();
    const a = client(url, 'new.md');
    await a.synced;
    a.text.insert(0, 'typed live');
    const doc = await waitFor(async () => {
      try {
        const d = await api.doc('new.md');
        return d.text === 'typed live' ? d : null;
      } catch {
        return null;
      }
    });
    expect(doc.meta.device).toBe('live');
  });

  it('R-LIV-03: an offline push lands in the room without losing live edits', async () => {
    const { url, api } = await boot();
    const [r1] = await api.push({ device: 'x', items: [{ path: 'p.md', baseRev: null, text: 'para 1\n\npara 2\n\npara 3\n' }] });
    const a = client(url, 'p.md');
    const b = client(url, 'p.md');
    await Promise.all([a.synced, b.synced]);
    a.text.insert(0, 'LIVE ');
    await waitFor(() => b.text.toString().startsWith('LIVE '));
    const [res] = await api.push({ device: 'pixel', items: [{ path: 'p.md', baseRev: r1!.meta.rev, text: 'para 1\n\npara 2\n\npara 3 offline\n' }] });
    expect(res?.status).toBe('merged');
    const want = 'LIVE para 1\n\npara 2\n\npara 3 offline\n';
    expect(res?.text).toBe(want);
    await waitFor(() => a.text.toString() === want && b.text.toString() === want);
  });
});
