import { expect, type Locator } from '@playwright/test';
import { appDevice } from '../support/app.ts';
import { Then, When } from '../support/world.ts';

/**
 * Live Preview steps (R-RND-08). Assertions read `innerText`, the text a person sees, so
 * hidden markup does not count; lines are found by their raw Markdown or by what they show.
 */

const LINES = '.cm-content > .cm-line';

/** Index of the editor line whose raw or shown text is `text`, or -1. */
function findLine(lines: Locator, text: string): Promise<number> {
  return lines.evaluateAll((els, want) => {
    const clean = (s: string) => s.replace(/[\u200b\u2060]/g, '').trim();
    return els.findIndex((el) => {
      const copy = el.cloneNode(true) as HTMLElement;
      copy.querySelectorAll('[class*="cm-ySelection"], .cm-widgetBuffer').forEach((n) => n.remove());
      return clean(copy.textContent ?? '') === want || clean((el as HTMLElement).innerText) === want;
    });
  }, text);
}

/** The shown text of each line, or of each element matching `selector` inside the lines. */
function shown(lines: Locator, selector?: string): Promise<{ text: string; line: string }[]> {
  return lines.evaluateAll((els, sel) => {
    const clean = (s: string) => s.replace(/[\u200b\u2060]/g, '').trim();
    return els.flatMap((el) => {
      const line = clean((el as HTMLElement).innerText);
      const parts = sel ? [...el.querySelectorAll<HTMLElement>(sel)] : [el as HTMLElement];
      return parts.map((p) => ({ text: clean(p.innerText), line }));
    });
  }, selector);
}

When('{string} puts the cursor on the line {string}', async ({ world }, d: string, text: string) => {
  const device = appDevice(world, d);
  await expect(device.editor()).toBeVisible();
  const lines = device.page.locator(LINES);
  await expect.poll(() => findLine(lines, text), { message: `an editor line reads "${text}"` }).toBeGreaterThanOrEqual(0);
  const line = lines.nth(await findLine(lines, text));
  const box = await line.boundingBox();
  if (!box) throw new Error(`the line "${text}" is not on screen`);
  // The far right of the last visual row: the cursor lands at the end of the line.
  await line.click({ position: { x: box.width - 2, y: Math.max(2, box.height - 6) } });
});

Then(
  'the editor on {string} shows {string} as a heading without {string}',
  async ({ world }, d: string, text: string, mark: string) => {
    const headings = appDevice(world, d).page.locator(`${LINES}:is(.cm-lp-h1, .cm-lp-h2, .cm-lp-h3, .cm-lp-h4, .cm-lp-h5, .cm-lp-h6)`);
    await expect.poll(async () => (await shown(headings)).some((l) => l.text === text && !l.line.includes(mark))).toBe(true);
  },
);

Then('the editor on {string} shows {string} in bold without {string}', async ({ world }, d: string, text: string, mark: string) => {
  const lines = appDevice(world, d).page.locator(LINES);
  await expect.poll(async () => (await shown(lines, '.cm-lp-strong')).some((s) => s.text === text && !s.line.includes(mark))).toBe(true);
});

Then('the editor on {string} shows the text {string}', async ({ world }, d: string, text: string) => {
  const lines = appDevice(world, d).page.locator(LINES);
  await expect.poll(async () => (await shown(lines)).some((l) => l.line.includes(text))).toBe(true);
});
