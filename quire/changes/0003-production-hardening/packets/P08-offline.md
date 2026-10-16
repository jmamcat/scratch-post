---
id: 0003-production-hardening/P08
title: Offline app start (service worker)
lane: G
depends_on: [P01]
owns:
  - quire/apps/web/src/platforms/offline/**
  - quire/scenarios/steps/offline.steps.ts
borrows:
  - quire/apps/web/vite.config.ts  # add the service worker build plugin
  - quire/apps/web/index.html  # web app manifest link and theme colour, if needed
reads:
  - quire/changes/0003-production-hardening/**
  - quire/spec/**
  - quire/apps/web/**
  - quire/apps/server/src/access/**
  - quire/scenarios/**
size: S
revision: 1
status: todo
---

# Offline app start

## Context

Implements R-PLT-06 (`quire/changes/0003-production-hardening/spec/platforms/spec.md`).
Notes already live in IndexedDB; the app shell does not, so a browser with no network cannot
open the app. P00 calls `registerOffline()` in `main.tsx` and renders `<UpdatePrompt />` in
`App.tsx`; both are stubs in `apps/web/src/platforms/offline/index.ts`. The server's
Content-Security-Policy (P01, done) allows `worker-src 'self'`.

## Contract

```ts
export function registerOffline(): void;
export function UpdatePrompt(): JSX.Element | null;   // "Reload to update" button while a new version waits
```

- A Vite plugin (in `platforms/offline/`, added in `vite.config.ts`) that writes `sw.js` and a
  `manifest.webmanifest` into the build with the list of emitted files and a build id. No new
  npm dependencies: write the worker by hand.
- The worker precaches the listed files on install, serves them cache first, answers
  navigations network first with the cached `index.html` as fallback, and never caches
  `/api/` or `/live`. A new worker waits; `UpdatePrompt` shows "Reload to update" and, when
  clicked, tells the waiting worker to activate and reloads once it controls the page.
- Register only in production builds and only on `http(s)` (not inside Capacitor's
  `capacitor:` scheme, which already bundles the app).
- Steps (`quire/scenarios/steps/offline.steps.ts`): reuse `"d" goes offline` and `"d" reloads
  the app`; if the browser device's offline step does not use `context.setOffline(true)`,
  stop and log a decision instead of changing the support file.

## Acceptance

```sh
export QUIRE_WEB_DIST=/tmp/quire-web-P08
pnpm -C quire --filter @quire/web exec vite build --outDir "$QUIRE_WEB_DIST" --emptyOutDir
playbook/bin/gate.sh check
playbook/bin/gate.sh scenarios "@R-PLT-06|@R-SYN-10|@R-PLT-0"
```

## Decisions log
