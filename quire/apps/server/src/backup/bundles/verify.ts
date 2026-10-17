import { type BundleFile, BundleError, type ContentEntry, type Manifest, listBundles } from './format.ts';
import { readBundle } from './reader.ts';

export interface WalkOptions {
  /** Stop before the first bundle that starts after this revision (restore `--at`). */
  at?: number;
  /** Called with each manifest before its content is read; the bundle is not checked yet. */
  onManifest?(file: BundleFile, manifest: Manifest): void;
  /** Receives each content entry's bytes. */
  onEntry?(file: BundleFile, entry: ContentEntry, bytes: AsyncIterable<Buffer>): Promise<void>;
  /** Called once a bundle checked out. */
  onBundle?(file: BundleFile, manifest: Manifest): void;
}

export interface ChainSummary {
  bundles: number;
  chains: number;
  lastRev: number;
}

/**
 * Checks bundles in order: each file matches the SHA-256 in its name, its manifest matches its
 * name, each content entry matches its key, a full bundle starts a chain, and each incremental
 * bundle links to the file just before it (SHA-256, sequence number and revision range) and
 * finds every blob it references in itself or earlier in its chain. Throws BundleError naming
 * the first broken bundle.
 */
export async function walkChains(files: BundleFile[], opts: WalkOptions = {}): Promise<ChainSummary> {
  let prev: { file: BundleFile; manifest: Manifest } | null = null;
  let blobs = new Set<string>();
  const summary: ChainSummary = { bundles: 0, chains: 0, lastRev: 0 };
  for (const file of files) {
    const fail = (why: string) => new BundleError(file.name, why);
    let stop = false;
    const { manifest, sha256 } = await readBundle(file, {
      onManifest: (m) => {
        stop = opts.at !== undefined && m.firstRev > opts.at;
        if (!stop) opts.onManifest?.(file, m);
        return !stop;
      },
      ...(opts.onEntry ? { onEntry: (entry: ContentEntry, bytes: AsyncIterable<Buffer>) => opts.onEntry!(file, entry, bytes) } : {}),
    });
    if (stop) break;
    if (sha256 !== file.sha256) throw fail('the file does not match the SHA-256 in its name');
    if (manifest.seq !== file.seq || manifest.kind !== file.kind) throw fail('the manifest does not match the file name');
    if (manifest.kind === 'full') {
      if (manifest.prevSha256 !== null || manifest.firstRev !== 1) throw fail('a full bundle must start a chain at revision 1');
      blobs = new Set();
      summary.chains += 1;
    } else {
      if (!prev) throw fail('an incremental bundle with no full bundle before it');
      if (manifest.prevSha256 !== prev.file.sha256) throw fail(`the previous bundle is not ${prev.file.name}`);
      if (manifest.seq !== prev.manifest.seq + 1) throw fail(`expected sequence number ${prev.manifest.seq + 1}`);
      if (manifest.firstRev !== prev.manifest.lastRev + 1) throw fail(`expected revisions from ${prev.manifest.lastRev + 1}`);
    }
    checkRows(manifest, blobs, fail);
    prev = { file, manifest };
    summary.bundles += 1;
    summary.lastRev = manifest.lastRev;
    opts.onBundle?.(file, manifest);
  }
  return summary;
}

function checkRows(m: Manifest, chainBlobs: Set<string>, fail: (why: string) => BundleError): void {
  const texts = new Set<string>();
  for (const c of m.content) (c.type === 'text' ? texts : chainBlobs).add(c.key);
  if (m.lastRev < m.firstRev - 1) throw fail('the revision range is reversed');
  for (const r of m.revisions) {
    if (!Number.isInteger(r?.rev) || r.rev < m.firstRev || r.rev > m.lastRev) throw fail(`revision ${r?.rev} is outside ${m.firstRev}..${m.lastRev}`);
    if (typeof r.path !== 'string' || !r.path) throw fail(`revision ${r.rev} has no path`);
    if (r.text !== null && !texts.has(r.text)) throw fail(`revision ${r.rev} refers to a text the bundle does not hold`);
    if (r.blob && !chainBlobs.has(r.blob)) throw fail(`revision ${r.rev} refers to a file no bundle of the chain holds`);
  }
}

export type VerifyResult = ({ ok: true } & ChainSummary) | { ok: false; file: string; reason: string };

/** `quire backup verify`: every chain in the folder. */
export async function verifyFolder(dir: string): Promise<VerifyResult> {
  const files = listBundles(dir);
  if (!files.length) return { ok: false, file: dir, reason: 'no backup bundles' };
  try {
    return { ok: true, ...(await walkChains(files)) };
  } catch (e) {
    if (e instanceof BundleError) return { ok: false, file: e.file, reason: e.message.slice(e.file.length + 2) };
    throw e;
  }
}

/** The newest chain: the last full bundle and the incremental bundles after it. */
export function newestChain(files: BundleFile[]): BundleFile[] {
  const start = files.map((f) => f.kind).lastIndexOf('full');
  return start < 0 ? [] : files.slice(start);
}
