// A. Accessibility conformance (weight 30): axe WCAG 2.x A and AA rules, each pass or fail,
// weighted by impact. Contrast (B), target size (D) and structure rules (E) are scored elsewhere.
import { type AxeRun, ruleMetrics } from '../axe.ts';
import { category } from '../metrics.ts';
import type { CategoryScore } from '../types.ts';

export function scoreConformance(run: AxeRun): CategoryScore {
  return category(ruleMetrics(run, 'A'));
}
