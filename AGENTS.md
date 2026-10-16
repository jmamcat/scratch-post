# Agent guide

This repository follows **RefSpec** (`method/README.md`). Read this file first, on any
harness and with any model.

## Where things are

| Path | What |
| --- | --- |
| `method/` | The methodology: roles, spec format, run protocol, templates |
| `references/` | Reference products (Notion, Confluence, Obsidian, Joplin, SilverBullet) |
| `references/feature-matrix.md` | Which reference features Quire adopts, adapts, defers or rejects |
| `quire/` | The target product: a lean Markdown storage and rendering system |
| `quire/spec/` | Living specs (source of truth for behaviour) |
| `quire/changes/` | Change proposals with packets; `archive/` holds finished ones |
| `scripts/refs.sh` | Fetch or update upstream copies of open-source references |
| `scripts/packet-prompt.sh`, `scripts/run-lanes.sh` | Run packets with any agent CLI |
| `remote-projects/` | Unrelated starter scaffold, kept for later |

## Rules

1. Work from a packet (`quire/changes/<change>/packets/P*.md`). Follow
   `method/run-protocol.md`: edit only the packet's `owns` paths, never block, log
   decisions, done means acceptance commands pass.
2. Behaviour questions are answered by `quire/spec/` first, then the baseline reference
   (Obsidian), then a primary reference for that domain.
3. `references/*/upstream/` are read-only submodules. Fetch them with
   `scripts/refs.sh fetch <id>`. Never copy code from them into `quire/`; Joplin is AGPL.
4. Never commit screenshots of closed-source products. `product/visuals/captures/` is
   gitignored for that reason.
5. No model names in code, comments or commit messages.

## Quire commands

Run from the repo root:

```sh
pnpm -C quire install
pnpm -C quire check        # typecheck + tests for every package
pnpm -C quire dev:server   # cloud or local node on :8787
pnpm -C quire dev:web      # web client on :5173
```
