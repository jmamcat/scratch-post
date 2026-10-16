// Helpers installed into the page under window.__ux, so every in-page measurement uses the same
// rules for "visible", "interactive" and "selector". Playwright serialises installHelpers() as
// source, so it must not reference anything outside itself.
import type { Page } from '@playwright/test';

export interface UxHelpers {
  visible(el: Element): boolean;
  selector(el: Element): string;
  id(el: Element): number;
  /** Visible elements a keyboard user should reach with Tab, inside the open modal if there is one. */
  interactive(): Element[];
  /** Visible text nodes with at least one non-space character, outside script and style. */
  textNodes(root?: Element): Text[];
  /** True when the element or an ancestor matches one of the selectors. */
  within(el: Element, selectors: readonly string[]): boolean;
  /** Elements whose content is cut off (overflow hidden or clip, or ellipsis) and that hold text. */
  clipped(): Element[];
  shifts: { value: number; time: number; hadRecentInput: boolean }[];
}

declare global {
  interface Window {
    __ux: UxHelpers;
    __uxShifts?: { value: number; time: number; hadRecentInput: boolean }[];
  }
}

/** Records layout shifts from the start of every page load (run as an init script). */
export function recordLayoutShifts(): void {
  const shifts: { value: number; time: number; hadRecentInput: boolean }[] = [];
  window.__uxShifts = shifts;
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries() as unknown as { value: number; startTime: number; hadRecentInput: boolean }[]) {
        shifts.push({ value: e.value, time: e.startTime, hadRecentInput: e.hadRecentInput });
      }
    }).observe({ type: 'layout-shift', buffered: true });
  } catch {
    // no layout-shift support: CLS reads as 0
  }
}

export function installHelpers(): void {
  if (window.__ux) return;
  const ids = new WeakMap<Element, number>();
  let next = 1;
  const visible = (el: Element): boolean => {
    if (!el.isConnected) return false;
    if (!el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const esc = (s: string) => CSS.escape(s);
  const part = (el: Element): { text: string; anchor: boolean } => {
    const tag = el.tagName.toLowerCase();
    if (el.id && !/\d{3,}/.test(el.id)) return { text: `#${esc(el.id)}`, anchor: true };
    const label = el.getAttribute('aria-label');
    if (label) return { text: `${tag}[aria-label="${label.replace(/"/g, '\\"')}"]`, anchor: true };
    const testid = el.getAttribute('data-testid');
    if (testid) return { text: `${tag}[data-testid="${testid}"]`, anchor: true };
    const classes = [...el.classList].filter((c) => !/\d/.test(c) && c.length < 30).slice(0, 2);
    let text = tag + classes.map((c) => `.${esc(c)}`).join('');
    const parent = el.parentElement;
    if (parent) {
      const same = [...parent.children].filter((c) => c.tagName === el.tagName);
      if (same.length > 1) text += `:nth-of-type(${same.indexOf(el) + 1})`;
    }
    return { text, anchor: false };
  };
  /** Up to four steps from the element to the nearest ancestor with an id, label or test id. */
  const selector = (el: Element): string => {
    const parts: string[] = [];
    let cur: Element | null = el;
    while (cur && cur !== document.documentElement && parts.length < 4) {
      const p = part(cur);
      parts.unshift(p.text);
      if (p.anchor && cur !== el) break;
      cur = cur.parentElement;
    }
    return parts.join(' > ');
  };
  const focusable =
    'a[href], area[href], button, input:not([type="hidden"]), select, textarea, summary, iframe, [tabindex], [contenteditable=""], [contenteditable="true"]';
  const interactive = (): Element[] => {
    const modal = [...document.querySelectorAll('[aria-modal="true"], dialog[open]')].filter(visible).pop();
    const root = modal ?? document.body;
    return [...root.querySelectorAll(focusable)].filter((el) => {
      if ((el as HTMLElement).tabIndex < 0) return false;
      if ((el as HTMLButtonElement).disabled) return false;
      if (el.closest('[inert]')) return false;
      return visible(el);
    });
  };
  const textNodes = (root: Element = document.body): Text[] => {
    const out: Text[] = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => {
        const p = n.parentElement;
        if (!p || !n.nodeValue || !/\S/.test(n.nodeValue)) return NodeFilter.FILTER_REJECT;
        if (p.closest('script, style, noscript, template, title')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    const seen = new Map<Element, boolean>();
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const p = n.parentElement!;
      let v = seen.get(p);
      if (v === undefined) seen.set(p, (v = visible(p)));
      if (v) out.push(n as Text);
    }
    return out;
  };
  const within = (el: Element, selectors: readonly string[]) => selectors.some((s) => el.closest(s) !== null);
  const clipped = (): Element[] =>
    [...document.querySelectorAll('body *')].filter((el) => {
      const s = getComputedStyle(el);
      const hides = (v: string) => v === 'hidden' || v === 'clip';
      const x = (hides(s.overflowX) || s.textOverflow === 'ellipsis') && el.scrollWidth > el.clientWidth + 1;
      const y = hides(s.overflowY) && el.scrollHeight > el.clientHeight + 1;
      if (!x && !y) return false;
      if (!el.textContent || !/\S/.test(el.textContent)) return false;
      return visible(el);
    });
  window.__ux = {
    visible,
    selector,
    id: (el) => {
      let v = ids.get(el);
      if (v === undefined) ids.set(el, (v = next++));
      return v;
    },
    interactive,
    textNodes,
    within,
    clipped,
    get shifts() {
      return window.__uxShifts ?? [];
    },
  };
}

export async function ensureHelpers(page: Page): Promise<void> {
  await page.evaluate(installHelpers);
}
