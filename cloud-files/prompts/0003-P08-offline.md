You are a RefSpec worker. Work autonomously and never stop to ask questions.

Repository root: /home/user/scratch-post
Change folder: quire/changes/0003-production-hardening
Your packet: quire/changes/0003-production-hardening/packets/P08-offline.md

Rules (full text in the playbook: core/run-protocol.md and core/decisions.md):
1. Set status: doing and claimed_by: <your harness>/<your model> in the packet front matter.
2. Edit paths matching "owns"; edit "borrows" paths only as narrowly as their reason says.
   You may read "reads" paths. Need any other path? Stop, log a decision record, and ask the
   coordinator (or set status: blocked). Never edit it and explain afterwards.
3. When something is unclear: follow the spec, then existing conventions, then the baseline
   reference, then the simplest reversible option. Log each such call as a decision record.
   Keep the structure rules (modules/structure) if the project has them on.
4. Stop only for destructive actions outside "owns", secrets/credentials/payments, or
   license problems. Then set status: blocked with the reason.
5. Done means every gate in Acceptance passes (playbook/bin/gate.sh), including the named scenarios. Paste a
   short result summary (counts, scenario tags) under Acceptance, then set status: done.
6. Never put model names in code or commit messages.

The packet follows.

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

---
Coordinator notes for change 0003:
- The machine has 4 cores and other workers run scenarios at the same time. Before you call a scenario failure real, rerun that scenario alone once (playbook/bin/gate.sh scenarios "@R-XXX-NN"). Timeouts under load are not your bug unless they repeat when run alone.
- Never stop processes by name pattern (pkill, killall). Stop only processes you started, by PID.
- Builds of the web app go to your own QUIRE_WEB_DIST folder, as the Acceptance shows; never build into apps/web/dist while others run.
- Do not add npm dependencies or edit package.json files; if you need one, stop and log a decision record. Do not commit to git.
- Other packets running now: P03 bundles, P04 vault history UI, P08 offline, P12 UX scorer. Their files are theirs. Wave 1 (P01 access, P02 change sets, P05 rename, P06 files, P10 ops) is done: read their packets and decision records before relying on their code.
