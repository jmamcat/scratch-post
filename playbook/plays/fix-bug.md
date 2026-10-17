# Play: fix a bug

## Use when / not when

Use when the system does something the spec (or common sense, if unspecified) says it should
not. Not when the "bug" is a missing feature (add-feature).

## Modules

Required: scenarios. Optional: specs (add a requirement if the behaviour was never specified).

## Loop branches

1. **Frame**: one paragraph, or the issue text. A proposal file is optional for fixes under
   an hour.
2. **Ground**: write a scenario that reproduces the bug through the system's boundary. Run it
   and see it fail for the reported reason.
3. **Shape**: one packet. No design document.
4. **Run**: fix the cause, not the symptom. If the cause is outside the owned paths, record a
   decision and widen `owns` explicitly.
5. **Verify**: the new scenario passes, the full suite still passes.
6. **Fold back**: a short run report: cause, fix, scenario name. Add a requirement to the spec
   if one was missing.

## Typical packets

P01 reproduce, fix, verify.

## Scenario strategy

The reproducing scenario stays in the suite forever, tagged with the issue or requirement ID.

## Exit criteria

Reproducing scenario fails before the fix and passes after; suite green.

## Pitfalls

Fixing without reproducing; a scenario that passes before the fix (it does not test the bug);
widening the change into a refactor.
