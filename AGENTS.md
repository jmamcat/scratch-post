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
| `cloud-files/` | Working documents from the cloud agent sessions (packet prompts, notes) |
| `sessions/GIST.md` | Session gist: current state, open items, how to resume. Read it first |

## Gates

```sh
pnpm -C quire install
pnpm -C quire check        # types, dependency rules, structure rules
pnpm -C quire scenarios    # every spec scenario, at the system boundary and in the browser
pnpm -C quire demo         # cloud server + local node with seed data
playbook/bin/gate.sh deploy   # builds the image, runs the Compose stack (needs Docker)
```

CI (`.github/workflows/ci.yml`) runs `check` and `scenarios` on every push to `main` and every
pull request, and `deploy` and `ux` weekly and on demand.

Python tooling (the playbook scripts) runs through `uv run playbook/bin/<script>.py`; the root
`pyproject.toml` declares it. Deployment: `Dockerfile`, `compose.yaml`, `deploy/README.md`.

## Rules that are easy to miss

- Behaviour changes start in the spec; scenarios are generated from it. Never edit
  `quire/scenarios/.features/`, never weaken a scenario to pass.
- No unit tests. Verify through scenarios (`playbook/modules/scenarios`).
- Folders under `quire/packages`, `quire/apps/*/src` are capability names from the specs.
- `references/*/upstream/` are read-only submodules; Joplin is AGPL: study, never copy.
- No screenshots of closed-source products in git. No model names in code or commits.
- Update `sessions/GIST.md` at the end of every turn that changes state.
