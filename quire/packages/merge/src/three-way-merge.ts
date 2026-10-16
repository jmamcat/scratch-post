import { diff3Merge } from 'node-diff3';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

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

class SegmentBuilder {
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

// ---------- front matter ----------

interface FmSplit {
  /** YAML between the fences, or null when the document has no front matter. */
  yaml: string | null;
  /** Full front matter block including fences. */
  block: string;
  body: string;
}

const FM_RE = /^---\n([\s\S]*?\n)?---(?:\n|$)/;

function splitFm(text: string): FmSplit {
  const m = FM_RE.exec(text);
  if (!m) return { yaml: null, block: '', body: text };
  return { yaml: m[1] ?? '', block: m[0], body: text.slice(m[0].length) };
}

type YamlMap = Record<string, unknown>;

function parseMap(fm: FmSplit): YamlMap | null {
  if (fm.yaml === null) return {};
  try {
    const v: unknown = parseYaml(fm.yaml);
    if (v === null || v === undefined) return {};
    if (typeof v !== 'object' || Array.isArray(v)) return null;
    return v as YamlMap;
  } catch {
    return null;
  }
}

/** Returns false when front matter cannot be merged per key and the caller should merge lines. */
function mergeFrontmatter(b: FmSplit, c: FmSplit, i: FmSplit, out: SegmentBuilder): boolean {
  if (b.yaml === null && c.yaml === null && i.yaml === null) return true;
  if (c.block === i.block || i.block === b.block) {
    out.stable(c.block);
    return true;
  }
  if (c.block === b.block) {
    out.stable(i.block);
    return true;
  }
  const bm = parseMap(b);
  const cm = parseMap(c);
  const im = parseMap(i);
  if (!bm || !cm || !im) return false;

  const keys = [...Object.keys(cm)];
  for (const k of Object.keys(im)) if (!keys.includes(k)) keys.push(k);
  for (const k of Object.keys(bm)) if (!keys.includes(k)) keys.push(k);

  const fm = new SegmentBuilder();
  let any = false;
  for (const k of keys) {
    const bv = bm[k];
    const cv = cm[k];
    const iv = im[k];
    let v: unknown;
    if (deepEqual(cv, iv)) v = cv;
    else if (deepEqual(cv, bv)) v = iv;
    else if (deepEqual(iv, bv)) v = cv;
    else {
      fm.hunk({ kind: 'property', key: k, base: prop(k, bv), current: prop(k, cv), incoming: prop(k, iv), auto: null });
      any = true;
      continue;
    }
    if (v !== undefined) {
      fm.stable(prop(k, v));
      any = true;
    }
  }
  if (!any) return true;

  out.stable('---\n');
  for (const seg of fm.done()) {
    if (seg.type === 'stable') out.stable(seg.text);
    else {
      const { id: _id, ...rest } = seg.hunk;
      out.hunk(rest);
    }
  }
  out.stable('---\n');
  return true;
}

function prop(key: string, value: unknown): string {
  return value === undefined ? '' : stringifyYaml({ [key]: value });
}

function unionProperty(h: Hunk): string {
  if (!h.key) return h.current;
  const c = readProp(h.current, h.key);
  const i = readProp(h.incoming, h.key);
  if (Array.isArray(c) && Array.isArray(i)) {
    const merged = [...c];
    for (const v of i) if (!merged.some((m) => deepEqual(m, v))) merged.push(v);
    return prop(h.key, merged);
  }
  return h.current;
}

function readProp(text: string, key: string): unknown {
  if (!text) return undefined;
  try {
    return (parseYaml(text) as YamlMap | null)?.[key];
  } catch {
    return undefined;
  }
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

export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, n) => deepEqual(v, b[n]));
  }
  const ak = Object.keys(a as YamlMap);
  const bk = Object.keys(b as YamlMap);
  return ak.length === bk.length && ak.every((k) => deepEqual((a as YamlMap)[k], (b as YamlMap)[k]));
}
