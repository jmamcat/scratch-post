import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { expect } from '@playwright/test';
import { type ChangeSet, hashText } from '@quire/sync';
import { Given, Then, When, type World, text } from '../support/world.ts';

const serverDir = fileURLToPath(new URL('../../apps/server', import.meta.url));

/** Schema version 1 as the first release created it (copied from apps/server/src/vault/schema.ts). */
const SCHEMA_V1 = `
  CREATE TABLE IF NOT EXISTS revisions (
    rev INTEGER PRIMARY KEY AUTOINCREMENT,
    path TEXT NOT NULL,
    hash TEXT NOT NULL,
    text TEXT,
    deleted INTEGER NOT NULL,
    device TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS revisions_path ON revisions (path, rev);
  CREATE TABLE IF NOT EXISTS heads (path TEXT PRIMARY KEY, rev INTEGER NOT NULL);
  CREATE INDEX IF NOT EXISTS heads_rev ON heads (rev);
  CREATE TABLE IF NOT EXISTS conflicts (
    id TEXT PRIMARY KEY,
    path TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    data TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL);
`;

/** The newest version the server's migration list declares; scenarios never import the server. */
function latestSchemaVersion(): number {
  const source = readFileSync(join(serverDir, 'src/vault/schema.ts'), 'utf8');
  const versions = [...source.matchAll(/\bversion:\s*(\d+)/g)].map((m) => Number(m[1]));
  if (!versions.length) throw new Error('no migrations found in apps/server/src/vault/schema.ts');
  return Math.max(...versions);
}

function prepareDataDir(world: World, fill: (db: DatabaseSync) => void): string {
  const dir = mkdtempSync(join(tmpdir(), 'quire-scenario-'));
  mkdirSync(join(dir, 'vault'), { recursive: true });
  const db = new DatabaseSync(join(dir, 'quire.db'));
  try {
    fill(db);
  } finally {
    db.close();
  }
  world.preparedDataDir = dir;
  world.cleanups.push(() => rmSync(dir, { recursive: true, force: true, maxRetries: 5 }));
  return dir;
}

function authHeaders(world: World): Record<string, string> {
  return world.token ? { authorization: `Bearer ${world.token}` } : {};
}

async function vaultHistory(world: World, limit = 50): Promise<ChangeSet[]> {
  const res = await fetch(`${world.requireCloud().url}/api/changesets?limit=${limit}`, { headers: authHeaders(world) });
  if (!res.ok) throw new Error(`GET /api/changesets: ${res.status} ${await res.text()}`);
  return (await res.json()) as ChangeSet[];
}

// ---- schema versions (R-BAK-01) ----

Given('a data folder from schema version 1 with {string} reading {string}', async ({ world }, path: string, body: string) => {
  const content = text(body);
  const hash = await hashText(content);
  const dir = prepareDataDir(world, (db) => {
    db.exec(SCHEMA_V1);
    const now = new Date().toISOString();
    const res = db
      .prepare('INSERT INTO revisions (path, hash, text, deleted, device, created_at) VALUES (?, ?, ?, 0, ?, ?)')
      .run(path, hash, content, 'laptop', now);
    db.prepare('INSERT INTO heads (path, rev) VALUES (?, ?)').run(path, Number(res.lastInsertRowid));
  });
  writeFileSync(join(dir, 'vault', path), content);
});

Given('a data folder from a newer schema version', async ({ world }) => {
  prepareDataDir(world, (db) => db.exec('PRAGMA user_version = 99'));
});

Then('the database has the latest schema version', async ({ world }) => {
  const db = new DatabaseSync(join(world.requireCloud().dataDir, 'quire.db'), { readOnly: true });
  try {
    const { user_version } = db.prepare('PRAGMA user_version').get() as { user_version: number };
    expect(user_version).toBe(latestSchemaVersion());
  } finally {
    db.close();
  }
});

// ---- change sets and restore (R-BAK-02, R-BAK-03) ----

Then('the vault history lists {int} change sets', async ({ world }, n: number) => {
  const sets = await vaultHistory(world);
  expect(sets.map((s) => `${s.id} ${s.device}: ${s.paths.join(', ')}`)).toHaveLength(n);
  expect(sets.map((s) => s.id)).toEqual([...sets.map((s) => s.id)].sort((a, b) => b - a));
});

Then('change set {int} of the vault history is by {string} and changed {string}', async ({ world }, n: number, d: string, list: string) => {
  const set = (await vaultHistory(world, n))[n - 1];
  expect(set, `change set ${n}`).toBeDefined();
  expect(set!.device).toBe(d);
  const expected = list.split(',').map((p) => p.trim()).filter(Boolean).sort();
  expect([...set!.paths].sort()).toEqual(expected);
});

When('{string} restores the vault to change set {int}', async ({ world }, d: string, n: number) => {
  world.device(d);
  const set = (await vaultHistory(world, n))[n - 1];
  if (!set) throw new Error(`the vault history has no change set ${n}`);
  const res = await fetch(`${world.requireCloud().url}/api/changesets/${set.id}/restore`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...authHeaders(world) },
    body: JSON.stringify({ device: d }),
  });
  if (!res.ok) throw new Error(`restore to change set ${set.id}: ${res.status} ${await res.text()}`);
});

Then('{string} is gone from {string}', async ({ world }, path: string, d: string) => {
  expect(await world.device(d).read(path)).toBeUndefined();
});

// ---- compaction (R-BAK-04) ----

Given('a cloud server that keeps every revision for {int} days', async ({ world }, days: number) => {
  await world.startCloud(undefined, { QUIRE_KEEP_ALL_DAYS: String(days) });
});

When('the cloud server compacts its history', async ({ world }) => {
  const cloud = world.requireCloud();
  const tsx = join(serverDir, 'node_modules/tsx/dist/cli.mjs');
  const child = spawn(process.execPath, [tsx, 'src/cli.ts', 'compact'], {
    cwd: serverDir,
    // The same settings the running server has, so the command sees the same change sets.
    env: { ...process.env, QUIRE_CHANGESET_GAP_MS: '1000', NODE_NO_WARNINGS: '1', ...cloud.env, QUIRE_DATA_DIR: cloud.dataDir },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout.on('data', (d) => (output += d));
  child.stderr.on('data', (d) => (output += d));
  const code = await new Promise<number | null>((resolve) => child.once('exit', resolve));
  if (code !== 0) throw new Error(`quire compact exited with ${code}:\n${output}`);
});
