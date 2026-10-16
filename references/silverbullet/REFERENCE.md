---
# Machine-readable header. Agents read this block; keep keys stable.
id: silverbullet
name: SilverBullet
role: tracking
review_cadence: quarterly
source: open
license: MIT                  # LICENSE.md, Copyright 2022 Zef Hemel; Desktop app is separately licensed (Pro for work use)
included_on: 2026-10-16
last_reviewed: 2026-10-16
upstream:
  - path: upstream/silverbullet
    url: https://github.com/silverbulletmd/silverbullet
    branch: main
    pinned: 070a4881634b571c706ca949485d1298f131deae
---

# SilverBullet

## Why it is in the set

SilverBullet (v2.12.1 at the pin) is a self-hosted, browser-based Markdown notes app
whose space is a plain folder of `.md` files, with an offline-first PWA (service worker
plus IndexedDB copy of the whole space), a built-in object index and query language
over Markdown ("Markdown as a database"), and a plug and Space Lua extension system.
It answers two Quire questions from a different angle than Joplin: how a web/PWA client
keeps a full offline copy of a file-based vault, and how a thin file server can do
3-way merge with an inline, resolvable conflict representation instead of conflict
copies, while tolerating external editors writing the same files.

## How we use it

- **Role:** tracking. Watched for ideas; never drives Quire scope on its own. Its
  features enter the matrix only as "idea" rows.
- **Review cadence:** quarterly. Early review if upstream adopts CRDT sync (ADR 002
  says this may be revisited after the Rust backend) or changes its conflict format.
- **Borrow (ideas):**
  - Inline conflict hunks written into the file with deterministic, hash-labelled
    markers (base included), rendered as an in-editor widget with "accept both", "edit
    manually" and per-version choices; resolved by saving, no "mark resolved" step.
  - Server-side reconcile endpoint: client sends base text and its proposed text;
    server merges against current content (fast-forward, clean merge, conflicted, retry).
  - Line diff3 with word-level refinement inside colliding chunks.
  - Client keeps merge bases and "safety" copies of anything it replaced, with a
    recovery command.
  - Delete never silently beats an edit; the deletion is suppressed and the user notified.
  - Live, cursor-preserving application of external file changes to an open editor.
  - Markdown stays the source of truth; the index is disposable and rebuildable.
  - Git-backed history with attribution ("External" for edits made outside the app).
- **Reject:**
  - Whole-space full copy in browser IndexedDB as the only offline store: fine for a
    PWA, but Quire's Android app stores real files.
  - Poll-based sync (20 s space, 2 to 3 s open file) as the primary channel: Quire is
    live via Yjs while online.
  - Git-style markers persisted in the user's Markdown file as the conflict record:
    other tools see raw markers; Quire keeps conflict state beside the file (conflict
    card) and only renders markers in the UI.
  - Space Lua and SLIQ as a core feature: out of scope for a lean app.
  - Client encryption of the local cache only (no E2EE): not a model for Quire's
    security story.

## Product definition

| File | Contents |
| --- | --- |
| `product/features.md` | Feature inventory, grouped, with IDs (`SB-F-###`) |
| `product/ux-principles.md` | Interaction and design principles, with IDs (`SB-UX-##`) |
| `product/data-model.md` | Space files, object index, offline PWA storage, sync engine, conflicts, revisions, plugs |
| `product/visuals/README.md` | What to capture and where (captures are gitignored) |

## Upstream (open source only)

How to fetch and update the copy: `scripts/refs.sh update silverbullet`.

Paths worth reading first:

- `docs/Sync.md`, `docs/Collaboration.md`, `docs/Revisions.md`, `docs/ADR/001 Offline-First PWA.md`, `docs/ADR/002 Sync Engine.md` (ADR 002 predates the merge work; see data-model.md)
- `client/spaces/sync.ts` (sync engine: snapshot, per-file decisions, reconcile, conflict copies)
- `client/spaces/base_store.ts` (merge bases and safety copies)
- `client/service_worker.ts`, `client/service_worker/sync_engine.ts`, `client/service_worker/proxy_router.ts`
- `server/src/handlers/fs.rs` (`handle_fs_reconcile`, conditional PUT/DELETE)
- `server-merge/src/diff3.rs`, `refine.rs`, `markers.rs`
- `client/codemirror/syntax/conflict_markers.ts`, `client/external_merge.ts`
- `client/data/object_index.ts`, `plugs/index/`, `client/space_lua/`

## Review log

| Date | Reviewer | Upstream rev | Notes |
| --- | --- | --- | --- |
| 2026-10-16 | agent (Claude) | 070a4881634b571c706ca949485d1298f131deae | Initial inclusion (v2.12.1 plus edge). Rust server with 3-way reconcile and inline conflict markers; ADR 002 text ("does not merge") is outdated relative to code and `docs/Sync.md`. |
