import { extractHeadings, extractTags } from '@quire/render';
import { splitFrontmatter, titleOf } from '@quire/vault';
import { useMemo } from 'react';
import type { Workspace } from '../sync/index.ts';

export type RightTab = 'backlinks' | 'outgoing' | 'outline' | 'properties';

const TABS: Array<{ id: RightTab; label: string }> = [
  { id: 'backlinks', label: 'Backlinks' },
  { id: 'outgoing', label: 'Outgoing' },
  { id: 'outline', label: 'Outline' },
  { id: 'properties', label: 'Properties' },
];

interface Props {
  ws: Workspace;
  version: number;
  path: string | null;
  tab: RightTab;
  onTab: (t: RightTab) => void;
  onOpen: (path: string) => void;
  onOpenLink: (target: string, from: string, heading?: string) => void;
  onHeading: (line: number, slug: string) => void;
  onTag: (tag: string) => void;
}

/** Right pane: backlinks, outgoing links (R-NAV-01), outline (R-NAV-06), properties (R-RND-07). */
export function RightPane(props: Props) {
  const { ws, path, tab } = props;
  return (
    <aside className="right-pane" aria-label="Note details">
      <div className="tabs" role="tablist" aria-label="Note details">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            className={tab === t.id ? 'active' : ''}
            onClick={() => props.onTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="pane-body" role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} data-testid={tab}>
        {path === null || ws.read(path) === undefined ? <p className="muted">No note open.</p> : <Panel {...props} path={path} text={ws.read(path)!} />}
      </div>
    </aside>
  );
}

function Panel(props: Props & { path: string; text: string }) {
  const { ws, path, text, tab, version } = props;
  const backlinks = useMemo(() => (tab === 'backlinks' ? ws.links.backlinks(path, ws.notes()) : []), [tab, path, version, ws]);
  const outgoing = useMemo(() => (tab === 'outgoing' ? ws.links.outgoing(path, text) : []), [tab, path, text, ws, version]);
  const headings = useMemo(() => (tab === 'outline' ? extractHeadings(text) : []), [tab, text]);
  const fm = useMemo(() => (tab === 'properties' ? splitFrontmatter(text) : null), [tab, text]);
  const tags = useMemo(() => (tab === 'properties' ? extractTags(text) : []), [tab, text]);

  if (tab === 'backlinks') {
    if (backlinks.length === 0) return <p className="muted">No backlinks found.</p>;
    return (
      <ul className="link-list">
        {backlinks.map((b) => (
          <li key={b.path}>
            <button type="button" className="link-item" onClick={() => props.onOpen(b.path)} title={b.path}>
              <span className="link-title">{titleOf(b.path)}</span>
              <span className="link-meta">{b.count > 1 ? `${b.count} links` : folder(b.path)}</span>
            </button>
          </li>
        ))}
      </ul>
    );
  }

  if (tab === 'outgoing') {
    if (outgoing.length === 0) return <p className="muted">No outgoing links.</p>;
    const resolved = outgoing.filter((l) => l.path !== null);
    const missing = outgoing.filter((l) => l.path === null);
    return (
      <>
        {resolved.length > 0 && (
          <ul className="link-list">
            {resolved.map((l) => (
              <li key={l.label}>
                <button type="button" className="link-item" onClick={() => props.onOpenLink(l.target, path, l.heading)} title={l.path ?? ''}>
                  <span className="link-title">{l.label}</span>
                  {l.embed && <span className="link-meta">embed</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
        {missing.length > 0 && (
          <>
            <h3 className="pane-heading">Not created yet</h3>
            <ul className="link-list">
              {missing.map((l) => (
                <li key={l.label}>
                  <button type="button" className="link-item unresolved" onClick={() => props.onOpenLink(l.target, path, l.heading)} title="Click to create">
                    <span className="link-title">{l.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </>
    );
  }

  if (tab === 'outline') {
    if (headings.length === 0) return <p className="muted">No headings.</p>;
    const min = Math.min(...headings.map((h) => h.level));
    return (
      <ul className="outline">
        {headings.map((h, i) => (
          <li key={`${h.line}-${i}`} style={{ paddingLeft: (h.level - min) * 14 }}>
            <button type="button" className="link-item" onClick={() => props.onHeading(h.line, h.slug)}>
              {h.text || '(untitled heading)'}
            </button>
          </li>
        ))}
      </ul>
    );
  }

  const entries = Object.entries(fm?.data ?? {});
  return (
    <>
      {entries.length === 0 && fm?.raw == null && <p className="muted">No properties.</p>}
      {fm?.raw != null && fm.data === null && <p className="muted">Front matter is not a YAML map.</p>}
      {entries.length > 0 && (
        <dl className="props">
          {entries.map(([k, v]) => (
            <div key={k} className="prop">
              <dt>{k}</dt>
              <dd>{renderValue(v)}</dd>
            </div>
          ))}
        </dl>
      )}
      {tags.length > 0 && (
        <>
          <h3 className="pane-heading">Tags</h3>
          <div className="chips">
            {tags.map((t) => (
              <button key={t} type="button" className="chip" onClick={() => props.onTag(t)}>
                #{t}
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
}

function folder(path: string): string {
  const i = path.lastIndexOf('/');
  return i < 0 ? '' : path.slice(0, i);
}

function renderValue(v: unknown) {
  if (Array.isArray(v)) {
    return (
      <span className="chips">
        {v.map((x, i) => (
          <span key={i} className="chip static">
            {scalar(x)}
          </span>
        ))}
      </span>
    );
  }
  return scalar(v);
}

function scalar(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}
