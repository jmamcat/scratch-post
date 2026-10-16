---
id: 0001-mvp-foundation/P08
title: Live editing, review inbox and version history in the web client
lane: D
depends_on: [P05, P07]
owns:
  - quire/apps/web/src/live/**
  - quire/apps/web/src/review/**
  - quire/apps/web/src/history/**
reads:
  - quire/apps/web/src/**
  - quire/changes/0001-mvp-foundation/spec/review/spec.md
  - quire/changes/0001-mvp-foundation/spec/live/spec.md
  - references/confluence/product/ux-principles.md
size: M
status: done
claimed_by: claude-code/claude
---

# Live editing, review inbox and history

## Context

Implements R-LIV-05, R-RVW-02..07, R-VLT-06 (UI). Uses `y-websocket` and
`y-codemirror.next`.

## Contract

- Live: when online, the open note joins `/live?path=` and binds CodeMirror to
  `Y.Text("content")`; `SyncClient.setLive(path, true)` while connected. On disconnect,
  unbind, mark not live, keep the editor content as the local text. On reconnect, sync
  first, then rejoin. Remote cursors via awareness (name = device).
- Review inbox: drawer opened from the status-bar badge. Open conflicts first, then
  "Review suggested". Card: path, "<current device> · <time>" vs "<incoming device> · <time>",
  each hunk side by side with Keep current / Keep incoming / Keep both / Edit; record-level
  Keep all current / Keep all incoming; Apply. Review items: Accept / Change.
  Delete-edit: Keep note / Delete note.
- Banner on a note with an open conflict: "This note has unresolved changes from <device>. Review".
- History drawer (command "Show version history"): revisions newest first with device and
  time, preview in reading view, Restore.

## Acceptance

```sh
pnpm -C quire --filter @quire/web typecheck
pnpm -C quire --filter @quire/web build
```

Result (2026-10-16): typecheck exit 0; build exit 0.

Manual check against the real server (Playwright Chromium, two browser contexts A and B, server
from `apps/server` serving the build):

- Live: A and B open `Ideas.md`, both show "Live · 1 other"; A types, B sees it without reload;
  remote cursor labelled with the device name.
- Offline fallback: A goes offline, the live binding drops (chip disappears), A keeps typing
  while B types live; A reconnects, syncs first, rejoins; A and B converge with both edits
  (clean merge once the room had committed A's earlier live text; see D-P08-2).
- Review: fixtures made over HTTP (two-hunk content conflict, a both-inserted review item, a
  delete-edit). Badge reads "3 open conflicts, 1 to review"; banner "This note has unresolved
  changes from tablet. Review" opens the inbox at the card; Keep incoming on hunk 1 and Keep
  both on hunk 2, Apply: server text reflects both choices, record `resolved`, banner gone.
  Review item Accept: `dismissed`. Delete-edit Delete note: `resolved`, note deleted.
- History: command "Show version history" lists revisions newest first with time and device;
  selecting one previews it in reading view; Restore makes it the head (through the live room,
  B's copy follows).

## Decisions log

- **D-P08-1** · confidence: med
  - Question: Wiring P08 into the shell needs small edits outside P08's `owns`.
  - Did: edited P07 files from the same lane after P07 was done: `src/App.tsx` (badge, live
    chip, banner, drawers, commands "Open review inbox" and "Show version history", header
    button "Version history"), `src/components/Editor.tsx` (`collabSlot` compartment, `isLive`,
    view created in a layout effect so the handle exists on first render),
    `src/store/workspace.ts` (`setLive`, live notes not counted as pending).
  - Why: P07 exposes no plug-in points otherwise; same worker owns both packets.
  - Reverse: the listed hunks in those three files.
- **D-P08-2** · confidence: med
  - Question: What is the base when a live session drops with edits the room has not
    committed yet?
  - Did: follow the contract literally: unbind, mark not live, keep the editor text as the
    local copy (its base is the last committed revision pulled while live), and on reconnect
    sync first, then rejoin with a fresh `Y.Doc`. Edits typed live in the last 1.5 s before the
    drop, plus overlapping offline edits, can therefore come back as an open conflict rather
    than a silent merge. Nothing is lost.
  - Why: R-LIV-05, R-SYN-05. Using the last room text as the base could silently drop live
    edits that never reached the server (a dead socket is only noticed after up to 30 s).
    Keeping the old `Y.Doc` across the outage is not possible because the room may be gone.
  - Reverse: in `src/live/live.ts`, remember `ytext` at drop and rebase onto the head with it
    before the push.
- **D-P08-3** · confidence: med
  - Question: Drop detection and rejoin timing.
  - Did: drop on the provider's `disconnected` status or when the workspace goes offline
    (browser `offline`, failed sync, event stream lost and a sync failing). Rejoin on `online`
    or by backoff 1 s to 30 s. Text typed during the join handshake is merged into the room
    with `merge3(textAtJoin, typed, roomText)`.
  - Why: R-LIV-05; never drop typing.
  - Reverse: `LiveSession` in `src/live/live.ts`.
- **D-P08-4** · confidence: med
  - Question: Undo while live.
  - Did: `yCollab` with a `Y.UndoManager`, at `Prec.high` so Mod+Z undoes only this device's
    edits; outside live, CodeMirror history.
  - Why: undoing other people's edits would surprise; y-codemirror.next default.
  - Reverse: drop `Prec.high` / the undo manager in `src/live/live.ts`.
- **D-P08-5** · confidence: med
  - Question: Which hunks a card shows and how much context.
  - Did: unresolved hunks and auto-merges flagged for review (`intraline`, `both-inserted`)
    are shown side by side; silent merges (`false-conflict`, `whitespace`) render as context.
    Unchanged runs collapse to 2 lines of context with an "N unchanged lines" expander.
    "Preview result" shows `applyChoices(segments, choices)`. Apply is enabled once every
    unresolved hunk has a choice; Keep all current / Keep all incoming set every shown hunk.
  - Why: R-RVW-03; CNF-UX-04 (collapse unchanged runs); CNF-UX-06.
  - Reverse: `needsEyes` and `Context` in `src/review/ConflictCard.tsx`.
- **D-P08-6** · confidence: med
  - Question: What "Edit" sends.
  - Did: a per-hunk textarea, prefilled with the hunk's current choice (or the auto text, or
    current), sent as the `{ text }` choice for that hunk, not as a whole-document
    `Resolution.text`.
  - Why: keeps the rest of the record's choices and the server-side merge (R-RVW-04).
  - Reverse: `HunkView` in `src/review/ConflictCard.tsx`.
- **D-P08-7** · confidence: high
  - Question: Badge visibility and offline.
  - Did: badge always visible (inbox icon + open count, "+N" for review items); conflicts
    are cached in IndexedDB `meta` so the last known count shows offline; the inbox says it
    is offline and resolving needs the server.
  - Why: R-RVW-02 "at all times".
  - Reverse: `src/review/conflicts.ts`, `src/review/ConflictBadge.tsx`.
- **D-P08-8** · confidence: high
  - Question: How Restore writes.
  - Did: through the open editor (`replaceText`), so it reaches the live room when live and
    the local copy otherwise; it is an ordinary edit that becomes a new revision. Restore is
    disabled for the current and for deleted revisions.
  - Why: R-VLT-06, CNF-UX-03.
  - Reverse: `onRestore` in `src/App.tsx`, `src/history/HistoryDrawer.tsx`.
- **D-P08-9** · confidence: med
  - Question: Drawer form and banner wording for delete-edit.
  - Did: both drawers are non-modal side panels (`role="dialog"`, Escape closes) so the note
    stays visible. Delete-edit cards say who deleted and that the edited note was kept; the
    banner names the device whose change is pending (the deleting one for delete-edit).
  - Why: design.md "entry point is a notification on the affected note, not a modal".
  - Reverse: `src/review/Drawer.tsx`, `src/review/NoteBanner.tsx`.
