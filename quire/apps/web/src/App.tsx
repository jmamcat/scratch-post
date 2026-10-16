import { extractHeadings } from '@quire/render';
import { titleOf } from '@quire/vault';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { type Command, formatHotkey, matchesHotkey } from './navigate/index.ts';
import { CommandPalette } from './navigate/index.ts';
import { type EditorHandle, NoteEditor } from './vault/index.ts';
import { FileTree } from './navigate/index.ts';
import { Icon } from './shared/Icon.tsx';
import { InlineTitle } from './vault/index.ts';
import { ConfirmDialog, PromptDialog } from './shared/Modal.tsx';
import { QuickSwitcher } from './navigate/index.ts';
import { headingSlug, Reader } from './render/index.ts';
import { RightPane, type RightTab } from './navigate/index.ts';
import { SearchPane } from './navigate/index.ts';
import { SettingsDialog } from './platforms/index.ts';
import { StatusBar } from './sync/index.ts';
import { dailyNotePath, folderOf, joinPath, toFolderPath, toNotePath, untitledPath } from './vault/index.ts';
import { usePref } from './shared/use-pref.ts';
import { clearRoute, navigate, noteHash, useRoute } from './shared/router.ts';
import { saveSettings, type Settings } from './platforms/index.ts';
import { loadPref, savePref } from './shared/use-pref.ts';
import type { Workspace } from './sync/index.ts';
import { HistoryDrawer } from './vault/index.ts';
import { LiveIndicator } from './live/index.ts';
import { useLive } from './live/index.ts';
import { ConflictBadge } from './review/index.ts';
import { ConflictStore } from './review/index.ts';
import { NoteBanner } from './review/index.ts';
import { ReviewDrawer } from './review/index.ts';

type Dialog =
  | { kind: 'switcher' }
  | { kind: 'palette' }
  | { kind: 'settings' }
  | { kind: 'confirm-delete'; path: string }
  | { kind: 'new-folder' };

const narrowQuery = '(max-width: 800px)';
const isNarrow = () => typeof matchMedia !== 'undefined' && matchMedia(narrowQuery).matches;

