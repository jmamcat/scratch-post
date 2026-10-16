# Quire

A lean Markdown store and renderer with Notion/Confluence-class essentials and
Obsidian's defaults. Notes are plain `.md` files; the same TypeScript code runs a cloud
server, a local node that may be switched off, and an offline-capable web/Android client.
Edits made anywhere, online or offline, converge; anything that cannot merge safely goes
to a review inbox instead of being lost.

Built with the RefSpec playbook: see `../playbook/`, the reference set in `../references/`,
and the specs in `changes/0001-mvp-foundation/` (moved to `spec/` when archived).

## Layout

| Path | What |
| --- | --- |
| `packages/core` | Obsidian Flavored Markdown parsing and rendering, link resolution, search, three-way merge |
| `packages/sync` | Sync protocol, server push handler, client engine, HTTP transport |
| `apps/server` | Hono API, SQLite revision log, vault folder mirror, Yjs live rooms, local node replicator |
| `apps/web` | Local-first React client (IndexedDB, CodeMirror, review inbox) |
| `apps/android` | Capacitor wrapper around the web build |

## Run it

Requires Node 22.13+ and pnpm 10.

```sh
pnpm install
pnpm check                 # typecheck + unit tests
pnpm start                 # build the web client, serve everything on :8787
```

Development: `pnpm dev:server` and `pnpm dev:web` (Vite on :5173, proxies to :8787).

### Cloud server

```sh
QUIRE_DATA_DIR=/srv/quire QUIRE_TOKEN=change-me pnpm start
```

The vault folder is `$QUIRE_DATA_DIR/vault`. It is a normal Obsidian-compatible folder.

### Local node

```sh
QUIRE_MODE=local QUIRE_UPSTREAM=https://quire.example.com QUIRE_UPSTREAM_TOKEN=change-me \
QUIRE_DATA_DIR=~/quire QUIRE_DEVICE=desktop pnpm start
```

It serves its own clients, replicates with the cloud every 10 s and after local edits,
and keeps working while the cloud is unreachable. You can open `~/quire/vault` in
Obsidian at the same time; edits made there are picked up.

### Android

See `apps/android/README.md`.

## Configuration

| Variable | Default | Meaning |
| --- | --- | --- |
| `QUIRE_DATA_DIR` | `./.data` | SQLite database and `vault/` folder |
| `QUIRE_PORT` | `8787` | HTTP, SSE and WebSocket port |
| `QUIRE_MODE` | `cloud` | `cloud` or `local` |
| `QUIRE_DEVICE` | host name | Device name shown on revisions and conflicts |
| `QUIRE_TOKEN` | none | Require `Authorization: Bearer <token>` |
| `QUIRE_UPSTREAM`, `QUIRE_UPSTREAM_TOKEN` | none | Cloud server for `local` mode |
| `QUIRE_WEB_DIST` | `apps/web/dist` | Built web client to serve |
| `QUIRE_WATCH` | `1` | Set `0` to stop watching the vault folder |
