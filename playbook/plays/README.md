# Plays

Pick the play that matches the work. If two fit, take the smaller one; if the work is
really two plays (for example a language port that also removes a feature), run them as two
changes, the smaller first.

| If the work is... | Play | Ceremony | References module | Characterise first |
| --- | --- | --- | --- | --- |
| a new system from nothing, possibly in one shot | [new-system](new-system.md) | full | usually | no |
| replacing most of an existing system's internals | [overhaul](overhaul.md) | full | the current system becomes a reference | yes |
| moving one component to a new implementation | [migrate-component](migrate-component.md) | medium | the old component | yes |
| merging two or more systems into one | [combine-systems](combine-systems.md) | full | every source system | yes |
| behaviour that is wrong | [fix-bug](fix-bug.md) | minimal | no | the bug itself |
| new behaviour in an existing system | [add-feature](add-feature.md) | light to medium | optional | no |
| taking behaviour away | [remove-feature](remove-feature.md) | light | no | yes |
| changing where data lives and who is authoritative (cloud-first to local-first or back) | [shift-topology](shift-topology.md) | full | optional | yes |
| the same behaviour in another programming language | [port-language](port-language.md) | medium to full | the current implementation | yes |

"Characterise first" means: before changing anything, capture what the system does today as
scenarios (`modules/scenarios`), and keep them passing except where the change says otherwise.

## Play file shape

Every play has the same sections, so an agent can read any of them the same way:

- **Use when / not when**
- **Modules**: required and optional
- **Loop branches**: what each step of `core/loop.md` means for this play
- **Typical packets**
- **Scenario strategy**
- **Exit criteria**
- **Pitfalls**

## Granularity

Plays scale. "New system in one shot" is the new-system play with every packet run in one
session; "a one-line fix" is the fix-bug play with one packet. A play never requires an
artefact that adds nothing at that size: each play marks which artefacts are optional.
