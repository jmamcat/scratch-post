import type { SystemDevice } from './system-device.ts';

/**
 * Load driver for R-OPS-05: many system devices editing shared notes at once, some of them
 * typing in one live room, with every push timed and every failed request recorded.
 */

/** Small deterministic PRNG (mulberry32), the same generator the simulation uses. */
export function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const WORDS = ['alpha', 'beta', 'gamma', 'delta', 'omega', 'kappa', 'sigma', 'theta'];
/** The simulation's notes come first, so its convergence step compares real documents. */
const SIMULATION_PATHS = ['a.md', 'b.md', 'notes/c.md', 'notes/d.md'];

/** `count` shared note paths: the simulation's four, then `load/note-NN.md`. */
export function sharedNotes(count: number): string[] {
  const out = SIMULATION_PATHS.slice(0, count);
  for (let i = out.length; i < count; i++) out.push(`load/note-${String(i).padStart(2, '0')}.md`);
  return out;
}

export interface LoadOptions {
  edits: number;
  notes: string[];
  livePath: string;
  liveCount: number;
  seed: number;
}

export interface LoadResult {
  /** Duration of every `POST /api/sync/push`, request to full response body, in ms. */
  pushes: number[];
  failures: string[];
  /** Characters typed into the live room. */
  keystrokes: number;
  wallMs: number;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

class Recorder {
  readonly pushes: number[] = [];
  readonly failures: string[] = [];

  fail(device: string, what: string): void {
    this.failures.push(`${device}: ${what}`);
  }

  /** Wraps the device transport's fetch: times pushes, records non-2xx answers and network errors. */
  attach(device: SystemDevice): () => void {
    const transport = device.transport as unknown as { fetchFn: typeof fetch };
    const inner = transport.fetchFn;
    if (typeof inner !== 'function') throw new Error('HttpTransport keeps its fetch elsewhere now: update support/load.ts');
    transport.fetchFn = async (input, init) => {
      const method = init?.method ?? 'GET';
      const route = new URL(input instanceof Request ? input.url : String(input)).pathname;
      const isPush = method === 'POST' && route === '/api/sync/push';
      const started = performance.now();
      let res: Response;
      try {
        res = await inner(input, init);
      } catch (e) {
        this.fail(device.name, `${method} ${route} failed: ${e instanceof Error ? e.message : String(e)}`);
        throw e;
      }
      if (!res.ok) this.fail(device.name, `${method} ${route} answered ${res.status}`);
      if (!isPush) return res;
      // Time the whole round trip, body included, then hand the client an identical response.
      const body = await res.arrayBuffer();
      this.pushes.push(performance.now() - started);
      return new Response(body, { status: res.status, statusText: res.statusText, headers: res.headers });
    };
    return () => {
      transport.fetchFn = inner;
    };
  }
}

async function syncOnce(d: SystemDevice, rec: Recorder): Promise<void> {
  const report = await d.client.sync();
  if (report.error) rec.fail(d.name, `sync: ${report.error}`);
}

/** One device's edits: pick a note, change or add a line, sync, pause a little. */
async function editLoop(d: SystemDevice, rand: () => number, opts: LoadOptions, rec: Recorder): Promise<void> {
  const pick = <T>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)]!;
  for (let i = 0; i < opts.edits; i++) {
    const path = pick(opts.notes);
    const lines = ((await d.read(path)) ?? '').split('\n');
    const line = `${d.name} ${pick(WORDS)} ${i}`;
    // Line 0 is the note's title; replace a body line or add one.
    if (lines.length > 1 && rand() < 0.4) lines[1 + Math.floor(rand() * (lines.length - 1))] = line;
    else lines.push(line);
    await d.setText(path, lines.join('\n'));
    await syncOnce(d, rec);
    await sleep(10 + rand() * 90);
  }
}

/** Types one character at a time into the live room until `done` is set. */
async function typeLoop(d: SystemDevice, rand: () => number, path: string, done: { value: boolean }, rec: Recorder): Promise<number> {
  let typed = 0;
  while (!done.value) {
    if (!d.isLive(path)) {
      rec.fail(d.name, `lost its live connection to ${path}`);
      return typed;
    }
    const word = `${WORDS[Math.floor(rand() * WORDS.length)]!} `;
    const at = rand() < 0.5 ? 'start' : 'end';
    for (let i = 0; i < word.length && !done.value; i++) {
      d.insertLive(path, at, at === 'start' ? word[word.length - 1 - i]! : word[i]!);
      typed += 1;
      await sleep(20 + rand() * 60);
    }
  }
  return typed;
}

