import { expect } from '@playwright/test';
import { planRename } from '@quire/navigate';
import { appDevice } from '../support/app.ts';
import { When } from '../support/world.ts';

// R-VLT-09: what the app does on a rename, at the protocol level — rewrite the links in the
// device's notes, then move the note so the next push carries the rename.
When('{string} renames {string} to {string}', async ({ world }, d: string, from: string, to: string) => {
  const { client } = world.systemDevice(d);
  const notes = (await client.store.all()).filter((n) => !n.deleted);
  for (const edit of planRename(notes, from, to)) await client.write(edit.path, edit.text);
  await client.rename(from, to);
});

// R-VLT-10: the inline title above the editor, as a person would use it.
When('{string} renames the open note to {string}', async ({ world }, d: string, title: string) => {
  const device = appDevice(world, d);
  const input = device.page.getByRole('textbox', { name: 'Note title' });
  await input.click();
  await input.fill(title);
  await input.press('Enter');
  await expect(input).toHaveValue(title);
});
