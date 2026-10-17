/**
 * The shared Obsidian Flavored Markdown parser: markdown-it (CommonMark + GFM tables,
 * strikethrough, autolinks) plus footnotes, highlights and the OFM rules below.
 * Parsing is option-free; everything that depends on the vault (link resolution, hrefs)
 * happens in render rules that read `env.quire`.
 */
import MarkdownIt from 'markdown-it';
import type { StateCore, StateInline, Token } from 'markdown-it';
import footnote from 'markdown-it-footnote';
import mark from 'markdown-it-mark';
import { cleanTag, IMAGE_EXTENSIONS, knownExtension, parseWikiInner, slugify, tagPattern, type WikiParts } from './syntax.ts';

export interface WikiMeta extends WikiParts {
  embed: boolean;
  /** True for a note embed standing alone in its paragraph (rendered as a block). */
  block_?: boolean;
}

export interface CalloutMeta {
  type: string;
  fold: '' | '+' | '-';
}

const md: MarkdownIt = new MarkdownIt({ html: false, linkify: true, breaks: true, typographer: false });
// Only scheme URLs are autolinked: fuzzy matching would turn `notes.md` into a link to
// the `.md` country domain.
md.linkify.set({ fuzzyLink: false, fuzzyEmail: false });
md.use(footnote);
md.use(mark);

// ---------------------------------------------------------------------------
// Inline: [[wikilink]] and ![[embed]]

function wikilink(state: StateInline, silent: boolean): boolean {
  const src = state.src;
  let pos = state.pos;
  let embed = false;
  if (src.charCodeAt(pos) === 0x21 /* ! */) {
    embed = true;
    pos++;
  }
  if (src.charCodeAt(pos) !== 0x5b || src.charCodeAt(pos + 1) !== 0x5b) return false;
  const close = src.indexOf(']]', pos + 2);
  if (close < 0) return false;
  const inner = src.slice(pos + 2, close);
  if (inner.trim() === '' || /[\n[]/.test(inner)) return false;
  if (!silent) {
    const token = state.push('wikilink', '', 0);
    const meta: WikiMeta = { ...parseWikiInner(inner), embed };
    token.meta = meta;
    token.content = src.slice(state.pos, close + 2);
  }
  state.pos = close + 2;
  return true;
}
md.inline.ruler.before('link', 'ofm_wikilink', wikilink);

// ---------------------------------------------------------------------------
// Block structure rewrites that must happen before inline parsing.

const CALLOUT_HEAD = /^\[!([A-Za-z][\w-]*)\]([+-]?)[ \t]*(.*)$/;

function callouts(state: StateCore): void {
  const tokens = state.tokens;
  for (let i = 0; i < tokens.length; i++) {
    const open = tokens[i]!;
    if (open.type !== 'blockquote_open') continue;
    const p = tokens[i + 1];
    const inline = tokens[i + 2];
    if (p?.type !== 'paragraph_open' || inline?.type !== 'inline') continue;
    const nl = inline.content.indexOf('\n');
    const first = nl < 0 ? inline.content : inline.content.slice(0, nl);
    const head = CALLOUT_HEAD.exec(first);
    if (!head) continue;

    let j = i + 1;
    while (j < tokens.length && !(tokens[j]!.type === 'blockquote_close' && tokens[j]!.level === open.level)) j++;
    const close = tokens[j];
    if (!close) continue;

    const type = head[1]!.toLowerCase();
    const fold = (head[2] ?? '') as CalloutMeta['fold'];
    const title = (head[3] ?? '').trim() || type.charAt(0).toUpperCase() + type.slice(1);
    const meta: CalloutMeta = { type, fold };
    const tag = fold ? 'details' : 'div';

    open.type = 'callout_open';
    open.tag = tag;
    open.meta = meta;
    close.type = 'callout_close';
    close.tag = tag;
    close.meta = meta;

    const mk = (type: string, tag: string, nesting: 1 | 0 | -1): Token => {
      const t = new state.Token(type, tag, nesting);
      t.block = true;
      t.meta = meta;
      t.map = open.map;
      return t;
    };
    const titleInline = new state.Token('inline', '', 0);
    titleInline.content = title;
    titleInline.children = [];
    titleInline.map = open.map;

    tokens.splice(j, 0, mk('callout_content_close', 'div', -1));
    const rest = nl < 0 ? '' : inline.content.slice(nl + 1);
    if (rest.trim() === '') tokens.splice(i + 1, 3);
    else inline.content = rest;
    tokens.splice(
      i + 1,
      0,
      mk('callout_title_open', fold ? 'summary' : 'div', 1),
      titleInline,
      mk('callout_title_close', fold ? 'summary' : 'div', -1),
      mk('callout_content_open', 'div', 1),
    );
  }
}
md.core.ruler.before('inline', 'ofm_callouts', callouts);

const TASK = /^\[([^\n])\](?:[ \t]+|$)/;
const BLOCK_ID = /(^|[ \t])\^([A-Za-z0-9-]+)[ \t]*$/;

function blocks(state: StateCore): void {
  const tokens = state.tokens;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]!;
    // Task list items: `- [ ] open`, `- [x] done`, any other status char counts as done.
    if (t.type === 'list_item_open' && tokens[i + 1]?.type === 'paragraph_open') {
      const inline = tokens[i + 2];
      const m = inline?.type === 'inline' ? TASK.exec(inline.content) : null;
      if (inline && m) {
        inline.content = inline.content.slice(m[0].length);
        t.meta = { ...(t.meta ?? {}), task: m[1] };
        t.attrJoin('class', 'task-list-item');
        t.attrSet('data-task', m[1]!);
      }
    }
    // Block IDs: `text ^id` at the end of a paragraph, or `^id` on its own line.
    if (t.type === 'inline' && tokens[i - 1]?.type === 'paragraph_open') {
      const lastNl = t.content.lastIndexOf('\n');
      const last = t.content.slice(lastNl + 1);
      const m = BLOCK_ID.exec(last);
      if (!m) continue;
      const id = m[2]!;
      t.content = (t.content.slice(0, lastNl + 1) + last.slice(0, m.index)).replace(/\s+$/, '');
      const pOpen = tokens[i - 1]!;
      const pClose = tokens[i + 1];
      if (t.content === '') {
        pOpen.hidden = true;
        if (pClose) pClose.hidden = true;
      } else {
        const holder = pOpen.hidden && tokens[i - 2]?.type === 'list_item_open' ? tokens[i - 2]! : pOpen;
        holder.attrSet('id', '^' + id);
        holder.attrSet('data-block', id);
      }
    }
  }
}
md.core.ruler.before('inline', 'ofm_blocks', blocks);

