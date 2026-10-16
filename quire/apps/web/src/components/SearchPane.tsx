import { extractTags, search, titleOf } from '@quire/core';
import { useDeferredValue, useMemo } from 'react';
import type { Workspace } from '../store/workspace.ts';

interface Props {
  ws: Workspace;
  version: number;
  query: string;
  onQuery: (q: string) => void;
  onOpen: (path: string) => void;
}

/** Offline full-text search over the local copy (R-NAV-04). `tag:x` lists notes tagged x. */
export function SearchPane({ ws, version, query, onQuery, onOpen }: Props) {
  const q = useDeferredValue(query);
  const hits = useMemo(() => {
    const tag = /^tag:\s*#?(\S+)$/i.exec(q.trim());
    if (tag) {
      const want = tag[1]!.toLowerCase();
      return [...ws.notes()]
        .filter((d) => extractTags(d.text).some((t) => t.toLowerCase() === want || t.toLowerCase().startsWith(want + '/')))
        .map((d) => ({ path: d.path, title: titleOf(d.path), snippet: d.path }))
        .sort((a, b) => (a.path < b.path ? -1 : 1));
    }
    return search(ws.notes(), q, 100);
  }, [q, version, ws]);

  return (
    <div className="search-pane">
      <input
        type="search"
        className="search-input"
        placeholder="Search notes"
        aria-label="Search notes"
        value={query}
        autoFocus
        onChange={(e) => onQuery(e.target.value)}
      />
      {q.trim() && (
        <p className="muted small" role="status">
          {hits.length === 0 ? 'No matches.' : `${hits.length} ${hits.length === 1 ? 'result' : 'results'}`}
        </p>
      )}
      <ul className="search-results" aria-label="Search results">
        {hits.map((h) => (
          <li key={h.path}>
            <button type="button" className="search-hit" onClick={() => onOpen(h.path)} title={h.path}>
              <span className="link-title">{h.title}</span>
              <span className="snippet">{h.snippet}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
