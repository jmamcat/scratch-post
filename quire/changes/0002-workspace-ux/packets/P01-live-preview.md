---
id: 0002-workspace-ux/P01
title: Live Preview editing mode in CodeMirror
lane: A
depends_on: [P00]
owns:
  - quire/apps/web/src/vault/live-preview/**
  - quire/scenarios/steps/live-preview.steps.ts
borrows:
  - quire/apps/web/src/vault/editor-setup.ts  # only if a base style must change for Live Preview; prefer your own CSS
reads:
  - quire/changes/0002-workspace-ux/**
  - quire/spec/STEPS.md
  - quire/apps/web/src/vault/Editor.tsx
  - quire/apps/web/src/**
  - quire/scenarios/support/**
  - references/obsidian/product/features.md
size: M
revision: 1
status: todo
---

# Live Preview editing mode

## Context

Implements R-RND-08 (Live Preview) and the Live Preview half of R-RND-09 (clickable task
checkboxes in the editor). Spec: `quire/changes/0002-workspace-ux/spec/render/spec.md`.
Obsidian's Live Preview (OBS-F-001) is the baseline: Markdown renders while you edit, and
the raw markup shows only on lines that hold the cursor or a selection.

The editor already calls your extension: `apps/web/src/vault/Editor.tsx` puts
`livePreview({ onOpenLink })` in a compartment when the editing mode is `live` (the
default) and removes it in source mode. The command "Toggle Live Preview/Source mode"
switches modes. You only write `vault/live-preview/`.

## Contract

```ts
// apps/web/src/vault/live-preview/index.ts (keep this signature)
export interface LivePreviewOptions {
  onOpenLink: (target: string, heading?: string) => void; // wikilink or markdown link target
}
export function livePreview(opts: LivePreviewOptions): Extension;
```

Behaviour, on every line that does NOT contain the main cursor or a selection:

| Markdown | Shows |
| --- | --- |
| `# `..`###### ` heading marks | hidden; line styled as the heading level (class `cm-lp-h1`..`cm-lp-h6`) |
| `**bold**`, `__bold__`, `*em*`, `_em_`, `~~del~~`, `==mark==`, `` `code` `` | marks hidden; text styled (`cm-lp-strong`, `cm-lp-em`, `cm-lp-del`, `cm-lp-mark`, `cm-lp-code`) |
| `[[target|alias]]`, `[[target]]`, `[text](url)` | brackets and target hidden, label shown as a link (`cm-lp-link`); click calls `onOpenLink` (wikilinks) or opens http(s) URLs in a new tab |
| `- [ ] ` / `- [x] ` task markers | the `[ ]`/`[x]` replaced by an `<input type="checkbox">` widget inside the line; clicking it toggles the character in the document with a normal CodeMirror transaction (so live rooms and sync see it) |
| `> [!type] Title` callout first line | `cm-lp-callout` line class plus `data-callout` via line decoration (no hiding needed) |
| front matter block at the top | dimmed (`cm-lp-frontmatter`) |

Use the Markdown syntax tree from `@codemirror/lang-markdown` (`syntaxTree(state)`) where
it identifies nodes (HeaderMark, EmphasisMark, CodeMark, Link, URL...); use small regular
expressions for Obsidian syntax the tree does not know (wikilinks, `==mark==`, tasks).
Compute decorations only for the visible ranges (`view.visibleRanges`). Put styles in
`vault/live-preview/live-preview.css` imported from your module, using the theme variables
already in `apps/web/src/styles.css` (`--text-accent`, `--text-muted`, etc.).

Scenario steps you implement in `quire/scenarios/steps/live-preview.steps.ts` (use
`appDevice(world, name)` from `quire/scenarios/support/app.ts`; `device.page`,
`device.editor()`):

- `"d" puts the cursor on the line "text"`: click at the end of the `.cm-line` with that
  text (match on the line's raw or rendered text) so the cursor sits there.
- `the editor on "d" shows "t" as a heading without "#"`: some `.cm-line` with class
  `cm-lp-h1`..`h6` has text `t` and contains no `#`.
- `the editor on "d" shows "t" in bold without "**"`: an element `.cm-lp-strong` has text
  `t` and the containing line's text has no `**`.
- `the editor on "d" shows the text "t"`: some `.cm-line`'s text contains `t` exactly.

`"d" clicks the task "label"` already exists (steps/sidebar.steps.ts) and clicks the
`input[type=checkbox]` inside the `.cm-line` that contains the label.

## Acceptance

```sh
export QUIRE_WEB_DIST=/tmp/quire-web-P01
pnpm -C quire --filter @quire/web exec vite build --outDir "$QUIRE_WEB_DIST" --emptyOutDir
pnpm -C quire --filter @quire/web typecheck
playbook/bin/gate.sh scenarios "@R-RND-08|@R-RND-09"
```

All 5 scenarios pass (R-RND-09's reading-view scenario is already implemented by P00).

## Decisions log
