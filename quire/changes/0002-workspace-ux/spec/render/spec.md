---
capability: render
prefix: RND
---

# Rendering

## ADDED Requirements

### Requirement R-RND-08: Live Preview

The client SHALL offer a Live Preview editing mode, the default, in which Markdown renders while editing: heading marks, emphasis marks, link brackets and task markers are hidden and styled on every line except those holding the cursor or a selection, where the raw Markdown shows. Source mode and the reading view remain available.

Layer: ui

Grounding: OBS-F-001, OBS-F-211 (Live Preview is Obsidian's default editing mode)

#### Scenario: Markup hides away from the cursor

- **GIVEN** a cloud server
- **AND** device `pixel`
- **AND** `pixel` has `lp.md` reading `# Title\n\nSome **bold** words\n\nlast line\n`
- **WHEN** `pixel` opens `lp.md`
- **AND** `pixel` puts the cursor on the line `last line`
- **THEN** the editor on `pixel` shows `Title` as a heading without `#`
- **AND** the editor on `pixel` shows `bold` in bold without `**`

#### Scenario: Markup returns on the cursor line

- **GIVEN** a cloud server
- **AND** device `pixel`
- **AND** `pixel` has `lp.md` reading `# Title\n\nSome **bold** words\n`
- **WHEN** `pixel` opens `lp.md`
- **AND** `pixel` puts the cursor on the line `Some **bold** words`
- **THEN** the editor on `pixel` shows the text `Some **bold** words`

#### Scenario: Source mode keeps all markup

- **GIVEN** a cloud server
- **AND** device `pixel`
- **AND** `pixel` has `lp.md` reading `# Title\n\nlast line\n`
- **WHEN** `pixel` runs the command `Toggle Live Preview/Source mode`
- **AND** `pixel` opens `lp.md`
- **AND** `pixel` puts the cursor on the line `last line`
- **THEN** the editor on `pixel` shows the text `# Title`

### Requirement R-RND-09: Interactive tasks

The client SHALL toggle a task when its checkbox is clicked in the reading view or in Live Preview, writing `[x]` or `[ ]` into the note's Markdown.

Layer: ui

Grounding: OBS-F-016, NOT-F-005, CNF-F-009

#### Scenario: Check a task in the reading view

- **GIVEN** a cloud server
- **AND** device `pixel`
- **AND** `pixel` has `todo.md` reading `- [ ] buy milk\n- [x] pay rent\n`
- **WHEN** `pixel` opens `todo.md` in reading view
- **AND** `pixel` clicks the task `buy milk`
- **THEN** `todo.md` on `pixel` reads `- [x] buy milk\n- [x] pay rent\n`

#### Scenario: Uncheck a task in Live Preview

- **GIVEN** a cloud server
- **AND** device `pixel`
- **AND** `pixel` has `todo.md` reading `- [ ] buy milk\n- [x] pay rent\n`
- **WHEN** `pixel` opens `todo.md`
- **AND** `pixel` clicks the task `pay rent`
- **THEN** `todo.md` on `pixel` reads `- [ ] buy milk\n- [ ] pay rent\n`
