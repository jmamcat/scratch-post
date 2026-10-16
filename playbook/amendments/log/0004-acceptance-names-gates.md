---
id: 0004-acceptance-names-gates
status: accepted
proposed_by: claude-code/claude (coordinator, Quire change 0001), approved by the project owner
date: 2026-10-16
evidence: counterexample
affects: [core/verification.md, core/run-protocol.md, templates/change/packet.md, bin/gate.sh]
version_bump: minor
---

# Acceptance names gates, not tool commands; policy changes re-issue packets

## Problem

Midway through Quire 0001 the project dropped unit tests for scenario-level verification.
Packets P00 to P09 still said `pnpm --filter ... test` (vitest) in their Acceptance
sections. Those commands stopped existing, so the packets no longer described how to prove
they were done, and a worker reading one cold would have run a command that fails.

## Change

- Acceptance sections call gates by the names in `playbook.yaml` through
  `playbook/bin/gate.sh <gate> [scenario tags]` (for example
  `playbook/bin/gate.sh scenarios "@R-SYN-03"`), never tool commands. Changing tools
  then changes one line in `playbook.yaml`, not every packet.
- When a gate or another run-wide policy changes mid-run, the coordinator re-issues every
  packet that is not `done`: updates its Acceptance and Contract, and bumps a `revision:`
  field so workers know to re-read it.

## Evidence

Counterexample: packets P00 to P09 of Quire 0001 (their acceptance lines still name vitest).
Under the amended text they would have read `gate.sh check` and `gate.sh scenarios "<tags>"`,
which stayed valid across the change of test runner. `gate.sh` tested with
`scenarios "@R-VLT-02"`: 2 scenarios ran and passed.

## Guards

Gates themselves unchanged (only how packets refer to them); agnosticism improved (no tool
names in packets); no records deleted.

## Outcome

Accepted. 1.3.0 to 1.4.0. Done packets of 0001 keep their original text as a record.
