import { type TagNode, tagTree } from '@quire/views';
import { useMemo } from 'react';
import type { Workspace } from '../sync/index.ts';
import { useNotes } from './use-notes.ts';
import './views.css';

function TagBranch(props: { node: TagNode; onTag: (tag: string) => void }) {
  const { node, onTag } = props;
  return (
    <section className="tag-node" data-group={node.name} aria-label={node.tag}>
      <button type="button" className="view-item tag-row" data-item={node.name} data-tag={node.tag} title={`Search #${node.tag}`} onClick={() => onTag(node.tag)}>
        <span className="view-item-title">{node.name}</span>
        <span className="view-item-detail muted" data-count>
          {node.count}
        </span>
      </button>
      {node.children.length > 0 && (
        <ul className="tag-children">
          {node.children.map((c) => (
            <li key={c.tag}>
              <TagBranch node={c} onTag={onTag} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Every tag as a nested tree with note counts; choosing one opens a tag search (R-VIEW-03). */
export function TagsView(props: {
  ws: Workspace;
  version: number;
  active: string | null;
  onOpen: (path: string) => void;
  onTag: (tag: string) => void;
}) {
  const notes = useNotes(props.ws, props.version);
  const tree = useMemo(() => tagTree(notes), [notes]);
  if (tree.length === 0) return <p className="muted view-empty">No tags yet.</p>;
  return (
    <div className="group-list tag-tree" aria-label="Tags">
      {tree.map((n) => (
        <TagBranch key={n.tag} node={n} onTag={props.onTag} />
      ))}
    </div>
  );
}
