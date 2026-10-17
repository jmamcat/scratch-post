# Session gist

The running handoff for whoever picks this repository up next, person or agent. Update it at
the end of every working turn that changes state: what is true now, what is open, what to do
first. Keep it short; history lives in git, change folders and run reports.

## Now (2026-10-17, 14:30 UTC)

- **`main`** is at `c21dce2` (PR #4 squash-merged): Quire 0.1.0 plus every agent item in
  `sessions/NEXT.md`.
- **Branch `claude/cloud-credits-github-remote-projects-rtnkko`** carries change 0008
  (templates and the slash menu), archived and not yet in a PR.
  - Templates: insert at the cursor and new note from a template, with `{{title}}`,
    `{{date}}`, `{{time}}` and formats; properties merge.
  - Slash menu: `/` at the start of a line or after a space; block inserts and commands.
  - Gates locally: check green, scenarios 142/142, ux passes with the baseline unchanged.
- **Specs.** 12 capabilities, 94 requirements, 144 scenarios.
- The branch restarts from `main` for each new piece of work once its PR merges.

## Open

1. **Tag `v0.1.0`.** The agent's git proxy refuses tag pushes as a policy denial (HTTP
   403), so the owner tags it. Use the release commit:

   ```sh
   git fetch origin && git tag -a v0.1.0 5adae66 -m "Quire 0.1.0" && git push origin v0.1.0
   ```

   Or create the release in the GitHub UI (Releases, Draft a new release, tag `v0.1.0`,
   target `5adae66`).
2. **Make the repository private.** The owner will do this. `cloud-files/` includes a
   LinkedIn draft.
3. **Choose the next features** (`sessions/NEXT.md`, human step 3). Templates and the slash
   menu are done; the rest of that list waits on the owner.
4. **PR for 0008.** Not opened yet; the owner asks for it.

## Budget

The free cloud credit ($250) is nearly spent. Prefer:

- small, single-agent changes over fan-out waves;
- one gate run per change, not repeated full runs;
- `check` plus the affected scenarios while iterating, and the full `scenarios` gate once
  before pushing;
- `deploy` and `ux` only when the change touches them (CI runs both weekly).

## Resume

```sh
pnpm -C quire install
pnpm -C quire check
pnpm -C quire scenarios
playbook/bin/gate.sh deploy   # needs Docker
playbook/bin/gate.sh ux       # about 10 minutes
```

Read `AGENTS.md`, then `playbook/README.md`. The next change number is 0009.

## Environment quirks (cloud agent containers)

- **Docker daemon.** It is not started after a container restart. Run `dockerd` in the
  background first.
- **Docker Hub.** It is rate limited. Use
  `QUIRE_NODE_IMAGE=mirror.gcr.io/library/node:24-bookworm-slim`.
- **TLS inspection.** The proxy inspects TLS, so `docker build` needs the `extra_ca` build
  secret (`deploy/README.md`).
- **Tag pushes.** They are refused (403). Branch pushes work.

## Log

| Date | What |
| --- | --- |
| 2026-10-16 | Playbook, references, Quire MVP; changes 0001 to 0003 (workspace UX, production hardening) |
| 2026-10-17 | Change 0004 (release 0.1.0), PR #2 merged; PR #3 merged (action bumps, run report, this gist, `cloud-files/`); tag push refused, left to the owner |
| 2026-10-17 | `sessions/NEXT.md`; CI deploy and ux fixed; changes 0005 to 0007; Dependabot; Node 24; PR #4 merged |
| 2026-10-17 | Change 0008 (templates and the slash menu) on the branch |
