---
id: 0001-mvp-foundation/P03
title: Sync protocol, server push handler and client engine in @quire/sync
lane: B
depends_on: [P02]
owns:
  - quire/packages/sync/src/**
  - quire/packages/sync/test/**
reads:
  - quire/packages/core/src/**
  - quire/changes/0001-mvp-foundation/spec/sync/spec.md
  - quire/changes/0001-mvp-foundation/spec/review/spec.md
  - quire/changes/0001-mvp-foundation/design.md
size: M
status: done
claimed_by: claude-code/claude
---

# Sync protocol and engines

## Context

Implements R-SYN-02..08 and R-RVW-01, R-RVW-04, R-RVW-06, R-RVW-07 as storage- and
transport-agnostic code. Ships an in-memory `RevisionStore` and `LocalStore` used by
tests and by the server's unit tests.

## Contract

```ts
// protocol.ts
export interface DocMeta { path: string; rev: number; hash: string; deleted: boolean; device: string; createdAt: string }
export interface ChangeFeed { cursor: number; changes: DocMeta[] }        // latest head per changed path, rev > since
export interface PushItem { path: string; baseRev: number | null; text: string | null }   // text null = delete
export interface PushRequest { device: string; items: PushItem[] }
export type PushStatus = 'applied' | 'noop' | 'merged' | 'conflict';
export interface PushResult { path: string; status: PushStatus; meta: DocMeta; text: string | null; conflictId?: string }
export type ConflictStatus = 'open' | 'review' | 'resolved' | 'dismissed';
export interface Conflict {
  id: string; path: string; kind: 'content' | 'delete-edit'; status: ConflictStatus;
  rev: number;                                   // revision committed when the conflict was created
  current: { device: string; rev: number; at: string };
  incoming: { device: string; at: string };
  segments: Segment[];                           // from @quire/core merge3; for delete-edit: one stable segment with the kept text
  resolvedRev?: number;
}
export interface Resolution { device: string; choices?: Record<string, Choice>; text?: string; keep?: 'note' | 'delete' }
export type ServerEvent =
  | { type: 'commit'; path: string; rev: number; hash: string; device: string; deleted: boolean }
  | { type: 'conflict'; id: string; path: string; status: ConflictStatus };
export function hashText(text: string): Promise<string>;   // SHA-256 hex via globalThis.crypto.subtle

// server.ts
export interface RevisionStore {
  head(path: string): DocMeta | null;
  text(rev: number): string | null;
  commit(path: string, text: string | null, device: string, hash: string): DocMeta;
  changesSince(rev: number): DocMeta[];
  headRev(): number;
  history(path: string): DocMeta[];               // newest first
  saveConflict(c: Conflict): void;
  getConflict(id: string): Conflict | null;
  listConflicts(status?: ConflictStatus): Conflict[];
}
export interface SyncServerHooks {
  beforeWrite?(path: string): void;               // live rooms flush pending text (R-LIV-03)
  afterWrite?(path: string, text: string | null, meta: DocMeta): void;
  onEvent?(e: ServerEvent): void;
  now?(): Date;
}
export class SyncServer {
  constructor(store: RevisionStore, hooks?: SyncServerHooks);
  push(req: PushRequest): Promise<PushResult[]>;
  resolve(id: string, r: Resolution): Promise<PushResult>;
  dismiss(id: string): Conflict;
  changes(since: number): ChangeFeed;
}
export class MemoryRevisionStore implements RevisionStore {}

// client.ts
export interface LocalDoc { path: string; text: string; baseRev: number | null; baseText: string | null; deleted: boolean }
export interface LocalStore {
  get(path: string): Promise<LocalDoc | undefined>;
  put(doc: LocalDoc): Promise<void>;
  remove(path: string): Promise<void>;
  all(): Promise<LocalDoc[]>;
  getCursor(): Promise<number>;
  setCursor(n: number): Promise<void>;
}
export interface Transport {
  push(req: PushRequest): Promise<PushResult[]>;
  changes(since: number): Promise<ChangeFeed>;
  doc(path: string, rev?: number): Promise<{ meta: DocMeta; text: string | null }>;
}
export function isDirty(d: LocalDoc): boolean;
export interface SyncReport { pushed: number; pulled: number; conflicts: string[]; error?: string }
export class SyncClient {
  constructor(opts: { store: LocalStore; transport: Transport; device: string });
  write(path: string, text: string): Promise<void>;
  remove(path: string): Promise<void>;
  setLive(path: string, live: boolean): void;      // live docs are not pushed; pulls only move their base
  sync(): Promise<SyncReport>;                      // push dirty, then pull; never throws, reports error
  onChange(fn: (paths: string[]) => void): () => void;
}
export class MemoryLocalStore implements LocalStore {}
export function memoryTransport(server: SyncServer): Transport;
```

## Acceptance

```sh
pnpm -C quire --filter @quire/sync test
pnpm -C quire --filter @quire/sync typecheck
```

Tests cover every sync and review scenario, plus a seeded randomized convergence test:
3 clients, 200 random operations (edit line, append, delete, create, sync), then two
quiet sync rounds; every client equals the server heads and no conflict loses text.

Result: vitest: 17 passed (12 scenario tests, 5 seeded convergence runs; every run creates 11 to 34 conflict records and still converges).

## Decisions log

- **D-P03-1** · confidence: med
  - Question: When the user types while a push is in flight and the server returned merged text, who wins overlapping hunks during the client-side rebase?
  - Did: Local typing wins; the server's version stays in the revision history but no conflict record is made.
  - Why: Never discard what the user is looking at; the race window is one round trip.
  - Reverse: In client.ts pushDirty(), swap the merge3 sides and open a client-side review item.
- **D-P03-2** · confidence: high
  - Question: A conflict whose provisional text equals the head (incoming lost every hunk)?
  - Did: Still create the conflict record at the head revision.
  - Why: R-SYN-05: both sides must be kept until a person decides.
  - Reverse: n.a.
- **D-P03-3** · confidence: high
  - Question: Where does the HTTP transport live?
  - Did: HttpTransport is in @quire/sync, shared by the web client and the local node replicator.
  - Why: One implementation of the wire protocol.
  - Reverse: Move to apps/web if the server ever needs a different client.
- **D-P03-4** · confidence: med
  - Question: Two devices create the same path independently (baseRev null on both).
  - Did: Merged with an empty base: both texts kept (both-inserted, flagged for review).
  - Why: No loss; daily notes created on two devices are the common case.
  - Reverse: Treat as a content conflict instead in server.ts pushOne().