// ---------------------------------------------------------------------------
// After inline parsing: tags, block embeds, heading ids.

function splitTags(state: StateCore, children: Token[]): Token[] {
  const out: Token[] = [];
  let linkDepth = 0;
  for (let k = 0; k < children.length; k++) {
    const c = children[k]!;
    if (c.type === 'link_open') linkDepth++;
    if (c.type === 'link_close') linkDepth--;
    if (c.type !== 'text' || linkDepth > 0 || !c.content.includes('#')) {
      out.push(c);
      continue;
    }
    // A tag at the very start of a text token needs a line start or break before it.
    const prev = children[k - 1];
    const atLineStart = k === 0 || prev?.type === 'softbreak' || prev?.type === 'hardbreak';
    const src = atLineStart ? c.content : '\u0000' + c.content;
    const shift = atLineStart ? 0 : 1;
    const re = tagPattern();
    let last = 0;
    let m: RegExpExecArray | null;
    let changed = false;
    while ((m = re.exec(src))) {
      const tag = cleanTag(m[2]!);
      if (!tag) continue;
      const hashAt = m.index + m[1]!.length - shift;
      const end = hashAt + 1 + tag.length;
      if (hashAt > last) {
        const t = new state.Token('text', '', 0);
        t.content = c.content.slice(last, hashAt);
        out.push(t);
      }
      const tagTok = new state.Token('tag', '', 0);
      tagTok.content = tag;
      out.push(tagTok);
      last = end;
      re.lastIndex = end + shift;
      changed = true;
    }
    if (!changed) {
      out.push(c);
      continue;
    }
    if (last < c.content.length) {
      const t = new state.Token('text', '', 0);
      t.content = c.content.slice(last);
      out.push(t);
    }
  }
  return out;
}

/** Plain text of an inline token, used for heading text and slugs. */
export function inlineText(children: readonly Token[] | null): string {
  let s = '';
  for (const c of children ?? []) {
    switch (c.type) {
      case 'text':
      case 'code_inline':
        s += c.content;
        break;
      case 'tag':
        s += '#' + c.content;
        break;
      case 'wikilink': {
        const m = c.meta as WikiMeta;
        s += m.alias ?? (m.target + (m.heading ? '#' + m.heading : m.block ? '#^' + m.block : ''));
        break;
      }
      case 'softbreak':
      case 'hardbreak':
        s += ' ';
        break;
      case 'image':
        s += inlineText(c.children);
        break;
    }
  }
  return s;
}

function isImage(target: string): boolean {
  const ext = knownExtension(target);
  return ext !== null && IMAGE_EXTENSIONS.has(ext);
}

function afterInline(state: StateCore): void {
  const tokens = state.tokens;
  const seen = new Map<string, number>();
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]!;
    if (t.type !== 'inline' || !t.children) continue;
    t.children = splitTags(state, t.children);

    // A note embed alone in its paragraph renders as a block, not inside <p>.
    const visible = t.children.filter((c) => !(c.type === 'text' && c.content.trim() === '') && c.type !== 'softbreak');
    const only = visible.length === 1 ? visible[0] : undefined;
    const before = tokens[i - 1];
    const onlyMeta = only?.type === 'wikilink' ? (only.meta as WikiMeta) : null;
    if (onlyMeta?.embed && !isImage(onlyMeta.target) && before?.type === 'paragraph_open') {
      onlyMeta.block_ = true;
      before.hidden = true;
      const after = tokens[i + 1];
      if (after) after.hidden = true;
    }

    if (before?.type === 'heading_open') {
      const base = slugify(inlineText(t.children)) || 'heading';
      const n = seen.get(base) ?? 0;
      seen.set(base, n + 1);
      before.attrSet('id', n === 0 ? base : `${base}-${n}`);
    }
  }
}
md.core.ruler.push('ofm_after_inline', afterInline);

export { md };
