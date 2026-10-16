import { groupByDomain } from '@quire/views';
import { useMemo } from 'react';
import { GroupList } from '../shared/GroupList.tsx';
import type { Workspace } from '../sync/index.ts';
import { toListGroups } from './to-list-groups.ts';
import { useNotes } from './use-notes.ts';
import './views.css';

/** Notes grouped by what they are about: domain property, journal, tag, folder (R-VIEW-02). */
export function DomainsView(props: {
  ws: Workspace;
  version: number;
  active: string | null;
  onOpen: (path: string) => void;
}) {
  const notes = useNotes(props.ws, props.version);
  const groups = useMemo(() => toListGroups(groupByDomain(notes)), [notes]);
  return <GroupList label="Domains" active={props.active} onOpen={props.onOpen} empty="No notes yet." groups={groups} />;
}
