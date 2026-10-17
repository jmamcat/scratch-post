---
id: 0004-release-0.1.0
play: fix-bug
status: archived
created: 2026-10-17
references: []
capabilities: [access, ops, sync]
---

# Release 0.1.0

## Why

0001 to 0003 are archived and every gate is green. Before calling this 0.1.0, close the loose
ends the 0003 run report lists, write the known limitations down where an operator will find
them, and put the gates on CI so `main` stays green after the merge.

## Headline scenarios

- Revoking a token closes the event streams it opened, not only its live rooms (R-ACC-02).
- Every line the server writes is one JSON object, unexpected errors included (R-OPS-02).
- The local node's limits are part of its requirement (R-SYN-09) and of the deployment guide.

## What changes

- **access**: R-ACC-02 also closes event streams on revocation.
- **ops**: R-OPS-02 covers every log line, not only request lines.
- **sync**: R-SYN-09 states the 0.1.0 limits of local nodes (no attachments, rename history
  starts at the rename upstream).
- Outside the specs: a CI workflow (`.github/workflows/ci.yml`) running `check` and
  `scenarios` on every push and pull request, and `deploy` and `ux` on demand and weekly;
  `quire/CHANGELOG.md`; version 0.1.0 in the manifests.

## Out of scope

Replicating attachments and rename history through local nodes (the next change that touches
local nodes), merging and tagging (the owner's call).
