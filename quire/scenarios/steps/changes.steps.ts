import { expect } from '@playwright/test';
import { appDevice } from '../support/app.ts';
import { Then } from '../support/world.ts';

/**
 * Steps for the Changes view (R-VLT-08) and search operators (R-NAV-10). Search results are
 * `ul[aria-label="Search results"]` items; each hit's button carries the note path in `title`.
 */

Then('the sidebar on {string} shows {string} changed by {string}', async ({ world }, d: string, title: string, device: string) => {
  const item = appDevice(world, d).page.locator('.left-pane').locator(`[data-item="${title}"]`);
  await expect(item).toBeVisible({ timeout: 10_000 });
  await expect(item).toContainText(device);
});

Then('the search results on {string} list {string} only', async ({ world }, d: string, path: string) => {
  const items = appDevice(world, d).page.getByRole('list', { name: 'Search results' }).getByRole('listitem');
  await expect(items).toHaveCount(1);
  const stem = path.replace(/\.md$/, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  await expect(items.first().locator('button')).toHaveAttribute('title', new RegExp(stem));
});
