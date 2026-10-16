# SilverBullet: UX principles

Derived from `docs/` and code at rev `070a4881634b571c706ca949485d1298f131deae`.
Tracking reference: entries are ideas, marked Adopt, Adapt or Avoid for Quire.

| ID | Principle | Evidence | Quire |
| --- | --- | --- | --- |
| SB-UX-01 | **Files on disk are the source of truth, and others may edit them.** The app does not "own" the space; external editors, scripts and agents are expected writers. | `docs/Collaboration.md` | Adopt |
| SB-UX-02 | **Everything derived is disposable.** The object index can be flushed and rebuilt from Markdown at any time. | `docs/Object.md` ("Markdown always is the source of truth") | Adopt |
| SB-UX-03 | **Offline is the default, not a mode.** After first load the whole app and space work with no network; the service worker answers the HTTP API locally. | `docs/ADR/001 Offline-First PWA.md`, `docs/PWA.md` | Adopt |
| SB-UX-04 | **Merge silently when safe, at word granularity.** Different words in the same line merge cleanly; only same-word collisions conflict. | `docs/Collaboration.md`, `server-merge/src/refine.rs` | Adopt for offline reconnect |
| SB-UX-05 | **Conflicts live where the text lives.** A conflicting hunk is shown in place as a widget with both versions and the original, not as a separate file. | `client/codemirror/syntax/conflict_markers.ts` | Adopt the presentation; Adapt the storage (Quire keeps conflict state beside the file) |
| SB-UX-06 | **Resolving is just editing.** Pick a version, accept both, or edit manually; removing the markers resolves it. No separate "mark resolved" step. | `docs/Revisions.md` (Conflicts) | Adopt |
| SB-UX-07 | **A deletion never silently wins over an edit.** The edit survives and the user is told the deletion was suppressed. | `docs/Collaboration.md` (Offline and flaky networks), `client/spaces/sync.ts` | Adopt |
| SB-UX-08 | **Keep a safety net for every overwrite.** Content replaced by reconcile is stored and recoverable via a command. | `client/spaces/base_store.ts`, `Sync: Recover Stale Revision` | Adopt |
| SB-UX-09 | **Remote changes arrive without disrupting typing.** Cursor-preserving small edits, undoable, briefly highlighted, labelled with the author. | `client/external_merge.ts`, `docs/Collaboration.md` | Adopt (Yjs gives this online) |
| SB-UX-10 | **Quiet sync status.** Indicator only when sync takes more than a second; notification only on conflicts and suppressed deletions. | `docs/Sync.md` (Status) | Adopt |
| SB-UX-11 | **History is automatic and attributed.** Git commits after a quiet period, attributed to the account or to "External". | `docs/Revisions.md` | Adapt (Quire history need not be Git) |
| SB-UX-12 | **Deterministic conflict output.** Markers are ordered by content hash, so two replicas computing the same conflict produce the same text. | `server-merge/src/markers.rs` | Adopt the property |
| SB-UX-13 | **Raw markers are visible outside the app.** Conflicted files contain Git-style markers that other tools show verbatim. | `server-merge/src/markers.rs` | Avoid |
| SB-UX-14 | **Programmability first.** Much core behaviour is Space Lua and plugs inside the space. | `docs/Library.md`, `docs/Plugs.md` | Avoid for Quire's lean scope |
