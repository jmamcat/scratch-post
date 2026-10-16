// One test per theme and colour scheme; each writes its states to $QUIRE_UX_OUT for report.ux.ts.
// QUIRE_UX_THEMES, QUIRE_UX_SCHEMES and QUIRE_UX_SCREENS (comma-separated) narrow a run while working.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { quireApp } from './quire.ts';
import { prepareContext, scoreApp } from './score.ts';
import type { Scheme } from './types.ts';

const only = (name: string) => process.env[name]?.split(',').map((s) => s.trim()).filter(Boolean);
const themes = only('QUIRE_UX_THEMES') ?? quireApp.themes;
const schemes = (only('QUIRE_UX_SCHEMES') ?? quireApp.schemes) as Scheme[];

for (const theme of themes) {
  for (const scheme of schemes) {
    test(`${theme} ${scheme}`, async ({ browser }) => {
      const url = process.env['QUIRE_UX_URL']!;
      const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, locale: 'en-US', timezoneId: 'UTC', colorScheme: scheme });
      await context.addInitScript((settings) => {
        if (!localStorage.getItem('quire.settings')) localStorage.setItem('quire.settings', settings);
      }, JSON.stringify({ serverUrl: url, token: '', device: 'ux' }));
      const page = await context.newPage();
      await prepareContext(page);
      await page.goto(url);
      await expect(page.getByRole('status')).toHaveText('Synced', { timeout: 20_000 });
      const screens = only('QUIRE_UX_SCREENS');
      const result = await scoreApp(page, quireApp, {
        themes: [theme],
        schemes: [scheme],
        ...(screens ? { screens } : {}),
        onState: (s) => console.log(`${s.id}  ${s.total}`),
      });
      writeFileSync(join(process.env['QUIRE_UX_OUT']!, `${theme}-${scheme}.json`), JSON.stringify(result));
      await context.close();
    });
  }
}
