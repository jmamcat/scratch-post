# Run protocol

How one or more agents take a shaped change from packets to a verified, reported result.
Paths below are relative to the project's `playbook.yaml` settings.

## Roles

- **Coordinator.** Schedules packets, owns `P00`, merges results, runs the gates, writes the
  run report. Exactly one per run.
- **Worker.** Takes one packet at a time and edits only its owned paths.

If the harness cannot start sub-agents, one agent plays both roles and works the lanes in
order. The result must be the same; only wall-clock time differs.

## 1. Plan

1. Read `AGENTS.md`, the change's `proposal.md`, `design.md` (if any) and spec deltas.
2. List `changes/<id>/packets/P*.md` and build the dependency graph from `depends_on`.
3. A packet is **ready** when all its dependencies are `done`. Ready packets may run in
   parallel unless their `owns` globs overlap.

## 2. Claim

Set `status: doing` and `claimed_by: <harness>/<model>` in the packet front matter. With
git branches, work on `run/<change>/<packet>`; otherwise work in the shared tree and rely on
owned paths. A worker that needs a new dependency lists it under "Needs from P00" and
works around it until the coordinator adds it.

## 3. Work

Decide without asking (`core/decisions.md`). Keep the structure rules (`modules/structure`).
Write or update the scenarios the packet's requirements name before or with the code.

## 4. Verify

Run the packet's acceptance commands. Paste the summary. Set `status: done`.

## 5. Merge

The coordinator merges packet branches in dependency order and reruns `check` after each.
A merge conflict inside one packet's owned paths resolves in that packet's favour; any other
conflict means `owns` was wrong, which is a decision record for the coordinator.

Commit messages: `<change-id>/<packet>: <imperative summary>`. Never put model names in
commits, code or comments.

## 6. Report and fold back

Run both gates on the merged result, write the run report, merge spec deltas into the living
specs, archive the change, open amendments for playbook friction.

## Running packets with any CLI

`bin/packet-prompt.sh <packet.md>` prints a self-contained worker prompt.
`bin/run-lanes.sh <change-folder>` runs every ready packet with `AGENT_CMD` (prompt on stdin),
`PARALLEL` at a time, looping until nothing is ready, and marks packets that did not update
their status as `blocked`. Harness-specific notes: `adapters/harnesses.md`.
