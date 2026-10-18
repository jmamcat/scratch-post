import { execFile } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { gzipSync } from 'node:zlib';
import { expect } from '@playwright/test';
import { Given, Then, test, type World } from '../support/world.ts';

// ---- change 0003: first-load budget (R-PLT-07). The web build is made here, with source maps. ----

const run = promisify(execFile);
const webDir = fileURLToPath(new URL('../../apps/web', import.meta.url));
const BUILD_TIMEOUT_MS = 240_000;

const builds = new WeakMap<World, string>();

function distOf(world: World): string {
  const dir = builds.get(world);
  if (!dir) throw new Error('no build: start with "the web app is built"');
  return dir;
}

Given('the web app is built', async ({ world }) => {
  test.setTimeout(BUILD_TIMEOUT_MS + 30_000);
  const dir = mkdtempSync(join(tmpdir(), 'quire-budget-'));
  world.cleanups.push(() => rmSync(dir, { recursive: true, force: true }));
  try {
    await run(process.execPath, [join(webDir, 'node_modules/vite/bin/vite.js'), 'build', '--outDir', dir, '--emptyOutDir', '--sourcemap'], {
      cwd: webDir,
      timeout: BUILD_TIMEOUT_MS,
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch (e) {
    const err = e as { stdout?: string; stderr?: string; message: string };
    throw new Error(`web build failed: ${err.message}\n${err.stdout ?? ''}\n${err.stderr ?? ''}`.slice(-4000));
  }
  builds.set(world, dir);
});

/** The entry script and modulepreload links named by the page. */
function pageScripts(html: string): string[] {
  const out: string[] = [];
  for (const [tag] of html.matchAll(/<(?:script|link)\b[^>]*>/g)) {
    const attr = (name: string) => new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1];
    if (tag.startsWith('<script') && attr('type') === 'module' && attr('src')) out.push(attr('src')!);
    if (tag.startsWith('<link') && attr('rel') === 'modulepreload' && attr('href')) out.push(attr('href')!);
  }
  return out;
}

/** Paths a chunk imports statically (`import ... from "./x.js"`, `export ... from`, `import "./x.js"`); `import(...)` is lazy and ignored. */
function staticImports(code: string): string[] {
  const out: string[] = [];
  const patterns = [/\bimport\s*(?:[\w$*{},\s]+?\s*from\s*)?["']([^"']+)["']/g, /\bexport\s*(?:\*(?:\s*as\s+[\w$]+)?|\{[^}]*\})\s*from\s*["']([^"']+)["']/g];
  for (const re of patterns) for (const m of code.matchAll(re)) out.push(m[1]!);
  return out;
}

/** `index.html`'s entry script and modulepreload links, plus everything they import statically. */
function firstLoadChunks(dist: string): string[] {
  const html = readFileSync(join(dist, 'index.html'), 'utf8');
  const queue = pageScripts(html).map((u) => posix.normalize(u.replace(/^\/+/, '')));
  expect(queue.length, 'index.html has an entry script').toBeGreaterThan(0);
  const seen = new Set<string>();
  while (queue.length) {
    const chunk = queue.shift()!;
    if (seen.has(chunk) || !existsSync(join(dist, chunk))) continue;
    seen.add(chunk);
    for (const spec of staticImports(readFileSync(join(dist, chunk), 'utf8'))) {
      if (spec.startsWith('.') || spec.startsWith('/')) queue.push(spec.startsWith('/') ? spec.slice(1) : posix.join(dirname(chunk), spec));
    }
  }
  return [...seen];
}

Then('the first-load JavaScript is under {int} kB gzip', async ({ world }, limit: number) => {
  const dist = distOf(world);
  const sizes = firstLoadChunks(dist).map((chunk) => ({ chunk, bytes: gzipSync(readFileSync(join(dist, chunk)), { level: 9 }).length }));
  const total = sizes.reduce((sum, s) => sum + s.bytes, 0);
  const detail = sizes.map((s) => `${s.chunk} ${(s.bytes / 1000).toFixed(1)} kB`).join(', ');
  expect(total, `first-load JavaScript is ${(total / 1000).toFixed(1)} kB gzip (${detail})`).toBeLessThan(limit * 1000);
});

Then('the first-load JavaScript does not include {string}', async ({ world }, pkg: string) => {
  const dist = distOf(world);
  const needle = `node_modules/${pkg}/`;
  const found: string[] = [];
  for (const chunk of firstLoadChunks(dist)) {
    const map = join(dist, `${chunk}.map`);
    expect(existsSync(map), `${chunk} has a source map`).toBe(true);
    const { sources } = JSON.parse(readFileSync(map, 'utf8')) as { sources: string[] };
    if (sources.some((s) => s.includes(needle))) found.push(chunk);
  }
  expect(found, `first-load chunks that contain ${pkg}`).toEqual([]);
});
