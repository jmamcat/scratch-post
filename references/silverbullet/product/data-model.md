# SilverBullet: data model, offline storage, sync

All facts from the upstream at rev `070a4881634b571c706ca949485d1298f131deae`
(v2.12.1 plus edge, 2026-10-16) unless marked "(unverified)". Paths are relative to the
upstream root. MIT licensed.

## 1. Architecture in one paragraph

Three layers (`docs/Architecture.md`): the **client** (one per tab, TypeScript, CodeMirror
6, Preact) runs most logic including the editor, Space Lua, plugs and the object index;
the **service worker** (one per browser) caches the app, keeps a full IndexedDB copy of
the space, runs the sync engine and serves the `/.fs` HTTP API locally; the **server**
(Rust, `server/`, `server-common/`, since ADR 010) handles auth, serves the client and the
file API, watches the disk, merges concurrent writes and keeps Git-backed revisions.
SilverBullet Desktop is a native app around a local folder that can sync to a server.

## 2. Space and file model

- A **space** is a folder. Pages are `.md` files named by path (`Folder/Page Name.md`);
  every other file is a **document**. `index.md` and `CONFIG.md` are required; libraries
  live under `Library/` (`docs/Space.md`).
- Page metadata is plain Markdown: YAML frontmatter, `#hashtags`, inline
  `[key: value]` attributes, task syntax.
- Dot-prefixed paths are refused by the file API (2.12.1).
- File API (`server/src/router.rs`): `GET`/`HEAD`/`PUT`/`DELETE /.fs/<path>`,
  `POST /.fs/<path>` (reconcile, 8 MiB body limit), `GET /.fs` (listing),
  `GET /.events` (SSE change stream), `/.revisions/...` (history and Git conflicts).
  Revision identity is the SHA-256 of content plus `lastModified`.

## 3. Markdown as a database

- **Objects** (`docs/Object.md`, `client/data/object_index.ts`, `plugs/index/`): every
  page is parsed into typed objects: `page`, `task`, `item`, `paragraph`, `header`,
  `link`, `table`, `data`, `tag`, `anchor`, `relation`, `space-lua`, `aspiring-page`,
  `document` (`docs/Object/`). Each has `ref` (for example `page@pos`, or an anchor name),
  `tag` (its type), optional `tags`, inherited `itags`, plus custom attributes.
- **Storage:** IndexedDB key-value store in the client (`client/data/datastore.ts`,
  `kv_primitives.ts`). Every client builds its own index; first load indexes the whole
  space. Any page change (editor or file watcher) queues a reindex of that page.
- **Rule:** the index is derived, never authoritative; `Space: Reindex` rebuilds it.
- **Query:** Space Lua Integrated Query, `query[[from p = index.pages("tag") where ...
  order by ... select ...]]`, with group by, having, limit, offset and aggregates
  (`docs/Space Lua/Integrated Query.md`). Results render through `${...}` expressions and
  widgets that live-update.

## 4. Offline PWA storage

- Service worker (`client/service_worker.ts`) caches the client bundle and intercepts
  `/.fs` requests (`client/service_worker/proxy_router.ts`, `byte_range.ts` for media
  seeking). Reads hit IndexedDB; on network failure the client falls through to local data.
- **Synced set:** all pages; documents only when `sync.documents = true` (otherwise
  proxied to the server on demand); exclusions via `sync.ignore` gitignore patterns. Must
  be configured in `CONFIG.md` (`docs/Sync.md`).
- **Sync state** lives in the same KV store: the `SyncSnapshot` (section 5), merge bases
  under key prefix `["$sync","base",<sha256>]` and safety copies under
  `["$sync","safety",<sha256>]` (`client/spaces/base_store.ts`). `pruneSafety` drops
  safety copies older than 7 days, then the oldest until the total is under 50 MiB;
  unreferenced bases are pruned by `pruneBases`.
- **Client encryption** (optional, native auth only): AES-GCM for values, AES-CTR with a
  fixed counter for keys, 256-bit key from PBKDF2 over username and password, held only in
  service worker memory (`docs/Client Encryption.md`). Not end-to-end: the server stores
  plaintext.
- Trade-offs stated in ADR 001: full copy per browser, per-client index cold start,
  occasional forced full resync and reindex on schema changes, service worker lifecycle
  bugs.

## 5. Sync engine

Code: `client/spaces/sync.ts` (engine), `client/service_worker/sync_engine.ts` (scheduler),
`client/service_worker/dirty_queue.ts` (per-path work queue), `client/realtime_events.ts`.

