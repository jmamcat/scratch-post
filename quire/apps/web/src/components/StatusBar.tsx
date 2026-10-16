import { type ReactNode, useEffect, useState } from 'react';
import type { WorkspaceStatus } from '../store/workspace.ts';

export function syncLabel(s: WorkspaceStatus, loaded: boolean): string {
  if (!loaded) return 'Loading';
  if (s.sync === 'syncing') return 'Syncing';
  if (s.sync === 'offline' || !s.online) return s.pending ? `Offline · ${s.pending} pending` : 'Offline';
  if (s.sync === 'error') return 'Sync error';
  if (s.pending) return `${s.pending} pending`;
  return 'Synced';
}

/** Bottom bar: sync state (Synced / Syncing / Offline / N pending) and slots for badges. */
export function StatusBar(props: { status: WorkspaceStatus; loaded: boolean; device: string; onSync: () => void; children?: ReactNode }) {
  const { status, loaded } = props;
  // Short syncs would make the label flicker on every keystroke; show "Syncing" only if it lasts.
  const [showSyncing, setShowSyncing] = useState(false);
  useEffect(() => {
    if (status.sync !== 'syncing') {
      setShowSyncing(false);
      return;
    }
    const t = setTimeout(() => setShowSyncing(true), 400);
    return () => clearTimeout(t);
  }, [status.sync]);

  const shown: WorkspaceStatus = status.sync === 'syncing' && !showSyncing ? { ...status, sync: status.error ? 'error' : 'idle' } : status;
  const label = syncLabel(shown, loaded);
  const tone = shown.sync === 'error' ? 'error' : shown.sync === 'offline' || !shown.online ? 'offline' : shown.pending || shown.sync === 'syncing' ? 'busy' : 'ok';
  const last = status.lastSyncAt ? `Last synced ${new Date(status.lastSyncAt).toLocaleTimeString()}` : 'Not synced yet';
  return (
    <footer className="status-bar">
      <span className="status-device" title="This device">
        {props.device}
      </span>
      <span className="spacer" />
      {props.children}
      <button
        type="button"
        className={`sync-state ${tone}`}
        onClick={props.onSync}
        title={`${status.error ? `${status.error}. ` : ''}${last}. Click to sync now.`}
        aria-label={`Sync status: ${label}. Sync now`}
      >
        <span className="sync-dot" aria-hidden="true" />
        <span role="status" aria-live="polite">
          {label}
        </span>
      </button>
    </footer>
  );
}
