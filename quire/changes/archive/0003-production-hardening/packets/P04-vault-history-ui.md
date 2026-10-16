---
id: 0003-production-hardening/P04
title: Vault history in the app
lane: F
depends_on: [P02]
owns:
  - quire/apps/web/src/backup/**
  - quire/scenarios/steps/backup-ui.steps.ts
borrows: []
reads:
  - quire/changes/0003-production-hardening/**
  - quire/spec/**
  - quire/apps/web/src/**
  - quire/apps/server/src/backup/**
  - quire/packages/sync/src/**
  - quire/scenarios/**
size: S
revision: 1
status: done
claimed_by: claude-code/tier-B
---

# Vault history in the app

## Context

Implements R-BAK-07 (`quire/changes/0003-production-hardening/spec/backup/spec.md`). The
command "Open vault history" already opens `VaultHistory` from `apps/web/src/backup/`
(a stub). The API is P02's: `GET /api/changesets?limit=` gives `ChangeSet[]` newest first;
`POST /api/changesets/:id/restore` with `{ device }` restores. Call them with
`ws.transport.request(method, path, body)`.

## Contract

```ts
export function VaultHistory(props: { ws: Workspace; onClose: () => void }): JSX.Element;
```

- A drawer (reuse `shared/Drawer.tsx`) titled "Vault history" with a list
  (`aria-label="Vault history"`) of change sets, each an element with `data-changeset="<id>"`
  showing the time span (relative for today, else date and time), the device and the changed
  notes by title (first five, then "and N more"), and a button "Restore vault to here".
- Restore asks for confirmation (`shared/Modal.tsx` `ConfirmDialog`, text naming the time and
  "Every note returns to how it was then. You can undo this from the vault history."), then
  posts, then `ws.syncNow()` and reloads the list.
- Offline or when the server refuses: show "Vault history needs the server." and no list.
- Styles in `backup/vault-history.css` using the theme variables.
- Steps (`quire/scenarios/steps/backup-ui.steps.ts`): `the vault history on "d" lists N
  change sets` (count `[data-changeset]` items, waiting up to 10 s) and `"d" restores the
  vault to change set N in the app` (the Nth item, newest first, then confirm).

## Acceptance

```sh
export QUIRE_WEB_DIST=/tmp/quire-web-P04
pnpm -C quire --filter @quire/web exec vite build --outDir "$QUIRE_WEB_DIST" --emptyOutDir
playbook/bin/gate.sh check
playbook/bin/gate.sh scenarios "@R-BAK-07|@R-BAK-02|@R-BAK-03"
```

**Unblocked by the coordinator (2026-10-16).** `@ui` scenario servers now use a 3 second
change-set gap (browser edits reach the server through live rooms that flush 1.5 s after
typing), and R-BAK-07 waits 4 seconds between its edits. `gate.sh scenarios "@R-BAK-07"`:
1 passed. No P04 code changed.

## Decisions log

Result (2026-10-16, own build in `/tmp/quire-web-P04`):

- `gate.sh check`: typecheck clean, no dependency violations, structure 0 violations (7 soft-limit warnings, none in `backup/`).
- `gate.sh scenarios "@R-BAK-07|@R-BAK-02|@R-BAK-03"`: **4 passed, 1 failed**. R-BAK-02 (2) and R-BAK-03 (2) pass. R-BAK-07 fails alone and in the group, three runs of three, always at `Then the vault history on "pixel" lists 2 change sets`: the list shows **3** change sets.
- Cause, not in this packet's paths: in the browser, `pixel has "a.md" reading "one"` first creates an empty `a.md` (`Workspace.create` writes `''`, `syncSoon(1000)` pushes it as revision 1), then the live room commits `one` about 1.7 s later (revision 2), and `two` after the 2 s pause (revision 3). The scenario server's change-set gap is 1 s, so revision 1 and 2 are separate change sets. The server's list is correct (`/api/changesets` returned 3 sets, ids 3, 2, 1); the app shows what the server returns.
- With the count check temporarily relaxed to `>= N`, the whole scenario passes (12 s): change set 2 is `one`, restore and confirm work, and `a.md` reads `one` on the cloud server. So only the count differs. I restored the strict step.
- To unblock (coordinator decides, all outside P04's `owns`): (a) `apps/web/src/sync/workspace.ts` / live: do not push a brand-new empty note until it has text or the live room has flushed (also what the R-VLT `notes/New.md lists 2 revisions` scenario would then see; check it); or (b) change the spec scenario count to 3 or move the empty-create commit out of the way in the shared `has ... reading` step (`scenarios/steps/notes.steps.ts`, UI layer only), e.g. wait for the live room's commit before the pause.

## Decisions log (P04)

- **D-P04-1** · confidence: low
  - Question: The R-BAK-07 scenario expects 2 change sets after two edits, but the browser produces 3 (empty create, first text, second text).
  - Did: Kept the step strict (count of `[data-changeset]` equals N). Did not merge or hide change sets in the list, and did not touch sync, live or the shared steps. Marked the packet blocked.
  - Why: Never weaken a scenario; paths outside `owns`. Hiding a real change set would make the restore numbering lie.
  - Reverse: See "To unblock" above. If the coordinator allows, the fix is one of the two listed changes; no P04 code changes.
- **D-P04-2** · confidence: med
  - Question: What does "relative for today" mean for the time span?
  - Did: Today shows `Today 14:02-14:05` (one time if start and end match in the minute); other days show date and time with the span; a set crossing midnight shows both ends. No "5 minutes ago" wording.
  - Why: Stable text, readable in a list that stays open; the existing `formatTime` in `shared/Drawer.tsx` also prints clock time for today.
  - Reverse: `spanLabel` in `apps/web/src/backup/VaultHistory.tsx`.
- **D-P04-3** · confidence: med
  - Question: Which time does the confirmation name, and what does the restore button restore to?
  - Did: The confirmation names the end of the change set ("Restore the whole vault to how it was at <end>?"), because the server restores the state at the end of the set.
  - Why: P02 restore semantics (`rev <= last_rev`).
  - Reverse: the `ConfirmDialog` message in `VaultHistory.tsx`.
- **D-P04-4** · confidence: med
  - Question: How are server refusals shown?
  - Did: A network failure (not an `HttpError`) on load or restore shows "Vault history needs the server." and no list. A refusal with a status (for example P02's `409 the vault already matches change set N`, D-P02-2) shows the server's message above the list, list kept.
  - Why: The packet says "offline or when the server refuses"; a 409 on restore is not "needs the server" and the list is still true. A failed load of the list (any error) shows the server message.
  - Reverse: `restore` and `load` catch blocks in `VaultHistory.tsx`.
- **D-P04-5** · confidence: high
  - Question: Refresh the list when other devices commit?
  - Did: The drawer reloads (500 ms debounce) on server `commit` events.
  - Why: A list of history should not go stale while it is open. No new dependency.
  - Reverse: the `onServerEvent` effect in `VaultHistory.tsx`.
