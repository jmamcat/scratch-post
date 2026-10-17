import { type ChangeSet, type CommitExtra, DELETED_HASH, SyncError } from '@quire/sync';
import type { BackupDeps } from '../deps.ts';
import type { ChangeSets } from './changesets.ts';

interface StateRow {
  rev: number;
  path: string;
  hash: string;
  text: string | null;
  deleted: number;
  kind: string;
  blob: string | null;
  size: number | null;
}

/** What a path must become: its state at the end of the target set, or deleted. */
interface Step {
  path: string;
  old: StateRow | null;
  headIsFile: boolean;
}

/**
 * Whole-vault restore (R-BAK-03): every path whose state at the end of change set `id` differs
 * from its head gets a new revision by `device`, all in one change set that closes at once.
 */
export function restoreVault(deps: BackupDeps, sets: ChangeSets, id: number, device: string): Promise<ChangeSet> {
  return deps.sync.exclusive(() => {
    const target = sets.get(id);
    if (!target) throw new SyncError(404, `no change set ${id}`);
    // Live rooms commit pending typing first; those commits must not land inside the restore's set.
    for (const step of plan(deps, target.lastRev)) for (const fn of deps.hooks.beforeWrite) fn(step.path);
    sets.assignPending();
    sets.closeOpen();

    const steps = plan(deps, target.lastRev);
    if (!steps.length) throw new SyncError(409, `the vault already matches change set ${id}`);
    let first: number | null = null;
    for (const { path, old, headIsFile } of steps) {
      const live = old && old.deleted === 0 ? old : null;
      const isFile = live ? live.kind === 'file' : headIsFile;
      const extra: CommitExtra = isFile ? { kind: 'file', ...(live?.blob ? { blob: live.blob } : {}), ...(live?.size != null ? { size: live.size } : {}) } : {};
      const text = live && !isFile ? live.text : null;
      const meta = deps.store.commit(path, text, device, live ? live.hash : DELETED_HASH, extra);
      deps.committed(path, text, meta);
      first ??= meta.rev;
    }
    sets.assignPending();
    const set = sets.ofRevision(first!);
    if (!set) throw new Error(`restore revision ${first} has no change set`);
    sets.close(set.id);
    deps.log.info('vault restored', { to: id, device, changeset: set.id, paths: steps.length });
    return sets.get(set.id)!;
  });
}

function plan(deps: BackupDeps, lastRev: number): Step[] {
  const rows = deps.store.db
    .prepare(
      `SELECT r.rev, r.path, r.hash, r.text, r.deleted, r.kind, r.blob, r.size FROM revisions r
       JOIN (SELECT path, MAX(rev) AS rev FROM revisions WHERE rev <= ? GROUP BY path) t ON r.rev = t.rev`,
    )
    .all(lastRev) as unknown as StateRow[];
  const then = new Map(rows.map((r) => [r.path, r]));
  const steps: Step[] = [];
  // Every path that ever had a revision has a head, so heads cover every path to consider.
  for (const head of deps.store.heads()) {
    const old = then.get(head.path) ?? null;
    if (old?.rev === head.rev) continue;
    const oldLive = !!old && old.deleted === 0;
    if (!oldLive && head.deleted) continue;
    const same =
      oldLive && !head.deleted && old.hash === head.hash && old.kind === (head.kind ?? 'note') && (old.blob ?? undefined) === head.blob;
    if (!same) steps.push({ path: head.path, old, headIsFile: head.kind === 'file' });
  }
  return steps.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}
