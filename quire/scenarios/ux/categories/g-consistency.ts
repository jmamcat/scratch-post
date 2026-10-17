// G. Consistency and density (weight 5). Heuristics with no published thresholds: read them
// against the baseline, to see which way a change moved.
//   font-sizes (w 1): distinct computed sizes of visible text, 6 or fewer good, 12 poor;
//   text-colours (w 1): distinct text colours grouped at ΔE2000 < 2, 6 good, 14 poor;
//   spacing-grid (w 1): share of margin, padding and gap values on a 4 px grid, 90% good, 60% poor.
// Edge density of the screenshot (Rosenholtz) and interactive elements per megapixel are reported.
import type { Page } from '@playwright/test';
import Color from 'colorjs.io';
import type { PNG } from 'pngjs';
import { category, metric, ramp, round } from '../metrics.ts';
import type { CategoryScore } from '../types.ts';

/** Share of pixels on a luminance edge (a cheap gradient threshold instead of Canny). */
export function edgeDensity(img: PNG): number {
  const { width: w, height: h, data } = img;
  const lum = (i: number) => 0.299 * data[i]! + 0.587 * data[i + 1]! + 0.114 * data[i + 2]!;
  let edges = 0;
  for (let y = 0; y < h - 1; y++) {
    for (let x = 0; x < w - 1; x++) {
      const i = (y * w + x) * 4;
      const g = Math.abs(lum(i + 4) - lum(i)) + Math.abs(lum(i + w * 4) - lum(i));
      if (g > 40) edges++;
    }
  }
  return edges / Math.max(1, (w - 1) * (h - 1));
}

export function colourGroups(colours: string[]): number {
  const groups: Color[] = [];
  for (const c of colours) {
    let col: Color;
    try {
      col = new Color(c);
    } catch {
      continue;
    }
    if (!groups.some((g) => g.deltaE(col, '2000') < 2)) groups.push(col);
  }
  return groups.length;
}

export async function scoreConsistency(page: Page, screenshot: PNG): Promise<{ score: CategoryScore; reported: Record<string, number | string> }> {
  const data = await page.evaluate(() => {
    const ux = window.__ux;
    const sizes = new Set<string>();
    const colours = new Set<string>();
    for (const t of ux.textNodes()) {
      const s = getComputedStyle(t.parentElement!);
      sizes.add((Math.round(parseFloat(s.fontSize) * 2) / 2).toString());
      colours.add(s.color);
    }
    let onGrid = 0;
    let values = 0;
    const props = ['marginTop', 'marginRight', 'marginBottom', 'marginLeft', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'rowGap', 'columnGap'] as const;
    for (const el of document.querySelectorAll('body *')) {
      if (!ux.visible(el)) continue;
      const s = getComputedStyle(el);
      for (const p of props) {
        const v = parseFloat(s[p]);
        if (!Number.isFinite(v) || v === 0) continue;
        values++;
        if (Math.abs(v - Math.round(v / 4) * 4) < 0.5) onGrid++;
      }
    }
    return { sizes: [...sizes], colours: [...colours], onGrid, values, interactive: ux.interactive().length, area: innerWidth * innerHeight };
  });
  const groups = colourGroups(data.colours);
  const grid = data.values ? data.onGrid / data.values : null;
  const score = category({
    'font-sizes': metric(data.sizes.length, ramp(data.sizes.length, 12, 6), data.sizes.length, 1),
    'text-colours': metric(groups, ramp(groups, 14, 6), data.colours.length, 1),
    'spacing-grid': metric(grid === null ? null : round(grid * 100, 1), grid === null ? null : ramp(grid, 0.6, 0.9), data.values, 1),
  });
  return {
    score,
    reported: { 'edge-density': round(edgeDensity(screenshot), 4), 'interactive-per-mpx': round((data.interactive * 1e6) / data.area, 1) },
  };
}
