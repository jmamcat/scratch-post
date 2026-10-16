import { expect } from '@playwright/test';
import { Given, Then, When, type World, text } from '../support/world.ts';

Given('a cloud server', async ({ world }) => {
  await world.startCloud();
});

Given('a cloud server that requires the token {string}', async ({ world }, token: string) => {
  await world.startCloud(token);
});

Given('a local node {string} replicating with the cloud server', async ({ world }, name: string) => {
  await world.startLocalNode(name);
});

Given('device {string}', async ({ world }, a: string) => {
  await world.addDevice(a);
});

Given('devices {string} and {string}', async ({ world }, a: string, b: string) => {
  await world.addDevice(a);
  await world.addDevice(b);
});

Given('devices {string}, {string} and {string}', async ({ world }, a: string, b: string, c: string) => {
  for (const name of [a, b, c]) await world.addDevice(name);
});

Given('device {string} connected to {string}', async ({ world }, name: string, server: string) => {
  await world.addDevice(name, server);
});

When('the cloud server goes down', async ({ world }) => {
  await world.requireCloud().stop();
});

When('the cloud server comes back', async ({ world }) => {
  await world.requireCloud().start();
});

Given('the vault folder already contains {string} reading {string}', async ({ world }, path: string, body: string) => {
  world.preload.set(path, text(body));
});

// ---- change 0003: shared by access, backup and ops steps ----

/** Starts the cloud server and records a failure instead of throwing. */
async function tryStartCloud(world: World, env: Record<string, string>): Promise<void> {
  world.failedStart = undefined;
  try {
    await world.startCloud(undefined, env);
  } catch (e) {
    world.failedStart = e instanceof Error ? e.message : String(e);
  }
}

When('a cloud server starts with no access token', async ({ world }) => {
  // QUIRE_SECURE keeps the scenario harness from adding QUIRE_INSECURE_NO_AUTH.
  await tryStartCloud(world, { QUIRE_SECURE: '1' });
});

When('a cloud server starts on that data folder', async ({ world }) => {
  if (!world.preparedDataDir) throw new Error('no prepared data folder: use "a data folder from ..." first');
  await tryStartCloud(world, {});
});

Then('the cloud server fails to start with the message {string}', async ({ world }, message: string) => {
  expect(world.failedStart, 'the cloud server started').toBeDefined();
  expect(world.failedStart).toContain(message);
});

Given('device {string} using the token {string}', async ({ world }, name: string, token: string) => {
  await world.addDevice(name, 'cloud', token);
});

Given('devices {string} and {string} using the token {string}', async ({ world }, a: string, b: string, token: string) => {
  await world.addDevice(a, 'cloud', token);
  await world.addDevice(b, 'cloud', token);
});

When('{int} seconds pass', async ({}, seconds: number) => {
  await new Promise((r) => setTimeout(r, seconds * 1000));
});
