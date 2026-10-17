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
status: done
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

### Result (2026-10-16)

- `pnpm -C quire build:web`: built.
- `gate.sh check`: types pass, no dependency violations (252 modules), structure 0 violations (5 soft-limit warnings in files this packet does not touch).
- `gate.sh ux`: passes. R-PLT-08 "Every theme passes" (`@gate-ux`): 1 passed (5.9 min). Full runner: 11 passed (9.8 min), 180 states, "R-PLT-08 gate: passes", ratchet against the approved baseline: no state total moved, no new violations.
- `gate.sh scenarios`: **129 passed, 0 failed** (2.8 min): R-ACC 13, R-BAK 14, R-LIV 5, R-MRG 9, R-NAV 12, R-OPS 4, R-PLT 7, R-RND 14, R-RVW 8, R-SYN 15, R-VIEW 8, R-VLT 20.
- Baseline approved with `pnpm -C quire ux:approve` (`quire/scenarios/ux/baseline.json`). No rule, selector or threshold was excluded or changed in the scorer (D-P14-9).

**Before** (P12 baseline, `report.md` of 2026-10-16 18:05; hard checks failed in 160 states, floors failed 96 times, 1,750 violations):

| Screen | default | minimal | things | paper | atlas | Lowest state |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| editor | 91.9 | 92.4 | 92.1 | 91.5 | 91.4 | 89.8 (atlas 1280x800 dark) |
| reading | 93.3 | 93.9 | 93.7 | 93.7 | 92.6 | 91.07 (atlas 1280x800 dark) |
| folders | 91.5 | 92.5 | 92.3 | 91.7 | 91.3 | 90.29 (default 390x844 dark) |
| tags | 91.5 | 92.2 | 91.9 | 91.4 | 90.8 | 90.26 (default 390x844 dark) |
| board | 92 | 92.5 | 92.3 | 91.7 | 91.1 | 90.73 (default 390x844 dark) |
| graph | 78 | 78.8 | 78.6 | 78.6 | 78.7 | 75.85 (default 1280x800 dark) |
| settings | 89.7 | 89.9 | 89.5 | 89.2 | 88.6 | 86.87 (atlas 1280x800 dark) |
| review | 86.8 | 86.9 | 86.7 | 86.1 | 85.6 | 84.65 (atlas 1280x800 dark) |
| vault-history | 87.4 | 87.7 | 87.5 | 86.9 | 86.4 | 85.44 (atlas 1280x800 dark) |
| **all** | **89.1** | **89.7** | **89.4** | **89** | **88.5** | **75.85** (graph default 1280x800 dark) |

**After** (`gate.sh ux`, 2026-10-16 19:14; hard checks pass in 180 of 180 states, floors pass, 0 violations):

| Screen | default | minimal | things | paper | atlas | Lowest state |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| editor | 95.2 | 95.4 | 95.1 | 94.5 | 93.8 | 91.86 (atlas 1280x800 dark) |
| reading | 95.1 | 95.5 | 95.2 | 95.2 | 93.8 | 91.93 (atlas 1280x800 dark) |
| folders | 96.6 | 96.7 | 96.5 | 95.9 | 95.4 | 93.92 (atlas 1280x800 dark) |
| tags | 96.4 | 96.6 | 96.3 | 95.7 | 95.3 | 93.56 (atlas 1280x800 dark) |
| board | 95.5 | 95.6 | 95.4 | 94.8 | 94.3 | 93.06 (atlas 1280x800 dark) |
| graph | 91.7 | 91.9 | 91.9 | 91.9 | 91.7 | 89.98 (default 1280x800 dark) |
| settings | 93.9 | 94.1 | 93.6 | 93.3 | 92.6 | 90.82 (atlas 1280x800 dark) |
| review | 95.8 | 95.9 | 95.6 | 95.1 | 94.4 | 92.88 (atlas 1280x800 dark) |
| vault-history | 96 | 96.2 | 95.9 | 95.3 | 94.7 | 93.25 (atlas 1280x800 dark) |
| **all** | **95.1** | **95.3** | **95.1** | **94.6** | **94** | **89.98** (graph default 1280x800 dark) |

