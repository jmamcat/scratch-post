import { Given, When, text } from '../support/world.ts';

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
