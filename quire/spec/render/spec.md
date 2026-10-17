---
capability: render
prefix: RND
---

# Rendering

How Markdown is turned into the reading view. The dialect is Obsidian Flavored Markdown
(OFM): CommonMark plus GFM plus the Obsidian extensions listed here. The many small rules
are pinned by an approved gallery of notes and their rendered output
(`quire/scenarios/approved/render/`); the scenarios below check what a reader sees.

## Requirements

### Requirement R-RND-00: Approved rendering gallery

The system SHALL render every note in the approved gallery exactly as approved; intentional changes are re-approved with `pnpm -C quire scenarios:approve`.

#### Scenario: Gallery matches

- **THEN** every note in the rendering gallery renders as approved

### Requirement R-RND-01: CommonMark and GFM

The system SHALL render CommonMark plus GFM tables, strikethrough, autolinks and task lists (`- [ ]`, `- [x]`).

Layer: ui

#### Scenario: Task list

- **GIVEN** a cloud server
- **AND** device `pixel`
- **WHEN** `pixel` has `t.md` reading `- [x] done\n- [ ] todo\n`
- **AND** `pixel` opens `t.md` in reading view
- **THEN** the reading view on `pixel` shows a checked task `done`
- **AND** the reading view on `pixel` shows an unchecked task `todo`

### Requirement R-RND-02: Wikilinks

The system SHALL render `[[target]]`, `[[target|alias]]`, `[[target#heading]]` and `[[target#^block]]` as internal links, resolved with the rules in R-NAV-02, and SHALL mark links whose target does not exist as unresolved.

Layer: ui

Grounding: OBS-F-004, OBS-F-006, OBS-F-007, OBS-F-047

#### Scenario: Alias

- **GIVEN** a cloud server
- **AND** device `pixel`
- **WHEN** `pixel` has `Projects/Alpha.md` reading `# Alpha\n`
- **AND** `pixel` has `index.md` reading `see [[Alpha|the project]]\n`
- **AND** `pixel` opens `index.md` in reading view
- **THEN** the reading view on `pixel` shows a link `the project` to `Projects/Alpha.md`

#### Scenario: Unresolved

- **GIVEN** a cloud server
- **AND** device `pixel`
- **WHEN** `pixel` has `index.md` reading `[[Nowhere]]\n`
- **AND** `pixel` opens `index.md` in reading view
- **THEN** the reading view on `pixel` shows an unresolved link `Nowhere`

### Requirement R-RND-03: Embeds

The system SHALL render `![[file.png]]` (and other image extensions) as an image, and `![[note]]` as an embed block that links to the note; full transclusion is deferred.

Layer: ui

#### Scenario: Image and note embeds

- **GIVEN** a cloud server
- **AND** device `pixel`
- **WHEN** `pixel` has `other.md` reading `# Other\n`
- **AND** `pixel` has `e.md` reading `![[diagram.png]]\n\n![[other]]\n`
- **AND** `pixel` opens `e.md` in reading view
- **THEN** the reading view on `pixel` shows an image `diagram.png`
- **AND** the reading view on `pixel` shows an embed of `other.md`

### Requirement R-RND-04: Callouts

The system SHALL render a blockquote starting `> [!type] Optional title` as a callout of that type, and `> [!type]-` / `> [!type]+` as a collapsible callout (collapsed / expanded by default).

Layer: ui

Grounding: OBS-F-012 (baseline), CNF-F-013, CNF-F-014, NOT-F-006, NOT-F-008

#### Scenario: Foldable

- **GIVEN** a cloud server
- **AND** device `pixel`
- **WHEN** `pixel` has `c.md` reading `> [!tip]- Hidden\n> body\n\n> [!note]+ Shown\n> text\n`
- **AND** `pixel` opens `c.md` in reading view
- **THEN** the reading view on `pixel` shows a collapsed callout titled `Hidden`
- **AND** the reading view on `pixel` shows an expanded callout titled `Shown`

### Requirement R-RND-05: Inline extensions

The system SHALL render `==highlight==` as a highlight, `#tag` and `#nested/tag` as tag links, footnotes `[^1]` with their definitions, and SHALL omit `%%comment%%` text from the output.

Layer: ui

#### Scenario: Highlights, tags, footnotes, comments

- **GIVEN** a cloud server
- **AND** device `pixel`
- **WHEN** `pixel` has `i.md` reading `==bright== #idea/raw text[^1] %%secret%%\n\n[^1]: the note\n`
- **AND** `pixel` opens `i.md` in reading view
- **THEN** the reading view on `pixel` shows highlighted `bright`
- **AND** the reading view on `pixel` shows the tag `idea/raw`
- **AND** the reading view on `pixel` shows a footnote
- **AND** the reading view on `pixel` does not show `secret`

### Requirement R-RND-06: Safe output

The system SHALL escape raw HTML in Markdown rather than render it, so rendered notes cannot run scripts.

Layer: ui

#### Scenario: Script

- **GIVEN** a cloud server
- **AND** device `pixel`
- **WHEN** `pixel` has `x.md` reading `<script>window.pwned = 1</script>\n`
- **AND** `pixel` opens `x.md` in reading view
- **THEN** the reading view on `pixel` shows the text `<script>window.pwned = 1</script>`

### Requirement R-RND-07: Front matter is not body content

The system SHALL exclude a leading YAML front matter block from the rendered body and expose it as properties.

Layer: ui

Grounding: OBS-F-100, OBS-F-105

#### Scenario: Properties, not text

- **GIVEN** a cloud server
- **AND** device `pixel`
- **WHEN** `pixel` has `f.md` reading `---\nstatus: draft\n---\n# Body\n`
- **AND** `pixel` opens `f.md` in reading view
- **THEN** the reading view on `pixel` does not show `status: draft`
- **AND** the properties pane on `pixel` shows `status` as `draft`

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
