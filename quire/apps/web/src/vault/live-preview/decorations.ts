import { syntaxTree } from '@codemirror/language';
import type { EditorState, Range } from '@codemirror/state';
import { Decoration, type DecorationSet, type EditorView } from '@codemirror/view';
import { HiddenSource, TaskCheckbox } from './widgets.ts';

type Tree = ReturnType<typeof syntaxTree>;
type Node = NonNullable<ReturnType<Tree['resolveInner']>>;
type Span = { from: number; to: number };

/** Inline nodes Live Preview styles, with the class and the child marks it hides. */
const INLINE: Record<string, { cls: string; mark: string }> = {
  StrongEmphasis: { cls: 'cm-lp-strong', mark: 'EmphasisMark' },
  Emphasis: { cls: 'cm-lp-em', mark: 'EmphasisMark' },
  Strikethrough: { cls: 'cm-lp-del', mark: 'StrikethroughMark' },
  InlineCode: { cls: 'cm-lp-code', mark: 'CodeMark' },
};

/** Where Obsidian syntax is literal text, so the regular expressions below must not apply. */
const LITERAL = new Set(['InlineCode', 'FencedCode', 'CodeBlock', 'Frontmatter', 'HTMLBlock', 'Autolink', 'URL']);

const WIKILINK = /(!?)\[\[([^[\]\n]+?)\]\]/g;
const HIGHLIGHT = /==(?=[^\s=])([^=\n]*?[^\s=])==/g;
const CALLOUT = /^\s*>\s*\[!([\w-]+)\]/;

/** Every Live Preview decoration for the visible part of the editor (R-RND-08, R-RND-09). */
export function buildDecorations(view: EditorView): DecorationSet {
  const { state } = view;
  const out = new Builder(state);
  const tree = syntaxTree(state);
  for (const { from, to } of view.visibleRanges) {
    const wikis = obsidianSyntax(out, tree, from, to);
    tree.iterate({ from, to, enter: (ref) => markdownNode(out, ref.node, wikis) });
  }
  return Decoration.set(out.ranges, true);
}

/** Collects decorations; knows which lines show raw Markdown (cursor or selection). */
class Builder {
  readonly ranges: Range<Decoration>[] = [];
  private readonly seen = new Set<string>();
  private readonly active: Span[];

  constructor(readonly state: EditorState) {
    this.active = state.selection.ranges.map((r) => ({ from: state.doc.lineAt(r.from).from, to: state.doc.lineAt(r.to).to }));
  }

  /** True when a line of `from..to` holds the cursor or part of a selection. */
  isActive(from: number, to: number): boolean {
    return this.active.some((a) => from <= a.to && to >= a.from);
  }

  /** Nodes that span two visible ranges are visited twice; add each decoration once. */
  private once(key: string): boolean {
    if (this.seen.has(key)) return false;
    this.seen.add(key);
    return true;
  }

  hide(from: number, to: number): void {
    if (from < to && this.once(`h${from}:${to}`)) {
      this.ranges.push(Decoration.replace({ widget: new HiddenSource(this.state.sliceDoc(from, to)) }).range(from, to));
    }
  }

  mark(from: number, to: number, cls: string, attributes?: Record<string, string>): void {
    if (from < to && this.once(`m${from}:${to}:${cls}`)) {
      this.ranges.push(Decoration.mark({ class: cls, ...(attributes ? { attributes } : {}) }).range(from, to));
    }
  }

  line(pos: number, cls: string, attributes?: Record<string, string>): void {
    const at = this.state.doc.lineAt(pos).from;
    if (this.once(`l${at}:${cls}`)) {
      this.ranges.push(Decoration.line({ class: cls, ...(attributes ? { attributes } : {}) }).range(at));
    }
  }

  widget(from: number, to: number, widget: TaskCheckbox): void {
    if (this.once(`w${from}:${to}`)) this.ranges.push(Decoration.replace({ widget }).range(from, to));
  }
}

function markdownNode(out: Builder, node: Node, wikis: Span[]): boolean | void {
  const heading = /^ATXHeading([1-6])$/.exec(node.name);
  if (heading) return headingNode(out, node, Number(heading[1]));
  const inline = INLINE[node.name];
  if (inline) return inlineNode(out, node, inline.cls, inline.mark);
  switch (node.name) {
    case 'Link':
      if (!wikis.some((w) => node.from < w.to && node.to > w.from)) linkNode(out, node);
      return;
    case 'Image':
      return false;
    case 'Task':
      return taskNode(out, node);
    case 'Blockquote':
      calloutNode(out, node);
      return;
    case 'Frontmatter':
      frontmatterNode(out, node);
      return false;
  }
}

/** Heading lines keep their size on the cursor line too (as in Obsidian); only `#` shows there. */
function headingNode(out: Builder, node: Node, level: number): void {
  out.line(node.from, `cm-lp-h${level}`);
  if (out.isActive(node.from, node.to)) return;
  for (const mark of node.getChildren('HeaderMark')) {
    if (mark.from === node.from) out.hide(mark.from, out.state.sliceDoc(mark.to, mark.to + 1) === ' ' ? mark.to + 1 : mark.to);
    else out.hide(out.state.sliceDoc(mark.from - 1, mark.from) === ' ' ? mark.from - 1 : mark.from, mark.to);
  }
}

