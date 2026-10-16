/**
 * Small OFM syntax helpers shared by the parser, the extractors and the renderer.
 */

export interface WikiParts {
  target: string;
  alias?: string;
  heading?: string;
  block?: string;
}

/**
 * Parses the inside of `[[...]]`: `target#heading|alias` or `target#^block|alias`.
 * The alias starts at the first `|` (a `\|`, as written in table cells, also counts).
 */
export function parseWikiInner(inner: string): WikiParts {
  let linktext = inner;
  let alias: string | undefined;
  const pipe = inner.indexOf('|');
  if (pipe >= 0) {
    linktext = inner.slice(0, pipe);
    if (linktext.endsWith('\\')) linktext = linktext.slice(0, -1);
    alias = inner.slice(pipe + 1).trim();
  }
  const out: WikiParts = { target: linktext.trim() };
  const hash = linktext.indexOf('#');
  if (hash >= 0) {
    out.target = linktext.slice(0, hash).trim();
    const sub = linktext.slice(hash + 1).trim();
    if (sub.startsWith('^')) {
      if (sub.length > 1) out.block = sub.slice(1);
    } else if (sub) out.heading = sub;
  }
  if (alias) out.alias = alias;
  return out;
}

export const IMAGE_EXTENSIONS = new Set(['avif', 'bmp', 'gif', 'jpeg', 'jpg', 'png', 'svg', 'webp']);

// Attachment types Obsidian recognises; anything else without `.md` is a note name.
const FILE_EXTENSIONS = new Set([
  ...IMAGE_EXTENSIONS,
  'md', 'pdf', 'canvas', 'base',
  'flac', 'm4a', 'mp3', 'ogg', 'wav', 'webm', '3gp',
  'mkv', 'mov', 'mp4', 'ogv',
]);

/** Lower-case extension of a known vault file type, or null for a bare note name. */
export function knownExtension(target: string): string | null {
  const m = /\.([A-Za-z0-9]+)$/.exec(target);
  const ext = m?.[1]?.toLowerCase();
  return ext && FILE_EXTENSIONS.has(ext) ? ext : null;
}

/** The vault path a link target names when nothing resolves it: `.md` is implied. */
export function impliedPath(target: string): string {
  const t = target.replace(/\\/g, '/').replace(/^\/+/, '');
  return knownExtension(t) ? t : t + '.md';
}

/** True for a link destination that is a vault path rather than a URL or same-page anchor. */
export function isVaultHref(href: string): boolean {
  return href !== '' && !href.startsWith('#') && !href.startsWith('//') && !/^[A-Za-z][A-Za-z0-9+.-]*:/.test(href);
}

/** Percent-decodes a Markdown link destination, keeping it as written if it is malformed. */
export function decodeHref(href: string): string {
  try {
    return decodeURIComponent(href);
  } catch {
    return href;
  }
}

/** Inline tag characters: Unicode letters, marks, digits, `_`, `-`, `/` and emoji. */
const TAG_BODY = String.raw`[\p{L}\p{M}\p{N}_\-/\p{Extended_Pictographic}‍️]+`;

/** Matches `#tag` preceded by start or whitespace. Group 1 is the prefix, group 2 the tag. */
export function tagPattern(): RegExp {
  return new RegExp(String.raw`(^|\s)#(` + TAG_BODY + ')', 'gu');
}

/** Cleans a raw tag match; returns null when it is not a tag (for example purely numeric). */
export function cleanTag(raw: string): string | null {
  const tag = raw.replace(/^#/, '').replace(/\/+$/, '');
  if (!tag) return null;
  if (!/[^\d/]/u.test(tag)) return null;
  return tag;
}

/** Heading anchor slug: lower case, punctuation removed, whitespace runs become `-`. */
export function slugify(text: string): string {
  return text
    .normalize('NFC')
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{M}\p{N}\s_-]/gu, '')
    .replace(/\s+/g, '-');
}

/** Base callout types and their aliases (Obsidian's 13 types). */
const CALLOUT_ALIASES: Record<string, string> = {
  note: 'note',
  abstract: 'abstract', summary: 'abstract', tldr: 'abstract',
  info: 'info',
  todo: 'todo',
  tip: 'tip', hint: 'tip', important: 'tip',
  success: 'success', check: 'success', done: 'success',
  question: 'question', help: 'question', faq: 'question',
  warning: 'warning', caution: 'warning', attention: 'warning',
  failure: 'failure', fail: 'failure', missing: 'failure',
  danger: 'danger', error: 'danger',
  bug: 'bug',
  example: 'example',
  quote: 'quote', cite: 'quote',
};

/** The base style a callout type maps to; unknown types are styled as `note`. */
export function calloutBase(type: string): string {
  return CALLOUT_ALIASES[type] ?? 'note';
}

export type Range = readonly [start: number, end: number];
