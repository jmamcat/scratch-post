---
id: 0001-mvp-foundation/P00
title: Set up the pnpm workspace (integration packet)
lane: Z
depends_on: []
owns:
  - quire/package.json
  - quire/pnpm-workspace.yaml
  - quire/pnpm-lock.yaml
  - quire/tsconfig.base.json
  - quire/README.md
  - quire/*/*/package.json
  - quire/*/*/tsconfig.json
reads:
  - quire/changes/0001-mvp-foundation/design.md
size: S
status: todo
---

# Set up the pnpm workspace

## Context

Coordinator-owned. Creates the workspace every other packet builds in, and later adds
dependencies other packets list under "Needs from P00".

## Contract

```
quire/
  package.json            private, "type": "module", scripts: check, test, typecheck, dev:server, dev:web, build:web
  pnpm-workspace.yaml     packages: ["packages/*", "apps/*"]
  tsconfig.base.json      strict, ES2022, moduleResolution "bundler", noEmit, verbatimModuleSyntax
  packages/core           @quire/core   exports "./src/index.ts"
  packages/sync           @quire/sync   exports "./src/index.ts", depends on @quire/core
  apps/server             @quire/server depends on @quire/core, @quire/sync
  apps/web                @quire/web    depends on @quire/core, @quire/sync
  apps/android            @quire/android
```

Packages are consumed as TypeScript source (no build step between packages). Tests use
vitest. `pnpm check` = `pnpm -r typecheck && pnpm -r test`.

Folder names must not be `lib/` (ignored by the repo's .gitignore).

## Acceptance

```sh
pnpm -C quire install
pnpm -C quire check
```

## Decisions log
