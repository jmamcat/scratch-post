---
id: 0010-handoff-and-gate-environments
status: accepted
proposed_by: claude-code/tier-A (single agent, Quire changes 0005 to 0007)
date: 2026-10-17
evidence: counterexample
affects: [modules/handoff, modules/scenarios, modules/ux, modules/hardening, README.md]
version_bump: minor
---

# Handoff files, and gates that see their real environment

## Problem

Four counterexamples from one day of work on Quire:

1. **Handoff.** The session's context was summarized twice. The owner warned that the
   cloud credit was nearly spent and asked for a running session gist, the working
   documents in the repository, and a list of human steps and agent work. Nothing in the
   playbook said where such state lives, so it was improvised (`sessions/GIST.md`,
   `sessions/NEXT.md`, `cloud-files/`).
2. **A slow gate never ran.** The `deploy` job runs on pushes to `main`, never on pull
   requests. It failed on both merges after 0.1.0 (no Chromium, then a Compose build
   refusal), and nobody saw it. The readiness review asked for "its first green run",
   which the fast job satisfied.
3. **Fonts.** The UX gate failed in CI with every typography score 8 to 10 points lower
   and 20 new violations. The baseline was approved on a machine with Inter installed;
   the runner fell back to Liberation Sans, and every line length changed.
4. **A stale build.** The scenario runner built the web app only when `dist/` was missing.
   In change 0007, UI scenarios would have run against the build from before the change.

## Change

- New `modules/handoff`: `sessions/GIST.md` (facts), `sessions/NEXT.md` (human steps and
  agent work ordered by value for cost), a working-documents folder with an environment
  record, and rules for pacing work on a budget.
- `modules/hardening`, Continuity: every job must have been green once. A change to the
  workflow or to a slow gate's inputs gets one on-demand run on its branch before merging.
- `modules/ux`, Baseline: install in CI the fonts of the machine that approved the
  baseline, or ship the font.
- `modules/scenarios`, Rules: a runner that builds the system under test rebuilds when its
  sources are newer than the build.

## Evidence

Counterexamples above. Walk-throughs:

- (2) An on-demand run of the workflow on the branch exposed both deploy failures and the
  font failure. After the fixes, run 9 passed all three jobs.
- (3) With `fonts-inter` installed, the same baseline passed in CI unchanged.
- (4) With the timestamp check, touching `live.ts` rebuilt the bundle, and an unchanged
  tree skipped the build.

## Guards

Stop conditions and gates unchanged. The changes are harness, model, language and project
agnostic: any CI, any font, any build tool. No records deleted. The handoff module is
optional.

## Outcome

Accepted. Version 1.10.0.
