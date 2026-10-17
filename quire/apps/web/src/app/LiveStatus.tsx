import { LiveIndicator, useLive } from '../live/index.ts';
import type { Workspace } from '../sync/index.ts';
import type { EditorHandle } from '../vault/index.ts';

/** Runs the live session for the open note and shows its chip in the status bar. */
export default function LiveStatus({ ws, editor }: { ws: Workspace; editor: EditorHandle | null }) {
  return <LiveIndicator info={useLive(ws, editor)} />;
}
