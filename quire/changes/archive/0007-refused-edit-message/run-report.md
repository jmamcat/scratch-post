---
change: 0007-refused-edit-message
run: 2026-10-17-04
agents: [claude-code/tier-A (single agent; no worker packets)]
result: complete
---

# Run report: Say why a live edit was undone

## Execution

| Packet | Run by | Mode | Coordinator ran it |
| --- | --- | --- | --- |
| P01 requirement, scenario, message | single agent, tier A | sequential | yes: a few lines in one module |

## Usage

One slice; tokens not reported per slice (`usage/ledger.csv`, scope `change`, source
`unknown`).

## Summary

- **Message.** `live/live.ts` listens for the provider's `connection-close`. On code 4413
  it shows "`<note>` is over the size limit, so your last change was undone." It uses the
  app's alert helper (`notify`, now exported from `vault/attachments`). The provider's
  reconnect handling is unchanged.
- **Scenario.** R-LIV-06 "Paste over the limit" (Layer: ui). It failed before the change
  (no alert) and passes after. The paste step also drives browser devices now (one
  editor insert).
- **Stale web build.** `build:web:if-needed` (`quire/scenarios/package.json`) built the
  web app only when `dist/` was missing. After a web change, UI scenarios would test the
  old build. It now also rebuilds when any web or package source is newer than the
  build.

## I have some questions, but I proceeded with these recommendations

| # | Question | What I did | Confidence | To reverse |
| --- | --- | --- | --- | --- |
| D-0007-1 | Stop an oversized paste before it is sent? | No: the app does not know the server's limit, and the room already undoes it | med | expose the limit in `/api/health` and check in the editor |

## Blocked or skipped

Nothing blocked.

## Verification

| Gate | Result |
| --- | --- |
| check | green: 0 violations, 5 warnings |
| scenarios | 136 passed (2.8m), on a fresh web build |
| R-PLT-07 first-load budget | passes (the chunk names changed, the first load did not) |

## Playbook friction

The scenario runner tested a stale web build until `build:web:if-needed` learned to
compare timestamps. Worth a line in `modules/scenarios`: a runner that builds the system
under test must rebuild when its sources change, not only when the build is missing.

## Spec drift

None.
