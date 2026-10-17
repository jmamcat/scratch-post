// One axe run per state; categories A, B, D and E each read their own rules from it, so no
// rule is scored twice.
import { AxeBuilder } from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { IMPACT_WEIGHT, metric, violationKey } from './metrics.ts';
import type { CategoryId, Metric, Violation } from './types.ts';

export type AxeResults = Awaited<ReturnType<AxeBuilder['analyze']>>;
export type AxeRule = AxeResults['passes'][number];
export type AxeNode = AxeRule['nodes'][number];

export const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
/** Best-practice and document rules scored in E (Structure) rather than A. */
export const STRUCTURE_RULES = ['heading-order', 'page-has-heading-one', 'landmark-one-main', 'region', 'landmark-unique', 'document-title', 'html-has-lang'];
/** Rules another category scores with its own measurement. */
export const RULE_OWNER: Record<string, CategoryId> = {
  'color-contrast': 'B',
  'target-size': 'D',
  ...Object.fromEntries(STRUCTURE_RULES.map((r) => [r, 'E' as const])),
};

export interface AxeRun {
  results: AxeResults;
  /** Rule impact from axe's own rule metadata, for rules that passed (passes carry no impact). */
  impacts: Record<string, string>;
  version: string;
}

export async function runAxe(page: Page): Promise<AxeRun> {
  const results = await new AxeBuilder({ page }).withTags([...WCAG_TAGS, 'best-practice']).analyze();
  const impacts = await page.evaluate(() => {
    const audit = (window as unknown as { axe?: { _audit?: { rules?: { id: string; impact?: string }[] } } }).axe?._audit;
    return Object.fromEntries((audit?.rules ?? []).map((r) => [r.id, r.impact ?? 'moderate']));
  });
  return { results, impacts, version: results.testEngine.version };
}

/** Which category scores this rule; undefined for best-practice rules nobody scores. */
export function ownerOf(rule: AxeRule): CategoryId | undefined {
  const own = RULE_OWNER[rule.id];
  if (own) return own;
  return rule.tags.some((t) => WCAG_TAGS.includes(t)) ? 'A' : undefined;
}

export const targetOf = (node: AxeNode): string => node.target.map((t) => (Array.isArray(t) ? t.join(' >>> ') : String(t))).join(' >>> ');

/**
 * Rules owned by `category`, scored like Lighthouse: each applicable rule passes or fails,
 * weighted by its impact. Rules that only came back "incomplete" are not applicable.
 */
export function ruleMetrics(run: AxeRun, category: CategoryId, only?: (id: string) => boolean): Record<string, Metric> {
  const out: Record<string, Metric> = {};
  const failed = new Map(run.results.violations.filter((r) => ownerOf(r) === category).map((r) => [r.id, r]));
  for (const r of [...run.results.violations, ...run.results.passes]) {
    if (ownerOf(r) !== category || out[r.id] || (only && !only(r.id))) continue;
    const bad = failed.get(r.id);
    const impact = bad?.impact ?? run.impacts[r.id] ?? 'moderate';
    const n = r.nodes.length || 1;
    out[r.id] = metric(bad ? `${bad.nodes.length} failing` : 'pass', bad ? 0 : 1, n, IMPACT_WEIGHT[impact] ?? 3);
  }
  return out;
}

export function violationsOf(run: AxeRun): Violation[] {
  const out: Violation[] = [];
  for (const r of run.results.violations) {
    const category = ownerOf(r);
    if (!category) continue;
    for (const node of r.nodes) {
      const selector = targetOf(node);
      out.push({ key: violationKey(r.id, selector), rule: r.id, category, impact: node.impact ?? r.impact ?? 'moderate', selector, message: detail(r, node) });
    }
  }
  return out;
}

/** The rule's help text, plus the measured colours for contrast failures. */
function detail(rule: AxeRule, node: AxeNode): string {
  if (rule.id !== 'color-contrast') return rule.help;
  const d = (node.any.find((c) => c.id === 'color-contrast')?.data ?? {}) as { fgColor?: string; bgColor?: string; contrastRatio?: number; expectedContrastRatio?: string };
  return `${rule.help}: ${d.fgColor} on ${d.bgColor} is ${d.contrastRatio}:1, needs ${d.expectedContrastRatio}`;
}
