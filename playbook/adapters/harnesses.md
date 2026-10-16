# Harness adapters

The playbook needs only three abilities: read files, write files, run shell commands.
Everything below is a shortcut, never a requirement.

| Harness | Entry file it reads | Parallel workers | One packet, non-interactive |
| --- | --- | --- | --- |
| Claude Code | `CLAUDE.md` (make it `@AGENTS.md`) | sub-agents, or worktrees | `bin/packet-prompt.sh P03.md \| claude -p` |
| Codex CLI | `AGENTS.md` | one `codex exec` per packet | `codex exec "$(bin/packet-prompt.sh P03.md)"` |
| Hermes Agent | `AGENTS.md` | sub-agent delegation, or one process per packet | pass the prompt to its non-interactive mode |
| Any other CLI | `AGENTS.md` | `bin/run-lanes.sh` | `AGENT_CMD='<cli and flags>' bin/run-lanes.sh <change>` |

Check each harness's own documentation for its current non-interactive flags; the playbook
does not depend on any of them.

## Models

The playbook is model-agnostic by keeping packets small and self-contained (see model tiers
in `core/packets.md`). Mixed runs are fine: a tier A model coordinates and writes designs,
tier B and C models take S and M packets. Record `claimed_by` so the run report shows who did
what; amendments can then compare outcomes by tier.

## Usage numbers

The usage module (`modules/usage`) records whatever the harness reports; set `source` to say
which of these it was. Check each harness's current documentation, as these change.

| Harness | Where the numbers are | `source` |
| --- | --- | --- |
| Claude Code | A finished sub-agent's notification carries its total tokens, tool uses and duration. `/cost` shows the session's tokens and cost on API billing; `/usage` shows plan limits on a subscription. Non-interactive `claude -p --output-format json` returns usage and cost in its result. | `harness-subagent-report`, `harness-cost-command`, `harness-json-log` |
| Codex CLI | `codex exec --json` emits token count events; sum them per packet. | `harness-json-log` |
| Hermes Agent, others | The CLI's own usage or cost command or log, if any. | `harness-cost-command`, `harness-json-log` |
| Any | The provider's billing or usage dashboard, read per day or per key. | `billing-dashboard` |

A coordinator's own tokens are often reported only for the whole session. Record them once
per change with `scope: coordinator`, or leave the numbers empty with `source: unknown`.
Credits on cloud plans may be reported only as a running balance: subtract the balance after
the slice from the balance before, and set `credit_unit` to the plan's unit.
