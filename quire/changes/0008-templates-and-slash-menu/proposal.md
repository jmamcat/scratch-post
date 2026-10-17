---
id: 0008-templates-and-slash-menu
play: add-feature
status: proposed
created: 2026-10-17
references: [obsidian, notion, confluence]
capabilities: [vault]
---

# Templates and the slash menu

## Why

The feature matrix marks the slash menu "top Notion parity item for the next change", and
templates with variables are deferred until now. The owner picked both as the next
features after 0.1.0.

## Headline scenarios

- Insert a template: variables filled in, properties merged into the note (R-VLT-13).
- New note from a template (R-VLT-14).
- `/task` then Enter turns into a task item; Escape keeps the typed text; `and/or` never
  opens the menu (R-VLT-15).

## What changes

- **vault**, three ADDED requirements:
  - **R-VLT-13, Templates.** Ordinary notes in a templates folder (`templates/` by default,
    a setting), grounded in OBS-F-084, NOT-F-080 and CNF-F-081, CNF-F-084.
    - Variables: `{{title}}`, `{{date}}`, `{{time}}`, and `{{date:FORMAT}}` /
      `{{time:FORMAT}}` with the tokens `YYYY`, `YY`, `MM`, `DD`, `HH`, `mm`, `ss`.
    - Properties merge into the note's front matter.
  - **R-VLT-14, New note from template.** Creates an untitled note at the vault root,
    as "New note" does (NOT-F-080, CNF-F-085).
  - **R-VLT-15, Slash menu.** `/` at the start of a line or after whitespace, outside code
    (OBS-F-080, NOT-F-029, CNF-F-003). It holds the block inserts plus "Insert template" and
    "Insert attachment".
- Code:
  - `@quire/vault` gains `expandTemplate`, `formatDate` and `insertTemplate`.
  - The web app gains `vault/templates/` (picker, folder setting) and `vault/slash/`
    (a CodeMirror completion source).
  - New commands: "Insert template" and "New note from template".

## Out of scope

Prompted custom variables (CNF-F-084 "partial"), template previews in the picker, Notion's
action and colour commands in the slash menu (`/delete`, `/red`), daily note templates.
