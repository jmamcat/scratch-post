import { toggleTask } from '@quire/render';
import { type ComponentProps, type RefObject, useCallback, useEffect, useMemo, useRef } from 'react';
import { Reader } from '../render/index.ts';
import { NoteBanner } from '../review/index.ts';
import type { Workspace } from '../sync/index.ts';
import { type Attachments, type EditorHandle, type EditorMode, InlineTitle, NoteEditor, slashMenu, toNotePath, useAttachments } from '../vault/index.ts';

interface Props {
  ws: Workspace;
  path: string;
  text: string;
  /** Paths known to the workspace: links in the reading view re-resolve when they change. */
  paths: readonly string[];
  reading: boolean;
  mode: EditorMode;
  titleFocus: number;
  conflict: ComponentProps<typeof NoteBanner>['conflict'] | undefined;
  /** Receives the attachments API (R-VLT-12) for the "Insert attachment" command. */
  attachmentsRef: RefObject<Attachments | null>;
  editor: RefObject<EditorHandle | null>;
  onHandle: (h: EditorHandle | null) => void;
  onReview: (id: string) => void;
  onRename: (name: string) => string | null;
  onOpen: (path: string, heading?: string) => void;
  onCreate: (path: string) => void;
  onOpenLink: (target: string, from: string, heading?: string) => void;
  onTag: (tag: string) => void;
  onEditText: (path: string, text: string) => void;
  /** Runs a palette command by id; the slash menu's command entries use it (R-VLT-15). */
  runCommand: (id: string) => void;
}

/** The open note: banner, inline title, editor and (when reading) the rendered note. */
export default function NoteView(p: Props) {
  const { ws, path, text, reading } = p;
  // Attachments (R-VLT-12): the editor extension reads the open path through a ref.
  const attachments = useAttachments(ws);
  useEffect(() => {
    p.attachmentsRef.current = attachments;
  }, [attachments]);
  const pathNow = useRef(path);
  pathNow.current = path;
  const runCommand = useRef(p.runCommand);
  runCommand.current = p.runCommand;
  const extensions = useMemo(() => [attachments.editorExtension(() => pathNow.current), slashMenu((id) => runCommand.current(id))], [attachments]);
  const resolve = useCallback((t: string) => ws.links.resolve(t, path), [ws, path, p.paths]);
  return (
    <div className="view-content">
      {p.conflict && <NoteBanner conflict={p.conflict} onReview={p.onReview} />}
      <InlineTitle path={path} focusSignal={p.titleFocus} onRename={p.onRename} onDone={() => setTimeout(() => p.editor.current?.view.focus(), 0)} />
      <NoteEditor
        ws={ws}
        path={path}
        hidden={reading}
        mode={p.mode}
        onOpenLink={p.onOpenLink}
        onHandle={p.onHandle}
        isLive={() => ws.client.isLive(path)}
        extensions={extensions}
      />
      {reading && (
        <div className="reader-scroll">
          <Reader
            text={text}
            resolve={resolve}
            onInternalLink={(target, resolved, sub) => {
              if (resolved) return p.onOpen(target, sub);
              const np = toNotePath(target);
              if (np) p.onCreate(np);
            }}
            onTag={p.onTag}
            onToggleTask={(line) => p.onEditText(path, toggleTask(text, line))}
            imageSrc={attachments.imageSrc}
          />
        </div>
      )}
    </div>
  );
}
