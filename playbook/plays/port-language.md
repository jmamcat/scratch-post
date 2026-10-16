# Play: port to another language

## Use when / not when

Use when the same behaviour must exist in another programming language or runtime (for
performance, platform reach, hiring, or ecosystem). Not when behaviour also changes: do the
port first, then add-feature or remove-feature.

## Modules

Required: scenarios, structure, references (the current implementation as `baseline` with an
upstream copy). Optional: specs (if missing, the characterisation scenarios become the spec).

## Loop branches

1. **Frame**: which modules move, in which order, and how both implementations coexist.
2. **Ground**: characterise the current implementation at its boundary (CLI, HTTP, files,
   UI). Scenarios must be language-neutral: they drive the system from outside, so the same
   suite runs against both.
3. **Shape**: map the structure standard to the new language's idioms
   (`modules/structure/README.md` has equivalents); port leaves first (pure modules), then
   the shells.
4. **Run**: one lane per module; each module is done when the shared scenarios pass with it
   swapped in.
5. **Verify**: the full suite passes against the new implementation alone.
6. **Fold back**: retire the old implementation; note idiom changes in ARCHITECTURE.md.

## Typical packets

P00 scenario harness parameterised by implementation · per module: port, swap · retire.

## Scenario strategy

Parity: identical inputs, identical observable outputs. Golden files (approved outputs) work
well for rendering and serialisation; record them from the old implementation.

## Exit criteria

Suite green against the new implementation; no runtime dependency on the old one.

## Pitfalls

Line-by-line translation instead of idiomatic code; scenarios that reach into internals and
therefore cannot run against both implementations.
