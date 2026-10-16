import { toggleTask } from '@quire/render';
import type { Extension } from '@codemirror/state';
import { type ComponentProps, type RefObject, useCallback } from 'react';
import { Reader } from '../render/index.ts';
import { NoteBanner } from '../review/index.ts';
import type { Workspace } from '../sync/index.ts';
import { type Attachments, type EditorHandle, type EditorMode, InlineTitle, NoteEditor, toNotePath } from '../vault/index.ts';

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
  attachments: Attachments;
  attachmentExtension: Extension;
  editor: RefObject<EditorHandle | null>;
  onHandle: (h: EditorHandle | null) => void;
  onReview: (id: string) => void;
  onRename: (name: string) => string | null;
  onOpen: (path: string, heading?: string) => void;
  onCreate: (path: string) => void;
  onOpenLink: (target: string, from: string, heading?: string) => void;
  onTag: (tag: string) => void;
  onEditText: (path: string, text: string) => void;
}

/** The open note: banner, inline title, editor and (when reading) the rendered note. */
export function NoteView(p: Props) {
  const { ws, path, text, reading } = p;
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
        extensions={p.attachmentExtension}
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
            imageSrc={p.attachments.imageSrc}
          />
        </div>
      )}
    </div>
  );
}
