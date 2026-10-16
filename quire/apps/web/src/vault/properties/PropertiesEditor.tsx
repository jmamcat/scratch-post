import { type PropertyValue, setProperty, splitFrontmatter } from '@quire/vault';
import { type KeyboardEvent, useEffect, useState } from 'react';
import './properties.css';

/** The input a front matter value is edited with (R-VLT-07). */
type Kind = 'text' | 'number' | 'checkbox' | 'date' | 'list' | 'readonly';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const NUMBER = /^-?\d+(\.\d+)?$/;

function kindOf(v: unknown): Kind {
  if (typeof v === 'boolean') return 'checkbox';
  if (typeof v === 'number') return 'number';
  if (Array.isArray(v)) return v.every((x) => typeof x === 'string') ? 'list' : 'readonly';
  if (v !== null && typeof v === 'object') return 'readonly';
  if (typeof v === 'string' && DATE.test(v)) return 'date';
  return 'text';
}

/** The text an input shows for a value. */
function shownOf(kind: Kind, v: unknown): string {
  if (kind === 'list') return (v as unknown[]).map(String).join(', ');
  if (kind === 'readonly') return JSON.stringify(v);
  return v === null || v === undefined ? '' : String(v);
}

/** The value a draft writes, or undefined when the draft is not a usable value. */
function valueOf(kind: Kind, draft: string): PropertyValue | undefined {
  if (kind === 'number') {
    const n = Number(draft);
    return draft.trim() === '' || !Number.isFinite(n) ? undefined : n;
  }
  if (kind === 'list') return draft.split(',').map((s) => s.trim()).filter((s) => s !== '');
  return draft;
}

/** Typed value for a new property: true/false and plain numbers keep their type, everything else is text. */
function inferValue(text: string): PropertyValue {
  const t = text.trim();
  if (t === 'true' || t === 'false') return t === 'true';
  if (NUMBER.test(t)) return Number(t);
  return t;
}

interface RowProps {
  name: string;
  value: unknown;
  onCommit: (v: PropertyValue) => void;
  onRemove: () => void;
}

function Row({ name, value, onCommit, onRemove }: RowProps) {
  const kind = kindOf(value);
  const shown = shownOf(kind, value);
  const [draft, setDraft] = useState(shown);
  // Follow the note: after a commit (or an edit elsewhere) the draft shows the stored value.
  useEffect(() => {
    setDraft(shown);
  }, [shown]);

  const commit = () => {
    if (draft === shown) return;
    const next = valueOf(kind, draft);
    if (next === undefined) {
      setDraft(shown);
      return;
    }
    onCommit(next);
  };

  let control;
  if (kind === 'checkbox') {
    control = <input type="checkbox" aria-label={name} checked={value === true} onChange={(e) => onCommit(e.target.checked)} />;
  } else if (kind === 'readonly') {
    control = <span className="props-readonly" title="Edit this value in the note">{shown}</span>;
  } else {
    const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        commit();
      }
    };
    control = (
      <input
        type={kind === 'number' ? 'number' : kind === 'date' ? 'date' : 'text'}
        aria-label={name}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={onKey}
      />
    );
  }

  return (
    <div className="prop-row" data-property={name}>
      <dt>{name}</dt>
      <dd>
        {control}
        <button type="button" className="prop-remove" aria-label={`Remove ${name}`} title={`Remove ${name}`} onClick={onRemove}>
          ×
        </button>
      </dd>
    </div>
  );
}

/**
 * The properties of the open note, edited in place (R-VLT-07). Every change is written back
 * through `onChange` as the whole new note text; the body is never touched.
 */
export function PropertiesEditor(props: { text: string; onChange: (text: string) => void }) {
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [value, setValue] = useState('');

  const fm = splitFrontmatter(props.text);
  if (fm.raw !== null && fm.data === null) return <p className="muted">Front matter is not a YAML map.</p>;

  /** Writes one key; returns false (and shows why) when the note cannot take the change. */
  const write = (key: string, v: PropertyValue): boolean => {
    try {
      props.onChange(setProperty(props.text, key, v));
      setError(null);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    }
  };

  const submit = () => {
    const key = name.trim();
    if (key === '') return;
    if (write(key, inferValue(value))) {
      setName('');
      setValue('');
      setAdding(false);
    }
  };

  const rows = Object.entries(fm.data ?? {});
  const onAddKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="props-edit">
      {error && (
        <p role="alert" className="props-error">
          {error}
        </p>
      )}
      {rows.length === 0 && <p className="muted">No properties.</p>}
      {rows.length > 0 && (
        <dl className="props">
          {rows.map(([k, v]) => (
            <Row key={k} name={k} value={v} onCommit={(nv) => write(k, nv)} onRemove={() => write(k, null)} />
          ))}
        </dl>
      )}
      {adding ? (
        <div className="prop-add">
          <input aria-label="Property name" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={onAddKey} autoFocus />
          <input aria-label="Property value" placeholder="Value" value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={onAddKey} />
          <div className="prop-add-actions">
            <button type="button" onClick={submit} disabled={name.trim() === ''}>
              Add
            </button>
            <button type="button" onClick={() => setAdding(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="prop-add-toggle" onClick={() => setAdding(true)}>
          Add property
        </button>
      )}
    </div>
  );
}
