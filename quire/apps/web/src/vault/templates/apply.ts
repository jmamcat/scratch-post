import { insertTemplate, titleOf } from '@quire/vault';
import type { Workspace } from '../../sync/index.ts';
import { notify } from '../attachments/alerts.ts';
import type { EditorHandle } from '../Editor.tsx';
import { minimalChange } from '../editor-setup.ts';
import { untitledPath } from '../note-paths.ts';

/** Put a template into the open note at the cursor, as one undoable edit (R-VLT-13). */
export function insertTemplateInEditor(ws: Workspace, editor: EditorHandle, templatePath: string): void {
  const view = editor.view;
  const doc = view.state.doc.toString();
  try {
    const r = insertTemplate(doc, view.state.selection.main.head, ws.read(templatePath) ?? '', { title: titleOf(editor.path), now: new Date() });
    const change = minimalChange(doc, r.text);
    view.dispatch({ ...(change ? { changes: change } : {}), selection: { anchor: r.cursor }, userEvent: 'input', scrollIntoView: true });
  } catch (e) {
    notify(`The template could not be inserted: ${e instanceof Error ? e.message : String(e)}.`);
  }
  view.focus();
}

/** Create an untitled note at the vault root from a template; returns its path (R-VLT-14). */
export function newNoteFromTemplate(ws: Workspace, paths: readonly string[], templatePath: string): string {
  const path = untitledPath(paths);
  const { text } = insertTemplate('', 0, ws.read(templatePath) ?? '', { title: titleOf(path), now: new Date() });
  ws.create(path, text);
  return path;
}
