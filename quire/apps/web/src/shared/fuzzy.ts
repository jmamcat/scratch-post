export interface FuzzyMatch {
  score: number;
  /** Indices in the candidate that matched, for highlighting. */
  indices: number[];
}

function isBoundary(s: string, i: number): boolean {
  if (i === 0) return true;
  const prev = s[i - 1]!;
  return /[\s/_\-.]/.test(prev) || (/[a-z]/.test(prev) && /[A-Z]/.test(s[i]!));
}

/**
 * Subsequence match, case-insensitive. Rewards consecutive runs, word starts and early
 * matches, so "scf" finds "Save current file". Null when not every query character occurs.
 */
export function fuzzyMatch(query: string, candidate: string): FuzzyMatch | null {
  const q = query.toLowerCase().replace(/\s+/g, '');
  if (!q) return { score: 0, indices: [] };
  const c = candidate.toLowerCase();
  let best: FuzzyMatch | null = null;
  for (const m of [walk(q, c, candidate, true), walk(q, c, candidate, false)]) if (m && (!best || m.score > best.score)) best = m;
  const sub = c.indexOf(q);
  if (sub >= 0) {
    const score = q.length * 25 + (isBoundary(candidate, sub) ? 40 : 0) - Math.min(sub, 20) * 0.5;
    if (!best || score > best.score) best = { score, indices: Array.from({ length: q.length }, (_, k) => sub + k) };
  }
  return best && { score: best.score - candidate.length * 0.1, indices: best.indices };
}

function walk(q: string, c: string, candidate: string, preferStarts: boolean): FuzzyMatch | null {
  const indices: number[] = [];
  let score = 0;
  let ci = 0;
  let prev = -2;
  for (const ch of q) {
    let at = c.indexOf(ch, ci);
    if (at < 0) return null;
    // Prefer a later word start over a mid-word hit, unless this continues a run.
    if (preferStarts && at !== prev + 1 && !isBoundary(candidate, at)) {
      for (let k = at + 1; k < c.length; k++) {
        if (c[k] === ch && isBoundary(candidate, k)) {
          at = k;
          break;
        }
      }
    }
    score += 10;
    if (at === prev + 1) score += 15;
    if (isBoundary(candidate, at)) score += 20;
    score -= Math.min(at - ci, 10);
    indices.push(at);
    prev = at;
    ci = at + 1;
  }
  return { score, indices };
}

/** Filters and sorts items by their best match over the given keys. */
export function fuzzyFilter<T>(items: readonly T[], query: string, keys: (item: T) => string[]): Array<{ item: T; match: FuzzyMatch; key: number }> {
  const out: Array<{ item: T; match: FuzzyMatch; key: number }> = [];
  for (const item of items) {
    let best: { match: FuzzyMatch; key: number } | null = null;
    keys(item).forEach((k, i) => {
      const m = fuzzyMatch(query, k);
      // The first key (the title) counts a little more than the rest.
      if (m && (!best || m.score - i * 5 > best.match.score)) best = { match: { ...m, score: m.score - i * 5 }, key: i };
    });
    if (best) out.push({ item, ...(best as { match: FuzzyMatch; key: number }) });
  }
  return out.sort((a, b) => b.match.score - a.match.score);
}
