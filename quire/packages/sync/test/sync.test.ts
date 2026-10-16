import { describe, expect, it } from 'vitest';
import { isDirty } from '../src/index.ts';
import { setup } from './helpers.ts';

describe('R-SYN-01 offline editing', () => {
  it('saves edits locally while offline and syncs them later', async () => {
    const { device, headText } = setup();
    const p = device('pixel');
    await p.client.write('a.md', 'one\n');
    await p.client.sync();
    p.offline();
    await p.client.write('a.md', 'two\n');
    const report = await p.client.sync();
    expect(report.error).toBe('offline');
    expect(await p.text('a.md')).toBe('two\n');
    expect(isDirty((await p.client.store.get('a.md'))!)).toBe(true);
    p.online();
    await p.client.sync();
    expect(await headText('a.md')).toBe('two\n');
    expect(isDirty((await p.client.store.get('a.md'))!)).toBe(false);
  });
});

describe('R-SYN-02 / R-SYN-08 push and pull', () => {
  it('fast-forwards and other devices pull the change', async () => {
    const { device } = setup();
    const a = device('a');
    const b = device('b');
    await a.client.write('n.md', 'hello\n');
    expect((await a.client.sync()).pushed).toBe(1);
    const r = await b.client.sync();
    expect(r.pulled).toBe(1);
    expect(await b.text('n.md')).toBe('hello\n');
  });

  it('rejects paths that escape the vault', async () => {
    const { server } = setup();
    await expect(server.push({ device: 'x', items: [{ path: '../etc/passwd.md', baseRev: null, text: 'x' }] })).rejects.toMatchObject({ status: 400 });
  });
});

describe('R-SYN-03 merge on stale base', () => {
  it('ignores a base revision that belongs to another document', async () => {
    const { server } = setup();
    const [other] = await server.push({ device: 'a', items: [{ path: 'other.md', baseRev: null, text: 'unrelated\n' }] });
    await server.push({ device: 'a', items: [{ path: 'n.md', baseRev: null, text: 'head\n' }] });
    const [r] = await server.push({ device: 'b', items: [{ path: 'n.md', baseRev: other!.meta.rev, text: 'mine\n' }] });
    expect(r?.text).toBe('head\nmine\n');
  });

  it('keeps both offline edits to different paragraphs', async () => {
    const { device, headText, server } = setup();
    const p = device('pixel');
    const l = device('laptop');
    await p.client.write('a.md', 'para 1\n\npara 2\n\npara 3\n');
    await p.client.sync();
    await l.client.sync();
    p.offline();
    l.offline();
    await p.client.write('a.md', 'para 1 from pixel\n\npara 2\n\npara 3\n');
    await l.client.write('a.md', 'para 1\n\npara 2\n\npara 3 from laptop\n');
    p.online();
    await p.client.sync();
    l.online();
    await l.client.sync();
    await p.client.sync();
    const want = 'para 1 from pixel\n\npara 2\n\npara 3 from laptop\n';
    expect(await headText('a.md')).toBe(want);
    expect(await p.text('a.md')).toBe(want);
    expect(await l.text('a.md')).toBe(want);
    expect(server.store.listConflicts('open')).toEqual([]);
  });

  it('merges two independent creations of the same path without loss', async () => {
    const { device, headText } = setup();
    const a = device('a');
    const b = device('b');
    await a.client.write('2026-10-16.md', '- from a\n');
    await b.client.write('2026-10-16.md', '- from b\n');
    await a.client.sync();
    const r = await b.client.sync();
    expect(await headText('2026-10-16.md')).toBe('- from a\n- from b\n');
    expect(r.conflicts).toHaveLength(1);
  });
});

