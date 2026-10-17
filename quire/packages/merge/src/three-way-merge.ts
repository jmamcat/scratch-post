import { diff3Merge } from 'node-diff3';
import { mergeFrontmatter, splitFm, unionProperty } from './frontmatter.ts';
import { type Choice, type Hunk, type MergeResult, type Segment, SegmentBuilder } from './segments.ts';

/** Three-way merge of two edits of one Markdown document (R-MRG-01..05). */
export function merge3(base: string, current: string, incoming: string): MergeResult {
  const crlf = current.includes('\r\n');
  const b = toLf(base);
  const c = toLf(current);
  const i = toLf(incoming);

  const builder = new SegmentBuilder();
  if (c === i) {
    builder.stable(c);
  } else if (c === b) {
    builder.stable(i);
  } else if (i === b) {
    builder.stable(c);
  } else {
    const fm = [splitFm(b), splitFm(c), splitFm(i)] as const;
    if (!mergeFrontmatter(fm[0], fm[1], fm[2], builder)) {
      mergeLines(b, c, i, builder);
    } else {
      mergeLines(fm[0].body, fm[1].body, fm[2].body, builder);
    }
  }

  let segments = builder.done();
  if (crlf) segments = segments.map(toCrlfSegment);
  const hunks = segments.flatMap((s) => (s.type === 'hunk' ? [s.hunk] : []));
  const conflicts = hunks.filter((h) => h.auto === null);
  return {
    text: applyChoices(segments, {}),
    segments,
    conflicts,
    review: hunks.filter((h) => h.auto !== null),
    clean: conflicts.length === 0,
  };
}

/** Turn per-hunk choices into one text. Unchosen hunks keep their auto text, else current. */
export function applyChoices(segments: Segment[], choices: Record<string, Choice>): string {
  let out = '';
  for (const seg of segments) {
    if (seg.type === 'stable') {
      out += seg.text;
      continue;
    }
    const h = seg.hunk;
    const choice = choices[h.id];
    if (choice === undefined) out += h.auto ?? h.current;
    else if (choice === 'current') out += h.current;
    else if (choice === 'incoming') out += h.incoming;
    else if (choice === 'both') out += h.kind === 'property' ? unionProperty(h) : joinBoth(h.current, h.incoming);
    else out += withTrailingNewline(choice.text, h);
  }
  return out;
}

function mergeLines(base: string, current: string, incoming: string, out: SegmentBuilder): void {
  const regions = diff3Merge(lines(current), lines(base), lines(incoming), { excludeFalseConflicts: true });
  for (const r of regions) {
    if (r.ok) {
      out.stable(r.ok.join(''));
      continue;
    }
    if (!r.conflict) continue;
    const c = r.conflict.a.join('');
    const b = r.conflict.o.join('');
    const i = r.conflict.b.join('');
    classify(b, c, i, out);
  }
}

function classify(base: string, current: string, incoming: string, out: SegmentBuilder): void {
  if (squash(current) === squash(incoming)) {
    out.stable(current);
    return;
  }
  const intra = mergeWords(base, current, incoming);
  if (intra !== null) {
    out.hunk({ kind: 'intraline', base, current, incoming, auto: intra });
    return;
  }
  if (base === '') {
    out.hunk({ kind: 'both-inserted', base, current, incoming, auto: insertBoth(current, incoming) });
    return;
  }
  out.hunk({ kind: 'text', base, current, incoming, auto: null });
}

function mergeWords(base: string, current: string, incoming: string): string | null {
  if (base === '') return null;
  const regions = diff3Merge(words(current), words(base), words(incoming), { excludeFalseConflicts: true });
  let out = '';
  for (const r of regions) {
    if (r.conflict) return null;
    out += (r.ok ?? []).join('');
  }
  return out;
}

function insertBoth(current: string, incoming: string): string {
  if (incoming.startsWith(current)) return incoming;
  if (current.startsWith(incoming)) return current;
  return joinBoth(current, incoming);
}

// ---------- helpers ----------

function lines(text: string): string[] {
  return text === '' ? [] : text.split(/(?<=\n)/);
}

function words(text: string): string[] {
  return text.match(/\s+|[\p{L}\p{N}_]+|[^\s\p{L}\p{N}_]/gu) ?? [];
}

function squash(text: string): string {
  return text.replace(/\s+/g, '');
}

function joinBoth(a: string, b: string): string {
  if (!a) return b;
  if (!b) return a;
  return a.endsWith('\n') ? a + b : `${a}\n${b}`;
}

function withTrailingNewline(text: string, h: Hunk): string {
  const sideEndsWithNewline = h.current.endsWith('\n') || h.incoming.endsWith('\n');
  return text && sideEndsWithNewline && !text.endsWith('\n') ? `${text}\n` : text;
}

function toLf(text: string): string {
  return text.replace(/\r\n/g, '\n');
}

function toCrlf(text: string): string {
  return text.replace(/\n/g, '\r\n');
}

function toCrlfSegment(s: Segment): Segment {
  if (s.type === 'stable') return { type: 'stable', text: toCrlf(s.text) };
  const h = s.hunk;
  return {
    type: 'hunk',
    hunk: {
      ...h,
      base: toCrlf(h.base),
      current: toCrlf(h.current),
      incoming: toCrlf(h.incoming),
      auto: h.auto === null ? null : toCrlf(h.auto),
    },
  };
}
