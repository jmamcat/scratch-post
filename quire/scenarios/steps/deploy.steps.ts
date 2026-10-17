import { execFile } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { expect } from '@playwright/test';
import { freePort } from '../support/servers.ts';
import { SystemDevice } from '../support/system-device.ts';
import { Given, Then, When, type World, eventually, test } from '../support/world.ts';

// ---- change 0003: container deployment (R-OPS-04). Tagged @deploy: runs only through the deploy gate. ----

const run = promisify(execFile);
const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const BUILD_MINUTES = 15;

/** One scenario's Compose stack: its own project name, port, token and env file. */
interface Stack {
  project: string;
  image: string;
  token: string;
  port: number;
  dir: string;
  env: NodeJS.ProcessEnv;
  envFile: string;
}

const stacks = new WeakMap<World, Stack>();

function stackOf(world: World): Stack {
  const s = stacks.get(world);
  if (!s) throw new Error('no stack: start with "the container image is built"');
  return s;
}

async function docker(args: string[], opts: { env?: NodeJS.ProcessEnv; timeoutMs?: number } = {}): Promise<string> {
  try {
    const { stdout } = await run('docker', args, {
      cwd: repoRoot,
      env: opts.env ?? process.env,
      maxBuffer: 64 * 1024 * 1024,
      timeout: opts.timeoutMs ?? 120_000,
    });
    return stdout.trim();
  } catch (e) {
    const err = e as { stderr?: string; stdout?: string; message: string };
    throw new Error(`docker ${args.join(' ')} failed: ${err.message}\n${err.stderr ?? ''}\n${err.stdout ?? ''}`.slice(-4000));
  }
}

const compose = (stack: Stack, args: string[], timeoutMs?: number) =>
  docker(['compose', '-p', stack.project, '--env-file', stack.envFile, ...args], { env: stack.env, ...(timeoutMs ? { timeoutMs } : {}) });

/** Prepare the stack's settings and register its teardown before anything is built or started. */
async function prepare(world: World): Promise<Stack> {
  const token = randomBytes(24).toString('hex');
  const port = await freePort();
  const project = `quire-deploy-${process.pid}-${randomBytes(3).toString('hex')}`;
  const dir = mkdtempSync(join(tmpdir(), 'quire-deploy-'));
  const envFile = join(dir, 'env');
  const image = `${project}:test`;
  writeFileSync(envFile, [`QUIRE_TOKEN=${token}`, `QUIRE_HOST_PORT=${port}`, `QUIRE_IMAGE=${image}`, ''].join('\n'));
  // Settings come from the generated env file only; QUIRE_NODE_IMAGE (a registry mirror) and the CA file are the only things passed through.
  const env: NodeJS.ProcessEnv = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('QUIRE_')));
  env.QUIRE_ENV_FILE = envFile;
  if (process.env.QUIRE_NODE_IMAGE) env.QUIRE_NODE_IMAGE = process.env.QUIRE_NODE_IMAGE;
  // Behind a TLS-inspecting proxy the build needs the machine's extra CA certificates (as a build secret).
  const ca = process.env.QUIRE_BUILD_CA ?? process.env.NODE_EXTRA_CA_CERTS;
  if (ca) env.QUIRE_BUILD_CA = ca;
  const stack: Stack = { project, image, token, port, dir, env, envFile };
  // Always tear down, also when the build or an assertion failed.
  world.cleanups.push(async () => {
    await compose(stack, ['down', '-v', '--remove-orphans'], 180_000).catch((e) => console.error(String(e)));
    await docker(['image', 'rm', image]).catch(() => undefined);
    rmSync(dir, { recursive: true, force: true });
  });
  stacks.set(world, stack);
  return stack;
}

Given('the container image is built', async ({ world }) => {
  test.setTimeout((BUILD_MINUTES + 10) * 60_000);
  await docker(['info', '--format', '{{.ServerVersion}}']).catch((e) => {
    throw new Error(`Docker is not available (start the daemon): ${String(e)}`);
  });
  const stack = await prepare(world);
  await compose(stack, ['build', 'cloud'], BUILD_MINUTES * 60_000);
});

When('the Compose stack starts with an access token', async ({ world }) => {
  const stack = stackOf(world);
  await compose(stack, ['up', '-d', '--no-build'], 120_000);
});

async function health(stack: Stack): Promise<string> {
  const id = await compose(stack, ['ps', '-q', 'cloud']);
  if (!id) return 'missing';
  return docker(['inspect', '--format', '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}', id]);
}

async function waitHealthy(stack: Stack, seconds: number): Promise<void> {
  let last = '';
  try {
    await eventually(
      seconds,
      async () => {
        last = await health(stack);
        return last === 'healthy';
      },
      `the cloud service is healthy (last status: ${last})`,
    );
  } catch (e) {
    const logs = await compose(stack, ['logs', '--tail', '40', 'cloud']).catch(() => '');
    throw new Error(`${String(e)}\nlast status: ${last}\n${logs}`);
  }
}

Then("within {int} seconds the stack's cloud server is healthy", async ({ world }, seconds: number) => {
  await waitHealthy(stackOf(world), seconds);
});

Then("the stack's cloud server runs as a non-root user", async ({ world }) => {
  const uid = await compose(stackOf(world), ['exec', '-T', 'cloud', 'id', '-u']);
  expect(uid, 'the user id inside the cloud container').toMatch(/^\d+$/);
  expect(uid).not.toBe('0');
});

Then('a note written through the stack survives a restart of the stack', async ({ world }) => {
  const stack = stackOf(world);
  const url = `http://127.0.0.1:${stack.port}`;
  const writer = new SystemDevice('deploy-writer', url, stack.token);
  try {
    await writer.setText('deploy.md', 'survives a restart');
    await writer.sync();
    expect(await writer.isPending('deploy.md'), 'the note reached the server').toBe(false);
  } finally {
    await writer.close();
  }
  // The token is required: the same request without it is refused.
  expect((await fetch(`${url}/api/docs`)).status).toBe(401);

  await compose(stack, ['restart'], 120_000);
  await waitHealthy(stack, 60);

  const reader = new SystemDevice('deploy-reader', url, stack.token);
  try {
    await reader.sync();
    expect(await reader.read('deploy.md')).toBe('survives a restart');
  } finally {
    await reader.close();
  }
});
