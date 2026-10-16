/**
 * Offline full-text search over the local store (R-NAV-04). Case-insensitive; every
 * query word must occur in the note's path or text. Title matches rank first.
 */
import { titleOf } from './paths.ts';

export interface SearchHit {
  path: string;
  title: string;
  /** About 120 characters of text around the first match, whitespace collapsed. */
  snippet: string;
  score: number;
}

const SNIPPET = 120;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function count(hay: string, needle: string, cap: number): number {
  let n = 0;
  for (let i = hay.indexOf(needle); i >= 0 && n < cap; i = hay.indexOf(needle, i + needle.length)) n++;
  return n;
}

function makeSnippet(text: string, terms: readonly string[]): string {
  let at = -1;
  let len = 0;
  for (const term of terms) {
    const m = new RegExp(escapeRegExp(term), 'iu').exec(text);
    if (m && (at < 0 || m.index < at)) {
      at = m.index;
      len = m[0].length;
    }
  }
  if (at < 0) {
    const s = text.replace(/\s+/g, ' ').trim();
    return s.length > SNIPPET ? s.slice(0, SNIPPET).trimEnd() + '…' : s;
  }
  const before = Math.floor((SNIPPET - len) / 3);
  const start = Math.max(0, at - before);
  const end = Math.min(text.length, start + SNIPPET);
  const body = text.slice(start, end).replace(/\s+/g, ' ').trim();
  return (start > 0 ? '…' : '') + body + (end < text.length ? '…' : '');
}

/**
 * Ranks notes by: whole query in the title, then each word in the title, in the path,
 * and the number of occurrences in the text. Ties sort by path. Empty query: no hits.
 */
export function search(docs: Iterable<{ path: string; text: string }>, query: string, limit = 50): SearchHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const terms = [...new Set(q.split(/\s+/))];
  const hits: SearchHit[] = [];
  for (const doc of docs) {
    const title = titleOf(doc.path);
    const lt = title.toLowerCase();
    const lp = doc.path.toLowerCase();
    const lx = doc.text.toLowerCase();
    let score = 0;
    let ok = true;
    for (const term of terms) {
      const inTitle = lt.includes(term);
      const inPath = lp.includes(term);
      const inText = count(lx, term, 20);
      if (!inTitle && !inPath && inText === 0) {
        ok = false;
        break;
      }
      score += (inTitle ? 100 : 0) + (inPath ? 10 : 0) + inText;
    }
    if (!ok) continue;
    if (lt.includes(q)) score += 1000;
    if (lt === q) score += 1000;
    hits.push({ path: doc.path, title, snippet: makeSnippet(doc.text, terms), score });
  }
  hits.sort((a, b) => b.score - a.score || (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  return hits.slice(0, Math.max(0, limit));
}
