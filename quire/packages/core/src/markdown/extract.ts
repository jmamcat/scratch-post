/**
 * Link, tag and heading extraction for backlinks, the tag pane and the outline
 * (R-NAV-01..03, R-NAV-06). Code spans, code blocks and comments are skipped.
 */
import type { Token } from 'markdown-it';
import { splitFrontmatter } from './frontmatter.ts';
import { blankRanges, codeRanges, commentRanges, inlineText, md, withoutComments } from './md.ts';
import { cleanTag, decodeHref, isVaultHref, parseWikiInner, type Range } from './syntax.ts';

export interface WikiLink {
  /** Link path as written, without subpath or alias (`''` for `[[#Heading]]`). */
  target: string;
  alias?: string;
  heading?: string;
  block?: string;
  embed: boolean;
  /** Offsets of the whole link in the original text. */
  start: number;
  end: number;
}

const WIKI = /(!?)\[\[([^[\n]*?)\]\]/g;
const MDLINK =
  /(!?)\[((?:\\.|[^\]\\\n])*)\]\(\s*(<[^>\n]*>|(?:[^\s()\\]|\\.|\([^\s()]*\))*)(?:\s+(?:"[^"\n]*"|'[^'\n]*'|\([^)\n]*\)))?\s*\)/g;

function wikiMatches(src: string, offset: number, out: WikiLink[], embeds: boolean): Range[] {
  const found: Range[] = [];
  for (const m of src.matchAll(WIKI)) {
    const inner = m[2]!;
    if (inner.trim() === '') continue;
    let start = m.index;
    let embed = m[1] === '!';
    if (embed && !embeds) {
      start++;
      embed = false;
    }
    if (start > 0 && src[start - 1] === '\\') continue;
    const end = m.index + m[0].length;
    out.push({ ...parseWikiInner(inner), embed, start: start + offset, end: end + offset });
    found.push([m.index, end]);
  }
  return found;
}

/**
 * Wikilinks (`[[...]]`, `![[...]]`) and Markdown links to vault paths (`[label](Note.md)`,
 * `![](img.png)`), in document order. Quoted wikilinks in front matter values are
 * included, as Obsidian counts them as links.
 */
export function extractLinks(text: string): WikiLink[] {
  const out: WikiLink[] = [];
  const fm = splitFrontmatter(text);
  if (fm.raw !== null) wikiMatches(text.slice(0, fm.bodyStart), 0, out, false);

  const body = fm.body;
  const code = codeRanges(body);
  let masked = blankRanges(body, [...code, ...commentRanges(body, code)]);
  masked = blankRanges(masked, wikiMatches(masked, fm.bodyStart, out, true));

  for (const m of masked.matchAll(MDLINK)) {
    if (m.index > 0 && masked[m.index - 1] === '\\') continue;
    let dest = m[3] ?? '';
    if (dest.startsWith('<')) dest = dest.slice(1, -1);
    else dest = decodeHref(dest.replace(/\\(.)/g, '$1'));
    if (!isVaultHref(dest)) continue;
    const link: WikiLink = {
      target: dest,
      embed: m[1] === '!',
      start: m.index + fm.bodyStart,
      end: m.index + m[0].length + fm.bodyStart,
    };
    const hash = dest.indexOf('#');
    if (hash >= 0) {
      link.target = dest.slice(0, hash);
      const sub = dest.slice(hash + 1);
      if (sub.startsWith('^')) {
        if (sub.length > 1) link.block = sub.slice(1);
      } else if (sub) link.heading = sub;
    }
    const label = (m[2] ?? '').trim();
    if (label) link.alias = label;
    out.push(link);
  }
  return out.sort((a, b) => a.start - b.start);
}

interface Parsed {
  tokens: Token[];
  data: Record<string, unknown> | null;
  /** Line number in the full text where the body starts. */
  lineOffset: number;
}

function parse(text: string): Parsed {
  const fm = splitFrontmatter(text);
  let lineOffset = 0;
  for (let i = 0; i < fm.bodyStart; i++) if (text.charCodeAt(i) === 10) lineOffset++;
  return { tokens: md.parse(withoutComments(fm.body), {}), data: fm.data, lineOffset };
}

function frontmatterTags(data: Record<string, unknown> | null): string[] {
  const v = data?.['tags'];
  const items = Array.isArray(v) ? v : v === undefined || v === null ? [] : [v];
  const out: string[] = [];
  for (const item of items) {
    if (typeof item !== 'string' && typeof item !== 'number') continue;
    for (const part of String(item).split(/[,\s]+/)) {
      const tag = cleanTag(part.trim());
      if (tag) out.push(tag);
    }
  }
  return out;
}

/**
 * Tags from the `tags` property (list or single string) and inline `#tags` outside code,
 * front matter first, de-duplicated case-insensitively (first spelling wins).
 */
export function extractTags(text: string): string[] {
  const { tokens, data } = parse(text);
  const all = frontmatterTags(data);
  for (const t of tokens) {
    if (t.type !== 'inline') continue;
    for (const c of t.children ?? []) if (c.type === 'tag') all.push(c.content);
  }
  const seen = new Set<string>();
  return all.filter((tag) => {
    const key = tag.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export interface Heading {
  level: number;
  /** Plain heading text, formatting removed. */
  text: string;
  /** Zero-based line in the full text, front matter included. */
  line: number;
  /** Anchor id used by the renderer for this heading (unique within the note). */
  slug: string;
}

/** Headings in document order, for the outline (R-NAV-06). */
export function extractHeadings(text: string): Heading[] {
  const { tokens, lineOffset } = parse(text);
  const out: Heading[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]!;
    if (t.type !== 'heading_open') continue;
    out.push({
      level: Number(t.tag.slice(1)),
      text: inlineText(tokens[i + 1]?.children ?? null).trim(),
      line: (t.map?.[0] ?? 0) + lineOffset,
      slug: t.attrGet('id') ?? '',
    });
  }
  return out;
}
