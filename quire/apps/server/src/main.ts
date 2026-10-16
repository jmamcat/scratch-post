import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { serve } from '@hono/node-server';
import { type QuireServer, createQuireServer } from './app.ts';
import { type Config, loadConfig } from './config.ts';
import { type LiveRooms, createLiveRooms } from './live.ts';
import { type Replicator, createReplicator } from './replicator.ts';

export interface Running {
  quire: QuireServer;
  http: Server;
  live: LiveRooms;
  replicator: Replicator | null;
  url: string;
  stop(): Promise<void>;
}

export async function start(config: Config): Promise<Running> {
  const quire = await createQuireServer(config);
  const http = await new Promise<Server>((resolve) => {
    const s = serve({ fetch: quire.app.fetch, port: config.port }, () => resolve(s as Server));
  });
  const live = createLiveRooms(quire);
  live.attach(http);

  const replicator =
    config.mode === 'local' && config.upstream
      ? createReplicator(quire, { url: config.upstream.url, device: config.device, ...(config.upstream.token ? { token: config.upstream.token } : {}) })
      : null;
  replicator?.start();

  const port = (http.address() as AddressInfo).port;
  return {
    quire,
    http,
    live,
    replicator,
    url: `http://127.0.0.1:${port}`,
    async stop() {
      await replicator?.stop();
      await live.close();
      await new Promise<void>((resolve) => {
        http.closeAllConnections?.();
        http.close(() => resolve());
      });
      await quire.close();
    },
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const config = loadConfig();
  const running = await start(config);
  console.log(`quire ${config.mode} node "${config.device}" on ${running.url} (data: ${config.dataDir})`);
  if (running.replicator) console.log(`replicating with ${config.upstream?.url}`);
  const shutdown = async () => {
    await running.stop();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
