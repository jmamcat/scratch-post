import { titleOf } from '@quire/vault';

export interface TreeFile {
  kind: 'file';
  name: string;
  path: string;
}

export interface TreeFolder {
  kind: 'folder';
  name: string;
  /** Folder path without a trailing slash; `''` for the vault root. */
  path: string;
  folders: TreeFolder[];
  files: TreeFile[];
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

/**
 * Builds the file tree from note paths. Folders exist only as path prefixes, plus any
 * `extraFolders` (folders created in this session that have no notes yet).
 */
export function buildTree(paths: Iterable<string>, extraFolders: Iterable<string> = []): TreeFolder {
  const root: TreeFolder = { kind: 'folder', name: '', path: '', folders: [], files: [] };
  const index = new Map<string, TreeFolder>([['', root]]);

  const folder = (path: string): TreeFolder => {
    const found = index.get(path);
    if (found) return found;
    const i = path.lastIndexOf('/');
    const parent = folder(i < 0 ? '' : path.slice(0, i));
    const f: TreeFolder = { kind: 'folder', name: path.slice(i + 1), path, folders: [], files: [] };
    parent.folders.push(f);
    index.set(path, f);
    return f;
  };

  for (const p of extraFolders) if (p) folder(p);
  for (const p of paths) {
    const i = p.lastIndexOf('/');
    folder(i < 0 ? '' : p.slice(0, i)).files.push({ kind: 'file', name: titleOf(p), path: p });
  }

  const sort = (f: TreeFolder) => {
    f.folders.sort((a, b) => collator.compare(a.name, b.name));
    f.files.sort((a, b) => collator.compare(a.name, b.name) || collator.compare(a.path, b.path));
    f.folders.forEach(sort);
  };
  sort(root);
  return root;
}

/** Every ancestor folder of a path, outermost first: `a/b/c.md` gives `a`, `a/b`. */
export function ancestors(path: string): string[] {
  const parts = path.split('/').slice(0, -1);
  return parts.map((_, i) => parts.slice(0, i + 1).join('/'));
}
