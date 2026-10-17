---
id: 0002-visible-execution-mode
status: accepted
proposed_by: claude-code/claude (coordinator, Quire change 0001), approved by the project owner
date: 2026-10-16
evidence: counterexample
affects: [core/run-protocol.md, core/decisions.md, templates/run-report.md]
version_bump: minor
---

# Make the execution mode visible

## Problem

Quire change 0001 had eleven packets. The coordinator ran eight of them itself (P00, P02 to
P06, P09, P10) one after another; only P01 and P07/P08 went to separate workers. The run
report's front matter listed the agents but nothing in the report said which packets ran in
parallel, which sequentially, or that the coordinator took worker packets. A reader could
assume a parallel run that did not happen; the project owner had to ask.

## Change

- `core/run-protocol.md`: when the coordinator takes a worker packet, it claims it like a
  worker and logs a decision record saying why.
- `core/decisions.md` and `templates/run-report.md`: the run report starts with an Execution
  table: packet, run by, mode (parallel with which packets, or sequential), and whether the
  coordinator ran it.

## Evidence

Counterexample: the 0001 run report, read without the conversation, gave no way to tell
that 8 of 11 packets were run by the coordinator in sequence. With the amended template the
same report states it in one table (applied retroactively to that report).

## Guards

Stop conditions, gates, agnosticism unchanged; no records deleted.

## Outcome

Accepted. 1.1.0 to 1.2.0.
