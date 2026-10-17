/**
 * OFM reading view (R-RND-01..07). Raw HTML is escaped, never rendered.
 */
import type { Options, RendererRule } from 'markdown-it';
import { splitFrontmatter } from '@quire/vault';
import { md, type CalloutMeta, type WikiMeta } from './parser.ts';
import { withoutComments } from './source-ranges.ts';
import { calloutBase, decodeHref, slugify, IMAGE_EXTENSIONS, impliedPath, isVaultHref, knownExtension } from './syntax.ts';

export interface RenderOptions {
  /**
   * Wikilink or Markdown link target to a vault path, or null when it does not exist.
   * The target is `''` for same-note links (`[[#Heading]]`); returning the current path
   * makes those ordinary internal links. Without a resolver every link counts as resolved.
   */
  resolve?: (target: string) => string | null;
  /** Href for an internal link. Default `"#/" + encodeURI(path)`, plus `#subpath` if given. */
  href?: (path: string, heading?: string) => string;
  /** Href for a tag link. Default `"#/tag/" + tag`. */
  tagHref?: (tag: string) => string;
  /** URL for an embedded image at a vault path. Default `encodeURI(path)`. */
  imageSrc?: (path: string) => string;
}

interface Env {
  quire: Required<RenderOptions>;
  lineOffset: number;
}

const esc = md.utils.escapeHtml;

const defaults: Required<RenderOptions> = {
  resolve: (target) => (target === '' ? null : impliedPath(target)),
  href: (path, heading) => '#/' + encodeURI(path) + (heading ? '#' + encodeURIComponent(heading) : ''),
  tagHref: (tag) => '#/tag/' + tag,
  imageSrc: (path) => encodeURI(path),
};

type AttrValue = string | true | false | undefined;

/** Serialises attributes; `true` is a bare boolean attribute, false/undefined are left out. */
function attrs(list: Array<[string, AttrValue]>): string {
  let s = '';
  for (const [k, v] of list) {
    if (v === true) s += ` ${k}`;
    else if (typeof v === 'string') s += ` ${k}="${esc(v)}"`;
  }
  return s;
}

interface Target {
  path: string;
  resolved: boolean;
  sub?: string;
}

function locate(env: Env, target: string, heading?: string, block?: string): Target {
  const found = env.quire.resolve(target);
  const sub = heading ?? (block ? '^' + block : undefined);
  // An empty target (`[[#Heading]]`) is the current note, which always exists.
  const t: Target = { path: found ?? (target === '' ? '' : impliedPath(target)), resolved: found !== null || target === '' };
  if (sub !== undefined) t.sub = sub;
  return t;
}

/** The element id the renderer gives a heading (its slug) or a block (`^id`). */
function anchorOf(sub: string): string {
  return sub.startsWith('^') ? sub : slugify(sub.split('#').pop() ?? sub);
}

function linkHtml(env: Env, t: Target, label: string, extraClass = ''): string {
  const cls = ['internal-link', extraClass, t.resolved ? '' : 'unresolved'].filter(Boolean).join(' ');
  // Same-note links without a resolved path point at the heading or block anchor.
  const local = t.path === '';
  const href = local ? '#' + encodeURIComponent(anchorOf(t.sub ?? '')) : env.quire.href(t.path, t.sub);
  return `<a${attrs([
    ['class', cls],
    ['data-path', local ? undefined : t.path],
    ['data-subpath', t.sub],
    ['href', href],
  ])}>${esc(label)}</a>`;
}

/** `W` or `WxH` in integer pixels, as used by image embeds. */
function parseSize(s: string | undefined): { width?: string; height?: string } | null {
  const m = s ? /^(\d+)(?:x(\d+))?$/.exec(s.trim()) : null;
  if (!m) return null;
  return m[2] ? { width: m[1]!, height: m[2] } : { width: m[1]! };
}

function imgHtml(src: string, alt: string, size: { width?: string; height?: string } | null, cls?: string, title?: string): string {
  return `<img${attrs([
    ['class', cls],
    ['src', src],
    ['alt', alt],
    ['title', title],
    ['width', size?.width],
    ['height', size?.height],
  ])}>`;
}

const rules = md.renderer.rules;

rules['wikilink'] = (tokens, idx, _opts, env: Env) => {
  const m = tokens[idx]!.meta as WikiMeta;
  const written = m.target + (m.heading ? '#' + m.heading : m.block ? '#^' + m.block : '');
  const t = locate(env, m.target, m.heading, m.block);
  if (!m.embed) return linkHtml(env, t, m.alias ?? written);

  const ext = knownExtension(m.target);
  if (ext && IMAGE_EXTENSIONS.has(ext)) {
    const size = parseSize(m.alias);
    const alt = size ? m.target : (m.alias ?? m.target);
    return imgHtml(env.quire.imageSrc(t.path), alt, size, t.resolved ? 'embed-image' : 'embed-image unresolved');
  }
  // Note (and other file) embeds link to the target; full transclusion is deferred.
  const kind = !ext || ext === 'md' ? 'embed' : 'embed embed-file';
  const tag = m.block_ ? 'div' : 'span';
  const cls = kind + (t.resolved ? '' : ' unresolved');
  return `<${tag}${attrs([
    ['class', cls],
    ['data-path', t.path],
    ['data-subpath', t.sub],
  ])}>${linkHtml(env, t, m.alias ?? written)}</${tag}>${m.block_ ? '\n' : ''}`;
};

