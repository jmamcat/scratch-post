import { useEffect, useState, useSyncExternalStore } from 'react';
import type { RightTab } from '../navigate/index.ts';
import { loadPref, savePref, usePref } from '../shared/use-pref.ts';
import type { SidebarView } from '../Sidebar.tsx';
import type { EditorMode } from '../vault/index.ts';

const narrowQuery = '(max-width: 800px)';
export const isNarrow = () => typeof matchMedia !== 'undefined' && matchMedia(narrowQuery).matches;

const onNarrowChange = (cb: () => void) => {
  if (typeof matchMedia === 'undefined') return () => {};
  const q = matchMedia(narrowQuery);
  q.addEventListener('change', cb);
  return () => q.removeEventListener('change', cb);
};
/** True while the window is narrow enough for the sidebars to open over the content. */
export const useNarrow = () => useSyncExternalStore(onNarrowChange, isNarrow, () => false);

/** Sidebars, view modes and the recent list: the shell state that is remembered per device. */
export function useLayoutState() {
  const [reading, setReading] = usePref('reading', false);
  // On narrow screens the sidebars start closed and their state is not remembered.
  const [leftOpen, setLeftOpen] = useState(() => !isNarrow() && loadPref('leftOpen', true));
  const [rightOpen, setRightOpen] = useState(() => !isNarrow() && loadPref('rightOpen', true));
  const [leftView, setLeftView] = usePref<SidebarView>('leftView', 'files');
  const [editorMode, setEditorMode] = usePref<EditorMode>('editorMode', 'live');
  const [query, setQuery] = useState('');
  const [rightTab, setRightTab] = usePref<RightTab>('rightTab', 'backlinks');
  const [recent, setRecent] = usePref<string[]>('recent', []);

  useEffect(() => {
    if (!isNarrow()) savePref('leftOpen', leftOpen);
  }, [leftOpen]);
  useEffect(() => {
    if (!isNarrow()) savePref('rightOpen', rightOpen);
  }, [rightOpen]);

  return {
    reading, setReading,
    leftOpen, setLeftOpen,
    rightOpen, setRightOpen,
    leftView, setLeftView,
    editorMode, setEditorMode,
    query, setQuery,
    rightTab, setRightTab,
    recent, setRecent,
  };
}

export type LayoutState = ReturnType<typeof useLayoutState>;
