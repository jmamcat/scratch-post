import { syntaxTree } from '@codemirror/language';
import { type EditorState, type Extension, type Range, StateField } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, keymap, WidgetType } from '@codemirror/view';
import type { AttachmentEngine } from './engine.ts';
import './attachments.css';

const IMAGE = /\.(png|jpe?g|gif|webp|avif|bmp|svg)$/i;
const EMBED = /!\[\[([^[\]|#\n]+)(?:[|#][^\]\n]*)?\]\]|!\[[^\]\n]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
const LITERAL = new Set(['FencedCode', 'CodeBlock', 'InlineCode', 'Frontmatter']);

/** Drop, paste and pick files into the attachment folder, and show image embeds as images. */
export function attachmentExtension(engine: AttachmentEngine, currentPath: () => string): Extension {
  const ingest = (view: EditorView, files: File[], source: 'drop' | 'paste' | 'pick') => ingestFiles(engine, currentPath, view, files, source);
  return extensionFor(ingest, engine);
}

/** "Insert attachment": pick files and embed them at the cursor. */
export function insertAttachment(engine: AttachmentEngine, currentPath: () => string, view: EditorView): void {
  void pickFiles().then((files) => (files.length > 0 ? ingestFiles(engine, currentPath, view, files, 'pick') : undefined));
}

async function ingestFiles(
  engine: AttachmentEngine,
  currentPath: () => string,
  view: EditorView,
  files: File[],
  source: 'drop' | 'paste' | 'pick',
): Promise<void> {
  const note = currentPath();
  const names = await engine.addFiles(files, source);
  if (names.length === 0) return;
  const insert = names.map((n) => `![[${n}]]\n`).join('');
  // The note may have been closed while the upload ran; then the lines go to it directly.
  if (view.dom.isConnected && currentPath() === note) {
    const at = view.state.selection.main.head;
    view.dispatch({ changes: { from: at, insert }, selection: { anchor: at + insert.length }, userEvent: 'input.paste' });
  } else engine.appendToNote(note, insert);
}

type Ingest = (view: EditorView, files: File[], source: 'drop' | 'paste' | 'pick') => Promise<void>;

function extensionFor(ingest: Ingest, engine: AttachmentEngine): Extension {
  return [
    EditorView.domEventHandlers({
      dragover(e) {
        if (!hasFiles(e.dataTransfer)) return false;
        e.preventDefault();
        return true;
      },
      drop(e, view) {
        const files = fileList(e.dataTransfer);
        if (files.length === 0) return false;
        e.preventDefault();
        void ingest(view, files, 'drop');
        return true;
      },
      paste(e, view) {
        const files = fileList(e.clipboardData);
        if (files.length === 0) return false;
        e.preventDefault();
        void ingest(view, files, 'paste');
        return true;
      },
    }),
    // "Insert attachment": Mod-Alt-i here; the command palette runs insertAttachment.
    keymap.of([
      {
        key: 'Mod-Alt-i',
        run: (view) => {
          void pickFiles().then((files) => (files.length > 0 ? ingest(view, files, 'pick') : undefined));
          return true;
        },
      },
    ]),
    imageEmbeds(engine),
  ];
}

/** Opens the system file chooser through a hidden input; resolves with nothing when cancelled. */
export function pickFiles(): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.hidden = true;
    input.addEventListener('change', () => {
      resolve([...(input.files ?? [])]);
      input.remove();
    });
    input.addEventListener('cancel', () => {
      resolve([]);
      input.remove();
    });
    document.body.append(input);
    input.click();
  });
}

const hasFiles = (dt: DataTransfer | null) => !!dt && [...dt.types].includes('Files');
const fileList = (dt: DataTransfer | null): File[] => [...(dt?.files ?? [])];

// ---- images below their embed line (Live Preview) -----------------------------------

class ImageWidget extends WidgetType {
  private static readonly offs = new WeakMap<HTMLElement, () => void>();

  constructor(
    private readonly engine: AttachmentEngine,
    private readonly target: string,
  ) {
    super();
  }

  override eq(other: ImageWidget): boolean {
    return other.target === this.target && other.engine === this.engine;
  }

  override get estimatedHeight(): number {
    return 120;
  }

  override toDOM(): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'cm-attachment-image';
    const img = document.createElement('img');
    img.alt = this.target;
    img.addEventListener('load', () => wrap.classList.remove('is-broken'));
    img.addEventListener('error', () => wrap.classList.add('is-broken'));
    wrap.append(img);
    const show = () => {
      const src = this.engine.imageSrc(this.target);
      if (img.getAttribute('src') !== src) img.src = src;
    };
    show();
    ImageWidget.offs.set(wrap, this.engine.subscribe(show));
    return wrap;
  }

  override destroy(dom: HTMLElement): void {
    ImageWidget.offs.get(dom)?.();
    ImageWidget.offs.delete(dom);
  }

  override ignoreEvent(): boolean {
    return true;
  }
}

function inLiteral(state: EditorState, pos: number): boolean {
  for (let n: ReturnType<ReturnType<typeof syntaxTree>['resolveInner']> | null = syntaxTree(state).resolveInner(pos, 1); n; n = n.parent) {
    if (LITERAL.has(n.name)) return true;
  }
  return false;
}

/** One block widget after every line holding an image embed (`![[x.png]]` or `![](x.png)`). */
function embedWidgets(state: EditorState, engine: AttachmentEngine): DecorationSet {
  const out: Range<Decoration>[] = [];
  for (const line of lines(state)) {
    for (const m of line.text.matchAll(EMBED)) {
      const raw = m[1] ?? m[2] ?? '';
      if (m[2] !== undefined && /^[a-z][a-z0-9+.-]*:/i.test(raw)) continue;
      const target = decode(raw).trim();
      if (!IMAGE.test(target) || inLiteral(state, line.from + (m.index ?? 0))) continue;
      out.push(Decoration.widget({ widget: new ImageWidget(engine, target), block: true, side: 1 }).range(line.to));
    }
  }
  return Decoration.set(out, true);
}

function* lines(state: EditorState): Generator<{ text: string; from: number; to: number }> {
  let from = 0;
  for (const text of state.doc.iterLines()) {
    if (text.includes('![')) yield { text, from, to: from + text.length };
    from += text.length + 1;
  }
}

function decode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

function imageEmbeds(engine: AttachmentEngine): Extension {
  const field = StateField.define<DecorationSet>({
    create: (state) => embedWidgets(state, engine),
    update: (deco, tr) => (tr.docChanged ? embedWidgets(tr.state, engine) : deco),
    provide: (f) => EditorView.decorations.from(f),
  });
  return field;
}
