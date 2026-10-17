import { expect } from '@playwright/test';
import type { SystemDevice } from '../support/system-device.ts';
import { Then, When } from '../support/world.ts';

const PATHS = ['a.md', 'b.md', 'notes/c.md', 'notes/d.md'];
const WORDS = ['alpha', 'beta', 'gamma', 'delta', 'omega', 'kappa'];

/** Small deterministic PRNG (mulberry32) so a failing seed replays exactly. */
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

When(
  '{int} devices make {int} random edits while going on and offline, with seed {int}',
  async ({ world }, count: number, steps: number, seed: number) => {
    for (let i = 0; i < count; i++) await world.addDevice(`sim-${i}`);
    const devices = [...world.devices.values()] as SystemDevice[];
    const rand = rng(seed);
    const pick = <T>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)]!;
    const offline = new Set<string>();

    for (let step = 0; step < steps; step++) {
      const d = pick(devices);
      const path = pick(PATHS);
      const op = rand();
      const cur = await d.read(path);
      if (op < 0.35) {
        const lines = (cur ?? '').split('\n');
        lines[Math.floor(rand() * lines.length)] = `${pick(WORDS)} ${pick(WORDS)}`;
        await d.setText(path, lines.join('\n'));
      } else if (op < 0.6) {
        await d.setText(path, `${cur ?? ''}${pick(WORDS)}\n`);
      } else if (op < 0.68) {
        await d.remove(path);
      } else if (op < 0.75) {
        if (offline.has(d.name)) {
          offline.delete(d.name);
          await d.comeOnline();
        } else {
          offline.add(d.name);
          await d.goOffline();
        }
      } else if (!offline.has(d.name)) {
        await d.sync();
      }
    }
    for (const d of devices) if (offline.has(d.name)) await d.comeOnline();
  },
);

Then('every device matches the cloud server', async ({ world }) => {
  const observer = world.observer().transport;
  const heads = new Map<string, string>();
  for (const path of PATHS) {
    const head = await observer.doc(path).catch(() => null);
    if (head?.text != null) heads.set(path, head.text);
  }
  for (const device of world.devices.values()) {
    const local = new Map<string, string>();
    for (const path of PATHS) {
      const t = await device.read(path);
      if (t !== undefined) local.set(path, t);
    }
    expect(local, `documents on ${device.name}`).toEqual(heads);
  }
});

Then('the run produced at least one review item', async ({ world }) => {
  expect((await world.observer().transport.conflicts()).length).toBeGreaterThan(0);
});
