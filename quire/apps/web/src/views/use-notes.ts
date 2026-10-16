import type { NoteInfo } from '@quire/views';
import { useMemo } from 'react';
import type { Workspace } from '../sync/index.ts';

/** The vault's notes as grouping input, recomputed when the vault changes (`version`). */
export function useNotes(ws: Workspace, version: number): NoteInfo[] {
  // biome-ignore lint/correctness/useExhaustiveDependencies: `version` is the change signal
  return useMemo(() => [...ws.notes()], [ws, version]);
}
