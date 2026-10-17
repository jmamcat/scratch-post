import type { DatabaseSync } from 'node:sqlite';
import type { ChangeSet } from '@quire/sync';

/** A change set closes at this size even while its device keeps typing (R-BAK-05). */
export const MAX_SET_REVISIONS = 500;

interface SetRow {
  id: number;
  device: string;
  first_rev: number;
  last_rev: number;
  started_at: string;
  ended_at: string;
  revisions: number;
  closed: number;
}

interface PendingRow {
  rev: number;
  device: string;
  created_at: string;
}

/**
 * Groups revisions into change sets (R-BAK-02). State lives only in the database, so the
 * server, `quire compact` and a restarted server all continue the same sets.
 */
export class ChangeSets {
  constructor(
    private readonly db: DatabaseSync,
    private readonly gapMs: number,
  ) {}

  /**
   * Assigns every revision without a change set, in revision order. Runs after every commit
   * and once at start (databases from schema version 1, commits made before the hook existed).
   */
  assignPending(): void {
    if (!this.db.prepare('SELECT 1 FROM revisions WHERE changeset IS NULL LIMIT 1').get()) return;
    this.transaction(() => {
      const pending = this.db
        .prepare('SELECT rev, device, created_at FROM revisions WHERE changeset IS NULL ORDER BY rev')
        .all() as unknown as PendingRow[];
      let open = this.open();
      for (const r of pending) {
        const gap = Date.parse(r.created_at) - Date.parse(open?.ended_at ?? '');
        if (open && open.device === r.device && gap < this.gapMs && open.revisions < MAX_SET_REVISIONS) {
          open.last_rev = r.rev;
          open.ended_at = r.created_at;
          open.revisions += 1;
          open.closed = open.revisions >= MAX_SET_REVISIONS ? 1 : 0;
          this.db
            .prepare('UPDATE changesets SET last_rev = ?, ended_at = ?, revisions = ?, closed = ? WHERE id = ?')
            .run(open.last_rev, open.ended_at, open.revisions, open.closed, open.id);
        } else {
          this.db.prepare('UPDATE changesets SET closed = 1 WHERE closed = 0').run();
          const res = this.db
            .prepare('INSERT INTO changesets (device, first_rev, last_rev, started_at, ended_at, revisions, closed) VALUES (?, ?, ?, ?, ?, 1, 0)')
            .run(r.device, r.rev, r.rev, r.created_at, r.created_at);
          open = { id: Number(res.lastInsertRowid), device: r.device, first_rev: r.rev, last_rev: r.rev, started_at: r.created_at, ended_at: r.created_at, revisions: 1, closed: 0 };
        }
        this.db.prepare('UPDATE revisions SET changeset = ? WHERE rev = ?').run(open.id, r.rev);
        if (open.closed) open = undefined;
      }
    });
  }

  /** Closes sets that have been quiet for the gap; returns how many closed. */
  closeQuiet(now = Date.now()): number {
    const cutoff = new Date(now - this.gapMs).toISOString();
    return Number(this.db.prepare('UPDATE changesets SET closed = 1 WHERE closed = 0 AND ended_at <= ?').run(cutoff).changes);
  }

  /** Closes the open set (if any) whatever its age: a restore always starts its own set. */
  closeOpen(): void {
    this.db.prepare('UPDATE changesets SET closed = 1 WHERE closed = 0').run();
  }

  close(id: number): void {
    this.db.prepare('UPDATE changesets SET closed = 1 WHERE id = ?').run(id);
  }

  /** The set a revision belongs to. */
  ofRevision(rev: number): ChangeSet | null {
    const row = this.db.prepare('SELECT changeset FROM revisions WHERE rev = ?').get(rev) as { changeset: number | null } | undefined;
    return row?.changeset ? this.get(row.changeset) : null;
  }

  get(id: number): ChangeSet | null {
    const row = this.db.prepare('SELECT * FROM changesets WHERE id = ?').get(id) as SetRow | undefined;
    return row ? this.toChangeSet(row) : null;
  }

  /** Newest first, `before` an id for paging. */
  list(limit: number, before?: number): ChangeSet[] {
    const rows = this.db
      .prepare('SELECT * FROM changesets WHERE id < ? ORDER BY id DESC LIMIT ?')
      .all(before ?? Number.MAX_SAFE_INTEGER, limit) as unknown as SetRow[];
    return rows.map((r) => this.toChangeSet(r));
  }

  private open(): SetRow | undefined {
    return this.db.prepare('SELECT * FROM changesets WHERE closed = 0 ORDER BY id DESC LIMIT 1').get() as SetRow | undefined;
  }

  private toChangeSet(r: SetRow): ChangeSet {
    const paths = this.db.prepare('SELECT DISTINCT path FROM revisions WHERE changeset = ? ORDER BY path').all(r.id) as { path: string }[];
    return {
      id: r.id,
      device: r.device,
      firstRev: r.first_rev,
      lastRev: r.last_rev,
      startedAt: r.started_at,
      endedAt: r.ended_at,
      paths: paths.map((p) => p.path),
      closed: r.closed === 1,
    };
  }

  /** BEGIN IMMEDIATE so a second process (`quire compact`) never assigns the same rows. */
  transaction<T>(fn: () => T): T {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const out = fn();
      this.db.exec('COMMIT');
      return out;
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }
  }
}
