---
capability: vault
prefix: VLT
---

# Vault storage

How documents are stored, versioned and mirrored to disk.

## ADDED Requirements

### Requirement R-VLT-01: Markdown files are the storage format

The system SHALL store every document as a UTF-8 Markdown file whose vault-relative path is its identity, so that the vault folder opens unchanged in Obsidian.

Grounding: OBS-F-040 (adopted), JOP-F-001, SB-F-010; NOT-F-031 and CNF-F-119 rejected as storage

#### Scenario: Round trip

- **GIVEN** a document saved through the API with text `# Hi\n`
- **WHEN** the vault folder is read from disk
- **THEN** the file at the same path contains exactly `# Hi\n`

### Requirement R-VLT-02: Paths are normalised and confined

The system SHALL accept only relative paths that end in `.md`, use `/` separators, contain no empty, `.` or `..` segments, and do not start with `.`; other paths are rejected with HTTP 400.

#### Scenario: Escape attempt

- **WHEN** a client pushes path `../etc/passwd.md`
- **THEN** the request is rejected and nothing is written

#### Scenario: Normalisation

- **WHEN** a client pushes `notes\\Daily.md`
- **THEN** the document is stored as `notes/Daily.md`

### Requirement R-VLT-03: Append-only revision log

The system SHALL record every change as a new revision with a vault-wide increasing integer `rev`, the path, the SHA-256 hash of the text, the full text or a deletion marker, the device name and a timestamp, and SHALL never modify or delete past revisions.

#### Scenario: Two edits

- **GIVEN** an empty vault
- **WHEN** `a.md` is created and then edited
- **THEN** the history of `a.md` lists two revisions with increasing `rev`, newest first

### Requirement R-VLT-04: Disk mirrors heads

The system SHALL keep each document's latest revision (its head) written to the vault folder, and SHALL remove the file when the head is a deletion.

#### Scenario: Delete

- **WHEN** a document is deleted through sync
- **THEN** its file no longer exists in the vault folder and its history is still readable

### Requirement R-VLT-05: External edits are captured

The system SHALL detect Markdown files created, changed or removed in the vault folder by other programs, at startup and while running, and commit them as revisions from device `disk`.

Grounding: OBS-F-054, JOP-F-007, SB-F-031

#### Scenario: Edited in Obsidian

- **GIVEN** a local node is running
- **WHEN** another program changes `ideas.md` on disk
- **THEN** within 5 seconds a new revision of `ideas.md` from device `disk` exists

### Requirement R-VLT-06: Version history and restore

The system SHALL let a user list a document's revisions, view any revision's text, and restore it, where restoring creates a new revision with the old text.

Grounding: OBS-F-156, CNF-F-057, CNF-F-060 (restore as newest version), JOP-F-049

#### Scenario: Restore

- **GIVEN** `a.md` has revisions with texts `one` then `two`
- **WHEN** the user restores the first revision
- **THEN** a third revision exists with text `one` and the first two are unchanged
