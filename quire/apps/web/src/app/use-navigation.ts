import { extractHeadings } from '@quire/render';
import { useCallback, useEffect, type RefObject } from 'react';
import { headingSlug } from '../render/index.ts';
import { navigate, noteHash, type Route } from '../shared/router.ts';
import type { Workspace } from '../sync/index.ts';
import { dailyNotePath, type EditorHandle, folderOf, joinPath, toNotePath, untitledPath } from '../vault/index.ts';
import { titleOf } from '@quire/vault';
import { isNarrow, type LayoutState } from './layout-state.ts';

interface Inputs {
  ws: Workspace;
  route: Route;
  path: string | null;
  paths: readonly string[];
  layout: LayoutState;
  editor: RefObject<EditorHandle | null>;
  /** Called to put the cursor in the inline title after a note is created or renamed. */
  focusTitle: () => void;
}

/** Opening, creating, renaming and linking notes; remembers recent notes and scrolls to a linked heading. */
export function useNavigation({ ws, route, path, paths, layout, editor, focusTitle }: Inputs) {
  const { reading, setLeftOpen, setLeftView, setQuery, setRecent } = layout;

  const open = useCallback(
    (p: string, heading?: string) => {
      navigate(p, heading);
      if (isNarrow()) setLeftOpen(false);
    },
    [setLeftOpen],
  );

  const createAndOpen = useCallback(
    (p: string, focus = false) => {
      ws.create(p);
      open(p);
      if (focus) setTimeout(focusTitle, 0);
    },
    [ws, open, focusTitle],
  );

  /** Follows a link; an unresolved one creates the note (OBS-UX-04). */
  const openLink = useCallback(
    (target: string, from: string, heading?: string) => {
      if (target === '') {
        if (heading) open(from, heading);
        return;
      }
      const resolved = ws.links.resolve(target, from);
      if (resolved) return open(resolved, heading);
      const p = toNotePath(target);
      if (p) createAndOpen(p);
    },
    [ws, open, createAndOpen],
  );

  const showTag = useCallback(
    (tag: string) => {
      setLeftOpen(true);
      setLeftView('search');
      setQuery(`tag:${tag}`);
    },
    [setLeftOpen, setLeftView, setQuery],
  );

  useEffect(() => {
    if (route.kind === 'tag') showTag(route.tag);
  }, [route, showTag]);

  // Remember recent notes and scroll to a linked heading.
  useEffect(() => {
    if (route.kind !== 'note' || !ws.has(route.path)) return;
    setRecent((r) => [route.path, ...r.filter((p) => p !== route.path)].slice(0, 20));
    if (!route.heading) return;
    const heading = route.heading;
    requestAnimationFrame(() => {
      const t = ws.read(route.path) ?? '';
      const slug = headingSlug(t, heading);
      if (!slug) return;
      if (reading) document.getElementById(slug)?.scrollIntoView({ block: 'start' });
      else {
        const h = extractHeadings(t).find((x) => x.slug === slug);
        if (h) editor.current?.scrollToLine(h.line);
      }
    });
  }, [route]);

  const newNote = useCallback((folder = '') => createAndOpen(untitledPath(paths, folder), true), [createAndOpen, paths]);
  const dailyNote = useCallback(() => createAndOpen(dailyNotePath()), [createAndOpen]);

  const rename = (name: string): string | null => {
    if (!path) return 'No note open.';
    const next = toNotePath(joinPath(folderOf(path), name));
    if (!next || name.includes('/')) return 'Names cannot contain / or start with a dot.';
    if (next === path) return null;
    if (ws.has(next)) return `"${titleOf(next)}" already exists.`;
    // Switch the route first so the editor moves to the new path in the same render.
    history.replaceState(null, '', noteHash(next));
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    void ws.rename(path, next);
    return null;
  };

  return { open, createAndOpen, openLink, showTag, newNote, dailyNote, rename };
}
