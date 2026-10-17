---
capability: backup
prefix: BAK
---

# Versioning and backup

Keeping every state of the vault recoverable: per-note history (vault capability), whole-vault
history built from change sets, compaction that keeps what matters, and backup bundles that
can rebuild a server from nothing. A change set is a group of consecutive commits by one
device with less than the change-set gap (`QUIRE_CHANGESET_GAP_MS`, default 10 minutes)
between them; scenario servers use a 1 second gap (3 seconds on `@ui` scenarios, where browsers
commit through live rooms).

## Requirements

### Requirement R-BAK-01: Schema versions and migrations

The server SHALL record its database schema version, apply pending migrations in order when it starts (each in one transaction, after writing a full backup bundle when a backup folder is configured), and SHALL refuse to start on a database whose schema version is newer than it knows.

Layer: system

#### Scenario: Upgrade from the first schema

- **GIVEN** a data folder from schema version 1 with `a.md` reading `old`
- **WHEN** a cloud server starts on that data folder
- **THEN** the cloud server has `a.md` reading `old`
- **AND** the history of `a.md` lists 1 revisions, newest first
- **AND** the database has the latest schema version

#### Scenario: A newer database is refused

- **GIVEN** a data folder from a newer schema version
- **WHEN** a cloud server starts on that data folder
- **THEN** the cloud server fails to start with the message `newer schema`

### Requirement R-BAK-02: Change sets

The server SHALL group commits into change sets and list them newest first through `GET /api/changesets`, each with its start and end time, device, revision range and the notes and files it changed.

Layer: system

#### Scenario: Commits group by device and time

- **GIVEN** a cloud server
- **AND** devices `a` and `b`
- **WHEN** `a` has `x.md` reading `1`
- **AND** `a` has `y.md` reading `2`
- **AND** `b` has `x.md` reading `3`
- **THEN** the vault history lists 2 change sets
- **AND** change set 1 of the vault history is by `b` and changed `x.md`
- **AND** change set 2 of the vault history is by `a` and changed `x.md, y.md`

#### Scenario: A pause starts a new change set

- **GIVEN** a cloud server
- **AND** device `a`
- **WHEN** `a` has `x.md` reading `1`
- **AND** 2 seconds pass
- **AND** `a` has `x.md` reading `2`
- **THEN** the vault history lists 2 change sets

### Requirement R-BAK-03: Whole-vault restore

The server SHALL restore the whole vault to its state at the end of any change set (`POST /api/changesets/<id>/restore`) by committing new revisions that recreate, revert or delete notes and files as needed, all in one new change set, so that a restore can itself be undone.

Layer: system

#### Scenario: Roll the vault back

- **GIVEN** a cloud server
- **AND** device `pixel`
- **AND** `pixel` has `a.md` reading `one`
- **AND** 2 seconds pass
- **AND** `pixel` has `a.md` reading `two`
- **AND** `pixel` has `b.md` reading `new`
- **WHEN** `pixel` restores the vault to change set 2
- **AND** `pixel` syncs
- **THEN** the cloud server has `a.md` reading `one`
- **AND** the cloud server has no `b.md`
- **AND** `b.md` is gone from `pixel`
- **AND** the vault history lists 3 change sets

#### Scenario: Undo a restore

- **GIVEN** a cloud server
- **AND** device `pixel`
- **AND** `pixel` has `a.md` reading `one`
- **AND** 2 seconds pass
- **AND** `pixel` has `a.md` reading `two`
- **AND** 2 seconds pass
- **WHEN** `pixel` restores the vault to change set 2
- **AND** 2 seconds pass
- **AND** `pixel` restores the vault to change set 2
- **THEN** the cloud server has `a.md` reading `two`

### Requirement R-BAK-04: History compaction

The server SHALL keep every revision for `QUIRE_KEEP_ALL_DAYS` days (default 30); for older change sets it SHALL keep only the last revision of each note and file in each change set. It SHALL never remove a head, a revision a conflict refers to, or a revision not yet written to a backup bundle when backups are on. Compaction SHALL run once a day and on `quire compact`.

Layer: system

#### Scenario: Typing bursts compact to one revision

- **GIVEN** a cloud server that keeps every revision for 0 days
- **AND** device `pixel`
- **AND** `pixel` has `a.md` reading `1`
- **AND** `pixel` has `a.md` reading `12`
- **AND** `pixel` has `a.md` reading `123`
- **AND** 2 seconds pass
- **WHEN** the cloud server compacts its history
- **THEN** the history of `a.md` lists 1 revisions, newest first
- **AND** the cloud server has `a.md` reading `123`

