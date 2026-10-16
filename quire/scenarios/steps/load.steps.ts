import { expect } from '@playwright/test';
import { type LoadResult, divergence, percentile, runLoad, sharedNotes, summary } from '../support/load.ts';
import { Given, Then, When, type World } from '../support/world.ts';

// ---- change 0003: load of 32 devices (R-OPS-05) ----

const runs = new WeakMap<World, LoadResult>();

function lastRun(world: World): LoadResult {
  const r = runs.get(world);
  if (!r) throw new Error('no load has run: start with "every device makes ... edits across ... shared notes ..."');
  return r;
}

Given('{int} devices', async ({ world }, count: number) => {
  for (let i = 0; i < count; i++) await world.addDevice(`load-${String(i).padStart(2, '0')}`);
});

When(
  'every device makes {int} edits across {int} shared notes while {int} of them type in {string}, with seed {int}',
  async ({ world }, edits: number, notes: number, liveCount: number, livePath: string, seed: number) => {
    const devices = [...world.devices.keys()].map((name) => world.systemDevice(name));
    const observer = world.observer();
    const result = await runLoad(devices, observer, { edits, notes: sharedNotes(notes), livePath, liveCount, seed });
    runs.set(world, result);
    console.log(summary(result));
    expect(result.pushes.length, 'pushes recorded').toBeGreaterThanOrEqual(devices.length * edits);
    // "every device matches the cloud server" compares the simulation's notes; this covers all of them.
    expect(await divergence(devices, observer), 'notes that differ from the cloud server').toEqual([]);
  },
);

Then('the {int}th percentile push took under {int} ms', async ({ world }, p: number, ms: number) => {
  const r = lastRun(world);
  expect(percentile(r.pushes, p), summary(r)).toBeLessThan(ms);
});

Then('no request failed', async ({ world }) => {
  expect(lastRun(world).failures).toEqual([]);
});
