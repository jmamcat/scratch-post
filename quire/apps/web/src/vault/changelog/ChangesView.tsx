import type { Workspace } from '../../sync/index.ts';

/** Stub for packet 0002/P07: replace the body, keep the props. */
export function ChangesView(_props: { ws: Workspace; version: number; active: string | null; onOpen: (path: string) => void }) {
  return <p className="muted view-empty">This view arrives with packet P07.</p>;
}
