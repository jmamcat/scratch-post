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
status: todo
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

## Decisions log
