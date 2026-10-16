import { createReadStream, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import { blobPath } from '../../vault/index.ts';
import {
  type BundleKind,
  type ChangeSetRecord,
  type ConflictRecord,
  type ContentEntry,
  type ContentSource,
  type Manifest,
  type RevisionRecord,
  type TokenRecord,
  textBytes,
  textKey,
} from './format.ts';

const DAY_MS = 24 * 60 * 60 * 1000;
/** A new chain (full bundle) starts after this long or this many incremental bundles (R-BAK-05). */
export const FULL_EVERY_MS = 7 * DAY_MS;
export const FULL_EVERY_INCREMENTALS = 200;

export interface BackupRow {
  seq: number;
  kind: BundleKind;
  file: string;
  sha256: string;
  prev_sha256: string | null;
  first_rev: number | null;
  last_rev: number | null;
  created_at: string;
}

interface RevRow {
  rev: number;
  path: string;
  hash: string;
  text: string | null;
  deleted: number;
  device: string;
  created_at: string;
  kind: string;
  blob: string | null;
  size: number | null;
  renamed_from: string | null;
  changeset: number | null;
}

interface SetRow {
  id: number;
  device: string;
  first_rev: number;
  last_rev: number;
  started_at: string;
  ended_at: string;
  revisions: number;
}

export interface Plan {
  manifest: Manifest;
  sources: ContentSource[];
}

/**
 * The last revision a bundle may hold: the end of the newest closed change set such that every
 * revision up to it belongs to a closed set. Open sets and unassigned revisions stay out.
 */
export function bundleableRev(db: DatabaseSync): number {
  const q = (sql: string) => (db.prepare(sql).get() as { r: number | null }).r;
  let limit = q('SELECT MAX(last_rev) AS r FROM changesets WHERE closed = 1') ?? 0;
  const open = q('SELECT MIN(first_rev) AS r FROM changesets WHERE closed = 0');
  const unassigned = q('SELECT MIN(rev) AS r FROM revisions WHERE changeset IS NULL');
  for (const bound of [open, unassigned]) if (bound !== null) limit = Math.min(limit, bound - 1);
  return Math.max(0, limit);
}

export function lastBackup(db: DatabaseSync): BackupRow | undefined {
  return db.prepare('SELECT * FROM backups ORDER BY seq DESC LIMIT 1').get() as BackupRow | undefined;
}

/**
 * Decides what to write next: a full bundle when there is no chain to continue (none yet, or
 * its newest file is gone from the folder), an incremental one for change sets that closed since
 * the newest bundle, and a full one instead once the chain is 7 days or 200 incrementals old.
 * Returns null when there is nothing to write.
 */
export function nextKind(db: DatabaseSync, dir: string, now: number): { kind: BundleKind; after: BackupRow | undefined } | null {
  const last = lastBackup(db);
  if (!last || !existsSync(join(dir, last.file))) return { kind: 'full', after: undefined };
  if (bundleableRev(db) <= (last.last_rev ?? 0)) return null;
  const full = db.prepare("SELECT * FROM backups WHERE kind = 'full' ORDER BY seq DESC LIMIT 1").get() as BackupRow | undefined;
  const incrementals = full ? Number((db.prepare('SELECT COUNT(*) AS n FROM backups WHERE seq > ?').get(full.seq) as { n: number }).n) : 0;
  const stale = !full || now - Date.parse(full.created_at) >= FULL_EVERY_MS || incrementals >= FULL_EVERY_INCREMENTALS;
  return { kind: stale ? 'full' : 'incremental', after: last };
}

/**
 * Reads everything one bundle holds in a single read transaction, so the rows agree with each
 * other even while `quire compact` runs in another process. Blob bytes are streamed later.
 */
export function planBundle(db: DatabaseSync, dataDir: string, kind: BundleKind, seq: number, after: BackupRow | undefined): Plan {
  db.exec('BEGIN');
  try {
    const lastRev = bundleableRev(db);
    const firstRev = kind === 'full' ? 1 : (after?.last_rev ?? 0) + 1;
    const revs = db.prepare('SELECT * FROM revisions WHERE rev >= ? AND rev <= ? ORDER BY rev').all(firstRev, lastRev) as unknown as RevRow[];
    const sets = db
      .prepare('SELECT * FROM changesets WHERE closed = 1 AND last_rev >= ? AND last_rev <= ? ORDER BY id')
      .all(firstRev, lastRev) as unknown as SetRow[];
    const paths = new Set(revs.map((r) => r.path));
    const conflicts = (db.prepare('SELECT * FROM conflicts ORDER BY created_at').all() as unknown as (ConflictRecord & { created_at: string })[])
      .filter((c) => kind === 'full' || paths.has(c.path) || conflictRevs(c.data).some((r) => r >= firstRev && r <= lastRev))
      .map((c) => ({ id: c.id, path: c.path, status: c.status, createdAt: c.created_at, data: c.data }));
    const tokens = (db.prepare('SELECT * FROM tokens ORDER BY name').all() as Record<string, string | null>[]).map(
      (t): TokenRecord => ({ name: t.name!, hash: t.hash!, createdAt: t.created_at!, lastUsedAt: t.last_used_at ?? null, revokedAt: t.revoked_at ?? null }),
    );
    // Blobs an earlier bundle of this chain holds are referenced by a revision at or before its end.
    const known = db.prepare('SELECT 1 FROM revisions WHERE blob = ? AND rev < ? LIMIT 1');
    const blobMeta = db.prepare('SELECT size, mime, created_at FROM blobs WHERE hash = ?');

    const content: ContentEntry[] = [];
    const sources: ContentSource[] = [];
    // Keyed per type: a file whose bytes equal a note's text is still stored as a blob with its type.
    const seenTexts = new Set<string>();
    const seenBlobs = new Set<string>();
    const records: RevisionRecord[] = revs.map((r) => {
      let textRef: string | null = null;
      if (r.text !== null) {
        textRef = textKey(r.text);
        if (!seenTexts.has(textRef)) {
          seenTexts.add(textRef);
          const entry: ContentEntry = { key: textRef, type: 'text', size: Buffer.byteLength(r.text, 'utf8') };
          const text = r.text;
          content.push(entry);
          sources.push({ entry, bytes: () => textBytes(text) });
        }
      }
      if (r.blob && !seenBlobs.has(r.blob) && (kind === 'full' || !known.get(r.blob, firstRev))) {
        seenBlobs.add(r.blob);
        const file = blobPath(dataDir, r.blob);
        if (!existsSync(file)) throw new Error(`the bytes of ${r.path} (blob ${r.blob}) are missing from ${file}`);
        const meta = blobMeta.get(r.blob) as { size: number; mime: string | null; created_at: string } | undefined;
        const entry: ContentEntry = { key: r.blob, type: 'blob', size: statSync(file).size, mime: meta?.mime ?? null, createdAt: meta?.created_at ?? r.created_at };
        content.push(entry);
        sources.push({ entry, bytes: () => createReadStream(file) });
      }
      return {
        rev: r.rev,
        path: r.path,
        hash: r.hash,
        text: textRef,
        deleted: r.deleted === 1,
        device: r.device,
        createdAt: r.created_at,
        kind: r.kind,
        blob: r.blob,
        size: r.size,
        renamedFrom: r.renamed_from,
        changeset: r.changeset,
      };
    });
    const changesetRows = sets.map(
      (s): ChangeSetRecord => ({ id: s.id, device: s.device, firstRev: s.first_rev, lastRev: s.last_rev, startedAt: s.started_at, endedAt: s.ended_at, revisions: s.revisions }),
    );
    const times = sets.flatMap((s) => [s.started_at, s.ended_at]).sort();
    const manifest: Manifest = {
      format: 'quire-bundle',
      version: 1,
      kind,
      seq,
      prevSha256: kind === 'full' ? null : (after?.sha256 ?? null),
      createdAt: new Date().toISOString(),
      firstRev,
      lastRev,
      span: { from: times[0] ?? null, to: times.at(-1) ?? null },
      devices: [...new Set(revs.map((r) => r.device))].sort(),
      paths: [...paths].sort(),
      changesets: sets.map((s) => s.id),
      revisions: records,
      changesetRows,
      conflicts,
      tokens,
      content,
    };
    db.exec('COMMIT');
    return { manifest, sources };
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

/** Revisions a conflict names (the same fields compaction protects). */
export function conflictRevs(data: string): number[] {
  try {
    const d = JSON.parse(data) as { rev?: unknown; resolvedRev?: unknown; current?: { rev?: unknown } };
    return [d.rev, d.resolvedRev, d.current?.rev].filter((r): r is number => typeof r === 'number');
  } catch {
    return [];
  }
}
