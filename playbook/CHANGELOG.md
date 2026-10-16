# Changelog

## 1.7.0 (2026-10-16)

- Amendment 0007: `bin/archive-change.py` applies a change's spec deltas to the living specs
  and archives the change; fold back checks the generated scenarios did not change.

## 1.6.0 (2026-10-16)

- Amendment 0006: `P00` declares new packages in their consumers' manifests; workers stop
  only their own processes, by process id.

## 1.5.0 (2026-10-16)

- Amendment 0005: optional `modules/usage`, a ledger of tokens, credits and time per slice
  mapped to harness and model (`bin/usage.py`), with a Usage section in run reports.

## 1.4.0 (2026-10-16)

- Amendment 0004: Acceptance names gates through `bin/gate.sh`; mid-run policy changes
  re-issue open packets (`revision:`).

## 1.3.0 (2026-10-16)

- Amendment 0003: `borrows:` for narrow edits outside owned paths; `run-lanes.sh` never
  batches packets whose paths overlap.

## 1.2.0 (2026-10-16)

- Amendment 0002: run reports open with an Execution table; a coordinator taking a worker
  packet logs a decision record.

## 1.1.0 (2026-10-16)

- Amendment 0001: state indicators need a `@ui` scenario (counterexample from Quire 0001).

## 1.0.0 (2026-10-16)

- Playbook split out of the first project into a project-agnostic folder with a
  `playbook.yaml` binding.
- Core loop (frame, ground, shape, run, verify, fold back), packets and lanes, decisions and
  run reports, verification gates.
- Nine plays: new-system, overhaul, migrate-component, combine-systems, fix-bug,
  add-feature, remove-feature, shift-topology, port-language.
- Modules: specs, scenarios (scenario-first verification, no unit-test gate), structure
  (capability slices, enforced dependency rules), references, demo.
- Evidence-based amendments.

## 0.1.0 (2026-10-16)

- First version inside the Quire workspace as `method/`: references, OpenSpec-style specs,
  packets, run protocol.
