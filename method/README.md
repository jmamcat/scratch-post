# RefSpec

A reference-driven, spec-first method for building software with autonomous agents,
in parallel, on any harness (Claude Code, Codex, Hermes, plain shell) and any model
(Claude, GPT, Qwen, Kimi, ...).

RefSpec is a spin-off of [OpenSpec](https://github.com/Fission-AI/OpenSpec). It keeps
OpenSpec's core loop (living specs, change proposals that carry spec deltas, archive on
completion) and adds three things:

1. **A reference set.** Products we learn from sit next to the target project, each
   with a product definition and, when open source, a pinned copy of its repo.
2. **Packets and lanes.** Borrowed from BMAD's sharded stories: each change is cut
   into self-contained work packets with owned paths, so several agents can work at
   once without touching each other's files.
3. **Proceed-and-report.** Agents never stop to ask. They record each judgment call
   as a decision record, keep going, and collate the calls into a run report that
   says "I have some questions, but I proceeded with these recommendations; kindly
   direct me if any were incorrect."

## Why OpenSpec rather than BMAD

| Need | OpenSpec | BMAD | RefSpec takes |
| --- | --- | --- | --- |
| Harness/model agnostic | Plain Markdown + `AGENTS.md` | Persona prompts tuned per tool | OpenSpec |
| Low ceremony | Proposal, tasks, deltas | PRD, architecture, epics, stories, many personas | OpenSpec |
| Living source of truth | `specs/` updated on archive | Docs drift after the PRD | OpenSpec |
| Parallel execution | Single task list | Sharded, self-contained stories | BMAD's sharding |
| Context for small models | Agent reads the whole change | Story carries its own context | BMAD's sharding |

## Layout

```
<workspace>/
  AGENTS.md                 entry point for every harness (CLAUDE.md just imports it)
  method/                   this methodology
    README.md               overview (this file)
    reference-roles.md      how references are chosen, classified, reviewed, retired
    spec-format.md          requirement and scenario syntax, delta syntax
    run-protocol.md         how an autonomous, parallel run works end to end
    templates/              REFERENCE.md, change/*.md, run-report.md
  references/               the reference set, parallel to the target
    README.md               index: role, cadence, last review for every reference
    feature-matrix.md       Quire features mapped to reference feature IDs: adopt/adapt/defer/reject
    <id>/
      REFERENCE.md          inclusion date, role, cadence, borrow/reject, review log
      product/              product definition: features, UX principles, data model
        visuals/README.md   capture checklist; captures/ is gitignored
      upstream/<repo>       git submodule (open source only), pinned, read-only
  <target>/                 the product being built (here: quire/)
    spec/                   living specs, one folder per capability
    changes/                in-flight change proposals
      archive/              completed changes, kept for history
    ...code...
  scripts/refs.sh           fetch, update and check upstream reference copies
```

The target folder is self-contained so it can later be split into its own repository
(`git subtree split --prefix=quire`) without losing history.

## Lifecycle

| Phase | Output | Who |
| --- | --- | --- |
| 0. Intake | `references/<id>/` with REFERENCE.md and product definition | agent, human approves role |
| 1. Map | rows in `references/feature-matrix.md` (triage the reference features a change touches) | agent |
| 2. Propose | `changes/<id>/proposal.md`, `design.md`, spec deltas | agent, human may review |
| 3. Shard | `changes/<id>/packets/P*.md` with lanes and owned paths | agent |
| 4. Run | code, tests, decision records in each packet | one or many agents |
| 5. Verify | every packet's acceptance commands pass | agent |
| 6. Report | `changes/<id>/run-report.md` | agent, human redirects |
| 7. Archive | deltas merged into `spec/`, change moved to `changes/archive/` | agent |

Humans are optional at every phase except two: approving a reference's role at intake,
and reading run reports. Redirection from a run report becomes the next change.

## Principles

- **Plain files only.** Everything an agent needs is Markdown, YAML front matter, and
  shell commands. No harness-specific features are required; they are only shortcuts.
- **Lean by default.** A feature enters the target only if the feature matrix says
  adopt or adapt and names the baseline behaviour. Ties go to the baseline reference.
- **Study, do not copy.** Upstream copies are for reading. Never paste code from a
  reference into the target; check licenses (AGPL references are study-only).
- **Small packets.** A packet must fit in a 32k-token context with room to work. If it
  doesn't, split it. This is what keeps the method model-agnostic.
- **Verifiable done.** A packet is done when its acceptance commands exit 0, not when
  an agent says so.
