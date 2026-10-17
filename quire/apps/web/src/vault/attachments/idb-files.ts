import type { BlobCache, FileHead, FileStore, PendingFile } from '@quire/sync';
import { type DBSchema, type IDBPDatabase, openDB } from 'idb';

interface FilesDB extends DBSchema {
  heads: { key: string; value: FileHead };
  pending: { key: string; value: PendingFile };
  blobs: { key: string; value: Uint8Array };
}

type Db = Promise<IDBPDatabase<FilesDB>>;

/** The device's copy of attachment heads and queued uploads (R-VLT-11), one database per server. */
export class IdbFileStore implements FileStore {
  constructor(private readonly db: Db) {}

  async heads(): Promise<FileHead[]> {
    return (await this.db).getAll('heads');
  }

  async putHead(h: FileHead): Promise<void> {
    await (await this.db).put('heads', h);
  }

  async pending(): Promise<PendingFile[]> {
    return (await this.db).getAll('pending');
  }

  async putPending(p: PendingFile): Promise<void> {
    await (await this.db).put('pending', p);
  }

  async removePending(path: string): Promise<void> {
    await (await this.db).delete('pending', path);
  }
}

/** Fetched bytes by content hash, so a file opens offline once it has been read. */
export class IdbBlobCache implements BlobCache {
  constructor(private readonly db: Db) {}

  async get(hash: string): Promise<Uint8Array | undefined> {
    return (await this.db).get('blobs', hash);
  }

  async put(hash: string, bytes: Uint8Array): Promise<void> {
    await (await this.db).put('blobs', bytes, hash);
  }
}

export function openFileStores(name: string): { store: IdbFileStore; cache: IdbBlobCache } {
  const db: Db = openDB<FilesDB>(name, 1, {
    upgrade(d) {
      d.createObjectStore('heads', { keyPath: 'path' });
      d.createObjectStore('pending', { keyPath: 'path' });
      d.createObjectStore('blobs');
    },
  });
  return { store: new IdbFileStore(db), cache: new IdbBlobCache(db) };
}
