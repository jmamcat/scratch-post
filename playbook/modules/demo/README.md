# Module: demo

Every change that adds visible behaviour leaves the system demo-able: a person can start it
with one command, see realistic data, and follow a short walkthrough that shows the change.

## What a project provides

| Item | Where | Notes |
| --- | --- | --- |
| `demo` command | `playbook.yaml` | starts every node the walkthrough needs, with seed data, and prints URLs |
| Seed data | `<target>/demo/seed/` | realistic, small, exercises every headline scenario; no real personal data |
| Walkthrough | `<target>/demo/WALKTHROUGH.md` | numbered steps, each with what to do and what you should see; 10 minutes or less |
| Staged situations | `<target>/demo/` scripts | for states that are hard to reach by hand (for example "create a conflict between two devices") |

## Rules

- The walkthrough's steps mirror headline scenarios, so if the scenario suite is green the
  demo works.
- The demo uses the same binaries and configuration paths as production, with a throwaway
  data directory.
- `demo` must be idempotent: running it twice starts from fresh seed data.
