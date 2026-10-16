import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { Conflict, ConflictStatus, DocMeta, RevisionStore } from '@quire/sync';

interface RevRow {
  rev: number;
  path: string;
  hash: string;
  deleted: number;
  device: string;
  created_at: string;
}

const toMeta = (r: RevRow): DocMeta => ({
  path: r.path,
  rev: r.rev,
  hash: r.hash,
  deleted: r.deleted === 1,
  device: r.device,
  createdAt: r.created_at,
});

const META_COLS = 'r.rev, r.path, r.hash, r.deleted, r.device, r.created_at';

/** RevisionStore on node:sqlite (R-VLT-03). Synchronous by design: every call is one statement or one transaction. */
export class SqliteRevisionStore implements RevisionStore {
  readonly db: DatabaseSync;

  constructor(file: string) {
    if (file !== ':memory:') mkdirSync(dirname(file), { recursive: true });
    this.db = new DatabaseSync(file);
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;
      CREATE TABLE IF NOT EXISTS revisions (
        rev INTEGER PRIMARY KEY AUTOINCREMENT,
        path TEXT NOT NULL,
        hash TEXT NOT NULL,
        text TEXT,
        deleted INTEGER NOT NULL,
        device TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS revisions_path ON revisions (path, rev);
      CREATE TABLE IF NOT EXISTS heads (path TEXT PRIMARY KEY, rev INTEGER NOT NULL);
      CREATE INDEX IF NOT EXISTS heads_rev ON heads (rev);
      CREATE TABLE IF NOT EXISTS conflicts (
        id TEXT PRIMARY KEY,
        path TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        data TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    `);
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

  commit(path: string, text: string | null, device: string, hash: string): DocMeta {
    const createdAt = new Date().toISOString();
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const res = this.db
        .prepare('INSERT INTO revisions (path, hash, text, deleted, device, created_at) VALUES (?, ?, ?, ?, ?, ?)')
        .run(path, hash, text, text === null ? 1 : 0, device, createdAt);
      const rev = Number(res.lastInsertRowid);
      this.db.prepare('INSERT INTO heads (path, rev) VALUES (?, ?) ON CONFLICT(path) DO UPDATE SET rev = excluded.rev').run(path, rev);
      this.db.exec('COMMIT');
      return { path, rev, hash, deleted: text === null, device, createdAt };
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

  history(path: string): DocMeta[] {
    const rows = this.db
      .prepare(`SELECT ${META_COLS} FROM revisions r WHERE r.path = ? ORDER BY r.rev DESC`)
      .all(path) as unknown as RevRow[];
    return rows.map(toMeta);
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
