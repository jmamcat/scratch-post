import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { CommitExtra, Conflict, ConflictStatus, DocMeta, RevisionStore } from '@quire/sync';
import { type MigrateOptions, migrate } from './schema.ts';

interface RevRow {
  rev: number;
  path: string;
  hash: string;
  deleted: number;
  device: string;
  created_at: string;
  kind: string;
  blob: string | null;
  size: number | null;
  renamed_from: string | null;
}

const toMeta = (r: RevRow): DocMeta => ({
  path: r.path,
  rev: r.rev,
  hash: r.hash,
  deleted: r.deleted === 1,
  device: r.device,
  createdAt: r.created_at,
  ...(r.kind === 'file' ? { kind: 'file' as const } : {}),
  ...(r.blob ? { blob: r.blob } : {}),
  ...(r.size !== null ? { size: r.size } : {}),
  ...(r.renamed_from ? { renamedFrom: r.renamed_from } : {}),
});

const META_COLS = 'r.rev, r.path, r.hash, r.deleted, r.device, r.created_at, r.kind, r.blob, r.size, r.renamed_from';

/** RevisionStore on node:sqlite (R-VLT-03). Synchronous by design: every call is one statement or one transaction. */
export class SqliteRevisionStore implements RevisionStore {
  readonly db: DatabaseSync;

  constructor(file: string, opts: MigrateOptions = {}) {
    if (file !== ':memory:') mkdirSync(dirname(file), { recursive: true });
    this.db = new DatabaseSync(file);
    this.db.exec('PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;');
    migrate(this.db, opts);
  }

  head(path: string): DocMeta | null {
    const row = this.db
      .prepare(`SELECT ${META_COLS} FROM heads h JOIN revisions r ON r.rev = h.rev WHERE h.path = ?`)
      .get(path) as RevRow | undefined;
    return row ? toMeta(row) : null;
  }

  text(rev: number): string | null {
    const row = this.db.prepare('SELECT text FROM revisions WHERE rev = ?').get(rev) as { text: string | null } | undefined;
    return row?.text ?? null;
  }

  revision(rev: number): DocMeta | null {
    const row = this.db.prepare(`SELECT ${META_COLS} FROM revisions r WHERE r.rev = ?`).get(rev) as RevRow | undefined;
    return row ? toMeta(row) : null;
  }

  commit(path: string, text: string | null, device: string, hash: string, extra: CommitExtra = {}): DocMeta {
    const createdAt = new Date().toISOString();
    const deleted = text === null && !(extra.kind === 'file' && extra.blob);
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const res = this.db
        .prepare(
          'INSERT INTO revisions (path, hash, text, deleted, device, created_at, kind, blob, size, renamed_from) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        )
        .run(path, hash, text, deleted ? 1 : 0, device, createdAt, extra.kind ?? 'note', extra.blob ?? null, extra.size ?? null, extra.renamedFrom ?? null);
      const rev = Number(res.lastInsertRowid);
      this.db.prepare('INSERT INTO heads (path, rev) VALUES (?, ?) ON CONFLICT(path) DO UPDATE SET rev = excluded.rev').run(path, rev);
      this.db.exec('COMMIT');
      return { path, rev, hash, deleted, device, createdAt, ...extra };
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }
  }

  changesSince(rev: number): DocMeta[] {
    const rows = this.db
      .prepare(`SELECT ${META_COLS} FROM heads h JOIN revisions r ON r.rev = h.rev WHERE h.rev > ? ORDER BY h.rev`)
      .all(rev) as unknown as RevRow[];
    return rows.map(toMeta);
  }

  headRev(): number {
    const row = this.db.prepare('SELECT MAX(rev) AS rev FROM revisions').get() as { rev: number | null };
    return row.rev ?? 0;
  }

  /** Newest first. Follows renames: revisions made under earlier names come after (R-VLT-09). */
  history(path: string): DocMeta[] {
    const out: DocMeta[] = [];
    const seen = new Set<string>();
    let current: string | null = path;
    let before = Number.MAX_SAFE_INTEGER;
    while (current && !seen.has(current)) {
      seen.add(current);
      const rows = this.db
        .prepare(`SELECT ${META_COLS} FROM revisions r WHERE r.path = ? AND r.rev < ? ORDER BY r.rev DESC`)
        .all(current, before) as unknown as RevRow[];
      // Only the stretch since this path was last created by a rename belongs to this name.
      let next: string | null = null;
      for (const row of rows) {
        const meta = toMeta(row);
        // The deletion that a rename leaves behind is not part of the renamed note's story.
        if (out.length && meta.deleted && current !== path) continue;
        out.push(meta);
        if (meta.renamedFrom) {
          next = meta.renamedFrom;
          before = meta.rev;
          break;
        }
      }
      current = next;
    }
    return out;
  }

  heads(): DocMeta[] {
    return this.changesSince(0);
  }

  saveConflict(c: Conflict): void {
    this.db
      .prepare(
        'INSERT INTO conflicts (id, path, status, created_at, data) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET status = excluded.status, data = excluded.data',
      )
      .run(c.id, c.path, c.status, c.createdAt, JSON.stringify(c));
  }

  getConflict(id: string): Conflict | null {
    const row = this.db.prepare('SELECT data FROM conflicts WHERE id = ?').get(id) as { data: string } | undefined;
    return row ? (JSON.parse(row.data) as Conflict) : null;
  }

  listConflicts(status?: ConflictStatus): Conflict[] {
    const rows = (
      status
        ? this.db.prepare('SELECT data FROM conflicts WHERE status = ? ORDER BY created_at DESC').all(status)
        : this.db.prepare('SELECT data FROM conflicts ORDER BY created_at DESC').all()
    ) as { data: string }[];
    return rows.map((r) => JSON.parse(r.data) as Conflict);
  }

  getKv(key: string): string | null {
    const row = this.db.prepare('SELECT value FROM kv WHERE key = ?').get(key) as { value: string } | undefined;
    return row?.value ?? null;
  }

  setKv(key: string, value: string): void {
    this.db.prepare('INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, value);
  }

  deleteKv(key: string): void {
    this.db.prepare('DELETE FROM kv WHERE key = ?').run(key);
  }

  kvKeys(prefix: string): string[] {
    const rows = this.db.prepare('SELECT key FROM kv WHERE substr(key, 1, ?) = ?').all(prefix.length, prefix) as { key: string }[];
    return rows.map((r) => r.key);
  }

  close(): void {
    this.db.close();
  }
}
