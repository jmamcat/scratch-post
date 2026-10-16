import type { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import type { EventHub } from '../shared/events.ts';

/** Server-Sent Events stream of commits and conflict changes (R-LIV-04). */
export function eventRoutes(app: Hono, deps: { events: EventHub; headRev: () => number }): void {
  app.get('/api/events', (c) =>
    streamSSE(c, async (stream) => {
      const queue: string[] = [];
      let wake: (() => void) | null = null;
      const off = deps.events.subscribe((e) => {
        queue.push(JSON.stringify(e));
        wake?.();
      });
      stream.onAbort(() => {
        off();
        wake?.();
      });
      await stream.writeSSE({ event: 'hello', data: JSON.stringify({ rev: deps.headRev() }) });
      while (!stream.aborted) {
        if (queue.length === 0) {
          await new Promise<void>((r) => {
            wake = r;
            setTimeout(r, 25_000);
          });
          wake = null;
          if (queue.length === 0 && !stream.aborted) await stream.writeSSE({ event: 'ping', data: '{}' });
          continue;
        }
        await stream.writeSSE({ event: 'message', data: queue.shift()! });
      }
      off();
    }),
  );
}
