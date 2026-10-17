import { syntaxTree } from '@codemirror/language';
import type { Extension } from '@codemirror/state';
import { type DecorationSet, EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';
import { buildDecorations } from './decorations.ts';
import './live-preview.css';

export interface LivePreviewOptions {
  /** Follow a wikilink or Markdown link clicked in the editor. */
  onOpenLink: (target: string, heading?: string) => void;
}

/**
 * Live Preview (R-RND-08, R-RND-09): Markdown renders while editing, and the raw markup
 * shows only on lines that hold the cursor or a selection (Obsidian's default mode, OBS-F-001).
 */
export function livePreview(opts: LivePreviewOptions): Extension {
  return [
    renderPlugin,
    EditorView.editorAttributes.of({ class: 'cm-live-preview' }),
    EditorView.domEventHandlers({
      mousedown(e, view) {
        if (e.button !== 0 || !(e.target instanceof Element)) return false;
        const link = e.target.closest<HTMLElement>('.cm-lp-link');
        if (!link || !view.contentDOM.contains(link)) return false;
        if (!followLink(link, opts)) return false;
        e.preventDefault();
        return true;
      },
    }),
  ];
}

const renderPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildDecorations(view);
    }

    update(u: ViewUpdate) {
      if (u.docChanged || u.viewportChanged || u.selectionSet || syntaxTree(u.startState) !== syntaxTree(u.state)) {
        this.decorations = buildDecorations(u.view);
      }
    }
  },
  { decorations: (p) => p.decorations },
);

/** Open a rendered link: wikilinks and relative links go to notes, http(s) to a new tab. */
function followLink(link: HTMLElement, opts: LivePreviewOptions): boolean {
  const { target, heading, href } = link.dataset;
  if (target !== undefined) {
    opts.onOpenLink(target, heading);
    return true;
  }
  if (!href) return false;
  if (/^https?:\/\//i.test(href)) {
    window.open(href, '_blank', 'noopener,noreferrer');
    return true;
  }
  // Other schemes (mailto:, obsidian:) are left to the cursor: the line opens for editing.
  if (/^[a-z][a-z0-9+.-]*:/i.test(href)) return false;
  const hash = href.indexOf('#');
  const path = decode(hash < 0 ? href : href.slice(0, hash));
  opts.onOpenLink(path, hash < 0 ? undefined : decode(href.slice(hash + 1)));
  return true;
}

function decode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}
