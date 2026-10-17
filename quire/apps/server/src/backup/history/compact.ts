import { rmSync } from 'node:fs';
import type { DatabaseSync } from 'node:sqlite';
import { blobPath } from '../../vault/index.ts';
import type { ChangeSets } from './changesets.ts';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface CompactOptions {
  dataDir: string;
  gapMs: number;
  keepAllDays: number;
  /** Backups are on: revisions not yet in a bundle stay. */
  backupsOn: boolean;
  now?: number;
}

export interface CompactResult {
  changesets: number;
  revisions: number;
  /** Removed revisions per path. */
  paths: Record<string, number>;
  blobs: number;
  blobBytes: number;
}

interface RevRow {
  rev: number;
  path: string;
  renamed_from: string | null;
}

/**
 * History compaction (R-BAK-04): in change sets that are closed and older than the keep-all
 * window, keep only the last revision of each path. Heads, revisions a conflict refers to and
 * revisions not yet backed up always stay.
 */
export function compactHistory(db: DatabaseSync, sets: ChangeSets, opts: CompactOptions): CompactResult {
  const now = opts.now ?? Date.now();
  const result: CompactResult = { changesets: 0, revisions: 0, paths: {}, blobs: 0, blobBytes: 0 };
  sets.assignPending();
  sets.closeQuiet(now);
  const removedBlobs = sets.transaction(() => {
    const keep = protectedRevs(db, opts.backupsOn);
    const endedBefore = new Date(now - opts.keepAllDays * DAY_MS).toISOString();
    const eligible = db.prepare('SELECT id FROM changesets WHERE closed = 1 AND ended_at < ? ORDER BY id').all(endedBefore) as { id: number }[];
    for (const { id } of eligible) {
      const removed = compactSet(db, id, keep);
      if (!removed.length) continue;
      result.changesets += 1;
      result.revisions += removed.length;
      for (const r of removed) result.paths[r.path] = (result.paths[r.path] ?? 0) + 1;
      db.prepare('UPDATE changesets SET revisions = (SELECT COUNT(*) FROM revisions WHERE changeset = ?) WHERE id = ?').run(id, id);
    }
    // A blob uploaded moments ago may be waiting for its revision: leave the newest ones alone.
    const blobs = db
      .prepare('SELECT hash, size FROM blobs b WHERE created_at < ? AND NOT EXISTS (SELECT 1 FROM revisions r WHERE r.blob = b.hash)')
      .all(new Date(now - opts.gapMs).toISOString()) as { hash: string; size: number }[];
    for (const b of blobs) db.prepare('DELETE FROM blobs WHERE hash = ?').run(b.hash);
    return blobs;
  });
  for (const b of removedBlobs) {
    rmSync(blobPath(opts.dataDir, b.hash), { force: true });
    result.blobs += 1;
    result.blobBytes += b.size;
  }
  return result;
}

/** Deletes every revision of set `id` except the last per path and the protected ones. */
function compactSet(db: DatabaseSync, id: number, keep: (rev: number) => boolean): RevRow[] {
  const rows = db.prepare('SELECT rev, path, renamed_from FROM revisions WHERE changeset = ? ORDER BY rev').all(id) as unknown as RevRow[];
  const byPath = new Map<string, RevRow[]>();
  for (const r of rows) byPath.set(r.path, [...(byPath.get(r.path) ?? []), r]);
  const removed: RevRow[] = [];
  for (const revs of byPath.values()) {
    const last = revs.at(-1)!;
    let renamedFrom: string | null = null;
    for (const r of revs.slice(0, -1)) {
      if (keep(r.rev)) {
        if (r.renamed_from) renamedFrom = null;
        continue;
      }
      if (r.renamed_from) renamedFrom = r.renamed_from;
      db.prepare('DELETE FROM revisions WHERE rev = ?').run(r.rev);
      removed.push(r);
    }
    // History follows renames through `renamed_from`: the kept revision inherits the link.
    if (renamedFrom && !last.renamed_from) db.prepare('UPDATE revisions SET renamed_from = ? WHERE rev = ?').run(renamedFrom, last.rev);
  }
  return removed;
}

function protectedRevs(db: DatabaseSync, backupsOn: boolean): (rev: number) => boolean {
  const revs = new Set<number>();
  for (const h of db.prepare('SELECT rev FROM heads').all() as { rev: number }[]) revs.add(h.rev);
  for (const c of db.prepare('SELECT data FROM conflicts').all() as { data: string }[]) {
    try {
      const d = JSON.parse(c.data) as { rev?: number; resolvedRev?: number; current?: { rev?: number } };
      for (const r of [d.rev, d.resolvedRev, d.current?.rev]) if (typeof r === 'number') revs.add(r);
    } catch {
      // An unreadable conflict protects nothing it could name; the rest still applies.
    }
  }
  const backedUp = backupsOn
    ? ((db.prepare('SELECT MAX(last_rev) AS rev FROM backups').get() as { rev: number | null }).rev ?? 0)
    : Number.POSITIVE_INFINITY;
  return (rev) => revs.has(rev) || rev > backedUp;
}

export function describe(r: CompactResult): string[] {
  const lines = [`removed ${r.revisions} revisions from ${r.changesets} change sets, ${r.blobs} files (${r.blobBytes} bytes)`];
  for (const [path, n] of Object.entries(r.paths).sort(([a], [b]) => (a < b ? -1 : 1))) lines.push(`  ${path}: ${n} revisions`);
  return lines;
}
