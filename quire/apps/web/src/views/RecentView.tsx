import { useMemo } from 'react';
import { GroupList } from '../shared/GroupList.tsx';
import type { Workspace } from '../sync/index.ts';

/** How many opened notes Recent lists (R-VIEW-06). */
const LIMIT = 20;

/** The notes this device opened last, newest first, in the order App keeps them (R-VIEW-06). */
export function RecentView(props: {
  ws: Workspace;
  version: number;
  active: string | null;
  onOpen: (path: string) => void;
  recent: string[];
}) {
  const { ws, version, active, onOpen, recent } = props;
  const items = useMemo(
    () => recent.filter((path) => ws.has(path)).slice(0, LIMIT).map((path) => ({ path })),
    // biome-ignore lint/correctness/useExhaustiveDependencies: `version` is the change signal
    [recent, ws, version],
  );
  return <GroupList label="Recent" active={active} onOpen={onOpen} empty="No recent notes yet." groups={items.length ? [{ label: 'Recent', items }] : []} />;
}
