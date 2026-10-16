/**
 * Wikilink resolution (R-NAV-02), following Obsidian: exact path, then relative to the
 * linking note, then the shortest path whose file name matches.
 */

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
