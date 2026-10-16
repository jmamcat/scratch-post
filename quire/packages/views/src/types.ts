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
  /** The same notes as `count` counts (nested tags included), sorted by title. */
  notes: string[];
  children: TagNode[];
}

export interface GraphData {
  nodes: { path: string; title: string; degree: number }[];
  edges: { from: string; to: string }[];
}

export type TimeBucket = 'Today' | 'Yesterday' | 'This week' | 'This month' | 'Older';
