---
id: 0003-production-hardening/P06
title: Attachments - content store, file routes, file sync
lane: D
depends_on: [P00]
owns:
  - quire/apps/server/src/vault/files/**
  - quire/packages/vault/src/files.ts
  - quire/packages/sync/src/files.ts
  - quire/scenarios/steps/files.steps.ts
borrows:
  - quire/packages/vault/src/index.ts  # export line for files.ts
  - quire/packages/sync/src/index.ts  # export line for files.ts
  - quire/apps/server/src/vault/mirror.ts  # only so the vault scan ignores or adopts attachment files instead of treating them as notes
reads:
  - quire/changes/0003-production-hardening/**
  - quire/spec/**
  - quire/packages/**
  - quire/apps/server/src/**
  - quire/scenarios/**
  - references/joplin/product/features.md
  - references/obsidian/product/features.md
size: M
revision: 1
status: done
claimed_by: claude-code/tier-B
---

# Attachments: content store, routes, file sync

## Context

Implements R-VLT-11 (`quire/changes/0003-production-hardening/spec/vault/spec.md`); the web
side (R-VLT-12) is a later packet (P07) built on your `FileSync`. Grounding: Joplin
attachments (JOP-F-023 to 025, JOP-F-045), Obsidian attachment folder (OBS-F-045). P00
wired: `DocMeta.kind = 'file'`, `blob`, `size`; `store.commit(..., { kind: 'file', blob,
size })` (a file revision has `text` null and `deleted` false unless it is a deletion);
`app.ts` calls `files.mirror(meta)` for every file commit and mounts `files.routes(app)`;
`SyncClient.files` (a `FileSink`) receives file heads from pulls and is flushed at the start
of every cycle; `Conflict.kind` may be `'file'`. Tables `blobs (hash, size, mime,
created_at)`. Replace the stub `apps/server/src/vault/files/index.ts`; keep its exports.

## Contract

```ts
// @quire/vault (pure)
export function normalizeFilePath(path: string): string;  // like normalizePath, for allowed attachment extensions; throws InvalidPathError
export function isAttachmentPath(path: string): boolean;
export function mimeOf(path: string): string;
// @quire/sync (pure apart from the injected fetch)
export interface FileHead { path: string; rev: number; blob: string | null; size: number; deleted: boolean }
export interface FileStore { heads(): Promise<FileHead[]>; putHead(h: FileHead): Promise<void>; pending(): Promise<PendingFile[]>; putPending(p: PendingFile): Promise<void>; removePending(path: string): Promise<void> }
export interface BlobCache { get(hash: string): Promise<Uint8Array | undefined>; put(hash: string, bytes: Uint8Array): Promise<void> }
export class FileSync implements FileSink {
  constructor(opts: { transport: HttpTransport; store: FileStore; cache: BlobCache; device: string });
  list(): Promise<FileHead[]>;                       // live files, sorted by path
  read(path: string): Promise<Uint8Array | null>;    // cache first, else GET /api/blobs/<hash>, then cache
  add(path: string, bytes: Uint8Array): Promise<FileHead>;  // upload now, or queue while offline
  remove(path: string): Promise<void>;
  onRemote(meta: DocMeta): Promise<void>;
  flush(): Promise<void>;
}
export class MemoryFileStore implements FileStore {}
export class MemoryBlobCache implements BlobCache {}
```

Server routes (all behind the token guard):

- `PUT /api/files?path=&baseRev=` body = bytes, header `x-quire-device`. SHA-256 the bytes;
  write `blobPath(dataDir, hash)` once (temp file then rename), insert `blobs` once; commit
  `kind: 'file'`. When `baseRev` is not the head and the head's blob differs, keep both: the
  upload goes to `<name> (<device>).<ext>` and a `Conflict` of kind `'file'` names both
  paths. Respond `PushResult`.
- `DELETE /api/files?path=&baseRev=` commits a file deletion.
- `GET /api/files?path=` returns the head's bytes with its content type;
  `GET /api/blobs/:hash` returns bytes with `Cache-Control: private, max-age=31536000,
  immutable`.
- `mirror(meta)`: copy the blob into the vault folder at the path (or remove it). Files
  dropped into the vault folder by other programs are out of scope: the vault scan must not
  turn them into notes.
- Commit through `deps.sync.exclusive` so file commits are ordered with note commits, and
  announce them with `deps.committed`.

Steps (`quire/scenarios/steps/files.steps.ts`): attach a `FileSync` with memory stores to
each system device on first use (keep it in a `WeakMap` keyed by the device; set
`device.client.files`). Bytes "from seed S" come from a small seeded generator shared by the
steps. Phrases: STEPS.md "Rename and attachments", the file rows.

## Acceptance

```sh
playbook/bin/gate.sh check
playbook/bin/gate.sh scenarios "@R-VLT-11|@cap-sync|@cap-vault"
```

The three R-VLT-11 scenarios pass; sync and vault scenarios still pass.

## Acceptance result

- `playbook/bin/gate.sh check`: typecheck, dependency rules and structure rules pass (0 violations, 5 existing S8 warnings).
- `playbook/bin/gate.sh scenarios "@R-VLT-11"`: 3 of 3 pass (A file reaches every device, Same bytes stored once, Files open offline once fetched).
- `playbook/bin/gate.sh scenarios "@R-VLT-11|@cap-sync|@cap-vault"`: 30 passed, 5 failed. The 5 failures all stop at `Missing step` for phrases owned by other packets: R-VLT-09 and R-VLT-10 (renames, P05) and R-VLT-12 (attachments in the app, P07). None involve code from this packet.

## Decisions log

- **D-P06-1** · confidence: med
  - Question: How does a file conflict name "both" in a review item, since `Conflict` has one `path` and text segments?
  - Did: `path` is the original file, `kind: 'file'`, `status: 'review'` (so it can be dismissed), `rev` is the revision of the saved copy, and one stable segment lists both paths (`Both versions were kept:\n<path>\n<copy path>\n`).
  - Why: R-VLT-11 "a review item names both"; `resolve()` only fits note kinds, `dismiss()` fits `review`.
  - Reverse: the `Conflict` literal in `put()` in `apps/server/src/vault/files/index.ts`; a typed field for the copy path would need a `protocol.ts` change.
- **D-P06-2** · confidence: med
  - Question: No conflict event is announced for a file conflict, since `FileDeps` offers no event hub (only `committed` for commit events).
  - Did: the conflict is saved with `store.saveConflict`; the commit of the copy is announced through `committed`. Clients see the review item on their next conflicts fetch.
  - Why: `FileDeps` is fixed by P00; reaching the hub needs a wider `FileDeps` or a `SyncServer` hook.
  - Reverse: add `onEvent` to `FileDeps` in P00's `app.ts` wiring and emit `{ type: 'conflict', ... }` after `saveConflict`.
- **D-P06-3** · confidence: med
  - Question: A deletion with a stale `baseRev` against a head that changed.
  - Did: the edit wins like for notes (R-SYN-06): nothing is deleted, the result is `noop` with the current head, and no conflict is opened. A deletion against a head with the same content as its base, or without `baseRev`, is committed.
  - Why: R-SYN-06 "the edit always wins"; the spec has no file delete-edit scenario.
  - Reverse: `del()` in `apps/server/src/vault/files/index.ts`.
- **D-P06-4** · confidence: med
  - Question: Which extensions are allowed attachments?
  - Did: images (png jpg jpeg gif webp avif bmp svg ico heic), pdf, txt csv json zip, docx xlsx pptx, audio (mp3 wav ogg oga m4a flac aac), video (mp4 m4v webm mov mkv ogv). `.md`, html and scripts are refused with 400. SVG is served with `Content-Security-Policy: sandbox`, everything with `nosniff`.
  - Why: "images, PDF, audio, video and other allowed types"; OBS-F-045 and JOP-F-023 list media and documents.
  - Reverse: the `MIME` table in `packages/vault/src/files.ts`.
- **D-P06-5** · confidence: med
  - Question: The scenario steps cannot attach a `FileSync` to a device when it is created (`world.addDevice` is not in this packet), and `addDevice` already syncs once.
  - Did: the first file step attaches an engine to every system device then in the world, and resets the cursor of each newly attached device to 0 so the next pull replays all file heads.
  - Why: the packet says attach "on first use"; without this, `b`'s pull in "A file reaches every device" would drop the file head.
  - Reverse: `filesOf()` in `quire/scenarios/steps/files.steps.ts`; or attach in `World.addDevice` if a later packet owns it.
- **D-P06-6** · confidence: high
  - Question: Device names in headers and file names.
  - Did: `x-quire-device` carries `encodeURIComponent(device)` (the server decodes it); in a copy's file name unsafe characters become `_`; a second copy by the same device with different bytes becomes `name (device 2).ext`.
  - Why: HTTP headers must be ASCII; paths must stay valid.
  - Reverse: `deviceOf`, `safeDevice`, `copyName` in the server file and `upload()` in `packages/sync/src/files.ts`.
- **D-P06-7** · confidence: med
  - Question: Scan and startup with attachment heads in the revision log.
  - Did: `VaultMirror.scan` skips file heads in its "restore missing" loop (it would otherwise write a null text). `createFiles` restores missing file copies from the content store at startup, never deletes. Files on disk with attachment extensions are ignored by the scan and watcher because `toVaultPath` only accepts `.md`.
  - Why: Architecture invariant "a file missing at startup is restored, never deleted"; packet text on `mirror.ts`.
  - Reverse: the one-line condition in `mirror.ts` and the loop at the top of `createFiles`.
- **D-P06-8** · confidence: low
  - Question: Other readers of the revision log see file heads as notes.
  - Did: nothing, they are outside this packet. Found: `GET /api/docs` (`vault/routes.ts`) lists file heads with the notes (the web `head-meta.ts` calls it), and the local node's `NodeStore` in `sync/replicator.ts` turns every head into a note (`get()` returns `''` for a file head and pushes it upstream as text, which the server rejects with 400, so a node with attachments would report sync errors and not replicate files).
  - Why: both paths are owned by other packets or by no one in this wave.
  - Reverse: filter `kind === 'file'` in `/api/docs`; teach `NodeStore` to skip file heads (or replicate them with `FileSync`-like code).
