# Local handoff

Paste the block below into a terminal agent (or follow it by hand) on the local machine. It
brings this project down from GitHub and lets the agent place it in the local paracosm
workspace. The cloud sessions do not know that workspace's layout, so the agent looks
before it clones.

````text
Bring the project github.com/jmamcat/scratch-post into my local paracosm workspace.

1. Find the paracosm root and how it is organised (look for a README, AGENTS.md, CLAUDE.md
   or index file that says where projects go). Propose a target folder that fits that
   layout, for example a projects or products area. Tell me the path and why, and wait for
   my yes before cloning. Do not overwrite or move anything that is already there.

2. Clone it there. The reference submodules are large (Joplin especially), so leave them
   out unless I ask:
     git clone https://github.com/jmamcat/scratch-post.git <target>
     cd <target>
     git fetch origin claude/cloud-credits-github-remote-projects-rtnkko
   If the repository has gone private, use my GitHub login (gh auth login, or SSH:
   git@github.com:jmamcat/scratch-post.git).
   Optional, only to study the reference products:
     git submodule update --init --depth 1

3. Branches:
   - main at c21dce2: Quire 0.1.0 plus changes 0005 to 0007 (PR #4).
   - claude/cloud-credits-github-remote-projects-rtnkko: main plus change 0008
     (templates and the slash menu), session learnings and handoff docs. Not merged yet.
     Open the PR from it, or merge it locally, when I say so.
   - Tag v0.1.0 is still missing. On my say-so:
     git tag -a v0.1.0 5adae66 -m "Quire 0.1.0" && git push origin v0.1.0

4. Toolchain: Node 24 (22.13 or later works), pnpm 10.28.0 (corepack enable), uv for the
   playbook's Python scripts, Docker only for the deploy gate. Unlike the cloud container,
   a local machine needs its own browser for the scenarios:
     pnpm -C quire install
     pnpm -C quire --filter @quire/scenarios exec playwright install chromium
     pnpm -C quire check
     pnpm -C quire scenarios      # expect 142 passed
     pnpm -C quire demo           # cloud server + local node with seed data

5. Read, in this order: AGENTS.md, sessions/GIST.md, sessions/NEXT.md,
   sessions/LEARNINGS.md, playbook/README.md. The next change number is 0009.

6. Register the project in the paracosm index (if it has one) with a one-line description:
   "Quire: a lean Markdown store and renderer, built with the RefSpec playbook".
   Then report the path, the branch checked out, and the check and scenarios results.
````

## What is where

| Path | What |
| --- | --- |
| `quire/` | The product (pnpm workspace) |
| `playbook/` | The RefSpec playbook, project-agnostic |
| `references/` | Reference product notes; `upstream/` folders are submodules |
| `sessions/` | Gist, next steps, learnings, this handoff |
| `cloud-files/` | Working documents from the cloud sessions, `ENVIRONMENT.md` |
| `remote-projects/` | Unrelated starter scaffold |
