---
change: 0008-templates-and-slash-menu
run: 2026-10-17-05
agents: [claude-code/tier-A (single agent; no worker packets)]
result: complete
---

# Run report: Templates and the slash menu

## Execution

| Packet | Run by | Mode | Coordinator ran it |
| --- | --- | --- | --- |
| P01 spec, steps, `@quire/vault` templates, web templates and slash menu, demo | single agent, tier A | sequential | yes: one capability (vault); budget pacing (`modules/handoff`) |

## Usage

One slice; tokens not reported per slice (`usage/ledger.csv`, scope `change`, source
`unknown`).

## Summary

- **Templates (R-VLT-13).** `@quire/vault` gains three pure helpers:
  - `formatDate` (tokens `YYYY YY MM DD HH mm ss`);
  - `expandTemplate` (`{{title}}`, `{{date}}`, `{{time}}`, `{{date:FORMAT}}`,
    `{{time:FORMAT}}`);
  - `insertTemplate`. It merges the template's properties through `setProperty`: missing
    keys are added, lists are joined, and the note's own values are kept. The body goes in
    at the cursor, or at the start of the body when the cursor is inside the front matter.

  In the web app, `vault/templates/` holds:
  - the folder setting (`templateFolder`, default `templates/`, with a field in Settings);
  - a fuzzy `TemplatePicker`;
  - `apply.ts`, which inserts as one editor transaction. App loads it on first use, so the
    editor helpers stay out of the first load.
- **New note from template (R-VLT-14).** Creates `Untitled.md` at the vault root, like
  "New note", and opens it.
- **Slash menu (R-VLT-15).** `vault/slash/` is a CodeMirror completion source
  (`@codemirror/autocomplete` 6.20.3, released 2026-06-03).
  - **When it opens.** `/` at the start of a line or after whitespace, outside code nodes.
  - **What it offers.** Eleven Markdown inserts plus the "Insert template" and "Insert
    attachment" commands.
  - **Mid-line.** A block insert chosen mid-line starts a new line.
  - **Accessible name.** The list is named "Insert".
- **Demo.** The seed gains `templates/Meeting.md`, and the walkthrough gains section 8.
- **Feature matrix.** The slash menu and templates move from defer to adopt (0008).

## I have some questions, but I proceeded with these recommendations

| # | Question | What I did | Confidence | To reverse |
| --- | --- | --- | --- | --- |
| D-0008-1 | Build the menu or use CodeMirror's autocomplete? | Autocomplete. It brings a listbox with options, keyboard handling, fuzzy filtering and the 75 ms guard against accepting an unseen menu, for about 14 kB gzip (minified) in the editor chunk | high | own tooltip in `vault/slash/` |
| D-0008-2 | Where does "New note from template" put the note? | The vault root, as "New note" does, so a note never lands in the templates folder by accident | med | `newNoteFromTemplate` in `vault/templates/apply.ts` |
| D-0008-3 | Which slash entries? | Markdown inserts plus the two insert commands. Notion's actions (`/delete`, `/duplicate`) and colours are not Markdown (feature matrix) | high | `INSERTS` and `COMMANDS` in `slash-menu.ts` |
| D-0008-4 | Property merge for a key both have with different scalars | The note's value wins (Obsidian keeps the note's) | high | `insertTemplate` |

## Blocked or skipped

Nothing blocked.

## Verification

| Gate | Result |
| --- | --- |
| check | green: 0 violations, 1 warning (`workspace.ts`, unchanged) |
| new scenarios before the code | 4 of 6 failed. The 2 guards ("Escape keeps the text", "Not inside a word") passed with no menu, as they should; once the menu existed, "Escape keeps the text" also checks that the menu was open first |
| scenarios | 142 passed (3.3m) |
| R-PLT-07 first-load budget | passes. The first build failed it: `App.tsx` imported the template helpers, which pulled CodeMirror into the first load (391 kB). `loadTemplateActions` loads them on first use |
| ux | VERIFY |

## Playbook friction

Two things cost a rerun each:

1. **Stale generated tests.** The generated tests did not request the `world` fixture for
   steps in a new file. `bddgen` had run before the file existed, so the steps were
   undefined at run time. Run `pnpm generate` after adding a steps file.
2. **CodeMirror's interaction delay.** The menu ignores Enter for 75 ms after it opens.
   The "offers" step waits past that, as a person would.

Both are runner mechanics, not playbook rules.

## Spec drift

None: three ADDED requirements; no existing scenario changed.
