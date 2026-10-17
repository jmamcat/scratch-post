---
change: 0004-release-0.1.0
run: 2026-10-17-01
agents: [claude-code/tier-A (coordinator; no worker packets)]
result: complete
---

# Run report: Release 0.1.0

## Execution

| Packet | Run by | Mode | Coordinator ran it |
| --- | --- | --- | --- |
| Whole change (specs, two fixes, CI, docs, version) | coordinator, tier A | sequential | yes: small, every piece touches shared files (app wiring, configs, docs), no parallel work to gain |

## Usage

One coordinator slice; its tokens are not reported per slice (`usage/ledger.csv`, scope
`change`, source `unknown`).

## Summary

- **Revocation closes event streams** (R-ACC-02): event streams remember the token name that
  opened them; revoking it ends them within the token table's one-second refresh, as live
  rooms already did. `apps/server/src/live/events.ts`, wired in `app.ts`.
- **Every log line is JSON** (R-OPS-02): unexpected errors go through the JSON logger (route,
  message, stack; never the body) instead of `console.error`; the attachment restore at
  start-up logs the same way. `shared/http.ts` became `errorHandler(logError)`.
- **Local node limits written down** (R-SYN-09, `deploy/README.md`, `quire/README.md`,
  `quire/CHANGELOG.md`): notes only, no attachments; renames arrive upstream as create plus
  delete.
- **CI** (`.github/workflows/ci.yml`, linted with actionlint): `check` and `scenarios` on every
  push to `main` and every pull request; `deploy` on pushes, weekly and on demand; `ux` weekly
  and on demand, with the report as an artifact. The Playwright configs use the sandbox's
  pinned Chromium only where it exists, so CI uses the browser `playwright install` fetched.
- **Release**: `quire/CHANGELOG.md` for 0.1.0, version 0.1.0 in `quire/package.json` (the
  packages already were), the README's configuration table brought up to date with 0003.
- **Playbook 1.9.0** (amendment 0009): a Continuity row in the readiness review.

## I have some questions, but I proceeded with these recommendations

| # | Question | What I did | Confidence | To reverse |
| --- | --- | --- | --- | --- |
| D-0004-1 | Which gates run on every pull request? | `check` and `scenarios` (about 3 minutes); `deploy` on pushes to `main`, weekly and on demand; `ux` weekly and on demand only (16 minutes) | med | the `if:` lines in `.github/workflows/ci.yml` |
| D-0004-2 | The load scenario's timing bound on CI runners | Left at p95 under 500 ms; it held at load average 14 here. If a shared runner proves slower, raise the bound in the spec rather than skip the scenario | med | `spec/ops/spec.md` R-OPS-05 |
| D-0004-3 | Test an unexpected-error log line in a scenario? | No: no request reaches the 500 path from outside (input validation answers 400 first); the scenario checks that every line the server wrote is JSON | med | add a fault-injection route for scenarios |
| D-0004-4 | Version of the playbook vs the product | Separate: Quire 0.1.0, playbook 1.9.0 | high | none |

## Blocked or skipped

Nothing blocked. Not done by design: merging PR #2 and tagging `v0.1.0`, which wait for the
owner.

## Verification

| Gate | Where | Result |
| --- | --- | --- |
| check | local | green: 26 modules, 0 violations, 5 warnings |
| scenarios | local, twice | 131 passed (2.8m), 131 passed (2.8m) |
| scenarios | CI on acbdb31 ("check and scenarios") | 131 passed (2.9m) |
| deploy | local | first run failed: the Docker daemon was not running after a container restart (environment, not product). Rerun after starting `dockerd`, with `QUIRE_NODE_IMAGE=mirror.gcr.io/library/node:22-bookworm-slim`: R-OPS-04 passed (47.0s) |
| ux | local | R-PLT-08 gate passes; 11 passed (10.0m) |
| deploy, ux | CI | skipped on pull requests by design; they run on push to main, weekly and on demand |

## Playbook friction

None new.

## Spec drift

None: R-ACC-02, R-OPS-02 and R-SYN-09 are MODIFIED in full; each keeps its earlier scenarios.
