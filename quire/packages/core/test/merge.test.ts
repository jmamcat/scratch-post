import { describe, expect, it } from 'vitest';
import { applyChoices, merge3 } from '../src/merge/merge3.ts';

describe('merge3: R-MRG-01 line merge', () => {
  it('merges edits to separate paragraphs', () => {
    const r = merge3('A\n\nB\n', 'A1\n\nB\n', 'A\n\nB1\n');
    expect(r.text).toBe('A1\n\nB1\n');
    expect(r.clean).toBe(true);
    expect(r.review).toEqual([]);
  });

  it('returns the input when all sides are identical', () => {
    const r = merge3('x\n', 'x\n', 'x\n');
    expect(r.text).toBe('x\n');
    expect(r.segments).toEqual([{ type: 'stable', text: 'x\n' }]);
  });

  it('takes the only changed side', () => {
    expect(merge3('a\n', 'b\n', 'a\n').text).toBe('b\n');
    expect(merge3('a\n', 'a\n', 'c\n').text).toBe('c\n');
  });

  it('handles an empty base with one side empty', () => {
    expect(merge3('', '', 'new\n').text).toBe('new\n');
  });

  it('treats both sides deleting the same paragraph as clean', () => {
    const base = 'keep\n\ndrop me\n\nend\n';
    const r = merge3(base, 'keep\n\nend\n', 'keep\n\nend\nmore\n');
    expect(r.text).toBe('keep\n\nend\nmore\n');
    expect(r.clean).toBe(true);
  });

  it('preserves CRLF line endings of the current side', () => {
    const r = merge3('A\r\n\r\nB\r\n', 'A1\r\n\r\nB\r\n', 'A\r\n\r\nB1\r\n');
    expect(r.text).toBe('A1\r\n\r\nB1\r\n');
  });
});

describe('merge3: R-MRG-02 front matter', () => {
  it('merges different keys independently', () => {
    const base = '---\nstatus: draft\n---\nBody\n';
    const current = '---\nstatus: draft\nowner: jo\n---\nBody\n';
    const incoming = '---\nstatus: done\n---\nBody\n';
    const r = merge3(base, current, incoming);
    expect(r.clean).toBe(true);
    expect(r.text).toBe('---\nstatus: done\nowner: jo\n---\nBody\n');
  });

  it('keeps one-sided front matter byte for byte', () => {
    const base = '---\na: 1\n---\nx\n';
    const current = '---\na:   1   # odd spacing kept\n---\nx\n';
    const incoming = '---\na: 1\n---\ny\n';
    expect(merge3(base, current, incoming).text).toBe('---\na:   1   # odd spacing kept\n---\ny\n');
  });

  it('reports a key changed differently on both sides as a property hunk', () => {
    const base = '---\nstatus: draft\n---\n';
    const r = merge3(base, '---\nstatus: review\n---\n', '---\nstatus: done\n---\n');
    expect(r.conflicts).toHaveLength(1);
    expect(r.conflicts[0]).toMatchObject({ kind: 'property', key: 'status', current: 'status: review\n', incoming: 'status: done\n' });
    expect(r.text).toBe('---\nstatus: review\n---\n');
    expect(applyChoices(r.segments, { h1: 'incoming' })).toBe('---\nstatus: done\n---\n');
  });

  it('unions list properties when keeping both', () => {
    const base = '---\ntags: [a]\n---\n';
    const r = merge3(base, '---\ntags: [a, b]\n---\n', '---\ntags: [a, c]\n---\n');
    expect(r.conflicts[0]?.kind).toBe('property');
    expect(applyChoices(r.segments, { h1: 'both' })).toBe('---\ntags:\n  - a\n  - b\n  - c\n---\n');
  });

  it('falls back to line merge when YAML is invalid', () => {
    const base = '---\na: [\n---\nx\n';
    const r = merge3(base, '---\na: [1\n---\nx\n', '---\na: [2\n---\nx\n');
    expect(r.conflicts[0]?.kind).toBe('text');
  });
});

describe('merge3: R-MRG-03 collision tiers', () => {
  it('keeps both appends (both-inserted, flagged)', () => {
    const r = merge3('# Log\n', '# Log\n- a\n', '# Log\n- b\n');
    expect(r.text).toBe('# Log\n- a\n- b\n');
    expect(r.clean).toBe(true);
    expect(r.review.map((h) => h.kind)).toEqual(['both-inserted']);
  });

  it('does not duplicate when one insert extends the other', () => {
    const r = merge3('# Log\n', '# Log\n- a\n', '# Log\n- a\n- b\n');
    expect(r.text).toBe('# Log\n- a\n- b\n');
  });

  it('merges different words of one paragraph (intraline, flagged)', () => {
    const r = merge3('The quick fox.', 'The slow fox.', 'The quick fox jumps.');
    expect(r.text).toBe('The slow fox jumps.');
    expect(r.review.map((h) => h.kind)).toEqual(['intraline']);
  });

  it('takes current silently when sides differ only in whitespace', () => {
    const r = merge3('a b\n', 'a  c\n', 'a c \n');
    expect(r.text).toBe('a  c\n');
    expect(r.segments.every((s) => s.type === 'stable')).toBe(true);
  });

  it('folds false conflicts into stable text', () => {
    const r = merge3('x = 1\n', 'x = 2\n', 'x = 2\n');
    expect(r.segments).toEqual([{ type: 'stable', text: 'x = 2\n' }]);
  });

  it('leaves a true conflict unresolved with current as provisional text', () => {
    const r = merge3('x = 1', 'x = 2', 'x = 3');
    expect(r.clean).toBe(false);
    expect(r.conflicts).toHaveLength(1);
    expect(r.conflicts[0]).toMatchObject({ kind: 'text', base: 'x = 1', current: 'x = 2', incoming: 'x = 3', auto: null });
    expect(r.text).toBe('x = 2');
  });

  it('flags delete versus edit of one paragraph', () => {
    const base = 'intro\n\nold para\n\noutro\n';
    const r = merge3(base, 'intro\n\n\noutro\n', 'intro\n\nnew para\n\noutro\n');
    expect(r.conflicts).toHaveLength(1);
  });
});

describe('applyChoices: R-MRG-05', () => {
  const base = 'a = 1\n\nmiddle\n\nb = 1\n';
  const r = merge3(base, 'a = 2\n\nmiddle\n\nb = 2\n', 'a = 3\n\nmiddle\n\nb = 3\n');

  it('produces one hunk per region with stable ids', () => {
    expect(r.conflicts.map((h) => h.id)).toEqual(['h1', 'h2']);
  });

  it('applies choices per hunk', () => {
    expect(applyChoices(r.segments, { h1: 'incoming', h2: 'both' })).toBe('a = 3\n\nmiddle\n\nb = 2\nb = 3\n');
  });

  it('applies custom text and keeps the line break', () => {
    expect(applyChoices(r.segments, { h1: { text: 'a = 9' } })).toBe('a = 9\n\nmiddle\n\nb = 2\n');
  });

  it('segments always reproduce the provisional text', () => {
    expect(applyChoices(r.segments, {})).toBe(r.text);
  });
});
