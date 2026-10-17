# Session gist

The running handoff for whoever picks this repository up next, person or agent. Update it at
the end of every working turn that changes state: what is true now, what is open, what to do
first. Keep it short; history lives in git, change folders and run reports.

## Now (2026-10-17, 10:30 UTC)

- **`main`** is at `141cf42`: Quire 0.1.0 plus PR #3.
- **Branch `claude/cloud-credits-github-remote-projects-rtnkko`** is ahead of `main` with
  agent work from `sessions/NEXT.md`. No PR yet.
  - CI fixes: deploy and ux are green again (manual run 9).
  - 0005: live rooms honour the note size limit (R-ACC-06).
  - 0006: local nodes replicate attachments and renames (R-SYN-09).
  - 0007: the app says why an oversized live edit was undone (R-LIV-06).
  - Dependabot config; playbook 1.9.1 (archive script fix).
- **Specs.** 12 capabilities, 91 requirements, 138 scenarios. Local: check green,
  scenarios 136/136; `deploy` and `ux` run only in their own gates.
- **Next agent work.** `sessions/NEXT.md` items 4, 5, 7, 9 and 10.

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
3. **Review and merge the branch.** It carries the CI fixes and changes 0005 to 0007.
   The agent opens a PR when asked.

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
  `QUIRE_NODE_IMAGE=mirror.gcr.io/library/node:24-bookworm-slim`.
- **TLS inspection.** The proxy inspects TLS, so `docker build` needs the `extra_ca` build
  secret (`deploy/README.md`).
- **Tag pushes.** They are refused (403). Branch pushes work.

## Log

| Date | What |
| --- | --- |
| 2026-10-16 | Playbook, references, Quire MVP; changes 0001 to 0003 (workspace UX, production hardening) |
| 2026-10-17 | Change 0004 (release 0.1.0), PR #2 merged; PR #3 merged (action bumps, run report, this gist, `cloud-files/`); tag push refused, left to the owner |
| 2026-10-17 | `sessions/NEXT.md`; CI deploy and ux fixed; changes 0005 to 0007; Dependabot |
