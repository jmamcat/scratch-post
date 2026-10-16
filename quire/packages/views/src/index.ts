// Contract for packet 0002/P02. Stubs until P02 lands; see packets/P02-views-package.md.

export interface NoteInfo {
  path: string;
  text: string;
  /** ISO time of the note's latest revision, when known. */
  modifiedAt?: string;
  /** Device that made the latest revision, when known. */
  device?: string;
}

export interface Group {
  /** Stable key (lower case); label is what people read. */
  key: string;
  label: string;
  /** Note paths, sorted by title. */
  items: string[];
}

export interface TagNode {
  /** Full tag, e.g. `idea/raw`. */
  tag: string;
  /** Last segment, e.g. `raw`. */
  name: string;
  /** Notes with this tag or a nested one. */
  count: number;
  notes: string[];
  children: TagNode[];
}

export interface GraphData {
  nodes: { path: string; title: string; degree: number }[];
  edges: { from: string; to: string }[];
}

export type TimeBucket = 'Today' | 'Yesterday' | 'This week' | 'This month' | 'Older';

export function domainOf(_note: NoteInfo): string {
  return 'Unsorted';
}
export function groupByDomain(_notes: NoteInfo[]): Group[] {
  return [];
}
export function tagTree(_notes: NoteInfo[]): TagNode[] {
  return [];
}
export function groupByTime(_notes: NoteInfo[], _now: Date): Group[] {
  return [];
}
export function groupByProperty(_notes: NoteInfo[], _key: string): Group[] {
  return [];
}
export function linkGraph(_notes: NoteInfo[], _resolve: (target: string, from: string) => string | null): GraphData {
  return { nodes: [], edges: [] };
}
export function neighbourhood(graph: GraphData, _focus: string, _depth: number): GraphData {
  return graph;
}
