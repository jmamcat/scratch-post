---
id: 0002-workspace-ux/P06
title: Editable properties pane
lane: E
depends_on: [P02]
owns:
  - quire/apps/web/src/vault/properties/**
  - quire/scenarios/steps/properties.steps.ts
borrows: []
reads:
  - quire/changes/0002-workspace-ux/spec/vault/spec.md
  - quire/spec/STEPS.md
  - quire/apps/web/src/navigate/RightPane.tsx
  - quire/apps/web/src/shared/**
  - quire/packages/vault/src/**
  - quire/scenarios/support/**
  - quire/scenarios/steps/app.steps.ts
size: S
revision: 1
status: done
claimed_by: claude-code/tier-C
---

# Editable properties

## Context

Implements R-VLT-07. The right pane's Properties tab already renders
`<PropertiesEditor text={noteText} onChange={(newText) => ...} />`; `onChange` writes the
whole new note text (through the editor, so live editing and sync see it). Replace the
stub body in `apps/web/src/vault/properties/PropertiesEditor.tsx`; keep the props.

## Steps

1. Read the front matter with `splitFrontmatter(text).data` from `@quire/vault`.
2. Show one row per property: key, and an input that matches the value type:
   text (`<input>`), number (`<input type="number">`), checkbox (`<input type="checkbox">`),
   date (`<input type="date">` when the value looks like `YYYY-MM-DD`), list (comma-separated
   text input). Each input has `aria-label` equal to the key.
3. Commit a change when the input loses focus or Enter is pressed: call
   `onChange(setProperty(text, key, value))` (`setProperty` from `@quire/vault`; `null`
   removes the key).
4. Each row has a remove button with `aria-label="Remove <key>"`.
5. Below the rows: an "Add property" button that shows two inputs (`aria-label="Property
   name"` and `aria-label="Property value"`) and an "Add" button; adding calls
   `onChange(setProperty(text, name, value))`.
6. If the front matter is not a YAML map, show "Front matter is not a YAML map." and no
   inputs. Styles in `vault/properties/properties.css`.

## Contract

```ts
export function PropertiesEditor(props: { text: string; onChange: (text: string) => void }): JSX.Element;
// from @quire/vault (written by P02):
export function setProperty(text: string, key: string, value: string | number | boolean | string[] | null): string;
```

DOM: each row `[data-property="<key>"]`.

Steps to implement in `quire/scenarios/steps/properties.steps.ts`. Get the page with
`appDevice(world, name).page` (import from `../support/app.ts`); open the pane with
`await appDevice(world, name).pane('Properties')`:

- `"d" sets the property "k" to "v"`: fill the input labelled `k` with `v`, press Enter.
- `"d" adds the property "k" with "v"`: click "Add property", fill "Property name" and
  "Property value", click "Add".
- `"d" removes the property "k"`: click the button labelled `Remove k`.

Copy the step style from `quire/scenarios/steps/sidebar.steps.ts`.

## Acceptance

```sh
export QUIRE_WEB_DIST=/tmp/quire-web-P06
pnpm -C quire --filter @quire/web exec vite build --outDir "$QUIRE_WEB_DIST" --emptyOutDir
pnpm -C quire --filter @quire/web typecheck
playbook/bin/gate.sh scenarios "@R-VLT-07"
```

All 3 property scenarios pass.

### Results (worker tier-C, not done)

- `@quire/web typecheck`: fails only in P03's in-progress files (`src/views/*`, 13 errors:
  `@quire/views` is not yet a dependency of `@quire/web`). No errors in `vault/properties/`
  or `scenarios/steps/properties.steps.ts`.
- `vite build` into `QUIRE_WEB_DIST`: fails on the same `@quire/views` import (P03). It
  succeeds with a temporary vite config outside the repo that aliases `@quire/views` to
  `packages/views/src/index.ts` (scratch build, see D-P06-9).
- `playbook/bin/gate.sh scenarios "@R-VLT-07"` (its steps run by hand, build skipped):
  3 of 3 passed: `Change a property`, `Add the first property`, `Remove the last property`
  (`@cap-vault @R-VLT-07 @ui`).
- Regression: `@cap-vault` 12 of 12 passed (R-VLT-01 to R-VLT-08).
- `check-structure.py`: 21 modules, 0 violations, 5 S8 warnings (none in these files).

Blocked until P03 lands `@quire/views` in `@quire/web` (dependency, package.json and imports).
Re-run the two failing Acceptance commands after that merge; nothing else changes.

**Unblocked by the coordinator (2026-10-16).** P00 had not added `@quire/views` to
`@quire/web`'s dependencies; the coordinator added it. With the packet's own commands:
vite build to `/tmp/quire-web-P06` passes, `@quire/web` typecheck is clean,
`gate.sh scenarios "@R-VLT-07"` passes 3 of 3.

## Decisions log

- **D-P06-1** · confidence: med
  - Question: when a property is committed.
  - Did: text, number, date and list inputs commit on blur or Enter; a checkbox commits on change (it has no text to commit). A draft equal to the stored value is not written.
  - Why: the packet says blur or Enter; a checkbox has no text, so waiting for blur would not save it.
  - Reverse: `Row` in `apps/web/src/vault/properties/PropertiesEditor.tsx`.
- **D-P06-2** · confidence: med
  - Question: how to show values the pane cannot write back safely (nested maps, lists with numbers or booleans).
  - Did: shown as read-only text (`readonly` kind). Only lists of strings get a comma-separated input.
  - Why: `PropertyValue` allows `string[]` only (P02 contract), so writing an edited list would turn `[1, 2]` into strings and rewrite nested maps.
  - Reverse: `kindOf` in the same file; widening `PropertyValue` in `@quire/vault` would allow more kinds.
- **D-P06-3** · confidence: low
  - Question: what type a property added from the form gets.
  - Did: `true` and `false` become booleans, plain integers and decimals become numbers, anything else (including commas) stays text. The form has no type control, so a list cannot be created from it; existing lists can be edited.
  - Why: the packet defines only two inputs (name and value) and no type control; comma-splitting would break text like `Smith, Jo`.
  - Reverse: `inferValue`; if the user wants lists created here, add a type select or split on commas for a list-like prefix.
- **D-P06-4** · confidence: med
  - Question: adding a key that already exists.
  - Did: overwrites its value (the `setProperty` behaviour), without a prompt.
  - Why: the packet says adding calls `setProperty`; the spec does not ask for a confirmation.
  - Reverse: check `key in data` in `submit` before writing.
- **D-P06-5** · confidence: med
  - Question: what an empty value or an invalid number does.
  - Did: an empty text or date input writes an empty string (the key stays). An empty or non-numeric number input reverts to the stored value without writing.
  - Why: removal is an explicit button (`Remove <key>`), so clearing a field should not delete the key; a number needs a number.
  - Reverse: `valueOf` in the same file.
- **D-P06-6** · confidence: high
  - Question: what the pane shows for a note with no front matter, or with an empty block.
  - Did: "No properties." and the "Add property" button; the first added property creates the block (R-VLT-07).
  - Why: spec R-VLT-07 creates the block on add; scenario "Add the first property".
  - Reverse: none needed.
- **D-P06-7** · confidence: high
  - Question: front matter that is not a YAML map.
  - Did: shows "Front matter is not a YAML map." and no rows; the "Add property" button is also hidden so the pane offers no edits.
  - Why: packet step 6 says "and no inputs"; writing would overwrite the user's hand-written text (P02 D-P02-5).
  - Reverse: the early return in `PropertiesEditor`.
- **D-P06-8** · confidence: high
  - Question: where errors from `setProperty` go.
  - Did: caught in `write` and shown in a `role="alert"` line above the rows. The pane only renders rows for a valid map, so this is a safety net.
  - Why: P02 asks the caller to catch the error and show its message.
  - Reverse: `write`.
- **D-P06-9** · confidence: med
  - Question: how to verify while `@quire/views` is not yet wired into `@quire/web` (P03 in progress).
  - Did: built the web app into the session scratchpad with a temporary vite config outside the repo, aliasing `@quire/views` to `packages/views/src/index.ts`; ran the gate's steps by hand (`scenarios generate`, then playwright with `--grep "@R-VLT-07"`) against that build. No file outside `owns` was changed.
  - Why: the packet's commands fail on P03's files, not on this packet's code; the scenarios exercise the real app.
  - Reverse: nothing to undo; re-run the packet's own Acceptance once P03 lands.
- **D-P06-10** · confidence: high
  - Question: where the packet's build output goes (it names `/tmp/quire-web-P06`).
  - Did: used `QUIRE_WEB_DIST` in the session scratchpad directory.
  - Why: session guidance keeps temporary files out of `/tmp`; the variable only picks the output folder.
  - Reverse: set `QUIRE_WEB_DIST=/tmp/quire-web-P06` as in the packet.
