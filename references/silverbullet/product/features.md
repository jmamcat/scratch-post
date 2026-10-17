# SilverBullet: feature inventory

Upstream rev `070a4881634b571c706ca949485d1298f131deae` (v2.12.1 plus edge, 2026-10-16).
Tracking reference: inventory is focused on Markdown-as-database, offline PWA, sync and
conflicts, and plugs. "Rel." is relevance to Quire as an idea source: H high, M medium,
L low. Doc paths are under `docs/` in the upstream. Live docs: https://docs.silverbullet.md

ID scheme: `SB-F-###`. IDs are stable; never renumber, only append.

## Space and editing

| ID | Feature | Behaviour | Rel. | Source |
| --- | --- | --- | --- | --- |
| SB-F-001 | Space = folder of files | Pages are `.md` files, other files are "documents"; `index.md` and `CONFIG.md` required; editable by any other tool | H | `docs/Space.md` |
| SB-F-002 | Live Preview editor | CodeMirror 6 editor that hides Markdown syntax away from the cursor | M | `docs/Live Preview.md` |
| SB-F-003 | Wiki links and backlinks | `[[Page]]` links, aspiring (not yet existing) pages, Linked Mentions docked at the bottom | M | `docs/Link.md`, `docs/Linked Mention.md`, `docs/Aspiring Pages.md` |
| SB-F-004 | Frontmatter and attributes | YAML frontmatter, inline `[key: value]` attributes, hashtags; all become object attributes | M | `docs/Frontmatter.md`, `docs/Attribute.md` |
| SB-F-005 | Tasks | Task syntax with states, indexed as `task` objects | M | `docs/Task.md` |
| SB-F-006 | Page Picker, Command Palette, Anything Picker | Keyboard-first navigation | M | `docs/Page Picker.md`, `docs/Command Palette.md` |
| SB-F-007 | Documents and viewers | Non-Markdown files (images, PDF, audio, video, code) open in in-editor viewers | L | `docs/Document.md`, `docs/Document Editor.md` |
| SB-F-008 | Mobile keyboard bar | Programmable bar above the on-screen keyboard (2.12.0) | M | `docs/CHANGELOG.md` |

## Markdown as a database

| ID | Feature | Behaviour | Rel. | Source |
| --- | --- | --- | --- | --- |
| SB-F-009 | Object Index | Every page is parsed into objects (page, task, item, paragraph, header, link, table, data, tag, anchor, ...) stored in IndexedDB | M | `docs/Object.md`, `docs/Object Index.md`, `client/data/object_index.ts` |
| SB-F-010 | Markdown is the source of truth | Index is disposable; `Space: Reindex` rebuilds it from files; reindex queued on any page change, including external file changes | H | `docs/Object.md` |
| SB-F-011 | Tags as types | An object's `tag` is its table; `tags` and inherited `itags` add more | L | `docs/Tag.md` |
| SB-F-012 | Space Lua Integrated Query (SLIQ) | `query[[from ... where ... order by ... select ...]]`, SQL/LINQ-like, any clause order, aggregates | L | `docs/Space Lua/Integrated Query.md` |
| SB-F-013 | Schema | Optional attribute schemas per tag, with linting | L | `docs/Schema.md`, `client/space_lint.ts` |
| SB-F-014 | Object API (edge) | Update, create, delete objects in place in their Markdown source | L | `docs/CHANGELOG.md` (Edge) |
| SB-F-015 | Full-text and semantic search (edge) | Server-side full-text index and optional semantic index; `sb search` CLI | M | `docs/Search.md`, `server-search/` |

## Offline PWA

| ID | Feature | Behaviour | Rel. | Source |
| --- | --- | --- | --- | --- |
| SB-F-016 | Installable PWA | Service worker caches the client bundle; app loads with no network | M | `docs/PWA.md`, `client/service_worker.ts` |
| SB-F-017 | Full local copy in IndexedDB | Service worker keeps all synced space files in IndexedDB and serves the `/.fs` HTTP API locally | H | `docs/ADR/001 Offline-First PWA.md`, `client/service_worker/proxy_router.ts` |
| SB-F-018 | Selective sync | Pages always synced; documents fetched on demand unless `sync.documents = true`; `sync.ignore` gitignore patterns | H | `docs/Sync.md` |
| SB-F-019 | Client encryption of local cache | Optional AES (GCM values, CTR keys) encryption of IndexedDB with a PBKDF2 key held only in memory | L | `docs/Client Encryption.md` |
| SB-F-020 | Client wipe and logout | `Client: Wipe`, `Client: Logout` clear local data | M | `plugs/editor/editor.plug.yaml` |

## Sync and conflicts

