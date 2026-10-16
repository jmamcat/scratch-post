---
change: 0002-workspace-ux
run: 2026-10-16-01
agents: [claude-code/tier-A (coordinator, P00; workers P01, P04), claude-code/tier-B (workers P02, P03, P05), claude-code/tier-C (workers P06, P07)]
result: complete
---

# Run report: Workspace UX

## Execution

The first mixed-tier run: three model tiers on one harness. Model aliases and tiers are in
`usage/models.yaml`.

| Packet | Run by | Mode | Coordinator ran it |
| --- | --- | --- | --- |
| P00 integration (specs, stubs, wiring, shared steps) | coordinator, tier A | sequential, first | yes (integration packet, owned by the coordinator by design) |
| P01 Live Preview | worker, tier A | parallel with wave 1 and wave 2 | no |
| P02 `@quire/views` and `setProperty` | worker, tier B | wave 1, parallel with P01, P05, P07 | no |
| P05 themes | worker, tier B | wave 1 | no (borrowed `styles.css` heading rules) |
| P07 Changes view, search operators | worker, tier C | wave 1 | partly: blocked on live-room attribution; the coordinator made the fix named in D-P07-1 |
| P03 sidebar views | worker, tier B | wave 2 (after P02), parallel with P04, P06 | no; waited on the `@quire/web` dependency the coordinator added |
| P04 graph | worker, tier A | wave 2 | no |
| P06 properties pane | worker, tier C | wave 2 | partly: blocked on the same dependency; the coordinator added it and reran its gate |
| Verification and report | coordinator | sequential, last | yes; fixed one older step for R-RND-07 (D-C-2) |

## Usage

From `usage/ledger.csv` (`playbook/bin/usage.py report --change 0002-workspace-ux`). Numbers
are the harness's per-worker reports (`source: harness-subagent-report`). The coordinator's
own tokens are not reported per slice and are not included. No credit figures were
available.

| Scope | Model (alias, tier) | Total tokens | Wall minutes | Outcome |
| --- | --- | ---: | ---: | --- |
| P01 | m1 (A) | 136,232 | 21.0 | done, 5/5 |
| P02 | m2 (B) | 89,200 | 2.8 | done, typechecks first pass |
| P03 | m2 (B) | 95,098 | 7.7 | done, 7/7 after the dependency fix |
| P04 | m1 (A) | 119,140 | 11.1 | done, 3/3 (one fix after its first run) |
| P05 | m2 (B) | 98,445 | 4.0 | done, 2/2 first pass |
| P06 | m3 (C) | 129,991 | 4.9 | blocked on the dependency, then 3/3 |
| P07 | m3 (C) | 116,725 | 4.0 | blocked on live attribution, then 8/8 |

| Tier | Packets | Total tokens | Wall minutes |
| --- | ---: | ---: | ---: |
| A | 2 (both M) | 255,372 | 32.1 |
| B | 3 (two M, one S) | 282,743 | 14.5 |
| C | 2 (both S) | 246,716 | 8.9 |

Workers' total for the change: 784,831 tokens across 7 workers. Both tier C packets were
blocked once, each by a coordinator gap rather than by the worker. Both stopped
correctly, logged a decision with the fix, and did not weaken a scenario.

## Summary

- **Live Preview** (P01): one editing mode by default. Headings, emphasis, links,
  checkboxes, callouts and front matter render as you type, and the markup shows again on
  the line being edited. Source mode is still available through a command.
- **Interactive tasks** (P00, P01): checkboxes toggle the Markdown in both reading view and
  Live Preview.
- **Sidebar views** (P02, P03, P07): Folders, Search, Recent, Changes, Domains, Tags,
  Timeline and Board (group by any property, move a card to change the property).
- **Graph** (P02, P04): a global graph at `#/~graph` (Mod+G) and a local graph in the right
  pane at depth 2.
- **Search operators** (P07): `path:`, `file:`, `tag:`, quoted phrases and `-term`.
- **Properties** (P02, P06): editable front matter with typed inputs.
- **Themes** (P05): Default, Minimal, Things, Paper and Atlas, light and dark each, with
  distinct heading styles in both reading view and Live Preview.
- **Live attribution** (coordinator, D-P07-1): live-room commits now name the editing
  device, not `live`.

## I have some questions, but I proceeded with these recommendations

Kindly direct me if any of these were incorrect. Each one is reversible as noted.

