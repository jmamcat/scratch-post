---
change: <change-id>
run: <YYYY-MM-DD-NN>
agents: [<harness/model pairs that worked on this run, e.g. "claude-code/opus", "codex/gpt", "hermes/qwen">]
result: complete | partial | blocked
---

# Run report: <change title>

## Execution

| Packet | Run by | Mode | Coordinator ran it |
| --- | --- | --- | --- |
| P01 | <harness/model> | parallel with P02, P03 / sequential | no / yes (decision D-...) |

## Summary

What shipped, in three to six bullets. Each bullet names the packet(s).

## I have some questions, but I proceeded with these recommendations

Kindly direct me if any of these were incorrect. Each item is reversible as noted.

| # | Question | What I did | Why | Confidence | To reverse |
| --- | --- | --- | --- | --- | --- |
| D-001 | | | | high / med / low | |

## Blocked or skipped

Anything not done, with the reason and what is needed to unblock.

## Verification

`check` and `scenarios` results: counts and scenario tags, not "tests pass".

## Playbook friction

Anything in the playbook that cost time or was ambiguous, with the packet where it happened.
Candidates for amendments (`amendments/README.md`).

## Spec drift

Requirements whose implementation differs from the spec, and whether the spec or
the code should change.
