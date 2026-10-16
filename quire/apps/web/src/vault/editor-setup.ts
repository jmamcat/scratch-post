import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { bracketMatching, defaultHighlightStyle, HighlightStyle, indentOnInput, syntaxHighlighting } from '@codemirror/language';
import { languages } from '@codemirror/language-data';
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search';
import type { Extension } from '@codemirror/state';
import { drawSelection, dropCursor, EditorView, highlightSpecialChars, keymap, placeholder } from '@codemirror/view';

type HighlightSpec = (typeof defaultHighlightStyle.specs)[number];

/**
 * CodeMirror's default highlight style with each colour routed through a CSS variable
 * (`--hl-708` for `#708` and so on), so the dark theme can redefine them. Headings lose
 * the underline and get the accent-free text colour, closer to Obsidian's source mode.
 */
const themedHighlight = HighlightStyle.define(
  defaultHighlightStyle.specs.map((spec): HighlightSpec => {
    const out: HighlightSpec = { ...spec };
    const color = spec['color'];
    if (typeof color === 'string' && color.startsWith('#')) out['color'] = `var(--hl-${color.slice(1)}, ${color})`;
    if (spec['fontWeight'] === 'bold' && spec['textDecoration'] === 'underline') delete out['textDecoration'];
    return out;
  }),
);

/** The `meta` highlight tag, taken from the default style (its only `#404740` rule). */
const metaTag = defaultHighlightStyle.specs.find((s) => s['color'] === '#404740')?.tag;

type MarkdownExtension = NonNullable<NonNullable<Parameters<typeof markdown>[0]>['extensions']>;

/** YAML front matter at the very top (`---` ... `---`), so it is not read as a setext heading. */
const frontmatter: MarkdownExtension = {
  defineNodes: [{ name: 'Frontmatter', block: true, ...(metaTag ? { style: metaTag } : {}) }],
  parseBlock: [
    {
      name: 'Frontmatter',
      before: 'HorizontalRule',
      parse(cx, line) {
        if (cx.lineStart !== 0 || !/^---[ \t]*$/.test(line.text)) return false;
        while (cx.nextLine()) {
          if (/^---[ \t]*$/.test(line.text)) {
            const end = cx.lineStart + line.text.length;
            cx.nextLine();
            cx.addElement(cx.elt('Frontmatter', 0, end));
            return true;
          }
        }
        cx.addElement(cx.elt('Frontmatter', 0, cx.prevLineEnd()));
        return true;
      },
    },
  ],
};

const theme = EditorView.theme({
  '&': { height: '100%', fontSize: 'var(--editor-font-size)', backgroundColor: 'transparent', color: 'var(--text)' },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': { fontFamily: 'var(--font-text)', lineHeight: '1.6', overflow: 'auto' },
  '.cm-content': { maxWidth: 'var(--line-width)', margin: '0 auto', padding: '8px 24px 40vh', caretColor: 'var(--accent)' },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--accent)' },
  '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, ::selection': {
    backgroundColor: 'var(--selection) !important',
  },
  '.cm-panels': { backgroundColor: 'var(--bg-alt)', color: 'var(--text)' },
  '.cm-searchMatch': { backgroundColor: 'var(--mark)' },
  '.cm-ySelectionInfo': { fontFamily: 'var(--font-ui)', fontSize: '11px', opacity: '1', padding: '1px 4px', borderRadius: '3px' },
});

/** Source-mode Markdown editor setup: readable line length, wrapping, history, search. */
export function baseExtensions(): Extension[] {
  return [
    highlightSpecialChars(),
    history(),
    drawSelection(),
    dropCursor(),
    indentOnInput(),
    bracketMatching(),
    highlightSelectionMatches(),
    EditorView.lineWrapping,
    markdown({ base: markdownLanguage, codeLanguages: languages, extensions: [frontmatter] }),
    syntaxHighlighting(themedHighlight),
    placeholder('Start writing…'),
    keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap, indentWithTab]),
    EditorView.contentAttributes.of({ 'aria-label': 'Note editor', spellcheck: 'true', autocapitalize: 'sentences' }),
    theme,
  ];
}

/** Replaces the editor text with `next` using one minimal change, so the cursor stays put. */
export function minimalChange(prev: string, next: string): { from: number; to: number; insert: string } | null {
  if (prev === next) return null;
  let start = 0;
  const max = Math.min(prev.length, next.length);
  while (start < max && prev.charCodeAt(start) === next.charCodeAt(start)) start++;
  let endPrev = prev.length;
  let endNext = next.length;
  while (endPrev > start && endNext > start && prev.charCodeAt(endPrev - 1) === next.charCodeAt(endNext - 1)) {
    endPrev--;
    endNext--;
  }
  return { from: start, to: endPrev, insert: next.slice(start, endNext) };
}