#### Scenario: Recent history is kept

- **GIVEN** a cloud server
- **AND** device `pixel`
- **AND** `pixel` has `a.md` reading `1`
- **AND** `pixel` has `a.md` reading `12`
- **AND** 2 seconds pass
- **WHEN** the cloud server compacts its history
- **THEN** the history of `a.md` lists 2 revisions, newest first

### Requirement R-BAK-05: Backup bundles

When `QUIRE_BACKUP_DIR` is set the server SHALL write a chain of gzip-compressed backup bundles there: a full bundle first, then incremental bundles, each holding the change sets that closed since the previous bundle (a change set closes once it has been quiet for the change-set gap, or holds 500 revisions). Each bundle SHALL store every distinct text and file once, carry a manifest with its revision range, time span, devices, paths and the SHA-256 of the previous bundle, and a new full bundle SHALL start after 7 days or 200 incremental bundles. `quire backup verify` SHALL check the whole chain.

Layer: system

#### Scenario: Bundles follow change sets

- **GIVEN** a cloud server with a backup folder
- **AND** device `pixel`
- **AND** `pixel` has `a.md` reading `one`
- **AND** 2 seconds pass
- **AND** `pixel` has `b.md` reading `two`
- **AND** 2 seconds pass
- **THEN** within 5 seconds the backup folder holds a full bundle and at least 2 incremental bundles
- **AND** the backup chain verifies

#### Scenario: Same text stored once

- **GIVEN** a cloud server with a backup folder
- **AND** device `pixel`
- **AND** `pixel` has `a.md` reading `same words`
- **AND** `pixel` has `b.md` reading `same words`
- **AND** 2 seconds pass
- **THEN** within 5 seconds the backup bundles store the text `same words` once

#### Scenario: Tampering is detected

- **GIVEN** a cloud server with a backup folder
- **AND** device `pixel`
- **AND** `pixel` has `a.md` reading `one`
- **AND** 2 seconds pass
- **AND** within 5 seconds the backup folder holds a full bundle and at least 1 incremental bundles
- **WHEN** a byte of the newest backup bundle is changed
- **THEN** the backup chain does not verify

### Requirement R-BAK-06: Restore from bundles

`quire restore <backup-dir> --to <data-dir> [--at <rev>]` SHALL rebuild a data folder from the bundles, checking each against its manifest and the chain, so that a server started on it serves the same notes, files and history up to that point.

Layer: system

#### Scenario: Rebuild a lost server

- **GIVEN** a cloud server with a backup folder
- **AND** device `pixel`
- **AND** `pixel` has `a.md` reading `one`
- **AND** 2 seconds pass
- **AND** `pixel` has `a.md` reading `two`
- **AND** 2 seconds pass
- **AND** within 5 seconds the backup folder holds a full bundle and at least 2 incremental bundles
- **WHEN** the cloud server's data is lost and restored from the backup folder
- **THEN** the cloud server has `a.md` reading `two`
- **AND** the history of `a.md` lists 2 revisions, newest first

#### Scenario: Restore to an earlier point

- **GIVEN** a cloud server with a backup folder
- **AND** device `pixel`
- **AND** `pixel` has `a.md` reading `one`
- **AND** 2 seconds pass
- **AND** `pixel` has `a.md` reading `two`
- **AND** 2 seconds pass
- **AND** within 5 seconds the backup folder holds a full bundle and at least 2 incremental bundles
- **WHEN** the cloud server's data is lost and restored from the backup folder as of the first change set
- **THEN** the cloud server has `a.md` reading `one`

### Requirement R-BAK-07: Vault history in the app

The client SHALL show the vault history (command "Open vault history") as a list of change sets, newest first, with time, device and changed notes, and SHALL restore the vault to a chosen change set after the user confirms.

Layer: ui

#### Scenario: Restore from the app

- **GIVEN** a cloud server
- **AND** device `pixel`
- **AND** `pixel` has `a.md` reading `one`
- **AND** 4 seconds pass
- **AND** `pixel` has `a.md` reading `two`
- **WHEN** `pixel` runs the command `Open vault history`
- **THEN** the vault history on `pixel` lists 2 change sets
- **WHEN** `pixel` restores the vault to change set 2 in the app
- **THEN** within 5 seconds the cloud server has `a.md` reading `one`
