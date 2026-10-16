import { groupByTime, type NoteInfo } from '@quire/views';
import { useMemo } from 'react';
import { GroupList } from '../shared/GroupList.tsx';
import { useHeadMeta, type Workspace } from '../sync/index.ts';
import { toListGroups } from './to-list-groups.ts';
import { useNotes } from './use-notes.ts';
import './views.css';

/**
 * Notes by when they last changed: Today, Yesterday, This week, This month, Older
 * (R-VIEW-04). Times are the server's revision times (cached offline); a note without one
 * yet, such as a just-created local note, counts as changed now.
 */
export function TimelineView(props: {
  ws: Workspace;
  version: number;
  active: string | null;
  onOpen: (path: string) => void;
}) {
  const notes = useNotes(props.ws, props.version);
  const meta = useHeadMeta(props.ws, props.version);
  const groups = useMemo(() => {
    const now = new Date();
    const stamped: NoteInfo[] = notes.map((n) => {
      const m = meta.get(n.path);
      return { ...n, modifiedAt: m?.at ?? now.toISOString(), device: m?.device };
    });
    return toListGroups(groupByTime(stamped, now));
  }, [notes, meta]);
  return <GroupList label="Timeline" active={props.active} onOpen={props.onOpen} empty="No notes yet." groups={groups} />;
}
