import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { type Hunk, SegmentBuilder } from './segments.ts';

// Front matter merges per key (R-MRG-04): properties both sides changed become 'property' hunks.

export interface FmSplit {
  /** YAML between the fences, or null when the document has no front matter. */
  yaml: string | null;
  /** Full front matter block including fences. */
  block: string;
  body: string;
}

const FM_RE = /^---\n([\s\S]*?\n)?---(?:\n|$)/;

export function splitFm(text: string): FmSplit {
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
export function mergeFrontmatter(b: FmSplit, c: FmSplit, i: FmSplit, out: SegmentBuilder): boolean {
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

export function unionProperty(h: Hunk): string {
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
