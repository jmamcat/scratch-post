import type { LocalDoc, LocalStore } from '@quire/sync';
import { type DBSchema, type IDBPDatabase, openDB } from 'idb';

interface QuireDB extends DBSchema {
  docs: { key: string; value: LocalDoc };
  meta: { key: string; value: unknown };
}

const VERSION = 1;

/** IndexedDB-backed local copy of the vault (R-SYN-01). Database `quire`, stores `docs` and `meta`. */
export class IdbLocalStore implements LocalStore {
  private readonly db: Promise<IDBPDatabase<QuireDB>>;

  constructor(readonly name = 'quire') {
    this.db = openDB<QuireDB>(name, VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('docs')) db.createObjectStore('docs', { keyPath: 'path' });
        if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta');
      },
    });
  }

  async get(path: string): Promise<LocalDoc | undefined> {
    return (await this.db).get('docs', path);
  }

  async put(doc: LocalDoc): Promise<void> {
    const { path, text, baseRev, baseText, deleted } = doc;
    await (await this.db).put('docs', { path, text, baseRev, baseText, deleted });
  }

  async remove(path: string): Promise<void> {
    await (await this.db).delete('docs', path);
  }

  async all(): Promise<LocalDoc[]> {
    return (await this.db).getAll('docs');
  }

  async getCursor(): Promise<number> {
    const v = await (await this.db).get('meta', 'cursor');
    return typeof v === 'number' ? v : 0;
  }

  async setCursor(n: number): Promise<void> {
    await (await this.db).put('meta', n, 'cursor');
  }

  async getMeta<T>(key: string): Promise<T | undefined> {
    return (await (await this.db).get('meta', key)) as T | undefined;
  }

  async setMeta(key: string, value: unknown): Promise<void> {
    await (await this.db).put('meta', value, key);
  }

  /** Drops every document and the cursor, for "reset local copy" after switching servers. */
  async clear(): Promise<void> {
    const db = await this.db;
    const tx = db.transaction(['docs', 'meta'], 'readwrite');
    await Promise.all([tx.objectStore('docs').clear(), tx.objectStore('meta').clear(), tx.done]);
  }

  async close(): Promise<void> {
    (await this.db).close();
  }
}
