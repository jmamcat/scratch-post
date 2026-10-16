import { expect } from '@playwright/test';
import { appDevice } from '../support/app.ts';
import { Then, When, eventually, text } from '../support/world.ts';

// R-VLT-12: attachments in the app. The "cloud server has the file" step lives in files.steps.ts.

type Dropped = { name: string; type: string; mib?: number };

/** Drop one generated file on the editor the way the browser delivers a drag from the desktop. */
async function drop(world: Parameters<typeof appDevice>[0], d: string, file: Dropped): Promise<void> {
  const device = appDevice(world, d);
  // A person puts the cursor after the text before dropping; the embed goes at the cursor.
  await device.editor().click();
  await device.page.keyboard.press('ControlOrMeta+End');
  await device.editor().evaluate(async (el, f) => {
    let blob: Blob;
    if (f.mib) blob = new Blob([new ArrayBuffer(f.mib * 1024 * 1024)], { type: f.type });
    else {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 48;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#6c5ce7';
      ctx.fillRect(0, 0, 64, 48);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(16, 12, 32, 24);
      blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), f.type));
    }
    const data = new DataTransfer();
    data.items.add(new File([blob], f.name, { type: f.type }));
    el.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: data }));
  }, file);
}

When('{string} drops the image {string} into the editor', async ({ world }, d: string, name: string) => {
  await drop(world, d, { name, type: 'image/png' });
});

When('{string} drops a file of {int} MiB into the editor', async ({ world }, d: string, mib: number) => {
  await drop(world, d, { name: `big-${mib}-mib.zip`, type: 'application/zip', mib });
});

Then('within {int} seconds {string} on {string} reads {string}', async ({ world }, seconds: number, path: string, d: string, body: string) => {
  const device = world.device(d);
  await eventually(seconds, async () => (await device.read(path)) === text(body), `${path} on ${d} reads ${body}`);
});

Then('the reading view on {string} shows the image {string} loaded', async ({ world }, d: string, name: string) => {
  const img = appDevice(world, d).reader().locator(`img[alt="${name}"]`);
  await eventually(
    10,
    () => img.evaluate((el) => el instanceof HTMLImageElement && el.complete && el.naturalWidth > 0),
    `the reading view shows ${name} loaded`,
  );
});

Then('{string} sees the message {string}', async ({ world }, d: string, message: string) => {
  await expect(appDevice(world, d).page.getByRole('alert').filter({ hasText: message })).toBeVisible();
});
