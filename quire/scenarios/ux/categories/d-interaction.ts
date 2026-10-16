// D. Interaction (weight 15):
//   target-size (w 1): share of targets passing axe target-size (24 px or spaced, WCAG 2.5.8);
//   focus-visible (w 2): Tab through up to 50 elements and compare a padded crop focused and not
//     focused. Full credit when the changed pixels at 3:1 or more cover a 2 px perimeter
//     (WCAG 2.4.13), half credit for any visible change, none otherwise (WCAG 2.4.7);
//   not-obscured (w 1): the focused element is on screen and on top at its centre (WCAG 2.4.11);
//   keyboard-reach (w 1): share of visible interactive elements that Tab reaches.
// 44 px primary actions (WCAG 2.5.5) are reported only.
import type { Page } from '@playwright/test';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import type { AxeRun } from '../axe.ts';
import { category, metric, reportOnly, round, violationKey } from '../metrics.ts';
import type { CategoryScore, HardCheck, UxApp, Violation } from '../types.ts';

const PAD = 6;

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Focused {
  id: number;
  selector: string;
  rect: Box;
  covered: boolean;
}

export interface InteractionScore {
  score: CategoryScore;
  hard: HardCheck;
  violations: Violation[];
  reported: Record<string, number | string>;
}

function luminance(d: Uint8Array, i: number): number {
  const ch = (v: number) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * ch(d[i]!) + 0.7152 * ch(d[i + 1]!) + 0.0722 * ch(d[i + 2]!);
}

/** 1, 0.5 or 0 for one element: see the header. `a` is unfocused, `b` focused, same size. */
export function focusCredit(a: PNG, b: PNG, elem: Box): number {
  const changed = pixelmatch(a.data, b.data, undefined, a.width, a.height, { threshold: 0.1 });
  if (changed < 2) return 0;
  let strong = 0;
  for (let i = 0; i < a.data.length; i += 4) {
    const la = luminance(a.data, i);
    const lb = luminance(b.data, i);
    if ((Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05) >= 3) strong++;
  }
  const perimeter = Math.max(4, 4 * (Math.round(elem.w) + Math.round(elem.h)) - 16);
  return strong >= perimeter ? 1 : 0.5;
}

export function crop(img: PNG, box: Box): PNG {
  const out = new PNG({ width: box.w, height: box.h });
  for (let y = 0; y < box.h; y++) {
    const from = ((box.y + y) * img.width + box.x) * 4;
    img.data.copy(out.data, y * box.w * 4, from, from + box.w * 4);
  }
  return out;
}

function clipOf(rect: Box, vw: number, vh: number): Box | null {
  const x0 = Math.max(0, Math.floor(rect.x - PAD));
  const y0 = Math.max(0, Math.floor(rect.y - PAD));
  const x1 = Math.min(vw, Math.ceil(rect.x + rect.w + PAD));
  const y1 = Math.min(vh, Math.ceil(rect.y + rect.h + PAD));
  return x1 - x0 >= 2 && y1 - y0 >= 2 ? { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } : null;
}

const sameBox = (a: Box, b: Box) => Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) < 0.5 && Math.abs(a.w - b.w) < 0.5 && Math.abs(a.h - b.h) < 0.5;

/** Animations are already frozen by freezeMotion (dom.ts) while the walk runs. */
export async function shoot(page: Page, clip?: Box): Promise<PNG> {
  return PNG.sync.read(await page.screenshot({ animations: 'allow', caret: 'hide', scale: 'css', ...(clip ? { clip: { x: clip.x, y: clip.y, width: clip.w, height: clip.h } } : {}) }));
}

