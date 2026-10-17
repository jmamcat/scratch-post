# Joplin: feature inventory

Upstream rev `ef61ac2043d32f24ce0988e138c4ca20ffa8525c` (2026-10-16). Clients: D desktop
(Electron), M mobile (React Native, Android and iOS), W web app (mobile app in a browser),
C terminal CLI. "Rel." is relevance to Quire: H high (parity candidate for
sync/offline/mobile), M medium, L low. Doc paths are under `readme/` in the upstream;
code paths under `packages/`.

ID scheme: `JOP-F-###`. IDs are stable; never renumber, only append.

## Editing and content

| ID | Feature | Behaviour | Clients | Rel. | Source |
| --- | --- | --- | --- | --- | --- |
| JOP-F-001 | Markdown notes | Note = title + Markdown body; the title is a separate field, not the first heading | D M W C | M | `readme/apps/markdown.md` |
| JOP-F-002 | Markdown editor | Source editor with syntax highlighting (CodeMirror based) and optional side-by-side viewer | D M W | M | `readme/apps/markdown.md` |
| JOP-F-003 | Rich Text editor | WYSIWYG editor that converts to and from Markdown; lossy for some syntax (reference links, mixed lists, plugin syntax) | D | L | `readme/apps/rich_text_editor.md` |
| JOP-F-004 | Markdown extras | Math (KaTeX), Mermaid diagrams, chemical equations, ABC music notation, checkboxes, embedded HTML, markdown-it plugins toggled in settings | D M W | L | `readme/apps/markdown.md` |
| JOP-F-005 | HTML notes | `markup_language` field: 1 Markdown, 2 HTML (web clipper output) | D M W | L | `lib/models/Note.ts` |
| JOP-F-006 | Note links | `[text](:/<32-hex-id>)` internal links by ID, "Link to note" dialog | D M W | M | `readme/apps/link_to_note.md` |
| JOP-F-007 | External editor | Open a note in any external editor; changes are watched and saved back | D | L | `readme/apps/external_text_editor.md` |
| JOP-F-008 | To-dos and alarms | A note can be a to-do (`is_todo`, `todo_due`, `todo_completed`) with OS notifications | D M | L | `readme/apps/to-dos.md` |
| JOP-F-009 | Drawing | Built-in drawing editor on mobile; plugin on desktop | M (D plugin) | L | `readme/apps/drawing_tool.md` |
| JOP-F-010 | Whiteboards | JSONCanvas data stored in a fenced code block inside an ordinary note, so it syncs like text | D | L | `readme/apps/whiteboard.md` |
| JOP-F-011 | Scan notebook | Mobile flow to photograph several pages into one note | M | L | `readme/apps/scan_notebook.md` |
| JOP-F-012 | Voice typing / transcription | Speech to text into the note (mobile) | M | L | `readme/dev/spec/voice_typing.md` |

## Organisation and navigation

| ID | Feature | Behaviour | Clients | Rel. | Source |
| --- | --- | --- | --- | --- | --- |
| JOP-F-013 | Notebooks and sub-notebooks | Folders are database items with `parent_id`; not filesystem folders | D M W C | M | `readme/apps/subnotebooks.md` |
| JOP-F-014 | Tags | Many-to-many via `note_tags` items, each synced as its own item | D M W C | M | `lib/models/NoteTag.ts` |
| JOP-F-015 | Trash | Delete sets `deleted_time` (synced); restore returns to original notebook or root; auto-empty after `trash.ttlDays` = 90 | D M W | H | `readme/apps/trash.md`, `lib/models/settings/builtInMetadata.ts` |
| JOP-F-016 | Custom sort order | `order` field per note, drag to reorder | D M | L | `lib/models/Note.ts` |
| JOP-F-017 | Multiple profiles | Separate databases per profile (`joplin-<profileId>.sqlite` on mobile) | D M | L | `readme/apps/profiles.md` |
| JOP-F-018 | Multiple windows / instances | Notes in separate windows; separate app instances with isolated config | D | L | `readme/apps/multiple_instances.md` |

## Search