| # | Question | What I did | Confidence | To reverse |
| --- | --- | --- | --- | --- |
| D-P03-1 | The Board scenario moves a card to `done` when only `todo` exists. Where do new columns come from? | For `status`, starter columns `todo`, `doing`, `done` are always offered; other keys offer existing columns only. There is no way to name a brand-new column yet. | med | `STARTER_COLUMNS` in `apps/web/src/views/BoardView.tsx` |
| D-P06-3 | Can the Add property form create a list? | No: it infers booleans and numbers, everything else is text. Existing lists can be edited. | low | `inferValue` in `vault/properties/PropertiesEditor.tsx` |
| D-P06-2 | Nested maps and mixed lists in front matter | Shown read-only, so the editor never rewrites their types | med | `kindOf` in `PropertiesEditor.tsx` |
| D-P06-4 | Adding a key that already exists | Overwrites it with no prompt | med | `submit` in `PropertiesEditor.tsx` |
| D-P01-1 | Hidden markup in Live Preview | Stays in the DOM with `display: none`, so the editor's page text equals the note (the scenario harness reads it that way) | med | `widgets.ts`, then read text from CodeMirror's state in `scenarios/support/browser-device.ts` |
| D-P01-2 | Styling on the cursor line | Heading size and emphasis stay; only the marks reappear. Links and checkboxes act only away from the cursor. | med | `vault/live-preview/decorations.ts` |
| D-P07-1 / D-C-1 | Which device does a live-room commit name? | The last connection that edited the room, sent by the client as `device` on join; `live` only when unknown | high | `apps/server/src/live/rooms.ts` |
| D-P07-5 | Negated operators (`-tag:x`) and queries with only negated terms | Negation applies to every operator; only-negated queries return the notes matching none | low | `parseQuery` in `packages/navigate/src/search.ts` |
| D-P07-4 | Does `file:` match with or without `.md`? | With (`file:alpha` and `file:alpha.md` both match) | low | `packages/navigate/src/search.ts` |
| D-P02-1 | Title case for domain labels | First letter of each word upper, rest lower (`game-dev` gives `Game-dev`) | med | `titleCase` in `packages/views/src/domains.ts` |
| D-P02-3 | Board values that differ in case | Merged, first spelling names the column | med | `packages/views/src/board.ts` |
| D-P02-5 | `setProperty` on invalid front matter | Throws; the pane and the board show the message | low | `packages/vault/src/properties.ts` |
| D-P03-2 | A new note with no server time yet in Timeline | Counted as Today | med | `TimelineView.tsx` |
| D-P04-2 | Node size in the local graph | Whole-vault link count, so a note looks the same in both graphs | med | `GraphView.tsx` |
| D-P04-4 | Extra forces beyond the five named | Weak `forceX`/`forceY` and a charge distance cap, so unlinked notes stay in view | med | `force-layout.ts` |
| D-P04-7 | The local graph filling the right pane | A `:has()` rule in `graph.css` removes the pane body's padding | low | `navigate/graph/graph.css` |
| D-P05-2 | Default theme headings | H2 weight 600 and H3 in the link colour, so levels differ by more than size | med | `platforms/themes/default.css` |
| D-P05-5 | Themes beyond headings | Minimal, Things, Paper and Atlas also set their own palettes | low | the theme CSS files |
| D-C-2 | The 0001 step `the properties pane shows "k" as "v"` read the value as text; P06 shows it in an input | The step checks the input's value when there is one, text otherwise. Same claim, not weakened. | high | `scenarios/steps/app.steps.ts` |

Known gap left alone: the Default dark theme's primary button is white on `#8b7cf6`
(3.3:1, below AA). It predates this change (D-P05-6). The four new themes pass.

## Blocked or skipped

Nothing is left blocked. Two packets were blocked during the run and unblocked by the
coordinator (P06 and P03 by the missing dependency, P07 by live attribution).

## Verification

- `pnpm -C quire check`: green (types, dependency rules, structure: 0 violations, 5 soft
  size warnings, all from 0001).
- `pnpm -C quire scenarios`: 88 of 88 passed, twice in a row (66 from 0001, 22 new).
- P01 and P05 also looked at the result in a real browser (screenshots outside git).

## Playbook friction

- **Integration packet missed a consumer dependency.** P00 created `@quire/views` but did
  not add it to `@quire/web`'s `package.json`. Three wave 2 workers hit the same failure; two
  worked around it with scratch aliases outside the repo, and one stopped. Amendment 0006:
  a packet that adds a package also wires it into every consumer named in the proposal.
- **Process cleanup by pattern.** Two workers (P01, P05) ran `pkill -f` patterns that could
  have stopped other workers' servers. Amendment 0006: workers stop only processes they
  started, by PID.
- **Living specs never received deltas.** `quire/spec/` holds only `STEPS.md`; the 0001
  and 0002 deltas are still in their change folders, and neither change is archived. The
  scenario generator reads active changes, so nothing breaks, but the "current truth" is
  spread across change folders. Left for direction: archive both now (a mechanical merge),
  or keep changes active until a release.

## Spec drift

None: every scenario is generated from the 0002 deltas unchanged. D-C-2 changed a step
definition, not a scenario.
