import { expect } from '@playwright/test';
import { BrowserDevice } from '../support/browser-device.ts';
import { Then, When, type World } from '../support/world.ts';

/** UI-only steps: they need a device driven through the web app (@ui scenarios). */
function app(world: World, name: string): BrowserDevice {
  const d = world.device(name);
  if (!(d instanceof BrowserDevice)) throw new Error(`"${name}" is not a browser device; tag the requirement "Layer: ui"`);
  return d;
}

const today = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.md`;
};

When('{string} opens {string}', async ({ world }, d: string, path: string) => {
  await app(world, d).open(path);
});

When('{string} opens {string} in reading view', async ({ world }, d: string, path: string) => {
  await app(world, d).open(path, { reading: true });
});

Then('the reading view on {string} shows a link {string} to {string}', async ({ world }, d: string, label: string, path: string) => {
  const link = app(world, d).reader().locator('a.internal-link', { hasText: label });
  await expect(link).toHaveAttribute('data-path', path);
  await expect(link).not.toHaveClass(/unresolved/);
});

Then('the reading view on {string} shows an unresolved link {string}', async ({ world }, d: string, label: string) => {
  await expect(app(world, d).reader().locator('a.internal-link.unresolved', { hasText: label })).toBeVisible();
});

Then('the reading view on {string} shows an image {string}', async ({ world }, d: string, src: string) => {
  await expect(app(world, d).reader().locator(`img[src$="${src}"]`)).toBeAttached();
});

Then('the reading view on {string} shows an embed of {string}', async ({ world }, d: string, path: string) => {
  await expect(app(world, d).reader().locator(`.embed[data-path="${path}"]`)).toBeVisible();
});

Then('the reading view on {string} shows a collapsed callout titled {string}', async ({ world }, d: string, title: string) => {
  const callout = app(world, d).reader().locator('details.callout', { has: app(world, d).page.locator('summary', { hasText: title }) });
  await expect(callout).not.toHaveAttribute('open', /.*/);
});

Then('the reading view on {string} shows an expanded callout titled {string}', async ({ world }, d: string, title: string) => {
  const callout = app(world, d).reader().locator('details.callout', { has: app(world, d).page.locator('summary', { hasText: title }) });
  await expect(callout).toHaveAttribute('open', /.*/);
});

Then('the reading view on {string} shows a checked task {string}', async ({ world }, d: string, label: string) => {
  await expect(app(world, d).reader().locator('li', { hasText: label }).getByRole('checkbox')).toBeChecked();
});

Then('the reading view on {string} shows an unchecked task {string}', async ({ world }, d: string, label: string) => {
  await expect(app(world, d).reader().locator('li', { hasText: label }).getByRole('checkbox')).not.toBeChecked();
});

Then('the reading view on {string} shows highlighted {string}', async ({ world }, d: string, label: string) => {
  await expect(app(world, d).reader().locator('mark', { hasText: label })).toBeVisible();
});

Then('the reading view on {string} shows the tag {string}', async ({ world }, d: string, tag: string) => {
  await expect(app(world, d).reader().locator('a.tag', { hasText: `#${tag}` })).toBeVisible();
});

Then('the reading view on {string} shows a footnote', async ({ world }, d: string) => {
  await expect(app(world, d).reader().locator('.footnotes li').first()).toBeVisible();
});

Then('the reading view on {string} shows the text {string}', async ({ world }, d: string, body: string) => {
  await expect(app(world, d).reader()).toContainText(body);
});

Then('the reading view on {string} does not show {string}', async ({ world }, d: string, body: string) => {
  await expect(app(world, d).reader()).not.toContainText(body);
});

Then('the backlinks pane on {string} lists {string}', async ({ world }, d: string, path: string) => {
  await expect(await app(world, d).pane('Backlinks')).toContainText(path.replace(/\.md$/, ''));
});

Then('the outline on {string} lists {string}', async ({ world }, d: string, heading: string) => {
  await expect(await app(world, d).pane('Outline')).toContainText(heading);
});

Then('the properties pane on {string} shows {string} as {string}', async ({ world }, d: string, key: string, value: string) => {
  const pane = await app(world, d).pane('Properties');
  await expect(pane).toContainText(key);
  await expect(pane).toContainText(value);
});

When('{string} searches for {string}', async ({ world }, d: string, query: string) => {
  await app(world, d).search(query);
});

Then('the search results on {string} list {string} first', async ({ world }, d: string, path: string) => {
  const first = app(world, d).page.getByRole('list', { name: 'Search results' }).getByRole('listitem').first();
  await expect(first).toContainText(path.replace(/\.md$/, ''));
});

When('{string} presses {string}', async ({ world }, d: string, keys: string) => {
  await app(world, d).page.keyboard.press(keys.replace(/^Ctrl\+/, 'ControlOrMeta+'));
});

When('{string} types {string} and presses Enter', async ({ world }, d: string, body: string) => {
  const page = app(world, d).page;
  await page.keyboard.type(body);
  await page.keyboard.press('Enter');
});

When('{string} runs the command {string}', async ({ world }, d: string, name: string) => {
  await app(world, d).runCommand(name);
});

Then('{string} sees {string} open', async ({ world }, d: string, path: string) => {
  await app(world, d).expectOpen(path);
});

Then("{string} sees today's daily note open", async ({ world }, d: string) => {
  await app(world, d).expectOpen(today());
});

Then('{string} sees the sync status {string}', async ({ world }, d: string, status: string) => {
  await expect(app(world, d).page.getByRole('status')).toContainText(status);
});
