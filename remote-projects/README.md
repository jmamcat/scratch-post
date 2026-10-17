# remote-projects

Workspace for projects run in Claude Code cloud sessions (claude.ai/code).

## Setup

1. Create the repo on GitHub with default settings (private, README).
2. Give the Claude GitHub App access to it: https://github.com/apps/claude/installations/select_target
   (either "All repositories" or add `remote-projects` to the selected list).
3. Start a cloud session at https://claude.ai/code and pick `remote-projects`,
   or attach it to a running session.

## Layout

- `.claude/settings.json`: shared Claude Code project settings (kept at defaults).
