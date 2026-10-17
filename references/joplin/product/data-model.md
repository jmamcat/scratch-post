# Joplin: data model, sync, conflicts, history

All facts are from the upstream at rev `ef61ac2043d32f24ce0988e138c4ca20ffa8525c`
(2026-10-16) unless marked "(unverified)". Paths are relative to the upstream root.
AGPL-3.0-or-later: this page describes behaviour; do not copy code.

## 1. Local storage (all clients)

Every client keeps the full dataset in one SQLite database. Markdown is a field in a
row, not a file on disk.

| Table | Purpose |
| --- | --- |
| `notes`, `folders`, `tags`, `note_tags`, `resources`, `revisions`, `master_keys` | Syncable items (see section 2) |
| `sync_items` | Per item, per sync target: `sync_time`, `remote_item_updated_time`, `force_sync`, `sync_disabled` + reason, `item_location`, and the merge base `base_title`, `base_body`, `base_conflict_note_id` |
| `deleted_items` | Tombstones (`item_id`, `item_type`, `deleted_time`, `sync_target`) pushed in the delete step |
| `item_changes` | Change log (`item_id`, `type` create/update/delete, `source` user/sync/decryption, `before_change_item` JSON). Feeds the revision service, search indexer and resource indexer |
| `resource_local_states` | Per resource `fetch_status` (0 idle, 1 started, 2 done, 3 error) and `fetch_error` |
| `note_resources`, `resources_to_download` | Note to resource index; download queue |
| `conflict_note_states` | Per conflict note: `base_title`, `base_body`, `remote_updated_time` (and reserved `remote_title`, `remote_body`) for the 3-way conflict view |
| `notes_fts`, `items_fts`, `notes_normalized`, `items_normalized`, `search_aux`, `notes_spellfix` | Search (FTS with BM25) |
| `settings`, `key_values`, `alarms`, `migrations`, `version`, `table_fields` | App state |
| `note_embeddings_meta`, `chat_conversations`, `chat_messages` | AI features |

Source: `packages/lib/JoplinDatabase.ts`, `packages/lib/services/database/migrations/`,
`packages/lib/services/database/types.ts`.

Timestamps are Unix milliseconds in the database. Every item has `created_time`,
`updated_time` (system, drives sync) and `user_created_time`, `user_updated_time`
(user-visible, editable).

## 2. Item types and IDs

IDs are client-generated 32-character lowercase hex UUIDs. `type_` values come from
`ModelType` in `packages/lib/BaseModel.ts`. Synced types are listed in
`BaseItem.syncItemDefinitions_` (`packages/lib/models/BaseItem.ts`).

| `type_` | Item | Synced | Key fields |
| --- | --- | --- | --- |
| 1 | Note | yes | `title`, `body`, `parent_id` (folder), `markup_language` (1 Markdown, 2 HTML), `is_todo`, `todo_due`, `todo_completed`, `is_conflict`, `conflict_original_id`, `deleted_time` (trash), `is_locked`, `share_id`, `order`, geo, `source_url`, `user_data` |
| 2 | Folder (notebook) | yes | `title`, `parent_id` (nesting), `icon`, `share_id`, `deleted_time` |
| 4 | Resource (attachment metadata) | yes | `title`, `mime`, `filename`, `file_extension`, `size`, `blob_updated_time`, `encryption_blob_encrypted`, OCR fields |
| 5 | Tag | yes | `title`, `parent_id` |
| 6 | NoteTag | yes | `note_id`, `tag_id` (one item per association) |
| 9 | MasterKey | no longer uploaded | kept in DB; keys now live in `info.json` |
| 13 | Revision | yes | `item_id`, `item_type`, `item_updated_time`, `parent_id`, `title_diff`, `body_diff`, `metadata_diff` |
| 3, 7, 8, 10 to 12, 14 to 20 | Setting, Search, Alarm, ItemChange, NoteResource, ResourceLocalState, Migration, SmartFilter, Command, NoteEmbedding, ConflictNoteState, ChatConversation, ChatMessage | no | local only |

The "Conflicts" notebook is virtual: fixed id `c04f1c7c04f1c7c04f1c7c04f1c7c04f`
(`packages/lib/models/utils/getConflictFolderId.ts`); it lists notes with
`is_conflict = 1`. "Conflicts (attachments)" and "Restored Notes" are real folders created
on demand.

