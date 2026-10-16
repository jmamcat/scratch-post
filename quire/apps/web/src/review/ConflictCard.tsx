import { applyChoices, type Choice, type Hunk, type Segment, titleOf } from '@quire/core';
import type { Conflict } from '@quire/sync';
import { useMemo, useState } from 'react';
import { formatTime } from './Drawer.tsx';

interface Props {
  conflict: Conflict;
  focused: boolean;
  onOpenNote: (path: string) => void;
  onResolve: (c: Conflict, r: { choices?: Record<string, Choice>; keep?: 'note' | 'delete' }) => Promise<void>;
  onDismiss: (c: Conflict) => Promise<void>;
}

/** Hunks a person should look at: unresolved ones and auto-merges flagged for review. */
const needsEyes = (h: Hunk) => h.auto === null || h.kind === 'intraline' || h.kind === 'both-inserted';

const KIND_LABEL: Record<string, string> = {
  text: 'Both changed this',
  property: 'Property changed on both sides',
  intraline: 'Merged word by word',
  'both-inserted': 'Both added text here',
};

function choiceText(h: Hunk, c: Choice | undefined): string {
  if (c === undefined) return h.auto ?? h.current;
  if (c === 'current') return h.current;
  if (c === 'incoming') return h.incoming;
  if (c === 'both') return h.current + h.incoming;
  return c.text;
}

/** One review card (R-RVW-03, R-RVW-06, R-RVW-07). */
export function ConflictCard({ conflict: c, focused, onOpenNote, onResolve, onDismiss }: Props) {
  const [choices, setChoices] = useState<Record<string, Choice>>({});
  const [changing, setChanging] = useState(false);
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hunks = useMemo(() => c.segments.flatMap((s) => (s.type === 'hunk' && needsEyes(s.hunk) ? [s.hunk] : [])), [c.segments]);
  const unresolved = hunks.filter((h) => h.auto === null);
  const editable = c.status === 'open' || changing;
  const ready = unresolved.every((h) => choices[h.id] !== undefined);
  const curLabel = `${c.current.device} · ${formatTime(c.current.at)}`;
  const incLabel = `${c.incoming.device} · ${formatTime(c.incoming.at)}`;

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };

  const setAll = (side: 'current' | 'incoming') => setChoices(Object.fromEntries(hunks.map((h) => [h.id, side])));

  return (
    <article
      id={`conflict-${c.id}`}
      className={`review-card ${focused ? 'focused' : ''}`}
      data-testid="review-card"
      aria-label={`${c.status === 'open' ? 'Conflict' : 'Review'}: ${c.path}`}
    >
      <header className="card-header">
        <button type="button" className="card-path" onClick={() => onOpenNote(c.path)} title={`Open ${c.path}`}>
          {titleOf(c.path)}
        </button>
        <span className="card-folder">{c.path.includes('/') ? c.path.slice(0, c.path.lastIndexOf('/')) : ''}</span>
      </header>

      <div className="sides">
        <span className="side current">
          <span className="side-name">Current</span> {curLabel}
        </span>
        <span className="vs">vs</span>
        <span className="side incoming">
          <span className="side-name">Incoming</span> {incLabel}
        </span>
      </div>

      {c.kind === 'delete-edit' ? (
        <>
          <p className="card-note">
            {c.incoming.deleted
              ? `${c.incoming.device} deleted this note while ${c.current.device} edited it. The edited note was kept.`
              : `${c.current.device} deleted this note while ${c.incoming.device} edited it. The edited note was kept.`}
          </p>
          <div className="card-actions">
            <button type="button" className="primary" disabled={busy} onClick={() => run(() => onResolve(c, { keep: 'note' }))}>
              Keep note
            </button>
            <button type="button" className="danger" disabled={busy} onClick={() => run(() => onResolve(c, { keep: 'delete' }))}>
              Delete note
            </button>
          </div>
        </>
      ) : (
        <>
          {c.status === 'review' && !changing && <p className="card-note">Merged automatically. Check that the result reads right.</p>}
          <div className="segments">
            {c.segments.map((seg, i) => (
              <SegmentView
                key={i}
                seg={seg}
                first={i === 0}
                last={i === c.segments.length - 1}
                index={hunks.findIndex((h) => seg.type === 'hunk' && h.id === seg.hunk.id)}
                choice={seg.type === 'hunk' ? choices[seg.hunk.id] : undefined}
                editable={editable}
                curLabel={curLabel}
                incLabel={incLabel}
                onChoose={(id, ch) =>
                  setChoices((prev) => {
                    const next = { ...prev };
                    if (ch === undefined) delete next[id];
                    else next[id] = ch;
                    return next;
                  })
                }
              />
            ))}
          </div>

          {preview && (
            <div className="preview">
              <div className="preview-label">Result</div>
              <pre>{applyChoices(c.segments, choices)}</pre>
            </div>
          )}

          <div className="card-actions">
            {editable ? (
              <>
                <button type="button" onClick={() => setAll('current')}>
                  Keep all current
                </button>
                <button type="button" onClick={() => setAll('incoming')}>
                  Keep all incoming
                </button>
                <button type="button" className="ghost" onClick={() => setPreview((p) => !p)} aria-pressed={preview}>
                  {preview ? 'Hide result' : 'Preview result'}
                </button>
                <span className="spacer" />
                {changing && (
                  <button type="button" onClick={() => setChanging(false)}>
                    Cancel
                  </button>
                )}
                <button
                  type="button"
                  className="primary"
                  disabled={busy || !ready}
                  title={ready ? 'Save the chosen text as a new version' : 'Choose a side for every change first'}
                  onClick={() => run(() => onResolve(c, { choices }))}
                >
                  Apply
                </button>
              </>
            ) : (
              <>
                <button type="button" className="ghost" onClick={() => setPreview((p) => !p)} aria-pressed={preview}>
                  {preview ? 'Hide result' : 'Preview result'}
                </button>
                <span className="spacer" />
                <button type="button" onClick={() => setChanging(true)} disabled={busy}>
                  Change
                </button>
                <button type="button" className="primary" disabled={busy} onClick={() => run(() => onDismiss(c))}>
                  Accept
                </button>
              </>
            )}
          </div>
        </>
      )}
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </article>
  );
}

