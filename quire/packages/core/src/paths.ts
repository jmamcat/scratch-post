/**
 * Vault path rules (R-VLT-02) and wikilink resolution (R-NAV-02).
 * Pure functions, safe for Node and the browser.
 */

export class InvalidPathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidPathError';
  }
}

// C0 controls and DEL. A NUL or newline in a path is never legitimate.
const CONTROL = /[\u0000-\u001f\u007f]/;

/**
 * Normalises a client-supplied vault path and rejects anything outside the vault.
 * Backslashes become `/` and the result is Unicode NFC. The path must be relative,
 * end in `.md`, and have no empty, `.`, `..` or dot-prefixed (hidden) segments.
 */
export function normalizePath(p: string): string {
  if (typeof p !== 'string') throw new InvalidPathError('path must be a string');
  const s = p.replace(/\\/g, '/').normalize('NFC');
  if (s.length === 0) throw new InvalidPathError('path is empty');
  if (CONTROL.test(s)) throw new InvalidPathError('path contains control characters');
  if (!s.endsWith('.md')) throw new InvalidPathError('path must end in .md');
  for (const seg of s.split('/')) {
    if (seg === '') throw new InvalidPathError('path has an empty segment or is absolute');
    if (seg === '.' || seg === '..') throw new InvalidPathError('path has a . or .. segment');
    if (seg.startsWith('.')) throw new InvalidPathError('path segments must not start with "."');
  }
  return s;
}

/** File name without folder and without a trailing `.md`: `"a/B c.md"` gives `"B c"`. */
export function titleOf(path: string): string {
  const name = basename(path);
  return name.toLowerCase().endsWith('.md') ? name.slice(0, -3) : name;
}

function basename(path: string): string {
  const i = path.lastIndexOf('/');
  return i < 0 ? path : path.slice(i + 1);
}

function dirname(path: string): string {
  const i = path.lastIndexOf('/');
  return i < 0 ? '' : path.slice(0, i);
}

/** Joins `folder` and a relative `target`, applying `.` and `..`. Null if it leaves the vault. */
function joinRelative(folder: string, target: string): string | null {
  const out = folder ? folder.split('/') : [];
  for (const seg of target.split('/')) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') {
      if (out.length === 0) return null;
      out.pop();
    } else out.push(seg);
  }
  return out.join('/');
}

/** Orders candidates: shortest path first, then plain code-unit order. */
function byShortest(a: string, b: string): number {
  return a.length - b.length || (a < b ? -1 : a > b ? 1 : 0);
}

/**
 * Resolves a wikilink or Markdown link target to a vault path (R-NAV-02):
 * 1. exact vault path, with or without `.md`;
 * 2. path relative to the linking note's folder;
 * 3. case-insensitive match on the file name (or on a trailing `folder/name` when the
 *    target has a folder), preferring the shortest path, then alphabetical order.
 * Any `|alias` or `#subpath` on the target is ignored. An empty target (`[[#Heading]]`)
 * resolves to `fromPath`. Returns null when nothing matches.
 */
export function resolveLink(target: string, fromPath: string, paths: readonly string[]): string | null {
  let t = target;
  const pipe = t.indexOf('|');
  if (pipe >= 0) t = t.slice(0, pipe);
  const hash = t.indexOf('#');
  if (hash >= 0) t = t.slice(0, hash);
  t = t.replace(/\\/g, '/').trim().normalize('NFC');
  if (t === '') return paths.includes(fromPath) ? fromPath : null;

  const set = new Set(paths);
  const withMd = (s: string) => [s, s + '.md'];

  // 1. Exact vault path (a leading `/` means vault root).
  const rooted = t.replace(/^\/+/, '');
  for (const c of withMd(rooted)) if (set.has(c)) return c;

  // 2. Relative to the linking note's folder.
  if (!t.startsWith('/')) {
    const rel = joinRelative(dirname(fromPath), t);
    if (rel) for (const c of withMd(rel)) if (set.has(c)) return c;
  }

  // 3. Case-insensitive name (or path-suffix) match.
  const want = rooted.toLowerCase();
  const wants = withMd(want);
  const hasFolder = want.includes('/');
  const matches = paths.filter((p) => {
    const lp = p.toLowerCase();
    if (hasFolder) return wants.some((w) => lp === w || lp.endsWith('/' + w));
    const name = basename(lp);
    return wants.includes(name);
  });
  if (matches.length === 0) return null;
  matches.sort(byShortest);
  return matches[0] ?? null;
}
