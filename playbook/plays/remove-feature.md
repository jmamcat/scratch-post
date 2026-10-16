# Play: remove a feature

## Use when / not when

Use when behaviour is taken away: deprecated features, cost cuts, simplification. Not when
it is replaced by something else (add-feature plus this play, as two changes).

## Modules

Required: specs, scenarios, structure. Optional: references (mark matrix rows `reject` with
the reason).

## Loop branches

1. **Frame**: what goes, why, what happens to existing data and users who relied on it.
2. **Ground**: find every scenario that exercises the feature. Spec delta with REMOVED
   requirements (with reasons) and ADDED requirements for what users see instead (an error,
   a redirect, an export path, data kept read-only).
3. **Shape**: packets: data handling first (export or migrate), then removal of code paths,
   then cleanup of now-unused modules.
4. **Run**: delete code; do not leave it behind a flag unless the proposal says so.
5. **Verify**: removed scenarios are gone or replaced by "is not available" scenarios; the
   rest of the suite passes; `check` reports no unused public API.
6. **Fold back**: run report lists every file and dependency removed.

## Typical packets

P01 data export or migration · P02 remove behaviour and its scenarios · P03 delete dead
modules and dependencies.

## Scenario strategy

Every removed requirement either disappears from the suite with a reason in the run report
or turns into a scenario for the replacement behaviour.

## Exit criteria

No references to the feature's modules remain; data handling scenario passes.

## Pitfalls

Deleting scenarios without the REMOVED delta; orphaned data; dead code left "just in case".
