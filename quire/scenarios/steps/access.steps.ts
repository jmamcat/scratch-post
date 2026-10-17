import { spawn } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect } from '@playwright/test';
import { HttpError } from '@quire/sync';
import { BrowserDevice } from '../support/browser-device.ts';
import { Given, Then, When, type World, eventually } from '../support/world.ts';

const serverDir = fileURLToPath(new URL('../../apps/server', import.meta.url));
const tsx = join(serverDir, 'node_modules/.bin/tsx');

/** `quire tokens ...` against the cloud server's data folder, as the owner would run it. */
async function tokensCli(world: World, args: string[]): Promise<{ code: number; output: string }> {
  const child = spawn(tsx, ['src/cli.ts', 'tokens', ...args], {
    cwd: serverDir,
    env: { ...process.env, QUIRE_DATA_DIR: world.requireCloud().dataDir, NODE_NO_WARNINGS: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout.on('data', (d) => (output += d));
  child.stderr.on('data', (d) => (output += d));
  const code = await new Promise<number>((resolve) => child.once('exit', (c) => resolve(c ?? -1)));
  return { code, output };
}

async function tokensOk(world: World, args: string[]): Promise<void> {
  const { code, output } = await tokensCli(world, args);
  expect(code, `quire tokens ${args.join(' ')}:\n${output}`).toBe(0);
}

const noteList = (world: World, init: RequestInit = {}, query = '') => fetch(`${world.requireCloud().url}/api/docs${query}`, init);
const withToken = (token: string): RequestInit => ({ headers: { authorization: `Bearer ${token}` } });

// ---- named tokens (R-ACC-02) ----

Given('the token {string} is added as {string}', async ({ world }, token: string, name: string) => {
  await tokensOk(world, ['add', name, '--token', token]);
});

When('the token {string} is revoked', async ({ world }, name: string) => {
  await tokensOk(world, ['revoke', name]);
});

Given('{int} tokens are added', async ({ world }, n: number) => {
  await tokensOk(world, ['add', ...Array.from({ length: n }, (_, i) => `device-${i + 1}`)]);
});

Then('adding the token {string} as {string} is refused', async ({ world }, token: string, name: string) => {
  const { code } = await tokensCli(world, ['add', name, '--token', token]);
  expect(code).not.toBe(0);
  expect((await noteList(world, withToken(token))).status).toBe(401);
});

Then('a request for the note list with the token {string} succeeds', async ({ world }, token: string) => {
  expect((await noteList(world, withToken(token))).status).toBe(200);
});

Then('a request for the note list with the token {string} is refused', async ({ world }, token: string) => {
  expect((await noteList(world, withToken(token))).status).toBe(401);
});

Then("the cloud server's data folder does not contain {string}", async ({ world }, secret: string) => {
  const needle = Buffer.from(secret);
  const files = readdirSync(world.requireCloud().dataDir, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => join(e.parentPath, e.name));
  expect(files.length).toBeGreaterThan(0);
  for (const file of files) expect(readFileSync(file).includes(needle), `${file} holds the token`).toBe(false);
});

Then('within {int} seconds {string} has lost its live connection', async ({ world }, s: number, d: string) => {
  const device = world.systemDevice(d);
  expect(device.livePaths().length).toBeGreaterThan(0);
  await eventually(s, async () => device.livePaths().every((p) => !device.isLive(p)), `${d} lost its live connection`);
});

// ---- tokens only in headers, tickets for streams (R-ACC-03, R-ACC-04) ----

Then('a request for the note list with the token in the URL is refused', async ({ world }) => {
  const res = await noteList(world, {}, `?${new URLSearchParams({ token: world.token ?? '' })}`);
  expect(res.status).toBe(401);
});

Then('a ticket opens the event stream once and is refused the second time', async ({ world }) => {
  const url = world.requireCloud().url;
  const res = await fetch(`${url}/api/tickets`, { method: 'POST', ...withToken(world.token ?? '') });
  expect(res.status).toBe(200);
  const { ticket, expiresAt } = (await res.json()) as { ticket: string; expiresAt: string };
  expect(Date.parse(expiresAt)).toBeGreaterThan(Date.now());
  const open = async () => {
    const ctrl = new AbortController();
    const r = await fetch(`${url}/api/events?${new URLSearchParams({ ticket })}`, { signal: ctrl.signal });
    ctrl.abort();
    return r.status;
  };
  expect(await open()).toBe(200);
  expect(await open()).toBe(401);
});

Then('no request from {string} carries {string} in its URL', async ({ world }, d: string, secret: string) => {
  const device = world.device(d);
  if (!(device instanceof BrowserDevice)) throw new Error(`"${d}" is not a browser device`);
  const forms = [secret, encodeURIComponent(secret), new URLSearchParams({ t: secret }).toString().slice(2)];
  expect(device.requestUrls.length).toBeGreaterThan(0);
  expect(device.requestUrls.some((u) => u.includes('/live'))).toBe(true);
  for (const u of device.requestUrls) for (const f of forms) expect(u, 'a request URL holds the token').not.toContain(f);
});

// ---- origins and headers (R-ACC-05) ----

Given('a cloud server that allows the origin {string}', async ({ world }, origin: string) => {
  await world.startCloud(undefined, { QUIRE_ALLOWED_ORIGINS: origin });
});

async function preflight(world: World, origin: string): Promise<string | null> {
  const res = await fetch(`${world.requireCloud().url}/api/docs`, {
    method: 'OPTIONS',
    headers: { origin, 'access-control-request-method': 'GET', 'access-control-request-headers': 'authorization' },
  });
  expect(res.status).toBeLessThan(300);
  return res.headers.get('access-control-allow-origin');
}

Then('a request from the origin {string} is allowed', async ({ world }, origin: string) => {
  expect(await preflight(world, origin)).toBe(origin);
});

Then('a request from the origin {string} is not allowed', async ({ world }, origin: string) => {
  const allowed = await preflight(world, origin);
  expect(allowed === null || (allowed !== origin && allowed !== '*')).toBe(true);
});

Then('the app page and the note list carry the security headers', async ({ world }) => {
  const url = world.requireCloud().url;
  for (const path of ['/', '/api/docs']) {
    const res = await fetch(`${url}${path}`, world.token ? withToken(world.token) : {});
    expect(res.status, path).toBe(200);
    const csp = res.headers.get('content-security-policy') ?? '';
    expect(csp, path).toContain("frame-ancestors 'none'");
    expect(csp, path).toContain("default-src 'self'");
    expect(res.headers.get('x-content-type-options'), path).toBe('nosniff');
    expect(res.headers.get('referrer-policy'), path).toBe('no-referrer');
  }
});

// ---- limits (R-ACC-06) ----

Given('a cloud server that allows notes of at most {int} KiB', async ({ world }, kib: number) => {
  await world.startCloud(undefined, { QUIRE_MAX_NOTE_BYTES: String(kib * 1024) });
});

When('{string} tries to save a note of {int} MiB', async ({ world }, d: string, mib: number) => {
  const device = world.systemDevice(d);
  world.lastError = null;
  try {
    await device.transport.push({ device: d, items: [{ path: 'big.md', baseRev: null, text: 'x'.repeat(mib * 1024 * 1024) }] });
  } catch (e) {
    world.lastError = { message: String(e), ...(e instanceof HttpError ? { status: e.status } : {}) };
  }
});

Then('the request is rejected with status {int}', async ({ world }, status: number) => {
  expect(world.lastError, 'the request succeeded').not.toBeNull();
  expect(world.lastError?.status).toBe(status);
});

When('{int} requests with a wrong token are made', async ({ world }, n: number) => {
  for (let i = 0; i < n; i++) expect((await noteList(world, withToken(`wrong-${i}`))).status).toBe(401);
});

Then('a request for the note list with the token is answered with status {int}', async ({ world }, status: number) => {
  expect((await noteList(world, withToken(world.token ?? ''))).status).toBe(status);
});
