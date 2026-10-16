import { createHash, randomBytes } from 'node:crypto';
import { closeSync, createWriteStream, fsyncSync, openSync, readdirSync, renameSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createGzip } from 'node:zlib';

/*
 * Backup bundle format, version 1 (R-BAK-05).
 *
 * One file per bundle, named `<seq, 8 digits>-<full|incremental>-<sha256 of the file>.bundle.gz`,
 * so `ls` lists bundles in chain order and every file carries its own checksum without the
 * database. The file is gzip (node:zlib) of:
 *
 *   quire-bundle 1\n
 *   <manifest as one line of JSON>\n
 *   <content bytes: the entries of manifest.content back to back, each exactly `size` bytes>
 *
 * The manifest holds the kind, the sequence number, the SHA-256 of the previous bundle file
 * (null for a full bundle, which starts a chain), the revision range, time span, devices, paths
 * and change set ids, the rows (revisions, change sets, conflicts, tokens with hashes only) and
 * the content table. Every distinct text and blob appears once per bundle, keyed by its SHA-256;
 * revisions point at it. A full bundle holds the whole revision log up to `lastRev` and every
 * blob it references; an incremental bundle holds the revisions `firstRev..lastRev` (the change
 * sets that closed since the previous bundle), the conflicts they touched and the blobs no
 * earlier bundle of the chain holds. Files are written to a dot-prefixed temp file, synced, then
 * renamed. Other files in the folder (pre-migration copies, dot files) are not bundles.
 */

export const MAGIC = 'quire-bundle 1';
const NAME = /^(\d{8})-(full|incremental)-([0-9a-f]{64})\.bundle\.gz$/;

export type BundleKind = 'full' | 'incremental';

export interface RevisionRecord {
  rev: number;
  path: string;
  hash: string;
  /** Content key of the note text; null for deletions and files. */
  text: string | null;
  deleted: boolean;
  device: string;
  createdAt: string;
  kind: string;
  blob: string | null;
  size: number | null;
  renamedFrom: string | null;
  changeset: number | null;
}

export interface ChangeSetRecord {
  id: number;
  device: string;
  firstRev: number;
  lastRev: number;
  startedAt: string;
  endedAt: string;
  revisions: number;
}

export interface ConflictRecord {
  id: string;
  path: string;
  status: string;
  createdAt: string;
  data: string;
}

export interface TokenRecord {
  name: string;
  hash: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

export interface ContentEntry {
  key: string;
  type: 'text' | 'blob';
  size: number;
  mime?: string | null;
  createdAt?: string;
}

export interface Manifest {
  format: 'quire-bundle';
  version: 1;
  kind: BundleKind;
  seq: number;
  prevSha256: string | null;
  createdAt: string;
  firstRev: number;
  lastRev: number;
  span: { from: string | null; to: string | null };
  devices: string[];
  paths: string[];
  changesets: number[];
  revisions: RevisionRecord[];
  changesetRows: ChangeSetRecord[];
  conflicts: ConflictRecord[];
  tokens: TokenRecord[];
  content: ContentEntry[];
}

export interface BundleFile {
  seq: number;
  kind: BundleKind;
  sha256: string;
  name: string;
  path: string;
}

/** A problem with one bundle file; verify and restore name it. */
export class BundleError extends Error {
  constructor(
    readonly file: string,
    message: string,
  ) {
    super(`${file}: ${message}`);
  }
}

export const bundleName = (seq: number, kind: BundleKind, sha256: string) => `${String(seq).padStart(8, '0')}-${kind}-${sha256}.bundle.gz`;

/** The bundles in a folder, in chain order. Other files are ignored. */
export function listBundles(dir: string): BundleFile[] {
  const out: BundleFile[] = [];
  for (const name of readdirSync(dir)) {
    const m = NAME.exec(name);
    if (m) out.push({ seq: Number(m[1]), kind: m[2] as BundleKind, sha256: m[3]!, name, path: join(dir, name) });
  }
  return out.sort((a, b) => a.seq - b.seq || (a.name < b.name ? -1 : 1));
}

export const maxSeq = (dir: string) => listBundles(dir).reduce((max, b) => Math.max(max, b.seq), 0);

const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');

/** Bytes of one content entry, read when the bundle is written. */
export type ContentSource = { entry: ContentEntry; bytes: () => AsyncIterable<Uint8Array> | Iterable<Uint8Array> };

/**
 * Writes a bundle atomically into `dir` and returns its file. Content is streamed, and each
 * entry is checked against its key and size while it is written, so a blob that changed on
 * disk fails the bundle instead of being stored under the wrong key.
 */
export async function writeBundle(dir: string, manifest: Manifest, sources: ContentSource[]): Promise<BundleFile> {
  const tmp = join(dir, `.tmp-${randomBytes(6).toString('hex')}.bundle.gz`);
  const fileHash = createHash('sha256');
  async function* body(): AsyncGenerator<Uint8Array> {
    yield Buffer.from(`${MAGIC}\n${JSON.stringify(manifest)}\n`, 'utf8');
    for (const { entry, bytes } of sources) {
      const h = createHash('sha256');
      let size = 0;
      for await (const chunk of bytes()) {
        h.update(chunk);
        size += chunk.length;
        yield chunk;
      }
      if (size !== entry.size || h.digest('hex') !== entry.key) throw new Error(`content ${entry.key} changed while it was backed up`);
    }
  }
  const tap = new Transform({
    transform(chunk: Buffer, _enc, done) {
      fileHash.update(chunk);
      done(null, chunk);
    },
  });
  try {
    await pipeline(Readable.from(body()), createGzip(), tap, createWriteStream(tmp, { flags: 'wx' }));
    const fd = openSync(tmp, 'r+');
    try {
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
    const digest = fileHash.digest('hex');
    const name = bundleName(manifest.seq, manifest.kind, digest);
    renameSync(tmp, join(dir, name));
    return { seq: manifest.seq, kind: manifest.kind, sha256: digest, name, path: join(dir, name) };
  } catch (e) {
    rmSync(tmp, { force: true });
    throw e;
  }
}

export const textBytes = (text: string) => [Buffer.from(text, 'utf8')];
export const textKey = (text: string) => sha256(Buffer.from(text, 'utf8'));
