import { useMemo } from 'react';
import { GroupList } from '../../shared/GroupList.tsx';
import { useHeadMeta, type Workspace } from '../../sync/index.ts';

/** How many notes the Changes view lists (R-VLT-08). */
const LIMIT = 50;

/** "just now", "5 min ago", "2 h ago", or the date. */
function relativeTime(at: string, now: number): string {
  const t = Date.parse(at);
  if (Number.isNaN(t)) return at;
  const min = Math.floor((now - t) / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h ago`;
  return new Date(t).toLocaleDateString();
}

/**
 * The most recently changed notes, newest first, with the device that changed each and when
 * (R-VLT-08). Revisions come from the server's head metadata, cached for offline use.
 */
export function ChangesView(props: { ws: Workspace; version: number; active: string | null; onOpen: (path: string) => void }) {
  const { ws, version, active, onOpen } = props;
  const meta = useHeadMeta(ws, version);
  const items = useMemo(() => {
    const now = Date.now();
    return [...meta.entries()]
      .sort(([, a], [, b]) => b.rev - a.rev)
      .filter(([path]) => ws.has(path))
      .slice(0, LIMIT)
      .map(([path, m]) => ({ path, detail: <>{m.device} · {relativeTime(m.at, now)}</> }));
  }, [meta, ws, version]);

  return <GroupList label="Changes" active={active} onOpen={onOpen} empty="No changes yet." groups={items.length ? [{ label: 'Changes', items }] : []} />;
}
