import { expect } from '@playwright/test';
import { appDevice } from '../support/app.ts';
import { Then, When } from '../support/world.ts';

/**
 * Steps shared by every sidebar view (change 0002). Views show groups as
 * `[data-group="<label>"]` holding `[data-item="<title>"]` (apps/web/src/shared/GroupList.tsx).
 */

async function ensureSidebar(page: import('@playwright/test').Page) {
  const switcher = page.getByRole('combobox', { name: 'Sidebar view' });
  if (!(await switcher.isVisible())) await page.getByRole('button', { name: 'Toggle left sidebar' }).click();
  return switcher;
}

When('{string} switches the sidebar to {string}', async ({ world }, d: string, view: string) => {
  const page = appDevice(world, d).page;
  await (await ensureSidebar(page)).selectOption({ label: view });
});

When('{string} reloads the app', async ({ world }, d: string) => {
  const page = appDevice(world, d).page;
  await page.reload();
  await expect(page.getByRole('status')).toBeVisible();
});

Then('the sidebar on {string} shows the {string} view', async ({ world }, d: string, view: string) => {
  const switcher = await ensureSidebar(appDevice(world, d).page);
  await expect(switcher.locator('option:checked')).toHaveText(view);
});

Then('the sidebar on {string} shows {string} under {string}', async ({ world }, d: string, item: string, group: string) => {
  const pane = appDevice(world, d).page.locator('.left-pane');
  await expect(pane.locator(`[data-group="${group}"] [data-item="${item}"]`).first()).toBeVisible({ timeout: 10_000 });
});

Then('the sidebar on {string} lists {string} first', async ({ world }, d: string, item: string) => {
  const pane = appDevice(world, d).page.locator('.left-pane');
  await expect(pane.locator('[data-item]').first()).toHaveAttribute('data-item', item, { timeout: 10_000 });
});

/**
 * Tasks are clickable in the reading view (`li` with a checkbox) and in Live Preview, where
 * the task marker is an `input[type=checkbox]` widget inside the editor line (P01 contract).
 */
When('{string} clicks the task {string}', async ({ world }, d: string, label: string) => {
  const device = appDevice(world, d);
  const box = (await device.reader().isVisible())
    ? device.reader().locator('li', { hasText: label }).getByRole('checkbox')
    : device.page.locator('.cm-content .cm-line', { hasText: label }).locator('input[type="checkbox"]');
  await box.first().click();
});
