import './group-list.css';
import { titleOf } from '@quire/vault';
import type { ReactNode } from 'react';

export interface ListGroup {
  label: string;
  items: { path: string; detail?: ReactNode; extra?: ReactNode }[];
}

/**
 * The one way sidebar views show grouped notes, so every view reads the same for people and
 * for scenarios: `[data-group="<label>"]` holds `[data-item="<title>"]` buttons.
 */
export function GroupList(props: { groups: ListGroup[]; active: string | null; onOpen: (path: string) => void; empty?: string; label: string }) {
  if (props.groups.length === 0) return <p className="muted view-empty">{props.empty ?? 'Nothing here yet.'}</p>;
  return (
    <div className="group-list" aria-label={props.label}>
      {props.groups.map((g) => (
        <section key={g.label} className="view-group" data-group={g.label} aria-label={g.label}>
          <h3 className="view-group-title">
            {g.label} <span className="muted">{g.items.length}</span>
          </h3>
          <ul>
            {g.items.map((it) => (
              <li key={it.path} className={it.path === props.active ? 'active' : ''}>
                <button type="button" className="view-item" data-item={titleOf(it.path)} data-path={it.path} title={it.path} onClick={() => props.onOpen(it.path)}>
                  <span className="view-item-title">{titleOf(it.path)}</span>
                  {it.detail && <span className="view-item-detail muted">{it.detail}</span>}
                </button>
                {it.extra}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