| ID | Feature | Behaviour | Clients | Rel. | Source |
| --- | --- | --- | --- | --- | --- |
| JOP-F-019 | Full-text search | SQLite FTS (`notes_fts`, `items_fts`) with BM25 ranking, filters (`notebook:`, `tag:`, `type:`, dates, `any:`) | D M W C | M | `readme/apps/search.md`, `lib/JoplinDatabase.ts` |
| JOP-F-020 | Goto Anything | Fuzzy jump to note, notebook, tag, command | D | M | `readme/apps/search.md` |
| JOP-F-021 | OCR | Text extracted from images and PDFs, stored on the resource (`ocr_text`), searchable; runs offline | D | L | `readme/apps/ocr.md` |
| JOP-F-022 | Semantic search | Optional local embedding model (~140 MB), index in `note_embeddings_meta`; off by default | D | L | `readme/apps/ai_semantic_search.md` |

## Attachments (resources)

| ID | Feature | Behaviour | Clients | Rel. | Source |
| --- | --- | --- | --- | --- | --- |
| JOP-F-023 | Attachments as resources | Each file is a Resource item (metadata) plus a blob; referenced from notes as `:/<id>` | D M W C | H | `readme/apps/attachments.md` |
| JOP-F-024 | Attachment download mode | `sync.resourceDownloadMode`: `always` (default), `auto` (when note opened), `manual` (on click) | D M | H | `lib/models/settings/builtInMetadata.ts` |
| JOP-F-025 | Mobile attachment size cap | Synchronizer refuses to download resources >= 100 MB on mobile ("the mobile app would crash"); item marked sync-disabled | M | H | `lib/Synchronizer.ts` (`maxResourceSize`) |
| JOP-F-026 | Orphan resource cleanup | Resources indexed before every sync; unreferenced ones can be auto-deleted later | D M | M | `lib/services/ResourceService.ts` |

## Sync

| ID | Feature | Behaviour | Clients | Rel. | Source |
| --- | --- | --- | --- | --- | --- |
| JOP-F-027 | Offline-first | Full dataset in a local SQLite database on every client; all editing works offline | D M W C | H | `readme/dev/spec/sync.md` |
| JOP-F-028 | Pluggable sync targets | Joplin Cloud (10), Joplin Server (9), Server SAML, Nextcloud (5), WebDAV (6), Dropbox (7), OneDrive (3), S3 (8), filesystem (2), memory (1, tests) | D M W C | H | `lib/SyncTarget*.ts` |
| JOP-F-029 | Upload soon after edit | Changes scheduled for upload within seconds; "sync as you type" re-run interval 1 s mobile, 15 s desktop | D M | H | `lib/registry.ts` (`syncAsYouTypeInterval`) |
| JOP-F-030 | Periodic pull | `sync.interval` default 300 s (options: disabled, 5/10/30 min, 1/12/24 h) | D M | H | `lib/models/settings/builtInMetadata.ts` |
| JOP-F-031 | Manual sync | Sync button; CLI `joplin sync` usable from cron | D M C | M | `readme/apps/sync/index.md` |
| JOP-F-032 | Delta sync | Joplin Server/Cloud cursor-based delta with item content bundled ("delta with items", 2x faster first sync); other targets use a directory-listing "basic delta" | D M W C | H | `readme/dev/spec/server_delta_sync.md`, `readme/news/20231223-faster-sync.md` |
| JOP-F-033 | Sync locks | SYNC (shared) and EXCLUSIVE (target upgrade, info.json change) lock files; TTL 3 min, refresh 60 s | D M C | M | `readme/dev/spec/sync_lock.md`, `lib/services/synchronizer/LockHandler.ts` |
| JOP-F-034 | Sync target versioning | `info.json` holds target version, E2EE state, keys, min app version; outdated clients blocked, upgrade flow with app restart | D M C | M | `lib/services/synchronizer/syncInfoUtils.ts`, `MigrationHandler.ts` |
| JOP-F-035 | Wipe-out fail-safe | `sync.wipeOutFailSafe` (default on): do not delete local data when the target appears empty or info.json disappears mid-sync | D M | H | `lib/file-api.ts`, `lib/Synchronizer.ts` |
| JOP-F-036 | Mobile data / Wi-Fi only | `sync.mobileWifiOnly`; NetInfo detects cellular or expensive connections and warns | M | H | `app-mobile/root.tsx` |
| JOP-F-037 | Sync status and errors | Progress report, per-item "cannot sync" list (`sync_disabled`, reason), sync status export (CLI) | D M C | M | `lib/services/synchronizer/utils/checkDisabledSyncItemsNotification.ts` |
| JOP-F-038 | Multiple sync targets per item | `sync_items` scoped by `sync_target`, so switching targets keeps state per target | D M | L | `readme/dev/spec/sync.md` |

