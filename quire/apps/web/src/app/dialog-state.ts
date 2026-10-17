export type Dialog =
  | { kind: 'switcher' }
  | { kind: 'palette' }
  | { kind: 'settings' }
  | { kind: 'confirm-delete'; path: string }
  | { kind: 'new-folder' }
  /** Pick a template to insert at the cursor or to start a new note from (R-VLT-13, R-VLT-14). */
  | { kind: 'template'; mode: 'insert' | 'new' };

export type DrawerState = { kind: 'review'; focus: string | null } | { kind: 'history' } | { kind: 'vault-history' } | null;
