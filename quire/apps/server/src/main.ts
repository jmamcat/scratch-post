import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { serve } from '@hono/node-server';
import { type QuireServer, createQuireServer } from './app.ts';
import { type Background, startBackup } from './backup/index.ts';
import { type LiveRooms, createLiveRooms } from './live/index.ts';
import { type Config, loadConfig } from './platforms/index.ts';
import { type Replicator, createReplicator } from './sync/index.ts';

export interface Running {
  quire: QuireServer;
  http: Server;
  live: LiveRooms;
  replicator: Replicator | null;
  backup: Background;
  url: string;
  stop(): Promise<void>;
}

export async function start(config: Config): Promise<Running> {
  const quire = await createQuireServer(config);
  const backup = startBackup(quire.backupDeps);
  const http = await new Promise<Server>((resolve) => {
    const s = serve({ fetch: quire.app.fetch, port: config.port }, () => resolve(s as Server));
  });
  const live = createLiveRooms(
    { ...quire, authorize: (url, req) => quire.access.authorizeUpgrade(url, req) },
    { maxTextBytes: config.maxNoteBytes },
  );
  live.attach(http);
  quire.access.onRevoke((name) => live.closeConnections(name));
  quire.ops.setLiveStats(() => live.stats());

  const replicator =
    config.mode === 'local' && config.upstream
      ? createReplicator(
          quire,
          { url: config.upstream.url, device: config.device, ...(config.upstream.token ? { token: config.upstream.token } : {}) },
          {
            ...(config.replicateMs ? { intervalMs: config.replicateMs, debounceMs: Math.min(1000, config.replicateMs) } : {}),
            ...(config.replicateMaxBackoffMs ? { maxBackoffMs: config.replicateMaxBackoffMs } : {}),
          },
        )
      : null;
  replicator?.start();

  const port = (http.address() as AddressInfo).port;
  return {
    quire,
    http,
    live,
    replicator,
    backup,
    url: `http://127.0.0.1:${port}`,
    async stop() {
      await replicator?.stop();
      await live.close();
      await backup.stop();
      await new Promise<void>((resolve) => {
        http.closeAllConnections?.();
        http.close(() => resolve());
      });
      await quire.close();
    },
  };
}

/** Run the server until SIGINT or SIGTERM. */
export async function runServer(): Promise<void> {
  const config = loadConfig();
  let running: Running;
  try {
    running = await start(config);
  } catch (e) {
    console.error(`quire failed to start: ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  }
  running.quire.ops.log.info('started', { mode: config.mode, device: config.device, url: running.url, dataDir: config.dataDir });
  if (running.replicator) running.quire.ops.log.info('replicating', { upstream: config.upstream?.url });
  const shutdown = async () => {
    await running.stop();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

if (import.meta.url === `file://${process.argv[1]}`) await runServer();
