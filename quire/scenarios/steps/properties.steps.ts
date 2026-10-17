import { appDevice } from '../support/app.ts';
import { When } from '../support/world.ts';

/**
 * Steps for the editable properties pane (change 0002, R-VLT-07). The pane is the Properties
 * tab of the right pane; each property is a `[data-property="<key>"]` row with an input
 * labelled by the key and a `Remove <key>` button (apps/web/src/vault/properties).
 */

When('{string} sets the property {string} to {string}', async ({ world }, d: string, key: string, value: string) => {
  const pane = await appDevice(world, d).pane('Properties');
  const input = pane.getByLabel(key, { exact: true });
  await input.fill(value);
  await input.press('Enter');
});

When('{string} adds the property {string} with {string}', async ({ world }, d: string, key: string, value: string) => {
  const pane = await appDevice(world, d).pane('Properties');
  await pane.getByRole('button', { name: 'Add property', exact: true }).click();
  await pane.getByLabel('Property name', { exact: true }).fill(key);
  await pane.getByLabel('Property value', { exact: true }).fill(value);
  await pane.getByRole('button', { name: 'Add', exact: true }).click();
});

When('{string} removes the property {string}', async ({ world }, d: string, key: string) => {
  const pane = await appDevice(world, d).pane('Properties');
  await pane.getByRole('button', { name: `Remove ${key}`, exact: true }).click();
});
