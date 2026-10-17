# Run protocol

How one or more agents take a shaped change from packets to a verified, reported result.
Paths below are relative to the project's `playbook.yaml` settings.

## Roles

- **Coordinator.** Schedules packets, owns `P00`, merges results, runs the gates, writes the
  run report. Exactly one per run.
- **Worker.** Takes one packet at a time and edits only its `owns` and `borrows` paths.

If the harness cannot start sub-agents, one agent plays both roles and works the lanes in
order. The result must be the same; only wall-clock time differs.

When the coordinator takes a worker packet itself, it claims it like a worker and logs a
decision record saying why (no worker available, packet too coupled to integration work,
faster than briefing a worker). The run report's Execution table shows every such packet.

## 1. Plan

1. Read `AGENTS.md`, the change's `proposal.md`, `design.md` (if any) and spec deltas.
2. List `changes/<id>/packets/P*.md` and build the dependency graph from `depends_on`.
3. A packet is **ready** when all its dependencies are `done`. Ready packets may run in
   parallel unless their `owns` or `borrows` paths overlap.

## 2. Claim

Set `status: doing` and `claimed_by: <harness>/<model>` in the packet front matter. With
git branches, work on `run/<change>/<packet>`; otherwise work in the shared tree and rely on
owned paths.

A packet may edit its `owns` paths freely and its `borrows` paths narrowly. A worker that
finds it must edit any other path stops touching it, logs a decision record, and asks the
coordinator to add the path to `borrows` (allowed only when no running packet owns or
borrows it) or marks the packet `blocked` so the coordinator can re-cut ownership. Never
edit an unlisted path and explain afterwards.

A worker that needs a new dependency lists it under "Needs from P00" and works around it
until the coordinator adds it.

## 3. Work

If a gate or another run-wide policy changes while packets are open (a new test runner, a
renamed command, a new structure rule), the coordinator re-issues every packet that is not
`done`: updates its Contract and Acceptance and increments `revision:`. Workers re-read a
packet whose revision changed before continuing.

Decide without asking (`core/decisions.md`). Keep the structure rules (`modules/structure`).
Workers share one machine: stop only processes you started, by their process id, never by a
name pattern (`pkill -f`, `killall`).
Write or update the scenarios the packet's requirements name before or with the code.

## 4. Verify

Run the gates named in the packet's Acceptance (`bin/gate.sh`). Paste the summary. Set
`status: done`.

Usage module on: when a packet of size M or larger (or a wave, or a research task) finishes,
the coordinator appends its row with `bin/usage.py add`, using the numbers the harness
reported for that worker. Workers do not need to know their own cost.

## 5. Merge

The coordinator merges packet branches in dependency order and reruns `check` after each.
A merge conflict inside one packet's owned paths resolves in that packet's favour; any other
conflict means `owns` was wrong, which is a decision record for the coordinator.

Commit messages: `<change-id>/<packet>: <imperative summary>`. Never put model names in
commits, code or comments.

## 6. Report and fold back

Run both gates on the merged result, record the change's usage row (if the usage module is on), write the run report, merge spec deltas into the living
specs, archive the change, open amendments for playbook friction.

## Running packets with any CLI

`bin/gate.sh <gate> [tags]` runs a gate from `playbook.yaml` by name; packets use it in
their Acceptance sections so they never name tools.

`bin/packet-prompt.sh <packet.md>` prints a self-contained worker prompt.
`bin/run-lanes.sh <change-folder>` runs every ready packet with `AGENT_CMD` (prompt on stdin),
`PARALLEL` at a time, never batching two packets whose `owns` or `borrows` overlap, looping
until nothing is ready, and marks packets that did not update their status as `blocked`.
Harness-specific notes: `adapters/harnesses.md`.
