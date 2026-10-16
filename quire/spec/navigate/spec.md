---
capability: navigate
prefix: NAV
---

# Navigation

Links, backlinks, tags, search and keyboard navigation. All of it works offline from the
client's local copy.

## Requirements

### Requirement R-NAV-01: Outgoing links and backlinks

The system SHALL list, for the open note, its outgoing links (resolved and unresolved) and every note that links to it (backlinks).

Layer: ui

Grounding: OBS-F-061, OBS-F-072, NOT-F-069

#### Scenario: Backlink appears

- **GIVEN** a cloud server
- **AND** device `pixel`
- **WHEN** `pixel` has `b.md` reading `# B\n`
- **AND** `pixel` has `a.md` reading `see [[b]]\n`
- **AND** `pixel` opens `b.md`
- **THEN** the backlinks pane on `pixel` lists `a.md`

### Requirement R-NAV-02: Link resolution follows Obsidian

The system SHALL resolve a wikilink target by: (1) exact vault path with or without `.md`, (2) path relative to the linking note's folder, (3) case-insensitive match on file name without extension, preferring the shortest path and then alphabetical order when several match.

Layer: ui

Grounding: OBS-F-043, references/obsidian/product/data-model.md (link resolution)

#### Scenario: Shortest path wins

- **GIVEN** a cloud server
- **AND** device `pixel`
- **WHEN** `pixel` has `x/Note.md` reading `short\n`
- **AND** `pixel` has `x/y/Note.md` reading `long\n`
- **AND** `pixel` has `index.md` reading `[[note]]\n`
- **AND** `pixel` opens `index.md` in reading view
- **THEN** the reading view on `pixel` shows a link `note` to `x/Note.md`

### Requirement R-NAV-03: Tags

The system SHALL collect tags from inline `#tag` syntax (letters, digits, `_`, `-`, `/`, not purely numeric) outside code, and from the `tags` front matter property (list or single string), treating `a/b` as nested under `a`.

Layer: ui

#### Scenario: Both sources

- **GIVEN** a cloud server
- **AND** device `pixel`
- **WHEN** `pixel` has `t.md` reading `---\ntags: [work]\n---\nbody #idea/raw and #1984\n`
- **AND** `pixel` opens `t.md` in reading view
- **THEN** the reading view on `pixel` shows the tag `idea/raw`
- **AND** the properties pane on `pixel` shows `tags` as `work`
- **AND** the reading view on `pixel` shows the text `#1984`

### Requirement R-NAV-04: Offline full-text search

The system SHALL search note paths and text from the local store, case-insensitively, returning matching notes ranked with title matches first, each with a short snippet.

Layer: ui

#### Scenario: Title matches first, offline

- **GIVEN** a cloud server
- **AND** device `pixel`
- **AND** `pixel` has `garden.md` reading `notes about plants\n`
- **AND** `pixel` has `misc.md` reading `my garden is small\n`
- **WHEN** `pixel` goes offline
- **AND** `pixel` searches for `GARDEN`
- **THEN** the search results on `pixel` list `garden.md` first

### Requirement R-NAV-05: Quick switcher and command palette

The system SHALL open a quick switcher with Ctrl/Cmd+O that fuzzy-matches note names and can create a note from the query, and a command palette with Ctrl/Cmd+P listing the available commands.

Layer: ui

Grounding: OBS-F-077, OBS-F-065, SB-F-006

#### Scenario: Jump to a note

- **GIVEN** a cloud server
- **AND** device `pixel`
- **AND** `pixel` has `Projects/Alpha.md` reading `# Alpha\n`
- **WHEN** `pixel` presses `Ctrl+O`
- **AND** `pixel` types `alph` and presses Enter
- **THEN** `pixel` sees `Projects/Alpha.md` open

#### Scenario: Create from the switcher

- **GIVEN** a cloud server
- **AND** device `pixel`
- **WHEN** `pixel` presses `Ctrl+O`
- **AND** `pixel` types `Brand new` and presses Enter
- **THEN** `pixel` sees `Brand new.md` open

### Requirement R-NAV-06: Outline

The system SHALL show the open note's headings as an outline that scrolls to the heading when clicked.

Layer: ui

#### Scenario: Headings listed

- **GIVEN** a cloud server
- **AND** device `pixel`
- **WHEN** `pixel` has `o.md` reading `# Top\n\n## Middle\n\ntext\n`
- **AND** `pixel` opens `o.md`
- **THEN** the outline on `pixel` lists `Top`
- **AND** the outline on `pixel` lists `Middle`

### Requirement R-NAV-07: Daily note

The system SHALL provide an "Open today's daily note" command that opens or creates `YYYY-MM-DD.md` in the vault root.

Layer: ui

Grounding: OBS-F-066

#### Scenario: Today's note

- **GIVEN** a cloud server
- **AND** device `pixel`
- **WHEN** `pixel` runs the command `Open today's daily note`
- **THEN** `pixel` sees today's daily note open

### Requirement R-NAV-08: Global graph

The client SHALL show a graph of all notes as nodes and resolved links as edges, laid out by a force simulation, where clicking a node opens the note and unresolved links are not drawn.

Layer: ui

Grounding: OBS-F-070, OBS-F-140

#### Scenario: Links become edges

- **GIVEN** a cloud server
- **AND** device `pixel`
- **AND** `pixel` has `b.md` reading `# B\n`
- **AND** `pixel` has `a.md` reading `see [[b]] and [[nowhere]]\n`
- **WHEN** `pixel` runs the command `Open graph view`
- **THEN** the graph on `pixel` shows a link from `a.md` to `b.md`
- **AND** the graph on `pixel` shows 2 notes

#### Scenario: Click to open

- **GIVEN** a cloud server
- **AND** device `pixel`
- **AND** `pixel` has `b.md` reading `# B\n`
- **WHEN** `pixel` runs the command `Open graph view`
- **AND** `pixel` clicks `b.md` in the graph
- **THEN** `pixel` sees `b.md` open

### Requirement R-NAV-09: Local graph

The client SHALL show, in the right pane, a graph of the open note and the notes within two links of it (in either direction).

Layer: ui

Grounding: OBS-F-141

#### Scenario: Neighbours only

- **GIVEN** a cloud server
- **AND** device `pixel`
- **AND** `pixel` has `c.md` reading `# C\n`
- **AND** `pixel` has `b.md` reading `[[c]]\n`
- **AND** `pixel` has `a.md` reading `[[b]]\n`
- **AND** `pixel` has `far.md` reading `alone\n`
- **WHEN** `pixel` opens `a.md`
- **THEN** the local graph on `pixel` shows `c.md`
- **AND** the local graph on `pixel` does not show `far.md`

### Requirement R-NAV-10: Search operators

The system SHALL support, in search queries, `path:` and `file:` (path or file name contains), `tag:` (note has the tag or a nested tag), `"quoted phrases"`, and `-term` (exclude), combined with AND.

Layer: ui

Grounding: OBS-F-131, OBS-F-132

#### Scenario: Combined operators

- **GIVEN** a cloud server
- **AND** device `pixel`
- **AND** `pixel` has `Projects/alpha.md` reading `#idea big plan\n`
- **AND** `pixel` has `Projects/beta.md` reading `#idea small plan\n`
- **AND** `pixel` has `Notes/gamma.md` reading `#idea big plan\n`
- **WHEN** `pixel` searches for `path:Projects tag:#idea -small "big plan"`
- **THEN** the search results on `pixel` list `Projects/alpha.md` only
