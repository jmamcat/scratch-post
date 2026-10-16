export interface Command {
  id: string;
  name: string;
  /** Like `Mod+O`, `Mod+Shift+K`, `Alt+N`. Mod is Cmd on macOS and Ctrl elsewhere. */
  hotkeys?: string[];
  run: () => void;
  enabled?: () => boolean;
}

export const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

export function formatHotkey(h: string): string {
  return h
    .split('+')
    .map((k) => (k === 'Mod' ? (isMac ? '⌘' : 'Ctrl') : k === 'Alt' && isMac ? '⌥' : k === 'Shift' && isMac ? '⇧' : k))
    .join(isMac ? '' : '+');
}

export function matchesHotkey(e: KeyboardEvent, h: string): boolean {
  const parts = h.split('+');
  const key = parts[parts.length - 1]!.toLowerCase();
  const want = new Set(parts.slice(0, -1));
  const mod = isMac ? e.metaKey : e.ctrlKey;
  if (want.has('Mod') !== mod) return false;
  if (want.has('Shift') !== e.shiftKey || want.has('Alt') !== e.altKey) return false;
  if (!want.has('Mod') && (e.ctrlKey || e.metaKey)) return false;
  // e.code keeps Alt+N working on layouts where Alt changes the character.
  const code = e.code.startsWith('Key') ? e.code.slice(3).toLowerCase() : e.key.toLowerCase();
  return e.key.toLowerCase() === key || code === key;
}
