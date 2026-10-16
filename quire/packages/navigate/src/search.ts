/**
 * Offline full-text search over the local store (R-NAV-04, R-NAV-10). Case-insensitive.
 * Operators: `path:x`, `file:x` (path or file name contains x), `tag:x` or `tag:#x` (the note
 * has the tag or a nested tag), `"quoted phrases"`, and `-term` (exclude), all combined with AND.
 * Every other word or phrase must occur in the note's path or text. Title matches rank first.
 */
import { extractTags } from '@quire/render';
import { titleOf } from '@quire/vault';

export interface SearchHit {
  path: string;
  title: string;
  /** About 120 characters of text around the first match, whitespace collapsed. */
  snippet: string;
  score: number;
}

type Op = 'text' | 'path' | 'file' | 'tag';

interface Term {
  op: Op;
  /** Lower case; without the leading `#` for tags. */
  value: string;
  negate: boolean;
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

/** Splits a query into AND-ed terms. A bare `-` before a term excludes it; `"..."` keeps spaces. */
function parseQuery(query: string): Term[] {
  const terms: Term[] = [];
  const re = /(-?)(?:(path|file|tag):)?(?:"([^"]*)"|([^\s"-]\S*))/giu;
  for (const m of query.matchAll(re)) {
    const op = (m[2]?.toLowerCase() ?? 'text') as Op;
    let value = (m[3] ?? m[4] ?? '').trim();
    if (op === 'tag') value = value.replace(/^#/, '');
    value = value.toLowerCase();
    if (!value) continue;
    terms.push({ op, value, negate: m[1] === '-' });
  }
  return terms;
}

/**
 * Ranks notes by: whole phrase in the title, then each plain word in the title, in the path,
 * and the number of occurrences in the text. Ties sort by path. Operators filter but do not
 * rank. A query with no terms: no hits.
 */
export function search(docs: Iterable<{ path: string; text: string }>, query: string, limit = 50): SearchHit[] {
  const terms = parseQuery(query);
  if (terms.length === 0) return [];
  const plain = [...new Set(terms.filter((t) => t.op === 'text' && !t.negate).map((t) => t.value))];
  const phrase = plain.join(' ');
  const hits: SearchHit[] = [];
  for (const doc of docs) {
    const title = titleOf(doc.path);
    const lt = title.toLowerCase();
    const lp = doc.path.toLowerCase();
    const lx = doc.text.toLowerCase();
    let tags: string[] | undefined;
    let ok = true;
    for (const term of terms) {
      let hit: boolean;
      switch (term.op) {
        case 'path':
          hit = lp.includes(term.value);
          break;
        case 'file':
          hit = lp.slice(lp.lastIndexOf('/') + 1).includes(term.value);
          break;
        case 'tag':
          tags ??= extractTags(doc.text).map((t) => t.toLowerCase());
          hit = tags.some((t) => t === term.value || t.startsWith(term.value + '/'));
          break;
        default:
          hit = lt.includes(term.value) || lp.includes(term.value) || lx.includes(term.value);
      }
      if (hit === term.negate) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;
    let score = 0;
    for (const term of plain) {
      const inTitle = lt.includes(term);
      const inPath = lp.includes(term);
      const inText = count(lx, term, 20);
      score += (inTitle ? 100 : 0) + (inPath ? 10 : 0) + inText;
    }
    if (phrase && lt.includes(phrase)) score += 1000;
    if (phrase && lt === phrase) score += 1000;
    hits.push({ path: doc.path, title, snippet: makeSnippet(doc.text, plain), score });
  }
  hits.sort((a, b) => b.score - a.score || (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  return hits.slice(0, Math.max(0, limit));
}
