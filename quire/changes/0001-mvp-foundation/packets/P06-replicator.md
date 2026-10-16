---
id: 0001-mvp-foundation/P06
title: Local node replicator
lane: C
depends_on: [P04]
owns:
  - quire/apps/server/src/replicator.ts
  - quire/apps/server/test/replicator.test.ts
reads:
  - quire/apps/server/src/**
  - quire/packages/sync/src/**
  - quire/changes/0001-mvp-foundation/spec/sync/spec.md
size: S
status: todo
---

# Local node replicator

## Context

Implements R-SYN-09 and R-PLT-02. A local node replicates with its upstream by running
a `SyncClient` whose `LocalStore` is backed by the node's own revision store plus a small
`upstream_base` table (`path`, `rev`, `text`). Upstream changes are committed locally as
device `upstream`.

## Contract

```ts
export interface Replicator { start(): void; stop(): Promise<void>; syncNow(): Promise<SyncReport> }
export function createReplicator(q: QuireServer, upstream: { url: string; token?: string; device: string }): Replicator;
```

`LocalStore` mapping: `get(path)` returns `{ text: local head text, baseRev/baseText: upstream_base row, deleted: local head deleted && base exists }`;
`put(doc)` commits locally when text differs from the local head, and stores the base.
Schedule: every 10 s, after any local commit (debounced 1 s), exponential backoff up to
60 s while upstream errors. HTTP transport uses `fetch` with the bearer token.

## Acceptance

```sh
pnpm -C quire --filter @quire/server test
```

Test with two in-process servers: edits on either side converge; with the upstream
closed, local edits still commit, and they arrive after the upstream restarts.

## Decisions log
