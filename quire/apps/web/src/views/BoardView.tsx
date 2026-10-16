import type { Workspace } from '../sync/index.ts';

/** Stub for packet 0002/P03: replace the body, keep the props. */
export function BoardView(_props: {
  ws: Workspace;
  version: number;
  active: string | null;
  onOpen: (path: string) => void;
  /** Write a note's new text (through the editor when it is the open note). */
  onEdit: (path: string, text: string) => void;
}) {
  return <p className="muted view-empty">This view arrives with packet P03.</p>;
}
