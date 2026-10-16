import { normalizePath, titleOf } from '@quire/vault';

/** `YYYY-MM-DD.md` in the vault root for the local date (R-NAV-07). */
export function dailyNotePath(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}.md`;
}

export function folderOf(path: string): string {
  const i = path.lastIndexOf('/');
  return i < 0 ? '' : path.slice(0, i);
}

export function joinPath(folder: string, name: string): string {
  return folder ? `${folder}/${name}` : name;
}

/** First free `Untitled.md`, `Untitled 1.md`, ... in `folder`, like Obsidian. */
export function untitledPath(existing: Iterable<string>, folder = ''): string {
  const taken = new Set([...existing].map((p) => p.toLowerCase()));
  for (let n = 0; ; n++) {
    const path = joinPath(folder, n === 0 ? 'Untitled.md' : `Untitled ${n}.md`);
    if (!taken.has(path.toLowerCase())) return path;
  }
}

/**
 * Turns what a person typed (a name, `folder/name`, with or without `.md`) into a vault
 * path, or null when it cannot be one.
 */
export function toNotePath(input: string): string | null {
  let s = input.trim().replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+$/, '');
  s = s
    .split('/')
    .map((seg) => seg.trim())
    .join('/');
  if (!s) return null;
  if (!s.toLowerCase().endsWith('.md')) s += '.md';
  try {
    return normalizePath(s);
  } catch {
    return null;
  }
}

/** Cleans a folder name typed by a person: no leading or trailing slashes, no dot segments. */
export function toFolderPath(input: string): string | null {
  const s = input
    .trim()
    .replace(/\\/g, '/')
    .split('/')
    .map((seg) => seg.trim())
    .filter(Boolean)
    .join('/');
  if (!s) return null;
  try {
    normalizePath(`${s}/x.md`);
    return s;
  } catch {
    return null;
  }
}

export { titleOf };
