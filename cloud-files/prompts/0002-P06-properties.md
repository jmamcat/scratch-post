You are a RefSpec worker. Work autonomously and never stop to ask questions.

Repository root: /home/user/scratch-post
Change folder: quire/changes/0002-workspace-ux
Your packet: quire/changes/0002-workspace-ux/packets/P06-properties.md

Rules (full text in the playbook: core/run-protocol.md and core/decisions.md):
1. Set status: doing and claimed_by: <your harness>/<your model> in the packet front matter.
2. Edit paths matching "owns"; edit "borrows" paths only as narrowly as their reason says.
   You may read "reads" paths. Need any other path? Stop, log a decision record, and ask the
   coordinator (or set status: blocked). Never edit it and explain afterwards.
3. When something is unclear: follow the spec, then existing conventions, then the baseline
   reference, then the simplest reversible option. Log each such call as a decision record.
   Keep the structure rules (modules/structure) if the project has them on.
4. Stop only for destructive actions outside "owns", secrets/credentials/payments, or
   license problems. Then set status: blocked with the reason.
5. Done means every gate in Acceptance passes (playbook/bin/gate.sh), including the named scenarios. Paste a
   short result summary (counts, scenario tags) under Acceptance, then set status: done.
6. Never put model names in code or commit messages.

The packet follows.

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
status: todo
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

## Decisions log
