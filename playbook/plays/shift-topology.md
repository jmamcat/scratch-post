# Play: shift topology

## Use when / not when

Use when the place where data lives or the authority over it changes: cloud-first to
local-first (offline clients, sync), local-first to cloud-first (central server becomes the
truth), adding edge or self-hosted nodes, single-tenant to multi-tenant. Not for moving
hosting providers with the same topology (migrate-component).

## Modules

Required: specs, scenarios, structure. Optional: references (a product that already has the
target topology is valuable here).

## Loop branches

1. **Frame**: draw the before and after topology: nodes, who is authoritative, what happens
   when each link is down.
2. **Ground**: characterise current behaviour around saves, conflicts and failures. Write the
   new consistency guarantees as requirements ("every device converges after one quiet sync";
   "no edit is lost silently"; "the server is the only writer of X").
3. **Shape**: a protocol module (pure, storage-agnostic) first, then storage on each node,
   then transports, then UI for states the old topology never had (offline, pending,
   conflict review).
4. **Run**: protocol lane first; node lanes in parallel on its public API.
5. **Verify**: scenarios for each failure mode (link down, node restarted, concurrent edits,
   delete against edit) plus a seeded simulation scenario with many devices and random
   operations that checks convergence and no loss.
6. **Fold back**: document the topology in ARCHITECTURE.md; run report lists every
   guarantee and the scenario that proves it.

## Typical packets

Protocol and merge · storage per node · transport · node-to-node replication · client UI for
sync states · migration of existing data into the new authority model.

## Scenario strategy

Failure scenarios matter more than happy paths. Every guarantee has a named scenario; the
simulation scenario runs several seeds and must exercise real collisions (assert that it did).

## Exit criteria

All guarantees proven by scenarios; simulation green across seeds; offline behaviour visible
in the demo.

## Pitfalls

Timestamps as truth (use revisions or hashes); "last write wins" hidden inside a "merge";
treating a missing file at startup as a deletion.
