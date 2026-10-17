import { splitFrontmatter } from '@quire/vault';
import { extractTags } from '@quire/render';
import { compareLabels, sortedByTitle } from './by-title.ts';
import type { Group, NoteInfo } from './types.ts';

const UNSORTED = 'Unsorted';
const DAILY = /^\d{4}-\d{2}-\d{2}\.md$/i;

/** `money` gives `Money`, `home lab` gives `Home Lab`, `game-dev` gives `Game-dev`. */
function titleCase(s: string): string {
  return s.toLowerCase().replace(/(^|\s)(\S)/gu, (_m, space: string, ch: string) => space + ch.toUpperCase());
}

/** The domain label a note belongs to (R-VIEW-02): the first rule that applies wins. */
export function domainOf(note: NoteInfo): string {
  const declared = splitFrontmatter(note.text).data?.['domain'];
  if (typeof declared === 'string' && declared.trim() !== '') return titleCase(declared.trim());

  const slash = note.path.lastIndexOf('/');
  const name = slash < 0 ? note.path : note.path.slice(slash + 1);
  if (DAILY.test(name)) return 'Journal';

  const tag = extractTags(note.text)[0];
  const top = tag?.split('/')[0];
  if (top) return titleCase(top);

  if (slash > 0) return titleCase(note.path.slice(0, note.path.indexOf('/')));
  return UNSORTED;
}

/** Groups by `domainOf`, sorted by label with `Unsorted` last. */
export function groupByDomain(notes: NoteInfo[]): Group[] {
  const byKey = new Map<string, Group>();
  for (const note of notes) {
    const label = domainOf(note);
    const key = label.toLowerCase();
    let group = byKey.get(key);
    if (!group) byKey.set(key, (group = { key, label, items: [] }));
    group.items.push(note.path);
  }
  const groups = [...byKey.values()];
  for (const g of groups) g.items = sortedByTitle(g.items);
  const rank = (g: Group) => (g.label === UNSORTED ? 1 : 0);
  return groups.sort((a, b) => rank(a) - rank(b) || compareLabels(a.label, b.label));
}
