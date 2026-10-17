import { type ComponentProps, type ComponentType, createElement, lazy, type ReactNode, Suspense } from 'react';
import type LiveStatusType from './LiveStatus.tsx';
import type NoteViewType from './NoteView.tsx';
import type RightPaneType from './RightPaneWithProperties.tsx';

/**
 * A view fetched when it is first shown (R-PLT-07), so it stays out of the first-load bundle.
 * `prefetch` fetches it earlier. Views are imported through the capability's index to keep
 * the dependency rules; the bundler still splits at the component.
 */
/** Shown when a chunk cannot be fetched (the worker has it cached once the app was online). */
function LoadFailed() {
  return <p className="muted">This view could not be loaded. Reload to try again.</p>;
}

function lazyView<C extends ComponentType<any>>(load: () => Promise<{ default: C }>, fallback: ReactNode = null) {
  let ready: { default: C } | null = null;
  const fetching = () => load().then((m) => (ready = m));
  // React calls a thenable's callback at once when it is already settled, so a view that has
  // arrived by its first render mounts without suspending. The component type never changes,
  // which keeps the view mounted (editor state included) across later renders.
  const Pending = lazy(() =>
    ready
      ? (({ then: (resolve: (m: { default: C }) => void) => resolve(ready!) }) as unknown as Promise<{ default: C }>)
      : fetching().catch(() => ({ default: LoadFailed as unknown as C })),
  );
  const View = (props: ComponentProps<C>) => <Suspense fallback={fallback}>{createElement(Pending, props)}</Suspense>;
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
