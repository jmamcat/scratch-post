---
id: 0001-mvp-foundation/P05
title: Yjs live rooms on the server
lane: C
depends_on: [P04]
owns:
  - quire/apps/server/src/live.ts
  - quire/apps/server/test/live.test.ts
reads:
  - quire/apps/server/src/**
  - quire/changes/0001-mvp-foundation/spec/live/spec.md
size: M
status: done
claimed_by: claude-code/claude
---

# Yjs live rooms

## Context

Implements R-LIV-01..03 with `yjs`, `y-protocols`, `lib0` and `ws`. Wire protocol is
y-websocket's: message type 0 = sync (y-protocols/sync), 1 = awareness. The stock
`y-websocket` `WebsocketProvider` must work against it with
`new WebsocketProvider(baseUrl + '/live', '', doc, { params: { path } })`.

## Contract

```ts
export interface LiveRooms {
  attach(server: import('node:http').Server): void;   // handles upgrade for /live?path=...&token=...
  flush(path: string): void;                           // commit pending text now
  apply(path: string, text: string | null): void;      // set room text via minimal diff, no commit
  activePaths(): string[];
  close(): Promise<void>;
}
export function createLiveRooms(q: QuireServer, opts?: { idleMs?: number; maxMs?: number }): LiveRooms;
```

Register `flush` in `q.hooks.beforeWrite` and `apply` in `q.hooks.afterWrite`. Commits go
through `q.sync.push({ device: 'live', items: [{ path, baseRev: <rev the room last saw>, text }] })`
so a concurrent offline push is merged, never overwritten. Use `fast-diff` for `apply`.

## Acceptance

```sh
pnpm -C quire --filter @quire/server test
```

Tests: two `WebsocketProvider` clients see each other's edits; a commit appears after the
idle delay; an offline push to another paragraph appears in both clients' `Y.Text`.

Result: vitest: 3 live tests passed (two stock y-websocket clients, idle commit, offline push merged into the room).

## Decisions log

- **D-P05-1** · confidence: high
  - Question: How can flush run synchronously inside a push?
  - Did: Room commits write the store directly (sync SHA-256 via node:crypto) inside SyncServer.exclusive, and call QuireServer.committed() for disk mirror and events.
  - Why: SyncServer pushes are serialised; a nested push would deadlock.
  - Reverse: live.ts flushRoom().
- **D-P05-2** · confidence: low
  - Question: A pushed change and live typing overlap in the tiny window between flush and apply.
  - Did: Live typing wins in the room; the pushed text stays in the revision log, no conflict record.
  - Why: Window is the duration of one hash computation; flagging would need a room-side review item.
  - Reverse: live.ts apply(): open a review conflict when merge3 is not clean.
