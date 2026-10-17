# Module: usage

A ledger of what each slice of work cost: which harness, which model, how many tokens and
credits, how long, and what it produced. It turns runs into benchmarks: the same play on a
different harness or model can be compared, and amendments can cite real numbers
(`amendments/README.md`, replay and trend evidence).

## When to record

Right after a large slice, by the coordinator:

| Slice | Row scope |
| --- | --- |
| a packet of size M or larger | the packet id, for example `P03` |
| a wave of parallel packets | `wave-1`, listing the packets in `notes` |
| research or reference work done by sub-agents | `research:<topic>` |
| the end of a change (or a pull request) | `change` (or `pr-<number>`), the change's total |

Small packets may roll into their wave or change row; when the harness reports each worker
separately anyway, a row per packet costs nothing and compares better. Never block on missing numbers: record
what the harness reports, leave the rest empty, and say where the numbers came from.

## Where

`playbook.yaml` names the folder (`usage: usage` by default):

```
usage/
  ledger.csv            committed: one row per slice (columns below)
  models.yaml           committed: model aliases with tier and notes, no product names required
  models.local.yaml     NOT committed (gitignored): alias -> the real model identifier
```

Model names go in `models.local.yaml` only when a project or its environment does not want
model identifiers in the repository; otherwise `models.yaml` may hold them directly. The
report script joins whichever it finds.

## Columns

| Column | Meaning |
| --- | --- |
| `date` | ISO date of the slice |
| `change` | change id, for example `0002-workspace-ux` |
| `scope` | packet id, `wave-N`, `research:<topic>`, `change` or `pr-<n>` |
| `harness` | `claude-code`, `codex`, `hermes`, ... |
| `model` | alias from `models.yaml`, for example `m1` |
| `tier` | A, B or C (`core/packets.md`) |
| `agents` | number of agents in the slice |
| `input_tokens`, `output_tokens`, `cache_read_tokens`, `cache_write_tokens` | as reported; empty when not reported |
| `total_tokens` | as reported, or the sum of the four above |
| `credits`, `credit_unit` | cost in the harness's unit (`usd`, `credits`, ...); empty when unknown |
| `wall_minutes` | elapsed time for the slice |
| `outcome` | short result: `done, 7/7 scenarios first pass`, `blocked`, `rework 2 rounds` |
| `source` | where the numbers came from: `harness-subagent-report`, `harness-cost-command`, `billing-dashboard`, `estimate` |
| `notes` | anything else (packets in a wave, retries) |

## Commands

```sh
playbook/bin/usage.py add --change 0002-workspace-ux --scope P03 --harness claude-code \
  --model m2 --tier B --total-tokens 154000 --wall-minutes 22 \
  --outcome "done, 7/7 first pass" --source harness-subagent-report
playbook/bin/usage.py report                 # totals by change
playbook/bin/usage.py report --by model      # compare models
playbook/bin/usage.py report --by harness --change 0002-workspace-ux
playbook/bin/usage.py models                 # aliases, tiers, local names if present
```

## In run reports

The run report's Usage section lists the change's ledger rows and the totals by model
(`usage.py report --change <id> --by model`), next to the Execution table, so outcome and
cost sit side by side.

## Getting the numbers

See `adapters/harnesses.md`, "Usage numbers". Each harness reports differently; the ledger
only needs what is available, plus an honest `source`.
