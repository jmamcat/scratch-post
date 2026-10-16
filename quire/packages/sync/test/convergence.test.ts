import { describe, expect, it } from 'vitest';
import { setup } from './helpers.ts';

/** Small deterministic PRNG so failures reproduce. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PATHS = ['a.md', 'b.md', 'notes/c.md', 'notes/d.md'];
const WORDS = ['alpha', 'beta', 'gamma', 'delta', 'omega', 'kappa'];

describe('R-SYN-04 convergence', () => {
  for (const seed of [1, 2, 3, 42, 1337]) {
    it(`three devices converge after random offline edits (seed ${seed})`, async () => {
      const rand = rng(seed);
      const pick = <T>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)]!;
      const { device, server } = setup();
      const devices = [device('d0'), device('d1'), device('d2')];

      for (let step = 0; step < 200; step++) {
        const d = pick(devices);
        const path = pick(PATHS);
        const op = rand();
        const cur = await d.text(path);
        if (op < 0.35) {
          const lines = (cur ?? '').split('\n');
          lines[Math.floor(rand() * lines.length)] = `${pick(WORDS)} ${pick(WORDS)}`;
          await d.client.write(path, lines.join('\n'));
        } else if (op < 0.6) {
          await d.client.write(path, `${cur ?? ''}${pick(WORDS)}\n`);
        } else if (op < 0.68) {
          await d.client.remove(path);
        } else if (op < 0.75) {
          if (rand() < 0.5) d.offline();
          else d.online();
        } else {
          await d.client.sync();
        }
      }

      for (const d of devices) d.online();
      for (let round = 0; round < 2; round++) {
        for (const d of devices) {
          const r = await d.client.sync();
          expect(r.error).toBeUndefined();
        }
      }

      const heads = new Map<string, string>();
      for (const meta of server.store.heads()) {
        if (!meta.deleted) heads.set(meta.path, server.store.text(meta.rev)!);
      }
      for (const d of devices) {
        const docs = await d.client.store.all();
        const local = new Map(docs.filter((x) => !x.deleted).map((x) => [x.path, x.text]));
        expect(local).toEqual(heads);
      }

      // The run must actually exercise collisions, or it proves nothing.
      expect(server.store.listConflicts().length).toBeGreaterThan(0);
      for (const c of server.store.listConflicts()) {
        for (const s of c.segments) {
          if (s.type === 'hunk') expect(typeof s.hunk.incoming).toBe('string');
        }
      }
    });
  }
});