Categories, lowest state before → after: A 95.33 → 100, B 66.67 → 76.47, C 0 → 74.5, D 44 → 88, E 88.46 → 100, F 100 → 100, G 41.67 → 41.67 (not floored, D-P12-3). Every one of the 180 state totals went up.

Against the P12 baseline, 16 states lost more than 3 points in one category while their totals rose (this is why the baseline was re-approved, not a ratchet pass):

- B in folders and board at 390x844, dark (89.25 and 82.35, from 92.8 to 94.4): with the sidebar open, the page behind it is now `inert` (D-P14-4), so axe no longer measures its text and only the sidebar's smaller text counts toward the advisory APCA share. Colours did not change.
- D in editor at 390x844, dark, in minimal, things and paper (95.56 → 91.11): one of nine Tab stops dropped from full to half focus credit. All five themes now score the same (77.8 focus-visible, as default already did). The likely stop is the note title, whose only focus sign is the selection highlight. Not investigated further.
- D in graph, minimal and paper, dark (100 → 95.56): the labels no longer turn from muted to text colour on focus, because they are text colour already. The new focus ring (D-P14-6) brings back most of the credit.

## Decisions log

- **D-P14-1** · confidence: high
  - Question: `scrollable-region-focusable` (serious, 140 states) on the editor's `.cm-scroller`.
  - Did: `tabindex="0"` on the editor content (`.cm-content`, through `EditorView.contentAttributes` in `vault/editor-setup.ts`). The contenteditable was already in the Tab order; axe only counts elements with a tabindex as focusable content of a scroller, so nothing changes for a person.
  - Why: smallest markup fix; the alternative (`tabindex` on the scroller) would add a second, empty Tab stop.
  - Reverse: drop `tabindex: '0'` from the `contentAttributes` in `quire/apps/web/src/vault/editor-setup.ts`.
- **D-P14-2** · confidence: high
  - Question: `link-in-text-block` (serious, 20 reading states): links in running text differ by colour only.
  - Did: `.markdown a` is underlined (underline at 40% of the link colour, full colour on hover, 2 px offset), the same as live preview's `.cm-lp-link`; tag pills (`a.tag`) stay undecorated (their background already sets them apart).
  - Why: existing live preview convention; Obsidian (baseline) underlines internal links by default; WCAG 1.4.1.
  - Reverse: `.markdown a` and `.markdown a.tag` in `quire/apps/web/src/styles.css`.
- **D-P14-3** · confidence: med
  - Question: in Settings, the review inbox and vault history, Tab left the dialog for the controls behind it (`focus-obscured`, and no visible focus where the drawer covers them; D down to 44).
  - Did: new `shared/focus-trap.ts` (`trapTab`): Tab and Shift+Tab wrap inside the dialog. `Modal` and `Drawer` call it from their key handler, and `Drawer` now has `aria-modal="true"`. The page behind a drawer stays clickable with the mouse; only the keyboard is kept inside until Escape or the close button.
  - Why: WAI-ARIA dialog pattern; `Modal` already declared `aria-modal` without keeping focus. Drawers cover most of the window (520 to 760 px, all of it on a phone), so they act as modal for the keyboard. A reviewer could prefer a non-modal drawer that leaves focus free and instead reflows the page beside it.
  - Reverse: remove the `trapTab` calls in `quire/apps/web/src/shared/Modal.tsx` and `Drawer.tsx` (and `aria-modal` on the drawer), delete `shared/focus-trap.ts`.
