import { type ComponentProps, lazy, Suspense } from 'react';

// Each view is its own chunk, fetched when it is first shown (R-PLT-07). Importing through
// the capability's index keeps the dependency rules; the bundler splits at the component.
const GraphView = lazy(() => import('../navigate/index.ts').then((m) => ({ default: m.GraphView })));
const RightPane = lazy(() => import('../navigate/index.ts').then((m) => ({ default: m.RightPane })));
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
