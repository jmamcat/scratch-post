#!/usr/bin/env node
// One-command demo: a cloud server and a local node, both seeded, both real processes.
//
//   pnpm -C quire demo              start everything from fresh seed data
//   pnpm -C quire demo:conflict     (while running) stage a collision for the review inbox
//   QUIRE_DEMO_PORT=9787 ...         use other ports (cloud on the port, local node on port + 1)
//
// Data lives in quire/.demo/ and is wiped on every start (idempotent, modules/demo).
import { spawn } from 'node:child_process';
import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const quire = join(here, '..');
const data = join(quire, '.demo');
const serverDir = join(quire, 'apps/server');
const tsx = join(serverDir, 'node_modules/.bin/tsx');

const basePort = Number(process.env.QUIRE_DEMO_PORT ?? 8787);
const CLOUD = { port: basePort, device: 'cloud', dir: join(data, 'cloud') };
const NODE = { port: basePort + 1, device: 'home-node', dir: join(data, 'home-node') };

for (const { port } of [CLOUD, NODE]) {
  const busy = await fetch(`http://127.0.0.1:${port}/api/health`).then(() => true, () => false);
  if (busy) {
    console.error(`Port ${port} is already in use. Stop that server or pick other ports: QUIRE_DEMO_PORT=9787 pnpm -C quire demo`);
    process.exit(1);
  }
}

rmSync(data, { recursive: true, force: true });
mkdirSync(join(CLOUD.dir, 'vault'), { recursive: true });
cpSync(join(here, 'seed'), join(CLOUD.dir, 'vault'), { recursive: true });

const children = [];
function start(node, extraEnv = {}) {
  const child = spawn(tsx, ['src/main.ts'], {
    cwd: serverDir,
    env: { ...process.env, QUIRE_DATA_DIR: node.dir, QUIRE_PORT: String(node.port), QUIRE_DEVICE: node.device, NODE_NO_WARNINGS: '1', ...extraEnv },
    stdio: ['ignore', 'inherit', 'inherit'],
  });
  children.push(child);
  return child;
}

async function healthy(port) {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(`http://127.0.0.1:${port}/api/health`)).ok) return;
    } catch {
      // starting
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`server on :${port} did not start`);
}

start(CLOUD);
await healthy(CLOUD.port);
start(NODE, { QUIRE_MODE: 'local', QUIRE_UPSTREAM: `http://127.0.0.1:${CLOUD.port}`, QUIRE_REPLICATE_MS: '2000' });
await healthy(NODE.port);

console.log(`
Quire demo is running.

  Cloud server   http://localhost:${CLOUD.port}   (vault folder: ${join(CLOUD.dir, 'vault')})
  Local node     http://localhost:${NODE.port}   (vault folder: ${join(NODE.dir, 'vault')})

Open both in different browser profiles (or one normal, one private window) and follow
quire/demo/WALKTHROUGH.md. Stage a collision with: pnpm -C quire demo:conflict
Press Ctrl+C to stop.
`);

const stop = () => {
  for (const c of children) c.kill('SIGTERM');
  process.exit(0);
};
for (const c of children) c.on('exit', (code) => code && stop());
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
