// B. Contrast (weight 15). Reuses the colours, size and weight axe found for every text element
// (rule color-contrast), weighted by characters:
//   wcag-ratio (w 2, gated): share of characters at 4.5:1, or 3:1 for large text (WCAG 1.4.3);
//   apca-lc (w 1, advisory): share of characters at their Lc target, "Lc (APCA 0.0.98G-4g via
//   Color.js)": body text 75, other text 60, large or bold text 45, placeholder or disabled 30.
// Nodes axe could not decide (gradients, images, overlaps) are counted and reported, never passed.
import type { Page } from '@playwright/test';
import Color from 'colorjs.io';
import { type AxeNode, type AxeRun, targetOf } from '../axe.ts';
import { category, metric, round } from '../metrics.ts';
import type { CategoryScore, HardCheck, UxApp } from '../types.ts';

interface ContrastData {
  fgColor?: string;
  bgColor?: string;
  contrastRatio?: number;
  expectedContrastRatio?: string;
}

interface Measured {
  chars: number;
  px: number;
  weight: number;
  prose: boolean;
  dim: boolean;
}

export interface ContrastScore {
  score: CategoryScore;
  hard: HardCheck;
  reported: Record<string, number | string>;
}

export function lcTarget(m: Measured): number {
  if (m.dim) return 30;
  if (m.px >= 36 || (m.px >= 24 && m.weight >= 700)) return 45;
  return m.prose ? 75 : 60;
}

export async function scoreContrast(page: Page, run: AxeRun, app: UxApp): Promise<ContrastScore> {
  const of = (group: 'passes' | 'violations' | 'incomplete') => run.results[group].find((r) => r.id === 'color-contrast')?.nodes ?? [];
  const nodes: { node: AxeNode; pass: boolean }[] = [...of('passes').map((node) => ({ node, pass: true })), ...of('violations').map((node) => ({ node, pass: false }))];
  const incomplete = of('incomplete').length;
  const measured = await page.evaluate(
    ([selectors, prose]) =>
      selectors.map((sel): Measured | null => {
        let el: Element | null = null;
        try {
          el = document.querySelector(sel);
        } catch {
          return null;
        }
        if (!el) return null;
        let chars = 0;
        for (const n of el.childNodes) if (n.nodeType === Node.TEXT_NODE) chars += (n.nodeValue ?? '').replace(/\s+/g, ' ').trim().length;
        const s = getComputedStyle(el);
        const dim = el.matches(':disabled, [aria-disabled="true"]') || el.closest('[aria-disabled="true"], [disabled]') !== null;
        return { chars: Math.max(1, chars), px: parseFloat(s.fontSize), weight: Number.parseInt(s.fontWeight, 10) || 400, prose: window.__ux.within(el, prose), dim };
      }),
    [nodes.map((n) => targetOf(n.node)), app.prose] as const,
  );

  let total = 0;
  let passing = 0;
  let lcTotal = 0;
  let lcPassing = 0;
  let failingNodes = 0;
  nodes.forEach(({ node, pass }, i) => {
    const m = measured[i] ?? { chars: 1, px: 14, weight: 400, prose: false, dim: false };
    total += m.chars;
    if (pass) passing += m.chars;
    else failingNodes++;
    const data = (node.any.find((c) => c.id === 'color-contrast')?.data ?? {}) as ContrastData;
    if (!data.fgColor || !data.bgColor) return;
    try {
      const lc = Math.abs(new Color(data.bgColor).contrast(new Color(data.fgColor), 'APCA'));
      lcTotal += m.chars;
      if (lc >= lcTarget(m)) lcPassing += m.chars;
    } catch {
      // a colour Color.js cannot parse: leave it out of the advisory score
    }
  });
  const ratio = total ? passing / total : 1;
  const score = category({
    'wcag-ratio': metric(round(ratio * 100, 2), ratio, total, 2),
    'apca-lc': metric(lcTotal ? round((100 * lcPassing) / lcTotal, 2) : null, lcTotal ? lcPassing / lcTotal : null, lcTotal, 1, { advisory: true }),
  });
  return {
    score,
    hard: { pass: failingNodes === 0, detail: failingNodes ? `${failingNodes} text elements below the WCAG ratio (${round(ratio * 100, 2)}% of characters pass)` : `100% of ${total} characters` },
    reported: { 'contrast-incomplete': incomplete },
  };
}
