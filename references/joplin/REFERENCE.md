---
# Machine-readable header. Agents read this block; keep keys stable.
id: joplin
name: Joplin
role: primary                 # primary for sync, offline and mobile architecture
review_cadence: per-change    # per-change for sync/offline/mobile changes; quarterly otherwise
source: open
license: AGPL-3.0-or-later    # study only, never copy code into Quire
included_on: 2026-10-16
last_reviewed: 2026-10-16
upstream:
  - path: upstream/joplin
    url: https://github.com/laurent22/joplin
    branch: dev
    pinned: ef61ac2043d32f24ce0988e138c4ca20ffa8525c
---

# Joplin

## Why it is in the set

Joplin is the most widely used open-source, offline-first Markdown notes app with
mature desktop, Android, iOS, terminal and web clients that all sync through one
pluggable engine (Joplin Cloud/Server, WebDAV, Nextcloud, Dropbox, OneDrive, S3,
local filesystem). It answers Quire's hardest questions with years of production
evidence: how an offline device reconciles with a server, how conflicts are detected
and surfaced, how note history is kept and synced, how E2EE coexists with sync, how
attachments are moved lazily, and how a React Native app stores everything locally.
Its `dev` branch now has a line-based 3-way auto-merge with a stored common ancestor
(not yet in release notes up to 3.7), which is directly comparable to Quire's planned
reconnect merge.

## How we use it

- **Role:** primary for sync, offline and mobile architecture only. Its sync
  behaviours are parity candidates for Quire's offline/reconnect path; its editor,
  notebook model and UI are not (Obsidian is the baseline for those).
- **Review cadence:** per-change for any Quire change touching sync, offline storage,
  conflict handling, history or the Android app. Quarterly otherwise. Early review when
  upstream changes `packages/lib/Synchronizer.ts`,
  `packages/lib/services/synchronizer/` or `packages/lib/services/conflict/`.
- **License:** AGPL-3.0-or-later (root `LICENSE`; `packages/server` has its own
  `LICENSE.md`). Study only. Do not copy, translate or closely paraphrase Joplin code
  into Quire. Re-derive behaviour from specs and our own tests.
- **Borrow:**
  - Offline-first: every client holds the full dataset locally and works with no
    network; sync is a background reconciliation, never a precondition for editing.
  - Push soon, pull on a timer, plus "re-sync if outgoing changes remain" at the end of
    every run, to keep the conflict window short.
  - A per-item, per-target sync state table (`sync_items`) holding last sync time,
    remote timestamp and the **last agreed base content** for 3-way merge.
  - Never lose either side: an unmergeable conflict keeps both versions.
  - Merge safety rails: line-based diff3, bounded diff time and size, refuse to merge
    when edits touch runs of identical lines, fall back to keeping both.
  - Partial merge: apply all non-conflicting hunks to both sides before asking the
    human, so the conflict shows only what really collides.
  - Remote delete vs local edit treated as a conflict (the edit survives as a conflict
    copy). Note the gap: a local permanent delete is pushed without checking remote edits.
  - Fail-safe: refuse to wipe local data when the remote suddenly looks empty.
  - Synced note history with time-based retention, and restore-as-copy.
  - Lazy attachment download modes (always, auto on open, manual).
  - Tombstones (`deleted_items`) pushed before uploads.
- **Reject:**
  - Opaque storage (SQLite plus `<32-hex-id>.md` files with key/value footers): Quire
    stores human-readable Markdown files with real names.
  - Timestamp-only change detection (`updated_time > sync_time`): fragile with clock
    skew and same-millisecond edits; Quire uses content hashes and versions.
  - Conflict copies dumped into a virtual "Conflicts" notebook with no compare view:
    Quire uses inline, reviewable conflict cards.
  - Whole-note last-writer-wins for non-note items (folders, tags): Quire keeps
    metadata conflicts reviewable too.
  - Poll-only pull (5 minute default): Quire is live (Yjs) while online.
  - Global history settings that silently converge to the minimum across devices.
  - File-based lock protocol on dumb storage targets: Quire has a real server.

## Product definition

| File | Contents |
| --- | --- |
| `product/features.md` | Feature inventory, grouped, with IDs (`JOP-F-###`) |
| `product/ux-principles.md` | Interaction and design principles, with IDs (`JOP-UX-##`) |
| `product/data-model.md` | Storage format, item serialization, sync algorithm, conflicts, history, E2EE, attachments, mobile storage, lessons for Quire |
| `product/visuals/README.md` | What to capture and where (captures are gitignored) |

## Upstream (open source only)

How to fetch and update the copy: `playbook/bin/refs.sh update joplin`.

The repository is very large. For study, prefer a blobless sparse clone outside the
workspace:

```sh
GIT_LFS_SKIP_SMUDGE=1 git clone --depth 1 --filter=blob:none --sparse https://github.com/laurent22/joplin
cd joplin && git sparse-checkout set --no-cone '/LICENSE' '/readme/dev/spec/' '/readme/apps/' \
  '/packages/lib/Synchronizer.ts' '/packages/lib/file-api.ts' '/packages/lib/models/' \
  '/packages/lib/services/synchronizer/' '/packages/lib/services/conflict/' \
  '/packages/lib/services/RevisionService.ts' '/packages/lib/services/e2ee/'
```

Paths worth reading first (full list with reasons in `product/data-model.md`):

- `readme/dev/spec/sync.md`, `readme/dev/spec/sync_lock.md`, `readme/dev/spec/conflict_auto_merge.md`
- `packages/lib/Synchronizer.ts` (`start()`: delete, upload, delta steps)
- `packages/lib/services/synchronizer/utils/handleConflictAction.ts`
- `packages/lib/services/conflict/diffNotes.ts`, `autoMergeNote.ts`, `loadConflictData.ts`
- `packages/lib/models/BaseItem.ts` (`serialize`, `serializeForSync`, `itemsThatNeedSync`)
- `packages/lib/services/RevisionService.ts`, `packages/lib/models/Revision.ts`

## Review log

| Date | Reviewer | Upstream rev | Notes |
| --- | --- | --- | --- |
| 2026-10-16 | agent (Claude) | ef61ac2043d32f24ce0988e138c4ca20ffa8525c | Initial inclusion. Studied sync engine, conflict auto-merge (new), revisions, E2EE, resources, mobile storage. Conflict-resolution UI is behind `featureFlag.conflictResolution` (default false) and not present in the desktop or mobile GUI at this rev. |
