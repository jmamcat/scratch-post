import { extractTags } from '@quire/render';
import { compareLabels, sortedByTitle } from './by-title.ts';
import type { NoteInfo, TagNode } from './types.ts';

interface Building {
  tag: string;
  name: string;
  notes: Set<string>;
  children: Map<string, Building>;
}

function finish(node: Building): TagNode {
  const children = [...node.children.values()].map(finish).sort((a, b) => compareLabels(a.name, b.name));
  return { tag: node.tag, name: node.name, count: node.notes.size, notes: sortedByTitle(node.notes), children };
}

/**
 * Every tag as a tree of its `/` segments (R-VIEW-03). Tags match case-insensitively; the
 * first spelling seen names the node. A note counts once for a tag and once for each parent.
 */
export function tagTree(notes: NoteInfo[]): TagNode[] {
  const roots = new Map<string, Building>();
  for (const note of notes) {
    for (const tag of extractTags(note.text)) {
      let level = roots;
      let prefix = '';
      for (const segment of tag.split('/').filter((s) => s !== '')) {
        prefix = prefix ? `${prefix}/${segment}` : segment;
        const key = segment.toLowerCase();
        let node = level.get(key);
        if (!node) level.set(key, (node = { tag: prefix, name: segment, notes: new Set(), children: new Map() }));
        node.notes.add(note.path);
        level = node.children;
      }
    }
  }
  return [...roots.values()].map(finish).sort((a, b) => compareLabels(a.name, b.name));
}
