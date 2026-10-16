import { Annotation, Compartment, EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { useEffect, useLayoutEffect, useRef } from 'react';
import type { Workspace } from '../sync/index.ts';
import { baseExtensions, minimalChange } from './editor-setup.ts';
import { livePreview } from './live-preview/index.ts';

/** Marks transactions that apply text the workspace already has (sync, rebase). */
export const External = Annotation.define<boolean>();

/** Slot for the live co-editing binding (P08), reconfigured per session. */
export const collabSlot = new Compartment();

/** Slot for the editing mode: Live Preview (default, R-RND-08) or plain source. */
const modeSlot = new Compartment();

export type EditorMode = 'live' | 'source';

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
  mode: EditorMode;
  onOpenLink: (target: string, from: string, heading?: string) => void;
  onHandle?: (h: EditorHandle | null) => void;
  /** True while a live room owns the text; workspace text updates are then ignored. */
  isLive?: () => boolean;
}

/** Markdown editor (CodeMirror 6) in Live Preview or source mode. Every change goes to the local copy. */
export function NoteEditor({ ws, path, hidden, mode, onOpenLink, onHandle, isLive }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const pathRef = useRef(path);
  const props = useRef({ onOpenLink, isLive });
  props.current = { onOpenLink, isLive };
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const modeExtension = (m: EditorMode) =>
    m === 'live' ? livePreview({ onOpenLink: (target, heading) => props.current.onOpenLink(target, pathRef.current, heading) }) : [];

  const makeState = (text: string) =>
    EditorState.create({
      doc: text,
      extensions: [
        baseExtensions(),
        collabSlot.of([]),
        modeSlot.of(modeExtension(modeRef.current)),
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

  useEffect(() => {
    viewRef.current?.dispatch({ effects: modeSlot.reconfigure(modeExtension(mode)) });
  }, [mode]);

  return <div ref={host} className={`editor-host ${mode === 'live' ? 'is-live-preview' : 'is-source'}`} hidden={hidden} />;
}
