import { compareByTitle } from './by-title.ts';
import type { Group, NoteInfo, TimeBucket } from './types.ts';

const ORDER: TimeBucket[] = ['Today', 'Yesterday', 'This week', 'This month', 'Older'];

/** Whole local calendar days from `then` to `now`, immune to daylight saving shifts. */
function daysBetween(now: Date, then: Date): number {
  const a = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const b = Date.UTC(then.getFullYear(), then.getMonth(), then.getDate());
  return Math.round((a - b) / 86_400_000);
}

function bucketOf(modifiedAt: Date | null, now: Date): TimeBucket {
  if (!modifiedAt) return 'Older';
  const days = daysBetween(now, modifiedAt);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days <= 7) return 'This week';
  if (days <= 30) return 'This month';
  return 'Older';
}

function parseTime(iso: string | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Buckets by last change in local time (R-VIEW-04). Non-empty buckets only, newest first within each. */
export function groupByTime(notes: NoteInfo[], now: Date): Group[] {
  const buckets = new Map<TimeBucket, { path: string; at: number }[]>();
  for (const note of notes) {
    const at = parseTime(note.modifiedAt);
    const bucket = bucketOf(at, now);
    const list = buckets.get(bucket) ?? [];
    list.push({ path: note.path, at: at ? at.getTime() : 0 });
    buckets.set(bucket, list);
  }
  return ORDER.filter((b) => buckets.has(b)).map((label) => ({
    key: label.toLowerCase(),
    label,
    items: buckets
      .get(label)!
      .sort((a, b) => b.at - a.at || compareByTitle(a.path, b.path))
      .map((e) => e.path),
  }));
}