- **Primary** = local IndexedDB space, **secondary** = server over HTTP.
- **Snapshot** per synced path: `files` = `[primaryLastModified, secondaryLastModified]`
  at last agreement; `remoteHashes` = last known server content hash (for `If-Match`);
  `baseHashes` = hash of last common content (for 3-way reconcile); `nonSyncedFiles`.
- **Schedule:** full space sync every 20 s (60 s while the SSE realtime channel is
  healthy), with jitter; the open file every 2 to 3 s; SSE events from `/.events` enqueue
  single-path syncs as an accelerator. Runs only while the service worker is alive.
- **Per-file decisions** (`syncFile`), comparing current `lastModified` on each side with
  the snapshot:

  | Situation | Action |
  | --- | --- |
  | New locally | Push with `If-None-Match: *` |
  | New remotely | Pull |
  | Changed locally only | Push with `If-Match: <remoteHash>`; 412 goes to reconcile |
  | Changed remotely only | Pull |
  | Deleted locally, unchanged remotely | Conditional delete; 412 means the remote changed, so pull back and emit `suppressedDeletion` |
  | Deleted remotely, changed locally | Recreate remotely, emit `suppressedDeletion` |
  | Changed on both sides (or sizes differ with equal timestamps) | `reconcileOrResolve` |

- **Reconcile** (`tryReconcile`): only for merge-eligible files (extension `md`, `txt`,
  `lua`, `css`, `json`, `yaml`, `yml`, `toml` or any `text/*` MIME, at most 1 MiB, valid
  UTF-8) with a stored base. Client sends `{ baseHash, baseText, proposedHash,
  proposedText, source }` to `POST /.fs/<path>`. Server (`reconcile_locked` in
  `server/src/handlers/fs.rs`), up to 3 attempts under a per-path lock:
  - file missing, or current = proposed, or current = base: apply proposed (`applied`);
  - current already contains SB markers, not UTF-8, or over 1 MiB: refuse (client falls
    back to conflict copy);
  - else `merge(base, proposed, current)` (`server-merge/src/diff3.rs`): line diff3, and
    for each colliding chunk a whitespace-token diff3 (`refine.rs`, chunks up to 8192
    bytes); clean result is `merged`; otherwise conflict markers are written and the
    result is `conflicted` (more than 100 conflicting hunks is refused);
  - if the file changed during the merge, retry; after the last attempt return `retry`.
  The client then writes the server's text locally only if its own content did not
  advance meanwhile (otherwise it records the proposal as the new base and resyncs), saves
  a safety copy of what it replaced, and stores the result as the new base.
- **Fallback conflict copy** (`primaryConflictResolver`, "primary wins"): if contents are
  byte-equal, nothing happens. Otherwise the secondary (server) version is written on both
  sides as `name.conflicted-<first 8 hex of sha256>.ext`, content-addressed so repeated
  resolution is idempotent, and the local version is pushed over the original. Used for
  binaries, oversized or non-text files, servers without reconcile, and `Library/Std`
  paths.
- **Open editor merges** (`client/external_merge.ts`): when the on-disk text changes
  under an open page, the change set from base to disk is mapped through the local unsaved
  edits (CodeMirror `ChangeSet`), applied as an undoable transaction and highlighted; if
  both touch the same chunk, the external update is deferred.

Note: `docs/ADR/002 Sync Engine.md` (2022, still "accepted") says sync "does not merge"
and writes conflicting copies. The code and `docs/Sync.md` / `docs/Collaboration.md`
(tagged `maturity/experimental`) show merge-first with copies only as fallback. The ADR
also records that real-time collaboration was added and removed in 2023 (PR 411) and that
CRDT sync was deferred, possibly revisited with the Rust backend.

## 6. Conflict representation and resolution

- **Format** (`server-merge/src/markers.rs`):

  ```
  <<<<<<< SB sha256:<hash of side with lower hash>
  ...lines...
  ||||||| SB BASE sha256:<base hash>
  ...base lines...
  =======
  ...lines of other side...
  >>>>>>> SB sha256:<hash of side with higher hash>
  ```

  Sides are ordered by hash, not by "mine/theirs", so output is deterministic.
  Plain Git markers (from Git remote sync) are also recognised.
- **UI** (`client/codemirror/syntax/conflict_markers.ts`): each hunk renders as an "edit
  conflict" widget with panels "Version 1", "Version 2", "Original" (Git: "This space",
  "Remote repository", "Common ancestor"); buttons "Accept both" (Git: "Keep both"),
  "Edit manually" (reveal raw markers), select a version, "Show comparison". The index
  plug also detects markers (`plugs/index/conflict.ts`) so conflicts are discoverable.