/** Emphasis, strike-through and code stay styled on the cursor line; their marks hide elsewhere. */
function inlineNode(out: Builder, node: Node, cls: string, markName: string): void {
  const marks = node.getChildren(markName);
  const first = marks[0];
  const last = marks[marks.length - 1];
  if (!first || !last || first === last) return;
  out.mark(first.to, last.from, cls);
  if (out.isActive(node.from, node.to)) return;
  out.hide(first.from, first.to);
  out.hide(last.from, last.to);
}

/** `[label](url)`: only the label shows, as a link. Reference links stay as they are. */
function linkNode(out: Builder, node: Node): void {
  const url = node.getChild('URL');
  const marks = node.getChildren('LinkMark');
  const open = marks[0];
  const close = marks[1];
  if (!url || !open || !close || out.isActive(node.from, node.to) || close.from <= open.to) return;
  out.hide(open.from, open.to);
  out.mark(open.to, close.from, 'cm-lp-link', { 'data-href': out.state.sliceDoc(url.from, url.to) });
  out.hide(close.from, node.to);
}

/** `- [ ] ` / `- [x] `: the bullet hides and the marker becomes a checkbox. */
function taskNode(out: Builder, node: Node): boolean {
  const marker = node.getChild('TaskMarker');
  if (!marker || out.isActive(node.from, node.to)) return false;
  const source = out.state.sliceDoc(marker.from, marker.to);
  const bullet = node.parent?.getChild('ListMark');
  if (bullet && bullet.to <= marker.from && out.state.doc.lineAt(bullet.from).number === out.state.doc.lineAt(marker.from).number) {
    out.hide(bullet.from, marker.from);
  }
  out.widget(marker.from, marker.to, new TaskCheckbox(source[1] !== ' ', source));
  return true;
}

/** `> [!type] Title`: the first line carries the callout type for styling. */
function calloutNode(out: Builder, node: Node): void {
  const line = out.state.doc.lineAt(node.from);
  const callout = CALLOUT.exec(line.text);
  if (callout) out.line(line.from, 'cm-lp-callout', { 'data-callout': callout[1]!.toLowerCase() });
}

function frontmatterNode(out: Builder, node: Node): void {
  const { doc } = out.state;
  for (let n = doc.lineAt(node.from).number; n <= doc.lineAt(node.to).number; n++) out.line(doc.line(n).from, 'cm-lp-frontmatter');
}

/**
 * Wikilinks and `==highlights==`, which the Markdown parser does not know. Returns the
 * wikilink spans so the parser's view of the same brackets (a shortcut `Link`) is skipped.
 */
function obsidianSyntax(out: Builder, tree: Tree, from: number, to: number): Span[] {
  const { doc } = out.state;
  const wikis: Span[] = [];
  for (let n = doc.lineAt(from).number; n <= doc.lineAt(to).number; n++) {
    const line = doc.line(n);
    const active = out.isActive(line.from, line.to);
    for (const m of line.text.matchAll(WIKILINK)) {
      const start = line.from + m.index;
      if (m[1] || isLiteral(tree, start)) continue;
      const end = start + m[0].length;
      wikis.push({ from: start, to: end });
      if (!active) wikilink(out, start, end, m[2]!);
    }
    for (const m of line.text.matchAll(HIGHLIGHT)) {
      const start = line.from + m.index;
      const end = start + m[0].length;
      if (isLiteral(tree, start) || wikis.some((w) => start < w.to && end > w.from)) continue;
      out.mark(start + 2, end - 2, 'cm-lp-mark');
      if (!active) {
        out.hide(start, start + 2);
        out.hide(end - 2, end);
      }
    }
  }
  return wikis;
}

/** `[[target#heading|alias]]`: the alias (or the target as written) shows as a link. */
function wikilink(out: Builder, start: number, end: number, inner: string): void {
  const bar = inner.indexOf('|');
  const ref = bar < 0 ? inner : inner.slice(0, bar);
  const hash = ref.indexOf('#');
  const attributes: Record<string, string> = { 'data-target': (hash < 0 ? ref : ref.slice(0, hash)).trim() };
  if (hash >= 0) attributes['data-heading'] = ref.slice(hash + 1).trim();
  const labelFrom = bar < 0 ? start + 2 : start + 2 + bar + 1;
  if (labelFrom >= end - 2) return;
  out.hide(start, labelFrom);
  out.mark(labelFrom, end - 2, 'cm-lp-link', attributes);
  out.hide(end - 2, end);
}

function isLiteral(tree: Tree, pos: number): boolean {
  for (let node: Node | null = tree.resolveInner(pos, 1); node; node = node.parent) {
    if (LITERAL.has(node.name)) return true;
  }
  return false;
}
