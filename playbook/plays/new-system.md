# Play: new system

## Use when / not when

Use for a product or service that does not exist yet, including "build the whole thing in
one go". Not for a rewrite of something that exists (that is overhaul): existing behaviour
needs characterising first.

## Modules

Required: specs, scenarios, structure. Optional: references (recommended when the product
is defined by comparison with others), demo (recommended).

## Loop branches

1. **Frame**: proposal with the headline scenarios a first user would try in the demo.
2. **Ground**: with references, run intake for each reference product and fill the feature
   matrix; mark a `baseline`. Write one spec per capability. Capability names become module
   names (`modules/structure`).
3. **Shape**: `design.md` covering topology, contracts between modules, data formats. Cut
   packets so domain libraries come first and apps build on their public APIs. `P00` sets up
   the workspace, `check`, `scenarios` and `demo` commands.
4. **Run**: lanes in parallel once contracts are written into packets.
5. **Verify**: the full scenario suite, including at least one scenario per headline scenario
   from the proposal.
6. **Fold back**: run report, archive. The first archived change makes the living specs.
   Before calling the system production ready, run the readiness review in
   `modules/hardening` and carry its gaps as the next change.

## Typical packets

P00 workspace and gates · P01..Pn domain libraries · protocol · server/backend · client ·
packaging · Pz demo and verification.

## Scenario strategy

Write scenarios first from the specs. Start with the headline scenarios as end-to-end
journeys, then one scenario per requirement. Add a simulation scenario for anything
concurrent or distributed.

## Exit criteria

- `check` and `scenarios` green; every requirement has at least one passing scenario.
- `demo` starts the system with seed data in one command.
- ARCHITECTURE.md exists and matches the folders.

## Pitfalls

- Designing modules around technical layers (controllers, services) instead of capabilities.
- Packets that say "see design.md" instead of carrying their contracts.
- Gold-plating: the feature matrix says defer; defer it.