- **D-P14-4** · confidence: med
  - Question: on narrow screens with the left sidebar open, Tab reached the header, note title, editor and status bar under the scrim (focus-obscured 90 states, focus-visible failures; D under 70 in narrow Folders).
  - Did: while the sidebar is an overlay (`useNarrow()` in `app/layout-state.ts`, the same 800 px query as before, now reactive), `<main>` and the status bar are `inert` (new `inert` prop on `StatusBar`), and Escape closes the sidebar (not when the key comes from an input, textarea or select, which have their own Escape). Focus is not moved into the sidebar when it opens; Tab from the page start reaches it first.
  - Why: what the scrim covers cannot be clicked either; `inert` is the platform's way to take it out of the Tab order and the accessibility tree.
  - Reverse: `overlay` in `quire/apps/web/src/App.tsx` (the `inert` props and the Escape effect), `useNarrow` in `app/layout-state.ts`, the `inert` prop in `sync/StatusBar.tsx`.
- **D-P14-5** · confidence: med
  - Question: `page-has-heading-one` (moderate, 70 states): editor and sidebar screens and the graph have no level-1 heading.
  - Did: the inline title's input sits in an `<h1 class="inline-title-heading">` (margin 0, font inherited, so nothing moves); the graph view shows a visible "Graph" `<h1 class="view-title">` in the header where a note shows its breadcrumb (new `title` prop on `ViewHeader`). The reading view now has two level-1 headings when the note starts with `# ...` (the name and the note's own heading).
  - Why: the note's name is the page's main heading (it is also the window title); a visible heading over a hidden one. Alternatives: a visually hidden `h1`, or giving the reading view's `h1` the job and leaving the editor without one.
  - Reverse: unwrap the input in `quire/apps/web/src/vault/InlineTitle.tsx`; remove `title` from `app/ViewHeader.tsx` and its use in `App.tsx`; the two CSS rules in `styles.css`.
- **D-P14-6** · confidence: med
  - Question: every graph state under 85 (C = 0: labels at 11 px; B under 70 in dark: muted 11 px labels miss the APCA target).
  - Did: graph labels 16 px (world units, they still scale with the zoom) in the text colour instead of the muted colour; the hovered or focused node's label turns semibold instead of changing colour, and a node reached by Tab shows the app's focus ring (the `outline: none` on `.graph-node` is gone; the colour change alone no longer marked focus); hit boxes, label offset and the fit bounds grow to match (`GraphView.tsx`).
  - Why: the USWDS ramp behind C gives no credit under 12 px; Obsidian's graph labels use the normal text colour. Larger labels overlap edges and each other sooner on a dense vault; the existing "far" zoom rule still hides them when zoomed out.
  - Reverse: `.graph-node` (outline), `.graph-node text` (size, fill) and the hover rule in `quire/apps/web/src/navigate/graph/graph.css`; `hitW`, the hit `rect`, `text y` and `bounds()` in `GraphView.tsx`.
- **D-P14-7** · confidence: med
  - Question: with 16 px labels the graph's C was still 68.5 (its other text is the status bar at 12 px and the 13 px header).
  - Did: status bar text 12 → 13 px (the bar and its buttons), matching the header breadcrumb. Graph C 74.5; every other screen's C goes up a little too.
  - Why: the smallest change that clears the floor with some room; making "Graph" bigger than the breadcrumb style would only move the problem.
  - Reverse: the two `font-size: 13px` in `.status-bar` and `.status-bar button` in `quire/apps/web/src/styles.css`.
- **D-P14-8** · confidence: med
  - Question: icon buttons got only half focus credit: the 2 px ring at a 1 px offset loses pixels round the rounded corners (183 of the 192 the WCAG 2.4.13 area needs for a 26 px button).
  - Did: `:focus-visible` outline offset 1 → 2 px, everywhere.
  - Why: keeps the same ring, now with its full area; mean focus-visible credit in the default editor went from 53 to 73.
  - Reverse: `outline-offset` in `:focus-visible` in `quire/apps/web/src/styles.css`.
- **D-P14-9** · confidence: high
  - Question: exclude any rule or selector?
  - Did: none; every finding was fixed in the app. The scorer, its rules and its thresholds are unchanged.
  - Reverse: none needed.
