import { type ReactNode, useEffect, useRef } from 'react';
import { trapTab } from './focus-trap.ts';

/** Centered dialog with a backdrop. Escape and a backdrop click close it. */
export function Modal(props: { label: string; onClose: () => void; children: ReactNode; className?: string; role?: 'dialog' | 'alertdialog' }) {
  const panel = useRef<HTMLDivElement>(null);
  const restore = useRef<Element | null>(null);

  useEffect(() => {
    restore.current = document.activeElement;
    const first = panel.current?.querySelector<HTMLElement>('[data-autofocus], input, textarea, button');
    first?.focus();
    return () => {
      if (restore.current instanceof HTMLElement) restore.current.focus();
    };
  }, []);

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) props.onClose();
      }}
    >
      <div
        ref={panel}
        role={props.role ?? 'dialog'}
        aria-modal="true"
        aria-label={props.label}
        className={`modal ${props.className ?? ''}`}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation();
            props.onClose();
          }
          trapTab(e, panel.current);
        }}
      >
        {props.children}
      </div>
    </div>
  );
}

export function ConfirmDialog(props: { title: string; message: ReactNode; confirm: string; danger?: boolean; onConfirm: () => void; onClose: () => void }) {
  return (
    <Modal label={props.title} onClose={props.onClose} role="alertdialog" className="confirm">
      <h2>{props.title}</h2>
      <div className="confirm-message">{props.message}</div>
      <div className="dialog-actions">
        <button type="button" onClick={props.onClose}>
          Cancel
        </button>
        <button
          type="button"
          data-autofocus
          className={props.danger ? 'danger' : 'primary'}
          onClick={() => {
            props.onConfirm();
            props.onClose();
          }}
        >
          {props.confirm}
        </button>
      </div>
    </Modal>
  );
}

export function PromptDialog(props: {
  title: string;
  label: string;
  initial?: string;
  confirm: string;
  validate?: (v: string) => string | null;
  onSubmit: (v: string) => void;
  onClose: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const error = useRef<HTMLParagraphElement>(null);
  const submit = () => {
    const v = input.current?.value ?? '';
    const problem = props.validate?.(v) ?? null;
    if (problem) {
      if (error.current) error.current.textContent = problem;
      return;
    }
    props.onSubmit(v);
    props.onClose();
  };
  return (
    <Modal label={props.title} onClose={props.onClose} className="confirm">
      <h2>{props.title}</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label className="field">
          <span>{props.label}</span>
          <input ref={input} defaultValue={props.initial ?? ''} autoComplete="off" spellCheck={false} />
        </label>
        <p ref={error} className="field-error" role="alert" />
        <div className="dialog-actions">
          <button type="button" onClick={props.onClose}>
            Cancel
          </button>
          <button type="submit" className="primary">
            {props.confirm}
          </button>
        </div>
      </form>
    </Modal>
  );
}
