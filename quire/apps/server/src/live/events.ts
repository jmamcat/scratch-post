import type { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import type { EventHub } from '../shared/events.ts';

/** Open event streams by the token name that opened them, so a revocation can end them (R-ACC-02). */
export interface EventStreams {
  close(tokenName: string): void;
}

/** Server-Sent Events stream of commits and conflict changes (R-LIV-04). */
export function eventRoutes(app: Hono, deps: { events: EventHub; headRev: () => number }): EventStreams {
  const open = new Map<() => void, string>();
  app.get('/api/events', (c) =>
    streamSSE(c, async (stream) => {
      // Set by the token guard (access); absent only in insecure mode.
      const principal = (c.get('principal' as never) as string | undefined) ?? 'anonymous';
      let ended = false;
      const end = () => {
        ended = true;
        wake?.();
      };
      open.set(end, principal);
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
      while (!stream.aborted && !ended) {
        if (queue.length === 0) {
          await new Promise<void>((r) => {
            wake = r;
            setTimeout(r, 25_000);
          });
          wake = null;
          if (queue.length === 0 && !stream.aborted && !ended) await stream.writeSSE({ event: 'ping', data: '{}' });
          continue;
        }
        await stream.writeSSE({ event: 'message', data: queue.shift()! });
      }
      off();
      open.delete(end);
      if (ended) await stream.close();
    }),
  );
  return {
    close(tokenName) {
      for (const [end, name] of open) if (name === tokenName) end();
    },
  };
}
