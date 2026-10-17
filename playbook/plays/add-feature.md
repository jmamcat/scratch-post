# Play: add a feature

## Use when / not when

Use when an existing system gains behaviour. Not when the behaviour replaces most of a
capability (overhaul) or is a fix (fix-bug).

## Modules

Required: specs, scenarios, structure. Optional: references (consult those whose cadence is
per-change for this domain), demo (extend the walkthrough).

## Loop branches

1. **Frame**: proposal; headline scenarios.
2. **Ground**: feature matrix row (if references are on); spec delta with ADDED or MODIFIED
   requirements.
3. **Shape**: `design.md` only if the feature crosses capabilities or changes a contract.
   Packets per capability touched.
4. **Run**: as `core/run-protocol.md`.
5. **Verify**: new scenarios plus the full suite.
6. **Fold back**: run report; archive; update the demo walkthrough if the feature is visible.

## Typical packets

One per capability touched, plus verification.

## Scenario strategy

New scenarios for the feature; existing scenarios unchanged unless the spec delta modifies
them.

## Exit criteria

Suite green; feature reachable in the demo if user-visible.

## Pitfalls

A new capability folder for what is really part of an existing one; options and flags that
nobody asked for.
