import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { Browser } from '@playwright/test';
import { createBdd, test as base } from 'playwright-bdd';
import type { Device } from './device.ts';
import { ServerProcess } from './servers.ts';
import { SystemDevice } from './system-device.ts';

/** Everything one scenario has started. Every scenario gets a fresh World. */
export class World {
  cloud: ServerProcess | null = null;
  token: string | undefined;
  readonly nodes = new Map<string, ServerProcess>();
  readonly devices = new Map<string, Device>();
  /** Files to place in the cloud server's vault folder before it starts. */
  readonly preload = new Map<string, string>();
  lastError: { status?: number; message: string } | null = null;
  lastResult: { path: string } | null = null;
  readonly cleanups: (() => Promise<void> | void)[] = [];

  constructor(
    readonly layer: 'system' | 'ui',
    private readonly browser: () => Promise<Browser>,
  ) {}

  /** A data folder prepared by a step (`a data folder from schema version 1 ...`), used by the next start. */
  preparedDataDir: string | undefined;
  /** Output of the last start that failed, for `the cloud server fails to start ...`. */
  failedStart: string | undefined;

  async startCloud(token?: string, env: Record<string, string> = {}): Promise<ServerProcess> {
    this.token = token;
    const cloud = new ServerProcess({
      device: 'cloud',
      env: { ...(token ? { QUIRE_TOKEN: token } : {}), ...env },
      ...(this.preparedDataDir ? { dataDir: this.preparedDataDir } : {}),
    });
    for (const [path, text] of this.preload) {
      const file = join(cloud.vaultDir, path);
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, text);
    }
    await cloud.start();
    this.cloud = cloud;
    return cloud;
  }

  requireCloud(): ServerProcess {
    if (!this.cloud) throw new Error('scenario has no cloud server: start with "a cloud server"');
    return this.cloud;
  }

  async startLocalNode(name: string): Promise<ServerProcess> {
    const cloud = this.requireCloud();
    const node = new ServerProcess({
      device: name,
      env: {
        QUIRE_MODE: 'local',
        QUIRE_UPSTREAM: cloud.url,
        QUIRE_REPLICATE_MS: '200',
        QUIRE_REPLICATE_MAX_BACKOFF_MS: '1000',
        ...(this.token ? { QUIRE_UPSTREAM_TOKEN: this.token } : {}),
      },
    });
    await node.start();
    this.nodes.set(name, node);
    return node;
  }

  server(name: string): ServerProcess {
    const node = name === 'cloud' ? this.cloud : this.nodes.get(name);
    if (!node) throw new Error(`no server named "${name}"`);
    return node;
  }

  /** `token` overrides the server's token (devices "using the token", R-ACC-02). */
  async addDevice(name: string, serverName = 'cloud', tokenOverride?: string): Promise<Device> {
    const server = this.server(serverName);
    const token = tokenOverride ?? (serverName === 'cloud' ? this.token : undefined);
    const device: Device =
      this.layer === 'ui'
        ? await (await import('./browser-device.ts')).BrowserDevice.open(name, server.url, token, await this.browser())
        : new SystemDevice(name, server.url, token);
    this.devices.set(name, device);
    await device.sync();
    return device;
  }

  device(name: string): Device {
    const d = this.devices.get(name);
    if (!d) throw new Error(`no device named "${name}"`);
    return d;
  }

  systemDevice(name: string): SystemDevice {
    const d = this.device(name);
    if (!(d instanceof SystemDevice)) throw new Error(`"${name}" is not a system-level device`);
    return d;
  }

  /** Any device's view of the cloud server; used for observations that name no device. */
  observer(): SystemDevice {
    return new SystemDevice('observer', this.requireCloud().url, this.token);
  }

  async dispose(): Promise<void> {
    for (const fn of this.cleanups.reverse()) await fn();
    for (const d of this.devices.values()) await d.close().catch(() => undefined);
    for (const n of this.nodes.values()) await n.stop();
    await this.cloud?.stop();
    for (const s of [this.cloud, ...this.nodes.values()]) if (s) rmSync(s.dataDir, { recursive: true, force: true });
  }
}

export const test = base.extend<{ world: World }>({
  world: async ({ $tags, browser }, use) => {
    const world = new World($tags.includes('@ui') ? 'ui' : 'system', async () => browser);
    await use(world);
    await world.dispose();
  },
});

export const { Given, When, Then } = createBdd(test);

/** Quoted step values use \n for new lines. */
export const text = (s: string) => s.replace(/\\n/g, '\n').replace(/\\t/g, '\t');

export async function eventually<T>(seconds: number, fn: () => Promise<T | false | null | undefined>, what: string): Promise<T> {
  const until = Date.now() + seconds * 1000;
  let last: unknown;
  while (Date.now() < until) {
    try {
      const v = await fn();
      if (v) return v;
    } catch (e) {
      last = e;
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`within ${seconds}s: ${what}${last ? ` (last error: ${String(last)})` : ''}`);
}
