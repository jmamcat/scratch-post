// F. Stability and responsiveness (weight 10):
//   cls (w 1): largest session window of layout shifts without recent input since the page
//     loaded (the median over the runner's loads), 0.1 good, 0.25 poor (web.dev CLS);
//   reflow (w 1, narrow states): at 320 px nothing scrolls or sticks out sideways (WCAG 1.4.10);
//   text-spacing (w 1): text newly cut off under the WCAG 1.4.12 overrides, 0 good, 5 poor;
//   reduced-motion (w 1): animations still running with prefers-reduced-motion, 0 good, 3 poor;
//   endless-motion (w 1): infinite animations without the setting, 0 good, 2 poor (WCAG 2.2.2).
import type { Page } from '@playwright/test';
import { metric, ramp, violationKey } from '../metrics.ts';
import type { HardCheck, Metric, Viewport, Violation } from '../types.ts';

const SPACING_CSS = `*, *::before, *::after { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; }
p { margin-bottom: 2em !important; }`;

export interface StabilityPart {
  metrics: Record<string, Metric>;
  hard: Partial<Record<'reflow' | 'text-spacing', HardCheck>>;
  violations: Violation[];
}

/** Largest burst of shifts (gaps under 1 s, windows up to 5 s), as Chrome defines CLS. */
export async function measureCls(page: Page): Promise<number> {
  const shifts = await page.evaluate(() => window.__ux.shifts.filter((s) => !s.hadRecentInput));
  let best = 0;
  let cur = 0;
  let start = -Infinity;
  let last = -Infinity;
  for (const s of shifts) {
    if (s.time - last > 1000 || s.time - start > 5000) {
      cur = 0;
      start = s.time;
    }
    cur += s.value;
    last = s.time;
    best = Math.max(best, cur);
  }
  return best;
}

const frames = (page: Page) => page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))));

export async function measureStability(page: Page, cls: number): Promise<StabilityPart> {
  const metrics: Record<string, Metric> = {};
  const violations: Violation[] = [];
  metrics['cls'] = metric(cls, ramp(cls, 0.25, 0.1), 1, 1);

  // Text spacing: what is cut off with the overrides that was not cut off without them.
  const before = await page.evaluate(() => window.__ux.clipped().map((el) => window.__ux.id(el)));
  await page.evaluate((css) => {
    const s = document.createElement('style');
    s.id = '__ux-spacing';
    s.textContent = css;
    document.head.append(s);
  }, SPACING_CSS);
  await frames(page);
  const after = await page.evaluate((prev) => {
    const was = new Set(prev);
    const now = window.__ux.clipped().filter((el) => !was.has(window.__ux.id(el)));
    // Report the innermost element only: its clipped ancestors are the same loss.
    return now.filter((el) => !now.some((o) => o !== el && el.contains(o))).map((el) => window.__ux.selector(el));
  }, before);
  await page.evaluate(() => document.getElementById('__ux-spacing')?.remove());
  await frames(page);
  metrics['text-spacing'] = metric(after.length, ramp(after.length, 5, 0), 1, 1);
  for (const sel of after) violations.push({ key: violationKey('text-spacing', sel), rule: 'text-spacing', category: 'F', impact: 'serious', selector: sel, message: 'Text is cut off with WCAG 1.4.12 text spacing' });

  // Motion.
  const endless = await page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running' && a.effect?.getTiming().iterations === Infinity).length);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await frames(page);
  const moving = await page.evaluate(
    () =>
      document.getAnimations().filter((a) => {
        if (a.playState !== 'running') return false;
        const t = a.effect?.getComputedTiming();
        return Number(t?.activeDuration ?? 0) > 0;
      }).length,
  );
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  metrics['reduced-motion'] = metric(moving, ramp(moving, 3, 0), 1, 1);
  metrics['endless-motion'] = metric(endless, ramp(endless, 2, 0), 1, 1);

  return { metrics, hard: { 'text-spacing': { pass: after.length === 0, detail: after.length ? `${after.length} cut off: ${after.slice(0, 3).join('; ')}` : 'nothing cut off' } }, violations };
}

/**
 * Narrow the viewport to 320 px, look for sideways scrolling or text sticking out past the
 * right edge outside a sideways-scrolling box (code and tables may scroll, WCAG 1.4.10), then
 * restore the viewport.
 */
export async function measureReflow(page: Page, restore: Viewport): Promise<{ metric: Metric; hard: HardCheck; violations: Violation[] }> {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.waitForTimeout(150);
  await frames(page);
  const found = await page.evaluate(() => {
    const ux = window.__ux;
    const w = innerWidth;
    const scrolls = document.documentElement.scrollWidth > w + 1 || document.body.scrollWidth > w + 1;
    const scrollsSideways = (el: Element) => {
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        const ox = getComputedStyle(p).overflowX;
        if ((ox === 'auto' || ox === 'scroll') && p.getBoundingClientRect().right <= w + 1) return true;
      }
      return false;
    };
    const out: string[] = [];
    for (const t of ux.textNodes()) {
      const el = t.parentElement!;
      const r = el.getBoundingClientRect();
      // Wholly off screen is a closed drawer; straddling the edge is lost text.
      if (r.left >= w - 1 || r.right <= w + 1 || r.left < 0) continue;
      if (scrollsSideways(el)) continue;
      const range = document.createRange();
      range.selectNodeContents(t);
      const tr = range.getBoundingClientRect();
      if (tr.right > w + 1 && tr.left < w - 1) out.push(ux.selector(el));
    }
    return { scrolls, out: [...new Set(out)].slice(0, 10) };
  });
  await page.setViewportSize({ width: restore.width, height: restore.height });
  await frames(page);
  const pass = !found.scrolls && found.out.length === 0;
  const violations: Violation[] = found.out.map((sel) => ({ key: violationKey('reflow', sel), rule: 'reflow', category: 'F', impact: 'serious', selector: sel, message: 'Text sticks out past the right edge at 320 px' }));
  if (found.scrolls) violations.push({ key: violationKey('reflow', 'document'), rule: 'reflow', category: 'F', impact: 'serious', selector: 'document', message: 'The page scrolls sideways at 320 px' });
  return {
    metric: metric(pass ? 'pass' : 'fail', pass ? 1 : 0, 1, 1),
    hard: { pass, detail: pass ? 'reflows at 320 px' : `${found.scrolls ? 'page scrolls sideways; ' : ''}${found.out.length} elements stick out: ${found.out.slice(0, 3).join('; ')}` },
    violations,
  };
}
