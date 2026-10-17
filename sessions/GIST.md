# Session gist

The running handoff for whoever picks this repository up next, person or agent. Update it at
the end of every working turn that changes state: what is true now, what is open, what to do
first. Keep it short; history lives in git, change folders and run reports.

## Now (2026-10-17)

- **Quire 0.1.0** is on `main` (merge commit `5adae66`, PR #2). Living specs: 12
  capabilities, 90 requirements, 133 scenarios.
- **Playbook** is at 1.9.0 (amendments 0001 to 0009).
- **Branch `claude/cloud-credits-github-remote-projects-rtnkko`** (from `5adae66`):
  - CI actions bumped to Node 24 majors;
  - the 0004 run report's Verification table filled in;
  - this gist added;
  - scratchpad working docs copied into `cloud-files/`.
  - PR #3 open; merge once CI is green.

## Open

1. **Tag `v0.1.0` on `5adae66`.** The agent's git proxy refuses tag pushes (HTTP 403), so the
   owner does it: `git tag -a v0.1.0 5adae66 -m "Quire 0.1.0" && git push origin v0.1.0`, or
   create the release in the GitHub UI.
2. **Make the repository private.** The owner will do this.
3. **PR #3**: merge once "check and scenarios" is green.

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
| 2026-10-17 | Change 0004 (release 0.1.0), PR #2 merged; action bumps, run report, this gist, `cloud-files/` |
