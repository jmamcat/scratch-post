import { titleOf } from '@quire/vault';
import type { Dispatch, SetStateAction } from 'react';
import { CommandPalette, type Command, QuickSwitcher } from '../navigate/index.ts';
import { type Settings, UpdatePrompt, saveSettings } from '../platforms/index.ts';
import { type ConflictStore } from '../review/index.ts';
import { ConfirmDialog, PromptDialog } from '../shared/Modal.tsx';
import { clearRoute } from '../shared/router.ts';
import type { Workspace } from '../sync/index.ts';
import { TemplatePicker, toFolderPath } from '../vault/index.ts';
import type { Dialog, DrawerState } from './dialog-state.ts';
import { LazyHistoryDrawer, LazyReviewDrawer, LazySettingsDialog, LazyVaultHistory } from './lazy-views.tsx';

interface Props {
  ws: Workspace;
  conflicts: ConflictStore;
  /** The note in the route, and whether the workspace has it. */
  path: string | null;
  exists: boolean;
  paths: readonly string[];
  online: boolean;
  pending: number;
  recent: string[];
  commands: Command[];
  dialog: Dialog | null;
  drawer: DrawerState;
  setDialog: Dispatch<SetStateAction<Dialog | null>>;
  setDrawer: Dispatch<SetStateAction<DrawerState>>;
  onOpen: (path: string) => void;
  onCreate: (path: string) => void;
  onNewNote: (folder: string) => void;
  onEditText: (path: string, text: string) => void;
  onTemplate: (mode: 'insert' | 'new', templatePath: string) => void;
}

const saveAndReload = (ws: Workspace, s: Settings) => {
  saveSettings(s);
  void ws.flush().then(() => location.reload());
};

/** Drawers and modal dialogs. The heavier ones load on first use. */
export function AppDialogs(p: Props) {
  const { ws, path, dialog, drawer, setDialog, setDrawer } = p;
  const closeDialog = () => setDialog(null);
  const closeDrawer = () => setDrawer(null);
  return (
    <>
      {drawer?.kind === 'vault-history' && <LazyVaultHistory ws={ws} onClose={closeDrawer} />}
      <UpdatePrompt />
      {drawer?.kind === 'review' && (
        <LazyReviewDrawer store={p.conflicts} online={p.online} focusId={drawer.focus} onOpenNote={p.onOpen} onClose={closeDrawer} />
      )}
      {drawer?.kind === 'history' && p.exists && path && (
        <LazyHistoryDrawer ws={ws} path={path} onRestore={(t) => p.onEditText(path, t)} onClose={closeDrawer} />
      )}
      {dialog?.kind === 'switcher' && <QuickSwitcher paths={p.paths} recent={p.recent} onOpen={p.onOpen} onCreate={p.onCreate} onClose={closeDialog} />}
      {dialog?.kind === 'palette' && <CommandPalette commands={p.commands} onClose={closeDialog} />}
      {dialog?.kind === 'template' && (
        <TemplatePicker
          paths={p.paths}
          label={dialog.mode === 'insert' ? 'Insert template' : 'New note from template'}
          onPick={(t) => p.onTemplate(dialog.mode, t)}
          onClose={closeDialog}
        />
      )}
      {dialog?.kind === 'settings' && (
        <LazySettingsDialog settings={ws.settings} pending={p.pending} onSave={(s) => saveAndReload(ws, s)} onClose={closeDialog} />
      )}
      {dialog?.kind === 'new-folder' && (
        <PromptDialog
          title="New folder"
          label="Folder name (use / for nested folders)"
          confirm="Create"
          validate={(v) => (toFolderPath(v) ? null : 'Enter a folder name without dots at the start.')}
          onSubmit={(v) => p.onNewNote(toFolderPath(v)!)}
          onClose={closeDialog}
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
          onClose={closeDialog}
        />
      )}
    </>
  );
}
