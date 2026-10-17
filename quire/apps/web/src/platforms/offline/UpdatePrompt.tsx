import { useSyncExternalStore } from 'react';
import { applyUpdate, onWaitingChange, waitingWorker } from './register.ts';
import './update-prompt.css';

/** "Reload to update" prompt; renders nothing until a new version is waiting. */
export function UpdatePrompt() {
  const waiting = useSyncExternalStore(onWaitingChange, waitingWorker);
  if (!waiting) return null;
  return (
    <div className="update-prompt" aria-label="Update available">
      <span>A new version of Quire is ready.</span>
      <button type="button" onClick={applyUpdate}>
        Reload to update
      </button>
    </div>
  );
}
