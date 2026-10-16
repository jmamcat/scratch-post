---
id: 0003-production-hardening/P07
title: Attachments in the app
lane: D
depends_on: [P06]
owns:
  - quire/apps/web/src/vault/attachments/**
  - quire/scenarios/steps/attachments-ui.steps.ts
borrows:
  - quire/apps/web/src/platforms/SettingsDialog.tsx  # one field: attachment folder
  - quire/scenarios/support/browser-device.ts  # only if dropping files needs a helper there
reads:
  - quire/changes/0003-production-hardening/**
  - quire/spec/**
  - quire/apps/web/src/**
  - quire/packages/**
  - quire/scenarios/**
  - references/obsidian/product/features.md
size: M
revision: 1
status: todo
---

# Attachments in the app

## Context

Implements R-VLT-12 (`quire/changes/0003-production-hardening/spec/vault/spec.md`) on top of
P06's `FileSync` (`@quire/sync`) and file routes. Baseline: Obsidian paste and drop
(OBS-F-046) and attachment location (OBS-F-045). P00 wired `useAttachments(ws)` in `App.tsx`:
its `editorExtension` goes into the editor, its `imageSrc` into the reading view. Replace the
stub in `apps/web/src/vault/attachments/index.ts`; keep the exports.

## Contract

```ts
export interface Attachments {
  editorExtension(currentPath: () => string): Extension;
  imageSrc(path: string): string;
  version: number;
}
export function useAttachments(ws: Workspace): Attachments;
```

- One `FileSync` per workspace with an IndexedDB `FileStore` and `BlobCache` (use `idb`, as
  `sync/idb-store.ts` does); set `ws.client.files` to it once.
- Drop, paste and "Insert attachment" (a command through a hidden file input; if adding the
  command needs `App.tsx`, stop and ask) add each file to the attachment folder (setting,
  default `attachments/`, stored with `shared/use-pref.ts` and editable in Settings), avoiding
  name clashes with ` 1`, ` 2`, and insert `![[<shortest unique name>]]` plus a newline at
  the cursor. Files over 25 MiB (or a 413 from the server) are refused with a message in a
  `role="alert"` element: `<name> is larger than 25 MiB.`
- `imageSrc(path)`: an object URL when the bytes are local; otherwise start a fetch, return a
  transparent placeholder, and bump `version` when the bytes arrive, so views re-render.
- Live Preview: show image embeds as images (a widget below the embed line is enough; log the
  choice). Do it inside your extension, not in `vault/live-preview/`.
- Steps (`quire/scenarios/steps/attachments-ui.steps.ts`): the `@ui` rows of STEPS.md "Rename
  and attachments" (drop events built with `DataTransfer` in `page.evaluate`, a generated PNG
  for `cat.png`), `within N seconds "p" on "d" reads "t"`, `within N seconds the cloud server
  has the file "p"`, `the reading view on "d" shows the image "name" loaded` (an `img` whose
  `naturalWidth > 0`), `"d" sees the message "t"`.

## Acceptance

```sh
export QUIRE_WEB_DIST=/tmp/quire-web-P07
pnpm -C quire --filter @quire/web exec vite build --outDir "$QUIRE_WEB_DIST" --emptyOutDir
playbook/bin/gate.sh check
playbook/bin/gate.sh scenarios "@R-VLT-12|@R-VLT-11|@cap-render"
```

## Decisions log
