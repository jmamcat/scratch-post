import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';
import { expect } from '@playwright/test';
import type { ChangeSet } from '@quire/sync';
import { Given, Then, When, type World, eventually, text } from '../support/world.ts';

// ---- change 0003: backup bundles, verify and restore (R-BAK-05, R-BAK-06) ----

const serverDir = fileURLToPath(new URL('../../apps/server', import.meta.url));
const tsx = join(serverDir, 'node_modules/tsx/dist/cli.mjs');

/**
 * Bundle files as the server names them: `<seq>-<full|incremental>-<sha256>.bundle.gz`
 * (apps/server/src/backup/bundles/format.ts). Scenarios reach the server only as a process, so
 * the name and the content layout are read here directly.
 */
const BUNDLE = /^(\d{8})-(full|incremental)-[0-9a-f]{64}\.bundle\.gz$/;

function backupDir(world: World): string {
  const dir = world.requireCloud().env.QUIRE_BACKUP_DIR;
  if (!dir) throw new Error('the cloud server has no backup folder: start it with "a cloud server with a backup folder"');
  return dir;
}

function bundles(world: World): { name: string; kind: string }[] {
  return readdirSync(backupDir(world))
    .map((name) => ({ name, m: BUNDLE.exec(name) }))
    .filter((b) => b.m)
    .map((b) => ({ name: b.name, kind: b.m![2]! }))
    .sort((a, b) => (a.name < b.name ? -1 : 1));
}

interface ContentEntry {
  key: string;
  type: 'text' | 'blob';
  size: number;
}

/** The texts of a bundle's content table: header line, manifest line, then the entries' bytes. */
function bundleTexts(file: string): string[] {
  const raw = gunzipSync(readFileSync(file));
  const first = raw.indexOf(10);
  const second = raw.indexOf(10, first + 1);
  const manifest = JSON.parse(raw.subarray(first + 1, second).toString('utf8')) as { content: ContentEntry[] };
  const texts: string[] = [];
  let at = second + 1;
  for (const entry of manifest.content) {
    if (entry.type === 'text') texts.push(raw.subarray(at, at + entry.size).toString('utf8'));
    at += entry.size;
  }
  return texts;
}

/** Runs `quire <args>` against the cloud server's settings; returns the exit code and output. */
async function quire(world: World, args: string[]): Promise<{ code: number | null; output: string }> {
  const cloud = world.requireCloud();
  const child = spawn(process.execPath, [tsx, 'src/cli.ts', ...args], {
    cwd: serverDir,
    env: { ...process.env, QUIRE_CHANGESET_GAP_MS: '1000', NODE_NO_WARNINGS: '1', ...cloud.env, QUIRE_DATA_DIR: cloud.dataDir },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout.on('data', (d) => (output += d));
  child.stderr.on('data', (d) => (output += d));
  const code = await new Promise<number | null>((resolve) => child.once('exit', resolve));
  return { code, output };
}

Given('a cloud server with a backup folder', async ({ world }) => {
  // Its own temporary folder, outside the data folder: losing the data must not lose the backups.
  const dir = mkdtempSync(join(tmpdir(), 'quire-backup-'));
  world.cleanups.push(() => rmSync(dir, { recursive: true, force: true }));
  await world.startCloud(undefined, { QUIRE_BACKUP_DIR: dir });
});

Then(
  'within {int} seconds the backup folder holds a full bundle and at least {int} incremental bundles',
  async ({ world }, seconds: number, n: number) => {
    await eventually(
      seconds,
      async () => {
        const kinds = bundles(world).map((b) => b.kind);
        return kinds.includes('full') && kinds.filter((k) => k === 'incremental').length >= n;
      },
      `a full bundle and at least ${n} incremental bundles in ${backupDir(world)}`,
    );
  },
);

Then('the backup chain verifies', async ({ world }) => {
  const { code, output } = await quire(world, ['backup', 'verify', '--dir', backupDir(world)]);
  expect(code, output).toBe(0);
  expect(output.split('\n')[0]).toBe('ok');
});

Then('the backup chain does not verify', async ({ world }) => {
  const { code, output } = await quire(world, ['backup', 'verify', '--dir', backupDir(world)]);
  expect(code, output).toBe(1);
  expect(output).toContain('broken');
});

Then('within {int} seconds the backup bundles store the text {string} once', async ({ world }, seconds: number, body: string) => {
  const wanted = text(body);
  const count = () => bundles(world).flatMap((b) => bundleTexts(join(backupDir(world), b.name))).filter((t) => t === wanted).length;
  await eventually(seconds, async () => count() >= 1, `a backup bundle stores "${body}"`);
  expect(count(), `copies of "${body}" across the bundles`).toBe(1);
});

When('a byte of the newest backup bundle is changed', async ({ world }) => {
  const newest = bundles(world).at(-1);
  if (!newest) throw new Error('the backup folder holds no bundle');
  const file = join(backupDir(world), newest.name);
  const bytes = readFileSync(file);
  const at = Math.floor(bytes.length / 2);
  bytes[at] = bytes[at]! ^ 0xff;
  writeFileSync(file, bytes);
});

async function loseAndRestore(world: World, asOfFirstSet: boolean): Promise<void> {
  const cloud = world.requireCloud();
  const args = ['restore', backupDir(world), '--to', cloud.dataDir];
  if (asOfFirstSet) {
    const res = await fetch(`${cloud.url}/api/changesets?limit=500`, world.token ? { headers: { authorization: `Bearer ${world.token}` } } : {});
    const sets = (await res.json()) as ChangeSet[];
    const first = sets.at(-1);
    if (!first) throw new Error('the vault history has no change sets');
    args.push('--at', String(first.lastRev));
  }
  await cloud.stop();
  for (const name of readdirSync(cloud.dataDir)) rmSync(join(cloud.dataDir, name), { recursive: true, force: true });
  const { code, output } = await quire(world, args);
  if (code !== 0) throw new Error(`quire restore exited with ${code}:\n${output}`);
  // Same port: devices keep talking to the same address.
  await cloud.start();
}

When("the cloud server's data is lost and restored from the backup folder", async ({ world }) => {
  await loseAndRestore(world, false);
});

When("the cloud server's data is lost and restored from the backup folder as of the first change set", async ({ world }) => {
  await loseAndRestore(world, true);
});
