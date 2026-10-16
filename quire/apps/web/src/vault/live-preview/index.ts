import type { Extension } from '@codemirror/state';

export interface LivePreviewOptions {
  /** Follow a wikilink or Markdown link clicked in the editor. */
  onOpenLink: (target: string, heading?: string) => void;
}

/** Stub for packet 0002/P01: return the Live Preview extension (R-RND-08, R-RND-09). */
export function livePreview(_opts: LivePreviewOptions): Extension {
  return [];
}
