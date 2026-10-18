import { type ChildProcess, spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const serverDir = fileURLToPath(new URL('../../apps/server', import.meta.url));
// tsx's own entry run with this Node: node_modules/.bin holds .cmd shims on Windows, which spawn() cannot run.
const tsx = join(serverDir, 'node_modules/tsx/dist/cli.mjs');

export async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const s = createServer();
    s.once('error', reject);
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address() as { port: number };
      s.close(() => resolve(port));
    });
  });
}

export interface ServerOptions {
  device: string;
  env?: Record<string, string>;
  /** Start on an existing data folder (migrations, restores); a fresh temporary one otherwise. */
  dataDir?: string;
}

/** A real Quire server process (cloud or local node) with its own data folder and port. */
export class ServerProcess {
  readonly dataDir: string;
  readonly vaultDir: string;
  port = 0;
  private child: ChildProcess | null = null;
  private log = '';

  constructor(private readonly opts: ServerOptions) {
    this.dataDir = opts.dataDir ?? mkdtempSync(join(tmpdir(), 'quire-scenario-'));
    this.vaultDir = join(this.dataDir, 'vault');
    mkdirSync(this.vaultDir, { recursive: true });
  }

  /** Everything the process printed since it last started (R-OPS-02 steps read it). */
  get output(): string {
    return this.log;
  }

  /** Environment for the next start; steps may change it before a restart. */
  get env(): Record<string, string> {
    return (this.opts.env ??= {});
  }

  get url(): string {
    return `http://127.0.0.1:${this.port}`;
  }

  async start(): Promise<void> {
    if (!this.port) this.port = await freePort();
    this.log = '';
    this.child = spawn(process.execPath, [tsx, 'src/main.ts'], {
      cwd: serverDir,
      env: {
        ...process.env,
        QUIRE_DATA_DIR: this.dataDir,
        QUIRE_PORT: String(this.port),
        QUIRE_DEVICE: this.opts.device,
        QUIRE_WEB_DIST: process.env.QUIRE_WEB_DIST ?? fileURLToPath(new URL('../../apps/web/dist', import.meta.url)),
        NODE_NO_WARNINGS: '1',
        // Change 0003: scenario servers run without a token unless a step sets one, and close
        // change sets after one second of quiet.
        ...(this.opts.env?.QUIRE_TOKEN || this.opts.env?.QUIRE_SECURE ? {} : { QUIRE_INSECURE_NO_AUTH: '1' }),
        QUIRE_CHANGESET_GAP_MS: '1000',
        ...this.opts.env,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    this.child.stdout?.on('data', (d) => (this.log += d));
    this.child.stderr?.on('data', (d) => (this.log += d));
    const until = Date.now() + 20_000;
    while (Date.now() < until) {
      if (this.child.exitCode !== null) throw new Error(`server ${this.opts.device} exited:\n${this.log}`);
      try {
        const res = await fetch(`${this.url}/api/health`);
        if (res.ok) return;
      } catch {
        // not up yet
      }
      await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error(`server ${this.opts.device} did not start:\n${this.log}`);
  }

  async stop(): Promise<void> {
    const child = this.child;
    this.child = null;
    if (!child || child.exitCode !== null) return;
    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => child.kill('SIGKILL'), 5_000);
      child.once('exit', () => {
        clearTimeout(timer);
        resolve();
      });
      child.kill('SIGTERM');
    });
  }
}
