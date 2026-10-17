import { type DocMeta, type FileHead, type FileSink, FileSync, HttpError } from '@quire/sync';
import { isAttachmentPath, mimeOf } from '@quire/vault';
import type { Workspace } from '../../sync/index.ts';
import { loadPref } from '../../shared/use-pref.ts';
import { openFileStores } from './idb-files.ts';
import { notify } from './alerts.ts';

export const MAX_FILE_BYTES = 25 * 1024 * 1024;
const FOLDER_PREF = 'attachmentFolder';
const DEFAULT_FOLDER = 'attachments/';

/** A 1x1 transparent GIF, shown while the bytes of an image are on their way. */
export const PLACEHOLDER = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

const tooLarge = (name: string) => `${name} is larger than 25 MiB.`;

/** The attachment folder setting as a prefix: no leading slash, one trailing slash, "" for the vault root. */
function folderPrefix(): string {
  const raw = loadPref<string>(FOLDER_PREF, DEFAULT_FOLDER);
  const clean = (typeof raw === 'string' ? raw : DEFAULT_FOLDER).trim().replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
  return clean === '' ? '' : `${clean}/`;
}

/** Letters Obsidian also avoids in attachment names, because they would break `![[...]]`. */
function safeName(name: string): string {
  return name.replace(/[\\/]/g, '_').replace(/[[\]|#^]/g, '-').replace(/^\.+/, '').trim();
}

/** `cat.png` -> `cat 1.png` -> `cat 2.png` until the path is free. */
function freePath(folder: string, name: string, taken: Set<string>): string {
  const dot = name.lastIndexOf('.');
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : '';
  for (let n = 0; ; n++) {
    const path = `${folder}${n === 0 ? name : `${stem} ${n}${ext}`}`;
    if (!taken.has(path)) return path;
  }
}

/** The shortest path suffix that names `path` among `all`, as `![[...]]` wants it. */
export function shortestName(path: string, all: readonly string[]): string {
  const parts = path.split('/');
  for (let i = parts.length - 1; i > 0; i--) {
    const candidate = parts.slice(i).join('/');
    if (!all.some((p) => p !== path && (p === candidate || p.endsWith(`/${candidate}`)))) return candidate;
  }
  return path;
}

/** Clipboard images arrive as `image.png`; give them a name that says when they were pasted. */
export function pastedName(file: File, now = new Date()): string {
  const ext = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.')) : `.${file.type.split('/')[1] ?? 'bin'}`;
  if (file.name !== '' && !/^image\.\w+$/i.test(file.name)) return file.name;
  const p = (n: number) => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}`;
  return `Pasted image ${stamp}${ext}`;
}

/**
 * Attachments for one workspace (R-VLT-12): the file engine, the list of known files, and the
 * object URLs of the ones shown. Views subscribe and re-render when `version` changes.
 */
export class AttachmentEngine {
  readonly files: FileSync;
  private known: FileHead[] = [];
  private loaded = false;
  private signature = '';
  private count = 0;
  private readonly urls = new Map<string, { key: string; url: string }>();
  private readonly fetching = new Set<string>();
  private readonly listeners = new Set<() => void>();

  constructor(private readonly ws: Workspace) {
    const { store, cache } = openFileStores(`${ws.store.name}.files.${ws.settings.serverUrl}`);
    this.files = new FileSync({ transport: ws.transport, store, cache, device: ws.device });
    const sink: FileSink = {
      onRemote: async (meta) => {
        await this.files.onRemote(meta);
        await this.refresh();
      },
      flush: async () => {
        try {
          await this.files.flush();
        } finally {
          await this.refresh();
        }
      },
    };
    ws.client.files = sink;
    void this.refresh().then(() => this.catchUp());
    ws.onOnline((up) => up && void this.catchUp());
  }

  // ---- view state ----------------------------------------------------------------

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  getVersion = (): number => this.count;

  private bump(): void {
    this.count++;
    for (const fn of this.listeners) fn();
  }

  /** Reload the file list; views re-render only when it changed. */
  async refresh(): Promise<void> {
    this.known = await this.files.list();
    const signature = this.known.map((h) => `${h.path}|${h.blob}|${h.size}`).join('\n');
    if (this.loaded && signature === this.signature) return;
    this.loaded = true;
    this.signature = signature;
    this.bump();
  }

  /**
   * Heads pulled before this engine was attached are gone from the change feed, so ask the
   * server once for the files it has.
   */
  private async catchUp(): Promise<void> {
    try {
      for (const meta of await this.ws.transport.request<DocMeta[]>('GET', '/api/docs?kind=file')) await this.files.onRemote(meta);
      await this.refresh();
    } catch {
      // offline: tried again when the connection returns
    }
  }

  // ---- images --------------------------------------------------------------------

  /** The file an embed target names: an exact path, else the shortest path ending in the target. */
  locate(target: string): FileHead | undefined {
    const t = target.replace(/^\/+/, '');
    const hits = this.known.filter((h) => h.path === t || h.path.endsWith(`/${t}`));
    return hits.sort((a, b) => a.path.length - b.path.length || (a.path < b.path ? -1 : 1))[0];
  }

  /** An object URL when the bytes are local; otherwise fetch them and return a placeholder until they arrive. */
  imageSrc(target: string): string {
    const head = this.locate(target);
    if (!head) return this.loaded ? encodeURI(target) : PLACEHOLDER;
    const key = `${head.blob ?? 'queued'}|${head.size}`;
    const have = this.urls.get(head.path);
    if (have?.key === key) return have.url;
    this.load(head.path, key);
    return have?.url ?? PLACEHOLDER;
  }

  private load(path: string, key: string): void {
    const id = `${path}|${key}`;
    if (this.fetching.has(id)) return;
    this.fetching.add(id);
    this.files
      .read(path)
      .then((bytes) => {
        if (!bytes) return;
        const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: mimeOf(path) }));
        const old = this.urls.get(path);
        if (old) URL.revokeObjectURL(old.url);
        this.urls.set(path, { key, url });
        this.bump();
      })
      .catch(() => undefined)
      .finally(() => this.fetching.delete(id));
  }

  // ---- adding files --------------------------------------------------------------

  /**
   * Add files to the attachment folder. Returns the embed names of those that were added;
   * the ones refused (too large, not an attachment type, refused by the server) are reported
   * to the person and left out.
   */
  async addFiles(files: readonly File[], source: 'drop' | 'paste' | 'pick'): Promise<string[]> {
    const added: string[] = [];
    for (const file of files) {
      const name = safeName(source === 'paste' ? pastedName(file) : file.name);
      if (file.size > MAX_FILE_BYTES) {
        notify(tooLarge(name || file.name));
        continue;
      }
      await this.refresh();
      const path = freePath(folderPrefix(), name, new Set(this.known.map((h) => h.path)));
      if (!isAttachmentPath(path)) {
        notify(`${name || file.name} is not a type of file that can be attached.`);
        continue;
      }
      try {
        await this.files.add(path, new Uint8Array(await file.arrayBuffer()));
      } catch (e) {
        notify(e instanceof HttpError && e.status === 413 ? tooLarge(name) : `${name} could not be added: ${e instanceof Error ? e.message : String(e)}`);
        continue;
      }
      await this.refresh();
      added.push(shortestName(path, this.known.map((h) => h.path)));
    }
    return added;
  }

  /** Put embed lines at the end of a note that is not open in an editor any more. */
  appendToNote(path: string, text: string): void {
    const cur = this.ws.read(path);
    if (cur !== undefined) this.ws.write(path, cur === '' || cur.endsWith('\n') ? cur + text : `${cur}\n${text}`);
  }
}
