---
id: 0003-production-hardening/P14
title: Every screen passes the UX gate
lane: H
depends_on: [P09, P12]
owns:
  - quire/scenarios/ux/baseline.json
borrows:
  - quire/apps/web/src/**  # markup and CSS fixes the UX report asks for; each one a decision record
reads:
  - quire/**
  - playbook/modules/ux/**
size: M
revision: 1
status: todo
---

# Every screen passes the UX gate

## Context

Implements R-PLT-08 (`quire/changes/0003-production-hardening/spec/platforms/spec.md`) with
the scorer from P12: in every theme, light and dark, the standard screens have no serious or
critical accessibility violations, meet WCAG AA contrast, reflow at 320 px, show focus on
every focusable control, and score at least 85 per screen and 70 per category. Runs last,
when every screen exists and no other packet is editing the web app.

## Contract

- Fix what the report names, smallest change first (labels, roles, focus styles, sizes,
  spacing, colours). Never exclude a rule or a selector without a decision record that says
  why the rule does not apply.
- Approve the new baseline (`pnpm -C quire ux:approve`) once everything passes, and paste the
  before and after summary tables under Acceptance: they are the evidence for the change.

## Acceptance

```sh
pnpm -C quire build:web
playbook/bin/gate.sh check
playbook/bin/gate.sh ux
playbook/bin/gate.sh scenarios
```

Every scenario passes, R-PLT-08 included.

## Decisions log
