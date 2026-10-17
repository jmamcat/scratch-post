---
change: 0005-live-room-limit
run: 2026-10-17-02
agents: [claude-code/tier-A (single agent; no worker packets)]
result: complete
---

# Run report: Live rooms honour the note size limit

## Execution

| Packet | Run by | Mode | Coordinator ran it |
| --- | --- | --- | --- |
| P01 reproduce, fix, verify (fix-bug play) | single agent, tier A | sequential | yes: one module and two steps |

## Usage

One slice; tokens not reported per slice (`usage/ledger.csv`, scope `change`, source
`unknown`).

## Summary

- **Cause.** `access/guard.ts` caps HTTP bodies at `QUIRE_MAX_NOTE_BYTES`. Live rooms
  (`live/rooms.ts`) apply Yjs updates and commit the room text with no size check, so a
  paste, or an offline doc rejoining, could commit a note of any size.
- **Fix.** Rooms take `maxTextBytes` (wired from `config.maxNoteBytes` in `main.ts`).
  - Before a sync message is applied, the room keeps its text, but only when the message
    could cross the limit. The bound is cheap: UTF-16 length × 3 plus the message size.
  - If the text is over the limit afterwards, the room diffs back to the kept text, so
    every device converges on it. The sending connection is closed with 4413 ("note too
    large").
  - As a second guard, `flushRoom` never commits an oversized text; it resets the room to
    the last committed text instead.
- **Structure.** The diff-to-text helper moved to `live/text.ts` (`replaceText`), so
  `rooms.ts` stays under the 300-line soft limit (297).
- **Scenario.** R-ACC-06 "Oversized live edit": 1 KiB limit, a 2 KiB paste, both devices
  converge on the earlier text and the server keeps it. Failed before the fix (`pixel` kept
  the paste), passes after.

## I have some questions, but I proceeded with these recommendations

| # | Question | What I did | Confidence | To reverse |
| --- | --- | --- | --- | --- |
| D-0005-1 | Refuse oversized frames at the socket (`maxPayload`)? | No. A refused frame never reaches the room, so y-websocket would resend it on every reconnect, forever. Applying it and then undoing it lets the CRDT settle. The `ws` default cap (100 MiB) stays | med | `new WebSocketServer({ maxPayload })` in `rooms.ts` |
| D-0005-2 | Undo to what? | To the room's text just before the message, so other people's uncommitted typing survives; to the last committed text only in the flush guard | high | `rooms.ts` message handler |
| D-0005-3 | Tell the person in the app? | Not in this change: the web client reconnects and shows the earlier text. A message for close code 4413 is a follow-up (`sessions/NEXT.md`) | med | n/a |

## Blocked or skipped

Nothing blocked.

## Verification

| Gate | Result |
| --- | --- |
| check | green: 0 violations, 5 warnings (unchanged) |
| scenarios | 132 passed (2.9m), the new scenario included |

## Playbook friction

The first draft checked the other device before the sender. That check passed before the
fix, because it ran before the paste arrived. The fix-bug play's pitfall ("a scenario that
passes before the fix") caught it once the scenario was run before the fix. Order matters
for "within N seconds" checks.

## Spec drift

None: R-ACC-06 is MODIFIED in full and keeps its two earlier scenarios.
