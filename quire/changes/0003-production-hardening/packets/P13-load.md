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

- **D-P13-1** · confidence: med
  - Question: `every device matches the cloud server` (simulation.steps.ts, not owned) compares
    only the simulation's four paths, so 50 freely named notes would pass it vacuously.
  - Did: the first four of the M shared notes are those paths (`a.md`, `b.md`, `notes/c.md`,
    `notes/d.md`), the rest `load/note-NN.md`. The load step also compares every note head on
    the server (`/api/docs`, including `live.md`) with every device after the final sync
    rounds and fails on any difference.
  - Why: the contract reuses the existing step; owned paths only; the scenario must not pass
    without checking convergence.
  - Reverse: extend that step to compare `transport.docs()` heads (simulation.steps.ts), then
    drop `divergence` from load.steps.ts and name the notes freely in `sharedNotes`.
- **D-P13-2** · confidence: med
  - Question: how to "wrap the device transport's fetch"; HttpTransport keeps it in a private
    `fetchFn` and SystemDevice builds it in its constructor.
  - Did: support/load.ts replaces `fetchFn` on each load device's transport through a cast,
    restores it afterwards, throws if the field is gone, and the step asserts at least
    devices × edits pushes were recorded. A push is timed from request to full body read.
  - Why: contract wording; system-device.ts is not in owns or borrows.
  - Reverse: give SystemDevice an optional fetch hook (support/system-device.ts) and use it.
- **D-P13-3** · confidence: med
  - Question: what "seeded" means for concurrent devices.
  - Did: the simulation's mulberry32 generator, copied into support/load.ts (it is not
    exported from its steps file); one generator per device and per typist, seeded from S and
    the device index. Each device's choices replay exactly; their interleaving does not.
  - Why: contract ("reuse the simulation's generator if it fits"); concurrency is required.
  - Reverse: `rng` and the seeds in `runLoad` (support/load.ts).
- **D-P13-4** · confidence: med
  - Question: the edit mix and pacing, which the spec leaves open.
  - Did: device 0 seeds every shared note with a title line and pushes (counted); everyone
    syncs; then each device N times: pick a note, replace a body line (40 %) or append one,
    sync, pause 10 to 100 ms. No deletions or offline periods (R-SYN-04 covers those). The K
    typists are devices 0 to K-1; they also make their N edits and type one character every
    20 to 80 ms at the start or end of the live note while the edit loops run.
  - Why: simplest mix that exercises push merges, pulls and the live room together.
  - Reverse: `editLoop` and `typeLoop` in support/load.ts.
- **D-P13-5** · confidence: med
  - Question: what counts as a failed request.
  - Did: any non-2xx answer or network error on a load device's transport, any sync report
    error, and a typist losing its live connection. Conflicts and review items (200 answers)
    are not failures.
  - Why: R-OPS-05 "no request failed"; conflicts are normal results of concurrent edits.
  - Reverse: `Recorder` and `typeLoop` in support/load.ts.
- **D-P13-6** · confidence: med
  - Question: whether to change the borrowed server files.
  - Did: nothing changed there; the target is met (p95 about 200 ms with the machine at load
    average 8, under 500 ms). Measured for the record (CPU profile of the cloud server, one
    run): the server is about 85 % busy, mostly serving pulls (about 14,800 GETs against 641
    pushes); server-side push p50 30 ms, p95 148 ms, so push latency is mostly queueing
    behind that work. Top self time: `SqliteRevisionStore.head()` (1.9 s of about 16 s busy),
    which prepares its statement on every call: 34 µs per call against 5.8 µs with a cached
    statement (microbenchmark, 750 revisions).
  - Why: the packet allows borrowed edits only for a missed target; P03 and P08 run now.
  - Reverse: if the target is missed on slower hardware, cache prepared statements in
    quire/apps/server/src/vault/store.ts (`head`, `text`, `revision`, `changesSince`) first.
