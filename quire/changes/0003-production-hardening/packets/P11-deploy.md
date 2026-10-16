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
status: done
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

Results:

- `playbook/bin/gate.sh check`: pass (typecheck, depcruise 239 modules / 0 violations, structure 25 modules / 0 violations / 6 pre-existing warnings; Python tooling runs through `uv run`).
- `QUIRE_NODE_IMAGE=mirror.gcr.io/library/node:22-bookworm-slim playbook/bin/gate.sh deploy`: 1 passed (`R-OPS-04 Compose up @deploy`, 1.1 min; image built, healthy, uid 10001, note survives `compose restart`; teardown left no containers, volumes or images).
- `playbook/bin/gate.sh scenarios "@cap-sync"`: 15 passed.
- By-hand smoke test: start with no token refuses; `quire tokens add` before first start; `local` profile healthy and replicating; backup now and verify; restore drill into an emptied data volume kept the tokens; Caddyfile passes `caddy validate`. Image size 369 MB.

## Decisions log

- **D-P11-1** · confidence: med
  - Question: `playbook/bin/gate.sh deploy` failed before any step: `pnpm --filter @quire/scenarios deploy` runs pnpm's built-in `deploy` command, not the script.
  - Did: `quire/package.json` script `scenarios:deploy` now calls `... run deploy` (a borrowed file, edited for a reason beyond its listed "uv" one, but Acceptance cannot pass without it).
  - Why: the deploy gate is part of this packet's Acceptance.
  - Reverse: rename the script in `quire/scenarios/package.json` (for example `deploy:stack`) and point `scenarios:deploy` at it.
- **D-P11-2** · confidence: med
  - Question: the image build in this sandbox failed with SELF_SIGNED_CERT_IN_CHAIN (corepack could not download pnpm through the TLS-inspecting proxy).
  - Did: the Dockerfile accepts an optional build secret `extra_ca` (used as `NODE_EXTRA_CA_CERTS` only during `pnpm install`, never stored in the image); `compose.yaml` passes the file named by `QUIRE_BUILD_CA` (default `/dev/null`, ignored); the deploy steps set `QUIRE_BUILD_CA` from `QUIRE_BUILD_CA` or else the test process's `NODE_EXTRA_CA_CERTS`, so the Acceptance command works unchanged here.
  - Why: `adapters/environments.md` says to record environment workarounds; no secret reaches the image.
  - Reverse: delete the `secrets` blocks in `compose.yaml`, the two `--mount=type=secret` lines in `Dockerfile` and the `ca` lines in `deploy.steps.ts`. Consider a note in `playbook/adapters/environments.md` (not owned here).
- **D-P11-3** · confidence: med
  - Question: "the cloud service gets `QUIRE_TRUST_PROXY=1`" in the `tls` profile; Compose cannot set a variable on one service only when a profile is active.
  - Did: `QUIRE_TRUST_PROXY: ${QUIRE_TRUST_PROXY:-0}` on `cloud`; README and `.env.example` tell the operator to set `QUIRE_TRUST_PROXY=1` (and optionally `COMPOSE_PROFILES=tls`) in `.env` for TLS.
  - Why: a default of 1 would let direct clients spoof `X-Forwarded-For` for the failed-login throttle.
  - Reverse: default to `1` in `compose.yaml` if TLS is the main deployment, or add a `compose.tls.yaml` override.
- **D-P11-4** · confidence: med
  - Question: which address the cloud port is published on.
  - Did: `${QUIRE_BIND:-127.0.0.1}:${QUIRE_HOST_PORT:-8787}:8787`, loopback by default (local node 8788). `QUIRE_BIND=0.0.0.0` serves the network without TLS.
  - Why: hardening module, "defaults are the product"; Caddy reaches the cloud service over the Compose network.
  - Reverse: change the default of `QUIRE_BIND` in `compose.yaml`.
- **D-P11-5** · confidence: med
  - Question: the server runs TypeScript through `tsx` (no compile step exists).
  - Did: the image keeps `tsx` (a production dependency of the server) and the `quire` shim runs `cli.ts` through it; `init: true` in Compose. The runtime stage holds production dependencies, `packages/`, `apps/server` and the built web app only (369 MB).
  - Why: adding a server build step would touch packages owned by others.
  - Reverse: add a bundling step in a later change and shrink the image.
- **D-P11-6** · confidence: high
  - Question: how the stack reads its env file when the gate needs a generated one.
  - Did: `env_file: path: ${QUIRE_ENV_FILE:-.env}, required: false`; the gate writes a temp env file, sets `QUIRE_ENV_FILE`, passes `--env-file`, a unique project name and a unique image tag, and removes the tag afterwards. With no `.env` the server refuses to start.
  - Reverse: plain `env_file: .env`.
- **D-P11-7** · confidence: high
  - Question: `.dockerignore` versus the pnpm lockfile.
  - Did: `quire/scenarios/package.json` and `quire/apps/android/package.json` are re-included, because `pnpm install --frozen-lockfile` needs every workspace project; the rest of those folders is excluded.
- **D-P11-8** · confidence: high
  - Question: `QUIRE_DOMAIN` for the `caddy` service.
  - Did: default `localhost`; a required variable broke every `compose` command when the profile was unused (found by the gate).
