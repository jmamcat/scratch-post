import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Modal } from './Modal.tsx';

export interface PickerItem {
  key: string;
  label: ReactNode;
  detail?: ReactNode;
  aside?: ReactNode;
}

interface Props {
  label: string;
  placeholder: string;
  query: string;
  onQuery: (q: string) => void;
  items: PickerItem[];
  empty: ReactNode;
  footer?: ReactNode;
  onPick: (index: number, e: { shiftKey: boolean }) => void;
  /** Enter with no items (or Shift+Enter). */
  onSubmitQuery?: (q: string) => void;
  onClose: () => void;
}

/** Keyboard-first list in a dialog, shared by the quick switcher and the command palette. */
export function Picker(props: Props) {
  const [sel, setSel] = useState(0);
  const list = useRef<HTMLUListElement>(null);
  useEffect(() => setSel(0), [props.query]);
  useEffect(() => {
    list.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [sel]);

  const n = props.items.length;
  return (
    <Modal label={props.label} onClose={props.onClose} className="picker">
      <input
        className="picker-input"
        aria-label={props.label}
        role="combobox"
        aria-expanded="true"
        aria-controls="picker-list"
        aria-activedescendant={n ? `picker-${sel}` : undefined}
        placeholder={props.placeholder}
        value={props.query}
        autoComplete="off"
        spellCheck={false}
        onChange={(e) => props.onQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || (e.ctrlKey && e.key === 'n')) {
            e.preventDefault();
            setSel((s) => (n ? (s + 1) % n : 0));
          } else if (e.key === 'ArrowUp' || (e.ctrlKey && e.key === 'p')) {
            e.preventDefault();
            setSel((s) => (n ? (s - 1 + n) % n : 0));
          } else if (e.key === 'Enter') {
            e.preventDefault();
            if ((e.shiftKey || n === 0) && props.onSubmitQuery) props.onSubmitQuery(props.query);
            else if (n) props.onPick(Math.min(sel, n - 1), { shiftKey: e.shiftKey });
          }
        }}
      />
      <ul className="picker-list" id="picker-list" role="listbox" aria-label={props.label} ref={list}>
        {props.items.map((it, i) => (
          <li
            key={it.key}
            id={`picker-${i}`}
            role="option"
            aria-selected={i === sel}
            className={i === sel ? 'selected' : ''}
            onMouseMove={() => setSel(i)}
            onClick={(e) => props.onPick(i, { shiftKey: e.shiftKey })}
          >
            <span className="picker-main">
              <span className="picker-label">{it.label}</span>
              {it.detail && <span className="picker-detail">{it.detail}</span>}
            </span>
            {it.aside && <span className="picker-aside">{it.aside}</span>}
          </li>
        ))}
        {n === 0 && <li className="picker-empty">{props.empty}</li>}
      </ul>
      {props.footer && <div className="picker-footer">{props.footer}</div>}
    </Modal>
  );
}

/** Wraps matched characters in <mark>. */
export function Highlight({ text, indices }: { text: string; indices: number[] }) {
  if (indices.length === 0) return <>{text}</>;
  const set = new Set(indices);
  const out: ReactNode[] = [];
  let run = '';
  let marked = false;
  const push = (k: number) => {
    if (!run) return;
    out.push(marked ? <mark key={k}>{run}</mark> : run);
    run = '';
  };
  for (let i = 0; i < text.length; i++) {
    const m = set.has(i);
    if (m !== marked) {
      push(i);
      marked = m;
    }
    run += text[i];
  }
  push(text.length);
  return <>{out}</>;
}