async function until(seconds: number, what: string, fn: () => Promise<boolean>): Promise<void> {
  const end = Date.now() + seconds * 1000;
  while (Date.now() < end) {
    if (await fn()) return;
    await sleep(100);
  }
  throw new Error(`within ${seconds}s: ${what}`);
}

/**
 * Runs the load: seeds the shared notes, lets `liveCount` devices join the live room, then
 * every device loops edit-sync-pause while the live devices type. Ends with the room
 * committed and two sync rounds for everyone, so all devices can be compared with the server.
 */
export async function runLoad(devices: SystemDevice[], observer: SystemDevice, opts: LoadOptions): Promise<LoadResult> {
  const rec = new Recorder();
  const detach = devices.map((d) => rec.attach(d));
  const started = performance.now();
  let keystrokes = 0;
  try {
    const [first] = devices;
    if (!first) throw new Error('no devices to load');
    for (const path of opts.notes) await first.setText(path, `# ${path}`);
    await syncOnce(first, rec);
    await Promise.all(devices.map((d) => syncOnce(d, rec)));

    const typists = devices.slice(0, opts.liveCount);
    await Promise.all(typists.map((d) => d.joinLive(opts.livePath)));

    const done = { value: false };
    const typing = typists.map((d, i) => typeLoop(d, rng(opts.seed * 7919 + 1000 + i), opts.livePath, done, rec));
    try {
      await Promise.all(devices.map((d, i) => editLoop(d, rng(opts.seed * 7919 + i), opts, rec)));
    } finally {
      done.value = true;
    }
    keystrokes = (await Promise.all(typing)).reduce((a, b) => a + b, 0);

    // The room commits after typing stops; wait until the log has what every typist sees.
    await until(15, `${opts.livePath} committed from its live room`, async () => {
      const head = await observer.transport.doc(opts.livePath).catch(() => null);
      if (!head) return false;
      for (const d of typists) if (!d.isLive(opts.livePath) || (await d.read(opts.livePath)) !== head.text) return false;
      return true;
    });
    // First round pushes what is left, second round pulls what the others pushed in the first.
    await Promise.all(devices.map((d) => syncOnce(d, rec)));
    await Promise.all(devices.map((d) => syncOnce(d, rec)));
  } finally {
    for (const fn of detach) fn();
  }
  return { pushes: rec.pushes, failures: rec.failures, keystrokes, wallMs: performance.now() - started };
}

/** Every note on the server, as each device sees it; the paths that differ, per device. */
export async function divergence(devices: SystemDevice[], observer: SystemDevice): Promise<string[]> {
  const heads = new Map<string, string>();
  for (const meta of await observer.transport.docs()) {
    if (meta.deleted || meta.kind === 'file') continue;
    const { text } = await observer.transport.doc(meta.path);
    if (text !== null) heads.set(meta.path, text);
  }
  const out: string[] = [];
  for (const d of devices) {
    for (const [path, text] of heads) if ((await d.read(path)) !== text) out.push(`${d.name}: ${path}`);
  }
  return out;
}

/** Nearest-rank percentile. */
export function percentile(xs: number[], p: number): number {
  if (xs.length === 0) return Number.NaN;
  const sorted = [...xs].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1))]!;
}

export function summary(r: LoadResult): string {
  const ms = (n: number) => `${n.toFixed(1)} ms`;
  return [
    `load: ${r.pushes.length} pushes`,
    `p50 ${ms(percentile(r.pushes, 50))}`,
    `p95 ${ms(percentile(r.pushes, 95))}`,
    `p99 ${ms(percentile(r.pushes, 99))}`,
    `max ${ms(Math.max(...r.pushes))}`,
    `${r.failures.length} errors`,
    `${r.keystrokes} live keystrokes`,
    `wall ${(r.wallMs / 1000).toFixed(1)} s`,
  ].join(', ');
}
