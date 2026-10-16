/**
 * Link rewriting for a rename (R-VLT-09), following Obsidian's "update internal links"
 * (OBS-F-042): every link that pointed at a note keeps pointing at it under its new name.
 */
import { extractLinks } from '@quire/render';
import { resolveLink } from './resolve-link.ts';

export interface RenameEdit {
  /** The note's path before the rename (for the renamed note itself, `from`). */
  path: string;
  /** Its full new text. */
  text: string;
}

// Same shape as the Markdown link pattern the extractor uses, anchored at the link start.
const MDLINK =
  /(!?)\[((?:\\.|[^\]\\\n])*)\]\(\s*(<[^>\n]*>|(?:[^\s()\\]|\\.|\([^\s()]*\))*)(?:\s+(?:"[^"\n]*"|'[^'\n]*'|\([^)\n]*\)))?\s*\)/y;

function basename(path: string): string {
  const i = path.lastIndexOf('/');
  return i < 0 ? path : path.slice(i + 1);
}

function dirname(path: string): string {
  const i = path.lastIndexOf('/');
  return i < 0 ? '' : path.slice(0, i);
}

const stripMd = (p: string) => (/\.md$/i.test(p) ? p.slice(0, -3) : p);

/** Lower-case file name without `.md`: two links can only reach the same note if these match. */
function stem(target: string): string {
  return stripMd(basename(target.replace(/\\/g, '/').trim().normalize('NFC'))).toLowerCase();
}

/** `target` as a path relative to `folder` (`../` where needed). */
function relativePath(folder: string, target: string): string {
  const from = folder ? folder.split('/') : [];
  const to = target.split('/');
  let i = 0;
  while (i < from.length && i < to.length - 1 && from[i] === to[i]) i++;
  return '../'.repeat(from.length - i) + to.slice(i).join('/');
}

/**
 * Notes whose links resolved to `from` and must change when it becomes `to`. Links are
 * resolved with `resolveLink` against the paths before and after the rename; a link is
 * rewritten only when it resolved before and would resolve elsewhere after (so the
 * renamed note's own relative links are kept working too). Code and comments are skipped.
 */
export function planRename(notes: Iterable<{ path: string; text: string }>, from: string, to: string): RenameEdit[] {
  const list = [...notes];
  const before = list.map((n) => n.path);
  if (!before.includes(from)) before.push(from);
  const after = [...before.filter((p) => p !== from && p !== to), to];
  const affected = new Set([stem(from), stem(to)]);
  const unique = (p: string) => {
    const s = stem(p);
    return after.filter((q) => stem(q) === s).length === 1;
  };

  const edits: RenameEdit[] = [];
  for (const note of list) {
    const moved = note.path === from;
    const newPath = moved ? to : note.path;
    let out = '';
    let last = 0;
    for (const link of extractLinks(note.text)) {
      if (link.target === '') continue;
      // Only links naming `from` or `to` can change meaning, unless the note itself moves.
      if (!moved && !affected.has(stem(link.target))) continue;
      const was = resolveLink(link.target, note.path, before);
      if (was === null) continue;
      const want = was === from ? to : was;
      if (resolveLink(link.target, newPath, after) === want) continue;
      const raw = note.text.slice(link.start, link.end);
      const next = isWiki(raw) ? rewriteWiki(raw, want, newPath, after, unique) : rewriteMarkdown(raw, want, newPath, after);
      if (next === null || next === raw) continue;
      out += note.text.slice(last, link.start) + next;
      last = link.end;
    }
    if (last > 0) edits.push({ path: note.path, text: out + note.text.slice(last) });
  }
  return edits;
}

const isWiki = (raw: string) => raw.startsWith('[[') || raw.startsWith('![[');

/** Keeps `!`, `#heading`, `#^block` and `|alias`; the target becomes the shortest unique name. */
function rewriteWiki(raw: string, target: string, fromNote: string, paths: readonly string[], unique: (p: string) => boolean): string | null {
  const open = raw.startsWith('!') ? 3 : 2;
  const inner = raw.slice(open, -2);
  let cut = inner.length;
  const hash = inner.indexOf('#');
  const pipe = inner.indexOf('|');
  if (hash >= 0) cut = hash;
  if (pipe >= 0 && pipe < cut) cut = pipe > 0 && inner[pipe - 1] === '\\' ? pipe - 1 : pipe;
  const linktext = inner.slice(0, cut);
  const lead = /^\s*/.exec(linktext)![0];
  const trail = /\s*$/.exec(linktext.slice(lead.length))![0];
  const keepMd = /\.md$/i.test(linktext.trim());

  const isNote = /\.md$/i.test(target);
  const full = isNote && !keepMd ? stripMd(target) : target;
  const candidates = [...(unique(target) ? [basename(full)] : []), full, `/${full}`];
  const name = candidates.find((c) => resolveLink(c, fromNote, paths) === target);
  if (name === undefined) return null;
  return raw.slice(0, open) + lead + name + trail + inner.slice(cut) + ']]';
}

/** Keeps the label, title and fragment; the destination becomes relative to the linking note. */
function rewriteMarkdown(raw: string, target: string, fromNote: string, paths: readonly string[]): string | null {
  MDLINK.lastIndex = 0;
  const m = MDLINK.exec(raw);
  if (!m) return null;
  let pos = m[1]!.length + 1 + m[2]!.length + 2;
  while (pos < raw.length && /\s/.test(raw[pos]!)) pos++;
  const dest = m[3]!;
  if (!raw.startsWith(dest, pos)) return null;

  const angle = dest.startsWith('<');
  const body = angle ? dest.slice(1, -1) : dest;
  const hash = body.indexOf('#');
  const pathPart = hash >= 0 ? body.slice(0, hash) : body;
  const fragment = hash >= 0 ? body.slice(hash) : '';
  const keepMd = /\.md$/i.test(pathPart) || !/\.md$/i.test(target);
  const shape = (p: string) => (keepMd ? p : stripMd(p));

  const candidates = [shape(relativePath(dirname(fromNote), target)), `/${shape(target)}`];
  const next = candidates.find((c) => resolveLink(c, fromNote, paths) === target);
  if (next === undefined) return null;

  let written: string;
  if (angle) written = `<${next}${fragment}>`;
  else if (/%(?!20)[0-9A-Fa-f]{2}/.test(pathPart)) written = encodeURI(next).replace(/\(/g, '%28').replace(/\)/g, '%29') + fragment;
  else written = next.replace(/ /g, '%20').replace(/\(/g, '%28').replace(/\)/g, '%29') + fragment;
  return raw.slice(0, pos) + written + raw.slice(pos + dest.length);
}
