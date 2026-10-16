---
id: 0003-borrowed-paths
status: accepted
proposed_by: claude-code/claude (coordinator, Quire change 0001), approved by the project owner
date: 2026-10-16
evidence: counterexample
affects: [core/packets.md, core/run-protocol.md, templates/change/packet.md, bin/run-lanes.sh, bin/packet-prompt.sh]
version_bump: minor
---

# Editing outside owned paths: borrow or re-cut, never silently

## Problem

Packet P08 (live editing, review, history) had to wire its features into `App.tsx`,
`Editor.tsx` and `sync/workspace.ts`, which P07 owned. The playbook only said "edit only
your owned paths", so the worker edited them anyway and logged decision D-P08-1 after the
fact. It worked because P07 was already done, but nothing would have stopped two running
packets from editing the same file. `run-lanes.sh` did not check ownership overlap at all.

## Change

- Packets gain an optional `borrows:` list: specific paths outside `owns` that the packet
  may edit narrowly, each with a reason. A borrowed path must not be owned or borrowed by a
  packet running at the same time.
- A worker that discovers it must edit an unlisted path stops touching it, logs a decision
  record, and either asks the coordinator to add it to `borrows` (when no running packet
  owns it) or marks the packet `blocked` so the coordinator can re-cut ownership.
- `bin/run-lanes.sh` never puts two packets with overlapping `owns`/`borrows` in one batch.

## Evidence

Counterexample: D-P08-1 in Quire 0001. Under the amended text P08 would have declared
`borrows: [apps/web/src/App.tsx, apps/web/src/vault/Editor.tsx, apps/web/src/sync/workspace.ts]`
up front, and the lane runner would have refused to run it alongside P07 had both been
ready. Tested with four fake packets: overlapping ones were deferred to the next batch.

## Guards

Stop conditions, gates, agnosticism unchanged; no records deleted.

## Outcome

Accepted. 1.2.0 to 1.3.0.
