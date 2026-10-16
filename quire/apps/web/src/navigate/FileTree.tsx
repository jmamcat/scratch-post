import { useEffect, useMemo, useState } from 'react';
import { ancestors, buildTree, type TreeFolder } from './file-tree-model.ts';
import { loadPref, savePref } from '../shared/use-pref.ts';
import { Icon } from '../shared/Icon.tsx';

interface Props {
  paths: readonly string[];
  active: string | null;
  pending: (path: string) => boolean;
  onOpen: (path: string) => void;
  onNewNote: (folder: string) => void;
}

/** Left sidebar file tree; folders are path prefixes (R-SYN-01 local copy). */
export function FileTree({ paths, active, pending, onOpen, onNewNote }: Props) {
  const tree = useMemo(() => buildTree(paths), [paths]);
  const [open, setOpen] = useState<Set<string>>(() => new Set(loadPref<string[]>('openFolders', [])));

  // Reveal the active note.
  useEffect(() => {
    if (!active) return;
    const need = ancestors(active).filter((f) => !open.has(f));
    if (need.length) setOpen((s) => new Set([...s, ...need]));
  }, [active]);

  useEffect(() => savePref('openFolders', [...open]), [open]);

  const toggle = (path: string) =>
    setOpen((s) => {
      const n = new Set(s);
      if (n.has(path)) n.delete(path);
      else n.add(path);
      return n;
    });

  if (paths.length === 0) {
    return (
      <div className="tree-empty" data-testid="file-tree">
        <p>No notes yet.</p>
        <button type="button" onClick={() => onNewNote('')}>
          Create a note
        </button>
      </div>
    );
  }

  const renderFolder = (f: TreeFolder, depth: number) => (
    <>
      {f.folders.map((sub) => {
        const isOpen = open.has(sub.path);
        return (
          <li key={`d:${sub.path}`} role="treeitem" aria-expanded={isOpen} aria-label={sub.name} aria-selected={false}>
            <div className="tree-row folder" style={{ paddingLeft: 8 + depth * 14 }} onClick={() => toggle(sub.path)}>
              <span className={`chevron ${isOpen ? 'open' : ''}`}>
                <Icon name="chevron" size={12} />
              </span>
              <span className="tree-name">{sub.name}</span>
              <button
                type="button"
                className="icon-button tree-action"
                aria-label={`New note in ${sub.path}`}
                title="New note in this folder"
                onClick={(e) => {
                  e.stopPropagation();
                  onNewNote(sub.path);
                }}
              >
                <Icon name="plus" size={14} />
              </button>
            </div>
            {isOpen && <ul role="group">{renderFolder(sub, depth + 1)}</ul>}
          </li>
        );
      })}
      {f.files.map((file) => (
        <li key={`f:${file.path}`} role="treeitem" aria-selected={file.path === active} aria-label={file.name}>
          <a
            className={`tree-row file ${file.path === active ? 'active' : ''}`}
            style={{ paddingLeft: 22 + depth * 14 }}
            href={`#/${encodeURI(file.path)}`}
            title={file.path}
            onClick={(e) => {
              e.preventDefault();
              onOpen(file.path);
            }}
          >
            <span className="tree-name">{file.name}</span>
            {pending(file.path) && <span className="dot" title="Not synced yet" aria-label="pending sync" />}
          </a>
        </li>
      ))}
    </>
  );

  return (
    <ul className="tree" role="tree" aria-label="Files" data-testid="file-tree">
      {renderFolder(tree, 0)}
    </ul>
  );
}
