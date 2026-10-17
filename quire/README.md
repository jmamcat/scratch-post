# Quire

A lean Markdown store and renderer with Notion/Confluence-class essentials and
Obsidian's defaults. Notes are plain `.md` files; the same TypeScript code runs a cloud
server, a local node that may be switched off, and an offline-capable web/Android client.
Edits made anywhere, online or offline, converge; anything that cannot merge safely goes
to a review inbox instead of being lost.

Built with the RefSpec playbook: see `../playbook/`, the reference set in `../references/`,
the living specs in `spec/` (finished changes are in `changes/archive/`), and the code map
in `ARCHITECTURE.md`.

## Layout

| Path | What |
| --- | --- |
| `packages/vault` | Path rules and front matter |
| `packages/render` | Obsidian Flavored Markdown parsing and rendering |
| `packages/navigate` | Link resolution, link index, offline search |
| `packages/merge` | Three-way merge with collision tiers |
| `packages/sync` | Sync protocol, server push handler, client engine, HTTP transport |
| `apps/server` | Hono API, SQLite revision log, vault folder mirror, Yjs live rooms, local node replicator |
| `apps/web` | Local-first React client (IndexedDB, CodeMirror, review inbox) |
| `apps/android` | Capacitor wrapper around the web build |
| `scenarios` | The scenario suite, generated from the specs |
| `demo` | Seed vault, one-command demo, walkthrough |

## Run it

Requires Node 22.13+ and pnpm 10.

```sh
pnpm install
pnpm check                 # types, dependency rules, structure rules
pnpm scenarios             # every spec scenario: real servers, real clients, real browser
pnpm demo                  # cloud server + local node with seed data (demo/WALKTHROUGH.md)
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

**What a local node replicates (R-SYN-09).** Notes and attachments, both ways. The node
keeps the bytes of every attachment, so its clients open files without the cloud. Renames
arrive as renames on both sides, so a note's history survives a rename made on either.
(0.1.0 replicated notes only.)

### Android

See `apps/android/README.md`.

## Configuration

Every setting, with its default and meaning, is in `../deploy/.env.example`. The ones you
need first:

| Variable | Default | Meaning |
| --- | --- | --- |
| `QUIRE_DATA_DIR` | `./.data` | SQLite database, `vault/` folder and attachment store |
| `QUIRE_PORT` | `8787` | HTTP, SSE and WebSocket port |
| `QUIRE_MODE` | `cloud` | `cloud` or `local` |
| `QUIRE_TOKEN` | none | The `admin` token; without it (or a token added with `quire tokens add`) the server refuses to start |
| `QUIRE_BACKUP_DIR` | none | Folder for backup bundles; backups are off without it |
| `QUIRE_UPSTREAM`, `QUIRE_UPSTREAM_TOKEN` | none | Cloud server for `local` mode |
| `QUIRE_ALLOWED_ORIGINS` | none | Extra browser origins allowed to call the API, comma separated |
| `QUIRE_INSECURE_NO_AUTH` | unset | `1` runs with no token, for development only |

Admin commands: `quire tokens add|list|revoke`, `quire backup now|verify|list`,
`quire restore`, `quire compact` (`apps/server/src/cli.ts`; in Docker, `docker compose exec
cloud quire ...`).
