import { HttpError } from '@quire/sync';
import { expect } from '@playwright/test';
import { Given, Then, When, eventually, text, type World } from '../support/world.ts';

async function everyoneSyncs(world: World): Promise<void> {
  for (let round = 0; round < 2; round++) {
    for (const d of world.devices.values()) await d.sync();
  }
}

async function headText(world: World, path: string, server = 'cloud'): Promise<string | null> {
  const node = world.server(server);
  const headers: Record<string, string> = server === 'cloud' && world.token ? { authorization: `Bearer ${world.token}` } : {};
  const res = await fetch(`${node.url}/api/doc?${new URLSearchParams({ path })}`, { headers });
  if (res.status === 404) return null;
  const body = (await res.json()) as { text: string | null; meta: { device: string } };
  return body.text;
}

async function headDevice(world: World, path: string): Promise<string | null> {
  const res = await world.observer().transport.doc(path).catch(() => null);
  return res?.meta.device ?? null;
}

// ---- edits ----

Given('{string} has {string} reading {string}', async ({ world }, d: string, path: string, body: string) => {
  const device = world.device(d);
  await device.setText(path, text(body));
  await device.sync();
});

Given('everyone has {string} reading {string}', async ({ world }, path: string, body: string) => {
  const [first] = world.devices.values();
  if (!first) throw new Error('no devices yet');
  await first.setText(path, text(body));
  await everyoneSyncs(world);
});

When('{string} sets {string} to {string}', async ({ world }, d: string, path: string, body: string) => {
  await world.device(d).setText(path, text(body));
});

When('{string} creates {string} reading {string}', async ({ world }, d: string, path: string, body: string) => {
  await world.device(d).setText(path, text(body));
});

When('{string} appends {string} to {string}', async ({ world }, d: string, body: string, path: string) => {
  await world.device(d).append(path, text(body));
});

When('{string} replaces {string} with {string} in {string}', async ({ world }, d: string, find: string, repl: string, path: string) => {
  await world.device(d).replace(path, text(find), text(repl));
});

When('{string} deletes {string}', async ({ world }, d: string, path: string) => {
  await world.device(d).remove(path);
});

When('{string} goes offline', async ({ world }, d: string) => {
  await world.device(d).goOffline();
});

When('{string} comes back online', async ({ world }, d: string) => {
  await world.device(d).comeOnline();
});

When('{string} syncs', async ({ world }, d: string) => {
  await world.device(d).sync();
});

When('everyone syncs', async ({ world }) => {
  await everyoneSyncs(world);
});

When('{string} keeps typing {string} at the end of {string} while syncing', async ({ world }, d: string, body: string, path: string) => {
  const device = world.systemDevice(d);
  const pending = device.client.sync();
  await device.append(path, text(body));
  await pending;
});

When('{string} tries to create {string}', async ({ world }, d: string, path: string) => {
  const device = world.systemDevice(d);
  world.lastError = null;
  world.lastResult = null;
  try {
    const [res] = await device.transport.push({ device: d, items: [{ path: text(path), baseRev: null, text: 'x' }] });
    world.lastResult = res ? { path: res.path } : null;
  } catch (e) {
    world.lastError = { message: String(e), ...(e instanceof HttpError ? { status: e.status } : {}) };
  }
});

Then('the request is rejected', async ({ world }) => {
  expect(world.lastError?.status).toBe(400);
});

Then('the note is stored as {string}', async ({ world }, path: string) => {
  expect(world.lastError).toBeNull();
  expect(world.lastResult?.path).toBe(path);
});

// ---- observations ----

Then('{string} on {string} reads {string}', async ({ world }, path: string, d: string, body: string) => {
  expect(await world.device(d).read(path)).toBe(text(body));
});

Then('{string} reads {string} on every device', async ({ world }, path: string, body: string) => {
  for (const device of world.devices.values()) {
    expect(await device.read(path), `${path} on ${device.name}`).toBe(text(body));
  }
  expect(await headText(world, path), `${path} on the cloud server`).toBe(text(body));
});

Then('the cloud server has {string} reading {string}', async ({ world }, path: string, body: string) => {
  expect(await headText(world, path)).toBe(text(body));
});

Then('the cloud server has no {string}', async ({ world }, path: string) => {
  expect(await headText(world, path)).toBeNull();
});

Then('within {int} seconds the cloud server has {string} reading {string}', async ({ world }, s: number, path: string, body: string) => {
  await eventually(s, async () => (await headText(world, path)) === text(body), `cloud server has ${path} reading ${body}`);
});

Then('within {int} seconds the cloud server has {string} changed by device {string}', async ({ world }, s: number, path: string, dev: string) => {
  await eventually(s, async () => (await headDevice(world, path)) === dev, `${path} last changed by ${dev}`);
});

Then('within {int} seconds {string} has {string} reading {string}', async ({ world }, s: number, node: string, path: string, body: string) => {
  await eventually(s, async () => (await headText(world, path, node)) === text(body), `${node} has ${path} reading ${body}`);
});

Then('{string} shows {string} as pending sync', async ({ world }, d: string, path: string) => {
  expect(await world.device(d).isPending(path)).toBe(true);
});

Then('{string} shows {string} as synced', async ({ world }, d: string, path: string) => {
  expect(await world.device(d).isPending(path)).toBe(false);
});