rules['tag'] = (tokens, idx, _opts, env: Env) => {
  const tag = tokens[idx]!.content;
  return `<a${attrs([
    ['class', 'tag'],
    ['href', env.quire.tagHref(tag)],
  ])}>#${esc(tag)}</a>`;
};

rules['callout_open'] = (tokens, idx) => {
  const m = tokens[idx]!.meta as CalloutMeta;
  const list: Array<[string, AttrValue]> = [
    ['class', 'callout'],
    ['data-callout', m.type],
    ['data-callout-base', calloutBase(m.type)],
    ['data-callout-fold', m.fold || false],
  ];
  if (m.fold === '+') list.push(['open', true]);
  return `<${m.fold ? 'details' : 'div'}${attrs(list)}>\n`;
};
rules['callout_close'] = (tokens, idx) => `</${(tokens[idx]!.meta as CalloutMeta).fold ? 'details' : 'div'}>\n`;
rules['callout_title_open'] = (tokens, idx) =>
  `<${(tokens[idx]!.meta as CalloutMeta).fold ? 'summary' : 'div'} class="callout-title">`;
rules['callout_title_close'] = (tokens, idx) => `</${(tokens[idx]!.meta as CalloutMeta).fold ? 'summary' : 'div'}>\n`;
rules['callout_content_open'] = () => '<div class="callout-content">\n';
rules['callout_content_close'] = () => '</div>\n';

rules['list_item_open'] = (tokens, idx, opts, env: Env, self) => {
  const t = tokens[idx]!;
  const html = self.renderToken(tokens, idx, opts);
  const task = (t.meta as { task?: string } | null)?.task;
  if (task === undefined) return html;
  const box = `<input${attrs([
    ['type', 'checkbox'],
    ['class', 'task-list-item-checkbox'],
    ['data-line', t.map ? String(t.map[0] + env.lineOffset) : undefined],
    ['checked', task !== ' '],
    ['disabled', true],
  ])}>`;
  return html.endsWith('\n') ? html.slice(0, -1) + box + '\n' : html + box;
};

// Markdown links and images whose destination is a vault path behave like wikilinks.
const defaultLinkOpen: RendererRule =
  rules['link_open'] ?? ((tokens, idx, opts, _env, self) => self.renderToken(tokens, idx, opts));

function splitDest(href: string): { path: string; heading?: string; block?: string } {
  const dest = decodeHref(href);
  const hash = dest.indexOf('#');
  if (hash < 0) return { path: dest };
  const sub = dest.slice(hash + 1);
  const out: { path: string; heading?: string; block?: string } = { path: dest.slice(0, hash) };
  if (sub.startsWith('^')) out.block = sub.slice(1);
  else if (sub) out.heading = sub;
  return out;
}

rules['link_open'] = (tokens, idx, opts, env: Env, self) => {
  const t = tokens[idx]!;
  const href = t.attrGet('href') ?? '';
  if (t.markup === 'linkify' || t.info === 'auto' || !isVaultHref(href)) return defaultLinkOpen(tokens, idx, opts, env, self);
  const d = splitDest(href);
  const loc = locate(env, d.path, d.heading, d.block);
  t.attrSet('href', env.quire.href(loc.path, loc.sub));
  t.attrJoin('class', loc.resolved ? 'internal-link' : 'internal-link unresolved');
  t.attrSet('data-path', loc.path);
  if (loc.sub !== undefined) t.attrSet('data-subpath', loc.sub);
  return self.renderToken(tokens, idx, opts);
};

rules['image'] = (tokens, idx, opts: Options, env: Env, self) => {
  const t = tokens[idx]!;
  let alt = self.renderInlineAsText(t.children ?? [], opts, env);
  // Obsidian size syntax: `![alt|W](src)`, `![alt|WxH](src)`, `![W](src)`.
  let size = parseSize(alt);
  if (size) alt = '';
  else {
    const bar = alt.lastIndexOf('|');
    size = bar >= 0 ? parseSize(alt.slice(bar + 1)) : null;
    if (size) alt = alt.slice(0, bar).trim();
  }
  let src = t.attrGet('src') ?? '';
  let cls: string | undefined;
  if (isVaultHref(src)) {
    const loc = locate(env, splitDest(src).path);
    src = env.quire.imageSrc(loc.path);
    cls = loc.resolved ? 'embed-image' : 'embed-image unresolved';
  }
  return imgHtml(src, alt, size, cls, t.attrGet('title') ?? undefined);
};

/**
 * Renders a note's Markdown body to HTML. Front matter is excluded (read it with
 * `splitFrontmatter`), `%%comments%%` are removed and raw HTML is escaped.
 */
export function renderMarkdown(text: string, opts: RenderOptions = {}): string {
  const fm = splitFrontmatter(text);
  let lineOffset = 0;
  for (let i = 0; i < fm.bodyStart; i++) if (text.charCodeAt(i) === 10) lineOffset++;
  const env: Env = { quire: { ...defaults, ...stripUndefined(opts) }, lineOffset };
  return md.render(withoutComments(fm.body), env);
}

function stripUndefined(o: RenderOptions): RenderOptions {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as RenderOptions;
}
