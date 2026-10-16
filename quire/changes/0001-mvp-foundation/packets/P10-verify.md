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
status: todo
---

# End-to-end verification

## Context

Coordinator packet. Proves the slice works in a real browser and writes the run report.

## Contract

Playwright (Chromium at `/opt/pw-browsers` in the agent container) against a server
serving the web build. Scenarios: create a note with a wikilink and see the backlink;
go offline (`context.setOffline(true)`), edit, come back online and see the server head
change; two browser contexts edit different paragraphs of one note offline and both edits
survive; a true conflict shows in the review inbox and resolves.

## Acceptance

```sh
pnpm -C quire check
pnpm -C quire e2e
```

## Decisions log
