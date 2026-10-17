# Quire server image (R-OPS-04). Build from the repository root:
#   docker build -t quire .
# Docker Hub rate limits? Point the base at a mirror:
#   docker build --build-arg NODE_IMAGE=mirror.gcr.io/library/node:24-bookworm-slim -t quire .
ARG NODE_IMAGE=node:24-bookworm-slim

# Behind a TLS-inspecting proxy? Build with a secret holding the extra CA certificates (never
# stored in the image): compose.yaml passes the file named by QUIRE_BUILD_CA.
#   docker build --secret id=extra_ca,src=/path/ca.pem -t quire .

# ---- sources: the workspace without anything the image does not need ----
FROM ${NODE_IMAGE} AS base
ENV CI=1 COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
WORKDIR /app
COPY quire/ ./

# ---- build: all dependencies from the lockfile, then the web app ----
FROM base AS build
RUN --mount=type=cache,id=quire-pnpm,target=/root/.local/share/pnpm/store \
    --mount=type=secret,id=extra_ca \
    if [ -s /run/secrets/extra_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/extra_ca; fi; \
    pnpm install --frozen-lockfile --filter "@quire/web..."
RUN pnpm --filter @quire/web build

# ---- prod: only what the server needs at run time ----
FROM base AS prod
RUN --mount=type=cache,id=quire-pnpm,target=/root/.local/share/pnpm/store \
    --mount=type=secret,id=extra_ca \
    if [ -s /run/secrets/extra_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/extra_ca; fi; \
    pnpm install --frozen-lockfile --prod --filter "@quire/server..."

# ---- runtime ----
FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production \
    QUIRE_DATA_DIR=/data \
    QUIRE_BACKUP_DIR=/backups \
    QUIRE_WEB_DIST=/app/apps/web/dist \
    QUIRE_PORT=8787 \
    NODE_NO_WARNINGS=1 \
    HOME=/home/quire
# A fixed uid so volumes keep their ownership from one image version to the next.
RUN groupadd --system --gid 10001 quire \
 && useradd --system --uid 10001 --gid quire --home-dir /home/quire --create-home --shell /usr/sbin/nologin quire \
 && mkdir -p /data /backups \
 && chown quire:quire /data /backups \
 && printf '#!/bin/sh\nexec /app/apps/server/node_modules/.bin/tsx /app/apps/server/src/cli.ts "$@"\n' > /usr/local/bin/quire \
 && chmod 755 /usr/local/bin/quire
WORKDIR /app
COPY --from=prod /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml ./
COPY --from=prod /app/node_modules ./node_modules
COPY --from=prod /app/packages ./packages
COPY --from=prod /app/apps/server ./apps/server
COPY --from=build /app/apps/web/dist ./apps/web/dist
USER 10001:10001
VOLUME ["/data", "/backups"]
EXPOSE 8787
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.QUIRE_PORT||8787)+'/api/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"]
CMD ["quire", "serve"]
