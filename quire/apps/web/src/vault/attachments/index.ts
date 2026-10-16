import type { Extension } from '@codemirror/state';
import { useMemo, useSyncExternalStore } from 'react';
import type { Workspace } from '../../sync/index.ts';
import { attachmentExtension } from './editor-extension.ts';
import { AttachmentEngine } from './engine.ts';

/** Attachments in the app (R-VLT-12). Contract fixed by 0003/P00. */
export interface Attachments {
  /** Editor extension: drop, paste and pick files into the attachment folder and embed them. */
  editorExtension(currentPath: () => string): Extension;
  /** Image `src` for an embedded vault path (an object URL once the bytes are local). */
  imageSrc(path: string): string;
  /** Bumps when newly fetched files can now be shown, so views re-render. */
  version: number;
}

/** One engine per workspace, however often React renders. */
const engines = new WeakMap<Workspace, AttachmentEngine>();

function engineFor(ws: Workspace): AttachmentEngine {
  let engine = engines.get(ws);
  if (!engine) {
    engine = new AttachmentEngine(ws);
    engines.set(ws, engine);
  }
  return engine;
}

export function useAttachments(ws: Workspace): Attachments {
  const engine = engineFor(ws);
  const version = useSyncExternalStore(engine.subscribe, engine.getVersion);
  // A new object per version: the reading view re-renders when `imageSrc` changes identity.
  return useMemo(
    () => ({
      editorExtension: (currentPath: () => string) => attachmentExtension(engine, currentPath),
      imageSrc: (path: string) => engine.imageSrc(path),
      version,
    }),
    [engine, version],
  );
}
