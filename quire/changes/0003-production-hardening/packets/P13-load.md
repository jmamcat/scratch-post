---
id: 0003-production-hardening/P13
title: Load of 32 devices
lane: E
depends_on: [P01, P05, P06]
owns:
  - quire/scenarios/steps/load.steps.ts
  - quire/scenarios/support/load.ts
borrows:
  - quire/packages/sync/src/server.ts  # only for a measured bottleneck, with a decision record
  - quire/apps/server/src/vault/store.ts  # same
  - quire/apps/server/src/live/rooms.ts  # same
reads:
  - quire/changes/0003-production-hardening/**
  - quire/spec/**
  - quire/apps/server/src/**
  - quire/packages/**
  - quire/scenarios/**
size: M
revision: 1
status: doing
claimed_by: claude-code/tier-A
---

# Load of 32 devices

## Context

Implements R-OPS-05 (`quire/changes/0003-production-hardening/spec/ops/spec.md`): one owner,
up to 32 people or devices at once. Write the load driver and its steps; if the target is
missed, find the bottleneck with measurements, fix it inside the borrowed files, and record
the before and after numbers.

## Contract

- `N devices`: N system devices on the cloud server (`world.addDevice`), synced once.
- `every device makes N edits across M shared notes while K of them type in "p", with seed
  S`: seeded (reuse the simulation's generator if it fits), concurrent: every device loops
  edit, then sync, with small random pauses; K devices also join `p`'s live room and type
  there. Record every push's duration (wrap the device transport's fetch for
  `/api/sync/push`) and every failed request.
- `the 95th percentile push took under N ms`, `no request failed`; `every device matches the
  cloud server` exists already (after a final sync round for everyone).
- Print a short summary (pushes, p50, p95, p99, max, errors, wall time) to the test output.

## Acceptance

```sh
playbook/bin/gate.sh check
playbook/bin/gate.sh scenarios "@R-OPS-05|@cap-sync|@cap-live"
```

Run R-OPS-05 three times; all three pass. Paste the three summaries under Acceptance.

## Decisions log
