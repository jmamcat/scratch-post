import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { HttpTransport } from '@quire/sync';
import { afterEach, describe, expect, it } from 'vitest';
import { startServer, waitFor } from './helpers.ts';

let server: Awaited<ReturnType<typeof startServer>> | null = null;
afterEach(async () => {
  await server?.cleanup();
  server = null;
});

async function boot(opts: Parameters<typeof startServer>[0] = {}) {
  server = await startServer(opts);
  return { s: server, api: new HttpTransport(server.url, opts.token) };
}

describe('vault over HTTP', () => {
  it('R-VLT-01: a pushed document is a plain Markdown file on disk', async () => {
    const { s, api } = await boot();
    const [res] = await api.push({ device: 'pixel', items: [{ path: 'notes/Hi.md', baseRev: null, text: '# Hi\n' }] });
    expect(res?.status).toBe('applied');
    expect(readFileSync(join(s.dataDir, 'vault/notes/Hi.md'), 'utf8')).toBe('# Hi\n');
    const doc = await api.doc('notes/Hi.md');
    expect(doc.text).toBe('# Hi\n');
    expect(doc.meta.hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('R-VLT-02: rejects paths that escape the vault and normalises separators', async () => {
    const { api } = await boot();
    await expect(api.push({ device: 'x', items: [{ path: '../etc/passwd.md', baseRev: null, text: 'x' }] })).rejects.toMatchObject({ status: 400 });
    const [res] = await api.push({ device: 'x', items: [{ path: 'notes\\Daily.md', baseRev: null, text: 'x' }] });
    expect(res?.path).toBe('notes/Daily.md');
  });

  it('R-VLT-03 / R-VLT-06: history lists revisions newest first and old revisions stay readable', async () => {
    const { api } = await boot();
    const [r1] = await api.push({ device: 'x', items: [{ path: 'a.md', baseRev: null, text: 'one' }] });
    const [r2] = await api.push({ device: 'x', items: [{ path: 'a.md', baseRev: r1!.meta.rev, text: 'two' }] });
    const history = await api.history('a.md');
    expect(history.map((h) => h.rev)).toEqual([r2!.meta.rev, r1!.meta.rev]);
    const old = await api.doc('a.md', r1!.meta.rev);
    const [restored] = await api.push({ device: 'x', items: [{ path: 'a.md', baseRev: r2!.meta.rev, text: old.text }] });
    expect(restored?.status).toBe('applied');
    expect((await api.history('a.md')).length).toBe(3);
    expect((await api.doc('a.md')).text).toBe('one');
  });

  it('R-VLT-04: deleting removes the file but keeps history', async () => {
    const { s, api } = await boot();
    const [r1] = await api.push({ device: 'x', items: [{ path: 'gone.md', baseRev: null, text: 'bye' }] });
    await api.push({ device: 'x', items: [{ path: 'gone.md', baseRev: r1!.meta.rev, text: null }] });
    expect(existsSync(join(s.dataDir, 'vault/gone.md'))).toBe(false);
    expect((await api.history('gone.md')).length).toBe(2);
    expect((await api.changes(0)).changes.find((c) => c.path === 'gone.md')?.deleted).toBe(true);
  });

  it('R-VLT-05: edits made by another program are committed from device "disk"', async () => {
    const { s, api } = await boot();
    await api.push({ device: 'x', items: [{ path: 'ideas.md', baseRev: null, text: 'v1\n' }] });
    writeFileSync(join(s.dataDir, 'vault/ideas.md'), 'v1\nedited in obsidian\n');
    const doc = await waitFor(async () => {
      const d = await api.doc('ideas.md');
      return d.meta.device === 'disk' ? d : null;
    });
    expect(doc.text).toBe('v1\nedited in obsidian\n');
  });

  it('R-VLT-05: files present at startup are imported', async () => {
    const first = await startServer();
    const dataDir = first.dataDir;
    await first.stop();
    writeFileSync(join(dataDir, 'vault/imported.md'), '# Imported\n');
    const { api } = await boot({ dataDir });
    expect((await api.doc('imported.md')).text).toBe('# Imported\n');
  });

  it('R-PLT-04: requires the token when configured', async () => {
    const { s } = await boot({ token: 's3cret' });
    expect((await fetch(`${s.url}/api/docs`)).status).toBe(401);
    expect((await fetch(`${s.url}/api/health`)).status).toBe(200);
    const ok = await fetch(`${s.url}/api/docs`, { headers: { authorization: 'Bearer s3cret' } });
    expect(ok.status).toBe(200);
  });

  it('R-LIV-04: announces commits on the event stream', async () => {
    const { s, api } = await boot();
    const ctrl = new AbortController();
    const res = await fetch(`${s.url}/api/events`, { signal: ctrl.signal });
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    await api.push({ device: 'pixel', items: [{ path: 'e.md', baseRev: null, text: 'x' }] });
    while (!buf.includes('"type":"commit"')) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value);
    }
    ctrl.abort();
    expect(buf).toContain('"path":"e.md"');
    expect(buf).toContain('"device":"pixel"');
  });

  it('serves conflicts over HTTP and resolves them', async () => {
    const { api } = await boot();
    const [r1] = await api.push({ device: 'a', items: [{ path: 'c.md', baseRev: null, text: 'x = 1\n' }] });
    await api.push({ device: 'a', items: [{ path: 'c.md', baseRev: r1!.meta.rev, text: 'x = 2\n' }] });
    const [r3] = await api.push({ device: 'b', items: [{ path: 'c.md', baseRev: r1!.meta.rev, text: 'x = 3\n' }] });
    expect(r3?.status).toBe('conflict');
    const open = await api.conflicts('open');
    expect(open).toHaveLength(1);
    await api.resolve(open[0]!.id, { device: 'b', choices: { h1: 'incoming' } });
    expect((await api.doc('c.md')).text).toBe('x = 3\n');
    expect(await api.conflicts('open')).toEqual([]);
  });
});