/** `base` is a screenshot of the viewport with nothing focused, taken right before. */
export async function scoreInteraction(page: Page, run: AxeRun, app: UxApp, base: PNG, maxTabs = 50): Promise<InteractionScore> {
  const metrics: Record<string, ReturnType<typeof metric>> = {};
  const rule = (g: 'passes' | 'violations') => run.results[g].find((r) => r.id === 'target-size')?.nodes.length ?? 0;
  const tsPass = rule('passes');
  const tsFail = rule('violations');
  metrics['target-size'] = metric(tsPass + tsFail ? `${tsFail} of ${tsPass + tsFail} too small` : null, tsPass + tsFail ? tsPass / (tsPass + tsFail) : null, tsPass + tsFail, 1);

  const { candidates, primary } = await page.evaluate((primarySelectors) => {
    const ux = window.__ux;
    const box = (el: Element) => {
      const r = el.getBoundingClientRect();
      return { x: r.left, y: r.top, w: r.width, h: r.height };
    };
    const primary = primarySelectors.flatMap((s) => [...document.querySelectorAll(s)]).filter(ux.visible).map(box);
    return { candidates: ux.interactive().map((el) => ({ id: ux.id(el), rect: box(el) })), primary };
  }, app.primaryActions);
  if (primary.length) {
    const big = primary.filter((b) => b.w >= 44 && b.h >= 44).length;
    metrics['target-44-primary'] = reportOnly(`${big} of ${primary.length}`, primary.length);
  }
  const baseRects = new Map(candidates.map((c) => [c.id, c.rect]));
  const vw = base.width;
  const vh = base.height;

  const reached: { f: Focused; credit: number }[] = [];
  const seen = new Set<number>();
  let trapped = '';
  // Start where the app put focus; past the end of the page, Tab wraps to the top as it does
  // for a person (through the browser's own controls), until an element comes round again.
  let outside = 0;
  const escapes = app.tabEscapes;
  let escape = await page.evaluate(escapeKey, escapes);
  for (let presses = 0; reached.length < maxTabs && presses < maxTabs + 5; presses++) {
    if (escape) await page.keyboard.press(escape);
    await page.keyboard.press('Tab');
    // One round trip per stop. CSS focus styles are in the next screenshot anyway; text fields
    // and editors draw their caret late (an editor measures, then draws its own cursor layer),
    // so they get time and two frames first.
    const step = await page.evaluate(async (escapes) => {
      const frames = () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
      const a = document.activeElement;
      if (!a || a === document.body || a === document.documentElement) return { f: null, escape: null };
      if (a instanceof HTMLElement && (a.isContentEditable || a.matches('input, textarea'))) {
        await new Promise((r) => setTimeout(r, 150));
        await frames();
      }
      const r = a.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const onScreen = cx >= 0 && cy >= 0 && cx < innerWidth && cy < innerHeight;
      const hit = onScreen ? document.elementFromPoint(cx, cy) : null;
      const covered = !hit || !(hit === a || a.contains(hit) || hit.contains(a));
      return {
        f: { id: window.__ux.id(a), selector: window.__ux.selector(a), rect: { x: r.left, y: r.top, w: r.width, h: r.height }, covered },
        escape: escapes.find((e) => a.closest(e.selector))?.key ?? null,
      };
    }, escapes);
    const f: Focused | null = step.f;
    escape = step.escape;
    if (!f) {
      if (++outside > 2) break;
      continue;
    }
    outside = 0;
    if (seen.has(f.id)) {
      if (reached.at(-1)?.f.id === f.id) trapped = f.selector;
      break;
    }
    seen.add(f.id);
    const clip = clipOf(f.rect, vw, vh);
    if (!clip) {
      reached.push({ f: { ...f, covered: true }, credit: 0 });
      continue;
    }
    const focused = await shoot(page, clip);
    let blurred: PNG;
    const before = baseRects.get(f.id);
    if (before && sameBox(before, f.rect)) blurred = crop(base, clip);
    else {
      // The page scrolled or the element is new: take the unfocused picture now, then focus it again.
      await page.evaluate(() => {
        const a = document.activeElement as HTMLElement | null;
        (window as unknown as { __uxLast?: HTMLElement | null }).__uxLast = a;
        a?.blur();
      });
      blurred = await shoot(page, clip);
      await page.evaluate(() => (window as unknown as { __uxLast?: HTMLElement | null }).__uxLast?.focus({ preventScroll: true }));
    }
    reached.push({ f, credit: focusCredit(blurred, focused, f.rect) });
  }

  const n = reached.length;
  const credit = n ? reached.reduce((a, r) => a + r.credit, 0) / n : null;
  metrics['focus-visible'] = metric(credit === null ? null : round(credit * 100, 1), credit, n, 2);
  const onTop = reached.filter((r) => !r.f.covered).length;
  metrics['not-obscured'] = metric(n ? `${n - onTop} obscured` : null, n ? onTop / n : null, n, 1);
  const wanted = Math.min(candidates.length, maxTabs);
  const got = candidates.filter((c) => seen.has(c.id)).length;
  metrics['keyboard-reach'] = metric(wanted ? `${got} of ${candidates.length}` : null, wanted ? Math.min(1, got / wanted) : null, wanted, 1);

  const violations: Violation[] = [];
  for (const r of reached) {
    if (r.credit === 0) violations.push({ key: violationKey('focus-visible', r.f.selector), rule: 'focus-visible', category: 'D', impact: 'serious', selector: r.f.selector, message: 'No visible change when focused' });
    if (r.f.covered) violations.push({ key: violationKey('focus-obscured', r.f.selector), rule: 'focus-obscured', category: 'D', impact: 'moderate', selector: r.f.selector, message: 'Focused element is off screen or covered at its centre' });
  }
  const invisible = reached.filter((r) => r.credit === 0);
  return {
    score: category(metrics),
    hard: {
      pass: invisible.length === 0,
      detail: invisible.length ? `${invisible.length} of ${n} reached elements show no focus change: ${invisible.slice(0, 3).map((r) => r.f.selector).join('; ')}` : `${n} reached elements all show focus`,
    },
    violations,
    reported: { 'tab-stops': n, ...(trapped ? { 'tab-trap': trapped } : {}) },
  };
}

function escapeKey(escapes: readonly { selector: string; key: string }[]): string | null {
  const a = document.activeElement;
  return a && a !== document.body ? (escapes.find((e) => a.closest(e.selector))?.key ?? null) : null;
}
