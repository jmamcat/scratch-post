import { describe, it, expect } from 'vitest';
import { InvalidPathError, normalizePath, resolveLink, titleOf } from '../src/paths.ts';

describe('normalizePath (R-VLT-02)', () => {
  it('Scenario: Escape attempt - rejects ../etc/passwd.md', () => {
    expect(() => normalizePath('../etc/passwd.md')).toThrow(InvalidPathError);
  });

  it('Scenario: Normalisation - notes\\Daily.md becomes notes/Daily.md', () => {
    expect(normalizePath('notes\\Daily.md')).toBe('notes/Daily.md');
  });

  it('accepts plain relative Markdown paths unchanged', () => {
    expect(normalizePath('a.md')).toBe('a.md');
    expect(normalizePath('Projects/Alpha beta.md')).toBe('Projects/Alpha beta.md');
    expect(normalizePath('notes/v1.2 draft.md')).toBe('notes/v1.2 draft.md');
  });

  it.each([
    ['', 'empty'],
    ['/abs.md', 'absolute'],
    ['a//b.md', 'empty segment'],
    ['a/./b.md', 'dot segment'],
    ['a/../b.md', 'dot-dot segment'],
    ['..\\x.md', 'backslash escape'],
    ['.hidden.md', 'leading dot'],
    ['.obsidian/app.md', 'hidden folder'],
    ['a/.trash/b.md', 'hidden folder inside'],
    ['notes.txt', 'not markdown'],
    ['notes.MD', 'upper-case extension'],
    ['a/', 'folder'],
    ['a\u0000b.md', 'NUL byte'],
    ['a\nb.md', 'newline'],
  ])('rejects %j (%s)', (p) => {
    expect(() => normalizePath(p)).toThrow(InvalidPathError);
  });

  it('normalises to Unicode NFC', () => {
    const nfd = 'Café.md';
    expect(normalizePath(nfd)).toBe('Café.md');
  });

  it('rejects non-strings', () => {
    expect(() => normalizePath(42 as unknown as string)).toThrow(InvalidPathError);
  });
});

describe('titleOf', () => {
  it('strips folder and .md', () => {
    expect(titleOf('a/B c.md')).toBe('B c');
    expect(titleOf('Top.md')).toBe('Top');
  });
  it('keeps other extensions', () => {
    expect(titleOf('img/pic.png')).toBe('pic.png');
  });
});

describe('resolveLink (R-NAV-02)', () => {
  it('Scenario: Shortest path wins - [[note]] resolves to x/Note.md', () => {
    const paths = ['x/y/Note.md', 'x/Note.md'];
    expect(resolveLink('note', 'other.md', paths)).toBe('x/Note.md');
  });

  it('1. exact vault path, with or without .md', () => {
    const paths = ['Projects/Alpha.md', 'Alpha.md'];
    expect(resolveLink('Projects/Alpha', 'z/z.md', paths)).toBe('Projects/Alpha.md');
    expect(resolveLink('Projects/Alpha.md', 'z/z.md', paths)).toBe('Projects/Alpha.md');
    expect(resolveLink('/Alpha', 'Projects/x.md', paths)).toBe('Alpha.md');
  });

  it('exact path beats a relative match', () => {
    const paths = ['b.md', 'sub/b.md'];
    expect(resolveLink('b', 'sub/a.md', paths)).toBe('b.md');
  });

  it('2. path relative to the linking note folder', () => {
    const paths = ['a/b/c.md', 'a/d.md', 'c.md.bak'];
    expect(resolveLink('b/c', 'a/x.md', paths)).toBe('a/b/c.md');
    expect(resolveLink('../d', 'a/b/x.md', paths)).toBe('a/d.md');
    expect(resolveLink('./b/c.md', 'a/x.md', paths)).toBe('a/b/c.md');
  });

  it('relative paths cannot leave the vault', () => {
    expect(resolveLink('../../zzz', 'a/x.md', ['d.md'])).toBeNull();
  });

  it('3. case-insensitive file name match, then alphabetical among equal lengths', () => {
    const paths = ['b/Note.md', 'a/note.md', 'deep/er/NOTE.md'];
    expect(resolveLink('NoTe', 'x.md', paths)).toBe('a/note.md');
  });

  it('3. path-suffix match when the target names a folder', () => {
    const paths = ['vault/Projects/Alpha.md', 'Alpha.md'];
    expect(resolveLink('projects/alpha', 'x.md', paths)).toBe('vault/Projects/Alpha.md');
  });

  it('non-Markdown targets need their extension', () => {
    const paths = ['img/pic.png', 'pic.md'];
    expect(resolveLink('pic.png', 'x.md', paths)).toBe('img/pic.png');
    expect(resolveLink('pic', 'x.md', paths)).toBe('pic.md');
    expect(resolveLink('photo', 'x.md', ['photo.png'])).toBeNull();
  });

  it('ignores heading, block and alias parts', () => {
    const paths = ['Alpha.md'];
    expect(resolveLink('Alpha#Intro', 'x.md', paths)).toBe('Alpha.md');
    expect(resolveLink('Alpha#^b1', 'x.md', paths)).toBe('Alpha.md');
    expect(resolveLink('Alpha|A', 'x.md', paths)).toBe('Alpha.md');
  });

  it('an empty target is the linking note itself', () => {
    expect(resolveLink('#Heading', 'n/x.md', ['n/x.md'])).toBe('n/x.md');
    expect(resolveLink('', 'n/x.md', [])).toBeNull();
  });

  it('returns null when nothing matches', () => {
    expect(resolveLink('Nowhere', 'x.md', ['a.md', 'b/c.md'])).toBeNull();
  });
});