## Conflicts

| ID | Feature | Behaviour | Clients | Rel. | Source |
| --- | --- | --- | --- | --- | --- |
| JOP-F-039 | Conflict detection | Local item changed since last sync AND remote `updated_time` > local `sync_time`, or remote deleted while local changed | all | H | `lib/Synchronizer.ts` (upload step) |
| JOP-F-040 | Conflict copies in "Conflicts" notebook | Local version copied to a new note with `is_conflict = 1`, `conflict_original_id`; remote overwrites the original; shown in a virtual notebook (fixed id `c04f1c7c04f1c7c04f1c7c04f1c7c04f`) | all | H | `lib/services/synchronizer/utils/handleConflictAction.ts`, `lib/models/Note.ts` |
| JOP-F-041 | Ignore trivial conflicts | Note conflict only if title or body differ (or either side encrypted); metadata-only conflicts take remote | all | H | `Note.mustHandleConflict` |
| JOP-F-042 | Auto-merge (3-way) | `sync.autoMergeConflicts` (default on): line-based diff3 against stored base; clean merge saves merged note, no conflict note. On `dev` (app 3.7.21); not in release notes up to 3.7, so likely unreleased (unverified) | all | H | `readme/dev/spec/conflict_auto_merge.md`, `lib/services/conflict/` |
| JOP-F-043 | Partial merge | When some hunks collide, non-conflicting hunks are applied to both the original and the conflict copy, so they differ only where a real conflict remains | all | H | `lib/services/conflict/autoMergeNote.ts` |
| JOP-F-044 | Synced conflict notes | Conflict notes with an original id and no share are synced to other devices; deleting one deletes it everywhere | all | H | `BaseItem.itemsThatNeedSync`, `Synchronizer.conflicts.test.ts` |
| JOP-F-045 | Attachment conflicts | Blob changed on both sides: local blob duplicated into a new resource, note "Attachment conflict: ..." created in "Conflicts (attachments)" notebook; remote wins on the original | all | H | `lib/models/Resource.ts` (`createConflictResourceNote`) |
| JOP-F-046 | Folder/tag conflicts | Non-note items: remote version wins silently; remote-deleted non-empty folder: its notes marked `is_conflict` | all | M | `handleConflictAction.ts`, `Synchronizer.ts` (delta step) |
| JOP-F-047 | Conflict resolution UI (in progress) | Backend computes 3-way sections and word diffs (`loadConflictData`, `wordDiff`) for a compare/merge view; gated by `featureFlag.conflictResolution` (default false); no GUI consumer found at this rev | none yet | H | `lib/services/conflict/loadConflictData.ts`, `isConflictResolutionEnabled.ts` |
| JOP-F-048 | Third-party conflict plugin | Community "Conflict Resolution" plugin offers a diff/merge view | D | M | https://discourse.joplinapp.org/t/plugin-conflict-resolution/ |

## History

| ID | Feature | Behaviour | Clients | Rel. | Source |
| --- | --- | --- | --- | --- | --- |
| JOP-F-049 | Note history (revisions) | Diff-based revisions saved at most every 10 min per note, plus a "before" snapshot for notes untouched for 7 days; synced as items | D M W | H | `readme/dev/spec/history.md`, `lib/services/RevisionService.ts` |
| JOP-F-050 | Revision retention | `revisionService.ttlDays` default 90; effectively the minimum across devices because deletions sync; setting now carried in `info.json` | D M | H | `lib/models/Revision.ts`, `lib/Synchronizer.ts` |
| JOP-F-051 | Restore as copy | Restoring a revision creates a new note in a "Restored Notes" notebook; current note untouched | D M | H | `RevisionService.restoreNoteById` |
| JOP-F-052 | History viewer | Desktop and mobile revision viewers (help page still says desktop only) | D M | M | `app-desktop/gui/NoteRevisionViewer.tsx`, `app-mobile/components/screens/NoteRevisionViewer.tsx` |
| JOP-F-053 | Delete history | Per-note "Delete history" action | D M | L | `lib/components/shared/NoteRevisionViewer/useDeleteHistoryClick.ts` |

