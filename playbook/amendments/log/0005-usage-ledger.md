---
id: 0005-usage-ledger
status: accepted
proposed_by: the project owner (request during Quire change 0002), written by the coordinator
date: 2026-10-16
evidence: counterexample
affects: [modules/usage, bin/usage.py, core/loop.md, core/run-protocol.md, templates/run-report.md, adapters/harnesses.md, amendments/README.md]
version_bump: minor
---

# A usage ledger per slice, mapped to harness and model

## Problem

`amendments/README.md` lists "wall-clock and token cost where the harness reports them" as
a metric for replays and trends, but nothing told anyone to keep those numbers. In Quire
0001 the harness reported each sub-agent's tokens and duration (eight research and packet
workers, 65k to 307k tokens each), and they were left in the session transcript only. The
0001 run report could say which tier ran which packet (amendment 0002) but not what it
cost, so a replay comparing tiers B and C on the same packet would have had no baseline.
The owner asked for a record of which harness and model, and how many credits and tokens,
went into each build or pull request.

## Change

- New optional module `modules/usage`: one CSV row per large slice (packet of size M or
  more, a wave, research, the whole change or a pull request), with harness, model alias,
  tier, tokens, credits, wall time, outcome and the source of the numbers.
- `bin/usage.py add | report | models` (Python standard library only).
- Model aliases in `usage/models.yaml`; real names may live in an uncommitted
  `usage/models.local.yaml` for projects that keep model identifiers out of the repository.
- The coordinator records rows after large slices (`core/run-protocol.md` step 3, step 6;
  `core/loop.md` step 6). Run reports gain a Usage section.
- `adapters/harnesses.md` says where each harness reports usage.

## Evidence

Counterexample: Quire 0001 (above). Walk-through under the amended text: each worker's
completion adds a ledger row with `source: harness-subagent-report`; the run report's Usage
section shows `usage.py report --by model`; an amendment replay can cite those rows. The
0001 and 0002 rows were backfilled from the transcript to check the format holds real data.

## Guards

Stop conditions unchanged; gates unchanged; the module is optional, takes any harness and
any model alias, and never blocks on missing numbers; no records deleted.

## Outcome

Accepted on the owner's request, version 1.5.0.
