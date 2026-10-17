import { titleOf } from '@quire/vault';
import { useMemo, useState } from 'react';
import { fuzzyFilter } from '../shared/fuzzy.ts';
import { toNotePath } from '../vault/index.ts';
import { Highlight, Picker, type PickerItem } from '../shared/Picker.tsx';

interface Props {
  paths: readonly string[];
  recent: readonly string[];
  onOpen: (path: string) => void;
  onCreate: (path: string) => void;
  onClose: () => void;
}

/** Ctrl/Cmd+O: fuzzy find a note by name, or create one from the query (R-NAV-05, OBS-UX-07). */
export function QuickSwitcher({ paths, recent, onOpen, onCreate, onClose }: Props) {
  const [query, setQuery] = useState('');
  const results = useMemo(() => {
    if (!query.trim()) {
      const set = new Set(paths);
      const rec = recent.filter((p) => set.has(p));
      const rest = paths.filter((p) => !rec.includes(p));
      return [...rec, ...rest].slice(0, 50).map((p) => ({ path: p, title: [] as number[], full: [] as number[] }));
    }
    return fuzzyFilter(paths, query, (p) => [titleOf(p), p])
      .slice(0, 50)
      .map((r) => ({ path: r.item, title: r.key === 0 ? r.match.indices : [], full: r.key === 1 ? r.match.indices : [] }));
  }, [query, paths, recent]);

  const createPath = toNotePath(query);
  const exact = createPath !== null && paths.some((p) => p.toLowerCase() === createPath.toLowerCase());
  const items: PickerItem[] = results.map((r) => {
    const folder = r.path.includes('/') ? r.path.slice(0, r.path.lastIndexOf('/')) : '';
    return {
      key: r.path,
      label: <Highlight text={titleOf(r.path)} indices={r.title} />,
      ...(folder ? { detail: r.full.length ? <Highlight text={r.path} indices={r.full} /> : folder } : {}),
    };
  });

  const create = (q: string) => {
    const p = toNotePath(q);
    if (!p) return;
    if (paths.some((x) => x.toLowerCase() === p.toLowerCase())) onOpen(paths.find((x) => x.toLowerCase() === p.toLowerCase())!);
    else onCreate(p);
    onClose();
  };

  return (
    <Picker
      label="Quick switcher"
      placeholder="Find or create a note..."
      query={query}
      onQuery={setQuery}
      items={items}
      empty={createPath ? `Enter to create "${titleOf(createPath)}"` : 'No notes found.'}
      onPick={(i) => {
        onOpen(results[i]!.path);
        onClose();
      }}
      onSubmitQuery={create}
      onClose={onClose}
      footer={
        <>
          <span>
            <kbd>↑↓</kbd> navigate
          </span>
          <span>
            <kbd>Enter</kbd> open
          </span>
          {createPath && !exact && (
            <span>
              <kbd>Shift+Enter</kbd> create "{titleOf(createPath)}"
            </span>
          )}
          <span>
            <kbd>Esc</kbd> close
          </span>
        </>
      }
    />
  );
}
