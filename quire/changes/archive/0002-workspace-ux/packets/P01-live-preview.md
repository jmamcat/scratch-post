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
claimed_by: claude-code/tier-A
status: done
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

### Result (2026-10-16, claude-code/tier-A)

- `vite build --outDir /tmp/quire-web-P01`: ok.
- `@quire/web typecheck`: ok. (An earlier run failed only in `vault/properties/PropertiesEditor.tsx`,
  P06's file, while it was in progress; it passed on the final run.)
- `gate.sh scenarios "@R-RND-08|@R-RND-09"`: **5 passed, 0 failed** (@R-RND-08 x3, @R-RND-09 x2).
- Regression sweep, full suite against the same build: 85 passed, 3 failed, none in the editor:
  @R-RND-07 (properties pane, P06), @R-NAV-08 (graph click, P04), @R-VIEW-05 (board move, P03),
  all in packets that were in progress at the time. Sync and merge scenarios that read notes
  with headings and front matter back through the editor DOM pass in Live Preview (see D-P01-1).
- `check-structure.py`: 0 violations; `pnpm deps`: no violations.
- Manual check in a browser: headings, bold, italic, strike-through, highlight, inline code,
  wikilinks (with heading and alias), Markdown links, task checkboxes, callout line and front
  matter render as specified; fenced code stays literal; clicking a wikilink opens the note.

Files: `apps/web/src/vault/live-preview/{index.ts,decorations.ts,widgets.ts,live-preview.css}`,
`scenarios/steps/live-preview.steps.ts`. `editor-setup.ts` (borrowed) was not touched.

Needs from P00: none.

## Decisions log

- **D-P01-1** · confidence: med
  - Question: hidden markup could be removed from the DOM (plain `Decoration.replace`), but the
    scenario driver (`support/browser-device.ts` `editorText`) reads a note back from the editor
    DOM's `textContent`, so every "reads" step on a note with headings, tasks or links would see
    rendered text instead of the Markdown. `support/` is not owned by this packet.
  - Did: hidden markup is replaced by a widget that keeps the raw characters in a
    `display: none` span (`HiddenSource`, and inside `TaskCheckbox`). The editor DOM's text stays
    equal to the note; a person sees only the rendered text. The new Live Preview steps assert on
    `innerText`, which leaves the hidden characters out, so they still test what is shown.
  - Why: simplest reversible option that keeps existing scenarios (sync, merge, R-RND-09
    "reads") valid without editing `support/`; layout and cursor handling are unchanged because the hidden
    ranges are still replace decorations (CodeMirror measures a zero-width widget).
  - Reverse: in `vault/live-preview/widgets.ts` drop the source span (or use
    `Decoration.replace({})`), and change `editorText` in `scenarios/support/browser-device.ts` to
    read the document from CodeMirror (`EditorView.findFromDOM(content).state.doc`) instead of DOM text.
- **D-P01-2** · confidence: med
  - Question: the contract says headings and emphasis are styled on lines without the cursor;
    should the cursor line lose the styling?
  - Did: heading line classes (`cm-lp-hN`) and inline styles (`cm-lp-strong`, `-em`, `-del`,
    `-mark`, `-code`) apply on every line; only the marks are hidden away from the cursor. Links
    (`cm-lp-link`) and checkboxes appear only away from the cursor, so a click on the cursor line
    edits instead of navigating or toggling.
  - Why: Obsidian baseline (OBS-F-001): the active line keeps its heading size and bold text and
    only shows the markup, so lines do not jump when the cursor enters them.
  - Reverse: in `decorations.ts`, move the `out.line(...)` / `out.mark(...)` calls in
    `headingNode`, `inlineNode` and the highlight loop below their `isActive` checks.
- **D-P01-3** · confidence: med
  - Question: the contract replaces only `[ ]`/`[x]`; the list bullet `- ` would still show
    before the checkbox.
  - Did: on task lines away from the cursor the bullet and its space are hidden too, so the line
    shows `[checkbox] label`.
  - Why: Obsidian baseline renders a task as a checkbox without a bullet; matches the reading view.
  - Reverse: remove the `bullet` block in `taskNode` (`decorations.ts`).
- **D-P01-4** · confidence: high
  - Question: tasks via regular expression (as the contract suggests) or via the syntax tree?
  - Did: the tree's GFM `Task`/`TaskMarker` nodes (`markdownLanguage` includes the task list
    extension); regular expressions only for wikilinks and `==highlight==`, skipped inside code,
    front matter, HTML blocks and URLs.
  - Why: the contract prefers the tree where it identifies nodes; the tree also gets nested and
    ordered-list tasks right.
  - Reverse: `taskNode` in `decorations.ts`.
- **D-P01-5** · confidence: med
  - Question: what does a click on a Markdown link with a relative target (`[x](other.md#Part)`) or
    a non-http scheme do?
  - Did: relative targets call `onOpenLink(decodedPath, heading)`, the same as wikilinks; http(s)
    opens a new tab with `noopener`; other schemes (`mailto:`, `obsidian:`) are not intercepted, so
    the click places the cursor and reveals the raw link.
  - Why: contract names wikilinks and http(s) only; `onOpenLink` is documented as taking "wikilink
    or markdown link target". Opening unknown schemes from a note is an outward action best left
    explicit.
  - Reverse: `followLink` in `vault/live-preview/index.ts`.
- **D-P01-6** · confidence: high
  - Question: the contract mentions `--text-accent`, which `styles.css` does not define.
  - Did: used the variables that exist (`--link`, `--accent`, `--accent-soft`, `--mark`,
    `--code-bg`, `--text-muted`, `--text-faint`, `--font-mono`); heading rules use lower specificity
    than `platforms/themes/live-preview-headings.css` so themes override them.
  - Why: existing conventions.
  - Reverse: `vault/live-preview/live-preview.css`.
