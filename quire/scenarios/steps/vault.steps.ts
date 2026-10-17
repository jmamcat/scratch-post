import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect } from '@playwright/test';
import { Then, When, text } from '../support/world.ts';

Then('the vault folder has {string} reading {string}', async ({ world }, path: string, body: string) => {
  expect(readFileSync(join(world.requireCloud().vaultDir, path), 'utf8')).toBe(text(body));
});

Then('the vault folder has no {string}', async ({ world }, path: string) => {
  expect(existsSync(join(world.requireCloud().vaultDir, path))).toBe(false);
});

When('another program writes {string} to {string} in the vault folder', async ({ world }, body: string, path: string) => {
  writeFileSync(join(world.requireCloud().vaultDir, path), text(body));
});

Then('the history of {string} lists {int} revisions, newest first', async ({ world }, path: string, n: number) => {
  const history = await world.observer().transport.history(path);
  expect(history).toHaveLength(n);
  const revs = history.map((h) => h.rev);
  expect([...revs].sort((a, b) => b - a)).toEqual(revs);
});

Then('the history of {string} on {string} lists {int} revisions', async ({ world }, path: string, node: string, n: number) => {
  const res = await fetch(`${world.server(node).url}/api/history?${new URLSearchParams({ path })}`);
  expect(res.ok, `no history of ${path} on ${node}`).toBe(true);
  expect(await res.json()).toHaveLength(n);
});

When('{string} restores the oldest revision of {string}', async ({ world }, d: string, path: string) => {
  const device = world.device(d);
  const transport = world.observer().transport;
  const history = await transport.history(path);
  const oldest = history[history.length - 1]!;
  const { text: old } = await transport.doc(path, oldest.rev);
  await device.setText(path, old ?? '');
  await device.sync();
});

async function listNotes(url: string, token?: string): Promise<number> {
  const res = await fetch(`${url}/api/docs`, token ? { headers: { authorization: `Bearer ${token}` } } : {});
  return res.status;
}

Then('a request for the note list without a token is refused', async ({ world }) => {
  expect(await listNotes(world.requireCloud().url)).toBe(401);
});

Then('a request for the note list with the token succeeds', async ({ world }) => {
  expect(await listNotes(world.requireCloud().url, world.token)).toBe(200);
});

Then('the health check without a token succeeds', async ({ world }) => {
  expect((await fetch(`${world.requireCloud().url}/api/health`)).status).toBe(200);
});
