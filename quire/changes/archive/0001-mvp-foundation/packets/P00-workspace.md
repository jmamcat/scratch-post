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
status: done
claimed_by: claude-code/claude
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

Result: pnpm install: ok. pnpm check: see run report.

## Decisions log

- **D-P00-1** · confidence: med
  - Question: Use the newest major versions (TypeScript 7, vitest 5, vite 8, Capacitor 8)?
  - Did: Pinned the previous stable majors: TypeScript 5.9, vitest 3, vite 7, @vitejs/plugin-react 5, Capacitor 7, Playwright 1.56 (matches the preinstalled Chromium).
  - Why: Those are fresh major releases with new toolchains (TypeScript 7 is the native compiler, vite 8 switched bundlers); stability first for an MVP that several harnesses must run.
  - Reverse: Bump versions in quire/*/package.json and rerun pnpm check.
- **D-P00-2** · confidence: high
  - Question: How do other packages see core's ambient module types for markdown-it plugins?
  - Did: Added a triple-slash reference to markdown/vendor.d.ts in core/src/index.ts.
  - Why: Packages consume core as source; ambient .d.ts files are not picked up otherwise.
  - Reverse: Publish real types or move declarations into each consumer.
