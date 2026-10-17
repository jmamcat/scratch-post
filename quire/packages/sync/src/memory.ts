import type { LocalDoc, LocalStore, Transport } from './client.ts';
import type { CommitExtra, Conflict, ConflictStatus, DocMeta } from './protocol.ts';
import type { RevisionStore, SyncServer } from './server.ts';

/** In-memory store and in-process transport, for scenarios and tools. */

export class MemoryLocalStore implements LocalStore {
  private docs = new Map<string, LocalDoc>();
  private cursor = 0;

  async get(path: string): Promise<LocalDoc | undefined> {
    const d = this.docs.get(path);
    return d ? { ...d } : undefined;
  }

  async put(doc: LocalDoc): Promise<void> {
    this.docs.set(doc.path, { ...doc });
  }

  async remove(path: string): Promise<void> {
    this.docs.delete(path);
  }

  async all(): Promise<LocalDoc[]> {
    return [...this.docs.values()].map((d) => ({ ...d }));
  }

  async getCursor(): Promise<number> {
    return this.cursor;
  }

  async setCursor(n: number): Promise<void> {
    this.cursor = n;
  }
}

/** Transport that calls a SyncServer in-process, with JSON round-tripping like a real network. */
export function memoryTransport(server: SyncServer, opts: { online?: () => boolean } = {}): Transport {
  const check = () => {
    if (opts.online && !opts.online()) throw new Error('offline');
  };
  const wire = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
  return {
    async push(req) {
      check();
      return wire(await server.push(wire(req)));
    },
    async changes(since) {
      check();
      return wire(server.changes(since));
    },
    async doc(path, rev) {
      check();
      return wire(server.doc(path, rev));
    },
  };
}

/** In-memory RevisionStore for tests and ephemeral servers. */
export class MemoryRevisionStore implements RevisionStore {
  private revs: { meta: DocMeta; text: string | null }[] = [];
  private headIdx = new Map<string, number>();
  private conflicts = new Map<string, Conflict>();

  head(path: string): DocMeta | null {
    const i = this.headIdx.get(path);
    return i === undefined ? null : { ...this.revs[i]!.meta };
  }

  text(rev: number): string | null {
    return this.revs[rev - 1]?.text ?? null;
  }

  revision(rev: number): DocMeta | null {
    const r = this.revs[rev - 1];
    return r ? { ...r.meta } : null;
  }

  commit(path: string, text: string | null, device: string, hash: string, extra: CommitExtra = {}): DocMeta {
    const meta: DocMeta = { path, rev: this.revs.length + 1, hash, deleted: text === null, device, createdAt: new Date().toISOString(), ...extra };
    this.revs.push({ meta, text });
    this.headIdx.set(path, this.revs.length - 1);
    return { ...meta };
  }

  changesSince(rev: number): DocMeta[] {
    return [...this.headIdx.values()]
      .map((i) => this.revs[i]!.meta)
      .filter((m) => m.rev > rev)
      .sort((a, b) => a.rev - b.rev)
      .map((m) => ({ ...m }));
  }

  headRev(): number {
    return this.revs.length;
  }

  history(path: string): DocMeta[] {
    return this.revs
      .filter((r) => r.meta.path === path)
      .map((r) => ({ ...r.meta }))
      .reverse();
  }

  heads(): DocMeta[] {
    return this.changesSince(0);
  }

  renamedTo(path: string, afterRev: number): string | null {
    // Each hop starts after the previous one, so a chain always ends.
    let current = path;
    let after = afterRev;
    for (;;) {
      const next = this.revs.find((r) => r.meta.rev > after && r.meta.renamedFrom === current);
      if (!next) break;
      current = next.meta.path;
      after = next.meta.rev;
    }
    return current === path ? null : current;
  }

  saveConflict(c: Conflict): void {
    this.conflicts.set(c.id, structuredClone(c));
  }

  getConflict(id: string): Conflict | null {
    const c = this.conflicts.get(id);
    return c ? structuredClone(c) : null;
  }

  listConflicts(status?: ConflictStatus): Conflict[] {
    return [...this.conflicts.values()].filter((c) => !status || c.status === status).map((c) => structuredClone(c));
  }
}
