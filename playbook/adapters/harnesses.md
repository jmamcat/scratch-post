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
