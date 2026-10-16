/**
 * Vault path rules (R-VLT-02).
 * Pure functions, safe for Node and the browser.
 */

export class InvalidPathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidPathError';
  }
}

// C0 controls and DEL. A NUL or newline in a path is never legitimate.
const CONTROL = /[\u0000-\u001f\u007f]/;

/**
 * Normalises a client-supplied vault path and rejects anything outside the vault.
 * Backslashes become `/` and the result is Unicode NFC. The path must be relative,
 * end in `.md`, and have no empty, `.`, `..` or dot-prefixed (hidden) segments.
 */
export function normalizePath(p: string): string {
  if (typeof p !== 'string') throw new InvalidPathError('path must be a string');
  const s = p.replace(/\\/g, '/').normalize('NFC');
  if (s.length === 0) throw new InvalidPathError('path is empty');
  if (CONTROL.test(s)) throw new InvalidPathError('path contains control characters');
  if (!s.endsWith('.md')) throw new InvalidPathError('path must end in .md');
  for (const seg of s.split('/')) {
    if (seg === '') throw new InvalidPathError('path has an empty segment or is absolute');
    if (seg === '.' || seg === '..') throw new InvalidPathError('path has a . or .. segment');
    if (seg.startsWith('.')) throw new InvalidPathError('path segments must not start with "."');
  }
  return s;
}

/** File name without folder and without a trailing `.md`: `"a/B c.md"` gives `"B c"`. */
export function titleOf(path: string): string {
  const name = basename(path);
  return name.toLowerCase().endsWith('.md') ? name.slice(0, -3) : name;
}

function basename(path: string): string {
  const i = path.lastIndexOf('/');
  return i < 0 ? path : path.slice(i + 1);
}
