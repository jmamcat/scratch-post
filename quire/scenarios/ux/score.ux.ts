// One test per theme and colour scheme, each with its own cloud server on the demo seed (a shared
// server would show the other tests' devices as live peers); each writes its states to
// $QUIRE_UX_OUT for report.ux.ts.
// QUIRE_UX_THEMES, QUIRE_UX_SCHEMES and QUIRE_UX_SCREENS (comma-separated) narrow a run while working.
import { cpSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { type Browser, expect, test } from '@playwright/test';
import { ServerProcess } from '../support/servers.ts';
import { DEMO_SEED, quireApp } from './quire.ts';
import { type AppScore, prepareContext, scoreApp } from './score.ts';
import type { Scheme } from './types.ts';

const only = (name: string) => process.env[name]?.split(',').map((s) => s.trim()).filter(Boolean);
const themes = only('QUIRE_UX_THEMES') ?? quireApp.themes;
const schemes = (only('QUIRE_UX_SCHEMES') ?? quireApp.schemes) as Scheme[];

async function score(browser: Browser, url: string, theme: string, scheme: Scheme): Promise<AppScore> {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, locale: 'en-US', timezoneId: 'UTC', colorScheme: scheme });
  try {
    // The same device name as the R-PLT-08 scenario, so both score the same screens.
    await context.addInitScript((settings) => {
      if (!localStorage.getItem('quire.settings')) localStorage.setItem('quire.settings', settings);
    }, JSON.stringify({ serverUrl: url, token: '', device: 'pixel' }));
    const page = await context.newPage();
    await prepareContext(page);
    await page.goto(url);
    await expect(page.getByRole('status')).toHaveText('Synced', { timeout: 20_000 });
    const screens = only('QUIRE_UX_SCREENS');
    return await scoreApp(page, quireApp, {
      themes: [theme],
      schemes: [scheme],
      clsSamples: 3,
      ...(screens ? { screens } : {}),
      onState: (s) => console.log(`${s.id}  ${s.total}`),
    });
  } finally {
    await context.close();
  }
}

for (const theme of themes) {
  for (const scheme of schemes) {
    test(`${theme} ${scheme}`, async ({ browser }) => {
      const cloud = new ServerProcess({ device: 'cloud' });
      cpSync(DEMO_SEED, cloud.vaultDir, { recursive: true });
      try {
        await cloud.start();
        const result = await score(browser, cloud.url, theme, scheme);
        writeFileSync(join(process.env['QUIRE_UX_OUT']!, `${theme}-${scheme}.json`), JSON.stringify(result));
      } finally {
        await cloud.stop();
        rmSync(cloud.dataDir, { recursive: true, force: true });
      }
    });
  }
}
