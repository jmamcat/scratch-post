---
id: 0008-hardening-ux-environments
status: accepted
proposed_by: the project owner (request during Quire change 0003), written by the coordinator
date: 2026-10-16
evidence: counterexample
affects: [modules/hardening, modules/ux, adapters/environments.md, modules/structure/README.md, plays/new-system.md, README.md]
version_bump: minor
---

# Production readiness, a UX scorer, and environment conventions

## Problem

After Quire 0002 every gate was green, yet asked "is this production ready?" the honest
answer listed eleven gaps: the server ran open without a token, tokens travelled in URLs,
nothing was backed up, the web app could not start offline, renames broke links, files could
not be attached, the bundle was one 1.25 MB chunk, nothing was observable, and there was no
way to deploy or to know the load it holds. The playbook had no step that would have asked
any of these questions, so green gates read as "done". UI quality had no measure at all: the
Default dark theme shipped a 3.3:1 primary button that no gate could see.

## Change

- `modules/hardening`: a readiness review where every area (access, secrets in transit,
  surface, data safety, offline, observability, deployment, load, budgets, UX) becomes a
  requirement with a scenario or a decision record. `plays/new-system.md` runs it before
  calling a system production ready.
- `modules/ux`: states, seven categories, a score formula, hard checks, floors and a ratchet
  against a committed baseline; the evidence for UI amendments and UI changes.
- `adapters/environments.md`: uv for Python tooling, Docker and Compose conventions, and the
  workarounds sandboxed agent environments need (daemon, registry mirror, TLS-inspecting
  proxies).
- Gates that need special machinery or minutes of runtime (`deploy`, `ux`) are named gates
  with their own scenario tags, so `check` and `scenarios` stay fast.
- `structure_allow` may name an application shell (`app`) beside `shared`.

## Evidence

Counterexample: the 0002 state above. Walk-through under the amended text: Quire change 0003
ran the review, carried 21 requirements and 41 scenarios, and closed every gap except those
the owner left out; the UX scorer found the contrast failure (fixed: 180 of 180 states pass
contrast) and four more rule failures across the screens, which the last packet fixes with
before and after tables as evidence.

## Guards

Stop conditions unchanged; `check` and `scenarios` unchanged and still required; the new
gates add verification, they remove none; harness, model, language and project agnostic
(Quire appears only as an example); no records deleted.

## Outcome

Accepted on the owner's request. Version 1.8.0.
