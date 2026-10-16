import { splitFrontmatter } from '@quire/vault';
import { compareLabels, sortedByTitle } from './by-title.ts';
import type { Group, NoteInfo } from './types.ts';

/** The column a property value puts a note in, or null when it has none. */
function columnValue(value: unknown): string | null {
  const first = Array.isArray(value) ? value[0] : value;
  if (first === undefined || first === null) return null;
  if (typeof first === 'object') return null;
  const text = String(first).trim();
  return text === '' ? null : text;
}

/**
 * One group per distinct value of the front matter property `key` (R-VIEW-05), values
 * matching case-insensitively with the first spelling as the label. Notes without the
 * property land in a final `No <key>` group.
 */
export function groupByProperty(notes: NoteInfo[], key: string): Group[] {
  const byKey = new Map<string, Group>();
  const missing: string[] = [];
  for (const note of notes) {
    const value = columnValue(splitFrontmatter(note.text).data?.[key]);
    if (value === null) {
      missing.push(note.path);
      continue;
    }
    const groupKey = value.toLowerCase();
    let group = byKey.get(groupKey);
    if (!group) byKey.set(groupKey, (group = { key: groupKey, label: value, items: [] }));
    group.items.push(note.path);
  }
  const groups = [...byKey.values()].sort((a, b) => compareLabels(a.label, b.label));
  for (const g of groups) g.items = sortedByTitle(g.items);
  if (missing.length > 0) {
    const label = `No ${key}`;
    groups.push({ key: label.toLowerCase(), label, items: sortedByTitle(missing) });
  }
  return groups;
}
