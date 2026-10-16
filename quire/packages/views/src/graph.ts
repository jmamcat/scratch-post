import { titleOf } from '@quire/vault';
import { extractLinks } from '@quire/render';
import type { GraphData, NoteInfo } from './types.ts';

function withDegrees(paths: string[], edges: GraphData['edges']): GraphData {
  const degree = new Map<string, number>(paths.map((p) => [p, 0]));
  for (const e of edges) {
    degree.set(e.from, (degree.get(e.from) ?? 0) + 1);
    degree.set(e.to, (degree.get(e.to) ?? 0) + 1);
  }
  return { nodes: paths.map((path) => ({ path, title: titleOf(path), degree: degree.get(path) ?? 0 })), edges };
}

/**
 * A node per note and an edge per link that resolves to another note (R-NAV-08). Links
 * that resolve to nothing, to a non-note file or back to the same note draw no edge.
 */
export function linkGraph(notes: NoteInfo[], resolve: (target: string, from: string) => string | null): GraphData {
  const known = new Set(notes.map((n) => n.path));
  const seen = new Set<string>();
  const edges: GraphData['edges'] = [];
  for (const note of notes) {
    for (const link of extractLinks(note.text)) {
      const to = resolve(link.target, note.path);
      if (to === null || to === note.path || !known.has(to)) continue;
      const id = `${note.path}\u0000${to}`;
      if (seen.has(id)) continue;
      seen.add(id);
      edges.push({ from: note.path, to });
    }
  }
  return withDegrees([...known], edges);
}

/**
 * The notes within `depth` links of `focus`, following links in both directions, with the
 * edges between them (R-NAV-09). Degrees count only the edges kept. An unknown `focus`
 * gives an empty graph.
 */
export function neighbourhood(graph: GraphData, focus: string, depth: number): GraphData {
  if (!graph.nodes.some((n) => n.path === focus)) return { nodes: [], edges: [] };
  const adjacent = new Map<string, string[]>();
  const link = (a: string, b: string) => adjacent.set(a, [...(adjacent.get(a) ?? []), b]);
  for (const e of graph.edges) {
    link(e.from, e.to);
    link(e.to, e.from);
  }
  const reached = new Set([focus]);
  let frontier = [focus];
  for (let hop = 0; hop < depth && frontier.length > 0; hop++) {
    const next: string[] = [];
    for (const path of frontier) {
      for (const other of adjacent.get(path) ?? []) {
        if (reached.has(other)) continue;
        reached.add(other);
        next.push(other);
      }
    }
    frontier = next;
  }
  const edges = graph.edges.filter((e) => reached.has(e.from) && reached.has(e.to));
  return withDegrees(
    graph.nodes.map((n) => n.path).filter((p) => reached.has(p)),
    edges,
  );
}
