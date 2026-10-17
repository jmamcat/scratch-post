import { randomBytes } from 'node:crypto';
import { type FSWatcher, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, watch, writeFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { InvalidPathError, normalizePath } from '@quire/vault';
import type { RevisionStore, SyncServer } from '@quire/sync';
import { sha256 } from '../shared/hash.ts';

/**
 * Mirrors heads into a plain folder of Markdown files (R-VLT-01, R-VLT-04) and turns edits
 * made by other programs into revisions from device "disk" (R-VLT-05).
 */
export class VaultMirror {
  /** Hash of what this process last wrote per path; null = it deleted the file. */
  private written = new Map<string, string | null>();
  /** Revision each file on disk corresponds to, as far as this process knows. */
  private diskRev = new Map<string, number>();
  private watcher: FSWatcher | null = null;
  private timers = new Map<string, NodeJS.Timeout>();
  private pending = new Set<Promise<unknown>>();

  constructor(
    readonly dir: string,
    private readonly store: RevisionStore,
  ) {
    mkdirSync(dir, { recursive: true });
  }

  /** Write a head to disk atomically, or delete the file for a deleted head. */
  write(path: string, text: string | null, rev: number): void {
    const file = join(this.dir, path);
    this.diskRev.set(path, rev);
    if (text === null) {
      this.written.set(path, null);
      rmSync(file, { force: true });
      return;
    }
    const hash = sha256(text);
    if (existsSync(file) && sha256(readFileSync(file, 'utf8')) === hash) {
      this.written.set(path, hash);
      return;
    }
    this.written.set(path, hash);
    mkdirSync(dirname(file), { recursive: true });
    const tmp = join(dirname(file), `.quire-${randomBytes(6).toString('hex')}.tmp`);
    writeFileSync(tmp, text, 'utf8');
    renameSync(tmp, file);
  }

  /**
   * Startup reconciliation. Files that differ from their head are committed from "disk".
   * Heads whose file is missing are re-written, never deleted: a missing file at startup is
   * more likely a fresh or moved folder than an intentional delete.
   */
  async scan(sync: SyncServer): Promise<void> {
    const onDisk = new Set<string>();
    for (const path of this.walk()) {
      onDisk.add(path);
      await this.captureFile(sync, path);
    }
    for (const meta of this.store.heads()) {
      // Attachments are restored by the files module, never treated as notes (R-VLT-11).
      if (meta.kind === 'file' || meta.deleted || onDisk.has(meta.path)) continue;
      this.write(meta.path, this.store.text(meta.rev), meta.rev);
    }
  }

  watch(sync: SyncServer): void {
    try {
      this.watcher = watch(this.dir, { recursive: true }, (_event, filename) => {
        if (!filename) return;
        const path = this.toVaultPath(filename.toString());
        if (!path) return;
        clearTimeout(this.timers.get(path));
        this.timers.set(
          path,
          setTimeout(() => {
            this.timers.delete(path);
            this.track(this.captureFile(sync, path, true));
          }, 250),
        );
      });
    } catch {
      this.watcher = null;
    }
  }

  async close(): Promise<void> {
    this.watcher?.close();
    for (const t of this.timers.values()) clearTimeout(t);
    this.timers.clear();
    await Promise.allSettled([...this.pending]);
  }

  private track(p: Promise<unknown>): void {
    this.pending.add(p);
    void p.finally(() => this.pending.delete(p));
  }

  private async captureFile(sync: SyncServer, path: string, allowDelete = false): Promise<void> {
    const file = join(this.dir, path);
    const head = this.store.head(path);
    if (!existsSync(file)) {
      if (!allowDelete || !head || head.deleted || this.written.get(path) === null) return;
      await sync.push({ device: 'disk', items: [{ path, baseRev: this.diskRev.get(path) ?? head.rev, text: null }] });
      return;
    }
    let text: string;
    try {
      text = readFileSync(file, 'utf8');
    } catch {
      return;
    }
    const hash = sha256(text);
    if (this.written.get(path) === hash) return;
    if (head && !head.deleted && head.hash === hash) {
      this.written.set(path, hash);
      return;
    }
    this.written.set(path, hash);
    const baseRev = this.diskRev.get(path) ?? (head && !head.deleted ? head.rev : head?.rev ?? null);
    await sync.push({ device: 'disk', items: [{ path, baseRev, text }] });
  }

  private *walk(dir = this.dir): Generator<string> {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) yield* this.walk(full);
      else if (entry.isFile()) {
        const path = this.toVaultPath(relative(this.dir, full));
        if (path) yield path;
      }
    }
  }

  private toVaultPath(rel: string): string | null {
    const p = rel.split(sep).join('/');
    if (!p.endsWith('.md') || p.split('/').some((s) => s.startsWith('.'))) return null;
    try {
      return normalizePath(p);
    } catch (e) {
      if (e instanceof InvalidPathError) return null;
      throw e;
    }
  }
}
