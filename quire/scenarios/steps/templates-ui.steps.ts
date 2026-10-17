import { expect } from '@playwright/test';
import { appDevice } from '../support/app.ts';
import { Given, Then, When, eventually, text } from '../support/world.ts';

// R-VLT-13..15: templates and the slash menu.

Given('the clock on {string} reads {string}', async ({ world }, d: string, at: string) => {
  // Local time in the browser; timers keep running.
  await appDevice(world, d).page.clock.setFixedTime(new Date(`${at.replace(' ', 'T')}:00`));
});

When('{string} types {string} in {string}', async ({ world }, d: string, body: string, path: string) => {
  const device = appDevice(world, d);
  await device.open(path);
  await device.editor().click();
  await device.page.keyboard.press('ControlOrMeta+End');
  // Key by key, as a person types, so the editor's input handlers (the slash menu) run.
  await device.page.keyboard.type(text(body));
});

Then('{string} on {string} contains {string}', async ({ world }, path: string, d: string, body: string) => {
  const device = world.device(d);
  await eventually(5, async () => ((await device.read(path)) ?? '').includes(text(body)), `${path} on ${d} contains ${body}`);
});

Then('the slash menu on {string} offers {string}', async ({ world }, d: string, label: string) => {
  const menu = appDevice(world, d).page.getByRole('listbox', { name: 'Insert' });
  await expect(menu.getByRole('option', { name: label })).toBeVisible();
  // The menu ignores Enter for 75 ms after it opens (CodeMirror's interactionDelay), as a
  // person would not have seen it yet.
  await appDevice(world, d).page.waitForTimeout(150);
});

Then('the slash menu on {string} is closed', async ({ world }, d: string) => {
  const page = appDevice(world, d).page;
  // The menu opens a moment after typing stops: give it the chance to appear first.
  await page.waitForTimeout(400);
  await expect(page.getByRole('listbox', { name: 'Insert' })).toHaveCount(0);
});