describe('R-SYN-05 / R-RVW conflicts', () => {
  async function trueConflict() {
    const ctx = setup();
    const a = ctx.device('a');
    const b = ctx.device('b');
    await a.client.write('c.md', 'x = 1\n\nkeep\n');
    await a.client.sync();
    await b.client.sync();
    await a.client.write('c.md', 'x = 2\n\nkeep\n');
    await b.client.write('c.md', 'x = 3\n\nkeep\n');
    await a.client.sync();
    const report = await b.client.sync();
    return { ...ctx, a, b, report };
  }

  it('commits provisional text and keeps both sides in an open record', async () => {
    const { server, report, headText, b } = await trueConflict();
    expect(report.conflicts).toEqual(['c1']);
    const c = server.store.getConflict('c1')!;
    expect(c).toMatchObject({ status: 'open', kind: 'content', current: { device: 'a' }, incoming: { device: 'b' } });
    const hunk = c.segments.find((s) => s.type === 'hunk');
    expect(hunk).toMatchObject({ hunk: { current: 'x = 2\n', incoming: 'x = 3\n' } });
    expect(await headText('c.md')).toBe('x = 2\n\nkeep\n');
    expect(await b.text('c.md')).toBe('x = 2\n\nkeep\n');
  });

  it('R-RVW-03: resolves with per-hunk choices', async () => {
    const { server, headText } = await trueConflict();
    await server.resolve('c1', { device: 'b', choices: { h1: 'incoming' } });
    expect(await headText('c.md')).toBe('x = 3\n\nkeep\n');
    expect(server.store.getConflict('c1')?.status).toBe('resolved');
  });

  it('R-RVW-04: resolution merges with edits made after the conflict', async () => {
    const { server, a, headText } = await trueConflict();
    await a.client.sync();
    await a.client.write('c.md', 'x = 2\n\nkeep\n\nlater edit\n');
    await a.client.sync();
    await server.resolve('c1', { device: 'b', choices: { h1: 'both' } });
    expect(await headText('c.md')).toBe('x = 2\nx = 3\n\nkeep\n\nlater edit\n');
  });

  it('R-RVW-06: review items can be dismissed, open ones cannot', async () => {
    const { server, device } = setup();
    const a = device('a');
    const b = device('b');
    await a.client.write('log.md', '# Log\n');
    await a.client.sync();
    await b.client.sync();
    await a.client.write('log.md', '# Log\n- a\n');
    await b.client.write('log.md', '# Log\n- b\n');
    await a.client.sync();
    const r = await b.client.sync();
    const id = r.conflicts[0]!;
    expect(server.store.getConflict(id)?.status).toBe('review');
    expect(server.dismiss(id).status).toBe('dismissed');
    expect(() => server.dismiss(id)).toThrow();
  });
});

describe('R-SYN-06 delete versus edit', () => {
  it('keeps the edit when the other side deleted, and lets a person confirm the delete', async () => {
    const { server, device, headText } = setup();
    const a = device('a');
    const b = device('b');
    await a.client.write('d.md', 'v1\n');
    await a.client.sync();
    await b.client.sync();
    await a.client.remove('d.md');
    await b.client.write('d.md', 'v2\n');
    await a.client.sync();
    const r = await b.client.sync();
    expect(await headText('d.md')).toBe('v2\n');
    const c = server.store.getConflict(r.conflicts[0]!)!;
    expect(c).toMatchObject({ kind: 'delete-edit', status: 'open', incoming: { deleted: false } });
    await a.client.sync();
    expect(await a.text('d.md')).toBe('v2\n');
    await server.resolve(c.id, { device: 'a', keep: 'delete' });
    expect(server.doc('d.md').meta.deleted).toBe(true);
  });

  it('keeps the head when a stale device deletes an edited note', async () => {
    const { server, device, headText } = setup();
    const a = device('a');
    const b = device('b');
    await a.client.write('d.md', 'v1\n');
    await a.client.sync();
    await b.client.sync();
    await a.client.write('d.md', 'v2\n');
    await a.client.sync();
    await b.client.remove('d.md');
    const r = await b.client.sync();
    expect(await headText('d.md')).toBe('v2\n');
    expect(server.store.getConflict(r.conflicts[0]!)).toMatchObject({ kind: 'delete-edit', incoming: { deleted: true } });
    expect(await b.text('d.md')).toBe('v2\n');
  });
});

describe('R-SYN-07 rebase during round trip', () => {
  it('keeps text typed while a push is in flight', async () => {
    const { server, device } = setup();
    const a = device('a');
    await a.client.write('r.md', 'one\n\ntwo\n');
    await a.client.sync();
    const other = device('other');
    await other.client.sync();
    await other.client.write('r.md', 'ONE\n\ntwo\n');
    await other.client.sync();

    await a.client.write('r.md', 'one\n\ntwo!\n');
    const pending = a.client.sync();
    await a.client.write('r.md', 'one\n\ntwo!\n\nthree\n');
    await pending;
    expect(await a.text('r.md')).toBe('ONE\n\ntwo!\n\nthree\n');
    await a.client.sync();
    expect(server.doc('r.md').text).toBe('ONE\n\ntwo!\n\nthree\n');
  });
});
