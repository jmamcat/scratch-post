import type { Conflict } from '@quire/sync';
import { useEffect, useSyncExternalStore } from 'react';
import { ConflictCard } from './ConflictCard.tsx';
import type { ConflictStore } from './conflicts.ts';
import { Drawer } from './Drawer.tsx';

interface Props {
  store: ConflictStore;
  online: boolean;
  focusId: string | null;
  onOpenNote: (path: string) => void;
  onClose: () => void;
}

/** Review inbox (R-RVW-02): open conflicts first, then "Review suggested". */
export function ReviewDrawer({ store, online, focusId, onOpenNote, onClose }: Props) {
  const snap = useSyncExternalStore(store.subscribe, store.getSnapshot);
  useEffect(() => {
    void store.refresh();
  }, [store]);
  useEffect(() => {
    if (focusId) document.getElementById(`conflict-${focusId}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, [focusId, snap.loaded]);

  const resolve = async (c: Conflict, r: Parameters<ConflictStore['resolve']>[1]) => {
    await store.resolve(c.id, r);
  };
  const card = (c: Conflict) => (
    <ConflictCard key={c.id} conflict={c} focused={c.id === focusId} onOpenNote={onOpenNote} onResolve={resolve} onDismiss={(x) => store.dismiss(x.id)} />
  );

  const total = snap.open.length + snap.review.length;
  return (
    <Drawer label="Review inbox" title="Review inbox" onClose={onClose} wide>
      {!online && <p className="notice">Offline. Showing the last known items; resolving needs the server.</p>}
      {snap.error && online && <p className="notice error">Could not load conflicts: {snap.error}</p>}
      {snap.loaded && total === 0 && (
        <div className="drawer-empty">
          <p>Nothing to review.</p>
          <p className="muted small">Edits that could not be merged automatically show up here.</p>
        </div>
      )}
      {snap.open.length > 0 && (
        <section aria-label="Open conflicts">
          <h3 className="drawer-section">
            Open conflicts <span className="count">{snap.open.length}</span>
          </h3>
          {snap.open.map(card)}
        </section>
      )}
      {snap.review.length > 0 && (
        <section aria-label="Review suggested">
          <h3 className="drawer-section">
            Review suggested <span className="count">{snap.review.length}</span>
          </h3>
          {snap.review.map(card)}
        </section>
      )}
    </Drawer>
  );
}
