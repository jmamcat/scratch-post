import { rmSync, writeFileSync } from 'node:fs';
import { expect } from '@playwright/test';
import { Then, When, type World, eventually, text } from '../support/world.ts';

// ---- change 0003: operations (R-OPS-01 to R-OPS-03) ----

interface Readiness {
  status: number;
  body: { ok?: boolean; failing?: string[] };
}

async function readiness(world: World): Promise<Readiness> {
  const res = await fetch(`${world.requireCloud().url}/api/ready`);
  return { status: res.status, body: (await res.json()) as Readiness['body'] };
}

Then('the readiness check succeeds', async ({ world }) => {
  const ready = await readiness(world);
  expect(ready.status, JSON.stringify(ready.body)).toBe(200);
  expect(ready.body.ok).toBe(true);
});

Then('within {int} seconds the readiness check fails naming {string}', async ({ world }, seconds: number, check: string) => {
  await eventually(
    seconds,
    async () => {
      const ready = await readiness(world);
      return ready.status === 503 && ready.body.failing?.includes(check) ? ready : false;
    },
    `the readiness check fails naming "${check}"`,
  );
});

When('the backup folder becomes unwritable', async ({ world }) => {
  const dir = world.requireCloud().env.QUIRE_BACKUP_DIR;
  if (!dir) throw new Error('the cloud server has no backup folder: start it with "a cloud server with a backup folder"');
  // A file where the folder was: fails for root too, unlike a permission change.
  rmSync(dir, { recursive: true, force: true });
  writeFileSync(dir, 'not a folder');
});

interface LogLine {
  method?: string;
  route?: string;
  status?: number;
  [field: string]: unknown;
}

/** The JSON lines the cloud server has printed so far; other lines are ignored. */
function jsonLines(world: World): LogLine[] {
  const lines: LogLine[] = [];
  for (const line of world.requireCloud().output.split('\n')) {
    if (!line.startsWith('{')) continue;
    try {
      lines.push(JSON.parse(line) as LogLine);
    } catch {
      // a partial line still being written
    }
  }
  return lines;
}

Then(
  "the cloud server's log has a JSON line for {string} with status {int}",
  async ({ world }, request: string, status: number) => {
    const [method, route] = request.split(' ');
    await eventually(
      5,
      async () => jsonLines(world).some((l) => l.method === method && l.route === route && l.status === status),
      `the log has a JSON line for "${request}" with status ${status}`,
    );
  },
);

Then("the cloud server's log does not contain {string}", async ({ world }, secret: string) => {
  expect(world.requireCloud().output).not.toContain(text(secret));
});

async function scrape(world: World): Promise<string> {
  const res = await fetch(`${world.requireCloud().url}/api/metrics`, {
    headers: world.token ? { authorization: `Bearer ${world.token}` } : {},
  });
  expect(res.status, 'GET /api/metrics status').toBe(200);
  return res.text();
}

/** Sample lines only: the metric name is everything before the labels or the value. */
function samples(body: string): { name: string; value: number }[] {
  return body
    .split('\n')
    .filter((line) => line !== '' && !line.startsWith('#'))
    .map((line) => ({
      name: line.split(/[{ ]/)[0] ?? '',
      value: Number(line.slice(line.lastIndexOf(' ') + 1)),
    }));
}

Then('the metrics report at least {int} for {string}', async ({ world }, min: number, metric: string) => {
  const body = await scrape(world);
  const total = samples(body)
    .filter((s) => s.name === metric)
    .reduce((sum, s) => sum + s.value, 0);
  expect(total, `${metric} in:\n${body}`).toBeGreaterThanOrEqual(min);
});

Then('the metrics include {string}', async ({ world }, metric: string) => {
  const names = new Set(samples(await scrape(world)).map((s) => s.name));
  const histogram = [`${metric}_bucket`, `${metric}_sum`, `${metric}_count`].some((n) => names.has(n));
  expect(names.has(metric) || histogram, `a sample for ${metric}`).toBe(true);
});

Then('every line in the cloud server\'s log is a JSON object', async ({ world }) => {
  const lines = world.requireCloud().output.split('\n').filter((l) => l.trim());
  expect(lines.length, 'the server wrote nothing').toBeGreaterThan(0);
  for (const line of lines) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      parsed = undefined;
    }
    expect(typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed), `not a JSON object: ${line}`).toBe(true);
  }
});
