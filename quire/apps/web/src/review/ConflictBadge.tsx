import { useSyncExternalStore } from 'react';
import { Icon } from '../components/Icon.tsx';
import type { ConflictStore } from './conflicts.ts';

/** Status bar badge with the open conflict count, always visible (R-RVW-02). */
export function ConflictBadge({ store, onOpen }: { store: ConflictStore; onOpen: () => void }) {
  const snap = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const open = snap.open.length;
  const review = snap.review.length;
  const label = `${open} open ${open === 1 ? 'conflict' : 'conflicts'}${review ? `, ${review} to review` : ''}. Open review inbox`;
  return (
    <button type="button" className={`conflict-badge ${open ? 'has-open' : review ? 'has-review' : ''}`} data-testid="conflict-badge" aria-label={label} title={label} onClick={onOpen}>
      <Icon name="inbox" size={14} />
      <span className="badge-count">{open}</span>
      {review > 0 && <span className="badge-review">+{review}</span>}
    </button>
  );
}
