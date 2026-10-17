import type { KeyboardEvent } from 'react';

const TABBABLE = 'a[href], button:not(:disabled), input:not(:disabled):not([type="hidden"]), select:not(:disabled), textarea:not(:disabled), summary, [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';

/**
 * Keeps Tab and Shift+Tab inside a modal dialog (WAI-ARIA dialog pattern): past the last
 * control focus wraps to the first, and back. Call from the dialog's onKeyDown.
 */
export function trapTab(e: KeyboardEvent, root: HTMLElement | null): void {
  if (e.key !== 'Tab' || !root) return;
  const list = [...root.querySelectorAll<HTMLElement>(TABBABLE)].filter((el) => el.tabIndex >= 0 && el.getClientRects().length > 0 && !el.closest('[inert]'));
  if (!list.length) {
    e.preventDefault();
    return;
  }
  const first = list[0]!;
  const last = list[list.length - 1]!;
  const active = document.activeElement;
  if (e.shiftKey && (active === first || active === root || !root.contains(active))) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && (active === last || !root.contains(active))) {
    e.preventDefault();
    first.focus();
  }
}