export function App({ ws }: { ws: Workspace }) {
  const snap = useSyncExternalStore(ws.subscribe, ws.getSnapshot);
  const route = useRoute();
  const path = route.kind === 'note' ? route.path : null;
  const text = path === null ? undefined : ws.read(path);
  const exists = text !== undefined;

  const [reading, setReading] = usePref('reading', false);
  // On narrow screens the sidebars start closed and their state is not remembered.
  const [leftOpen, setLeftOpen] = useState(() => !isNarrow() && loadPref('leftOpen', true));
  const [rightOpen, setRightOpen] = useState(() => !isNarrow() && loadPref('rightOpen', true));
  const [leftTab, setLeftTab] = useState<'files' | 'search'>('files');
  const [query, setQuery] = useState('');
  const [rightTab, setRightTab] = usePref<RightTab>('rightTab', 'backlinks');
  const [recent, setRecent] = usePref<string[]>('recent', []);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [titleFocus, setTitleFocus] = useState(0);
  const editor = useRef<EditorHandle | null>(null);
  const [handle, setHandle] = useState<EditorHandle | null>(null);
  const [drawer, setDrawer] = useState<{ kind: 'review'; focus: string | null } | { kind: 'history' } | null>(null);

  // Review inbox data (P08), live session for the open note (P08).
  const [conflicts] = useState(() => new ConflictStore(ws));
  useEffect(() => {
    conflicts.start();
    return () => conflicts.stop();
  }, [conflicts]);
  const conflictSnap = useSyncExternalStore(conflicts.subscribe, conflicts.getSnapshot);
  const live = useLive(ws, handle);
  const readerBox = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isNarrow()) savePref('leftOpen', leftOpen);
  }, [leftOpen]);
  useEffect(() => {
    if (!isNarrow()) savePref('rightOpen', rightOpen);
  }, [rightOpen]);

  // ---- navigation ----------------------------------------------------------------

  const open = useCallback((p: string, heading?: string) => {
    navigate(p, heading);
    if (isNarrow()) setLeftOpen(false);
  }, []);

  const createAndOpen = useCallback(
    (p: string, focusTitle = false) => {
      ws.create(p);
      open(p);
      if (focusTitle) setTimeout(() => setTitleFocus((n) => n + 1), 0);
    },
    [ws, open],
  );

  /** Follows a link; an unresolved one creates the note (OBS-UX-04). */
  const openLink = useCallback(
    (target: string, from: string, heading?: string) => {
      if (target === '') {
        if (heading) open(from, heading);
        return;
      }
      const resolved = ws.links.resolve(target, from);
      if (resolved) return open(resolved, heading);
      const p = toNotePath(target);
      if (p) createAndOpen(p);
    },
    [ws, open, createAndOpen],
  );

  const showTag = useCallback((tag: string) => {
    setLeftOpen(true);
    setLeftTab('search');
    setQuery(`tag:${tag}`);
  }, []);

  useEffect(() => {
    if (route.kind === 'tag') showTag(route.tag);
  }, [route, showTag]);

  // Remember recent notes and scroll to a linked heading.
  useEffect(() => {
    if (route.kind !== 'note' || !ws.has(route.path)) return;
    setRecent((r) => [route.path, ...r.filter((p) => p !== route.path)].slice(0, 20));
    if (!route.heading) return;
    const heading = route.heading;
    requestAnimationFrame(() => {
      const t = ws.read(route.path) ?? '';
      const slug = headingSlug(t, heading);
      if (!slug) return;
      if (reading) document.getElementById(slug)?.scrollIntoView({ block: 'start' });
      else {
        const h = extractHeadings(t).find((x) => x.slug === slug);
        if (h) editor.current?.scrollToLine(h.line);
      }
    });
  }, [route]);

  // ---- actions -------------------------------------------------------------------

  const newNote = useCallback((folder = '') => createAndOpen(untitledPath(snap.paths, folder), true), [createAndOpen, snap.paths]);
  const dailyNote = useCallback(() => createAndOpen(dailyNotePath()), [createAndOpen]);

  const rename = (name: string): string | null => {
    if (!path) return 'No note open.';
    const next = toNotePath(joinPath(folderOf(path), name));
    if (!next || name.includes('/')) return 'Names cannot contain / or start with a dot.';
    if (next === path) return null;
    if (ws.has(next)) return `"${titleOf(next)}" already exists.`;
    // Switch the route first so the editor moves to the new path in the same render.
    history.replaceState(null, '', noteHash(next));
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    void ws.rename(path, next);
    return null;
  };

  const saveAndReload = (s: Settings) => {
    saveSettings(s);
    void ws.flush().then(() => location.reload());
  };

  const commands: Command[] = useMemo(
    () => [
      { id: 'switcher', name: 'Open quick switcher', hotkeys: ['Mod+O'], run: () => setDialog({ kind: 'switcher' }) },
      { id: 'palette', name: 'Open command palette', hotkeys: ['Mod+P'], run: () => setDialog({ kind: 'palette' }) },
      { id: 'new-note', name: 'New note', hotkeys: ['Mod+N', 'Alt+N'], run: () => newNote() },
      { id: 'new-folder', name: 'New folder', run: () => setDialog({ kind: 'new-folder' }) },
      { id: 'daily', name: "Open today's daily note", run: dailyNote },
      { id: 'reading', name: 'Toggle reading view', hotkeys: ['Mod+E'], run: () => setReading((r) => !r), enabled: () => exists },
      { id: 'rename', name: 'Rename note', run: () => setTitleFocus((n) => n + 1), enabled: () => exists },
      { id: 'delete', name: 'Delete note', run: () => path && setDialog({ kind: 'confirm-delete', path }), enabled: () => exists },
      {
        id: 'search',
        name: 'Search all notes',
        hotkeys: ['Mod+Shift+F'],
        run: () => {
          setLeftOpen(true);
          setLeftTab('search');
        },
      },
      { id: 'sync', name: 'Sync now', run: () => void ws.syncNow() },
      { id: 'settings', name: 'Open settings', hotkeys: ['Mod+,'], run: () => setDialog({ kind: 'settings' }) },
      { id: 'left', name: 'Toggle left sidebar', run: () => setLeftOpen((v) => !v) },
      { id: 'right', name: 'Toggle right sidebar', run: () => setRightOpen((v) => !v) },
      { id: 'review', name: 'Open review inbox', run: () => setDrawer({ kind: 'review', focus: null }) },
      { id: 'history', name: 'Show version history', run: () => setDrawer({ kind: 'history' }), enabled: () => exists },
    ],
    [ws, newNote, dailyNote, exists, path, setReading],
  );

  const commandsRef = useRef(commands);
  commandsRef.current = commands;
  const dialogRef = useRef(dialog);
  dialogRef.current = dialog;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (dialogRef.current) return;
      for (const c of commandsRef.current) {
        if (!c.hotkeys?.some((h) => matchesHotkey(e, h))) continue;
        if (c.enabled && !c.enabled()) return;
        e.preventDefault();
        e.stopPropagation();
        c.run();
        return;
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);

  const resolveFromCurrent = useCallback((t: string) => (path ? ws.links.resolve(t, path) : null), [ws, path, snap.paths]);

  // ---- layout --------------------------------------------------------------------

  const folder = path ? folderOf(path) : '';
  return (
    <div className={`app ${leftOpen ? 'left-open' : ''} ${rightOpen ? 'right-open' : ''}`}>
      <nav className="left-pane" aria-label="Vault">
        <div className="pane-toolbar">
          <div className="segmented" role="tablist" aria-label="Sidebar view">
            <button type="button" role="tab" aria-selected={leftTab === 'files'} className={leftTab === 'files' ? 'active' : ''} onClick={() => setLeftTab('files')} aria-label="Files" title="Files">
              <Icon name="files" />
            </button>
            <button type="button" role="tab" aria-selected={leftTab === 'search'} className={leftTab === 'search' ? 'active' : ''} onClick={() => setLeftTab('search')} aria-label="Search" title="Search">
              <Icon name="search" />
            </button>
          </div>
          <span className="spacer" />
          <button type="button" className="icon-button" aria-label="New note" title="New note" onClick={() => newNote()}>
            <Icon name="newNote" />
          </button>
          <button type="button" className="icon-button" aria-label="New folder" title="New folder" onClick={() => setDialog({ kind: 'new-folder' })}>
            <Icon name="newFolder" />
          </button>
          <button type="button" className="icon-button" aria-label="Open today's daily note" title="Open today's daily note" onClick={dailyNote}>
            <Icon name="calendar" />
          </button>
        </div>
        <div className="pane-body">
          {leftTab === 'files' ? (
            <FileTree paths={snap.paths} active={exists ? path : null} pending={(p) => ws.isPending(p)} onOpen={(p) => open(p)} onNewNote={(f) => newNote(f)} />
          ) : (
            <SearchPane ws={ws} version={snap.version} query={query} onQuery={setQuery} onOpen={(p) => open(p)} />
          )}
        </div>
        <div className="pane-footer">
          <button type="button" className="icon-button" aria-label="Open settings" title="Settings" onClick={() => setDialog({ kind: 'settings' })}>
            <Icon name="settings" />
          </button>
          <button type="button" className="icon-button" aria-label="Open command palette" title="Command palette" onClick={() => setDialog({ kind: 'palette' })}>
            <Icon name="command" />
          </button>
        </div>
      </nav>
      {leftOpen && <div className="scrim" onClick={() => setLeftOpen(false)} aria-hidden="true" />}

      <main className="main">
        <header className="view-header">
          <button type="button" className="icon-button" aria-label="Toggle left sidebar" title="Toggle left sidebar" aria-pressed={leftOpen} onClick={() => setLeftOpen((v) => !v)}>
            <Icon name="sidebar" />
          </button>
          <div className="breadcrumb" title={path ?? ''}>
            {exists && path ? (
              <>
                {folder && <span className="crumb-folder">{folder.split('/').join(' / ')} / </span>}
                <span className="crumb-title">{titleOf(path)}</span>
              </>
            ) : null}
          </div>
          {exists && (
            <>
              <button
                type="button"
                className="icon-button"
                aria-label={reading ? 'Switch to editing view' : 'Switch to reading view'}
                title={reading ? 'Editing view (Ctrl/Cmd+E)' : 'Reading view (Ctrl/Cmd+E)'}
                onClick={() => setReading((r) => !r)}
              >
                <Icon name={reading ? 'pencil' : 'book'} />
              </button>
              <button type="button" className="icon-button" aria-label="Version history" title="Version history" onClick={() => setDrawer({ kind: 'history' })}>
                <Icon name="history" />
              </button>
              <button type="button" className="icon-button" aria-label="Delete note" title="Delete note" onClick={() => path && setDialog({ kind: 'confirm-delete', path })}>
                <Icon name="trash" />
              </button>
            </>
          )}
          <button type="button" className="icon-button" aria-label="Toggle right sidebar" title="Toggle right sidebar" aria-pressed={rightOpen} onClick={() => setRightOpen((v) => !v)}>
            <Icon name="sidebarRight" />
          </button>
        </header>

        {exists && path ? (
          <div className="view-content">
            {(() => {
              const open = conflictSnap.open.find((c) => c.path === path);
              return open ? <NoteBanner conflict={open} onReview={(id) => setDrawer({ kind: 'review', focus: id })} /> : null;
            })()}
            <InlineTitle path={path} focusSignal={titleFocus} onRename={rename} onDone={() => setTimeout(() => editor.current?.view.focus(), 0)} />
            <NoteEditor ws={ws} path={path} hidden={reading} onOpenLink={openLink} onHandle={(h) => {
                editor.current = h;
                setHandle(h);
              }}
              isLive={() => ws.client.isLive(path)}
            />
            {reading && (
              <div className="reader-scroll" ref={readerBox}>
                <Reader
                  text={text}
                  resolve={resolveFromCurrent}
                  onInternalLink={(p, resolved, sub) => {
                    if (resolved) return open(p, sub);
                    const np = toNotePath(p);
                    if (np) createAndOpen(np);
                  }}
                  onTag={showTag}
                />
              </div>
            )}
          </div>
        ) : (
          <EmptyState
            loaded={snap.loaded}
            missing={route.kind === 'note' ? route.path : null}
            onNew={() => newNote()}
            onCreate={(p) => createAndOpen(p)}
            onSwitcher={() => setDialog({ kind: 'switcher' })}
            onDaily={dailyNote}
          />
        )}
      </main>

      {rightOpen && (
        <RightPane
          ws={ws}
          version={snap.version}
          path={exists ? path : null}
          tab={rightTab}
          onTab={setRightTab}
          onOpen={(p) => open(p)}
          onOpenLink={openLink}
          onTag={showTag}
          onHeading={(line, slug) => {
            if (reading) document.getElementById(slug)?.scrollIntoView({ block: 'start' });
            else editor.current?.scrollToLine(line);
          }}
        />
      )}

      <StatusBar status={snap.status} loaded={snap.loaded} device={ws.device} onSync={() => void ws.syncNow()}>
        <LiveIndicator info={live} />
        <ConflictBadge store={conflicts} onOpen={() => setDrawer({ kind: 'review', focus: null })} />
      </StatusBar>

      {drawer?.kind === 'review' && (
        <ReviewDrawer store={conflicts} online={snap.status.online} focusId={drawer.focus} onOpenNote={(p) => open(p)} onClose={() => setDrawer(null)} />
      )}
      {drawer?.kind === 'history' && exists && path && (
        <HistoryDrawer
          ws={ws}
          path={path}
          onRestore={(t) => {
            // Restore is an ordinary edit: through the editor (and its live room) when open.
            if (editor.current && editor.current.path === path) editor.current.replaceText(t);
            else ws.write(path, t);
            ws.syncSoon(300);
          }}
          onClose={() => setDrawer(null)}
        />
      )}
      {dialog?.kind === 'switcher' && <QuickSwitcher paths={snap.paths} recent={recent} onOpen={(p) => open(p)} onCreate={(p) => createAndOpen(p)} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'palette' && <CommandPalette commands={commands} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'settings' && <SettingsDialog settings={ws.settings} pending={snap.status.pending} onSave={saveAndReload} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'new-folder' && (
        <PromptDialog
          title="New folder"
          label="Folder name (use / for nested folders)"
          confirm="Create"
          validate={(v) => (toFolderPath(v) ? null : 'Enter a folder name without dots at the start.')}
          onSubmit={(v) => newNote(toFolderPath(v)!)}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === 'confirm-delete' && (
        <ConfirmDialog
          title="Delete note"
          message={
            <p>
              Delete <strong>{titleOf(dialog.path)}</strong>? It is removed from every device after the next sync.
            </p>
          }
          confirm="Delete"
          danger
          onConfirm={() => {
            void ws.remove(dialog.path);
            if (dialog.path === path) clearRoute();
          }}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}

function EmptyState(props: { loaded: boolean; missing: string | null; onNew: () => void; onCreate: (p: string) => void; onSwitcher: () => void; onDaily: () => void }) {
  if (!props.loaded) return <div className="empty-state" />;
  if (props.missing) {
    return (
      <div className="empty-state">
        <h2>{titleOf(props.missing)}</h2>
        <p className="muted">This note does not exist (it may have been deleted or renamed).</p>
        <div className="empty-actions">
          <button type="button" className="primary" onClick={() => props.onCreate(props.missing!)}>
            Create it
          </button>
          <button type="button" onClick={props.onSwitcher}>
            Go to file
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="empty-state">
      <h2>No file is open</h2>
      <div className="empty-actions column">
        <button type="button" className="link-button" onClick={props.onNew}>
          Create new note <kbd>{formatHotkey('Mod+N')}</kbd>
        </button>
        <button type="button" className="link-button" onClick={props.onSwitcher}>
          Go to file <kbd>{formatHotkey('Mod+O')}</kbd>
        </button>
        <button type="button" className="link-button" onClick={props.onDaily}>
          Open today's daily note
        </button>
      </div>
    </div>
  );
}
