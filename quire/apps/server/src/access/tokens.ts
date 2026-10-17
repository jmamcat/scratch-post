import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { sha256 } from '../shared/hash.ts';

/** `QUIRE_TOKEN` is always valid under this name and never stored (R-ACC-02). */
export const ADMIN = 'admin';
const NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
/** Writing `last_used_at` on every request would turn reads into writes; once a minute is enough. */
const TOUCH_EVERY_MS = 60_000;

export interface TokenRow {
  name: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
}

interface Entry {
  name: string;
  hash: Buffer;
  revoked: boolean;
}

export const newSecret = () => randomBytes(32).toString('base64url');
const hashOf = (token: string) => Buffer.from(sha256(token), 'hex');

/**
 * The `tokens` table seen from the server process. The CLI writes it from another process,
 * so the cache is re-read whenever SQLite reports another connection committed
 * (`PRAGMA data_version`, one cheap read) - a revocation counts from the next request.
 */
export class TokenTable {
  private entries: Entry[] = [];
  private version = -1;
  private readonly admin: Buffer | null;
  private readonly touched = new Map<string, number>();

  constructor(
    private readonly db: DatabaseSync,
    adminToken: string | undefined,
    private readonly onRevoked: (name: string) => void,
  ) {
    this.admin = adminToken ? hashOf(adminToken) : null;
    this.refresh();
  }

  /** Re-read the table if another connection changed the database; report newly revoked names. */
  refresh(): void {
    const v = (this.db.prepare('PRAGMA data_version').get() as { data_version: number }).data_version;
    if (v === this.version) return;
    this.version = v;
    const rows = this.db.prepare('SELECT name, hash, revoked_at FROM tokens').all() as { name: string; hash: string; revoked_at: string | null }[];
    const before = new Map(this.entries.map((e) => [e.name, e]));
    this.entries = rows.map((r) => ({ name: r.name, hash: Buffer.from(r.hash, 'hex'), revoked: r.revoked_at !== null }));
    const live = new Set(this.entries.filter((e) => !e.revoked).map((e) => e.name));
    for (const old of before.values()) if (!old.revoked && !live.has(old.name)) this.onRevoked(old.name);
  }

  /** True when a token row exists (revoked or not): the owner has set access up. */
  any(): boolean {
    return this.entries.length > 0;
  }

  /** Name of the token, or null. Every candidate is compared, in constant time each. */
  verify(token: string): string | null {
    this.refresh();
    const h = hashOf(token);
    let found: string | null = null;
    if (this.admin && timingSafeEqual(h, this.admin)) found = ADMIN;
    for (const e of this.entries) {
      if (e.hash.length === h.length && timingSafeEqual(h, e.hash) && !e.revoked && found === null) found = e.name;
    }
    if (found && found !== ADMIN) this.touch(found);
    return found;
  }

  private touch(name: string): void {
    const now = Date.now();
    if (now - (this.touched.get(name) ?? 0) < TOUCH_EVERY_MS) return;
    this.touched.set(name, now);
    try {
      this.db.prepare('UPDATE tokens SET last_used_at = ? WHERE name = ?').run(new Date(now).toISOString(), name);
    } catch {
      // The CLI holds the write lock for a moment: the timestamp is advisory, try next time.
    }
  }
}

/** Table operations for `quire tokens`; each throws an Error whose message is for the person. */
export const tokenAdmin = {
  add(db: DatabaseSync, name: string, token: string, maxTokens: number): void {
    if (!NAME.test(name)) throw new Error(`invalid token name "${name}" (letters, digits, ".", "_" and "-", up to 64)`);
    if (name === ADMIN) throw new Error(`"${ADMIN}" is reserved for QUIRE_TOKEN`);
    if (token.length < 8) throw new Error('a token needs at least 8 characters');
    if (db.prepare('SELECT 1 FROM tokens WHERE name = ?').get(name)) throw new Error(`a token named "${name}" already exists`);
    const hash = sha256(token);
    if (db.prepare('SELECT 1 FROM tokens WHERE hash = ?').get(hash)) throw new Error('that token is already in use');
    const active = (db.prepare('SELECT COUNT(*) AS n FROM tokens WHERE revoked_at IS NULL').get() as { n: number }).n;
    if (active >= maxTokens) throw new Error(`at most ${maxTokens} tokens: revoke one first`);
    db.prepare('INSERT INTO tokens (name, hash, created_at) VALUES (?, ?, ?)').run(name, hash, new Date().toISOString());
  },

  list(db: DatabaseSync): TokenRow[] {
    return db.prepare('SELECT name, created_at, last_used_at, revoked_at FROM tokens ORDER BY created_at, name').all() as unknown as TokenRow[];
  },

  revoke(db: DatabaseSync, name: string): void {
    const row = db.prepare('SELECT revoked_at FROM tokens WHERE name = ?').get(name) as { revoked_at: string | null } | undefined;
    if (!row) throw new Error(`no token named "${name}"`);
    if (row.revoked_at) return;
    db.prepare('UPDATE tokens SET revoked_at = ? WHERE name = ?').run(new Date().toISOString(), name);
  },
};
