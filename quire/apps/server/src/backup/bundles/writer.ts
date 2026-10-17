import { mkdirSync, rmSync } from 'node:fs';
import type { DatabaseSync } from 'node:sqlite';
import type { Logger } from '../../ops/index.ts';
import type { SqliteRevisionStore } from '../../vault/index.ts';
import type { Background, BackupDeps } from '../deps.ts';
import { type BundleFile, maxSeq, writeBundle } from './format.ts';
import { lastBackup, nextKind, planBundle } from './plan.ts';

export const LAST_SUCCESS_KEY = 'backup.lastSuccessAt';
export const LAST_ERROR_KEY = 'backup.lastError';

export interface Written {
  file: BundleFile;
  firstRev: number;
  lastRev: number;
  revisions: number;
  contentEntries: number;
}

/**
 * Writes the next bundle when there is one to write and records it in `backups`; returns null
 * when the chain is up to date. Throws on any failure, leaving no file and no row behind.
 */
export async function writeNext(store: SqliteRevisionStore, dataDir: string, dir: string, now = Date.now()): Promise<Written | null> {
  mkdirSync(dir, { recursive: true });
  const next = nextKind(store.db, dir, now);
  if (!next) return null;
  // The folder may hold bundles from an earlier database (a restored server): never reuse a number.
  const seq = Math.max(lastBackup(store.db)?.seq ?? 0, maxSeq(dir)) + 1;
  const plan = planBundle(store.db, dataDir, next.kind, seq, next.after);
  const file = await writeBundle(dir, plan.manifest, plan.sources);
  const m = plan.manifest;
  try {
    record(store.db, file, m.prevSha256, m.firstRev, m.lastRev, m.createdAt);
  } catch (e) {
    // A file the database does not know would break the chain of the next bundle.
    rmSync(file.path, { force: true });
    throw e;
  }
  return { file, firstRev: m.firstRev, lastRev: m.lastRev, revisions: m.revisions.length, contentEntries: m.content.length };
}

function record(db: DatabaseSync, file: BundleFile, prev: string | null, firstRev: number, lastRev: number, at: string): void {
  db.prepare('INSERT INTO backups (seq, kind, file, sha256, prev_sha256, first_rev, last_rev, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
    file.seq,
    file.kind,
    file.name,
    file.sha256,
    prev,
    firstRev,
    lastRev,
    at,
  );
}

/** Records the outcome of one attempt where readiness and metrics read it (R-OPS-01, R-OPS-03). */
export function recordOutcome(store: SqliteRevisionStore, log: Logger, outcome: Written | null | Error): void {
  if (outcome instanceof Error) {
    const message = outcome.message;
    // Retries run every tick: log a failure once until it changes or clears.
    if (store.getKv(LAST_ERROR_KEY) !== message) log.error('backup failed', { error: message });
    store.setKv(LAST_ERROR_KEY, message);
    return;
  }
  if (outcome) {
    log.info('backup written', {
      file: outcome.file.name,
      kind: outcome.file.kind,
      seq: outcome.file.seq,
      firstRev: outcome.firstRev,
      lastRev: outcome.lastRev,
      revisions: outcome.revisions,
    });
    store.setKv(LAST_SUCCESS_KEY, new Date().toISOString());
  }
  if (store.getKv(LAST_ERROR_KEY) !== null) {
    if (!outcome) log.info('backup recovered');
    store.deleteKv(LAST_ERROR_KEY);
  }
}

/**
 * With a backup folder: a full bundle at start when there is none, then a check every half
 * change-set gap (at least 250 ms) for change sets that closed since the newest bundle (R-BAK-05).
 */
export function startBundles(deps: BackupDeps): Background {
  const dir = deps.config.backupDir;
  if (!dir) return { stop: async () => undefined };
  let running: Promise<void> | null = null;
  let stopped = false;
  const tick = () => {
    if (running || stopped) return;
    running = (async () => {
      let outcome: Written | null | Error;
      try {
        outcome = await writeNext(deps.store, deps.config.dataDir, dir);
      } catch (e) {
        outcome = e instanceof Error ? e : new Error(String(e));
      }
      try {
        if (!stopped) recordOutcome(deps.store, deps.log, outcome);
        if (outcome && !(outcome instanceof Error)) deps.metrics.inc('quire_backups_total', { kind: outcome.file.kind });
      } catch (e) {
        deps.log.error('recording the backup outcome failed', { error: e instanceof Error ? e.message : String(e) });
      }
    })().finally(() => {
      running = null;
    });
  };
  const timer = setInterval(tick, Math.max(250, deps.config.changesetGapMs / 2));
  const first = setTimeout(tick, 0);
  return {
    async stop() {
      clearInterval(timer);
      clearTimeout(first);
      await running;
      stopped = true;
    },
  };
}
