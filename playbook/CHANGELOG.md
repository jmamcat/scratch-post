# Changelog

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