## Security

| ID | Feature | Behaviour | Clients | Rel. | Source |
| --- | --- | --- | --- | --- | --- |
| JOP-F-054 | End-to-end encryption | Items encrypted at serialization for sync, decrypted by a background worker; AES-256-GCM, PBKDF2-HMAC-SHA512 | all | M | `readme/dev/spec/e2ee/` |
| JOP-F-055 | Master password and keys | One master password encrypts data keys and the private key; changeable; reset disables old keys | all | M | `readme/dev/spec/e2ee/index.md` |
| JOP-F-056 | Note lock | Per-note lock (`is_locked`); locked notes skip auto-merge and plaintext revisions are deleted | D M | L | `lib/services/noteLock/` |
| JOP-F-057 | MFA, SSO (server) | Joplin Server supports MFA, SAML, LDAP | server | L | `readme/apps/mfa.md`, `readme/apps/server/` |

## Sharing and cloud services

| ID | Feature | Behaviour | Clients | Rel. | Source |
| --- | --- | --- | --- | --- | --- |
| JOP-F-058 | Share notebook | Joplin Cloud/Server: share a notebook with other users, read-only or read-write; E2EE via public/private key exchange | D M | M | `readme/apps/share_notebook.md`, `readme/dev/spec/server_sharing.md` |
| JOP-F-059 | Read-only items | Shared read-only items rejected on upload; local edits become conflicts | D M | M | `readme/dev/spec/read_only.md` |
| JOP-F-060 | Publish note | Public web link to a single note | D M | L | `readme/apps/publish_note.md` |
| JOP-F-061 | Email to note | Forward email to a Joplin Cloud address; lands in "Inbox" notebook | cloud | L | `readme/apps/email_to_note.md` |
| JOP-F-062 | Web app | Mobile app in the browser; local-first in browser storage (sqlite-wasm on OPFS) | W | M | `readme/apps/web.md`, `app-mobile/utils/database-driver-react-native.web.ts` |

## Extensibility, import/export, AI

| ID | Feature | Behaviour | Clients | Rel. | Source |
| --- | --- | --- | --- | --- | --- |
| JOP-F-063 | Plugins | Plugin API, `.jpl` packages, plugin repository; desktop and mobile | D M | L | `readme/apps/plugins.md` |
| JOP-F-064 | Web clipper | Browser extension talks to a local service started by desktop | D | L | `readme/apps/clipper.md` |
| JOP-F-065 | REST data API | Local HTTP API (also exposes revisions) | D C | L | `lib/services/rest/routes/revisions.ts` |
| JOP-F-066 | Import | ENEX (Evernote), Markdown file or directory (folder structure kept as notebooks), OneNote; JEX and RAW import (unverified) | D C | M | `readme/apps/import_export.md` |
| JOP-F-067 | Export | JEX (lossless tar of items), HTML, PDF; Markdown and Markdown with front matter (unverified in UI) | D C | M | `readme/apps/import_export.md`, `readme/dev/spec/interop_with_frontmatter.md` |
| JOP-F-068 | AI chat and MCP | Optional chat model connection and MCP server exposing note tools; off by default | D | L | `readme/apps/ai_chat.md`, `readme/apps/ai_mcp.md` |
| JOP-F-069 | Custom CSS | User CSS for app and rendered notes | D | L | `readme/apps/custom_css.md` |
| JOP-F-070 | Accessibility | Screen reader support documented | D M | M | `readme/apps/screen_reader_accessibility.md` |

Count: 70 features (JOP-F-001 to JOP-F-070).
