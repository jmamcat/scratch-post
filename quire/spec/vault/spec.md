---
capability: vault
prefix: VLT
---

# Vault storage

How documents are stored, versioned and mirrored to disk.

## Requirements

### Requirement R-VLT-01: Markdown files are the storage format

The system SHALL store every document as a UTF-8 Markdown file whose vault-relative path is its identity, so that the vault folder opens unchanged in Obsidian.

Grounding: OBS-F-040 (adopted), JOP-F-001, SB-F-010; NOT-F-031 and CNF-F-119 rejected as storage

#### Scenario: A note is a plain file

- **GIVEN** a cloud server
- **AND** device `pixel`
- **WHEN** `pixel` sets `notes/Hi.md` to `# Hi\n`
- **AND** `pixel` syncs
- **THEN** the vault folder has `notes/Hi.md` reading `# Hi\n`

### Requirement R-VLT-02: Paths are normalised and confined

The system SHALL accept only relative paths that end in `.md`, use `/` separators, contain no empty, `.` or `..` segments, and have no segment starting with `.`; other paths are rejected with HTTP 400.

#### Scenario: Escape attempt

- **GIVEN** a cloud server
- **AND** device `pixel`
- **WHEN** `pixel` tries to create `../etc/passwd.md`
- **THEN** the request is rejected
- **AND** the vault folder has no `../etc/passwd.md`

#### Scenario: Backslashes become slashes

- **GIVEN** a cloud server
- **AND** device `pixel`
- **WHEN** `pixel` tries to create `notes\Daily.md`
- **THEN** the note is stored as `notes/Daily.md`

### Requirement R-VLT-03: Append-only revision log

The system SHALL record every change as a new revision with a vault-wide increasing integer `rev`, the path, the SHA-256 hash of the text, the full text or a deletion marker, the device name and a timestamp, and SHALL never modify or delete past revisions.

#### Scenario: Two edits, two revisions

- **GIVEN** a cloud server
- **AND** device `pixel`
- **WHEN** `pixel` has `a.md` reading `one`
- **AND** `pixel` has `a.md` reading `two`
- **THEN** the history of `a.md` lists 2 revisions, newest first

### Requirement R-VLT-04: Disk mirrors heads

The system SHALL keep each document's latest revision (its head) written to the vault folder, and SHALL remove the file when the head is a deletion.

#### Scenario: Delete removes the file, not the history

- **GIVEN** a cloud server
- **AND** device `pixel`
- **AND** `pixel` has `gone.md` reading `bye`
- **WHEN** `pixel` deletes `gone.md`
- **AND** `pixel` syncs
- **THEN** the vault folder has no `gone.md`
- **AND** the history of `gone.md` lists 2 revisions, newest first

### Requirement R-VLT-05: External edits are captured

The system SHALL detect Markdown files created, changed or removed in the vault folder by other programs, at startup and while running, and commit them as revisions from device `disk`.

Grounding: OBS-F-054, JOP-F-007, SB-F-031

#### Scenario: Edited in Obsidian while running

- **GIVEN** a cloud server
- **AND** device `pixel`
- **AND** `pixel` has `ideas.md` reading `v1\n`
- **WHEN** another program writes `v1\nedited in obsidian\n` to `ideas.md` in the vault folder
- **THEN** within 5 seconds the cloud server has `ideas.md` changed by device `disk`
- **AND** the cloud server has `ideas.md` reading `v1\nedited in obsidian\n`

#### Scenario: Files present at startup are imported

- **GIVEN** the vault folder already contains `imported.md` reading `# Imported\n`
- **AND** a cloud server
- **AND** device `pixel`
- **THEN** `imported.md` on `pixel` reads `# Imported\n`

### Requirement R-VLT-06: Version history and restore

The system SHALL let a user list a document's revisions, view any revision's text, and restore it, where restoring creates a new revision with the old text.

Grounding: OBS-F-156, CNF-F-057, CNF-F-060 (restore as newest version), JOP-F-049

#### Scenario: Restore an old revision

- **GIVEN** a cloud server
- **AND** device `pixel`
- **AND** `pixel` has `a.md` reading `one`
- **AND** `pixel` has `a.md` reading `two`
- **WHEN** `pixel` restores the oldest revision of `a.md`
- **THEN** the cloud server has `a.md` reading `one`
- **AND** the history of `a.md` lists 3 revisions, newest first

### Requirement R-VLT-07: Editable properties

The client SHALL let the user add, change and remove front matter properties from the properties pane, showing text, number, checkbox, date and list values with matching inputs, and SHALL write the change back to the note's YAML front matter, creating or removing the front matter block as needed.

Layer: ui

Grounding: OBS-F-075, OBS-F-100, OBS-F-101, NOT-F-046

#### Scenario: Change a property

- **GIVEN** a cloud server
- **AND** device `pixel`
- **AND** `pixel` has `p.md` reading `---\nstatus: draft\n---\nBody\n`
- **WHEN** `pixel` opens `p.md`
- **AND** `pixel` sets the property `status` to `done`
- **THEN** `p.md` on `pixel` reads `---\nstatus: done\n---\nBody\n`

#### Scenario: Add the first property

- **GIVEN** a cloud server
- **AND** device `pixel`
- **AND** `pixel` has `p.md` reading `Body\n`
- **WHEN** `pixel` opens `p.md`
- **AND** `pixel` adds the property `owner` with `jo`
- **THEN** `p.md` on `pixel` reads `---\nowner: jo\n---\nBody\n`

#### Scenario: Remove the last property

- **GIVEN** a cloud server
- **AND** device `pixel`
- **AND** `pixel` has `p.md` reading `---\nowner: jo\n---\nBody\n`
- **WHEN** `pixel` opens `p.md`
- **AND** `pixel` removes the property `owner`
- **THEN** `p.md` on `pixel` reads `Body\n`

### Requirement R-VLT-08: Changes view

The client SHALL list the most recently changed notes across the vault, newest first, with the device that changed each and when, from the server's revision log (cached for offline use).

Layer: ui

Grounding: Obsidian Sync history (OBS-F-157), CNF-F-057, community "changelog" plugins

#### Scenario: Who changed what

- **GIVEN** a cloud server
- **AND** devices `pixel` and `laptop`
- **AND** `laptop` has `report.md` reading `draft\n`
- **AND** `pixel` syncs
- **WHEN** `pixel` switches the sidebar to `Changes`
- **THEN** the sidebar on `pixel` shows `report` changed by `laptop`
