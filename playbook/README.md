# RefSpec playbook

RefSpec is a **playbook**: a set of *plays* (ways to run a piece of work) that an agent or
a person picks from according to the situation, plus optional *modules* that a play turns
on. It is not tied to a project, a language, a model, or an agent harness. It works with
anything that can read files, write files and run shell commands.

"Playbook" is deliberate. A framework is code you build on; a specification is a document
you conform to; an engine runs by itself. A playbook is closer to what this is: written
plays, chosen per situation, executed by whoever is on the field, and revised after
each game when the evidence says a play should change (see `amendments/`).

Version: see `VERSION`. Changes: `CHANGELOG.md`.

## Pieces

| Piece | What it is | Required? |
| --- | --- | --- |
| [`core/`](core/) | The loop every play uses: frame, shape, run, verify, report, fold back. Packets and lanes, decision records, the run protocol. | always |
| [`plays/`](plays/) | One file per kind of work: new system, overhaul, component migration, combining systems, bug fix, add or remove a feature, topology shift (cloud-first and local-first), language port. | pick one |
| [`modules/specs`](modules/specs/) | Living capability specs with requirements and GIVEN/WHEN/THEN scenarios, and change deltas. | most plays |
| [`modules/scenarios`](modules/scenarios/) | Verification at the system boundary: executable scenarios generated from the specs, driven like a user or a real client would. | most plays |
| [`modules/structure`](modules/structure/) | The code structure standard: capability-shaped modules, public APIs, dependency rules a CI step enforces. | when code changes |
| [`modules/references`](modules/references/) | A reference set: products or systems you learn from or must stay compatible with, kept beside the target. | optional |
| [`modules/demo`](modules/demo/) | Making each change demo-able: seed data, one command to run, a walkthrough. | optional |
| [`modules/hardening`](modules/hardening/) | The production-readiness review: access, secrets, data safety, offline, observability, deployment, load, budgets; each item becomes a requirement with a scenario. | before production |
| [`modules/ux`](modules/ux/) | A 0-100 readability and UX scorer with hard checks, floors and a baseline ratchet, so UI changes carry evidence. | when there is a UI |
| [`modules/handoff`](modules/handoff/) | Resumable work: a session gist, a next-steps list split into human and agent work, and the working documents a session would lose. | when sessions are short or budgets finite |
| [`modules/usage`](modules/usage/) | A ledger of tokens, credits and time per slice, mapped to harness and model, so builds and pull requests can be benchmarked. | optional |
| [`amendments/`](amendments/) | How the playbook changes itself, only with evidence that the change is better. | always applies |
| [`adapters/`](adapters/) | Notes for specific harnesses, model tiers and environments (uv, Docker, Compose). Never required. | optional |
| [`bin/`](bin/) | Small scripts (bash and Python 3, no dependencies): `gate.sh`, `spec-scenarios.py`, `check-structure.py`, `packet-prompt.sh`, `run-lanes.sh`, `refs.sh`, `usage.py`, `archive-change.py`. | optional |
| [`templates/`](templates/) | Proposal, packet and run report templates. | always |

## Binding a project

A project opts in with one file at its root, `playbook.yaml`, that says where things are
and which modules are on. Scripts in `bin/` read it.

```yaml
playbook: playbook            # path to this folder (or a git submodule of it)
version: 1                    # major version of the playbook the project follows
target: app                   # folder holding the product's code
modules: [specs, scenarios, structure, references, demo, usage]
specs: app/spec               # living specs
changes: app/changes          # change folders
references: references        # reference set, if the module is on
usage: usage                  # usage ledger, if the module is on
check: make check             # fast static checks: types, lint, structure rules
scenarios: make scenarios     # the scenario suite
demo: make demo               # optional
```

## Starting any piece of work (agent instructions)

1. Read the project's `playbook.yaml` and `AGENTS.md`.
2. Pick the play with [`plays/README.md`](plays/README.md). If two fit, take the smaller one.
3. Follow [`core/loop.md`](core/loop.md) with that play's branches.
4. Never stop to ask. Record judgment calls as decision records and report them at the
   end ([`core/decisions.md`](core/decisions.md)).
5. If the playbook itself got in your way, write an amendment with evidence
   ([`amendments/README.md`](amendments/README.md)). Do not quietly work around it.

## Lineage

RefSpec started as a spin-off of [OpenSpec](https://github.com/Fission-AI/OpenSpec):
living specs, change proposals with spec deltas, archive on completion. From
[BMAD](https://github.com/bmad-code-org/BMAD-METHOD) it takes self-contained, sharded work
items. Its own additions are the reference set, owned-path packets for parallel agents,
proceed-and-report runs, scenario-first verification, a checkable structure standard, and
evidence-based amendments.

| Need | OpenSpec | BMAD | RefSpec |
| --- | --- | --- | --- |
| Harness and model agnostic | Plain Markdown + `AGENTS.md` | Persona prompts per tool | Plain files and shell, adapters optional |
| Low ceremony | Proposal, tasks, deltas | PRD, architecture, epics, stories | Ceremony scales with the play (a bug fix is one packet) |
| Living source of truth | `specs/` updated on archive | Docs drift after the PRD | Specs, and the scenarios generated from them |
| Parallel execution | Single task list | Sharded stories | Packets with owned paths and lanes |
| Kinds of work | Feature changes | Greenfield and brownfield | Nine plays, from bug fix to language port |
| Self-improvement | n.a. | n.a. | Amendments that must prove they help |
