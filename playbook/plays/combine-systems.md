# Play: combine systems

## Use when / not when

Use when two or more systems (products, services, codebases after an acquisition) become
one. Not when one system simply adopts a library from another (migrate-component).

## Modules

Required: specs, scenarios, structure, references (every source system). Optional: demo.

## Loop branches

1. **Frame**: who uses each system today and what the combined system is for.
2. **Ground**: each source system is a reference with an upstream copy. Fill the feature
   matrix with one column per source system; for each capability choose: keep A's, keep B's,
   merge, or drop. Pick the `baseline` for ties. Characterise each source system's capabilities
   that survive.
3. **Shape**: a unified spec per capability; a data model that can hold both systems' data;
   import or sync paths from each source.
4. **Run**: per capability lane; importers per source system.
5. **Verify**: each source system's surviving characterisation scenarios, rewritten against
   the combined system, pass; import scenarios bring real-shaped data from each source.
6. **Fold back**: decommission plan per source system as follow-up changes.

## Typical packets

Per source: importer · per capability: unified module · identity and permissions mapping ·
verification.

## Scenario strategy

Two kinds: "users of A can still do X" and "data from B appears as Y". Write both for every
source system.

## Exit criteria

Every kept capability has scenarios from each source that relied on it; imports are
idempotent (running twice changes nothing).

## Pitfalls

Union of all features (the matrix must drop things); identity collisions between systems;
silent data loss on import (scenario: count and spot-check records).
