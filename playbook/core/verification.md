# Verification

"Done" is a claim backed by evidence a person can rerun.

## Two gates

| Gate | Command in `playbook.yaml` | Covers | Must be |
| --- | --- | --- | --- |
| Static | `check` | types, lint, formatting, structure rules (`modules/structure`) | fast (under a minute), run on every packet |
| Behaviour | `scenarios` | requirements, through the system's real boundary (`modules/scenarios`) | the whole suite green before a change is reported done |

There is deliberately no third gate of unit tests. Behaviour is verified the way a user or
a real client would experience it. Code-level checks are allowed only where a scenario
cannot reach the risk cheaply (see "Below the boundary" in `modules/scenarios/README.md`).

## Evidence in packets and reports

Packets name gates (`bin/gate.sh check`, `bin/gate.sh scenarios "<tags>"`), never the tool
commands behind them. Under a packet's Acceptance section, paste a short summary:

```
check: ok (typecheck 5 packages, structure rules 0 violations)
scenarios: 12 passed, 0 failed (@R-SYN-03, @R-SYN-06, @R-RVW-04)
```

Counts and scenario tags, not full logs. The run report carries the final numbers for the
whole change.

## When verification fails

- A failing scenario is a fact about the system. Fix the code, or, if the scenario is
  wrong, fix the spec (a spec drift entry in the run report) and regenerate.
- Never delete, skip or weaken a scenario to get green. Removing behaviour is the
  remove-feature play, with its own scenarios.
- A flaky scenario is a bug in the scenario or the system. Record it, fix the cause.
