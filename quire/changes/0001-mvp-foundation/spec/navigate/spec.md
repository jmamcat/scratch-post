---
capability: navigate
prefix: NAV
---

# Navigation

Links, backlinks, tags, search and keyboard navigation. All of it works offline from the
client's local copy.

## ADDED Requirements

### Requirement R-NAV-01: Outgoing links and backlinks

The system SHALL list, for the open note, its outgoing links (resolved and unresolved) and every note that links to it (backlinks).

Grounding: OBS-F-061, OBS-F-072, NOT-F-069

#### Scenario: Backlink appears

- **GIVEN** `a.md` contains `[[b]]`
- **WHEN** the user opens `b.md`
- **THEN** the backlinks pane lists `a.md`

### Requirement R-NAV-02: Link resolution follows Obsidian

The system SHALL resolve a wikilink target by: (1) exact vault path with or without `.md`, (2) path relative to the linking note's folder, (3) case-insensitive match on file name without extension, preferring the shortest path and then alphabetical order when several match.

Grounding: OBS-F-043, references/obsidian/product/data-model.md (link resolution)

#### Scenario: Shortest path wins

- **GIVEN** `x/Note.md` and `x/y/Note.md` exist
- **WHEN** another note links `[[note]]`
- **THEN** it resolves to `x/Note.md`

### Requirement R-NAV-03: Tags

The system SHALL collect tags from inline `#tag` syntax (letters, digits, `_`, `-`, `/`, not purely numeric) outside code, and from the `tags` front matter property (list or single string), treating `a/b` as nested under `a`.

#### Scenario: Both sources

- **GIVEN** a note with front matter `tags: [work]` and body `#idea/raw`
- **THEN** its tags are `work` and `idea/raw`

### Requirement R-NAV-04: Offline full-text search

The system SHALL search note paths and text from the local store, case-insensitively, returning matching notes ranked with title matches first, each with a short snippet.

### Requirement R-NAV-05: Quick switcher and command palette

The system SHALL open a quick switcher with Ctrl/Cmd+O that fuzzy-matches note names and can create a note from the query, and a command palette with Ctrl/Cmd+P listing the available commands.

Grounding: OBS-F-077, OBS-F-065, SB-F-006

### Requirement R-NAV-06: Outline

The system SHALL show the open note's headings as an outline that scrolls to the heading when clicked.

### Requirement R-NAV-07: Daily note

The system SHALL provide an "Open today's daily note" command that opens or creates `YYYY-MM-DD.md` in the vault root.

Grounding: OBS-F-066
