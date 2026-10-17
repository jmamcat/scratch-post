// The score formula (playbook/modules/ux, "Score"): linear ramps per metric, weighted means per
// category, a weighted mean of categories per state.
import { createHash } from 'node:crypto';
import { CATEGORIES, CATEGORY_IDS, type CategoryId, type CategoryScore, type Metric } from './types.ts';

/** 0 at `poor`, 1 at `good`, linear between; works in either direction. */
export function ramp(x: number, poor: number, good: number): number {
  if (good === poor) return x >= good ? 1 : 0;
  return Math.min(1, Math.max(0, (x - poor) / (good - poor)));
}

/** 1 inside [goodLo, goodHi], falling linearly to 0 at poorLo and poorHi. */
export function band(x: number, poorLo: number, goodLo: number, goodHi: number, poorHi: number): number {
  if (x < goodLo) return ramp(x, poorLo, goodLo);
  if (x > goodHi) return ramp(x, poorHi, goodHi);
  return 1;
}

/** Axe impact weights, the groups Lighthouse uses (critical 10, serious 7, moderate 3, minor 1). */
export const IMPACT_WEIGHT: Record<string, number> = { critical: 10, serious: 7, moderate: 3, minor: 1 };

export function metric(raw: Metric['raw'], score: number | null, n: number, weight: number, extra: Partial<Metric> = {}): Metric {
  return { raw: typeof raw === 'number' ? round(raw, 3) : raw, score: score === null || n === 0 ? null : round(score, 4), n, weight, ...extra };
}

export const reportOnly = (raw: Metric['raw'], n = 1): Metric => ({ raw: typeof raw === 'number' ? round(raw, 3) : raw, score: null, n, weight: 0, reportOnly: true });

/** C = 100 * sum(w m) / sum(w) over metrics that measured something. */
export function category(metrics: Record<string, Metric>): CategoryScore {
  let sw = 0;
  let s = 0;
  for (const m of Object.values(metrics)) {
    if (m.score === null || m.reportOnly || m.weight <= 0) continue;
    sw += m.weight;
    s += m.weight * m.score;
  }
  return { score: sw ? round((100 * s) / sw, 2) : null, metrics };
}

/** T = sum(W C) / sum(W) over categories that applied. */
export function stateTotal(categories: Record<CategoryId, CategoryScore>): number {
  let sw = 0;
  let s = 0;
  for (const id of CATEGORY_IDS) {
    const c = categories[id].score;
    if (c === null) continue;
    sw += CATEGORIES[id].weight;
    s += CATEGORIES[id].weight * c;
  }
  return sw ? round(s / sw, 2) : 0;
}

export function round(x: number, digits = 2): number {
  const f = 10 ** digits;
  return Math.round(x * f) / f;
}

/** Short stable hash of a selector, so violation keys stay readable in the baseline. */
export function hash(s: string): string {
  return createHash('sha256').update(s).digest('hex').slice(0, 10);
}

export const violationKey = (rule: string, selector: string) => `${rule}#${hash(selector)}`;
