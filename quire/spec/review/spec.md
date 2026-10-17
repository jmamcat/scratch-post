---
capability: review
prefix: RVW
---

# Collision review

How people see and settle what the merge could not settle alone.

## Requirements

### Requirement R-RVW-01: Conflict records

The server SHALL store each collision that needs or suggests attention as a conflict record with: id, path, kind (`content` or `delete-edit`), status (`open`, `review`, `resolved`, `dismissed`), the revision it was created at, the current and incoming device names and times, and the merge segments.

#### Scenario: Every device sees the same record

- **GIVEN** a cloud server
- **AND** devices `pixel`, `laptop` and `tablet`
- **AND** everyone has `c.md` reading `x = 1\n`
- **WHEN** `pixel` goes offline
- **AND** `laptop` sets `c.md` to `x = 2\n`
- **AND** `laptop` syncs
- **AND** `pixel` sets `c.md` to `x = 3\n`
- **AND** `pixel` comes back online
- **THEN** the open item for `c.md` shows `x = 2\n` from `laptop` against `x = 3\n` from `pixel`

### Requirement R-RVW-02: Review inbox

The client SHALL show a count of open conflicts at all times and an inbox listing open conflicts first, then items with status `review` under "Review suggested".

Layer: ui

Grounding: CNF-F-114, CNF-F-059, SB-F-027; JOP-F-040 conflict copies rejected

#### Scenario: The badge counts open items

- **GIVEN** a cloud server
- **AND** devices `pixel` and `laptop`
- **AND** everyone has `c.md` reading `x = 1\n`
- **WHEN** `pixel` goes offline
- **AND** `laptop` sets `c.md` to `x = 2\n`
- **AND** `laptop` syncs
- **AND** `pixel` sets `c.md` to `x = 3\n`
- **AND** `pixel` comes back online
- **AND** `laptop` syncs
- **THEN** the conflicts badge on `laptop` shows 1

### Requirement R-RVW-03: Per-hunk choices

The client SHALL show each hunk with its current and incoming text side by side, labelled with device and time, and offer Keep current, Keep incoming, Keep both and Edit for each, plus Keep all current / Keep all incoming for the whole record.

Layer: ui

#### Scenario: Keep incoming from the inbox

- **GIVEN** a cloud server
- **AND** devices `pixel` and `laptop`
- **AND** everyone has `c.md` reading `x = 1\n`
- **WHEN** `pixel` goes offline
- **AND** `laptop` sets `c.md` to `x = 2\n`
- **AND** `laptop` syncs
- **AND** `pixel` sets `c.md` to `x = 3\n`
- **AND** `pixel` comes back online
- **AND** `laptop` resolves `c.md` keeping `incoming`
- **THEN** within 5 seconds `laptop` sees `c.md` reading `x = 3\n`
- **AND** the conflicts badge on `laptop` shows 0

### Requirement R-RVW-04: Resolution is a merge, not an overwrite

The server SHALL apply a resolution as a push whose base is the conflict's revision, so edits made after the conflict was opened are kept.

#### Scenario: Edited meanwhile

- **GIVEN** a cloud server
- **AND** devices `pixel` and `laptop`
- **AND** everyone has `c.md` reading `x = 1\n\nkeep\n`
- **WHEN** `pixel` goes offline
- **AND** `laptop` sets `c.md` to `x = 2\n\nkeep\n`
- **AND** `laptop` syncs
- **AND** `pixel` sets `c.md` to `x = 3\n\nkeep\n`
- **AND** `pixel` comes back online
- **AND** `laptop` syncs
- **AND** `laptop` appends `\nlater edit\n` to `c.md`
- **AND** `laptop` syncs
- **AND** `pixel` resolves `c.md` keeping `both`
- **THEN** the cloud server has `c.md` reading `x = 2\nx = 3\n\nkeep\n\nlater edit\n`

### Requirement R-RVW-05: Note banner

The client SHALL show a banner on a note that has an open conflict, linking to its card.

Layer: ui

#### Scenario: Banner on the conflicted note

- **GIVEN** a cloud server
- **AND** devices `pixel` and `laptop`
- **AND** everyone has `c.md` reading `x = 1\n`
- **WHEN** `pixel` goes offline
- **AND** `laptop` sets `c.md` to `x = 2\n`
- **AND** `laptop` syncs
- **AND** `pixel` sets `c.md` to `x = 3\n`
- **AND** `pixel` comes back online
- **AND** `laptop` opens `c.md`
- **THEN** `laptop` sees the banner `unresolved changes`

### Requirement R-RVW-06: Review suggested

The client SHALL let the user accept an auto-resolved item (status becomes `dismissed`) or change its choices (applied as in R-RVW-04).

#### Scenario: Accept a suggestion

- **GIVEN** a cloud server
- **AND** devices `pixel` and `laptop`
- **AND** everyone has `log.md` reading `# Log\n`
- **WHEN** `pixel` goes offline
- **AND** `laptop` appends `- a\n` to `log.md`
- **AND** `laptop` syncs
- **AND** `pixel` appends `- b\n` to `log.md`
- **AND** `pixel` comes back online
- **THEN** the review inbox shows 1 items under review
- **WHEN** `laptop` accepts the suggestion for `log.md`
- **THEN** the review inbox shows 0 items under review
- **AND** the cloud server has `log.md` reading `# Log\n- a\n- b\n`

### Requirement R-RVW-07: Delete-edit decision

The client SHALL offer Keep note and Delete note for a `delete-edit` conflict.

#### Scenario: Confirm the deletion

- **GIVEN** a cloud server
- **AND** devices `pixel` and `laptop`
- **AND** everyone has `d.md` reading `v1\n`
- **WHEN** `pixel` goes offline
- **AND** `laptop` deletes `d.md`
- **AND** `laptop` syncs
- **AND** `pixel` sets `d.md` to `v2\n`
- **AND** `pixel` comes back online
- **AND** `laptop` confirms the deletion of `d.md`
- **THEN** the cloud server has no `d.md`
- **AND** the review inbox shows 0 open items

#### Scenario: Keep the note

- **GIVEN** a cloud server
- **AND** devices `pixel` and `laptop`
- **AND** everyone has `d.md` reading `v1\n`
- **WHEN** `pixel` goes offline
- **AND** `laptop` deletes `d.md`
- **AND** `laptop` syncs
- **AND** `pixel` sets `d.md` to `v2\n`
- **AND** `pixel` comes back online
- **AND** `laptop` keeps `d.md`
- **THEN** the cloud server has `d.md` reading `v2\n`
- **AND** the review inbox shows 0 open items