function SegmentView(props: {
  seg: Segment;
  first: boolean;
  last: boolean;
  index: number;
  choice: Choice | undefined;
  editable: boolean;
  curLabel: string;
  incLabel: string;
  onChoose: (id: string, c: Choice | undefined) => void;
}) {
  const { seg } = props;
  if (seg.type === 'stable') return <Context text={seg.text} first={props.first} last={props.last} />;
  const h = seg.hunk;
  if (!needsEyes(h)) return <Context text={h.auto ?? h.current} first={props.first} last={props.last} />;
  return <HunkView {...props} hunk={h} />;
}

/** Unchanged text between hunks, collapsed to a few lines of context. */
function Context({ text, first, last }: { text: string; first: boolean; last: boolean }) {
  const [open, setOpen] = useState(false);
  const lines = text.replace(/\n$/, '').split('\n');
  if (text === '') return null;
  const keep = 2;
  if (open || lines.length <= keep * 2 + 1) return <pre className="context">{lines.join('\n')}</pre>;
  const head = first ? [] : lines.slice(0, keep);
  const tail = last ? [] : lines.slice(-keep);
  const hidden = lines.length - head.length - tail.length;
  return (
    <div className="context-wrap">
      {head.length > 0 && <pre className="context">{head.join('\n')}</pre>}
      <button type="button" className="context-toggle" onClick={() => setOpen(true)}>
        {hidden} unchanged {hidden === 1 ? 'line' : 'lines'}
      </button>
      {tail.length > 0 && <pre className="context">{tail.join('\n')}</pre>}
    </div>
  );
}

function HunkView(props: {
  hunk: Hunk;
  index: number;
  choice: Choice | undefined;
  editable: boolean;
  curLabel: string;
  incLabel: string;
  onChoose: (id: string, c: Choice | undefined) => void;
}) {
  const { hunk: h, choice } = props;
  const editing = typeof choice === 'object';
  const n = props.index + 1;
  const pick = (c: Choice) => props.onChoose(h.id, choice === c ? undefined : c);
  return (
    <section className={`hunk ${h.auto === null ? 'unresolved' : 'auto'} ${choice !== undefined ? 'chosen' : ''}`} data-testid="hunk" aria-label={`Change ${n}`}>
      <div className="hunk-title">
        <span>
          Change {n}
          {h.kind === 'property' && h.key ? `: ${h.key}` : ''}
        </span>
        <span className="hunk-kind">{KIND_LABEL[h.kind] ?? h.kind}</span>
      </div>
      <div className="hunk-sides">
        <div className={`hunk-side current ${choice === 'current' || choice === 'both' ? 'picked' : ''}`}>
          <div className="hunk-side-label">{props.curLabel}</div>
          <pre>{h.current === '' ? <span className="nothing">(nothing)</span> : h.current}</pre>
        </div>
        <div className={`hunk-side incoming ${choice === 'incoming' || choice === 'both' ? 'picked' : ''}`}>
          <div className="hunk-side-label">{props.incLabel}</div>
          <pre>{h.incoming === '' ? <span className="nothing">(nothing)</span> : h.incoming}</pre>
        </div>
      </div>
      {h.auto !== null && choice === undefined && (
        <div className="hunk-auto">
          <div className="hunk-side-label">Merged</div>
          <pre>{h.auto === '' ? <span className="nothing">(nothing)</span> : h.auto}</pre>
        </div>
      )}
      {editing && (
        <textarea
          className="hunk-edit"
          aria-label={`Edited text for change ${n}`}
          value={choice.text}
          rows={Math.min(12, Math.max(3, choice.text.split('\n').length + 1))}
          onChange={(e) => props.onChoose(h.id, { text: e.target.value })}
        />
      )}
      {props.editable && (
        <div className="hunk-actions" role="group" aria-label={`Choices for change ${n}`}>
          <button type="button" aria-pressed={choice === 'current'} onClick={() => pick('current')}>
            Keep current
          </button>
          <button type="button" aria-pressed={choice === 'incoming'} onClick={() => pick('incoming')}>
            Keep incoming
          </button>
          <button type="button" aria-pressed={choice === 'both'} onClick={() => pick('both')}>
            Keep both
          </button>
          <button type="button" aria-pressed={editing} onClick={() => props.onChoose(h.id, editing ? undefined : { text: choiceText(h, choice) })}>
            Edit
          </button>
        </div>
      )}
    </section>
  );
}
