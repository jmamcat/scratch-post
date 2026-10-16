// The gate (playbook/modules/ux, "Gate"): hard checks in every state, score floors, and the
// ratchet against the approved baseline.
import { readFileSync, writeFileSync } from 'node:fs';
import { round } from './metrics.ts';
import type { AppScore } from './score.ts';
import { type Baseline, CATEGORIES, CATEGORY_IDS, type CategoryId, HARD_CHECKS, type HardCheckId, type StateScore, type Violation } from './types.ts';

export const FLOOR_TOTAL = 85;
export const FLOOR_CATEGORY = 70;
/** G is a heuristic without published thresholds: judged against the baseline only, never floored. */
export const FLOORED: readonly CategoryId[] = ['A', 'B', 'C', 'D', 'E', 'F'];
export const MAX_TOTAL_DROP = 1.0;
export const MAX_CATEGORY_DROP = 3.0;

export const BASELINE_PATH = new URL('./baseline.json', import.meta.url);
export const REPORT_PATH = new URL('./report.md', import.meta.url);

export interface Delta {
  state: string;
  before: number;
  after: number;
  /** Points of the state total lost per category (W_c * dC_c / sum W); positive is worse. */
  lost: Partial<Record<CategoryId, number>>;
}

export interface Verdict {
  hard: { state: string; check: HardCheckId; detail: string }[];
  floors: { state: string; what: 'total' | CategoryId; value: number }[];
  deltas: Delta[];
  newViolations: { state: string; v: Violation }[];
  fixed: { state: string; key: string }[];
  unbaselined: string[];
  gone: string[];
  enginesChanged: string[];
  /** Why the ratchet fails; empty when nothing got worse than the baseline. */
  ratchet: string[];
}

export function readBaseline(path: URL = BASELINE_PATH): Baseline | null {
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as Baseline;
  } catch {
    return null;
  }
}

export function toBaseline(score: AppScore): Baseline {
  const states: Baseline['states'] = {};
  for (const s of [...score.states].sort((a, b) => a.id.localeCompare(b.id))) {
    const categories: Baseline['states'][string]['categories'] = {};
    for (const id of CATEGORY_IDS) {
      const c = s.categories[id];
      categories[id] = { score: c.score, metrics: Object.fromEntries(Object.entries(c.metrics).map(([k, m]) => [k, { raw: m.raw, score: m.score, n: m.n }])) };
    }
    states[s.id] = { total: s.total, categories, violations: s.violations.map((v) => v.key).sort() };
  }
  return { schema: 1, engines: score.engines, states };
}

export function writeBaseline(score: AppScore, path: URL = BASELINE_PATH): void {
  writeFileSync(path, `${JSON.stringify(toBaseline(score), null, 1)}\n`);
}

function pointsLost(s: StateScore, before: Baseline['states'][string]): Partial<Record<CategoryId, number>> {
  const applicable = CATEGORY_IDS.filter((id) => s.categories[id].score !== null);
  const sumW = applicable.reduce((a, id) => a + CATEGORIES[id].weight, 0) || 1;
  const out: Partial<Record<CategoryId, number>> = {};
  for (const id of CATEGORY_IDS) {
    const now = s.categories[id].score;
    const was = before.categories[id]?.score ?? null;
    if (now === null || was === null) continue;
    const lost = (CATEGORIES[id].weight * (was - now)) / sumW;
    if (Math.abs(lost) >= 0.005) out[id] = round(lost, 2);
  }
  return out;
}

export function judge(score: AppScore, baseline: Baseline | null): Verdict {
  const v: Verdict = { hard: [], floors: [], deltas: [], newViolations: [], fixed: [], unbaselined: [], gone: [], enginesChanged: [], ratchet: [] };
  for (const s of score.states) {
    for (const [check, r] of Object.entries(s.hard) as [HardCheckId, StateScore['hard'][HardCheckId]][]) if (r && !r.pass) v.hard.push({ state: s.id, check, detail: r.detail });
    if (s.total < FLOOR_TOTAL) v.floors.push({ state: s.id, what: 'total', value: s.total });
    for (const id of FLOORED) {
      const c = s.categories[id].score;
      if (c !== null && c < FLOOR_CATEGORY) v.floors.push({ state: s.id, what: id, value: c });
    }
  }
  if (!baseline) {
    v.ratchet.push('no approved baseline: run `pnpm -C quire ux:approve` and commit scenarios/ux/baseline.json');
    return v;
  }
  for (const k of Object.keys(score.engines) as (keyof AppScore['engines'])[]) {
    if (baseline.engines[k] !== score.engines[k]) v.enginesChanged.push(`${k} ${baseline.engines[k]} → ${score.engines[k]}`);
  }
  const gated = v.enginesChanged.length === 0;
  const now = new Set(score.states.map((s) => s.id));
  v.gone = Object.keys(baseline.states).filter((id) => !now.has(id));
  for (const s of score.states) {
    const before = baseline.states[s.id];
    if (!before) {
      v.unbaselined.push(s.id);
      continue;
    }
    const lost = pointsLost(s, before);
    v.deltas.push({ state: s.id, before: before.total, after: s.total, lost });
    const had = new Set(before.violations);
    for (const viol of s.violations) if (!had.has(viol.key)) v.newViolations.push({ state: s.id, v: viol });
    const has = new Set(s.violations.map((x) => x.key));
    for (const key of before.violations) if (!has.has(key)) v.fixed.push({ state: s.id, key });
    if (!gated) continue;
    if (before.total - s.total > MAX_TOTAL_DROP) v.ratchet.push(`${s.id}: total ${before.total} → ${s.total}`);
    for (const id of CATEGORY_IDS) {
      const was = before.categories[id]?.score ?? null;
      const c = s.categories[id].score;
      if (was !== null && c !== null && was - c > MAX_CATEGORY_DROP) v.ratchet.push(`${s.id}: ${id} ${CATEGORIES[id].name} ${was} → ${c}`);
    }
  }
  v.deltas.sort((a, b) => b.before - b.after - (a.before - a.after));
  if (gated && v.newViolations.length) v.ratchet.push(`${v.newViolations.length} new violations (see "New violations")`);
  return v;
}

/** R-PLT-08: hard checks, floors and the ratchet all pass. */
export function gateFailures(v: Verdict): string[] {
  return [
    ...v.hard.map((h) => `${h.state}: ${HARD_CHECKS[h.check]} failed (${h.detail})`),
    ...v.floors.map((f) => `${f.state}: ${f.what === 'total' ? 'total' : `${f.what} ${CATEGORIES[f.what].name}`} ${f.value} is under ${f.what === 'total' ? FLOOR_TOTAL : FLOOR_CATEGORY}`),
    ...v.ratchet,
  ];
}
