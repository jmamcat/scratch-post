# Architecture

Quire is a lean Markdown notes system. Notes are plain `.md` files; one TypeScript codebase
runs a cloud server, a local node that may be switched off, and a local-first web client that
also ships as an Android app. Every device can edit offline; sync merges edits three ways
and sends anything it cannot merge safely to a review inbox. Folders are named after the
spec capabilities in `spec/` and `changes/*/spec/` (structure rule S2).

## Codemap

| Module | Capability | Purpose |
| --- | --- | --- |
| `packages/vault` | vault | Path rules and front matter: what a document is |
| `packages/render` | render | Obsidian Flavored Markdown parsing, extraction and HTML |
| `packages/navigate` | navigate | Link resolution, link index, offline search |
| `packages/merge` | merge | Three-way merge with collision tiers |
| `packages/sync` | sync | Sync protocol, server push handler, client engine, HTTP transport |
| `packages/views` | views | Pure grouping: domains, tag tree, timeline, board columns, link graph |
| `apps/server/src/vault` | vault | SQLite revision log and schema migrations, vault folder mirror, attachments (`files/`), read routes |
| `apps/server/src/access` | access | Tokens, tickets, origins, security headers, limits |
| `apps/server/src/backup` | backup | Change sets, whole-vault restore, compaction, backup bundles |
| `apps/server/src/ops` | ops | JSON logs, metrics, readiness |
| `apps/server/src/sync` | sync | Push and change feed routes, local node replicator |
| `apps/server/src/review` | review | Conflict routes |
| `apps/server/src/live` | live | Yjs rooms, Server-Sent Events |
| `apps/server/src/platforms` | platforms | Configuration, serving the web build |
| `apps/server/src/shared` | shared | Event hub, HTTP error mapping, hashing |
| `apps/web/src/sync` | sync | Local-first workspace (IndexedDB) and the sync loop |
| `apps/web/src/vault` | vault | Editor, rename, version history, attachments |
| `apps/web/src/backup` | backup | Vault history: change sets and whole-vault restore |
| `apps/web/src/render` | render | Reading view |
| `apps/web/src/navigate` | navigate | File tree, switcher, palette, search, right pane |
| `apps/web/src/review` | review | Conflict badge, inbox, note banner |
| `apps/web/src/live` | live | Live co-editing in the editor |
| `apps/web/src/platforms` | platforms | Settings (server URL, token, device name), themes, offline start |
| `apps/web/src/views` | views | Sidebar views: Recent, Domains, Tags, Timeline, Board |
| `apps/web/src/shared` | shared | UI primitives, router, preferences |
| `apps/android` | platforms | Capacitor wrapper around the web build |
| `scenarios` | (verification) | Spec scenarios run at the system boundary and in the browser |
| `demo` | (demo) | Seed vault and one-command cloud plus local node |

## Dependencies

Enforced by `.dependency-cruiser.cjs` (`pnpm deps`).

| Module | May import |
| --- | --- |
| `packages/vault`, `packages/merge` | npm libraries only |
| `packages/render` | `vault` |
| `packages/navigate` | `vault`, `render` |
| `packages/sync` | `vault`, `merge` |
| `packages/views` | `vault`, `render` |
| `apps/server/src/*` | any package; other server capabilities through their `index.ts`; `shared/` |
| `apps/web/src/*` | any package; other web capabilities through their `index.ts`; `shared/` |
| `*/shared` | packages only |
| `scenarios` | packages; servers only as processes |

Packages never import apps, apps never import each other, packages do no I/O.

## Entry points

- Server process: `apps/server/src/main.ts` (`start()`); HTTP composition in `app.ts`;
  command line `apps/server/src/cli.ts` (`quire tokens|backup|restore|compact`).
- Web client: `apps/web/src/main.tsx`, layout in `App.tsx`.
- Requests: `/api/*` (JSON), `/api/events` (SSE), `/live?path=` (WebSocket).
- Data: `$QUIRE_DATA_DIR/quire.db` (revisions, conflicts) and `$QUIRE_DATA_DIR/vault/` (the
  notes as files). Clients: IndexedDB database `quire`.

## Invariants

- The revision log is append-only; a deletion is a revision.
- The vault folder always mirrors heads; a file missing at startup is restored, never deleted.
- Every collision is merged on the server against one linear history, so devices converge.
- An unresolved hunk keeps both sides in a conflict record until a person decides.
- Live rooms commit through the same revision log; a push to a note with a live room first
  flushes the room, then applies the merged text to it.
