export type HunkKind = 'false-conflict' | 'whitespace' | 'intraline' | 'both-inserted' | 'text' | 'property';
export type Choice = 'current' | 'incoming' | 'both' | { text: string };

export interface Hunk {
  id: string;
  kind: HunkKind;
  base: string;
  current: string;
  incoming: string;
  /** Resolved text for auto-resolved kinds, null when a person must decide. */
  auto: string | null;
  /** Property name for kind 'property'. */
  key?: string;
}

export type Segment = { type: 'stable'; text: string } | { type: 'hunk'; hunk: Hunk };

export interface MergeResult {
  /** Provisional text: unresolved hunks take the current side. */
  text: string;
  segments: Segment[];
  /** Hunks a person must decide (kinds 'text' and 'property'). */
  conflicts: Hunk[];
  /** Auto-resolved hunks that deserve a glance (kinds 'intraline' and 'both-inserted'). */
  review: Hunk[];
  clean: boolean;
}

/** Collects stable text and numbered hunks, joining adjacent stable runs. */
export class SegmentBuilder {
  private segments: Segment[] = [];
  private n = 0;

  stable(text: string): void {
    if (!text) return;
    const last = this.segments[this.segments.length - 1];
    if (last?.type === 'stable') last.text += text;
    else this.segments.push({ type: 'stable', text });
  }

  hunk(h: Omit<Hunk, 'id'>): void {
    this.n += 1;
    this.segments.push({ type: 'hunk', hunk: { id: `h${this.n}`, ...h } });
  }

  done(): Segment[] {
    return this.segments;
  }
}
