import type { Conflict } from '@quire/sync';

/** R-RVW-05: a note with an open conflict says so and links to its card. */
export function NoteBanner({ conflict, onReview }: { conflict: Conflict; onReview: (id: string) => void }) {
  const who = conflict.kind === 'delete-edit' && !conflict.incoming.deleted ? conflict.current.device : conflict.incoming.device;
  return (
    <div className="note-banner" role="alert" data-testid="note-banner">
      <span>This note has unresolved changes from {who}.</span>
      <button type="button" onClick={() => onReview(conflict.id)}>
        Review
      </button>
    </div>
  );
}
