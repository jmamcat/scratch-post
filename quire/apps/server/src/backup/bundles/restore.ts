import { randomBytes } from 'node:crypto';
import { copyFileSync, createWriteStream, existsSync, mkdirSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { DatabaseSync } from 'node:sqlite';
import { SqliteRevisionStore, blobPath } from '../../vault/index.ts';
import { type ContentEntry, type Manifest, type BundleFile, listBundles } from './format.ts';
import { collect } from './reader.ts';
import { conflictRevs } from './plan.ts';
import { newestChain, walkChains } from './verify.ts';

export interface RestoreResult {
  bundles: number;
  revisions: number;
  notes: number;
  files: number;
  lastRev: number;
}

/**
 * Rebuilds a data folder from the newest chain in `backupDir` (R-BAK-06): checks the whole
 * chain first, then writes `quire.db` (latest schema), the blob folder and the vault folder.
 * With `at`, only revisions up to it are restored; heads are the newest revision per path at or
 * below it. The target must be empty; on failure it is emptied again.
 */
export async function restoreBundles(backupDir: string, target: string, at?: number): Promise<RestoreResult> {
  if (existsSync(target) && readdirSync(target).length) throw new Error(`${target} is not empty`);
  const chain = newestChain(listBundles(backupDir));
  if (!chain.length) throw new Error(`no full backup bundle in ${backupDir}`);
  const opts = at === undefined ? {} : { at };
  await walkChains(chain, opts);

  mkdirSync(target, { recursive: true });
  try {
    const store = new SqliteRevisionStore(join(target, 'quire.db'));
    try {
      const result = await rebuild(store.db, chain, target, at);
      const written = writeVault(store, target);
      return { ...result, ...written };
    } finally {
      store.close();
    }
  } catch (e) {
    for (const name of readdirSync(target)) rmSync(join(target, name), { recursive: true, force: true });
    throw e;
  }
}

async function rebuild(db: DatabaseSync, chain: BundleFile[], target: string, at: number | undefined): Promise<RestoreResult> {
  const limit = at ?? Number.MAX_SAFE_INTEGER;
  const result: RestoreResult = { bundles: 0, revisions: 0, notes: 0, files: 0, lastRev: 0 };
  let texts = new Map<string, string>();
  let wanted = { texts: new Set<string>(), blobs: new Set<string>() };
  await walkChains(chain, {
    ...(at === undefined ? {} : { at }),
    onManifest: (_file, m) => {
      const keep = m.revisions.filter((r) => r.rev <= limit);
      wanted = {
        texts: new Set(keep.flatMap((r) => (r.text ? [r.text] : []))),
        blobs: new Set(keep.flatMap((r) => (r.blob ? [r.blob] : []))),
      };
      texts = new Map();
    },
    onEntry: async (_file, entry, bytes) => {
      if (entry.type === 'text' && wanted.texts.has(entry.key)) texts.set(entry.key, await collect(bytes));
      if (entry.type === 'blob' && wanted.blobs.has(entry.key)) await writeBlob(target, entry, bytes);
    },
    onBundle: (_file, m) => {
      insertBundle(db, m, texts, limit);
      result.bundles += 1;
      result.revisions += m.revisions.filter((r) => r.rev <= limit).length;
      result.lastRev = Math.max(result.lastRev, Math.min(m.lastRev, limit));
    },
  });
  finish(db, limit);
  return result;
}

async function writeBlob(target: string, entry: ContentEntry, bytes: AsyncIterable<Buffer>): Promise<void> {
  const file = blobPath(target, entry.key);
  mkdirSync(dirname(file), { recursive: true });
  const tmp = join(dirname(file), `.quire-${randomBytes(6).toString('hex')}.tmp`);
  await pipeline(Readable.from(bytes), createWriteStream(tmp));
  renameSync(tmp, file);
}

function insertBundle(db: DatabaseSync, m: Manifest, texts: Map<string, string>, limit: number): void {
  db.exec('BEGIN IMMEDIATE');
  try {
    const rev = db.prepare(
      'INSERT INTO revisions (rev, path, hash, text, deleted, device, created_at, kind, blob, size, renamed_from, changeset) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    );
    for (const r of m.revisions) {
      if (r.rev > limit) continue;
      const text = r.text === null ? null : texts.get(r.text);
      if (text === undefined) throw new Error(`the text of revision ${r.rev} is missing`);
      rev.run(r.rev, r.path, r.hash, text, r.deleted ? 1 : 0, r.device, r.createdAt, r.kind, r.blob, r.size, r.renamedFrom, r.changeset);
    }
    const set = db.prepare(
      'INSERT OR REPLACE INTO changesets (id, device, first_rev, last_rev, started_at, ended_at, revisions, closed) VALUES (?, ?, ?, ?, ?, ?, ?, 1)',
    );
    for (const s of m.changesetRows) if (s.firstRev <= limit) set.run(s.id, s.device, s.firstRev, s.lastRev, s.startedAt, s.endedAt, s.revisions);
    const blob = db.prepare('INSERT OR IGNORE INTO blobs (hash, size, mime, created_at) VALUES (?, ?, ?, ?)');
    for (const c of m.content) if (c.type === 'blob') blob.run(c.key, c.size, c.mime ?? null, c.createdAt ?? m.createdAt);
    const conflict = db.prepare(
      'INSERT INTO conflicts (id, path, status, created_at, data) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET status = excluded.status, data = excluded.data',
    );
    for (const c of m.conflicts) conflict.run(c.id, c.path, c.status, c.createdAt, c.data);
    // Each bundle carries the whole token table: the newest one restored wins.
    db.exec('DELETE FROM tokens');
    const token = db.prepare('INSERT INTO tokens (name, hash, created_at, last_used_at, revoked_at) VALUES (?, ?, ?, ?, ?)');
    for (const t of m.tokens) token.run(t.name, t.hash, t.createdAt, t.lastUsedAt, t.revokedAt);
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

/** Heads, the change set cut by `--at`, and conflicts about revisions that were not restored. */
function finish(db: DatabaseSync, limit: number): void {
  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare(
      `UPDATE changesets SET last_rev = ?,
         ended_at = COALESCE((SELECT MAX(created_at) FROM revisions WHERE changeset = changesets.id), ended_at)
       WHERE last_rev > ?`,
    ).run(limit, limit);
    db.exec('UPDATE changesets SET revisions = (SELECT COUNT(*) FROM revisions WHERE changeset = changesets.id)');
    for (const c of db.prepare('SELECT id, data FROM conflicts').all() as { id: string; data: string }[]) {
      if (conflictRevs(c.data).some((r) => r > limit)) db.prepare('DELETE FROM conflicts WHERE id = ?').run(c.id);
    }
    db.exec('DELETE FROM heads');
    db.exec('INSERT INTO heads (path, rev) SELECT path, MAX(rev) FROM revisions GROUP BY path');
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

/** The vault folder the server would mirror: note heads as Markdown, file heads copied from their blob. */
function writeVault(store: SqliteRevisionStore, target: string): { notes: number; files: number } {
  const counts = { notes: 0, files: 0 };
  const vault = join(target, 'vault');
  mkdirSync(vault, { recursive: true });
  for (const head of store.heads()) {
    if (head.deleted) continue;
    const file = resolve(vault, head.path);
    if (!file.startsWith(resolve(vault) + sep)) throw new Error(`path escapes the vault: ${head.path}`);
    mkdirSync(dirname(file), { recursive: true });
    if (head.kind === 'file') {
      if (!head.blob) continue;
      copyFileSync(blobPath(target, head.blob), file);
      counts.files += 1;
    } else {
      writeFileSync(file, store.text(head.rev) ?? '', 'utf8');
      counts.notes += 1;
    }
  }
  return counts;
}
