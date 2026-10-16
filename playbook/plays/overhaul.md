# Play: overhaul

## Use when / not when

Use when most of an existing system's internals will be replaced (new architecture, new
storage, major framework change) while its users should notice only intended changes. Not
when one component moves (migrate-component) or the language changes (port-language).

## Modules

Required: specs, scenarios, structure, references. Optional: demo.

## Loop branches

1. **Frame**: what stays the same for users, what changes on purpose.
2. **Ground**: register the current system as a reference with role `baseline` and its code
   as `upstream` (a pinned copy or tag). Characterise: write scenarios for current behaviour
   until every user-facing capability has some. Mark intentional changes as spec deltas.
3. **Shape**: plan a strangler path: the new system grows beside the old one, capability by
   capability, behind the same boundary (same API, same files, same UI routes).
4. **Run**: one lane per capability; each lane switches its capability over only when its
   scenarios pass against the new implementation.
5. **Verify**: the characterisation scenarios pass against the new system, except those the
   spec deltas changed.
6. **Fold back**: retire the old implementation; set the reference role to `tracking` or
   remove it.

## Typical packets

P00 harness that can point scenarios at old or new · per capability: new module, switch-over ·
data migration with a dry-run mode · retirement.

## Scenario strategy

The same scenario suite runs against both implementations (`TARGET=old|new`). Differences
are either bugs or listed spec deltas. Nothing else is acceptable.

## Exit criteria

All characterisation scenarios green on the new system; data migration scenario (old data in,
new system serves it) green; old code removed.

## Pitfalls

- Starting to build before characterising, then arguing about what the old system did.
- Big-bang switch-over. Switch per capability.
