// E. Structure (weight 10): headings, landmarks, title and language, from axe's best-practice
// and document rules, weighted by impact like A.
import { type AxeRun, ruleMetrics } from '../axe.ts';
import { category } from '../metrics.ts';
import type { CategoryScore } from '../types.ts';

export function scoreStructure(run: AxeRun): CategoryScore {
  return category(ruleMetrics(run, 'E'));
}
