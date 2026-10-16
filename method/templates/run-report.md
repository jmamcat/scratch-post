---
change: <change-id>
run: <YYYY-MM-DD-NN>
agents: [<harness/model pairs that worked on this run, e.g. "claude-code/opus", "codex/gpt", "hermes/qwen">]
result: complete | partial | blocked
---

# Run report: <change title>

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

Commands run and their results (pass/fail counts, not just "tests pass").

## Spec drift

Requirements whose implementation differs from the spec, and whether the spec or
the code should change.
