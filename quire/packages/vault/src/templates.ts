import { splitFrontmatter } from './frontmatter.ts';
import { type PropertyValue, setProperty } from './properties.ts';

/** What a template's variables are filled with (R-VLT-13). */
export interface TemplateContext {
  /** Title of the note the template goes into. */
  title: string;
  now: Date;
}

const TOKENS = /YYYY|YY|MM|DD|HH|mm|ss/g;
const pad = (n: number) => String(n).padStart(2, '0');

/** Local date and time with the tokens `YYYY`, `YY`, `MM`, `DD`, `HH`, `mm`, `ss`; other text stays. */
export function formatDate(d: Date, format: string): string {
  return format.replace(TOKENS, (t) => {
    switch (t) {
      case 'YYYY':
        return String(d.getFullYear());
      case 'YY':
        return String(d.getFullYear()).slice(-2);
      case 'MM':
        return pad(d.getMonth() + 1);
      case 'DD':
        return pad(d.getDate());
      case 'HH':
        return pad(d.getHours());
      case 'mm':
        return pad(d.getMinutes());
      default:
        return pad(d.getSeconds());
    }
  });
}

const VARIABLE = /\{\{\s*(title|date|time)\s*(?::([^}]*))?\}\}/gi;

/** Fills `{{title}}`, `{{date}}`, `{{time}}` and `{{date:FORMAT}}` / `{{time:FORMAT}}`; unknown braces stay. */
export function expandTemplate(template: string, ctx: TemplateContext): string {
  return template.replace(VARIABLE, (_, name: string, format: string | undefined) => {
    const n = name.toLowerCase();
    if (n === 'title') return ctx.title;
    return formatDate(ctx.now, format?.trim() || (n === 'date' ? 'YYYY-MM-DD' : 'HH:mm'));
  });
}

/** A front matter value setProperty can write, or undefined for nested maps and the like. */
function asProperty(v: unknown): Exclude<PropertyValue, null> | undefined {
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return v;
  if (Array.isArray(v) && v.every((x) => ['string', 'number', 'boolean'].includes(typeof x))) return v.map(String);
  return undefined;
}

/**
 * Puts a template into a note at `cursor` (R-VLT-13): variables filled in, the template's
 * properties merged into the note's (missing keys added, lists joined, the note's own values
 * kept), and its body inserted at the cursor, or at the start of the body when the cursor is
 * inside the front matter. Returns the new text and the cursor after the inserted body.
 */
export function insertTemplate(note: string, cursor: number, template: string, ctx: TemplateContext): { text: string; cursor: number } {
  const t = splitFrontmatter(expandTemplate(template, ctx));
  const before = splitFrontmatter(note);
  let text = note;
  if (t.data) {
    const own = before.data ?? {};
    for (const [key, raw] of Object.entries(t.data)) {
      const value = asProperty(raw);
      if (value === undefined) continue;
      const mine = own[key];
      if (mine === undefined || mine === null) text = setProperty(text, key, value);
      else if (Array.isArray(mine) && Array.isArray(value)) {
        const joined = [...mine.map(String)];
        for (const v of value) if (!joined.includes(v)) joined.push(v);
        if (joined.length > mine.length) text = setProperty(text, key, joined);
      }
    }
  }
  const after = splitFrontmatter(text);
  const at = cursor < before.bodyStart ? after.bodyStart : cursor + (after.bodyStart - before.bodyStart);
  return { text: text.slice(0, at) + t.body + text.slice(at), cursor: at + t.body.length };
}
