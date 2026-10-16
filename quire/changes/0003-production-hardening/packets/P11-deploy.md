---
id: 0003-production-hardening/P11
title: Container image, Compose stack, uv for Python tooling
lane: E
depends_on: [P01, P03, P10]
owns:
  - Dockerfile
  - .dockerignore
  - compose.yaml
  - deploy/**
  - pyproject.toml
  - quire/scenarios/steps/deploy.steps.ts
borrows:
  - playbook/bin/check-structure.py  # PEP 723 header only
  - playbook/bin/spec-scenarios.py  # PEP 723 header only
  - playbook/bin/usage.py  # PEP 723 header only
  - playbook/bin/archive-change.py  # PEP 723 header only
  - quire/package.json  # run Python tooling through uv
  - quire/scenarios/package.json  # run spec-scenarios through uv
  - AGENTS.md  # gates: uv and the deploy gate
reads:
  - quire/changes/0003-production-hardening/**
  - quire/spec/**
  - quire/**
  - playbook/adapters/environments.md
  - playbook/modules/hardening/README.md
size: M
revision: 1
status: doing
claimed_by: claude-code/tier-B
---

# Container image, Compose stack, uv

## Context

Implements R-OPS-04 (`quire/changes/0003-production-hardening/spec/ops/spec.md`) and the
environment conventions in `playbook/adapters/environments.md` (read it first; follow it).
Deployments use Docker and Compose; Python tooling (the playbook scripts) runs through `uv`.
The server's command line is `apps/server/src/cli.ts` (`serve`, `tokens`, `backup`,
`restore`, `compact`); `/api/health` is open, `/api/ready` is open, the rest needs a token.

This environment cannot pull from Docker Hub (rate limited); `mirror.gcr.io/library/node:...`
works. A Docker daemon may need starting: if `docker info` fails, run `dockerd` in the
background (logs to a file in your scratch space) and wait for it.

## Contract

- `Dockerfile`: `ARG NODE_IMAGE=node:22-bookworm-slim`, multi-stage (install with the
  lockfile through corepack pnpm, build the web app, keep only what the server needs at run
  time), runtime as a non-root user with a fixed uid, `QUIRE_DATA_DIR=/data`,
  `QUIRE_BACKUP_DIR=/backups`, both volumes, `EXPOSE 8787`, `HEALTHCHECK` on `/api/health`
  without curl (use `node -e`), a `quire` command on the `PATH` running `cli.ts`, default
  command `serve`. No secrets in the image.
- `.dockerignore` keeps `node_modules`, data folders, references and test output out.
- `compose.yaml`: service `cloud` (build, `env_file: .env`, named volumes for data and
  backups, `restart: unless-stopped`, health check), profile `local` with a `local` service
  (`QUIRE_MODE=local`, `QUIRE_UPSTREAM=http://cloud:8787`), profile `tls` with a Caddy service
  in front (`deploy/Caddyfile`, automatic HTTPS for `${QUIRE_DOMAIN}`, the cloud service gets
  `QUIRE_TRUST_PROXY=1`). Image names come from variables so mirrors can be used.
- `deploy/.env.example` (every `QUIRE_*` setting with a comment; `QUIRE_TOKEN=` empty) and
  `deploy/README.md`: first start, adding tokens (`docker compose exec cloud quire tokens add
  laptop`), backups off-host (copy the backups volume), restore, upgrade (pull, `docker
  compose up -d`; migrations run with a backup first), local node, TLS.
- **uv**: `pyproject.toml` at the root for the tooling (no dependencies, `requires-python`
  `>=3.11`, `[tool.uv] package = false`), PEP 723 headers on the playbook scripts, and every
  script call in `quire/package.json` and `quire/scenarios/package.json` through `uv run`.
- Steps (`quire/scenarios/steps/deploy.steps.ts`, `@deploy`, run only by
  `playbook/bin/gate.sh deploy`): build the image (pass `NODE_IMAGE` from
  `QUIRE_NODE_IMAGE` when set), start the stack under a unique project name on a free port
  with a generated token, wait for `healthy`, check `id -u` in the container is not 0,
  write a note through the API with the token, `docker compose restart`, read it back, and
  always `docker compose down -v` at the end.

## Acceptance

```sh
playbook/bin/gate.sh check
QUIRE_NODE_IMAGE=mirror.gcr.io/library/node:22-bookworm-slim playbook/bin/gate.sh deploy
playbook/bin/gate.sh scenarios "@cap-sync"
```

## Decisions log
