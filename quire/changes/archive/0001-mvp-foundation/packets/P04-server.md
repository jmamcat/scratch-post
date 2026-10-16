---
id: 0001-mvp-foundation/P04
title: HTTP server, SQLite revision store, disk mirror and events
lane: C
depends_on: [P03]
owns:
  - quire/apps/server/src/**
  - quire/apps/server/test/**
reads:
  - quire/packages/**
  - quire/changes/0001-mvp-foundation/design.md
  - quire/changes/0001-mvp-foundation/spec/vault/spec.md
  - quire/changes/0001-mvp-foundation/spec/platforms/spec.md
size: M
status: done
claimed_by: claude-code/claude
---

# HTTP server

## Context

Implements R-VLT-01..06, R-LIV-04, R-PLT-01, R-PLT-04 on Node 22 with Hono,
`@hono/node-server` and `node:sqlite`. The `/live` WebSocket is P05; the replicator is P06.
Leave `src/live.ts` and `src/replicator.ts` to them, but expose the hooks they need.

## Contract

Environment: `QUIRE_DATA_DIR` (default `./.data`), `QUIRE_PORT` (8787), `QUIRE_MODE`
(`cloud` | `local`), `QUIRE_DEVICE` (default hostname), `QUIRE_TOKEN` (optional),
`QUIRE_UPSTREAM`, `QUIRE_UPSTREAM_TOKEN`, `QUIRE_WEB_DIST` (default `../web/dist`).

```ts
// src/app.ts
export interface QuireServer {
  app: Hono; sync: SyncServer; store: SqliteRevisionStore; vault: VaultMirror;
  events: EventHub;                   // subscribe(fn) => unsubscribe; emit(e)
  hooks: { beforeWrite: Set<(path: string) => void>; afterWrite: Set<(path: string, text: string | null) => void> };
  close(): Promise<void>;
}
export function createQuireServer(config: Config): Promise<QuireServer>;
// src/main.ts starts it with @hono/node-server and returns the http.Server (P05 attaches ws upgrade to it)
```

Routes exactly as in design.md "HTTP API". Errors: `{ error: string }` with 400
(bad path or body), 401, 404. CORS allows any origin (Android WebView, dev server).

Disk mirror: write heads to `<data>/vault/<path>` atomically (write temp, rename).
Startup scan and `fs.watch(recursive)` commit external changes as device `disk`,
ignoring writes the mirror itself just made (compare hash).

## Acceptance

```sh
pnpm -C quire --filter @quire/server test
pnpm -C quire --filter @quire/server typecheck
```

Tests start the server on an ephemeral port with a temp data dir and cover every vault
and platform scenario over real HTTP.

Result: vitest: 9 app tests passed; tsc clean.

## Decisions log

- **D-P04-1** · confidence: med
  - Question: A head whose file is missing at startup: delete it or restore it?
  - Did: Restore the file from the head. Only removals seen by the watcher while running become deletions.
  - Why: A missing file at startup usually means a new or moved folder, and deleting a vault's notes by accident is the worst failure.
  - Reverse: VaultMirror.scan() in vault.ts.
- **D-P04-2** · confidence: high
  - Question: How to pass paths in URLs?
  - Did: As the ?path= query parameter.
  - Why: Avoids slash-encoding problems in route params across proxies.
  - Reverse: Routes in app.ts and HttpTransport.
- **D-P04-3** · confidence: med
  - Question: Should the replicator follow upstream SSE?
  - Did: No: it polls every 10 s and runs 1 s after any local commit. Node 22 has no stable EventSource.
  - Why: Simpler and robust to restarts; 10 s staleness on the local node is acceptable.
  - Reverse: Add an SSE reader in replicator.ts.
