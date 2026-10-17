import { expect } from '@playwright/test';
import { appDevice } from '../support/app.ts';
import { Then, When } from '../support/world.ts';

/** Steps for the Tags and Board sidebar views (change 0002, R-VIEW-03, R-VIEW-05). */

Then('the sidebar on {string} shows the tag {string} with {int} notes', async ({ world }, d: string, tag: string, count: number) => {
  const pane = appDevice(world, d).page.locator('.left-pane');
  await expect(pane.locator(`[data-group="${tag}"] [data-count]`).first()).toHaveText(String(count), { timeout: 10_000 });
});

When('{string} moves {string} to the {string} column', async ({ world }, d: string, title: string, column: string) => {
  const page = appDevice(world, d).page;
  await page.getByRole('combobox', { name: `Move ${title} to` }).selectOption({ label: column });
});

When('{string} moves {string} to a new column {string}', async ({ world }, d: string, title: string, column: string) => {
  const page = appDevice(world, d).page;
  await page.getByRole('combobox', { name: `Move ${title} to` }).selectOption({ label: 'New column…' });
  const input = page.getByRole('textbox', { name: `New column for ${title}` });
  await input.fill(column);
  await input.press('Enter');
});

When('{string} groups the board by {string}', async ({ world }, d: string, key: string) => {
  await appDevice(world, d).page.getByRole('combobox', { name: 'Group by' }).selectOption(key);
});
