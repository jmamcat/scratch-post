import type { Workspace } from '../../sync/index.ts';

/**
 * Stub for packet 0002/P04. Contract: an `<svg aria-label="Graph">` (or "Local graph" when
 * `focus` is set) with `g[data-node="<path>"]` nodes that open the note on click and
 * `line[data-from][data-to]` edges.
 */
export function GraphView(props: { ws: Workspace; version: number; focus?: string | null; depth?: number; onOpen: (path: string) => void }) {
  return <svg aria-label={props.focus ? 'Local graph' : 'Graph'} className="graph" />;
}
