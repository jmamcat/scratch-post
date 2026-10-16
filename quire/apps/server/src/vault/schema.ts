import type { DatabaseSync } from 'node:sqlite';

/** Ordered schema migrations (R-BAK-01). Append only: never edit a released version. */
const MIGRATIONS: { version: number; sql: string }[] = [
  {
    version: 1,
    sql: `
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
    `,
  },
  {
    // Change 0003: attachments, renames, change sets, access tokens, backup bundles.
    version: 2,
    sql: `
      ALTER TABLE revisions ADD COLUMN kind TEXT NOT NULL DEFAULT 'note';
      ALTER TABLE revisions ADD COLUMN blob TEXT;
      ALTER TABLE revisions ADD COLUMN size INTEGER;
      ALTER TABLE revisions ADD COLUMN renamed_from TEXT;
      ALTER TABLE revisions ADD COLUMN changeset INTEGER;
      CREATE INDEX revisions_changeset ON revisions (changeset);
      CREATE INDEX revisions_blob ON revisions (blob);
      CREATE TABLE changesets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device TEXT NOT NULL,
        first_rev INTEGER NOT NULL,
        last_rev INTEGER NOT NULL,
        started_at TEXT NOT NULL,
        ended_at TEXT NOT NULL,
        revisions INTEGER NOT NULL DEFAULT 0,
        closed INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE blobs (hash TEXT PRIMARY KEY, size INTEGER NOT NULL, mime TEXT, created_at TEXT NOT NULL);
      CREATE TABLE tokens (
        name TEXT PRIMARY KEY,
        hash TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL,
        last_used_at TEXT,
        revoked_at TEXT
      );
      CREATE TABLE backups (
        seq INTEGER PRIMARY KEY,
        kind TEXT NOT NULL,
        file TEXT NOT NULL,
        sha256 TEXT NOT NULL,
        prev_sha256 TEXT,
        first_rev INTEGER,
        last_rev INTEGER,
        created_at TEXT NOT NULL
      );
    `,
  },
];

export const SCHEMA_VERSION = MIGRATIONS.at(-1)!.version;

export interface MigrateOptions {
  /** Called once before pending migrations run on an existing database (backups hook in here). */
  beforeMigrate?: (from: number, to: number) => void;
}

export function schemaVersion(db: DatabaseSync): number {
  const v = (db.prepare('PRAGMA user_version').get() as { user_version: number }).user_version;
  if (v > 0) return v;
  // Databases from before versioning have the tables but user_version 0: that is version 1.
  const legacy = db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'revisions'").get();
  return legacy ? 1 : 0;
}

/** Brings the database to SCHEMA_VERSION, one transaction per migration. */
export function migrate(db: DatabaseSync, opts: MigrateOptions = {}): void {
  const current = schemaVersion(db);
  if (current > SCHEMA_VERSION) {
    throw new Error(`database has a newer schema (version ${current}) than this server knows (version ${SCHEMA_VERSION})`);
  }
  const pending = MIGRATIONS.filter((m) => m.version > current);
  if (!pending.length) return;
  if (current > 0) opts.beforeMigrate?.(current, SCHEMA_VERSION);
  for (const m of pending) {
    db.exec('BEGIN IMMEDIATE');
    try {
      db.exec(m.sql);
      db.exec(`PRAGMA user_version = ${m.version}`);
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  }
}
