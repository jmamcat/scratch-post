import type { Extension } from '@codemirror/state';
import { useMemo } from 'react';
import type { Workspace } from '../../sync/index.ts';

/** Attachments in the app (R-VLT-12). Contract fixed by 0003/P00; P07 implements it. */
export interface Attachments {
  /** Editor extension: drop, paste and pick files into the attachment folder and embed them. */
  editorExtension(currentPath: () => string): Extension;
  /** Image `src` for an embedded vault path (an object URL once the bytes are local). */
  imageSrc(path: string): string;
  /** Bumps when newly fetched files can now be shown, so views re-render. */
  version: number;
}

export function useAttachments(_ws: Workspace): Attachments {
  return useMemo(() => ({ editorExtension: () => [], imageSrc: (p: string) => encodeURI(p), version: 0 }), []);
}
