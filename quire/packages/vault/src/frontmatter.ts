import { parse } from 'yaml';

/**
 * A note split into its YAML front matter and Markdown body (R-RND-07).
 * `text.slice(0, bodyStart) + body === text` always holds.
 */
export interface Frontmatter {
  /** Parsed properties, or null when there is no block or it is not a YAML map. */
  data: Record<string, unknown> | null;
  /** Text between the `---` fences (no trailing newline), or null when there is no block. */
  raw: string | null;
  body: string;
  /** Offset in the original text where the body starts. */
  bodyStart: number;
}

const OPEN = /^---[ \t]*\r?\n/;

/**
 * Front matter must start at byte 0 with a `---` line and ends at the next line that
 * is exactly `---` (trailing spaces allowed). An unclosed block is not front matter.
 */
export function splitFrontmatter(text: string): Frontmatter {
  const none: Frontmatter = { data: null, raw: null, body: text, bodyStart: 0 };
  const open = OPEN.exec(text);
  if (!open) return none;

  let pos = open[0].length;
  const rawStart = pos;
  while (pos <= text.length) {
    const nl = text.indexOf('\n', pos);
    const lineEnd = nl < 0 ? text.length : nl;
    const line = text.slice(pos, lineEnd).replace(/\r$/, '');
    if (/^---[ \t]*$/.test(line)) {
      // raw excludes the newline that precedes the closing fence.
      let rawEnd = pos;
      if (rawEnd > rawStart && text[rawEnd - 1] === '\n') rawEnd--;
      if (rawEnd > rawStart && text[rawEnd - 1] === '\r') rawEnd--;
      const raw = text.slice(rawStart, Math.max(rawStart, rawEnd));
      const bodyStart = nl < 0 ? text.length : nl + 1;
      return { data: parseMap(raw), raw, body: text.slice(bodyStart), bodyStart };
    }
    if (nl < 0) break;
    pos = nl + 1;
  }
  return none;
}

function parseMap(raw: string): Record<string, unknown> | null {
  if (raw.trim() === '') return {};
  try {
    const v: unknown = parse(raw);
    if (v && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, unknown>;
    return null;
  } catch {
    return null;
  }
}
