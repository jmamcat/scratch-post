# Environment adapters

How a project's build, gates and deployment run. The playbook needs none of this; it is the
convention for projects that deploy with containers and keep Python tooling (such as the
playbook's own scripts) reproducible.

## Python tooling: uv

- The playbook's scripts in `bin/` are standard-library Python with a PEP 723 header, so
  `uv run playbook/bin/<script>.py` runs each with a matching interpreter and no virtual
  environment to manage. Plain `python3 playbook/bin/<script>.py` keeps working.
- A project with its own Python tooling adds a root `pyproject.toml` (`requires-python`,
  dependencies, `[tool.uv] package = false` when it is tooling, not a library) and commits
  `uv.lock` when it has dependencies.
- Gate commands call Python through `uv run`, so a fresh machine needs only `uv` (it fetches
  the interpreter when the system has none).

## Containers: Docker and Compose

- **Image**: multi-stage; the build stage installs with the lockfile and builds; the runtime
  stage holds only what runs. Base images come from a build argument (`ARG NODE_IMAGE=...`)
  so a registry mirror can replace the default when the default is rate limited.
- **Runtime**: a fixed non-root uid; state only in declared volumes (data, backups); a
  `HEALTHCHECK` that needs no extra tools; one CLI on the `PATH` for admin commands
  (`docker compose exec <service> <cli> ...`); no secrets in the image.
- **Compose**: the core service always; optional parts behind profiles (a second node, a TLS
  proxy); `env_file` for settings and secrets with a committed `.env.example` that documents
  every variable; named volumes; `restart: unless-stopped`.
- **TLS**: terminate at a proxy (Caddy gives automatic HTTPS); tell the app to trust the
  proxy's forwarded headers only through an explicit setting.
- **Deploy gate**: a `@deploy` scenario builds the image, starts the stack under a unique
  project name, checks health and the user id, writes data, restarts, reads it back, and
  always tears down with `docker compose down -v`. It runs only through the `deploy` gate.

## Sandboxed agent environments

Cloud agent containers often lack a running Docker daemon or hit registry rate limits.
Packets that need Docker say how to start the daemon (`dockerd` in the background) and which
mirror works (for Docker Hub's official images, `mirror.gcr.io/library/<image>` was
reliable when this was written). Record such workarounds in the packet's decisions log.

Agent sandboxes often inspect TLS with their own certificate authority, so package managers
inside a `docker build` fail with `SELF_SIGNED_CERT_IN_CHAIN`. Pass the authority as an
optional BuildKit secret (`RUN --mount=type=secret,id=extra_ca ...` with
`NODE_EXTRA_CA_CERTS` pointing at it for that step only), never as a file copied into the
image; default the secret to `/dev/null` so normal builds ignore it.
