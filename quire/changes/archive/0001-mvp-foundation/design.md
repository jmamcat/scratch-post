# Design: 0001 MVP foundation

## Goals

- Markdown files are the storage format. A Quire vault on disk is a valid Obsidian vault.
- One TypeScript codebase serves three platforms: cloud server, local node (a server that
  may be switched off), and an offline-capable client (browser and Android).
- Any device can edit while offline. All devices converge once they sync, and no edit is
  ever silently lost.
- Collisions are handled in three tiers: merged silently, auto-resolved but flagged for
  review, or held for a human decision.

## Non-goals (this change)

Databases/Bases views, Canvas, plugins, end-to-end encryption, multi-user permissions,
attachments other than images referenced by path, rename tracking across offline devices.

## Topology

```
              ┌──────────────────────────┐
              │  Cloud server (mode=cloud)│  always on, authority for the vault
              │  revision log + vault/    │
              └───▲────────▲───────▲─────┘
       HTTP+SSE+WS│        │       │HTTP (replicator, as a device)
                  │        │   ┌───┴───────────────────────┐
     ┌────────────┴─┐  ┌───┴─┐ │ Local node (mode=local)    │ may be off
     │ Web client    │  │ App │ │ own revision log + vault/  │ vault/ editable by Obsidian
     │ IndexedDB     │  │(Cap)│ └───▲───────────────────────┘
     └───────────────┘  └─────┘     │ LAN clients use it like a cloud server
```

Every client keeps a full copy of the vault locally (IndexedDB), so it works offline.
A local node is itself a sync client of the cloud server: it syncs its head documents
upstream through the same client engine the browser uses.

## Packages

| Package | Role | Runs on |
| --- | --- | --- |
| `@quire/core` | Markdown parsing and rendering (Obsidian Flavored Markdown), front matter, link and tag extraction, link resolution, three-way merge | everywhere |
| `@quire/sync` | Protocol types, server-side push handler (pure, storage-agnostic), client sync engine with pluggable local store and transport | everywhere |
| `@quire/server` | Hono HTTP API, SSE events, Yjs WebSocket rooms, SQLite revision store, vault mirror on disk, upstream replicator | Node 22 |
| `@quire/web` | React UI, IndexedDB store, CodeMirror editor, conflict review | browser, Capacitor WebView |
| `@quire/android` | Capacitor wrapper around the web build | Android |

## Storage model

- A document is identified by its vault-relative path, `/`-separated, ending in `.md`.
- The server keeps an append-only **revision log**. Each revision has a vault-wide
  monotonically increasing `rev` (integer), `path`, `hash` (SHA-256 of the text, hex),
  full `text` (or `deleted`), `device`, and `createdAt`.
- The **head** of a path is its latest revision. The vault folder on disk always mirrors
  heads: a deleted head removes the file.
- Front matter is plain YAML at the top of the file, exactly as Obsidian writes it.
- SQLite (`node:sqlite`, built into Node 22) holds revisions, heads and conflicts.
- Files changed on disk by another program (for example Obsidian on the local node) are
  committed as revisions from device `disk` by a startup scan and a file watcher.

## Sync protocol (offline path)

The client stores, per document: `text`, `baseRev`, `baseText` (the text of `baseRev`),
`deleted`, and is **dirty** when `text !== baseText` or a deletion is pending. It also
stores a feed `cursor`.

One sync cycle:

1. **Push** every dirty document: `{ path, baseRev, text | null }`.
2. The server handles each item against its head:
   - `baseRev === head.rev` (fast-forward): commit, reply `applied`.
   - Item text equals head text: reply `noop` with the head rev.
   - Otherwise three-way merge with `base = text@baseRev`, `current = head text`,
     `incoming = pushed text`:
     - no conflicts and nothing flagged: commit merged text, reply `merged` with the text;
     - only auto-resolved hunks: commit, open a conflict record with status `review`,
       reply `merged` with the text and the conflict id;
     - unresolved hunks: commit the **provisional** text (current side wins in each
       unresolved hunk, so nothing changes for people already reading it), open a
       conflict record with status `open` that stores both sides, reply `conflict`.
   - Delete against an edited head, or edit against a deleted head: the edit wins and a
     `delete-edit` conflict record with status `open` is created.
3. The client adopts any returned text as its new `baseText`/`text`. If the user typed
   during the round trip, the client rebases with
   `merge3(base = pushed text, current = returned text, incoming = editor text)`.
4. **Pull** the change feed since `cursor`. For each change newer than the local
   `baseRev`: a clean local document fast-forwards to it; a dirty one is left alone and
   merges on the next push.

Because every collision is resolved on the server against a single linear history, all
clients converge to the server's heads after one quiet cycle each.

### Resolving a conflict

A conflict record stores the merge as **segments**: stable text runs and hunks
(`{ id, kind, base, current, incoming, resolution? }`). Resolving means choosing, per
hunk, `current`, `incoming`, `both` (current then incoming) or custom text. The server
turns the choices into a full text and applies it as an ordinary push with
`baseRev = conflict.rev`, so edits made after the conflict was created are merged rather
than overwritten.

## Merge engine (`@quire/core/merge`)

