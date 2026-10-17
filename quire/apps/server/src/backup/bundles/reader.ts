import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { finished } from 'node:stream/promises';
import { createGunzip } from 'node:zlib';
import { type BundleFile, BundleError, type ContentEntry, MAGIC, type Manifest } from './format.ts';

/** The manifest line may not grow past this; a corrupt file must not exhaust memory. */
const MAX_MANIFEST_BYTES = 512 * 1024 * 1024;

/** Sequential reads from a stream of chunks. */
class ChunkReader {
  private buf: Buffer = Buffer.alloc(0);

  constructor(private readonly it: AsyncIterator<Buffer>) {}

  private async fill(): Promise<boolean> {
    const r = await this.it.next();
    if (r.done) return false;
    this.buf = this.buf.length ? Buffer.concat([this.buf, r.value]) : r.value;
    return true;
  }

  async line(max: number): Promise<string | null> {
    const parts: Buffer[] = [];
    let total = 0;
    for (;;) {
      const nl = this.buf.indexOf(10);
      if (nl >= 0) {
        parts.push(this.buf.subarray(0, nl));
        this.buf = this.buf.subarray(nl + 1);
        return Buffer.concat(parts).toString('utf8');
      }
      parts.push(this.buf);
      total += this.buf.length;
      this.buf = Buffer.alloc(0);
      if (total > max || !(await this.fill())) return null;
    }
  }

  async *take(n: number): AsyncGenerator<Buffer> {
    let left = n;
    while (left > 0) {
      if (!this.buf.length && !(await this.fill())) throw new Error('truncated content');
      const part = this.buf.subarray(0, Math.min(left, this.buf.length));
      this.buf = this.buf.subarray(part.length);
      left -= part.length;
      yield part;
    }
  }

  async atEnd(): Promise<boolean> {
    return !this.buf.length && !(await this.fill());
  }
}

export interface ReadOptions {
  /** Return false to stop after the manifest (the content is then not checked). */
  onManifest?(m: Manifest): boolean;
  /** Receives each entry's bytes; whatever it does not consume is drained and still checked. */
  onEntry?(entry: ContentEntry, bytes: AsyncIterable<Buffer>): Promise<void>;
}

export interface ReadResult {
  manifest: Manifest;
  /** SHA-256 of the file; null when reading stopped after the manifest. */
  sha256: string | null;
}

/**
 * Reads a bundle, checking the gzip stream, the manifest shape, every content entry against
 * its key and size, and that nothing trails the content. Throws BundleError.
 */
export async function readBundle(file: BundleFile, opts: ReadOptions = {}): Promise<ReadResult> {
  const fileHash = createHash('sha256');
  const src = createReadStream(file.path);
  const gunzip = createGunzip();
  src.on('data', (chunk) => fileHash.update(chunk as Buffer));
  src.on('error', (e) => gunzip.destroy(e));
  src.pipe(gunzip);
  const it = gunzip[Symbol.asyncIterator]() as AsyncIterator<Buffer>;
  const reader = new ChunkReader(it);
  const fail = (why: string) => new BundleError(file.name, why);
  try {
    if ((await reader.line(64)) !== MAGIC) throw fail('not a quire bundle');
    const line = await reader.line(MAX_MANIFEST_BYTES);
    if (line === null) throw fail('no manifest');
    const manifest = parseManifest(line, fail);
    if (opts.onManifest && !opts.onManifest(manifest)) return { manifest, sha256: null };
    for (const entry of manifest.content) {
      const h = createHash('sha256');
      let size = 0;
      const bytes = (async function* () {
        for await (const chunk of reader.take(entry.size)) {
          h.update(chunk);
          size += chunk.length;
          yield chunk;
        }
      })();
      if (opts.onEntry) await opts.onEntry(entry, bytes);
      for await (const _ of bytes) {
        // drain what the visitor left
      }
      if (size !== entry.size) throw fail(`content ${entry.key} is truncated`);
      if (h.digest('hex') !== entry.key) throw fail(`content ${entry.key} does not match its key`);
    }
    if (!(await reader.atEnd())) throw fail('unexpected data after the content');
    await finished(src);
    return { manifest, sha256: fileHash.digest('hex') };
  } catch (e) {
    if (e instanceof BundleError) throw e;
    throw fail(e instanceof Error ? e.message : String(e));
  } finally {
    src.destroy();
    gunzip.destroy();
  }
}

function parseManifest(line: string, fail: (why: string) => BundleError): Manifest {
  let m: Manifest;
  try {
    m = JSON.parse(line) as Manifest;
  } catch {
    throw fail('the manifest is not JSON');
  }
  const arrays = [m?.revisions, m?.changesetRows, m?.conflicts, m?.tokens, m?.content, m?.devices, m?.paths, m?.changesets];
  if (m?.format !== 'quire-bundle' || m.version !== 1 || !arrays.every(Array.isArray)) throw fail('unknown manifest format');
  if (!Number.isInteger(m.seq) || !Number.isInteger(m.firstRev) || !Number.isInteger(m.lastRev)) throw fail('bad manifest numbers');
  for (const c of m.content) {
    if (typeof c?.key !== 'string' || !Number.isInteger(c.size) || c.size < 0 || (c.type !== 'text' && c.type !== 'blob')) {
      throw fail('bad content table');
    }
  }
  return m;
}

/** The text of a content entry, for callers that keep texts. */
export async function collect(bytes: AsyncIterable<Buffer>): Promise<string> {
  const parts: Buffer[] = [];
  for await (const chunk of bytes) parts.push(chunk);
  return Buffer.concat(parts).toString('utf8');
}
