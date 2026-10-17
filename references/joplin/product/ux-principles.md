# Joplin: UX principles

Derived from Joplin docs (`readme/apps/`, `readme/dev/spec/`) and code at rev
`ef61ac2043d32f24ce0988e138c4ca20ffa8525c`. Each principle states what Joplin does, the
evidence, and how Quire should treat it (Adopt, Adapt, Avoid).

| ID | Principle | Evidence | Quire |
| --- | --- | --- | --- |
| JOP-UX-01 | **Never block on the network.** Every client works fully offline against a local copy; sync is a background activity the user can ignore. | `readme/dev/spec/sync.md` ("offline first"), local SQLite on all clients | Adopt |
| JOP-UX-02 | **Data is never silently discarded in a conflict.** When both sides changed a note, both versions survive (original plus conflict copy). | `readme/apps/conflict.md`, `handleConflictAction.ts` | Adopt |
| JOP-UX-03 | **Merge what is safe, show only what really collides.** Non-overlapping edits merge silently; partial merges remove noise from the remaining conflict. | `readme/dev/spec/conflict_auto_merge.md`, `autoMergeNote.ts` | Adopt |
| JOP-UX-04 | **Prefer a false conflict over a wrong merge.** Merge is line-based (word-level was tried and dropped because it could duplicate text); ambiguous duplicate-line edits and oversized diffs fall back to a conflict. | `conflict_auto_merge.md` ("Word-level merging was tried and dropped") | Adopt, but see JOP-UX-12 |
| JOP-UX-05 | **Upload fast, so the next device sees the latest.** Changes upload within seconds; a sync re-runs if edits arrived during sync, so "sync completed" is not shown with pending changes. | `Synchronizer.ts` end of `start()`, `registry.ts` | Adopt (Quire: live while online) |
| JOP-UX-06 | **History is a trust feature, not a power feature.** Note history exists so users can investigate "where did my text go" and recover; it is automatic, synced, and needs no setup. | `readme/apps/note_history.md` | Adopt |
| JOP-UX-07 | **Restore never overwrites.** Restoring a revision creates a copy in "Restored Notes"; the current note is untouched. | `RevisionService.importRevisionNote` | Adapt: Quire may restore in place as an undoable change, with the replaced version kept in history |
| JOP-UX-08 | **Protect against catastrophic sync, by default.** Fail-safe refuses to wipe local data when the target looks empty; locks and target versioning stop old clients from corrupting a newer format. | `sync.wipeOutFailSafe`, `readme/dev/spec/sync_lock.md` | Adopt |
| JOP-UX-09 | **Respect mobile constraints.** Attachment download modes, mobile resource size cap (100 MB), Wi-Fi-only sync, cellular warning. | `sync.resourceDownloadMode`, `Synchronizer.maxResourceSize`, `app-mobile/root.tsx` | Adopt |
| JOP-UX-10 | **Show items that cannot sync.** Items rejected by the target are listed with a reason instead of failing the whole sync. | `sync_items.sync_disabled_reason`, `checkDisabledSyncItemsNotification.ts` | Adopt |
| JOP-UX-11 | **Conflict resolution is left to the user, with weak tools.** Conflicts land in a separate "Conflicts" notebook; the help page tells users to diff manually with an external website. A built-in compare view is in progress behind a feature flag. | `readme/apps/conflict.md`, `featureFlag.conflictResolution` | Avoid: Quire shows a conflict card in place, with base, mine and theirs, and one-click choices |
| JOP-UX-12 | **Line granularity makes edits on the same line conflict.** Two devices editing different words of one paragraph line produce a conflict. | `conflict_auto_merge.md` ("Edits on the same or adjacent lines therefore conflict") | Adapt: Quire's CRDT path avoids this online; offline 3-way merge may refine within a line when safe |
| JOP-UX-13 | **Avoid conflicts by advice.** Users are told to sync before and after editing. | `readme/apps/conflict.md` ("How to avoid conflicts?") | Avoid: the product, not the user, should prevent conflicts |
| JOP-UX-14 | **Settings that look local but act global.** Revision retention converges to the minimum across devices because deletions sync. | `readme/dev/spec/history.md` | Avoid: Quire keeps vault-wide policies on the server and shows them as such |
| JOP-UX-15 | **Encryption is opt-in and visible.** Encrypted, not yet decrypted items are shown (read-only) so users know they exist; the master password is never recoverable. | `readme/dev/spec/e2ee/index.md` | Adapt (E2EE is out of Quire's first scope) |
| JOP-UX-16 | **One engine, every client.** The same `packages/lib` sync code runs on desktop, mobile, web and CLI, so behaviour is consistent. | `packages/lib/Synchronizer.ts` shared by all apps | Adopt: one sync core shared by server node and Android |