`merge3(base, current, incoming)` returns `{ text, segments, conflicts, autoResolved }`.

1. **Front matter** is split from the body when all three sides have parseable YAML maps.
   Keys merge independently (deep equality on values). A key changed differently on both
   sides is a `property` hunk. If only one side touched front matter, its raw text is
   kept byte for byte.
2. **Body** is merged line by line with diff3 (`node-diff3`).
3. Each conflicting line hunk goes through rules, in order:
   1. `false-conflict`: both sides made the same change. Merged silently.
   2. `whitespace`: sides differ only in whitespace. Take current. Merged silently.
   3. `intraline`: re-merge the hunk word by word; if that is clean, use it. Flagged
      for review, because two edits to one paragraph deserve a glance.
   4. `both-inserted`: base is empty and both sides inserted text (for example two
      devices appending to a daily note). Keep current then incoming. Flagged for review.
   5. Otherwise the hunk is unresolved (`kind: text`).

## Live co-editing (online path)

- Each open document can join a Yjs room at `ws://<server>/live?path=<path>`, using the
  standard y-websocket wire protocol (sync and awareness messages), so the stock
  `y-websocket` client provider works.
- The server seeds a new room from the head text into `Y.Text("content")`. Clients never
  seed: they always receive state from the server.
- The server commits the room's text as a revision from device `live` 1.5 s after the
  last update (at most every 10 s while typing continues) and when the last client leaves.
- When a push or a conflict resolution changes a document with an active room, the server
  first flushes the room (commits pending live text), merges against that head, then
  applies the resulting text to `Y.Text` as a minimal character diff. Live editors see
  the change appear in place.
- `GET /api/events` (Server-Sent Events) announces every commit (`{ path, rev, hash, device }`)
  and every conflict change, so clients know when to pull.
- A client that drops offline keeps editing its local copy, which is now dirty against the
  last committed revision it knows; on reconnect it pushes (offline path) before rejoining
  the room.

## HTTP API

All bodies are JSON. Paths are passed as the `path` query parameter.

| Method | Route | Body / query | Reply |
| --- | --- | --- | --- |
| GET | `/api/health` | | `{ ok, mode, device, rev }` |
| GET | `/api/docs` | | `DocMeta[]` (heads, not deleted) |
| GET | `/api/doc` | `path`, optional `rev` | `{ meta: DocMeta, text }` |
| GET | `/api/history` | `path` | `DocMeta[]`, newest first |
| POST | `/api/sync/push` | `PushRequest` | `PushResult[]` |
| GET | `/api/sync/changes` | `since` | `ChangeFeed` |
| GET | `/api/conflicts` | optional `status` | `Conflict[]` |
| GET | `/api/conflicts/:id` | | `Conflict` |
| POST | `/api/conflicts/:id/resolve` | `Resolution` | `PushResult` |
| POST | `/api/conflicts/:id/dismiss` | | `Conflict` (only for status `review`) |
| GET | `/api/events` | | SSE stream of `ServerEvent` |
| WS | `/live` | `path` | y-websocket protocol |

If `QUIRE_TOKEN` is set, every route requires `Authorization: Bearer <token>`
(WebSocket and SSE accept `?token=` because browsers cannot set headers on them).

## Client

- Local-first: the UI only reads and writes the local store; the sync engine runs in the
  background (on start, on `online`, on SSE events, 1 s after edits, every 30 s).
- Search, backlinks, tags and the outline are computed from the local store with
  `@quire/core`, so they work offline.
- The UI follows Obsidian's defaults: left file tree, editor in the centre (source mode
  with a reading-view toggle), right pane with backlinks, outgoing links, outline and
  properties, quick switcher (Ctrl/Cmd+O), command palette (Ctrl/Cmd+P), daily note
  (`YYYY-MM-DD.md` in the vault root).
- Review inbox: a badge in the status bar counts open conflicts. Each card shows the file,
  the two devices and times, and every hunk side by side with buttons Keep current, Keep
  incoming, Keep both, Edit. Auto-resolved items sit under "Review suggested" with
  Accept (dismiss) and Change. A note with an open conflict shows a banner linking to its card.
- Version history drawer: list revisions, preview one, restore it (restore is an edit).

## Platforms

| Platform | How | Offline |
| --- | --- | --- |
| Cloud server | `QUIRE_MODE=cloud node apps/server` serves API, WebSocket and the web build | n/a (authority) |
| Local node | `QUIRE_MODE=local QUIRE_UPSTREAM=https://cloud...` replicates every 10 s and on events; when the cloud is unreachable it keeps serving LAN clients | yes, toward cloud |
| Web client | any browser; installable PWA later | yes (IndexedDB) |
| Android | Capacitor wraps the web build; server URL set in Settings | yes (IndexedDB in WebView) |

Building the Android APK needs the Android SDK, which is not available in the agent
container; the packet scaffolds the project and documents the build.

## Risks

- Path identity means a rename on one offline device and an edit on another become a
  delete-edit conflict plus a new file. Accepted for the MVP; rename tracking is a follow-up.
- Full text per revision grows storage. Fine for notes; compaction is a follow-up.
- `node:sqlite` prints an experimental warning on Node 22; it is stable enough for this
  use and avoids native builds on every platform.
