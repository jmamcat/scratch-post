---
capability: vault
prefix: VLT
---

# Vault storage

## ADDED Requirements

### Requirement R-VLT-13: Templates

The command "Insert template" SHALL list the notes in the templates folder (`templates/` by default, a setting) and insert the chosen one at the cursor. Before inserting, `{{title}}` SHALL become the note's title, `{{date}}` the current date as `YYYY-MM-DD`, `{{time}}` the current time as `HH:mm`, and `{{date:FORMAT}}` or `{{time:FORMAT}}` the current date and time in that format (tokens `YYYY`, `YY`, `MM`, `DD`, `HH`, `mm`, `ss`). The template's properties SHALL be merged into the note's: a key the note lacks is added, two lists are joined without duplicates, and otherwise the note keeps its own value.

Layer: ui

Grounding: OBS-F-084, NOT-F-080, CNF-F-081, CNF-F-084

#### Scenario: Insert a template

- **GIVEN** a cloud server
- **AND** device `pixel`
- **AND** the clock on `pixel` reads `2026-03-14 09:30`
- **AND** `pixel` has `templates/Meeting.md` reading `---\ntags: [meeting]\nstatus: draft\n---\n## {{title}}\nOn {{date}} at {{time}}, week of {{date:DD.MM.YYYY}}\n`
- **AND** `pixel` has `Standup.md` reading `---\nstatus: done\n---\n`
- **AND** `pixel` opens `Standup.md`
- **WHEN** `pixel` runs the command `Insert template`
- **AND** `pixel` types `Meeting` and presses Enter
- **THEN** `Standup.md` on `pixel` contains `## Standup\nOn 2026-03-14 at 09:30, week of 14.03.2026\n`
- **AND** the properties pane on `pixel` shows `status` as `done`
- **AND** the properties pane on `pixel` shows `tags` as `meeting`

### Requirement R-VLT-14: New note from a template

The command "New note from template" SHALL create an untitled note at the vault root, as "New note" does, fill it from the chosen template as R-VLT-13 describes, and open it.

Layer: ui

Grounding: NOT-F-080, CNF-F-085

#### Scenario: Note from a template

- **GIVEN** a cloud server
- **AND** device `pixel`
- **AND** the clock on `pixel` reads `2026-03-14 09:30`
- **AND** `pixel` has `templates/Daily.md` reading `# {{title}} on {{date:DD.MM.YYYY}}\n`
- **WHEN** `pixel` runs the command `New note from template`
- **AND** `pixel` types `Daily` and presses Enter
- **THEN** `pixel` sees `Untitled.md` open
- **AND** `Untitled.md` on `pixel` reads `# Untitled on 14.03.2026\n`

### Requirement R-VLT-15: Slash menu

Typing `/` in the editor at the start of a line or after whitespace, outside code, SHALL open a menu of inserts filtered by what follows the `/`: Heading 1 to 3, Bulleted list, Numbered list, Task, Quote, Code block, Callout, Table, Divider, and the commands "Insert template" and "Insert attachment". Enter or a click SHALL replace the `/` and the filter with the chosen Markdown, or run the chosen command; Escape SHALL close the menu and keep the typed text.

Layer: ui

Grounding: OBS-F-080, NOT-F-029, CNF-F-003

#### Scenario: Slash inserts a task

- **GIVEN** a cloud server
- **AND** device `pixel`
- **AND** `pixel` has `Todo.md` reading `Plan\n`
- **WHEN** `pixel` types `/task` in `Todo.md`
- **AND** the slash menu on `pixel` offers `Task`
- **AND** `pixel` presses `Enter`
- **AND** `pixel` types `ship it` in `Todo.md`
- **THEN** `Todo.md` on `pixel` reads `Plan\n- [ ] ship it`

#### Scenario: Escape keeps the text

- **GIVEN** a cloud server
- **AND** device `pixel`
- **AND** `pixel` has `Todo.md` reading `Plan\n`
- **WHEN** `pixel` types `/tas` in `Todo.md`
- **AND** the slash menu on `pixel` offers `Task`
- **AND** `pixel` presses `Escape`
- **THEN** the slash menu on `pixel` is closed
- **AND** `Todo.md` on `pixel` reads `Plan\n/tas`

#### Scenario: Not inside a word

- **GIVEN** a cloud server
- **AND** device `pixel`
- **AND** `pixel` has `Todo.md` reading `Plan\n`
- **WHEN** `pixel` types `and/or` in `Todo.md`
- **THEN** the slash menu on `pixel` is closed
- **AND** `Todo.md` on `pixel` reads `Plan\nand/or`

#### Scenario: Slash runs a command

- **GIVEN** a cloud server
- **AND** device `pixel`
- **AND** `pixel` has `templates/Meeting.md` reading `## {{title}}\n`
- **AND** `pixel` has `Standup.md` reading `Notes\n`
- **WHEN** `pixel` types `/template` in `Standup.md`
- **AND** the slash menu on `pixel` offers `Insert template`
- **AND** `pixel` presses `Enter`
- **AND** `pixel` types `Meeting` and presses Enter
- **THEN** `Standup.md` on `pixel` reads `Notes\n## Standup\n`
