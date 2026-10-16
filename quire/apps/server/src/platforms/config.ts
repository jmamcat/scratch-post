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
  /** Development only: run with no access token (R-ACC-01). */
  insecureNoAuth: boolean;
  /** Extra origins allowed to call the API from a browser (R-ACC-05). */
  allowedOrigins: string[];
  /** Size limits in bytes (R-ACC-06). */
  maxNoteBytes: number;
  maxFileBytes: number;
  /** Tickets for event streams and live connections live this long (R-ACC-03). */
  ticketTtlMs: number;
  maxTokens: number;
  /** Backups (R-BAK-05); none when unset. */
  backupDir?: string;
  /** Quiet time that closes a change set (R-BAK-02). */
  changesetGapMs: number;
  /** Compaction keeps every revision this many days (R-BAK-04). */
  keepAllDays: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
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
    insecureNoAuth: env.QUIRE_INSECURE_NO_AUTH === '1',
    allowedOrigins: (env.QUIRE_ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean),
    maxNoteBytes: Number(env.QUIRE_MAX_NOTE_BYTES ?? 2 * 1024 * 1024),
    maxFileBytes: Number(env.QUIRE_MAX_FILE_BYTES ?? 25 * 1024 * 1024),
    ticketTtlMs: Number(env.QUIRE_TICKET_TTL_MS ?? 60_000),
    maxTokens: Number(env.QUIRE_MAX_TOKENS ?? 32),
    ...(env.QUIRE_BACKUP_DIR ? { backupDir: resolve(env.QUIRE_BACKUP_DIR) } : {}),
    changesetGapMs: Number(env.QUIRE_CHANGESET_GAP_MS ?? 10 * 60_000),
    keepAllDays: Number(env.QUIRE_KEEP_ALL_DAYS ?? 30),
    logLevel: (['debug', 'info', 'warn', 'error'] as const).find((l) => l === env.QUIRE_LOG_LEVEL) ?? 'info',
  };
}
