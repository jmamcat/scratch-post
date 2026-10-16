import { hostname } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface Config {
  dataDir: string;
  port: number;
  mode: 'cloud' | 'local';
  device: string;
  token?: string;
  upstream?: { url: string; token?: string };
  webDist: string;
  /** Watch the vault folder for edits made by other programs. */
  watch: boolean;
  /** Local mode: replication interval and the cap on retry backoff, in milliseconds. */
  replicateMs?: number;
  replicateMaxBackoffMs?: number;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const mode = env.QUIRE_MODE === 'local' ? 'local' : 'cloud';
  const upstreamUrl = env.QUIRE_UPSTREAM?.replace(/\/+$/, '');
  if (mode === 'local' && !upstreamUrl) {
    throw new Error('QUIRE_MODE=local needs QUIRE_UPSTREAM (the cloud server URL)');
  }
  return {
    dataDir: resolve(env.QUIRE_DATA_DIR ?? './.data'),
    port: Number(env.QUIRE_PORT ?? 8787),
    mode,
    device: env.QUIRE_DEVICE ?? hostname(),
    ...(env.QUIRE_TOKEN ? { token: env.QUIRE_TOKEN } : {}),
    ...(upstreamUrl
      ? { upstream: { url: upstreamUrl, ...(env.QUIRE_UPSTREAM_TOKEN ? { token: env.QUIRE_UPSTREAM_TOKEN } : {}) } }
      : {}),
    webDist: resolve(env.QUIRE_WEB_DIST ?? fileURLToPath(new URL('../../../web/dist', import.meta.url))),
    watch: env.QUIRE_WATCH !== '0',
    ...(env.QUIRE_REPLICATE_MS ? { replicateMs: Number(env.QUIRE_REPLICATE_MS) } : {}),
    ...(env.QUIRE_REPLICATE_MAX_BACKOFF_MS ? { replicateMaxBackoffMs: Number(env.QUIRE_REPLICATE_MAX_BACKOFF_MS) } : {}),
  };
}
