import { type ReactNode, useEffect, useRef } from 'react';
import { trapTab } from './focus-trap.ts';
import { Icon } from './Icon.tsx';

/**
 * Side drawer over the right of the window, modal for the keyboard: Tab stays inside it.
 * Escape or the close button closes it.
 */
export function Drawer(props: { label: string; title: ReactNode; onClose: () => void; children: ReactNode; actions?: ReactNode; wide?: boolean }) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement;
    panel.current?.focus();
    return () => {
      if (prev instanceof HTMLElement && document.contains(prev)) prev.focus();
    };
  }, []);
  return (
    <div
      ref={panel}
      className={`drawer ${props.wide ? 'wide' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={props.label}
      tabIndex={-1}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          props.onClose();
        }
        trapTab(e, panel.current);
      }}
    >
      <header className="drawer-header">
        <h2>{props.title}</h2>
        <span className="spacer" />
        {props.actions}
        <button type="button" className="icon-button" aria-label={`Close ${props.label.toLowerCase()}`} title="Close" onClick={props.onClose}>
          <Icon name="close" />
        </button>
      </header>
      <div className="drawer-body">{props.children}</div>
    </div>
  );
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const sameDay = d.toDateString() === new Date().toDateString();
  return sameDay
    ? d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
