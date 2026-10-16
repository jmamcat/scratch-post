import type { Choice } from '@quire/core';
import type { Conflict } from '@quire/sync';
import { expect } from '@playwright/test';
import { BrowserDevice } from '../support/browser-device.ts';
import { SystemDevice } from '../support/system-device.ts';
import { Then, When, eventually, text, type World } from '../support/world.ts';

async function items(world: World, status: Conflict['status'], path?: string): Promise<Conflict[]> {
  const all = await world.observer().transport.conflicts(status);
  return path ? all.filter((c) => c.path === path) : all;
}

async function openItem(world: World, path: string): Promise<Conflict> {
  const [item] = await items(world, 'open', path);
  if (!item) throw new Error(`no open review item for ${path}`);
  return item;
}

function hunks(c: Conflict) {
  return c.segments.flatMap((s) => (s.type === 'hunk' ? [s.hunk] : []));
}

Then('the review inbox shows {int} open item(s)', async ({ world }, n: number) => {
  expect(await items(world, 'open')).toHaveLength(n);
});

Then('the review inbox shows {int} open item(s) for {string}', async ({ world }, n: number, path: string) => {
  expect(await items(world, 'open', path)).toHaveLength(n);
});

Then('the review inbox shows {int} item(s) under review', async ({ world }, n: number) => {
  expect(await items(world, 'review')).toHaveLength(n);
});

Then(
  'the open item for {string} shows {string} from {string} against {string} from {string}',
  async ({ world }, path: string, cur: string, curDevice: string, inc: string, incDevice: string) => {
    const item = await openItem(world, path);
    const [hunk] = hunks(item).filter((h) => h.auto === null);
    expect(hunk?.current).toBe(text(cur));
    expect(hunk?.incoming).toBe(text(inc));
    expect(item.current.device).toBe(curDevice);
    expect(item.incoming.device).toBe(incDevice);
  },
);

When('{string} resolves {string} keeping {string}', async ({ world }, d: string, path: string, choice: string) => {
  const item = await openItem(world, path);
  const choices: Record<string, Choice> = {};
  for (const h of hunks(item).filter((h) => h.auto === null)) choices[h.id] = choice as Choice;
  await world.device(d).resolve(item.id, { choices });
});

When(
  '{string} resolves {string} keeping {string} for change {int} and {string} for change {int}',
  async ({ world }, d: string, path: string, c1: string, n1: number, c2: string, n2: number) => {
    const item = await openItem(world, path);
    const open = hunks(item).filter((h) => h.auto === null);
    const choices: Record<string, Choice> = {};
    choices[open[n1 - 1]!.id] = c1 as Choice;
    choices[open[n2 - 1]!.id] = c2 as Choice;
    await world.device(d).resolve(item.id, { choices });
  },
);

When('{string} accepts the suggestion for {string}', async ({ world }, d: string, path: string) => {
  const [item] = await items(world, 'review', path);
  if (!item) throw new Error(`no review suggestion for ${path}`);
  await world.device(d).dismiss(item.id);
});

When('{string} confirms the deletion of {string}', async ({ world }, d: string, path: string) => {
  await world.device(d).resolve((await openItem(world, path)).id, { keep: 'delete' });
});

When('{string} keeps {string}', async ({ world }, d: string, path: string) => {
  await world.device(d).resolve((await openItem(world, path)).id, { keep: 'note' });
});

Then('the conflicts badge on {string} shows {int}', async ({ world }, d: string, n: number) => {
  const device = world.device(d);
  if (device instanceof BrowserDevice) await device.expectBadge(n);
  else expect((await device.conflicts()).filter((c) => c.status === 'open')).toHaveLength(n);
});

Then('{string} sees the banner {string}', async ({ world }, d: string, banner: string) => {
  const device = world.device(d);
  if (!(device instanceof BrowserDevice)) throw new Error('banners exist only in the app (@ui)');
  await device.expectBanner(banner);
});

Then('within {int} seconds {string} sees {string} reading {string}', async ({ world }, s: number, d: string, path: string, body: string) => {
  const device = world.device(d);
  await eventually(
    s,
    async () => {
      // A device not in the note's live room learns about changes by syncing, as the app does.
      if (device instanceof SystemDevice && !device.isLive(path)) await device.sync();
      return (await device.read(path)) === text(body);
    },
    `${d} sees ${path} reading ${body}`,
  );
});
