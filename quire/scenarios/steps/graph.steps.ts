import { expect, type Page } from '@playwright/test';
import { appDevice } from '../support/app.ts';
import { Then, When } from '../support/world.ts';

const app = appDevice;

const graph = (page: Page) => page.locator('svg[aria-label="Graph"]');

/** The right pane's Graph tab, opening the pane first when it is closed. */
async function localGraph(page: Page) {
  const tab = page.getByRole('tab', { name: 'Graph' });
  if (!(await tab.isVisible())) await page.getByRole('button', { name: 'Toggle right sidebar' }).click();
  await tab.click();
  return page.locator('svg[aria-label="Local graph"]');
}

Then('the graph on {string} shows a link from {string} to {string}', async ({ world }, d: string, a: string, b: string) => {
  const { page } = app(world, d);
  await expect(graph(page).locator(`line[data-from="${a}"][data-to="${b}"]`)).toBeAttached();
});

Then('the graph on {string} shows {int} notes', async ({ world }, d: string, n: number) => {
  const { page } = app(world, d);
  await expect(graph(page).locator('[data-node]')).toHaveCount(n);
});

When('{string} clicks {string} in the graph', async ({ world }, d: string, p: string) => {
  const { page } = app(world, d);
  await graph(page).locator(`[data-node="${p}"]`).click();
});

Then('the local graph on {string} shows {string}', async ({ world }, d: string, p: string) => {
  const { page } = app(world, d);
  await expect((await localGraph(page)).locator(`[data-node="${p}"]`)).toBeAttached();
});

Then('the local graph on {string} does not show {string}', async ({ world }, d: string, p: string) => {
  const { page } = app(world, d);
  const svg = await localGraph(page);
  // Wait for the graph to draw the open note, so "absent" is not just "not drawn yet".
  await expect(svg.locator('[data-node]').first()).toBeAttached();
  await expect(svg.locator(`[data-node="${p}"]`)).toHaveCount(0);
});
