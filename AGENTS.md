# Agent guide

This repository is bound to the **RefSpec playbook** by `playbook.yaml`. Start with
`playbook/README.md`, pick a play in `playbook/plays/`, and follow `playbook/core/loop.md`.

| Path | What |
| --- | --- |
| `playbook/` | Project-agnostic playbook: core loop, plays, modules, amendments, scripts |
| `references/` | Reference products (Obsidian baseline; Notion, Joplin primary; Confluence; SilverBullet) and the feature matrix |
| `quire/` | The product: a lean Markdown store and renderer. Read `quire/ARCHITECTURE.md` |
| `quire/spec/` | Living specs and `STEPS.md`, the scenario vocabulary |
| `quire/changes/` | Change folders with proposals, spec deltas and packets |
| `quire/scenarios/` | The scenario suite (generated from specs, run with playwright-bdd) |
| `remote-projects/` | Unrelated starter scaffold, kept for later |

## Gates

```sh
pnpm -C quire install
pnpm -C quire check        # types, dependency rules, structure rules
pnpm -C quire scenarios    # every spec scenario, at the system boundary and in the browser
pnpm -C quire demo         # cloud server + local node with seed data
```

## Rules that are easy to miss

- Behaviour changes start in the spec; scenarios are generated from it. Never edit
  `quire/scenarios/.features/`, never weaken a scenario to pass.
- No unit tests. Verify through scenarios (`playbook/modules/scenarios`).
- Folders under `quire/packages`, `quire/apps/*/src` are capability names from the specs.
- `references/*/upstream/` are read-only submodules; Joplin is AGPL: study, never copy.
- No screenshots of closed-source products in git. No model names in code or commits.
