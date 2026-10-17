---
capability: navigate
prefix: NAV
---

# Navigation

## ADDED Requirements

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
