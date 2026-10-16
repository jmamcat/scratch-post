import { titleOf } from '@quire/vault';

/** Orders paths by note title, ignoring case; the path breaks ties so the order is stable. */
export function compareByTitle(a: string, b: string): number {
  const ta = titleOf(a).toLowerCase();
  const tb = titleOf(b).toLowerCase();
  if (ta !== tb) return ta < tb ? -1 : 1;
  return a < b ? -1 : a > b ? 1 : 0;
}

export function sortedByTitle(paths: Iterable<string>): string[] {
  return [...paths].sort(compareByTitle);
}

export function compareLabels(a: string, b: string): number {
  const la = a.toLowerCase();
  const lb = b.toLowerCase();
  return la < lb ? -1 : la > lb ? 1 : a < b ? -1 : a > b ? 1 : 0;
}
