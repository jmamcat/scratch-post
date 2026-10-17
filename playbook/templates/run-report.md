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

## Usage

Rows of `usage/ledger.csv` for this change (`playbook/bin/usage.py report --change <id> --by scope`)
and the totals by model (`--by model`). Say where the numbers came from and which are missing.

| Scope | Harness | Model (alias, tier) | Total tokens | Credits | Wall minutes | Outcome |
| --- | --- | --- | ---: | ---: | ---: | --- |
| P01 | <harness> | <alias> (A) | <n or empty> | <n unit or empty> | <n> | done, first pass |

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
