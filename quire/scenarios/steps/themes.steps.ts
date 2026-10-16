import { expect } from '@playwright/test';
import { appDevice } from '../support/app.ts';
import { Then, When } from '../support/world.ts';

const app = appDevice;

When('{string} picks the theme {string}', async ({ world }, d: string, name: string) => {
  const { page } = app(world, d);
  await page.getByRole('button', { name: 'Open settings' }).click();
  const dialog = page.getByRole('dialog', { name: 'Settings' });
  await dialog.getByLabel('Theme').selectOption({ label: name });
  // The theme applies as soon as it is chosen; closing the dialog saves nothing else.
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});

Then('the app on {string} uses the theme {string}', async ({ world }, d: string, name: string) => {
  const { page } = app(world, d);
  await expect(page.locator('html')).toHaveAttribute('data-quire-theme', name.toLowerCase());
});

/** How one heading looks, without its size; margins are relative to the font size. */
interface Look {
  size: string;
  rest: string;
}

Then('in every theme the headings on {string} look different from each other', async ({ world }, d: string) => {
  const { page } = app(world, d);
  const before = await page.evaluate(() => document.documentElement.dataset['quireTheme'] ?? 'default');
  // Theme ids are the lower-case names in the Theme select, so the list cannot drift from the app.
  await page.getByRole('button', { name: 'Open settings' }).click();
  const dialog = page.getByRole('dialog', { name: 'Settings' });
  const ids = await dialog.getByLabel('Theme').locator('option').evaluateAll((os) => os.map((o) => (o as HTMLOptionElement).value));
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  expect(ids.length, 'the app offers five themes').toBe(5);

  const reader = app(world, d).reader();
  await expect(reader.locator('h1, h2, h3')).toHaveCount(3);
  for (const id of ids) {
    const looks = await reader.evaluate((root, theme) => {
      document.documentElement.dataset['quireTheme'] = theme;
      return ['h1', 'h2', 'h3'].map((tag) => {
        const s = getComputedStyle(root.querySelector(tag)!);
        const size = parseFloat(s.fontSize);
        return {
          size: s.fontSize,
          rest: [
            s.fontWeight,
            s.fontFamily,
            s.color,
            s.letterSpacing,
            s.borderBottomStyle,
            (parseFloat(s.marginTop) / size).toFixed(2),
          ].join(' | '),
        };
      });
    }, id);
    const [h1, h2, h3] = looks as [Look, Look, Look];
    for (const [a, b, label] of [[h1, h2, 'H1 and H2'], [h2, h3, 'H2 and H3'], [h1, h3, 'H1 and H3']] as const) {
      expect(a.size !== b.size || a.rest !== b.rest, `${label} differ in theme ${id}`).toBe(true);
      expect(a.rest, `${label} differ in more than font size in theme ${id}`).not.toBe(b.rest);
    }
  }
  // Put back what the person had chosen.
  await reader.evaluate((_root, id) => {
    document.documentElement.dataset['quireTheme'] = id;
  }, before);
});
