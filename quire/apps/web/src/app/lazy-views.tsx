import { type ComponentProps, type ComponentType, createElement, lazy, type ReactNode, Suspense } from 'react';
import type LiveStatusType from './LiveStatus.tsx';
import type NoteViewType from './NoteView.tsx';
import type RightPaneType from './RightPaneWithProperties.tsx';

/**
 * A view fetched when it is first shown (R-PLT-07), so it stays out of the first-load bundle.
 * `prefetch` fetches it earlier; once it has arrived the view renders without suspending.
 * Views are imported through the capability's index to keep the dependency rules; the
 * bundler still splits at the component.
 */
function lazyView<C extends ComponentType<any>>(load: () => Promise<{ default: C }>, fallback: ReactNode = null) {
  let loaded: C | null = null;
  const fetching = () => load().then((m) => (loaded = m.default));
  const Pending = lazy(() => fetching().then((c) => ({ default: c })));
  const View = (props: ComponentProps<C>) => (loaded ? createElement(loaded, props) : <Suspense fallback={fallback}>{createElement(Pending, props)}</Suspense>);
  return Object.assign(View, { prefetch: () => void fetching().catch(() => undefined) });
}

export const LazyGraphView = lazyView(() => import('../navigate/index.ts').then((m) => ({ default: m.GraphView })));
export const LazyVaultHistory = lazyView(() => import('../backup/index.ts').then((m) => ({ default: m.VaultHistory })));
export const LazyReviewDrawer = lazyView(() => import('../review/index.ts').then((m) => ({ default: m.ReviewDrawer })));
export const LazyHistoryDrawer = lazyView(() => import('../vault/index.ts').then((m) => ({ default: m.HistoryDrawer })));
export const LazySettingsDialog = lazyView(() => import('../platforms/index.ts').then((m) => ({ default: m.SettingsDialog })));

/** The placeholder keeps the pane's width while its chunk loads. */
export const LazyRightPane = lazyView<typeof RightPaneType>(
  () => import('./RightPaneWithProperties.tsx'),
  <aside className="right-pane" aria-label="Note details" aria-busy="true" />,
);

/** The editor stack (CodeMirror, reading view) is the largest chunk: fetched at start-up, beside the first render. */
export const LazyNoteView = lazyView<typeof NoteViewType>(() => import('./NoteView.tsx'), <div className="view-content" aria-busy="true" />);

/** Live editing for the open note: the session, its libraries and the status chip. */
export const LazyLiveStatus = lazyView<typeof LiveStatusType>(() => import('./LiveStatus.tsx'));

LazyNoteView.prefetch();
// Settings is where the theme is changed: have it ready before the first click.
LazySettingsDialog.prefetch();
