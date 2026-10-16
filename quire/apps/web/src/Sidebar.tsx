import { FileTree, SearchPane } from './navigate/index.ts';
import { Icon } from './shared/Icon.tsx';
import type { Workspace } from './sync/index.ts';
import { ChangesView } from './vault/index.ts';
import { BoardView, DomainsView, RecentView, TagsView, TimelineView } from './views/index.ts';

/** Sidebar views (R-VIEW-01). Folders and Search come from 0001; the rest from 0002. */
export const SIDEBAR_VIEWS = [
  { id: 'files', label: 'Folders' },
  { id: 'search', label: 'Search' },
  { id: 'recent', label: 'Recent' },
  { id: 'changes', label: 'Changes' },
  { id: 'domains', label: 'Domains' },
  { id: 'tags', label: 'Tags' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'board', label: 'Board' },
] as const;

export type SidebarView = (typeof SIDEBAR_VIEWS)[number]['id'];

interface Props {
  ws: Workspace;
  paths: readonly string[];
  version: number;
  active: string | null;
  view: SidebarView;
  onView: (v: SidebarView) => void;
  query: string;
  onQuery: (q: string) => void;
  recent: string[];
  onOpen: (path: string) => void;
  onNewNote: (folder?: string) => void;
  onNewFolder: () => void;
  onDaily: () => void;
  onTag: (tag: string) => void;
  onEdit: (path: string, text: string) => void;
  onSettings: () => void;
  onPalette: () => void;
}

export function Sidebar(p: Props) {
  const common = { ws: p.ws, version: p.version, active: p.active, onOpen: p.onOpen };
  return (
    <nav className="left-pane" aria-label="Vault">
      <div className="pane-toolbar">
        <select className="view-switcher" aria-label="Sidebar view" value={p.view} onChange={(e) => p.onView(e.target.value as SidebarView)}>
          {SIDEBAR_VIEWS.map((v) => (
            <option key={v.id} value={v.id}>
              {v.label}
            </option>
          ))}
        </select>
        <span className="spacer" />
        <button type="button" className="icon-button" aria-label="New note" title="New note" onClick={() => p.onNewNote()}>
          <Icon name="newNote" />
        </button>
        <button type="button" className="icon-button" aria-label="New folder" title="New folder" onClick={p.onNewFolder}>
          <Icon name="newFolder" />
        </button>
        <button type="button" className="icon-button" aria-label="Open today's daily note" title="Open today's daily note" onClick={p.onDaily}>
          <Icon name="calendar" />
        </button>
      </div>
      <div className="pane-body" data-view={p.view}>
        {p.view === 'files' && <FileTree paths={p.paths} active={p.active} pending={(path) => p.ws.isPending(path)} onOpen={p.onOpen} onNewNote={(f) => p.onNewNote(f)} />}
        {p.view === 'search' && <SearchPane ws={p.ws} version={p.version} query={p.query} onQuery={p.onQuery} onOpen={p.onOpen} />}
        {p.view === 'recent' && <RecentView {...common} recent={p.recent} />}
        {p.view === 'changes' && <ChangesView {...common} />}
        {p.view === 'domains' && <DomainsView {...common} />}
        {p.view === 'tags' && <TagsView {...common} onTag={p.onTag} />}
        {p.view === 'timeline' && <TimelineView {...common} />}
        {p.view === 'board' && <BoardView {...common} onEdit={p.onEdit} />}
      </div>
      <div className="pane-footer">
        <button type="button" className="icon-button" aria-label="Open settings" title="Settings" onClick={p.onSettings}>
          <Icon name="settings" />
        </button>
        <button type="button" className="icon-button" aria-label="Open command palette" title="Command palette" onClick={p.onPalette}>
          <Icon name="command" />
        </button>
      </div>
    </nav>
  );
}
