---
id: 0009-continuity
status: accepted
proposed_by: claude-code/tier-A (coordinator, Quire change 0004), approved by the project owner
date: 2026-10-17
evidence: counterexample
affects: [modules/hardening]
version_bump: minor
---

# The readiness review asks about CI

## Problem

Quire 0003 passed the whole readiness review in `modules/hardening`, yet nothing would run a
gate after the branch merged: every gate ran only when an agent or a person ran it. The
review had no question that would have caught that, so "production ready" did not include
"stays green".

## Change

A Continuity row in the review: fast gates on every push and pull request, slow gates
(`deploy`, `ux`) weekly and on demand, proven by the linted workflow file and its first
green run.

## Evidence

Counterexample above. Walk-through: Quire 0004 asked the new question and added
`.github/workflows/ci.yml` (linted with actionlint) before the 0.1.0 merge.

## Guards

Stop conditions and gates unchanged; harness, model, language and project agnostic (any CI
system); no records deleted.

## Outcome

Accepted. Version 1.9.0.
