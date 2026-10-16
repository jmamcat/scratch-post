export type Dialog =
  | { kind: 'switcher' }
  | { kind: 'palette' }
  | { kind: 'settings' }
  | { kind: 'confirm-delete'; path: string }
  | { kind: 'new-folder' };

export type DrawerState = { kind: 'review'; focus: string | null } | { kind: 'history' } | { kind: 'vault-history' } | null;
