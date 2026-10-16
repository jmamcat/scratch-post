import type { ServerEvent } from '@quire/sync';

export class EventHub {
  private listeners = new Set<(e: ServerEvent) => void>();

  subscribe(fn: (e: ServerEvent) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit(e: ServerEvent): void {
    for (const fn of this.listeners) {
      try {
        fn(e);
      } catch {
        // A broken listener must not break a commit.
      }
    }
  }
}