## 3. Serialization format on the sync target

Every item is one text file named `<id>.md` at the target root, whatever its type
(`BaseItem.systemPath`). Format (`BaseItem.serialize`, `BaseItem.unserialize`):

```
<title>                       (first line; omitted for items without a title)
                              (blank line)
<body>                        (notes only; may contain blank lines)
                              (blank line)
key: value                    (one property per line, all remaining fields)
...
type_: <n>                    (always last)
```

Example (from `packages/app-cli/tests/support/syncTargetSnapshots/2/normal/`):

```
note1

![photo.jpg](:/6f60ca35b0e4423fb49f9e097449fd99)

id: 2a914b3fb8fb43819b976eb4e5be80e3
parent_id: 2fa39884ba3b47a489dae93dc20021f2
created_time: 2020-07-25T10:55:18.127Z
updated_time: 2020-07-25T10:55:18.403Z
is_conflict: 0
...
encryption_cipher_text:
encryption_applied: 0
markup_language: 1
is_shared: 0
type_: 1
```

- Parsing reads properties from the bottom up until the first blank line; everything
  above is title + body. Newlines inside property values are escaped (`\n`).
- Timestamps are ISO 8601 UTC strings in the file, milliseconds in the DB.
- Items reference each other by ID only (`parent_id`, `note_id`, `:/<id>` links).

Target layout (filesystem, WebDAV, Nextcloud, Dropbox, OneDrive, S3):

| Path | Contents |
| --- | --- |
| `/<id>.md` | Every item (notes, folders, tags, note_tags, resource metadata, revisions) in one flat directory |
| `/.resource/<id>` | Attachment blobs (raw, or encrypted) |
| `/locks/` | Lock files `<sync|exclusive>_<desktop|mobile|cli>_<clientId>.json` |
| `/temp/` | Scratch |
| `/info.json` | Sync target info: `version` (currently 3, see `services/synchronizer/migrations/`), `e2ee`, `activeMasterKeyId`, `masterKeys`, `ppk`, `appMinVersion`, revision settings, each with `updatedTime` for merge (`services/synchronizer/syncInfoUtils.ts`) |
| `/.sync/version.txt`, `/.sync/readme.txt` | Legacy version marker kept so very old clients refuse to sync |

Joplin Server / Joplin Cloud store the same serialized text, but in a database
`items` table (`jop_id`, `jop_parent_id`, `jop_type`, `jop_updated_time`, ... plus
`content` in DB, S3 or filesystem). Clients upload with a multi-put API and read changes
from a cursor-based delta endpoint (`readme/dev/spec/server_items.md`,
`readme/dev/spec/server_delta_sync.md`, `packages/lib/file-api-driver-joplinServer.ts`).

## 4. Sync algorithm

Entry point: `Synchronizer.start()` in `packages/lib/Synchronizer.ts`. One run executes
these phases in order (comment in the code numbers them differently; actual order shown):

1. **Prepare.** Index note resources (orphan detection), run share maintenance, update
   `share_id`s.
2. **Target info.** Fetch `info.json`. New target: run migrations to the current version.
   Check client version against `appMinVersion` and target version (outdated target sets
   `sync.upgradeState` and stops). If local and remote info differ, merge them
   per-property by `updatedTime`, then under an **EXCLUSIVE lock** upload the merged
   `info.json` and apply E2EE or revision-setting changes locally.
3. **Acquire a SYNC lock** and auto-refresh it every 60 s; TTL 3 min
   (`LockHandler.ts`: `defaultLockTtl`, `autoRefreshInterval_`). If refresh fails, the sync
   is cancelled. Multiple SYNC locks can coexist; any active EXCLUSIVE lock blocks sync.
   Among several exclusive lock files the oldest valid one wins, ties broken by lowest
   client id (`readme/dev/spec/sync_lock.md`).
4. **DELETE_REMOTE** (`services/synchronizer/utils/syncDeleteStep.ts`). For every
   `deleted_items` row: delete `<id>.md` (and `.resource/<id>` for resources), batch when
   the driver supports multi-delete. No check of remote changes: a permanent local delete
   wins over a concurrent remote edit. Read-only (shared) items are restored instead.
