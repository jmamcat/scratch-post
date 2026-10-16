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
status: doing
claimed_by: claude-code/tier-A
---

# Every screen passes the UX gate

## Context

Implements R-PLT-08 (`quire/changes/0003-production-hardening/spec/platforms/spec.md`) with
the scorer from P12: in every theme, light and dark, the standard screens have no serious or
critical accessibility violations, meet WCAG AA contrast, reflow at 320 px, show focus on
every focusable control, and score at least 85 per screen and 70 per category. Runs last,
when every screen exists and no other packet is editing the web app (you are the only worker
running).

What the P12 report found (read `P12-ux-scorer.md` and its decisions first):

- `scrollable-region-focusable` (serious, 140 states): the editor's `.cm-scroller` scrolls but
  cannot take keyboard focus.
- `link-in-text-block` (serious, 20 reading states): links in paragraphs differ by colour only.
- Focus visible (80 states): Tab into the note editor shows no change (its cursor may sit in
  the hidden front matter); on narrow screens with the sidebar open, focus reaches controls
  behind the overlay (`focus-obscured`, 90 states).
- `page-has-heading-one` (moderate, 70 states).
- Floors: every graph state is below 85 (75.9 to 80.9), mostly graph labels under 12 px;
  Interaction is below 70 in the narrow Folders and Review states.

The R-PLT-08 scenario now runs only in the `ux` gate (tag `@gate-ux`), not in `scenarios`.

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

`gate.sh ux` passes (R-PLT-08 included) and every scenario in `gate.sh scenarios` passes.

## Decisions log
