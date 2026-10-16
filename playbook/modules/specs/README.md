# Module: specs

Living, behaviour-level specs per capability, changed only through change deltas. Format and
syntax: `format.md`.

- `specs/<capability>/spec.md`: the current truth for one capability.
- `changes/<id>/spec/<capability>/spec.md`: ADDED, MODIFIED and REMOVED requirements for a change.
- On archive, deltas are applied to the living specs mechanically.

Capabilities are the shared vocabulary of the whole playbook: spec folders, code modules
(`modules/structure`, rule S2) and scenario tags (`modules/scenarios`) all use the same IDs.
A requirement ID such as `R-SYN-03` therefore leads to a spec section, a code folder and the
scenarios that prove it.

## Writing scenarios that can run

Scenarios in specs are executed by the scenarios module, so write them in the project's step
vocabulary (`<specs>/STEPS.md`, see `modules/scenarios/README.md`): concrete actors,
concrete inputs, observable outputs, no internal state.

| Avoid | Prefer |
| --- | --- |
| GIVEN the merge function receives base X | GIVEN device "pixel" and device "laptop" both have "a.md" reading `X` |
| THEN the conflict record has status open | THEN the review inbox on "laptop" shows 1 open item for "a.md" |
| WHEN the cache is invalidated | WHEN "pixel" reloads the app |
