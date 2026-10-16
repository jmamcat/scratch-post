import type { Choice, Segment } from '@quire/core';

export interface DocMeta {
  path: string;
  rev: number;
  hash: string;
  deleted: boolean;
  device: string;
  createdAt: string;
}

export interface ChangeFeed {
  /** Highest revision on the server when the feed was built; pass it as `since` next time. */
  cursor: number;
  /** Latest head per path changed after `since`. */
  changes: DocMeta[];
}

export interface PushItem {
  path: string;
  /** Revision the client's edit started from; null for a document the client created. */
  baseRev: number | null;
  /** New text, or null to delete. */
  text: string | null;
}

export interface PushRequest {
  device: string;
  items: PushItem[];
}

export type PushStatus = 'applied' | 'noop' | 'merged' | 'conflict';

export interface PushResult {
  path: string;
  status: PushStatus;
  /** Head after the push. */
  meta: DocMeta;
  /** Head text after the push; null when the head is a deletion. */
  text: string | null;
  conflictId?: string;
}

export type ConflictStatus = 'open' | 'review' | 'resolved' | 'dismissed';

export interface Conflict {
  id: string;
  path: string;
  kind: 'content' | 'delete-edit';
  status: ConflictStatus;
  /** Revision committed when the conflict was created; its text is the provisional text. */
  rev: number;
  createdAt: string;
  current: { device: string; rev: number; at: string };
  incoming: { device: string; at: string; deleted: boolean };
  segments: Segment[];
  resolvedRev?: number;
}

export interface Resolution {
  device: string;
  /** Per-hunk choices for content conflicts. */
  choices?: Record<string, Choice>;
  /** Full replacement text, for manual edits. Wins over choices. */
  text?: string;
  /** Decision for delete-edit conflicts. */
  keep?: 'note' | 'delete';
}

export type ServerEvent =
  | { type: 'commit'; path: string; rev: number; hash: string; device: string; deleted: boolean }
  | { type: 'conflict'; id: string; path: string; status: ConflictStatus };

export class SyncError extends Error {
  constructor(
    readonly status: 400 | 404 | 409,
    message: string,
  ) {
    super(message);
    this.name = 'SyncError';
  }
}

export async function hashText(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const DELETED_HASH = 'deleted';
