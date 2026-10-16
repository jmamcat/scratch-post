import type { DocMeta } from '@quire/sync';
import { useEffect, useState } from 'react';
import type { Workspace } from './workspace.ts';

export type HeadMeta = Map<string, { rev: number; device: string; at: string }>;

const KEY = 'quire.headMeta';

function cached(): HeadMeta {
  try {
    return new Map(JSON.parse(localStorage.getItem(KEY) ?? '[]') as [string, { rev: number; device: string; at: string }][]);
  } catch {
    return new Map();
  }
}

/**
 * Latest revision time and device per note, from the server (R-VIEW-04, R-VLT-08). Refreshed
 * when the vault changes and cached per device, so the timeline and changes views still work
 * offline with the last known data.
 */
export function useHeadMeta(ws: Workspace, version: number): HeadMeta {
  const [meta, setMeta] = useState<HeadMeta>(cached);
  useEffect(() => {
    let stale = false;
    const t = setTimeout(() => {
      ws.transport
        .docs()
        .then((docs: DocMeta[]) => {
          if (stale) return;
          const next: HeadMeta = new Map(docs.map((d) => [d.path, { rev: d.rev, device: d.device, at: d.createdAt }]));
          setMeta(next);
          try {
            localStorage.setItem(KEY, JSON.stringify([...next]));
          } catch {
            // storage full or unavailable: keep the in-memory copy
          }
        })
        .catch(() => undefined);
    }, 300);
    return () => {
      stale = true;
      clearTimeout(t);
    };
  }, [ws, version]);
  return meta;
}