| ID | Feature | Behaviour | Rel. | Source |
| --- | --- | --- | --- | --- |
| SB-F-021 | Bidirectional file sync | Service worker syncs whole space every ~20 s (60 s when the realtime channel is healthy) and the open file every 2 to 3 s | H | `docs/Sync.md`, `client/service_worker/sync_engine.ts` |
| SB-F-022 | Realtime change events | Server `/.events` SSE stream accelerates single-file sync | H | `client/realtime_events.ts`, `server/src/router.rs` |
| SB-F-023 | Conditional writes | PUT/DELETE with `If-Match` / `If-None-Match` on content hash; 412 routes into reconcile | H | `server/src/handlers/fs.rs`, `client/spaces/http_space_primitives.ts` |
| SB-F-024 | Server-side 3-way reconcile | `POST /.fs/<path>` with base and proposed text; server returns applied, merged, conflicted or retry | H | `server/src/handlers/fs.rs` (`reconcile_locked`), `server-merge/` |
| SB-F-025 | Word-aware merge | Line diff3, then whitespace-token diff3 inside colliding chunks (chunks <= 8 KiB) | H | `server-merge/src/refine.rs`, `docs/Collaboration.md` |
| SB-F-026 | Inline conflict markers | Unmergeable hunks written into the file as `<<<<<<< SB sha256:` / `\|\|\|\|\|\|\| SB BASE` / `=======` / `>>>>>>>` blocks, ordered by hash | H | `server-merge/src/markers.rs` |
| SB-F-027 | Conflict widget | Live Preview renders each hunk as an "edit conflict" widget: Version 1, Version 2, Original; "Accept both", "Edit manually", choose a version, "Show comparison"; Git conflicts labelled "This space" / "Remote repository" | H | `client/codemirror/syntax/conflict_markers.ts` |
| SB-F-028 | Conflict copies (fallback) | Binaries, files over 1 MiB, non-UTF-8, or servers without reconcile: losing version saved as `name.conflicted-<hash8>.ext` | H | `client/spaces/sync.ts` (`primaryConflictResolver`), `docs/Collaboration.md` |
| SB-F-029 | Delete never beats an edit | Edit vs remote delete recreates the file; local delete vs remote edit pulls it back; user notified ("suppressedDeletion") | H | `client/spaces/sync.ts`, `docs/Collaboration.md` |
| SB-F-030 | Safety copies and recovery | Client stores any local content it replaced during reconcile; `Sync: Recover Stale Revision` inserts one back | H | `client/spaces/base_store.ts`, `client/sync_recovery.ts`, `client/editor_commands.ts` |
| SB-F-031 | Live external edits | Changes to an open page (other users, scripts, agents, editors) applied as small cursor-preserving edits, undoable, highlighted with author label | H | `client/external_merge.ts`, `docs/Collaboration.md` |
| SB-F-032 | Manual sync commands | `Sync: Space`, `Sync: File`; progress circle in Top Bar | L | `plugs/sync/sync.plug.yaml`, `docs/Sync.md` |

## History, collaboration, server

| ID | Feature | Behaviour | Rel. | Source |
| --- | --- | --- | --- | --- |
| SB-F-033 | Git-backed revisions | Managed (auto-commit ~30 s after quiet, at least every 5 min), Unmanaged (read only), Disabled; attribution per account or "External" | H | `docs/Revisions.md`, `server/src/revisions/` |
| SB-F-034 | Page and space history | Colour-coded diff, content view, restore as one undo step; "Uncommitted changes" entry | H | `docs/Revisions.md`, `client/navigator/views/revisions.ts` |
| SB-F-035 | Git remote sync with conflict review | Fetch, merge, push to a remote; "Git: Review conflicts" with keep this, keep remote, keep both, edit; marker removal resolves | M | `docs/Revisions.md`, `server/src/revisions/conflicts.rs` |
| SB-F-036 | Accounts and multi-space server | Native auth, SSO, per-space access levels, Dashboard | L | `docs/Authentication.md`, `docs/Dashboard.md` |
| SB-F-037 | Desktop app | Native app keeping a local folder, optionally syncing to a server; Pro licence for work use | M | `docs/Desktop.md`, `docs/Desktop Sync.md`, `docs/Licensing.md` |

## Extensibility

| ID | Feature | Behaviour | Rel. | Source |
| --- | --- | --- | --- | --- |
| SB-F-038 | Plugs | `.plug.js` bundles (manifest `*.plug.yaml`) run in sandboxed Web Workers and call syscalls; commands, events, background tasks | L | `docs/Plugs.md`, `client/plugos/` |
| SB-F-039 | Space Lua | Lua dialect for commands, widgets, templates, event handlers, defined in pages | L | `docs/Space Lua.md`, `client/space_lua/` |
| SB-F-040 | Libraries | Shareable bundles of Space Lua, templates and plugs, installed via Configuration Manager | L | `docs/Library.md` |

Count: 40 features (SB-F-001 to SB-F-040).
