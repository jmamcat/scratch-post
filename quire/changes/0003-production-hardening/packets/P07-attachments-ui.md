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
status: done
claimed_by: claude-code/tier-B
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

## Acceptance result

- Web build to `/tmp/quire-web-P07`: ok.
- `playbook/bin/gate.sh check`: typecheck and dependency rules pass; structure 0 violations (6 existing S8 warnings, none in this packet's files).
- `playbook/bin/gate.sh scenarios "@R-VLT-12|@R-VLT-11|@cap-render"`: 19 passed, 0 failed (R-VLT-12 Drop an image, Too large; the 3 R-VLT-11 scenarios; the render scenarios).
- Also checked by hand in a browser (throwaway script, not kept): second drop of `cat.png` becomes `cat 1.png`, paste of `image.png` becomes `Pasted image <stamp>.png`, images show below their embed line in Live Preview, a second device and a reload show the images in reading view, and the Settings dialog shows the attachment folder.
- An early run failed at server start (`RangeError: init["status"]` from the size-limit middleware that another packet was still changing); it passed once that packet's fix was in the tree.

## Decisions log

- **D-P07-1** · confidence: med
  - Question: The "Insert attachment" command. Adding it to the command palette needs `App.tsx`, which is not in `owns` or `borrows`.
  - Did: the picker is built (hidden file input, `pickFiles()` in `editor-extension.ts`) and bound to `Mod-Alt-i` inside the editor. No palette entry.
  - Why: the packet says to stop and ask if the command needs `App.tsx`. The coordinator can add it with two lines: a command `{ id: 'insert-attachment', name: 'Insert attachment', run: () => handle && void pickFiles().then(...) }` needs the extension's `ingest`, so the simplest wiring is to dispatch the key: `handle?.view.contentDOM.dispatchEvent(new KeyboardEvent('keydown', { key: 'i', altKey: true, ctrlKey: true, bubbles: true }))` (use `metaKey` on macOS), or export a `pickAttachments(view)` from `vault/attachments` if the coordinator prefers.
  - Reverse: add the command in `App.tsx`; remove the `keymap` block in `editor-extension.ts` if the hotkey is not wanted.
- **D-P07-2** · confidence: high
  - Question: `within N seconds the cloud server has the file "p"` is listed for this packet's steps, but P06 already defines it in `files.steps.ts`.
  - Did: did not define it again (a second definition makes the phrase ambiguous and fails every scenario using it).
  - Why: one definition per phrase; the P06 one polls `GET /api/files?path=` which is what the scenario needs.
  - Reverse: move the step from `files.steps.ts` to `attachments-ui.steps.ts`.
- **D-P07-3** · confidence: med
  - Question: Where does a drop insert the embed: at the drop point or at the cursor?
  - Did: at the cursor (selection head), plus a newline, for drop, paste and pick alike; the cursor moves after the inserted lines. The step puts the cursor at the end (`Ctrl+End`) before dropping, as a person would.
  - Why: the packet and R-VLT-12 say "at the cursor"; the scenario expects the embed on a new last line.
  - Reverse: `ingest()` in `editor-extension.ts` (use `view.posAtCoords` for drop events).
- **D-P07-4** · confidence: med
  - Question: How to show the refusal message without touching `App.tsx` or the stylesheet.
  - Did: `alerts.ts` appends a `role="alert"` element to a fixed container in `document.body`, removed after 8 seconds; styled in `attachments.css` with the theme variables. Messages: `<name> is larger than 25 MiB.` (client check, and a 413 from the server), `<name> is not a type of file that can be attached.` and `<name> could not be added: <server message>`.
  - Why: the extension has no React tree; the contract only asks for a `role="alert"` element.
  - Reverse: replace `notify()`; a React toast would need `App.tsx`.
- **D-P07-5** · confidence: med
  - Question: Live Preview image embeds.
  - Did: a block widget after each line with `![[x.png]]` or `![](x.png)` (images only, not in code or front matter), from a `StateField` in `vault/attachments/editor-extension.ts`; the raw embed line stays as it is (Live Preview does not render `![[...]]` itself). The widget shares `imageSrc` and updates when bytes arrive; a missing file hides it.
  - Why: the packet allows a widget below the embed line and forbids touching `vault/live-preview/`.
  - Reverse: remove `imageEmbeds` from the extension list.
- **D-P07-6** · confidence: med
  - Question: How is an embed name (`cat.png`) matched to a file path in `imageSrc`, given the renderer passes the name it resolved from the note index (which only knows notes)?
  - Did: `locate()` takes an exact path, else the shortest path ending in `/<name>`. Embeds of files not yet known return a placeholder until the file list loads; once loaded, an unknown name returns the plain path (a broken image with its alt text).
  - Why: `![[<shortest unique name>]]` is what is inserted, so the reverse lookup must accept it.
  - Reverse: `locate()` and `imageSrc()` in `engine.ts`.
- **D-P07-7** · confidence: low
  - Question: File heads pulled before the engine is attached are lost, because the cursor has moved on.
  - Did: the engine is created during the first render and sets `ws.client.files` at once (before the first network pull in practice); as a safety net it asks `GET /api/docs` for file heads on start and when the device comes online. That route no longer lists files (filtered after P06), so the net does nothing today.
  - Why: the packet says to set `ws.client.files` once; no cursor access from this module.
  - Reverse: if heads are ever missing, attach the engine in `main.tsx` before `ws.start()`, or add a files catch-up route (`GET /api/files` list) to the server and call it from `catchUp()` in `engine.ts`.
- **D-P07-8** · confidence: med
  - Question: Names of attachments and the setting.
  - Did: the folder setting is the preference `attachmentFolder` (default `attachments/`, empty means the vault root), read for every file so a change applies at once; Settings saves it with `savePref` on Save. The key and default are written in both `SettingsDialog.tsx` and `engine.ts`, because `platforms` cannot import `vault` (it would make a cycle through `sync`). File names lose `\ / [ ] | # ^`; clashes get ` 1`, ` 2`; pasted `image.<ext>` becomes `Pasted image YYYYMMDDHHmmss.<ext>` (OBS-F-046).
  - Why: R-VLT-12 and the packet text; Obsidian's naming.
  - Reverse: `safeName`, `freePath`, `pastedName` in `engine.ts`.
- **D-P07-9** · confidence: high
  - Question: Where the files database lives and when it is cleared.
  - Did: IndexedDB database `<store name>.files.<server url>` with stores `heads`, `pending`, `blobs`, so switching servers starts clean. The blob cache is never trimmed.
  - Why: same server-switch rule as the note store; no eviction requirement in the spec.
  - Reverse: `openFileStores()` in `idb-files.ts`.
