import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { Logger } from '../../ops/index.ts';
import type { Config } from '../../platforms/index.ts';
import { SqliteRevisionStore } from '../../vault/index.ts';
import { ChangeSets } from '../history/changesets.ts';
import { type Manifest, listBundles } from './format.ts';
import { readBundle } from './reader.ts';
import { restoreBundles } from './restore.ts';
import { verifyFolder } from './verify.ts';
import { beforeMigrate } from './migrate.ts';
import { recordOutcome, writeNext } from './writer.ts';

const USAGE = 'usage: quire backup now | quire backup verify [--dir D] | quire backup list [--dir D]';
/** The server may hold the write lock for a moment; wait instead of failing (as `quire compact` does). */
const BUSY_TIMEOUT_MS = 5000;

/** The command prints its own result; outcome messages go to standard error. */
const say = (msg: string, fields?: Record<string, unknown>) => console.error(fields ? `${msg} ${JSON.stringify(fields)}` : msg);
const stderrLog: Logger = { debug: () => undefined, info: say, warn: say, error: say };

/** `--name value` pairs and the remaining positional arguments. */
function parse(args: string[], flags: string[]): { values: Map<string, string>; rest: string[] } | null {
  const values = new Map<string, string>();
  const rest: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (!a.startsWith('--')) {
      rest.push(a);
      continue;
    }
    const v = args[i + 1];
    if (!flags.includes(a) || v === undefined) return null;
    values.set(a, v);
    i += 1;
  }
  return { values, rest };
}

/** `quire backup now|verify|list` (R-BAK-05). */
export async function backupCli(args: string[], config: Config): Promise<number> {
  const [cmd, ...more] = args;
  const parsed = parse(more, ['--dir']);
  if (!parsed || parsed.rest.length) {
    console.error(USAGE);
    return 2;
  }
  const dir = parsed.values.has('--dir') ? resolve(parsed.values.get('--dir')!) : config.backupDir;
  if (!dir) {
    console.error('quire backup: set QUIRE_BACKUP_DIR or pass --dir');
    return 2;
  }
  try {
    switch (cmd) {
      case 'verify':
        return await verify(dir);
      case 'list':
        return await list(dir);
      case 'now':
        return await now(config, dir);
      default:
        console.error(USAGE);
        return 2;
    }
  } catch (e) {
    console.error(`quire backup ${cmd}: ${e instanceof Error ? e.message : String(e)}`);
    return 1;
  }
}

async function verify(dir: string): Promise<number> {
  if (!existsSync(dir)) {
    console.error(`broken: ${dir}: no such folder`);
    return 1;
  }
  const r = await verifyFolder(dir);
  if (!r.ok) {
    console.log(`broken: ${r.file}: ${r.reason}`);
    return 1;
  }
  console.log('ok');
  console.log(`${r.bundles} bundles in ${r.chains} chain${r.chains === 1 ? '' : 's'}, up to revision ${r.lastRev}`);
  return 0;
}

async function list(dir: string): Promise<number> {
  for (const file of listBundles(dir)) {
    let m: Manifest | null = null;
    await readBundle(file, {
      onManifest: (manifest) => {
        m = manifest;
        return false;
      },
    }).catch(() => undefined);
    const info = m as Manifest | null;
    const detail = info
      ? `revisions ${info.firstRev}..${info.lastRev}  ${info.span.from ?? '-'} .. ${info.span.to ?? '-'}  ${info.paths.length} paths`
      : 'unreadable';
    console.log(`${String(file.seq).padStart(8, '0')}  ${file.kind.padEnd(11)}  ${detail}`);
  }
  return 0;
}

/** One bundle now, from the data folder; for a stopped server or a manual check. */
async function now(config: Config, dir: string): Promise<number> {
  const dbFile = join(config.dataDir, 'quire.db');
  if (!existsSync(dbFile)) {
    console.error(`quire backup now: no database at ${dbFile}`);
    return 1;
  }
  const store = new SqliteRevisionStore(dbFile, { beforeMigrate: beforeMigrate({ ...config, backupDir: dir }, dbFile) });
  try {
    store.db.exec(`PRAGMA busy_timeout = ${BUSY_TIMEOUT_MS}`);
    const sets = new ChangeSets(store.db, config.changesetGapMs);
    sets.assignPending();
    sets.closeQuiet();
    let outcome;
    try {
      outcome = await writeNext(store, config.dataDir, dir);
    } catch (e) {
      outcome = e instanceof Error ? e : new Error(String(e));
    }
    recordOutcome(store, stderrLog, outcome);
    if (outcome instanceof Error) throw outcome;
    console.log(outcome ? `wrote ${outcome.file.name} (revisions ${outcome.firstRev}..${outcome.lastRev})` : 'nothing new to back up');
    return 0;
  } finally {
    store.close();
  }
}

/** `quire restore <backup-dir> --to <data-dir> [--at <rev>]` (R-BAK-06). */
export async function restoreCli(args: string[], _config: Config): Promise<number> {
  const parsed = parse(args, ['--to', '--at']);
  const at = parsed?.values.get('--at');
  const to = parsed?.values.get('--to');
  if (!parsed || parsed.rest.length !== 1 || !to || (at !== undefined && !/^[1-9]\d*$/.test(at))) {
    console.error('usage: quire restore <backup-dir> --to <data-dir> [--at <rev>]');
    return 2;
  }
  try {
    const r = await restoreBundles(resolve(parsed.rest[0]!), resolve(to), at === undefined ? undefined : Number(at));
    console.log(`restored ${r.revisions} revisions up to revision ${r.lastRev} from ${r.bundles} bundles: ${r.notes} notes, ${r.files} files`);
    return 0;
  } catch (e) {
    console.error(`quire restore: ${e instanceof Error ? e.message : String(e)}`);
    return 1;
  }
}
