# The loop

Every play runs the same six steps. A play says which steps are heavy, which are light,
and which modules each step uses. Small work (a bug fix) moves through all six in minutes;
large work (a new system) spends days in some of them.

| Step | Question | Output | Done when |
| --- | --- | --- | --- |
| 1. Frame | What is true today, what should be true after? | `changes/<id>/proposal.md` | the "after" is stated as scenarios a person would recognise |
| 2. Ground | What do we learn from or stay compatible with? | reference rows, spec deltas | every new or changed behaviour has a requirement and a scenario |
| 3. Shape | How is the work cut so it can run in parallel? | `design.md` (if needed), `packets/P*.md` | each packet fits one worker and owns its paths |
| 4. Run | Build it. | code, decision records in packets | each packet's acceptance passes |
| 5. Verify | Does the system behave as the scenarios say? | scenario results, `check` output | full scenario suite and `check` pass on the merged result |
| 6. Fold back | What did we learn? | `run-report.md`, spec deltas merged, change archived, amendments | report written; specs reflect reality |

## Step details

### 1. Frame

- Name the change `NNNN-short-slug` and create `changes/<id>/` from `templates/change/`.
- Write the proposal: why, what changes, out of scope, impact.
- Write the "after" as two to five headline scenarios in plain words. These become the
  first scenarios in the spec deltas.

### 2. Ground

- If the references module is on, consult references whose role and cadence say so
  (`modules/references/roles.md`) and record decisions in the feature matrix.
- Write spec deltas (`modules/specs/format.md`). Each scenario must be runnable by the
  scenarios module: concrete actors, concrete inputs, observable results.
- For existing systems, first capture current behaviour as scenarios (characterisation),
  then change them. This is how overhauls, migrations and ports avoid silent regressions.

### 3. Shape

- Write `design.md` only when the change touches more than one module or a contract.
- Cut packets (`core/packets.md`). Decide lanes and `depends_on`. Give integration-only
  files to packet `P00`.
- The last packet of every change is verification and the run report.

### 4. Run

Follow `core/run-protocol.md`. Workers never block; they log decisions and keep going.

### 5. Verify

`check` (static: types, lint, structure rules) and `scenarios` (behaviour at the system
boundary) from `playbook.yaml` must both exit 0. See `modules/scenarios/README.md` for
what counts as a scenario and `core/verification.md` for evidence.

### 6. Fold back

- If the usage module is on, record a ledger row after each large slice (packet of size M
  or more, a wave, research) and one for the change as a whole (`modules/usage`).
- Write the run report (`core/decisions.md`), with its Usage section when the module is on.
- Merge spec deltas into the living specs; move the change to `changes/archive/`.
- If the playbook caused waste or confusion, open an amendment (`amendments/README.md`).
