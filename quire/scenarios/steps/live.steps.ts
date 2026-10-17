import type { ServerEvent } from '@quire/sync';
import { Given, Then, When, eventually, text } from '../support/world.ts';

Given('{string} and {string} are editing {string} live', async ({ world }, a: string, b: string, path: string) => {
  for (const name of new Set([a, b])) await world.systemDevice(name).joinLive(path);
});

Given('{string} is editing {string} live', async ({ world }, d: string, path: string) => {
  await world.systemDevice(d).joinLive(path);
});

When('{string} types {string} at the start of {string}', async ({ world }, d: string, body: string, path: string) => {
  world.systemDevice(d).insertLive(path, 'start', text(body));
});

When('{string} types {string} at the end of {string}', async ({ world }, d: string, body: string, path: string) => {
  // Browser devices type into the open editor (R-ACC-04); system devices into their live room.
  if (world.layer === 'ui') await world.device(d).append(path, text(body));
  else world.systemDevice(d).insertLive(path, 'end', text(body));
});

When('{string} pastes {int} KiB at the end of {string}', async ({ world }, d: string, kib: number, path: string) => {
  const body = 'x'.repeat(kib * 1024);
  if (world.layer === 'ui') await world.device(d).append(path, body);
  else world.systemDevice(d).insertLive(path, 'end', body);
});

When('{string} loses its live connection', async ({ world }, d: string) => {
  const device = world.systemDevice(d);
  for (const path of device.livePaths()) await device.dropLive(path);
});

When('{string} reconnects', async ({ world }, d: string) => {
  const device = world.systemDevice(d);
  for (const path of device.livePaths()) await device.rejoinLive(path);
});

const streams = new WeakMap<object, ServerEvent[]>();

Given('{string} is listening to the event stream', async ({ world }, d: string) => {
  const device = world.systemDevice(d);
  const events: ServerEvent[] = [];
  const ctrl = new AbortController();
  const res = await fetch(await device.transport.streamUrl('/api/events'), { signal: ctrl.signal });
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  void (async () => {
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) {
          closedStreams.add(world);
          return;
        }
        buf += decoder.decode(value);
        let i: number;
        while ((i = buf.indexOf('\n\n')) >= 0) {
          const frame = buf.slice(0, i);
          buf = buf.slice(i + 2);
          const data = frame.split('\n').find((l) => l.startsWith('data:'));
          if (frame.includes('event: message') && data) events.push(JSON.parse(data.slice(5)) as ServerEvent);
        }
      }
    } catch {
      // aborted at cleanup, or the server closed the stream
      closedStreams.add(world);
    }
  })();
  streams.set(world, events);
  world.cleanups.push(() => ctrl.abort());
});

/** Worlds whose event stream the server ended (R-ACC-02). */
const closedStreams = new WeakSet<object>();

Then('within {int} seconds the event stream of {string} has closed', async ({ world }, seconds: number, _d: string) => {
  await eventually(seconds, async () => closedStreams.has(world), 'the event stream to close');
});

Then('the event stream announces a commit of {string} by {string}', async ({ world }, path: string, by: string) => {
  const events = streams.get(world) ?? [];
  await eventually(3, async () => events.some((e) => e.type === 'commit' && e.path === path && e.device === by), `commit of ${path} by ${by} announced`);
});
