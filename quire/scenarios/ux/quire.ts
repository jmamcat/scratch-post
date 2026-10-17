// Quire's side of the UX scorer: themes, viewports, the standard screens of R-PLT-08 and how to
// open each one. The scorer itself (score.ts and categories/) knows nothing about Quire.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Page } from '@playwright/test';
import type { Screen, UxApp, Viewport } from './types.ts';

/** The theme ids of apps/web/src/platforms/themes (R-PLT-05); the scorer checks them against the Theme select. */
export const THEME_IDS = ['default', 'minimal', 'things', 'paper', 'atlas'] as const;
const NOTE = 'Welcome.md';
const NARROW = 800;

export const DEMO_SEED = fileURLToPath(new URL('../../demo/seed', import.meta.url));

/** Every note of the demo seed (quire/demo/seed) as [path, text]. */
export function demoNotes(): [string, string][] {
  const out: [string, string][] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir).sort()) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (name.endsWith('.md')) out.push([relative(DEMO_SEED, full).split('\\').join('/'), readFileSync(full, 'utf8')]);
    }
  };
  walk(DEMO_SEED);
  return out;
}

async function ready(page: Page): Promise<void> {
  // The status bar reads "Loading" until the local store is open, then "Synced" once caught up.
  await page.waitForFunction(() => document.querySelector('[role="status"]')?.textContent === 'Synced', undefined, { timeout: 15_000 }).catch(async () => {
    await page.waitForFunction(() => {
      const t = document.querySelector('[role="status"]')?.textContent;
      return !!t && t !== 'Loading';
    });
  });
}

/** Reload on `hash` with these sidebar and view preferences (shared/use-pref.ts keys). */
async function load(page: Page, prefs: Record<string, unknown>, hash: string): Promise<void> {
  await page.evaluate(
    ({ prefs, hash }) => {
      for (const [k, v] of Object.entries(prefs)) localStorage.setItem(`quire.pref.${k}`, JSON.stringify(v));
      history.replaceState(null, '', hash);
    },
    { prefs, hash },
  );
  await page.reload({ waitUntil: 'load' });
  await ready(page);
}

const notePrefs = (reading: boolean) => ({ leftOpen: false, rightOpen: true, rightTab: 'backlinks', reading, leftView: 'files' });

async function openNote(page: Page, reading: boolean): Promise<void> {
  await load(page, notePrefs(reading), `#/${NOTE}`);
  const target = reading ? page.getByRole('document', { name: 'Reading view' }) : page.locator('.cm-content .cm-line').first();
  await target.waitFor({ state: 'visible' });
}

function sidebar(id: string, label: string, view: string): Screen {
  return {
    id,
    label,
    async open(page, viewport) {
      await load(page, { leftOpen: true, rightOpen: false, reading: false, leftView: view }, `#/${NOTE}`);
      await page.locator('.cm-content .cm-line').first().waitFor({ state: 'visible' });
      // On narrow screens the sidebar starts closed and is not remembered.
      if (viewport.width <= NARROW) await page.getByRole('button', { name: 'Toggle left sidebar' }).click();
      await page.locator(`.pane-body[data-view="${view}"] > *`).first().waitFor({ state: 'visible' });
      await page.mouse.move(viewport.width - 1, viewport.height - 1);
      return true;
    },
  };
}

async function runCommand(page: Page, name: string): Promise<void> {
  await page.keyboard.press('ControlOrMeta+P');
  await page.getByRole('dialog', { name: 'Command palette' }).waitFor({ state: 'visible' });
  await page.keyboard.type(name);
  await page.keyboard.press('Enter');
}

const absent = new Set<string>();

function drawer(id: string, label: string, command: string): Screen {
  return {
    id,
    label,
    async open(page) {
      if (absent.has(id)) return false;
      await openNote(page, false);
      await runCommand(page, command);
      const dialog = page.getByRole('dialog', { name: label });
      const shown = await dialog.waitFor({ state: 'visible', timeout: 3_000 }).then(
        () => true,
        () => false,
      );
      if (!shown) {
        // Built without this screen (a stub renders nothing): not a standard screen yet.
        absent.add(id);
        await page.keyboard.press('Escape');
      }
      return shown;
    },
  };
}

export const SCREENS: Screen[] = [
  {
    id: 'editor',
    label: 'Editor',
    async open(page) {
      await openNote(page, false);
      return true;
    },
  },
  {
    id: 'reading',
    label: 'Reading view',
    async open(page) {
      await openNote(page, true);
      return true;
    },
  },
  sidebar('folders', 'Sidebar: Folders', 'files'),
  sidebar('tags', 'Sidebar: Tags', 'tags'),
  sidebar('board', 'Sidebar: Board', 'board'),
  {
    id: 'graph',
    label: 'Graph',
    async open(page) {
      await load(page, { leftOpen: false, rightOpen: false }, '#/~graph');
      await page.locator('svg[aria-label="Graph"] g[data-node]').first().waitFor({ state: 'visible' });
      // The force layout runs until it settles; wait for the nodes to stop moving.
      await page.waitForFunction(
        () =>
          new Promise<boolean>((resolve) => {
            const read = () => [...document.querySelectorAll('g[data-node]')].map((g) => g.getAttribute('transform')).join();
            const a = read();
            setTimeout(() => resolve(read() === a), 300);
          }),
        undefined,
        { timeout: 15_000 },
      );
      return true;
    },
  },
  {
    id: 'settings',
    label: 'Settings',
    async open(page) {
      await openNote(page, false);
      await page.keyboard.press('ControlOrMeta+Comma');
      await page.getByRole('dialog', { name: 'Settings' }).waitFor({ state: 'visible' });
      return true;
    },
  },
  drawer('review', 'Review inbox', 'Open review inbox'),
  drawer('vault-history', 'Vault history', 'Open vault history'),
];

export const VIEWPORTS: Viewport[] = [
  { name: '1280x800', width: 1280, height: 800 },
  { name: '390x844', width: 390, height: 844 },
];

export const quireApp: UxApp = {
  themes: THEME_IDS,
  schemes: ['light', 'dark'],
  viewports: VIEWPORTS,
  reflowFrom: '390x844',
  screens: SCREENS,
  userContent: ['[role="document"][aria-label="Reading view"]', '.cm-content', '.inline-title', '[role="tree"]', '.group-list', '.board-view', 'svg.graph', '.breadcrumb', '.right-pane', '.status-device'],
  prose: ['[role="document"][aria-label="Reading view"]', '.cm-content'],
  primaryActions: ['button.primary'],
  // CodeMirror keeps Tab for indenting; Escape then Tab moves focus on (its documented way out).
  tabEscapes: [{ selector: '.cm-content', key: 'Escape' }],
  async applyTheme(page, theme, scheme) {
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'no-preference' });
    await page.evaluate((id) => {
      localStorage.setItem('quire.theme', id);
      document.documentElement.dataset['quireTheme'] = id;
    }, theme);
  },
};

/** Theme ids offered by the Theme select in Settings, to catch a theme added without the scorer. */
export async function offeredThemes(page: Page): Promise<string[]> {
  await page.keyboard.press('ControlOrMeta+Comma');
  const dialog = page.getByRole('dialog', { name: 'Settings' });
  await dialog.waitFor({ state: 'visible' });
  const ids = await dialog.getByLabel('Theme').locator('option').evaluateAll((os) => os.map((o) => (o as HTMLOptionElement).value));
  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'hidden' });
  return ids;
}
