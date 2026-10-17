# Session gist

The running handoff for whoever picks this repository up next, person or agent. Update it at
the end of every working turn that changes state: what is true now, what is open, what to do
first. Keep it short; history lives in git, change folders and run reports.

## Now (2026-10-17)

- **Quire 0.1.0** is on `main`.
  - Release commit: `5adae66` (PR #2).
  - Follow-up: `141cf42` (PR #3). It moved CI to Node 24 actions, filled in the 0004
    verification, and added this gist and `cloud-files/`.
- **Specs.** 12 capabilities, 90 requirements, 133 scenarios. CI "check and scenarios" is
  green on PR #3's head.
- **Playbook** 1.9.0 (amendments 0001 to 0009).
- **Branch `claude/cloud-credits-github-remote-projects-rtnkko`** restarts from `main` for
  each new piece of work; it carries this gist update.

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

Read `AGENTS.md`, then `playbook/README.md`. The next change number is 0005.

## Environment quirks (cloud agent containers)

- **Docker daemon.** It is not started after a container restart. Run `dockerd` in the
  background first.
- **Docker Hub.** It is rate limited. Use
  `QUIRE_NODE_IMAGE=mirror.gcr.io/library/node:22-bookworm-slim`.
- **TLS inspection.** The proxy inspects TLS, so `docker build` needs the `extra_ca` build
  secret (`deploy/README.md`).
- **Tag pushes.** They are refused (403). Branch pushes work.

## Log

| Date | What |
| --- | --- |
| 2026-10-16 | Playbook, references, Quire MVP; changes 0001 to 0003 (workspace UX, production hardening) |
| 2026-10-17 | Change 0004 (release 0.1.0), PR #2 merged; PR #3 merged (action bumps, run report, this gist, `cloud-files/`); tag push refused, left to the owner |
