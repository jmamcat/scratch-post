# Deploying Quire with Docker Compose

One image runs the server as a non-root user (uid 10001). State lives in two volumes
(`/data` for the vault and database, `/backups` for backup bundles). Settings and secrets come
from an env file, never from the image. Run every command below from the repository root.

| File | What |
| --- | --- |
| `../Dockerfile` | Multi-stage image: builds the web app, ships only what the server runs |
| `../compose.yaml` | Service `cloud`; profile `local` adds a local node; profile `tls` adds Caddy |
| `.env.example` | Every `QUIRE_*` setting with a comment |
| `Caddyfile` | Automatic HTTPS for `${QUIRE_DOMAIN}` |

## First start

```sh
cp deploy/.env.example .env
# Pick one:
#   a) set QUIRE_TOKEN in .env to a long random value (openssl rand -hex 32), or
#   b) leave it empty and create named tokens first (see "Adding tokens")
docker compose up -d --build
docker compose ps          # the cloud service turns "healthy" within about 30 seconds
curl http://127.0.0.1:8787/api/health
```

The server refuses to start with no token at all and says so in `docker compose logs cloud`.
The cloud service is published on `127.0.0.1:8787` only; see "TLS" to serve it to others.
If Docker Hub rate limits the build, set `QUIRE_NODE_IMAGE=mirror.gcr.io/library/node:22-bookworm-slim` in `.env`.

## Adding tokens

Each person or device gets its own token. It is printed once; only a hash is stored.

```sh
docker compose exec cloud quire tokens add laptop
docker compose exec cloud quire tokens list
docker compose exec cloud quire tokens revoke laptop     # live connections close at once
```

Before the first start (nothing is running yet), use a one-off container instead:
`docker compose run --rm --no-deps cloud quire tokens add laptop`.

## Backups

The server writes chained, verified backup bundles to the `quire-backups` volume
(`/backups` in the container) and reports the last backup in `/api/ready` and `/api/metrics`.

```sh
docker compose exec cloud quire backup now
docker compose exec cloud quire backup verify
docker compose exec cloud quire backup list
```

**A backup that lives next to the data is not a backup.** Copy the volume off the host:

```sh
docker compose cp cloud:/backups ./backups-copy
tar czf quire-backups-$(date +%F).tgz -C backups-copy .
```

Run it from cron and ship the archive somewhere else. Test a restore now and then.

## Restore

Restoring needs an empty data folder. This replaces everything in the data volume, so copy
the backups off the host first (above).

```sh
docker compose stop cloud
docker compose run --rm --no-deps --entrypoint sh cloud -c 'rm -rf /data/* /data/.[!.]*'
docker compose run --rm --no-deps cloud quire restore /backups --to /data            # latest state
# or to an earlier revision:  quire restore /backups --to /data --at <rev>
docker compose up -d
```

To restore on a new machine, unpack the archive into a folder (`backups-copy`), start nothing
else, and run the restore from that folder instead of the volume:

```sh
docker compose run --rm --no-deps -v "$PWD/backups-copy:/restore-from:ro" cloud quire restore /restore-from --to /data
docker compose up -d
```

## Upgrade

Migrations run on start, with a backup first, so an upgrade needs no extra step.

```sh
git pull                              # build from source, or:  docker compose pull   (QUIRE_IMAGE from a registry)
docker compose up -d --build          # recreates only what changed; volumes stay
docker compose logs --tail 50 cloud
```

To roll back, check out the previous version, `docker compose up -d --build` again, and, if
the data schema had changed, restore the backup taken before the migration (see "Restore").

## Local node

A local node keeps its own copy of the vault and replicates to the cloud service, so notes
work with no network.

```sh
docker compose --profile local up -d
```

It listens on `127.0.0.1:8788`, uses `QUIRE_TOKEN` as its own token and as the token to the
cloud service, and keeps its data in the `quire-local-data` volume. To replicate to a server
somewhere else, run the image with `QUIRE_MODE=local`, `QUIRE_UPSTREAM=https://...` and
`QUIRE_UPSTREAM_TOKEN=...`.

## TLS

The `tls` profile puts Caddy in front of the cloud service and gets certificates for your host
name by itself.

1. Point a DNS name at the machine and open ports 80 and 443.
2. In `.env` set `QUIRE_DOMAIN=notes.example.com` and `QUIRE_TRUST_PROXY=1` (the server then
   reads the client address from Caddy's `X-Forwarded-For`; set it only behind a proxy).
3. `docker compose --profile tls up -d`

Keep `QUIRE_BIND=127.0.0.1` so the plain HTTP port stays closed to the network. Add
`COMPOSE_PROFILES=tls` to `.env` to make the profile the default.

## Checking a deployment

`docker compose ps` shows health. `/api/health` is open (alive); `/api/ready` is open (database,
vault and backup folder writable, last backup succeeded); `/api/metrics` needs a token. Logs are
JSON lines on standard output: `docker compose logs -f cloud`.

The repository's deploy gate builds the image and runs this stack end to end:
`playbook/bin/gate.sh deploy` (needs Docker).
