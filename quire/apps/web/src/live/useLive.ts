import { useEffect, useState } from 'react';
import type { EditorHandle } from '../components/Editor.tsx';
import type { Workspace } from '../store/workspace.ts';
import { type LiveInfo, LiveSession } from './live.ts';

const OFF: LiveInfo = { state: 'off', peers: [] };

/** Runs a live session for the note open in the editor. */
export function useLive(ws: Workspace, editor: EditorHandle | null): LiveInfo {
  const [info, setInfo] = useState<LiveInfo>(OFF);
  const view = editor?.view ?? null;
  const path = editor?.path ?? null;
  useEffect(() => {
    if (!view || !path) return;
    const session = new LiveSession(ws, view, path, setInfo);
    session.start();
    return () => {
      session.stop();
      setInfo(OFF);
    };
  }, [ws, view, path]);
  return info;
}