5. **UPDATE_REMOTE (upload).** Loop over `BaseItem.itemsThatNeedSync()` in pages of 100,
   newest first:
   - candidates are items never synced to this target, or with
     `sync_items.sync_time < items.updated_time`, or `force_sync = 1`; still-encrypted items
     are skipped; conflict notes are included only if they have a `conflict_original_id`
     and no `share_id`;
   - for an already-synced item, `stat` then `get` the remote file and parse it (the
     remote file timestamp is considered unreliable, the item's own `updated_time` is
     used);
   - decision table:

     | Remote | Local `sync_time` | Remote `updated_time` vs local `sync_time` | Action |
     | --- | --- | --- | --- |
     | missing | 0 (never synced) | n/a | `createRemote` |
     | missing | > 0 | n/a | conflict (remote deleted, local changed) |
     | present | any | remote newer | conflict (both changed) |
     | present | any | not newer | `updateRemote` |

   - resources: upload the blob to `.resource/<id>` first, only if
     `blob_updated_time > sync_time` or forced; blobs >= 10 MB log a warning;
   - after upload: `sync_time = local.updated_time`, and for notes the uploaded title and
     body become the new base (`base_title`, `base_body`), with `base_conflict_note_id`
     cleared;
   - conflicts go to `handleConflictAction()` (section 5);
   - a path processed twice in one run raises `changedDuringSync` (user typing) or
     reports a remote `updated_time` in the future.
6. **DELTA (download).** Calls the driver's `delta()` with the saved context:
   - Joplin Server/Cloud: cursor-based change events, compressed per page
     (update+update to update, create+delete to nothing, ...), optionally with item content
     embedded ("delta with items", Joplin 2.14). Update events older than 180 days are
     compacted, so a stale cursor yields `resyncRequired` and a full resync.
   - Other targets: `basicDelta()` in `packages/lib/file-api.ts` lists the whole
     directory, sorts by file mtime and returns files newer than the context timestamp
     (keeping `filesAtTimestamp` to handle same-millisecond edits), 50 per page; deletions
     are inferred by comparing remote IDs with locally synced IDs. An "enhanced" variant
     for filesystem and localhost WebDAV compares each file's mtime with the stored
     `remote_item_updated_time` so external file-sync tools (Syncthing, etc.) are detected.
   - For each remote entry: missing locally to `createLocal`; marked deleted to
     `deleteLocal`; otherwise download (parallel queue, `sync.maxConcurrentConnections`
     default 5) and `updateLocal` only if remote `updated_time` > the *current* local
     `updated_time` (re-read to catch edits made during a long delta). Comment: "no
     conflict is possible after this" because local changes were pushed first.
   - Saved items get `sync_time` capped to the device clock and the downloaded title/body
     as base. Encrypted notes get an empty base until decrypted.
   - Folder deletions are applied last and only if empty; a remotely deleted folder that
     still has local notes has those notes marked `is_conflict`.
   - `checkSyncTargetIsValid()` re-checks that `info.json` still exists after each page
     (fail-safe against a purged or switched target). With `sync.wipeOutFailSafe` on, an
     empty remote never deletes local data.
   - The delta context is persisted after each page in the setting
     `sync.<targetId>.context`, so an interrupted sync resumes.
7. **Finish.** Release lock. If `itemsThatNeedSync` is non-empty again, schedule another
   run after `syncAsYouTypeInterval` (1 s mobile, 15 s desktop) so "sync complete" is never
   shown while edits are pending.

Triggers (`packages/lib/registry.ts`): a scheduled sync shortly after any local change,
a recurrent sync every `sync.interval` seconds (default 300), app start, and manual sync.
Partial runs use only `update_remote` and `delete_remote` (`Synchronizer.partialSyncSteps`).

Known weaknesses stated in the code: `sync_time` is set to `updated_time` with
millisecond resolution, so an edit in the same millisecond as an upload can be missed;
the comment proposes an etag-like counter instead (`Synchronizer.ts`, upload step).

## 5. Conflict detection and handling

Detection happens only in the upload step (section 4.5), per item, by timestamps:
local has unsynced changes AND (remote `updated_time` > local `sync_time` OR remote was
deleted). `handleConflictAction()`
(`packages/lib/services/synchronizer/utils/handleConflictAction.ts`) then branches by type.

### 5.1 Notes (`noteConflict`)

