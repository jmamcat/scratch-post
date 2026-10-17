# Play: migrate a component

## Use when / not when

Use when one module, service or dependency is replaced (a database, a UI framework for one
area, a library, a hosted service) and the rest of the system stays. Not when most of the
system changes (overhaul).

## Modules

Required: scenarios, structure. Optional: specs (only if behaviour changes), references (the
old component as `baseline` when its behaviour is subtle).

## Loop branches

1. **Frame**: name the component, its boundary (public API) and the reason for the move.
2. **Ground**: list the scenarios that cross that boundary; add missing ones until each
   public API function or route is exercised through the system.
3. **Shape**: an adapter behind the same public API, a switch (config flag or composition
   root), then removal of the old implementation.
4. **Run**: build the new implementation behind the switch.
5. **Verify**: run the scenarios with the switch in both positions.
6. **Fold back**: remove the old implementation and the switch.

## Typical packets

P01 characterise boundary · P02 new implementation · P03 data move (if any) · P04 switch and remove.

## Scenario strategy

Scenarios do not change. If one has to, behaviour changed and that needs a spec delta.

## Exit criteria

Scenarios green with only the new implementation present; no imports of the old one remain
(`check` structure rules).

## Pitfalls

Leaking the new component's types through the public API; leaving the switch in forever.
