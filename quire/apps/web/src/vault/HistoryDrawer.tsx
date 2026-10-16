import { titleOf } from '@quire/vault';
import type { DocMeta } from '@quire/sync';
import { useCallback, useEffect, useState } from 'react';
import { Reader } from '../render/index.ts';
import { Drawer, formatTime } from '../shared/Drawer.tsx';
import type { Workspace } from '../sync/index.ts';

interface Props {
  ws: Workspace;
  path: string;
  /** Restores text as an edit of the open note (through the live room when there is one). */
  onRestore: (text: string) => void;
  onClose: () => void;
}

/** Version history (R-VLT-06): revisions newest first, preview in reading view, restore. */
export function HistoryDrawer({ ws, path, onRestore, onClose }: Props) {
  const [revs, setRevs] = useState<DocMeta[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [preview, setPreview] = useState<{ rev: number; text: string | null } | null>(null);
  const [restored, setRestored] = useState<number | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const list = await ws.transport.history(path);
      setRevs(list);
      setSelected((s) => s ?? list[0]?.rev ?? null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setRevs([]);
      setError(/no document|not found|404/i.test(msg) ? 'This note has no saved versions yet. It appears here after its first sync.' : `Version history needs the server: ${msg}`);
    }
  }, [ws, path]);

  useEffect(() => {
    setRevs(null);
    setSelected(null);
    setPreview(null);
    setRestored(null);
    void load();
  }, [load]);

  // Refresh when this note gets a new revision.
  useEffect(
    () =>
      ws.onServerEvent((e) => {
        if (e.type === 'commit' && e.path === path) void load();
      }),
    [ws, path, load],
  );

  useEffect(() => {
    if (selected === null) return;
    let cancelled = false;
    ws.transport.doc(path, selected).then(
      (d) => !cancelled && setPreview({ rev: selected, text: d.text }),
      (e: unknown) => !cancelled && setError(`Could not load revision ${selected}: ${e instanceof Error ? e.message : String(e)}`),
    );
    return () => {
      cancelled = true;
    };
  }, [ws, path, selected]);

  const head = revs?.[0]?.rev;
  const resolve = useCallback((t: string) => ws.links.resolve(t, path), [ws, path]);

  return (
    <Drawer label="Version history" title={`Version history: ${titleOf(path)}`} onClose={onClose} wide>
      {error && <p className="notice error">{error}</p>}
      {revs === null && <p className="muted">Loading...</p>}
      {revs && revs.length > 0 && (
        <div className="history">
          <ul className="history-list" role="listbox" aria-label="Revisions">
            {revs.map((r) => (
              <li
                key={r.rev}
                role="option"
                aria-selected={r.rev === selected}
                tabIndex={0}
                className={r.rev === selected ? 'selected' : ''}
                onClick={() => setSelected(r.rev)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelected(r.rev);
                  }
                }}
              >
                <span className="rev-time">{formatTime(r.createdAt)}</span>
                <span className="rev-meta">
                  {r.device}
                  {r.deleted ? ' · deleted' : ''}
                  {r.rev === head ? ' · current' : ''}
                </span>
              </li>
            ))}
          </ul>
          <div className="history-preview">
            {preview && preview.rev === selected ? (
              <>
                <div className="history-actions">
                  <span className="muted small">Revision {preview.rev}</span>
                  <span className="spacer" />
                  {restored === preview.rev && (
                    <span className="small" role="status">
                      Restored as a new version.
                    </span>
                  )}
                  <button
                    type="button"
                    className="primary"
                    disabled={preview.text === null || preview.rev === head}
                    title={preview.rev === head ? 'This is the current version' : 'Make this text the current version'}
                    onClick={() => {
                      if (preview.text === null) return;
                      onRestore(preview.text);
                      setRestored(preview.rev);
                    }}
                  >
                    Restore
                  </button>
                </div>
                {preview.text === null ? (
                  <p className="muted">The note was deleted in this revision.</p>
                ) : (
                  <Reader text={preview.text} resolve={resolve} onInternalLink={() => undefined} onTag={() => undefined} className="history-reader" label="Revision preview" />
                )}
              </>
            ) : (
              <p className="muted">Loading revision...</p>
            )}
          </div>
        </div>
      )}
    </Drawer>
  );
}
