import { type Browser, type BrowserContext, type Locator, type Page, expect } from '@playwright/test';
import { type Conflict, HttpTransport, type Resolution } from '@quire/sync';
import type { Device } from './device.ts';

type Pane = 'Backlinks' | 'Outgoing' | 'Outline' | 'Properties';

/**
 * A device driven through the web app, the way a person would: keyboard, buttons and what is
 * on screen. Locators use roles and accessible names from the app (apps/web), falling back to
 * the few data-testid hooks the app documents.
 */
export class BrowserDevice implements Device {
  /** Server-side view for lookups a person would do by reading the screen (conflict ids). */
  private readonly api: HttpTransport;

  private constructor(
    readonly name: string,
    readonly context: BrowserContext,
    readonly page: Page,
    serverUrl: string,
    token: string | undefined,
  ) {
    this.api = new HttpTransport(serverUrl, token);
  }

  static async open(name: string, url: string, token: string | undefined, browser: Browser): Promise<BrowserDevice> {
    const context = await browser.newContext();
    await context.addInitScript(
      ([settings]) => {
        if (!localStorage.getItem('quire.settings')) localStorage.setItem('quire.settings', settings!);
      },
      [JSON.stringify({ serverUrl: url, token: token ?? '', device: name })],
    );
    const page = await context.newPage();
    await page.goto(url);
    const device = new BrowserDevice(name, context, page, url, token);
    await expect(page.getByRole('status')).toBeVisible();
    return device;
  }

  // ---- what a person sees ----

  editor(): Locator {
    return this.page.getByRole('textbox', { name: 'Note editor' });
  }

  reader(): Locator {
    return this.page.getByRole('document', { name: 'Reading view' });
  }

  async pane(name: Pane): Promise<Locator> {
    await this.page.getByRole('tab', { name }).click();
    return this.page.getByTestId(name.toLowerCase());
  }

  // ---- navigation ----

  async open(path: string, opts: { reading?: boolean; create?: boolean } = {}): Promise<void> {
    await this.page.evaluate((hash) => (location.hash = hash), `#/${encodeURI(path)}`);
    const create = this.page.getByRole('button', { name: 'Create it' });
    await expect(this.editor().or(create).or(this.reader())).toBeVisible();
    if (await create.isVisible()) {
      if (!opts.create) throw new Error(`${this.name} has no note ${path}`);
      await create.click();
    }
    const toggle = this.page.getByRole('button', { name: /Switch to (reading|editing) view/ });
    const reading = await this.reader().isVisible();
    if (opts.reading !== undefined && opts.reading !== reading) await toggle.click();
    await expect(opts.reading ? this.reader() : this.editor()).toBeVisible();
  }

