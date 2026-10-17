// Source scanning: code and comments, by character range.
import { md } from './parser.ts';
import type { Range } from './syntax.ts';

/**
 * Ranges of fenced and indented code blocks and inline code spans in `src`.
 * Block ranges come from the parser, so they match what the renderer treats as code.
 */
export function codeRanges(src: string): Range[] {
  const lineStarts = [0];
  for (let i = 0; i < src.length; i++) if (src.charCodeAt(i) === 10) lineStarts.push(i + 1);
  const lineOffset = (line: number) => (line < lineStarts.length ? lineStarts[line]! : src.length);

  const blocks: Range[] = [];
  for (const t of md.parse(src, {})) {
    if ((t.type === 'fence' || t.type === 'code_block') && t.map) {
      blocks.push([lineOffset(t.map[0]), lineOffset(t.map[1])]);
    }
  }
  const inBlock = (pos: number) => blocks.find(([s, e]) => pos >= s && pos < e);

  const spans: Range[] = [];
  let i = 0;
  while (i < src.length) {
    const blk = inBlock(i);
    if (blk) {
      i = blk[1];
      continue;
    }
    const ch = src.charCodeAt(i);
    if (ch === 0x5c /* \ */) {
      i += 2;
      continue;
    }
    if (ch !== 0x60 /* ` */) {
      i++;
      continue;
    }
    let n = 0;
    while (src.charCodeAt(i + n) === 0x60) n++;
    const close = findClosingRun(src, i + n, n, blocks);
    if (close < 0) {
      i += n;
      continue;
    }
    spans.push([i, close + n]);
    i = close + n;
  }
  return [...blocks, ...spans].sort((a, b) => a[0] - b[0]);
}

function findClosingRun(src: string, from: number, n: number, blocks: Range[]): number {
  let j = from;
  while (j < src.length) {
    if (blocks.some(([s]) => s === j)) return -1;
    const ch = src.charCodeAt(j);
    if (ch === 10 && /^[ \t]*(\n|$)/.test(src.slice(j + 1, j + 200))) return -1; // blank line ends the paragraph
    if (ch === 0x60) {
      let m = 0;
      while (src.charCodeAt(j + m) === 0x60) m++;
      if (m === n) return j;
      j += m;
      continue;
    }
    j++;
  }
  return -1;
}

/**
 * Ranges of `%%comments%%` outside code. A comment that starts a line is a block
 * comment: it ends at the next `%%` anywhere, or hides the rest of the note if unclosed.
 * Otherwise both markers must be on one line, and an unmatched `%%` is literal.
 */
export function commentRanges(src: string, code: readonly Range[] = codeRanges(src)): Range[] {
  const out: Range[] = [];
  const inCode = (pos: number) => code.some(([s, e]) => pos >= s && pos < e);
  let i = src.indexOf('%%');
  while (i >= 0) {
    if (inCode(i) || (i > 0 && src[i - 1] === '\\')) {
      i = src.indexOf('%%', i + 2);
      continue;
    }
    const lineStart = src.lastIndexOf('\n', i - 1) + 1;
    const isBlock = /^[ \t]*$/.test(src.slice(lineStart, i));
    let close = src.indexOf('%%', i + 2);
    if (!isBlock) {
      const eol = src.indexOf('\n', i);
      if (close >= 0 && eol >= 0 && close > eol) close = -1;
      if (close < 0) {
        i = src.indexOf('%%', i + 2);
        continue;
      }
    }
    const end = close < 0 ? src.length : close + 2;
    out.push([i, end]);
    i = close < 0 ? -1 : src.indexOf('%%', end);
  }
  return out;
}

/** Replaces each range with spaces (keeping newlines) so offsets and lines are unchanged. */
export function blankRanges(src: string, ranges: readonly Range[]): string {
  if (ranges.length === 0) return src;
  const chars = src.split('');
  for (const [s, e] of ranges) for (let k = s; k < e; k++) if (chars[k] !== '\n') chars[k] = ' ';
  return chars.join('');
}

/** Removes each range but keeps its newlines, so line numbers are unchanged. */
export function stripRanges(src: string, ranges: readonly Range[]): string {
  if (ranges.length === 0) return src;
  let out = '';
  let last = 0;
  for (const [s, e] of ranges) {
    out += src.slice(last, s) + src.slice(s, e).replace(/[^\n]/g, '');
    last = e;
  }
  return out + src.slice(last);
}

/** Body text with comments removed, ready for parsing (newlines kept). */
export function withoutComments(body: string): string {
  return body.includes('%%') ? stripRanges(body, commentRanges(body)) : body;
}
