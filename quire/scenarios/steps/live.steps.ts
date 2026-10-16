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
  world.systemDevice(d).insertLive(path, 'end', text(body));
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
  const res = await fetch(device.transport.url('/api/events'), { signal: ctrl.signal });
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  void (async () => {
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) return;
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
      // aborted at cleanup
    }
  })();
  streams.set(world, events);
  world.cleanups.push(() => ctrl.abort());
});

Then('the event stream announces a commit of {string} by {string}', async ({ world }, path: string, by: string) => {
  const events = streams.get(world) ?? [];
  await eventually(3, async () => events.some((e) => e.type === 'commit' && e.path === path && e.device === by), `commit of ${path} by ${by} announced`);
});
