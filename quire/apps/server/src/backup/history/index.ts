import type { Hono } from 'hono';
import type { Config } from '../../platforms/index.ts';
import type { Background, BackupDeps } from '../deps.ts';

/**
 * Change sets, whole-vault restore and compaction (R-BAK-02..04). Contract fixed by 0003/P00;
 * P02 implements it.
 *
 * - `GET /api/changesets?limit=` -> `ChangeSet[]` newest first (`@quire/sync` type).
 * - `POST /api/changesets/:id/restore` with `{ device }` -> `{ changeset: ChangeSet }`, the new
 *   change set the restore wrote.
 */
export function historyRoutes(_app: Hono, _deps: BackupDeps): void {}

/** Assigns every commit to a change set (registers an afterWrite hook) and runs daily compaction. */
export function startHistory(_deps: BackupDeps): Background {
  return { stop: async () => undefined };
}

/** `quire compact`; returns the exit code. */
export async function compactCli(_args: string[], _config: Config): Promise<number> {
  console.error('quire compact: not implemented yet (0003/P02)');
  return 2;
}