1. Reload the local note. If the local note is itself a conflict note, no new conflict is
   created (a newer local conflict note is simply uploaded).
2. Decrypt the remote note in memory if needed (`services/conflict/decryptNoteInMemory.ts`).
3. `Note.mustHandleConflict()`: if title and body are identical (and neither side is
   encrypted), the conflict is ignored and the remote version is taken (metadata such as
   `todo_completed` follows remote).
4. **Auto-merge** (`sync.autoMergeConflicts`, default true; label "Automatically merge
   non-conflicting note changes"). Present on `dev` at app version 3.7.21; the 3.6 and
   3.7 release notes (`readme/news/`) do not mention it, so it is likely not yet in a
   stable release (unverified). Requires a recorded base (`sync_items.base_body` or
   `base_title`), neither side encrypted or locked, item not read-only.
   - `autoMergeNote(base, local, remote)` (`services/conflict/autoMergeNote.ts`):
     titles merge by simple rule (one side unchanged takes the other; both changed
     differently is a conflict). Bodies merge by `autoMerge()` in
     `services/conflict/diffNotes.ts`: split on `\r\n|\n|\r`, line-based diff3 via a
     bounded fork of node-diff3 (`boundedDiff3.ts`, `maxEditLength` 5000, timeout 1000 ms).
     Regions changed by one side are taken; identical changes on both sides are merged;
     different changes to the same or adjacent lines are conflicts.
   - Guard: if both sides changed and either side's edit touches or neighbours a run of
     two or more identical lines, the merge is refused (diff3 could apply an edit to the
     wrong copy and duplicate text).
   - **Full merge:** save the merged note over the local one with
     `updated_time = max(now, remote.updated_time + 1)` so it uploads next run; merged text
     becomes the base; no conflict note; open editor is told to reload
     (`EDITOR_NOTE_NEEDS_RELOAD`).
   - **Partial merge:** the local side keeps its version only in conflicting regions and
     takes all other merged changes; the remote side likewise keeps its own conflicting
     regions. Both are then used below, so the two notes differ only where they really
     conflict.
5. **Conflict copy:** `Note.createConflictNote(local)` saves a new note (new id) with
   `is_conflict = 1` and `conflict_original_id = <original id>` (empty if the remote was
   deleted). `share_id` is stripped. A `conflict_note_states` row stores the base and the
   remote `updated_time` for the compare view.
6. **Original note:** if the remote exists it overwrites the local original (remote wins
   on the original id); the remote version becomes the base; `base_conflict_note_id`
   links the original to its conflict copy. If the remote was deleted, the local original
   is deleted and only the conflict copy remains.
7. Conflict notes with an original id are synced, so every device sees them; deleting
   one deletes it everywhere (`Synchronizer.conflicts.test.ts`: "should sync newly created
   conflict notes", "should delete remotely synced conflict notes"). Older versions kept
   conflict notes device-local (unverified).

Fallback to a plain conflict note (no merge): setting off, no base, read-only item,
locked note, undecryptable note, duplicate-line ambiguity, diff over bounds
(`readme/dev/spec/conflict_auto_merge.md`).

### 5.2 Attachments (`resourceConflict`)

Only if `blob_updated_time` differs (metadata-only differences take remote, for example
OCR run on two devices). The local blob is duplicated into a new resource and a note
"Attachment conflict: <title>" with a link to it is created in the "Conflicts
(attachments)" folder. The original resource takes the remote metadata and its local
blob is marked for re-download (`fetch_status = idle`). Source:
`packages/lib/models/Resource.ts`.

### 5.3 Other items (`itemConflict`: folders, tags, note_tags, revisions)

Remote wins silently. If the remote was deleted, the local item is deleted without
deleting children (folders keep their notes to avoid mass loss).

### 5.4 Conflict UI

- Shipped: the virtual "Conflicts" notebook in the sidebar with a count; new notes
  cannot be created there; notes moved out of it lose `is_conflict`. No compare view.
  The help page (`readme/apps/conflict.md`, https://joplinapp.org/help/apps/conflict)
  still tells users to diff manually with an external tool such as diffchecker.com, and
  does not mention auto-merge.
- In progress: `services/conflict/loadConflictData.ts` recomputes sections (`unchanged`,
  `auto-merged`, `conflict` with local and remote text) from the conflict note, its
  original and the stored base (falls back to a 2-way diff without a base);
  `services/conflict/wordDiff.ts` gives Unicode-aware word highlights (CJK per
  character, 3 s timeout). Gated by `featureFlag.conflictResolution` (default false,
  not public). A search of `packages/app-desktop/gui` and `packages/app-mobile/components`
  found no consumer at this rev.
- Third party: the "Conflict Resolution" community plugin
  (https://discourse.joplinapp.org/t/plugin-conflict-resolution/).

## 6. Note history (revisions)

Spec: `readme/dev/spec/history.md`; code: `packages/lib/services/RevisionService.ts`,
`packages/lib/models/Revision.ts`.

- **Storage:** Revision items (type 13), synced like notes. Each stores a diff against
  its `parent_id` revision: `title_diff` and `body_diff` are diff-match-patch patches
  (JSON), `metadata_diff` is an object diff (`{ new, deleted }`). The first revision of a
  note is a diff from empty. Reading version N rebuilds by applying diffs from the oldest
  revision forward.
- **Collection:** a background service (every 10 minutes, `runInBackground`) reads
  `item_changes` for notes, skipping changes from sync and decryption, so each device
  records only its own edits. Rules:
  - a new revision of the current state if the last revision is older than
    `revisionService.intervalBetweenRevisions` (10 min);
  - additionally a revision of the *previous* state (from `before_change_item`) when the
    note had not been revised for `revisionService.oldNoteInterval` (7 days), to keep the
    last significant state before a long pause;
  - a revision of the last state when a note is deleted;
  - conflict notes and still-encrypted notes are skipped.
- **Retention:** `revisionService.ttlDays` (default 90, public). Old revisions are deleted
  and the oldest surviving one is rewritten as a full snapshot. Because deletions sync,
  the effective retention is the minimum across devices; enabled flag and TTL are now
  also carried in `info.json` with timestamps (`Synchronizer.ts`, target info step).
- **Restore:** creates a new note in "Restored Notes"; the current note is not changed.
- **Viewers:** desktop `packages/app-desktop/gui/NoteRevisionViewer.tsx`, mobile
  `packages/app-mobile/components/screens/NoteRevisionViewer.tsx` (help page says
  desktop only; outdated). "Delete history" per note.
- **Note lock:** locking a note deletes its plaintext revisions on every device.

## 7. End-to-end encryption

Specs: `readme/dev/spec/e2ee/index.md`, `workflow.md`, `native_encryption.md`; code:
`packages/lib/services/e2ee/`.

- **When:** items are encrypted only when serialized for upload
  (`BaseItem.serializeForSync`) and decrypted after download by `DecryptionWorker`.
  The local database is plaintext.
- **What stays plaintext on the target:** `id`, `note_id`, `tag_id`, `parent_id`,
  `share_id`, `updated_time`, `deleted_time`, `type_`, `is_locked`,
  `extracted_resource_ids`, plus `encryption_applied: 1` and `encryption_cipher_text`.
  So structure and timestamps leak; content and titles do not.
- **Blobs:** resource files are encrypted to a `.crypted` file and uploaded to
  `.resource/<id>` (`encryption_blob_encrypted = 1`).
- **Format:** ASCII, header `JED` + version, then length, method, master key id, then
  chunks (64 KiB strings, 128 KiB files). Methods since Joplin 3.2: `StringV1` (10),
  `FileV1` (9), `KeyV1` (8): AES-256-GCM, 96-bit random IV, per-encryption key derived
  with PBKDF2-HMAC-SHA512 and a 256-bit salt (3 iterations for data, 220000 for the master
  key wrap).
- **Keys:** random master (data) keys wrapped by the user's master password, stored in
  `info.json` (no longer uploaded as items). Several keys may exist (two offline clients
  enabling E2EE at once); one is active. A public/private key pair (`ppk`) is generated
  once during sync and used to share notebook keys with other users.
- **Interaction with conflicts:** the merge decrypts the remote note in memory; if it
  cannot be decrypted a plain conflict note is created; an encrypted remote leaves the
  base empty until decrypted.

## 8. Attachments (resources)

- A resource is two things: metadata item `<id>.md` (type 4) and blob
  `.resource/<id>`. Notes link with `![name](:/<id>)`. Local blob path:
  `<resourceDir>/<id>.<ext>` (`packages/lib/models/utils/resourceUtils.ts`).
- Download is decoupled from sync: delta saves the metadata with `fetch_status = idle`;
  `ResourceFetcher` downloads blobs according to `sync.resourceDownloadMode`
  (`always` default, `auto` when the note is opened, `manual` on click).
- Upload skips the blob if only metadata changed (`blob_updated_time <= sync_time`).
- Mobile refuses resources >= 100 MB (marked "cannot sync" with a reason).
- A resource cannot be uploaded until its blob is present locally; otherwise it is
  marked "cannot sync".
- Orphans are detected by indexing `note_resources` before each sync.

## 9. Mobile app local storage (`packages/app-mobile`)

- **Database:** `expo-sqlite` (`utils/database-driver-react-native.ts`). Android: the
  app's native database directory (from `NativeModules.SystemInformationPackage`); iOS:
  `Library/LocalDatabase/`, excluded from iCloud backup. File `joplin.sqlite`, or
  `joplin-<profileId>.sqlite` for extra profiles (`services/profiles/index.ts`).
- **Files:** `@dr.pogodin/react-native-fs` and a fetch-blob based driver
  (`utils/fs-driver/fs-driver-rn.ts`); the profile root is the app's `DocumentDir`;
  resources live in the profile's `resourceDir` (root for the default profile,
  `resources-<profileId>` for others); also `cache/`, `tmp/`, `plugins/`, `profiles.json`.
  Android SAF access via `@joplin/react-native-saf-x` (used for filesystem sync and
  export).
- **Web build:** the same app in a browser uses `@sqlite.org/sqlite-wasm` with the OPFS
  VFS (`utils/database-driver-react-native.web.ts`) and an OPFS-backed fs driver with a
  worker (`utils/fs-driver/fs-driver-rn.web.ts`, root `/app/`).
- **Shared engine:** the mobile app runs the same `packages/lib` Synchronizer,
  RevisionService, DecryptionWorker, ResourceFetcher and SearchEngine
  (`utils/buildStartupTasks.ts`).
- **Network:** `@react-native-community/netinfo` reachability check against
  `https://joplinapp.org/connection_check/`; cellular or expensive connection sets a
  mobile-data flag used for warnings and `sync.mobileWifiOnly` (`root.tsx`).
- **Background:** no background-fetch or WorkManager dependency in `package.json`, so
  sync appears to run only while the app is active (unverified).
- **Crypto:** `react-native-quick-crypto` for native E2EE.

## 10. Lessons for Quire's sync

### Copy

1. **Store the common ancestor per file per peer.** Joplin's `sync_items.base_title` /
   `base_body`, updated on upload, download and conflict, is what makes 3-way merge
   possible after an offline period. Quire needs the same for every device and for the
   switchable local server node: the last version both sides agreed on, by content hash.
2. **Push local changes before pulling.** Ordering delete, upload, then download means
   the only place a conflict can be detected is the upload decision. Keep conflict
   detection in one place.
3. **Merge conservatively and fall back to keeping both.** Line-based diff3 with bounds,
   the duplicate-line guard, and "a false conflict beats a wrong merge" are sound.
   Word-level merge was tried and dropped by Joplin because it duplicated text; if Quire
   refines inside lines, it must test against that failure.
4. **Partial merge before asking.** Apply every clean hunk, then show only the true
   collisions.
5. **Delete-vs-edit is a conflict.** Keep the edit; never let a stale delete win
   silently.
6. **Fail-safe against mass deletion** when the remote suddenly looks empty or the
   target changes mid-sync.
7. **Re-run sync if changes arrived during sync**, and never report "synced" with
   pending local edits.
8. **Synced, automatic history** with restore, so users can audit what sync did.
9. **Lazy attachments** with download modes and a mobile size cap.
10. **Resumable sync:** persist the cursor after each page.

### Improve

1. **Conflict UX is Joplin's weakest point.** Copies land in a separate notebook with no
   built-in compare view, and the official help sends users to an external diff site.
   Quire should create a **conflict card** attached to the file itself: base, mine,
   theirs, hunk-by-hunk choices (keep mine, keep theirs, keep both, edit), visible
   from the file and from a vault-wide review queue, synced so any device can resolve it.
   Joplin's own in-progress `loadConflictData` (sections + word diff) confirms the
   direction.
2. **Do not make the remote silently win on the original.** Joplin overwrites the
   original with the remote and puts the local version aside, so the user's latest typing
   "moves" to another note. Quire should keep one file, with the conflict card showing
   both sides and leaving the file content stable until resolved (or inserting
   conflict regions explicitly, as SilverBullet does).
3. **Use versions and hashes, not wall-clock timestamps.** `updated_time > sync_time`
   is vulnerable to clock skew and same-millisecond edits (the code says so). Use
   per-file content hashes plus server revision numbers or vector clocks, and
   conditional writes (If-Match) on the server.
4. **Same-line edits:** Joplin conflicts on any edit to the same or adjacent line.
   Quire avoids most of this online through Yjs; for offline reconnect consider merging
   the Yjs updates when both sides have a CRDT history, and only fall back to text diff3
   when one side edited outside Quire.
5. **Metadata conflicts deserve review too.** Joplin's remote-wins for folders and tags
   silently drops renames and moves; Quire should apply rename/move as operations and
   surface real collisions (same file moved to two places, rename collisions).
6. **Make policies explicit and server-owned.** Revision retention converging to the
   minimum of all devices is surprising; keep vault-wide settings on the server.
7. **Live changes while online.** Joplin polls every 5 minutes by default, which is
   where most of its conflicts come from (`readme/apps/conflict.md`). Quire's live Yjs
   channel plus push notifications removes that window.
8. **Readable storage.** Quire keeps real Markdown files with real names; the sync
   layer must map renames and moves that Joplin never has to handle (Joplin IDs are
   file names).

## 11. Paths worth reading first

| Path | Why |
| --- | --- |
| `readme/dev/spec/sync.md` | Vocabulary, architecture, `sync_items`, `info.json` |
| `readme/dev/spec/sync_lock.md` | Lock types, TTL, lock file naming, target migration |
| `readme/dev/spec/server_delta_sync.md` | Cursor delta, event compression, resync rules |
| `readme/dev/spec/conflict_auto_merge.md` | 3-way auto-merge design and fallbacks |
| `readme/dev/spec/history.md` | Revision rules and retention |
| `readme/dev/spec/e2ee/index.md`, `readme/dev/spec/e2ee/native_encryption.md` | Encryption format and keys |
| `readme/apps/conflict.md` | User-facing conflict guidance (shows the UX gap) |
| `packages/lib/Synchronizer.ts` | The whole sync run (`start()`) |
| `packages/lib/services/synchronizer/utils/handleConflictAction.ts` | Conflict branching, merge application, conflict copies |
| `packages/lib/services/synchronizer/utils/syncDeleteStep.ts` | Tombstone push |
| `packages/lib/services/synchronizer/LockHandler.ts` | Lock algorithm |
| `packages/lib/services/synchronizer/syncInfoUtils.ts` | `info.json` merge |
| `packages/lib/services/conflict/diffNotes.ts`, `boundedDiff3.ts`, `autoMergeNote.ts` | Merge engine and guards |
| `packages/lib/services/conflict/loadConflictData.ts`, `wordDiff.ts` | Data for the upcoming compare view |
| `packages/lib/models/BaseItem.ts` | `serialize`, `unserialize`, `serializeForSync`, `itemsThatNeedSync`, sync time and base storage |
| `packages/lib/models/Note.ts` | `mustHandleConflict`, `createConflictNote`, `syncBaseContent` |
| `packages/lib/models/Resource.ts` | Resource conflicts, fetch states |
| `packages/lib/file-api.ts` | Driver interface, `basicDelta`, enhanced delta |
| `packages/lib/services/RevisionService.ts`, `packages/lib/models/Revision.ts` | History collection, diff storage, retention |
| `packages/lib/services/synchronizer/Synchronizer.conflicts.test.ts`, `Synchronizer.autoMerge.test.ts` | Executable spec of conflict behaviour |
| `packages/app-mobile/utils/database-driver-react-native.ts`, `packages/app-mobile/services/profiles/index.ts`, `packages/app-mobile/utils/buildStartupTasks.ts` | Mobile storage and startup |
| `packages/app-cli/tests/support/syncTargetSnapshots/` | Real sync target snapshots (normal and E2EE) |
