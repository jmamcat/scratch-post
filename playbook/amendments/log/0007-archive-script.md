---
id: 0007-archive-script
status: accepted
proposed_by: claude-code/tier-A (coordinator), on the project owner's direction
date: 2026-10-16
evidence: counterexample
affects: [bin/archive-change.py, core/loop.md, modules/specs/README.md, modules/specs/format.md]
version_bump: minor
---

# A script for archiving, and a check that archiving changes no scenario

## Problem

`core/loop.md` step 6 says to merge spec deltas into the living specs and archive the change,
and `modules/specs` says this is mechanical. Nothing did it. After Quire 0001 and 0002 both
finished, `quire/spec/` held only `STEPS.md`: the "current truth" lived in two change
folders, and the 0002 run report had to raise it as friction. With no tool, an agent doing it
by hand can drop or duplicate a requirement, and nothing would notice.

## Change

- `bin/archive-change.py <change-id> [--dry-run]` applies ADDED, MODIFIED and REMOVED
  requirements per `modules/specs/format.md`, refuses any ID clash before writing, moves the
  change to `changes/archive/` and sets the proposal's status to `archived`.
- Fold back regenerates the scenarios after archiving and confirms the set is unchanged.

## Evidence

Counterexample above. Walk-through: archiving 0001 created eight living specs (52
requirements), archiving 0002 appended 8 requirements to four of them and created `views`
(6). The scenario lines generated before and after, sorted, are identical (89 scenarios from
66 requirements).

## Guards

Stop conditions unchanged; gates unchanged; harness, model, language and project agnostic
(Python standard library, paths from `playbook.yaml`); no records deleted.

## Outcome

Accepted. Version 1.7.0.
