---
id: 0001-mvp-foundation/P10
title: End-to-end verification and run report
lane: Z
depends_on: [P04, P05, P06, P08, P09]
owns:
  - quire/e2e/**
  - quire/changes/0001-mvp-foundation/run-report.md
reads:
  - quire/**
size: S
status: done
claimed_by: claude-code/claude
---

# End-to-end verification

## Context

Coordinator packet. Proves the slice works in a real browser and writes the run report.

## Contract

Superseded during the run by the scenarios module: every spec scenario is generated into
Gherkin and run by playwright-bdd, `@system` against real server processes and `@ui` in
Chromium (`quire/scenarios/`).

## Acceptance

```sh
pnpm -C quire check
pnpm -C quire scenarios
```

Result: check ok (9 packages, 0 dependency violations, 0 structure violations); scenarios
66 passed. Run report written.

## Decisions log
