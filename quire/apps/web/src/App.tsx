import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { AppDialogs } from './app/AppDialogs.tsx';
import { EmptyState } from './app/EmptyState.tsx';
import { LazyGraphView, LazyLiveStatus, LazyNoteView, LazyRightPane } from './app/lazy-views.tsx';
import { ViewHeader } from './app/ViewHeader.tsx';
import type { Dialog, DrawerState } from './app/dialog-state.ts';
import { useLayoutState, useNarrow } from './app/layout-state.ts';
import { useCommands } from './app/use-commands.ts';
import { useNavigation } from './app/use-navigation.ts';
import { ConflictBadge, ConflictStore } from './review/index.ts';
import type { Attachments, EditorHandle } from './vault/index.ts';
import { Sidebar } from './Sidebar.tsx';
import { useRoute } from './shared/router.ts';
import { StatusBar, type Workspace } from './sync/index.ts';

export function App({ ws }: { ws: Workspace }) {
  const snap = useSyncExternalStore(ws.subscribe, ws.getSnapshot);
  const route = useRoute();
  const path = route.kind === 'note' ? route.path : null;
  const text = path === null ? undefined : ws.read(path);
  const exists = text !== undefined;
  const layout = useLayoutState();
  const { reading, leftOpen, setLeftOpen, rightOpen, setRightOpen, leftView, setLeftView, editorMode, query, setQuery, rightTab, setRightTab, recent } = layout;

  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [drawer, setDrawer] = useState<DrawerState>(null);
  const [titleFocus, setTitleFocus] = useState(0);
  const focusTitle = useRef(() => setTitleFocus((n) => n + 1)).current;
  const editor = useRef<EditorHandle | null>(null);
  const [handle, setHandle] = useState<EditorHandle | null>(null);

  const attachmentsRef = useRef<Attachments | null>(null);

  // Review inbox data (P08).
  const [conflicts] = useState(() => new ConflictStore(ws));
  useEffect(() => {
    conflicts.start();
    return () => conflicts.stop();
  }, [conflicts]);
  const conflictSnap = useSyncExternalStore(conflicts.subscribe, conflicts.getSnapshot);

  const nav = useNavigation({ ws, route, path, paths: snap.paths, layout, editor, focusTitle });
  const { open, createAndOpen, newNote, dailyNote } = nav;

  /** Every edit made outside the editor (restore, properties, board, task clicks) goes
   *  through the editor when the note is open, so a live room sees it too. */
  const editText = (p: string, t: string) => {
    if (editor.current && editor.current.path === p) editor.current.replaceText(t);
    else ws.write(p, t);
    ws.syncSoon(300);
  };

  // On narrow screens the left sidebar opens over the content: what it covers leaves the Tab
  // order (inert) and Escape closes it, as a click on the scrim does.
  const overlay = useNarrow() && leftOpen;
  useEffect(() => {
    if (!overlay || dialog || drawer) return;
    const onKey = (e: KeyboardEvent) => {
      // A field's own Escape (cancel an edit, clear a search) comes first.
      if (e.key !== 'Escape' || e.defaultPrevented || (e.target instanceof HTMLElement && e.target.matches('input, textarea, select'))) return;
      setLeftOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [overlay, dialog, drawer, setLeftOpen]);

  const commands = useCommands({ ws, path, exists, layout, dialog, setDialog, setDrawer, focusTitle, newNote, dailyNote, editor, attachmentsRef });
  const openReview = (focus: string | null) => setDrawer({ kind: 'review', focus });
  const openDeleteDialog = () => path && setDialog({ kind: 'confirm-delete', path });

  return (
    <div className={`app ${leftOpen ? 'left-open' : ''} ${rightOpen ? 'right-open' : ''}`}>
      <Sidebar
        ws={ws}
        paths={snap.paths}
        version={snap.version}
        active={exists ? path : null}
        view={leftView}
        onView={setLeftView}
        query={query}
        onQuery={setQuery}
        recent={recent}
        onOpen={(p) => open(p)}
        onNewNote={(f) => newNote(f)}
        onRename={(p) => {
          // Open the note, then put the cursor in its inline title (R-VLT-10).
          open(p);
          setTimeout(focusTitle, 0);
        }}
        onNewFolder={() => setDialog({ kind: 'new-folder' })}
        onDaily={dailyNote}
        onTag={nav.showTag}
        onEdit={editText}
        onSettings={() => setDialog({ kind: 'settings' })}
        onPalette={() => setDialog({ kind: 'palette' })}
      />
      {leftOpen && <div className="scrim" onClick={() => setLeftOpen(false)} aria-hidden="true" />}

      <main className="main" inert={overlay}>
        <ViewHeader
          path={exists ? path : null}
          {...(route.kind === 'graph' ? { title: 'Graph' } : {})}
          leftOpen={leftOpen}
          rightOpen={rightOpen}
          reading={reading}
          onToggleLeft={() => setLeftOpen((v) => !v)}
          onToggleRight={() => setRightOpen((v) => !v)}
          onToggleReading={() => layout.setReading((r) => !r)}
          onHistory={() => setDrawer({ kind: 'history' })}
          onDelete={openDeleteDialog}
        />

        {route.kind === 'graph' ? (
          <div className="view-content graph-content">
            <LazyGraphView ws={ws} version={snap.version} onOpen={(p) => open(p)} />
          </div>
        ) : exists && path ? (
          <LazyNoteView
            ws={ws}
            path={path}
            text={text}
            paths={snap.paths}
            reading={reading}
            mode={editorMode}
            titleFocus={titleFocus}
            conflict={conflictSnap.open.find((c) => c.path === path)}
            attachmentsRef={attachmentsRef}
            editor={editor}
            onHandle={(h) => {
              editor.current = h;
              setHandle(h);
            }}
            onReview={openReview}
            onRename={nav.rename}
            onOpen={open}
            onCreate={createAndOpen}
            onOpenLink={nav.openLink}
            onTag={nav.showTag}
            onEditText={editText}
          />
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
        <LazyRightPane
          ws={ws}
          version={snap.version}
          path={exists ? path : null}
          tab={rightTab}
          onTab={setRightTab}
          onOpen={(p) => open(p)}
          onOpenLink={nav.openLink}
          onTag={nav.showTag}
          onEditText={editText}
          onHeading={(line, slug) => {
            if (reading) document.getElementById(slug)?.scrollIntoView({ block: 'start' });
            else editor.current?.scrollToLine(line);
          }}
        />
      )}

      <StatusBar status={snap.status} loaded={snap.loaded} device={ws.device} inert={overlay} onSync={() => void ws.syncNow()}>
        <LazyLiveStatus ws={ws} editor={handle} />
        <ConflictBadge store={conflicts} onOpen={() => openReview(null)} />
      </StatusBar>

      <AppDialogs
        ws={ws}
        conflicts={conflicts}
        path={path}
        exists={exists}
        paths={snap.paths}
        online={snap.status.online}
        pending={snap.status.pending}
        recent={recent}
        commands={commands}
        dialog={dialog}
        drawer={drawer}
        setDialog={setDialog}
        setDrawer={setDrawer}
        onOpen={(p) => open(p)}
        onCreate={(p) => createAndOpen(p)}
        onNewNote={newNote}
        onEditText={editText}
      />
    </div>
  );
}
