import { type ComponentProps, lazy, Suspense } from 'react';

// Each view is its own chunk, fetched when it is first shown (R-PLT-07). Importing through
// the capability's index keeps the dependency rules; the bundler splits at the component.
const GraphView = lazy(() => import('../navigate/index.ts').then((m) => ({ default: m.GraphView })));
const loadRightPane = () => import('./RightPaneWithProperties.tsx');
const RightPane = lazy(loadRightPane);
// The editor stack (CodeMirror, reading view) is the largest chunk. Fetch it at start-up,
// beside the first render, so opening a note does not wait for a second round trip.
const loadNoteView = () => import('./NoteView.tsx');
const NoteView = lazy(loadNoteView);
void loadNoteView();
const LiveStatus = lazy(() => import('./LiveStatus.tsx'));
const VaultHistory = lazy(() => import('../backup/index.ts').then((m) => ({ default: m.VaultHistory })));
const ReviewDrawer = lazy(() => import('../review/index.ts').then((m) => ({ default: m.ReviewDrawer })));
const HistoryDrawer = lazy(() => import('../vault/index.ts').then((m) => ({ default: m.HistoryDrawer })));
const SettingsDialog = lazy(() => import('../platforms/index.ts').then((m) => ({ default: m.SettingsDialog })));

export function LazyGraphView(props: ComponentProps<typeof GraphView>) {
  return (
    <Suspense fallback={null}>
      <GraphView {...props} />
    </Suspense>
  );
}

export function LazyNoteView(props: ComponentProps<typeof NoteView>) {
  return (
    <Suspense fallback={<div className="view-content" aria-busy="true" />}>
      <NoteView {...props} />
    </Suspense>
  );
}

/** Live editing for the open note: the session, its libraries and the status chip. */
export function LazyLiveStatus(props: ComponentProps<typeof LiveStatus>) {
  return (
    <Suspense fallback={null}>
      <LiveStatus {...props} />
    </Suspense>
  );
}

/** The placeholder keeps the pane's width while its chunk loads. */
export function LazyRightPane(props: ComponentProps<typeof RightPane>) {
  return (
    <Suspense fallback={<aside className="right-pane" aria-label="Note details" aria-busy="true" />}>
      <RightPane {...props} />
    </Suspense>
  );
}

export function LazyVaultHistory(props: ComponentProps<typeof VaultHistory>) {
  return (
    <Suspense fallback={null}>
      <VaultHistory {...props} />
    </Suspense>
  );
}

export function LazyReviewDrawer(props: ComponentProps<typeof ReviewDrawer>) {
  return (
    <Suspense fallback={null}>
      <ReviewDrawer {...props} />
    </Suspense>
  );
}

export function LazyHistoryDrawer(props: ComponentProps<typeof HistoryDrawer>) {
  return (
    <Suspense fallback={null}>
      <HistoryDrawer {...props} />
    </Suspense>
  );
}

export function LazySettingsDialog(props: ComponentProps<typeof SettingsDialog>) {
  return (
    <Suspense fallback={null}>
      <SettingsDialog {...props} />
    </Suspense>
  );
}
