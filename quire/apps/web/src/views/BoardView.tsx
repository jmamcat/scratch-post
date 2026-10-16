import { setProperty, splitFrontmatter, titleOf } from '@quire/vault';
import { groupByProperty } from '@quire/views';
import { useMemo, useState } from 'react';
import { GroupList, type ListGroup } from '../shared/GroupList.tsx';
import type { Workspace } from '../sync/index.ts';
import { useNotes } from './use-notes.ts';
import './views.css';

const DEFAULT_KEY = 'status';
/** Columns always offered for `status`, so a board with one column can still move cards. */
const STARTER_COLUMNS = ['todo', 'doing', 'done'];

/**
 * Notes as columns by the value of a front matter property, `status` by default. Moving a
 * card changes that property in the note (R-VIEW-05); the select is the accessible way.
 */
export function BoardView(props: {
  ws: Workspace;
  version: number;
  active: string | null;
  onOpen: (path: string) => void;
  /** Write a note's new text (through the editor when it is the open note). */
  onEdit: (path: string, text: string) => void;
}) {
  const { ws, active, onOpen, onEdit } = props;
  const [key, setKey] = useState(DEFAULT_KEY);
  const [error, setError] = useState<string | null>(null);
  const notes = useNotes(ws, props.version);

  const keys = useMemo(() => {
    const found = new Set<string>([DEFAULT_KEY]);
    for (const n of notes) for (const k of Object.keys(splitFrontmatter(n.text).data ?? {})) found.add(k);
    return [...found].sort((a, b) => (a === DEFAULT_KEY ? -1 : b === DEFAULT_KEY ? 1 : a.localeCompare(b)));
  }, [notes]);

  const columns = useMemo(() => groupByProperty(notes, key), [notes, key]);
  const text = useMemo(() => new Map(notes.map((n) => [n.path, n.text])), [notes]);
  // Move targets: the real columns, the starter ones not yet columns (status only), and
  // `No <key>` last, which removes the property.
  const missingLabel = `No ${key}`;
  const targets = useMemo(() => {
    const real = columns.filter((c) => c.label !== missingLabel).map((c) => ({ key: c.key, label: c.label }));
    if (key === DEFAULT_KEY) for (const name of STARTER_COLUMNS) if (!real.some((c) => c.key === name)) real.push({ key: name, label: name });
    return [...real, { key: missingLabel.toLowerCase(), label: missingLabel }];
  }, [columns, key, missingLabel]);

  const move = (path: string, column: string) => {
    const current = text.get(path);
    if (current === undefined) return;
    try {
      onEdit(path, setProperty(current, key, column === missingLabel ? null : column));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const groups: ListGroup[] = columns.map((col) => ({
    label: col.label,
    items: col.items.map((path) => {
      const title = titleOf(path);
      return {
        path,
        extra: (
          <select className="view-move" aria-label={`Move ${title} to`} value="" onChange={(e) => e.target.value && move(path, e.target.value)}>
            <option value="">Move to…</option>
            {targets
              .filter((c) => c.key !== col.key)
              .map((c) => (
                <option key={c.key} value={c.label}>
                  {c.label}
                </option>
              ))}
          </select>
        ),
      };
    }),
  }));

  return (
    <div className="board-view">
      <label className="board-key">
        <span className="muted">Group by</span>
        <select aria-label="Group by" value={key} onChange={(e) => setKey(e.target.value)}>
          {keys.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
      </label>
      {error && (
        <p className="view-error" role="alert">
          {error}
        </p>
      )}
      <GroupList label="Board" active={active} onOpen={onOpen} empty="No notes yet." groups={groups} />
    </div>
  );
}
