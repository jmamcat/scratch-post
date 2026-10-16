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
status: done
claimed_by: claude-code/tier-B
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

## Result

- `vite build` into `/tmp/quire-web-P08`: ok (`sw.js`, `manifest.webmanifest` emitted, manifest and theme-colour links injected into `index.html`).
- `check`: 0 type errors, no dependency violations (224 modules), structure 0 violations (6 existing soft-limit warnings, none in P08 files).
- `scenarios "@R-PLT-06"`: 1 passed (R-PLT-06 Start offline). Negative check: the same scenario fails when `sw.js` is removed from the build, so it exercises the worker.
- `scenarios "@R-PLT-06|@R-SYN-10|@R-PLT-0"`: 10 run, 8 passed (R-PLT-01, 02, 03, 05 x2, 06, R-SYN-10 x2), 2 failed, neither in P08: R-PLT-07 (undefined steps "the web app is built" / "first-load JavaScript ..." belong to P09) and R-PLT-08 (UX scorer contrast and focus findings, P12/P14).
- No `offline.steps.ts` written: the scenario uses only existing steps; the browser device's `goOffline` uses `context.setOffline(true)`.

## Decisions log
- **D-P08-1** · confidence: med
  - Question: which files does the worker precache?
  - Did: every emitted file (all chunks, including the ~200 lazy CodeMirror language chunks) plus `public/` files, about 2.5 MB; `sw.js` and the manifest are excluded. The build id is a hash of file names and contents.
  - Why: contract says "the list of emitted files"; a lazy chunk missing offline would break opening a note with a code block. P03 (bundles) may change the chunk set; the plugin follows it automatically.
  - Reverse: filter `names` in `offlinePlugin` (`platforms/offline/plugin.ts`), e.g. skip `assets/*` language chunks.
- **D-P08-2** · confidence: med
  - Question: manifest and theme colour links: edit `index.html` or inject?
  - Did: the plugin injects `<link rel="manifest">` and two `theme-color` metas (light `#ffffff`, dark `#1e1e21`) at build time only, so the dev server does not request a missing manifest; `index.html` is untouched.
  - Why: packet says "if needed"; avoids a dev-server 404 and keeps colours next to the manifest.
  - Reverse: move the tags into `apps/web/index.html` and drop `transformIndexHtml`.
- **D-P08-3** · confidence: med
  - Question: first-install activation and update flow.
  - Did: the first worker activates by itself and claims the page; a later worker waits (only shown when a controller exists). Clicking posts `SKIP_WAITING`; the page reloads once on `controllerchange`, only if the person clicked. The page also calls `registration.update()` when the tab becomes visible. Old caches are deleted on activation.
  - Why: contract ("a new worker waits ... reloads once it controls the page"); the visibility check is the cheapest way for a long-lived tab to find a new deploy.
  - Reverse: `register.ts` (drop the `visibilitychange` listener) and `worker.ts` (`clients.claim`).
- **D-P08-4** · confidence: high
  - Question: `index.ts` cannot hold JSX and the plugin must not reach the browser bundle.
  - Did: `index.ts` re-exports `registerOffline` (`register.ts`) and `UpdatePrompt` (`UpdatePrompt.tsx`); `plugin.ts` and `worker.ts` are imported by `vite.config.ts` only. The prompt has no `role="status"` (steps look up the single status bar by that role); it is a labelled `div` with a button.
  - Why: dependency rules (public entry only) and the existing step `reloads the app`.
  - Reverse: n/a.
- **D-P08-5** · confidence: high
  - Question: server cache headers for `sw.js`.
  - Did: nothing; browsers fetch the worker script bypassing the HTTP cache for update checks, and the static server needs no change (`apps/server` not owned).
  - Why: standard service worker behaviour.
  - Reverse: add `Cache-Control: no-cache` for `/sw.js` in `apps/server/src/platforms/web.ts` if a proxy caches it.
