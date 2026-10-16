import { describe, it, expect } from 'vitest';
import { search } from '../src/search.ts';

const docs = [
  { path: 'notes/Garden.md', text: 'Plants and soil.' },
  { path: 'journal/2024-01-02.md', text: 'Worked in the garden today. The GARDEN needs water.' },
  { path: 'recipes/Soup.md', text: 'Tomato soup with basil.' },
  { path: 'garden/Tools.md', text: 'Rake, spade.' },
];

describe('search (R-NAV-04)', () => {
  it('is case-insensitive and ranks title matches first', () => {
    const hits = search(docs, 'GARDEN');
    // title match, then folder (path) match, then text-only match
    expect(hits.map((h) => h.path)).toEqual(['notes/Garden.md', 'garden/Tools.md', 'journal/2024-01-02.md']);
    expect(hits[0]!.title).toBe('Garden');
  });

  it('ranks a text match with many occurrences below a title match', () => {
    const hits = search(docs, 'garden');
    expect(hits[0]!.score).toBeGreaterThan(hits[1]!.score);
  });

  it('matches paths as well as text', () => {
    expect(search(docs, 'recipes').map((h) => h.path)).toEqual(['recipes/Soup.md']);
  });

  it('requires every word', () => {
    expect(search(docs, 'tomato basil').map((h) => h.path)).toEqual(['recipes/Soup.md']);
    expect(search(docs, 'tomato rake')).toEqual([]);
  });

  it('returns a short snippet around the first match', () => {
    const long = { path: 'long.md', text: 'x '.repeat(200) + 'needle in\n\nthe   haystack ' + 'y '.repeat(200) };
    const [hit] = search([long], 'needle');
    expect(hit!.snippet).toContain('needle in the haystack');
    expect(hit!.snippet.startsWith('…')).toBe(true);
    expect(hit!.snippet.endsWith('…')).toBe(true);
    expect(hit!.snippet.length).toBeLessThanOrEqual(130);
  });

  it('snippet falls back to the start of the text for path-only matches', () => {
    expect(search(docs, 'tools')[0]!.snippet).toBe('Rake, spade.');
  });

  it('honours the limit and ignores an empty query', () => {
    expect(search(docs, 'e', 2)).toHaveLength(2);
    expect(search(docs, '   ')).toEqual([]);
  });

  it('accepts any iterable', () => {
    function* gen() {
      yield* docs;
    }
    expect(search(gen(), 'soup')).toHaveLength(1);
  });

  it('treats regex characters literally', () => {
    expect(search([{ path: 'a.md', text: 'cost (a+b)*2' }], '(a+b)*')[0]!.snippet).toBe('cost (a+b)*2');
  });
});