  async expectOpen(path: string): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(`#/${escape(encodeURI(path))}$`));
  }

  async search(query: string): Promise<void> {
    await this.page.getByRole('tab', { name: 'Search' }).click();
    await this.page.getByRole('searchbox', { name: 'Search notes' }).or(this.page.getByLabel('Search notes')).first().fill(query);
  }

  async runCommand(name: string): Promise<void> {
    await this.page.keyboard.press('ControlOrMeta+P');
    const palette = this.page.getByRole('dialog', { name: 'Command palette' });
    await expect(palette).toBeVisible();
    await this.page.keyboard.type(name);
    await this.page.keyboard.press('Enter');
    await expect(palette).toBeHidden();
  }

  // ---- Device ----

  async setText(path: string, text: string): Promise<void> {
    await this.open(path, { create: true, reading: false });
    await this.editor().click();
    await this.page.keyboard.press('ControlOrMeta+A');
    if (text) await this.page.keyboard.insertText(text);
    else await this.page.keyboard.press('Delete');
    await expect.poll(() => this.editorText()).toBe(text);
  }

  async append(path: string, text: string): Promise<void> {
    await this.open(path, { reading: false });
    await this.editor().click();
    await this.page.keyboard.press('ControlOrMeta+End');
    await this.page.keyboard.insertText(text);
  }

  async replace(path: string, find: string, replacement: string): Promise<void> {
    const cur = await this.read(path);
    if (cur === undefined || !cur.includes(find)) throw new Error(`"${find}" not found in ${path} on ${this.name}`);
    await this.setText(path, cur.replace(find, replacement));
  }

  async remove(path: string): Promise<void> {
    await this.open(path);
    await this.page.getByRole('button', { name: 'Delete note' }).click();
    await this.page.getByRole('dialog').getByRole('button', { name: /^Delete/ }).click();
  }

  async read(path: string): Promise<string | undefined> {
    try {
      await this.open(path, { reading: false });
    } catch {
      return undefined;
    }
    return this.editorText();
  }

  /** The note's text as shown, without decorations such as other devices' cursor labels. */
  private async editorText(): Promise<string> {
    return this.page.locator('.cm-content').evaluate((content) =>
      [...content.querySelectorAll(':scope > .cm-line')]
        .map((line) => {
          const copy = line.cloneNode(true) as HTMLElement;
          copy.querySelectorAll('[class*="cm-ySelection"], .cm-widgetBuffer').forEach((el) => el.remove());
          return (copy.textContent ?? '').replace(/[\u200b\u2060]/g, '');
        })
        .join('\n'),
    );
  }

  async isPending(path: string): Promise<boolean> {
    const name = path.split('/').pop()!.replace(/\.md$/, '');
    return this.page.getByRole('treeitem', { name }).getByLabel('pending sync').isVisible();
  }

  /**
   * What a person means by "synced": the status says so, and the server holds what the open
   * editor shows (a live editor reaches the server when its room commits, about 1.5 s later).
   */
  async sync(): Promise<void> {
    await this.page.getByRole('button', { name: /^Sync status/ }).click();
    await expect(this.page.getByRole('status')).toHaveText(/Synced|Offline/, { timeout: 10_000 });
    const path = this.openPath();
    if (!path || (await this.page.getByRole('status').textContent())?.includes('Offline')) return;
    if (!(await this.editor().isVisible())) return;
    const shown = await this.editorText();
    await expect
      .poll(async () => (await this.api.doc(path).catch(() => null))?.text, { timeout: 10_000 })
      .toBe(shown);
  }

  private openPath(): string | null {
    const hash = new URL(this.page.url()).hash;
    return hash.startsWith('#/') ? decodeURI(hash.slice(2)).split('#')[0]! : null;
  }

  async goOffline(): Promise<void> {
    await this.context.setOffline(true);
    await expect(this.page.getByRole('status')).toContainText('Offline');
  }

  async comeOnline(): Promise<void> {
    await this.context.setOffline(false);
    await expect(this.page.getByRole('status')).toHaveText(/Synced/, { timeout: 15_000 });
  }

  conflicts(): Promise<Conflict[]> {
    return this.api.conflicts();
  }

  async resolve(id: string, r: Omit<Resolution, 'device'>): Promise<void> {
    const conflict = await this.api.conflicts().then((all) => all.find((c) => c.id === id));
    if (!conflict) throw new Error(`no conflict ${id}`);
    const card = await this.openCard(conflict);
    if (r.keep) {
      await card.getByRole('button', { name: r.keep === 'delete' ? 'Delete note' : 'Keep note' }).click();
    } else {
      const open = conflict.segments.flatMap((s) => (s.type === 'hunk' && s.hunk.auto === null ? [s.hunk] : []));
      const choices = open.map((h) => r.choices?.[h.id]);
      const uniform = choices.every((c) => c === choices[0]) ? choices[0] : undefined;
      if (uniform === 'current' || uniform === 'incoming') {
        await card.getByRole('button', { name: `Keep all ${uniform}` }).click();
      } else {
        for (const [n, choice] of choices.entries()) {
          if (typeof choice !== 'string') throw new Error('the browser driver only picks sides, not custom text');
          await card.getByRole('region', { name: `Change ${n + 1}` }).getByRole('button', { name: `Keep ${choice}` }).click();
        }
      }
      await card.getByRole('button', { name: 'Apply' }).click();
    }
    await expect(card).toBeHidden({ timeout: 10_000 });
  }

  async dismiss(id: string): Promise<void> {
    const conflict = await this.api.conflicts().then((all) => all.find((c) => c.id === id));
    if (!conflict) throw new Error(`no conflict ${id}`);
    const card = await this.openCard(conflict);
    await card.getByRole('button', { name: 'Accept' }).click();
    await expect(card).toBeHidden({ timeout: 10_000 });
  }

  private async openCard(c: Conflict): Promise<Locator> {
    const inbox = this.page.getByRole('dialog', { name: 'Review inbox' }).or(this.page.getByRole('complementary', { name: 'Review inbox' }));
    if (!(await inbox.isVisible())) await this.page.getByTestId('conflict-badge').click();
    const card = this.page.getByTestId('review-card').filter({ has: this.page.locator(`[title="Open ${c.path}"]`) });
    await expect(card).toBeVisible({ timeout: 10_000 });
    return card;
  }

  async expectBadge(n: number): Promise<void> {
    await expect(this.page.getByTestId('conflict-badge').locator('.badge-count')).toHaveText(String(n), { timeout: 10_000 });
  }

  async expectBanner(text: string): Promise<void> {
    await expect(this.page.getByTestId('note-banner')).toContainText(text, { timeout: 10_000 });
  }

  async close(): Promise<void> {
    await this.context.close();
  }
}

function escape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
