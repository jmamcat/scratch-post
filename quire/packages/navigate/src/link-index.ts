import { resolveLink } from './resolve-link.ts';
import { extractLinks, type WikiLink } from '@quire/render';

export interface OutgoingLink {
  /** Target as written (no alias or subpath). */
  target: string;
  /** Label to show: the target with its subpath. */
  label: string;
  /** Resolved vault path, or null when the note does not exist. */
  path: string | null;
  heading?: string;
  embed: boolean;
}

export interface Backlink {
  path: string;
  count: number;
}

/**
 * Link index for backlinks and outgoing links (R-NAV-01), computed from the local copy.
 * Parsed links are cached per text and resolutions per set of paths, so typing in one
 * note only re-parses that note.
 */
export class LinkIndex {
  private parsed = new Map<string, { text: string; links: WikiLink[] }>();
  private resolved = new Map<string, string | null>();
  private pathsRef: readonly string[] = [];

  /** Call when the set of paths changes; drops cached resolutions. */
  setPaths(paths: readonly string[]): void {
    if (paths === this.pathsRef) return;
    this.pathsRef = paths;
    this.resolved.clear();
    const keep = new Set(paths);
    for (const p of this.parsed.keys()) if (!keep.has(p)) this.parsed.delete(p);
  }

  links(path: string, text: string): WikiLink[] {
    const hit = this.parsed.get(path);
    if (hit && hit.text === text) return hit.links;
    const links = extractLinks(text);
    this.parsed.set(path, { text, links });
    return links;
  }

  resolve(target: string, from: string): string | null {
    const key = `${from}\u0000${target}`;
    if (this.resolved.has(key)) return this.resolved.get(key)!;
    const r = resolveLink(target, from, this.pathsRef);
    this.resolved.set(key, r);
    return r;
  }

  outgoing(path: string, text: string): OutgoingLink[] {
    const seen = new Set<string>();
    const out: OutgoingLink[] = [];
    for (const l of this.links(path, text)) {
      if (l.target === '') continue;
      const sub = l.heading ? `#${l.heading}` : l.block ? `#^${l.block}` : '';
      const key = l.target + sub;
      if (seen.has(key)) continue;
      seen.add(key);
      const link: OutgoingLink = { target: l.target, label: key, path: this.resolve(l.target, path), embed: l.embed };
      if (l.heading) link.heading = l.heading;
      out.push(link);
    }
    return out;
  }

  backlinks(target: string, docs: Iterable<{ path: string; text: string }>): Backlink[] {
    const out: Backlink[] = [];
    for (const d of docs) {
      if (d.path === target) continue;
      let count = 0;
      for (const l of this.links(d.path, d.text)) if (l.target !== '' && this.resolve(l.target, d.path) === target) count++;
      if (count > 0) out.push({ path: d.path, count });
    }
    return out.sort((a, b) => (a.path < b.path ? -1 : 1));
  }
}
