import { type Dispatch, type RefObject, type SetStateAction, useEffect, useMemo, useRef } from 'react';
import { type Command, matchesHotkey } from '../navigate/index.ts';
import { GRAPH_HASH } from '../shared/router.ts';
import { SIDEBAR_VIEWS } from '../Sidebar.tsx';
import type { Workspace } from '../sync/index.ts';
import type { Attachments, EditorHandle } from '../vault/index.ts';
import type { Dialog, DrawerState } from './dialog-state.ts';
import type { LayoutState } from './layout-state.ts';

interface Inputs {
  ws: Workspace;
  path: string | null;
  exists: boolean;
  layout: LayoutState;
  dialog: Dialog | null;
  setDialog: Dispatch<SetStateAction<Dialog | null>>;
  setDrawer: Dispatch<SetStateAction<DrawerState>>;
  focusTitle: () => void;
  newNote: () => void;
  dailyNote: () => void;
  editor: RefObject<EditorHandle | null>;
  attachmentsRef: RefObject<Attachments | null>;
}

/** The command list (palette and hotkeys) and the global key handler that runs it. */
export function useCommands(i: Inputs): Command[] {
  const { ws, path, exists, dialog, setDialog, setDrawer } = i;
  const { reading, setReading, setLeftOpen, setLeftView, setRightOpen, setEditorMode } = i.layout;
  const { newNote, dailyNote, focusTitle } = i;

  const commands: Command[] = useMemo(
    () => [
      { id: 'switcher', name: 'Open quick switcher', hotkeys: ['Mod+O'], run: () => setDialog({ kind: 'switcher' }) },
      { id: 'palette', name: 'Open command palette', hotkeys: ['Mod+P'], run: () => setDialog({ kind: 'palette' }) },
      { id: 'new-note', name: 'New note', hotkeys: ['Mod+N', 'Alt+N'], run: () => newNote() },
      { id: 'new-folder', name: 'New folder', run: () => setDialog({ kind: 'new-folder' }) },
      { id: 'daily', name: "Open today's daily note", run: dailyNote },
      { id: 'reading', name: 'Toggle reading view', hotkeys: ['Mod+E'], run: () => setReading((r) => !r), enabled: () => exists },
      { id: 'rename', name: 'Rename note', run: focusTitle, enabled: () => exists },
      { id: 'delete', name: 'Delete note', run: () => path && setDialog({ kind: 'confirm-delete', path }), enabled: () => exists },
      {
        id: 'search',
        name: 'Search all notes',
        hotkeys: ['Mod+Shift+F'],
        run: () => {
          setLeftOpen(true);
          setLeftView('search');
        },
      },
      { id: 'graph', name: 'Open graph view', hotkeys: ['Mod+G'], run: () => (location.hash = GRAPH_HASH) },
      { id: 'mode', name: 'Toggle Live Preview/Source mode', run: () => setEditorMode((m) => (m === 'live' ? 'source' : 'live')) },
      { id: 'theme', name: 'Change theme', run: () => setDialog({ kind: 'settings' }) },
      ...SIDEBAR_VIEWS.map((v) => ({ id: `view-${v.id}`, name: `Show ${v.label} in sidebar`, run: () => (setLeftOpen(true), setLeftView(v.id)) })),
      { id: 'sync', name: 'Sync now', run: () => void ws.syncNow() },
      { id: 'settings', name: 'Open settings', hotkeys: ['Mod+,'], run: () => setDialog({ kind: 'settings' }) },
      { id: 'left', name: 'Toggle left sidebar', run: () => setLeftOpen((v) => !v) },
      { id: 'right', name: 'Toggle right sidebar', run: () => setRightOpen((v) => !v) },
      { id: 'review', name: 'Open review inbox', run: () => setDrawer({ kind: 'review', focus: null }) },
      { id: 'history', name: 'Show version history', run: () => setDrawer({ kind: 'history' }), enabled: () => exists },
      { id: 'vault-history', name: 'Open vault history', run: () => setDrawer({ kind: 'vault-history' }) },
      {
        id: 'attach',
        name: 'Insert attachment',
        run: () => i.editor.current && i.attachmentsRef.current?.insert(i.editor.current.view, () => i.editor.current?.path ?? ''),
        enabled: () => exists && !reading,
      },
    ],
    [ws, newNote, dailyNote, focusTitle, exists, path, reading, setReading, setLeftOpen, setLeftView, setRightOpen, setEditorMode, setDialog, setDrawer],
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

  return commands;
}
