# Run protocol

How one or more agents take an approved change from packets to a verified, reported
result without stopping to ask questions.

## Roles

- **Coordinator.** Reads the change, schedules packets, merges results, runs the final
  checks, writes the run report. Exactly one per run.
- **Worker.** Takes one packet at a time, works only inside the packet's `owns` paths,
  and leaves decision records in the packet.

If the harness cannot start sub-agents, one agent plays both roles and works the lanes
one after another. The result must be the same; only wall-clock time differs.

## 1. Plan

1. Read `AGENTS.md`, then the change's `proposal.md`, `design.md`, and spec deltas.
2. List packets: `ls <target>/changes/<change>/packets/`. Build the dependency graph
   from each packet's `depends_on`.
3. A packet is **ready** when every dependency has `status: done`.
4. Ready packets in different lanes may run at the same time. Two packets whose `owns`
   globs overlap must never run at the same time, even if their lanes differ.

## 2. Claim

Set the packet's front matter to `status: doing` and add `claimed_by: <harness>/<model>`
(for example `codex/gpt`, `hermes/qwen`). With git branches, work on
`run/<change>/<packet-number>`; without them, work in the shared tree and rely on
`owns` for isolation.

Files every packet needs to touch (root `package.json`, lockfile, workspace config)
belong to packet `P00`, the integration packet, which the coordinator owns. A worker
that needs a new dependency records it as a decision and lists it under
"Needs from P00" in its packet; the coordinator adds it.

## 3. Work: never block

When something is ambiguous, decide in this order and keep going:

1. What the spec says (requirements and scenarios).
2. What the `baseline` reference does (`references/feature-matrix.md`, then its product folder).
3. What a `primary` reference for that domain does.
4. The simplest option that is easy to reverse.

Write a decision record for every call that a reasonable reviewer might make differently.
Stop and mark the packet `status: blocked` only for:

- destructive actions outside the packet's `owns` paths,
- anything needing secrets, credentials, payments, or new accounts,
- license problems (for example code that would have to be copied from an AGPL reference).

A blocked packet does not stop the run. Continue with any other ready packet.

### Decision records

Append to the packet's "Decisions log":

```markdown
- **D-<packet>-<n>** · confidence: high | med | low
  - Question: <what was unclear>
  - Did: <what was chosen>
  - Why: <spec line, reference ID, or reasoning>
  - Reverse: <what to change if wrong, which files>
```

## 4. Verify

A packet is `done` only when every command in its Acceptance section exits 0. Paste
the command output summary (counts, not full logs) under the Acceptance section.
After all packets, the coordinator runs the target's full check (for Quire:
`pnpm -C quire check`).

## 5. Merge

With branches, the coordinator merges packet branches in dependency order and reruns
the full check after each merge. Merge conflicts inside one packet's `owns` paths are
resolved in favour of that packet; anything else means `owns` was wrong, which is a
decision record for the coordinator.

Commit messages: `<change-id>/<packet>: <imperative summary>`. Never put model names
in commits or code.

## 6. Report

The coordinator copies `method/templates/run-report.md` to
`<target>/changes/<change>/run-report.md` and fills it:

- every decision record with confidence `med` or `low` goes in the questions table,
  phrased as "I have some questions, but I proceeded with these recommendations;
  kindly direct me if any were incorrect",
- high-confidence decisions are summarised in one line each,
- blocked packets, verification output, and spec drift.

Human replies to a run report are applied as a new change (or a follow-up packet in the
same change if it is not archived yet).

## 7. Archive

When a human accepts the report, or after the next change starts without objections:
apply the spec deltas to `<target>/spec/`, set `status: archived` in the proposal, and
move the change folder to `<target>/changes/archive/`.

## Harness adapters

The protocol needs only: read files, write files, run shell commands. Sub-agents are an
optimisation. `scripts/packet-prompt.sh <packet-file>` prints a self-contained prompt
for one packet, so any CLI can act as a worker:

| Harness | Parallel workers | Example |
| --- | --- | --- |
| Claude Code | sub-agents or worktrees | `scripts/packet-prompt.sh P03.md \| claude -p` |
| Codex CLI | one `codex exec` per packet | `codex exec "$(scripts/packet-prompt.sh P03.md)"` |
| Hermes Agent | sub-agent delegation, or one process per packet | pass the prompt to its non-interactive mode |
| Any other / plain shell | `scripts/run-lanes.sh` with `AGENT_CMD` set | `AGENT_CMD='mycli -p' scripts/run-lanes.sh <change>` |

Check your harness's own docs for its non-interactive flag; the protocol does not
depend on any particular one.

## Model tiers

Packet `size` decides who can take it:

| Tier | Typical models | May take | Also |
| --- | --- | --- | --- |
| A | frontier models | S, M, coordinator | writes proposals and designs |
| B | strong open-weight models (Qwen, Kimi class) | S, M | needs contracts copied into the packet |
| C | small or local models | S only | acceptance commands must be explicit |

Packets are written for tier B by default: every type, route and file format the
packet must honour is copied into its Contract section.
