import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Config } from '../src/config.ts';
import { type Running, start } from '../src/main.ts';

export async function startServer(overrides: Partial<Config> = {}): Promise<Running & { dataDir: string; cleanup(): Promise<void> }> {
  const dataDir = overrides.dataDir ?? mkdtempSync(join(tmpdir(), 'quire-test-'));
  const running = await start({
    dataDir,
    port: 0,
    mode: 'cloud',
    device: 'test-server',
    webDist: join(dataDir, 'no-web'),
    watch: true,
    ...overrides,
  });
  return {
    ...running,
    dataDir,
    async cleanup() {
      await running.stop();
      rmSync(dataDir, { recursive: true, force: true });
    },
  };
}

export async function waitFor<T>(fn: () => T | Promise<T>, timeoutMs = 5000, stepMs = 50): Promise<NonNullable<T>> {
  const until = Date.now() + timeoutMs;
  let last: unknown;
  while (Date.now() < until) {
    try {
      const v = await fn();
      if (v) return v as NonNullable<T>;
    } catch (e) {
      last = e;
    }
    await new Promise((r) => setTimeout(r, stepMs));
  }
  throw new Error(`timed out${last ? `: ${String(last)}` : ''}`);
}