- **Resolution:** saving the page without markers resolves it; partially removed markers
  keep it open. Users are notified on conflict (`syncConflict` event) and on suppressed
  deletions.
- **Recovery:** `Sync: Recover Stale Revision` lists safety copies and inserts one.
- **Git remote conflicts** (`server/src/revisions/conflicts.rs`): "Git: Review conflicts"
  lists files; text files resolved by marker removal, binaries by explicit choice,
  delete/edit by keep or delete; sync resumes after all are resolved.

## 7. Revisions

Git-backed (`server/src/revisions/`, `docs/Revisions.md`): Managed mode creates a repo in
the space and commits about 30 s after activity stops (at least every 5 min; presets
Responsive, Balanced, Relaxed); Unmanaged reads an existing repo; Disabled. Commits are
attributed to the account, "SilverBullet", or "External" (detected disk changes). A
periodic safety reconcile commits changes the watcher missed. Page History shows diffs and
restores a version as one undo step; Space History lists commits. Optional Git remote sync
is described as a backup mechanism, not collaboration.

## 8. Plug system

- Plugs are JavaScript bundles (`*.plug.js`) compiled from TypeScript with a YAML manifest
  (`*.plug.yaml`, for example `plugs/sync/sync.plug.yaml`) declaring functions, commands,
  events and syscall permissions.
- Each plug runs in its own sandboxed Web Worker (`client/plugos/sandboxes/worker_sandbox.ts`)
  and talks to the app through syscalls (`client/plugos/syscalls/`, typed wrappers in
  `plug-api/syscalls/`). Plugs load, unload and update without restart.
- Built-in plugs: `index` (object indexer), `editor`, `sync`, `emoji`, `image-viewer`,
  `object-graph`, `configuration-manager` (`plugs/`).
- Distribution is via Libraries (Space Lua, templates and plug assets) installed through
  the Configuration Manager. Widgets and document editors run in sandboxed iframes
  (`client/sandbox/`).
- Space Lua (`client/space_lua/`) is now the primary user extension mechanism.

## 9. Ideas for Quire's sync (tracking only)

1. A **reconcile endpoint** where the client sends base and proposed text and the server
   merges against current content gives Quire's server one place to run the offline
   3-way merge, with "retry" when the file moves underneath.
2. **Word-level refinement inside colliding line chunks** reduces false conflicts versus
   Joplin's line-only merge; SilverBullet keeps it bounded (8 KiB chunks, 1 MiB files,
   100 hunks).
3. **Inline hunk widget** (both versions plus original, accept both, edit manually) is a
   good model for Quire's conflict card content; store the card beside the file rather
   than markers inside it.
4. **Safety copies** of anything a merge overwrote, plus a recovery command, are cheap
   insurance.
5. **Delete-vs-edit keeps the edit** and tells the user; Joplin agrees for remote
   deletes but lets a local permanent delete win.
6. **Conditional writes by content hash** (`If-Match`) replace timestamp comparisons.
7. **Deterministic conflict text** (hash-ordered) lets several nodes (cloud server and
   local node) compute identical results.

## 10. Paths worth reading first

| Path | Why |
| --- | --- |
| `docs/Sync.md`, `docs/Collaboration.md`, `docs/Revisions.md` | Current user-facing behaviour |
| `docs/ADR/001 Offline-First PWA.md`, `docs/ADR/002 Sync Engine.md`, `docs/ADR/010 Rust Backend.md` | Design history and trade-offs |
| `client/spaces/sync.ts` | Snapshot, per-file decisions, reconcile, conflict copies |
| `client/spaces/base_store.ts`, `client/sync_recovery.ts` | Merge bases and safety copies |
| `client/service_worker.ts`, `client/service_worker/sync_engine.ts`, `client/service_worker/dirty_queue.ts`, `client/service_worker/proxy_router.ts` | Offline PWA and scheduling |
| `server/src/handlers/fs.rs` | Conditional PUT/DELETE, `handle_fs_reconcile` |
| `server-merge/src/diff3.rs`, `refine.rs`, `markers.rs` | Merge and conflict format |
| `client/codemirror/syntax/conflict_markers.ts`, `client/external_merge.ts` | Conflict widget and live external edits |
| `client/data/object_index.ts`, `plugs/index/` | Markdown-as-database |
| `client/plugos/`, `plugs/` | Plug system |
