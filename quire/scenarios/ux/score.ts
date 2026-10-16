// scoreState and scoreApp: the scorer's entry points (playbook/modules/ux). The runner
// (run.ux.ts) and the R-PLT-08 step (steps/ux.steps.ts) both call these.
import { readFileSync } from 'node:fs';
import type { Page } from '@playwright/test';
import { type AxeRun, runAxe, violationsOf } from './axe.ts';
import { scoreConformance } from './categories/a-conformance.ts';
import { scoreContrast } from './categories/b-contrast.ts';
import { scoreText } from './categories/c-text.ts';
import { scoreInteraction, shoot } from './categories/d-interaction.ts';
import { scoreStructure } from './categories/e-structure.ts';
import { measureCls, measureReflow, measureStability } from './categories/f-stability.ts';
import { scoreConsistency } from './categories/g-consistency.ts';
import { ensureHelpers, freezeMotion, recordLayoutShifts, thawMotion, waitForQuiet } from './dom.ts';
import { category, stateTotal } from './metrics.ts';
import type { CategoryId, CategoryScore, Engines, HardCheck, HardCheckId, Scheme, StateKey, StateScore, UxApp, Viewport } from './types.ts';

export const stateId = (k: StateKey) => `${k.screen}|${k.viewport}|${k.theme}|${k.scheme}`;

export interface StateSpec {
  key: StateKey;
  app: UxApp;
  viewport: Viewport;
  /** Also run the 320 px reflow check (narrow states). */
  reflow: boolean;
  /** CLS of earlier loads of the same screen; the score uses the median with this load's. */
  clsSamples?: number[];
}

/** Records layout shifts on every load of the page's context; call once before the first load. */
export async function prepareContext(page: Page): Promise<void> {
  await page.context().addInitScript(recordLayoutShifts);
}

/** Scores the screen the page shows now. The caller opened it and waited for the app to be ready. */
export async function scoreState(page: Page, state: StateSpec): Promise<StateScore & { engine: string }> {
  await ensureHelpers(page);
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  const cls = median([...(state.clsSamples ?? []), await measureCls(page)]);
  const axe: AxeRun = await runAxe(page);

  const a = scoreConformance(axe);
  const b = await scoreContrast(page, axe, state.app);
  const c = await scoreText(page, state.app);
  const e = scoreStructure(axe);
  const f = await measureStability(page, cls);

  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur?.());
  await freezeMotion(page);
  const base = await shoot(page);
  const g = await scoreConsistency(page, base);
  const d = await scoreInteraction(page, axe, state.app, base);
  await thawMotion(page);

  let reflow: HardCheck = null;
  const violations = [...violationsOf(axe), ...d.violations, ...f.violations];
  if (state.reflow) {
    const r = await measureReflow(page, state.viewport);
    f.metrics['reflow'] = r.metric;
    reflow = r.hard;
    violations.push(...r.violations);
  }

  const categories: Record<CategoryId, CategoryScore> = { A: a, B: b.score, C: c.score, D: d.score, E: e, F: category(f.metrics), G: g.score };
  const serious = violationsOf(axe).filter((v) => v.impact === 'critical' || v.impact === 'serious');
  const hard: Record<HardCheckId, HardCheck> = {
    'axe-serious': { pass: serious.length === 0, detail: serious.length ? `${serious.length}: ${[...new Set(serious.map((v) => v.rule))].join(', ')}` : 'none' },
    contrast: b.hard,
    reflow,
    'focus-visible': d.hard,
    'text-spacing': f.hard['text-spacing'] ?? null,
  };
  const incompleteRules = axe.results.incomplete.filter((r) => r.id !== 'color-contrast').length;
  return {
    id: stateId(state.key),
    key: state.key,
    total: stateTotal(categories),
    categories,
    hard,
    violations: dedupe(violations),
    reported: { ...b.reported, ...c.reported, ...d.reported, ...g.reported, 'axe-incomplete-rules': incompleteRules },
    engine: axe.version,
  };
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

function dedupe<T extends { key: string }>(list: T[]): T[] {
  const seen = new Set<string>();
  return list.filter((v) => (seen.has(v.key) ? false : (seen.add(v.key), true)));
}

export interface AppRun {
  themes?: readonly string[];
  schemes?: readonly Scheme[];
  screens?: readonly string[];
  viewports?: readonly string[];
  /** Wait after the screen is ready, so late layout shifts are counted (default 1000 ms). */
  settleMs?: number;
  /** How long the DOM must stay unchanged before scoring (default 400 ms). */
  quietMs?: number;
  /** Loads per state for CLS, which takes the median (default 1). */
  clsSamples?: number;
  onState?: (s: StateScore) => void;
}

export interface AppScore {
  states: StateScore[];
  /** Screens the build does not have (open() returned false), so they are not scored. */
  missing: string[];
  engines: Engines;
}

/** Every theme, scheme, viewport and screen of the app, in that nesting order, on one page. */
export async function scoreApp(page: Page, app: UxApp, run: AppRun = {}): Promise<AppScore> {
  const states: StateScore[] = [];
  const missing = new Set<string>();
  let axeVersion = '';
  const pick = <T extends string>(all: readonly T[], only?: readonly T[]) => (only ? all.filter((x) => only.includes(x)) : all);
  for (const theme of pick(app.themes, run.themes)) {
    for (const scheme of pick(app.schemes, run.schemes)) {
      await app.applyTheme(page, theme, scheme);
      for (const viewport of app.viewports.filter((v) => !run.viewports || run.viewports.includes(v.name))) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        for (const screen of app.screens.filter((s) => !run.screens || run.screens.includes(s.id))) {
          const settle = async () => {
            await page.waitForTimeout(run.settleMs ?? 1000);
            await waitForQuiet(page, run.quietMs ?? 400);
          };
          if (!(await screen.open(page, viewport))) {
            missing.add(screen.id);
            continue;
          }
          await settle();
          // Extra loads only for CLS; the last load is the one scored.
          const clsSamples: number[] = [];
          for (let i = 1; i < (run.clsSamples ?? 1); i++) {
            await ensureHelpers(page);
            clsSamples.push(await measureCls(page));
            await screen.open(page, viewport);
            await settle();
          }
          const key: StateKey = { screen: screen.id, viewport: viewport.name, theme, scheme };
          const s = await scoreState(page, { key, app, viewport, reflow: viewport.name === app.reflowFrom, clsSamples });
          axeVersion = s.engine;
          const { engine: _engine, ...state } = s;
          states.push(state);
          run.onState?.(state);
        }
      }
    }
  }
  return { states, missing: [...missing], engines: await engines(page, axeVersion) };
}

function pkgVersion(name: string): string {
  try {
    return (JSON.parse(readFileSync(new URL(`../node_modules/${name}/package.json`, import.meta.url), 'utf8')) as { version: string }).version;
  } catch {
    return 'unknown';
  }
}

export async function engines(page: Page, axe: string): Promise<Engines> {
  return { axe: axe || pkgVersion('@axe-core/playwright'), colorjs: pkgVersion('colorjs.io'), playwright: pkgVersion('@playwright/test'), chromium: page.context().browser()?.version() ?? 'unknown' };
}
