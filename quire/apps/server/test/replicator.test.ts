import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { HttpTransport } from '@quire/sync';
import { afterEach, describe, expect, it } from 'vitest';
import { createQuireServer } from '../src/app.ts';
import { createReplicator } from '../src/replicator.ts';
import { startServer, waitFor } from './helpers.ts';

const cleanups: (() => Promise<void> | void)[] = [];
afterEach(async () => {
  while (cleanups.length) await cleanups.pop()!();
});

async function localNode(upstreamUrl: string) {
  const dataDir = mkdtempSync(join(tmpdir(), 'quire-local-'));
  const q = await createQuireServer({ dataDir, port: 0, mode: 'local', device: 'nas', webDist: join(dataDir, 'none'), watch: false });
  const rep = createReplicator(q, { url: upstreamUrl, device: 'nas' }, { intervalMs: 100, debounceMs: 20, maxBackoffMs: 200 });
  cleanups.push(async () => {
    await rep.stop();
    await q.close();
    rmSync(dataDir, { recursive: true, force: true });
  });
  return { q, rep };
}

const text = (q: Awaited<ReturnType<typeof createQuireServer>>, path: string) => {
  const h = q.store.head(path);
  return h && !h.deleted ? q.store.text(h.rev) : null;
};

describe('R-SYN-09 local node replication', () => {
  it('converges edits made on either side', async () => {
    const cloud = await startServer();
    cleanups.push(() => cloud.cleanup());
    const api = new HttpTransport(cloud.url);
    const { q, rep } = await localNode(cloud.url);
    rep.start();

    await api.push({ device: 'phone', items: [{ path: 'from-cloud.md', baseRev: null, text: 'cloud\n' }] });
    await waitFor(() => text(q, 'from-cloud.md') === 'cloud\n');

    await q.sync.push({ device: 'laptop', items: [{ path: 'from-local.md', baseRev: null, text: 'local\n' }] });
    await waitFor(async () => (await api.doc('from-local.md').catch(() => null))?.text === 'local\n');

    const head = q.store.head('from-cloud.md')!;
    await q.sync.push({ device: 'laptop', items: [{ path: 'from-cloud.md', baseRev: head.rev, text: 'cloud\nplus local\n' }] });
    await waitFor(async () => (await api.doc('from-cloud.md')).text === 'cloud\nplus local\n');
  });

  it('keeps serving while the upstream is down and catches up after', async () => {
    const cloud = await startServer();
    const dataDir = cloud.dataDir;
    const port = Number(new URL(cloud.url).port);
    const { q, rep } = await localNode(cloud.url);
    rep.start();
    await cloud.stop();

    const [res] = await q.sync.push({ device: 'laptop', items: [{ path: 'offline.md', baseRev: null, text: 'written while cloud was down\n' }] });
    expect(res?.status).toBe('applied');
    expect((await rep.syncNow()).error).toBeTruthy();

    const back = await startServer({ dataDir, port });
    cleanups.push(() => back.cleanup());
    const api = new HttpTransport(back.url);
    await waitFor(async () => (await api.doc('offline.md').catch(() => null))?.text === 'written while cloud was down\n', 8000);
  });
});
