import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { expect } from '@playwright/test';
import { FileSync, MemoryBlobCache, MemoryFileStore } from '@quire/sync';
import { SystemDevice } from '../support/system-device.ts';
import { Then, When, type World, eventually } from '../support/world.ts';

/** `n` pseudo-random bytes from a small seeded generator (mulberry32): the same seed gives the same bytes. */
export function bytesFromSeed(n: number, seed: number): Uint8Array {
  const out = new Uint8Array(n);
  let a = seed >>> 0;
  for (let i = 0; i < n; i++) {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    out[i] = ((t ^ (t >>> 14)) >>> 0) & 0xff;
  }
  return out;
}

const attached = new WeakMap<SystemDevice, FileSync>();

/**
 * The device's attachment engine, created on first use with memory stores and wired into its
 * sync client. The first file step attaches every system device in the scenario, so pulls
 * that happen before a device is named still reach its engine; a device attached late
 * re-reads the change feed from the start to learn the files it missed.
 */
export async function filesOf(world: World, name: string): Promise<FileSync> {
  for (const d of world.devices.values()) {
    if (!(d instanceof SystemDevice) || attached.has(d)) continue;
    const files = new FileSync({ transport: d.transport, store: new MemoryFileStore(), cache: new MemoryBlobCache(), device: d.name });
    d.client.files = files;
    attached.set(d, files);
    await d.client.store.setCursor(0);
  }
  const files = attached.get(world.systemDevice(name));
  if (!files) throw new Error(`no file engine for ${name}`);
  return files;
}

const same = (a: Uint8Array | null | undefined, b: Uint8Array) => !!a && Buffer.compare(Buffer.from(a), Buffer.from(b)) === 0;

When('{string} adds the file {string} with {int} bytes from seed {int}', async ({ world }, d: string, path: string, n: number, seed: number) => {
  await (await filesOf(world, d)).add(path, bytesFromSeed(n, seed));
});

Then('{string} has the file {string} with {int} bytes from seed {int}', async ({ world }, d: string, path: string, n: number, seed: number) => {
  const bytes = await (await filesOf(world, d)).read(path);
  expect(bytes, `${d} has no bytes for ${path}`).not.toBeNull();
  expect(bytes!.length).toBe(n);
  expect(same(bytes, bytesFromSeed(n, seed)), `${path} on ${d} differs from the bytes of seed ${seed}`).toBe(true);
});

Then('the vault folder has the file {string} with {int} bytes from seed {int}', async ({ world }, path: string, n: number, seed: number) => {
  const file = join(world.requireCloud().vaultDir, path);
  expect(existsSync(file), `the vault folder has no ${path}`).toBe(true);
  expect(same(readFileSync(file), bytesFromSeed(n, seed))).toBe(true);
});

function* walk(dir: string): Generator<string> {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) yield* walk(full);
    else yield full;
  }
}

Then('the cloud server stores {int} copy of {int} bytes from seed {int}', async ({ world }, copies: number, n: number, seed: number) => {
  const want = bytesFromSeed(n, seed);
  const found = [...walk(join(world.requireCloud().dataDir, 'blobs'))].filter((f) => same(readFileSync(f), want));
  expect(found).toHaveLength(copies);
});

Then('within {int} seconds {string} has the file {string}', async ({ world }, seconds: number, node: string, path: string) => {
  const url = world.server(node).url;
  await eventually(seconds, async () => (await fetch(`${url}/api/files?${new URLSearchParams({ path })}`)).ok, `${node} has the file ${path}`);
});

Then('within {int} seconds the cloud server has the file {string}', async ({ world }, seconds: number, path: string) => {
  await eventually(
    seconds,
    async () => {
      const res = await fetch(`${world.requireCloud().url}/api/files?${new URLSearchParams({ path })}`, {
        headers: world.token ? { authorization: `Bearer ${world.token}` } : {},
      });
      return res.ok;
    },
    `the cloud server has the file ${path}`,
  );
});
