# Module: handoff

Keeping work resumable when sessions end, contexts get summarized, credits run out or
another agent or person picks the work up. A project that uses it keeps two short files
next to the code, plus the working documents a session would otherwise lose.

## Files

| File | Holds | Updated |
| --- | --- | --- |
| `sessions/GIST.md` | What is true now (branches, versions, gates), open items, how to resume, environment quirks, a dated log | at the end of every turn that changes state |
| `sessions/NEXT.md` | What comes next: **human steps** (need an account, a device, money or a decision) and **agent work**, ordered by value for its cost, ticked as it ships with the commit or PR | when an item ships or turns up |
| a working-documents folder (for example `cloud-files/`) | Prompts sent to workers, coordinator notes, drafts, reports that live outside the repo during a session, plus an environment record (machine, tools, network, access) | before the session's machine goes away |

The project's agent guide (`AGENTS.md`, `CLAUDE.md`) points at both files and says to read
the gist first.

## Rules

- **Facts, not plans, in the gist.** It says what is true and what is open. Plans and
  reasoning belong in `NEXT.md`, change folders and run reports.
- **Split by who can act.** A human step is never in the agent list. An agent never
  works around a human step: a refused tag push, a private repository or a device test
  is written down for the owner.
- **Order agent work by value for cost.** Red CI on the default branch first, then
  limits written down in the product's docs, then gaps a run report carried forward,
  then hygiene. Anything else goes to the owner as a choice.
- **On a budget, pace the work.** One agent, sequentially. One full gate run before each
  push, and the affected scenarios while iterating. Verify slow CI gates on the branch on
  demand, not by pushing again and again.
- **No secrets or private data in the working-documents folder.** Strip attribution
  lines that the repository's rules exclude, and leave out logs, databases and
  third-party sources. Copy only after the owner agrees, while the repository is public.
- **Record the environment once.** Machine, tool versions, network policy and access
  limits in one file; later sessions update it instead of rediscovering it.
