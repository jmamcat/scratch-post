import { titleOf } from '@quire/vault';
import { type ChangeSet, HttpError } from '@quire/sync';
import { useCallback, useEffect, useState } from 'react';
import { Drawer } from '../shared/Drawer.tsx';
import { ConfirmDialog } from '../shared/Modal.tsx';
import type { Workspace } from '../sync/index.ts';
import './vault-history.css';

const NEEDS_SERVER = 'Vault history needs the server.';
const SHOWN_NOTES = 5;
const LIMIT = 50;

const clock = (d: Date) => d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
const dayTime = (d: Date) => d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

/** "Today 14:02-14:05" for today, else "12 Oct 2026, 14:02-14:05" (or both ends when it crosses midnight). */
function spanLabel(startedAt: string, endedAt: string, now = new Date()): string {
  const a = new Date(startedAt);
  const b = new Date(endedAt);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return startedAt;
  const range = (x: string, y: string) => (x === y ? x : `${x}–${y}`);
  if (a.toDateString() !== b.toDateString()) return `${dayTime(a)} – ${dayTime(b)}`;
  const time = range(clock(a), clock(b));
  return a.toDateString() === now.toDateString() ? `Today ${time}` : `${dayTime(a).replace(clock(a), time)}`;
}

function notesLine(paths: string[]): string {
  const titles = paths.map((p) => titleOf(p));
  if (titles.length <= SHOWN_NOTES) return titles.join(', ');
  return `${titles.slice(0, SHOWN_NOTES).join(', ')} and ${titles.length - SHOWN_NOTES} more`;
}

/**
 * Vault history drawer (R-BAK-07): change sets newest first, restore one after confirming.
 * Needs the server: offline, or when it refuses, the list is replaced by a message.
 */
export function VaultHistory({ ws, onClose }: { ws: Workspace; onClose: () => void }) {
  const [sets, setSets] = useState<ChangeSet[] | null>(null);
  const [offline, setOffline] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [target, setTarget] = useState<ChangeSet | null>(null);

  const load = useCallback(async () => {
    try {
      const list = await ws.transport.request<ChangeSet[]>('GET', `/api/changesets?limit=${LIMIT}`);
      setSets(list);
      setOffline(false);
    } catch {
      setOffline(true);
    }
  }, [ws]);

  useEffect(() => {
    void load();
  }, [load]);

  // Another device's commit (or our own restore) adds to the list.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const off = ws.onServerEvent((e) => {
      if (e.type !== 'commit') return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void load(), 500);
    });
    return () => {
      off();
      if (timer) clearTimeout(timer);
    };
  }, [ws, load]);

  const restore = async (cs: ChangeSet) => {
    setProblem(null);
    setDone(null);
    try {
      await ws.transport.request('POST', `/api/changesets/${cs.id}/restore`, { device: ws.device });
      await ws.syncNow();
      await load();
      setDone('The vault was restored. You can undo this from the list below.');
    } catch (e) {
      if (e instanceof HttpError) setProblem(e.message);
      else setOffline(true);
    }
  };

  return (
    <Drawer label="Vault history" title="Vault history" onClose={onClose}>
      {offline ? (
        <p className="notice error" role="alert">
          {NEEDS_SERVER}
        </p>
      ) : sets === null ? (
        <p className="muted">Loading...</p>
      ) : (
        <>
          {problem && (
            <p className="notice error" role="alert">
              {problem}
            </p>
          )}
          {done && (
            <p className="notice ok" role="status">
              {done}
            </p>
          )}
          {sets.length === 0 ? (
            <p className="muted">Nothing has been saved to the server yet.</p>
          ) : (
            <ul className="vault-history" aria-label="Vault history">
              {sets.map((cs) => (
                <li key={cs.id} className="vault-history-item" data-changeset={cs.id}>
                  <div className="vault-history-when">{spanLabel(cs.startedAt, cs.endedAt)}</div>
                  <div className="vault-history-meta">{cs.device}</div>
                  <div className="vault-history-notes">{notesLine(cs.paths)}</div>
                  <button type="button" onClick={() => setTarget(cs)}>
                    Restore vault to here
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      {target && (
        <ConfirmDialog
          title="Restore vault"
          message={
            <>
              <p>Restore the whole vault to how it was at {spanLabel(target.endedAt, target.endedAt)}?</p>
              <p>Every note returns to how it was then. You can undo this from the vault history.</p>
            </>
          }
          confirm="Restore vault"
          danger
          onConfirm={() => void restore(target)}
          onClose={() => setTarget(null)}
        />
      )}
    </Drawer>
  );
}
