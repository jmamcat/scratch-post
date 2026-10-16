import { expect } from '@playwright/test';
import { appDevice } from '../support/app.ts';
import { Then, When, eventually } from '../support/world.ts';

// R-BAK-07: the vault history drawer in the app (command "Open vault history" is in app.steps.ts).

Then('the vault history on {string} lists {int} change sets', async ({ world }, d: string, n: number) => {
  const items = appDevice(world, d).page.locator('[data-changeset]');
  await eventually(
    10,
    async () => {
      const count = await items.count();
      if (count !== n) throw new Error(`${count} listed`);
      return true;
    },
    `the vault history on ${d} lists ${n} change sets`,
  );
});

When('{string} restores the vault to change set {int} in the app', async ({ world }, d: string, n: number) => {
  const page = appDevice(world, d).page;
  // Newest first: change set 1 is the first item.
  const item = page.locator('[data-changeset]').nth(n - 1);
  await item.getByRole('button', { name: 'Restore vault to here' }).click();
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toContainText('Every note returns to how it was then.');
  await dialog.getByRole('button', { name: 'Restore vault', exact: true }).click();
  await expect(dialog).toBeHidden();
});
