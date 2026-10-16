import type { Workspace } from '../sync/index.ts';

/** Stub for packet 0002/P03: replace the body, keep the props. */
export function TimelineView(_props: {
  ws: Workspace;
  version: number;
  active: string | null;
  onOpen: (path: string) => void;
}) {
  return <p className="muted view-empty">This view arrives with packet P03.</p>;
}
