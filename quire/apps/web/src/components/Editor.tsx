import { Annotation, Compartment, EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { useEffect, useLayoutEffect, useRef } from 'react';
import type { Workspace } from '../store/workspace.ts';
import { baseExtensions, minimalChange } from './editorSetup.ts';

/** Marks transactions that apply text the workspace already has (sync, rebase). */
export const External = Annotation.define<boolean>();

/** Slot for the live co-editing binding (P08), reconfigured per session. */
export const collabSlot = new Compartment();

export interface EditorHandle {
  view: EditorView;
  path: string;
  /** Replace the whole text as a user edit (history restore, resolution preview). */
  replaceText(text: string): void;
  scrollToLine(line: number): void;
}

interface Props {
  ws: Workspace;
  path: string;
  hidden: boolean;
  onOpenLink: (target: string, from: string, heading?: string) => void;
  onHandle?: (h: EditorHandle | null) => void;
  /** True while a live room owns the text; workspace text updates are then ignored. */
  isLive?: () => boolean;
}

/** Source-mode Markdown editor (CodeMirror 6). Every change goes to the local copy. */
export function NoteEditor({ ws, path, hidden, onOpenLink, onHandle, isLive }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const pathRef = useRef(path);
  const props = useRef({ onOpenLink, isLive });
  props.current = { onOpenLink, isLive };

  const makeState = (text: string) =>
    EditorState.create({
      doc: text,
      extensions: [
        baseExtensions(),
        collabSlot.of([]),
        EditorView.updateListener.of((u) => {
          if (!u.docChanged || u.transactions.some((t) => t.annotation(External))) return;
          ws.write(pathRef.current, u.state.doc.toString());
        }),
        EditorView.domEventHandlers({
          mousedown(e, view) {
            if (!(e.metaKey || e.ctrlKey) || e.button !== 0) return false;
            const pos = view.posAtCoords({ x: e.clientX, y: e.clientY });
            if (pos === null) return false;
            const from = pathRef.current;
            const link = ws.links.links(from, view.state.doc.toString()).find((l) => l.start <= pos && pos <= l.end);
            if (!link) return false;
            e.preventDefault();
            props.current.onOpenLink(link.target, from, link.heading);
            return true;
          },
        }),
      ],
    });

  // Layout effects run in order: the view exists before the path effect below reports it.
  useLayoutEffect(() => {
    const view = new EditorView({ parent: host.current!, state: makeState(ws.read(path) ?? '') });
    viewRef.current = view;
    return () => {
      onHandle?.(null);
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  // Switch notes: a fresh state per note (own undo history).
  useLayoutEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    if (pathRef.current !== path || view.state.doc.toString() !== (ws.read(path) ?? '')) {
      pathRef.current = path;
      view.setState(makeState(ws.read(path) ?? ''));
    }
    onHandle?.({
      view,
      path,
      replaceText(text) {
        const change = minimalChange(view.state.doc.toString(), text);
        if (change) view.dispatch({ changes: change });
      },
      scrollToLine(line) {
        const n = Math.min(Math.max(1, line + 1), view.state.doc.lines);
        const pos = view.state.doc.line(n).from;
        view.dispatch({ selection: { anchor: pos }, effects: EditorView.scrollIntoView(pos, { y: 'start', yMargin: 24 }) });
        view.focus();
      },
    });
  }, [path]);

  // Text changed by sync or another tab: apply it in place.
  useEffect(
    () =>
      ws.onText((p, text) => {
        const view = viewRef.current;
        if (!view || p !== pathRef.current || text === undefined || props.current.isLive?.()) return;
        const change = minimalChange(view.state.doc.toString(), text);
        if (change) view.dispatch({ changes: change, annotations: External.of(true) });
      }),
    [ws],
  );

  useEffect(() => {
    if (!hidden) viewRef.current?.requestMeasure();
  }, [hidden]);

  return <div ref={host} className="editor-host" hidden={hidden} />;
}
