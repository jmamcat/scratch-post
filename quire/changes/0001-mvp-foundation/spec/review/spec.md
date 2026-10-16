---
capability: review
prefix: RVW
---

# Collision review

How people see and settle what the merge could not settle alone.

## ADDED Requirements

### Requirement R-RVW-01: Conflict records

The server SHALL store each collision that needs or suggests attention as a conflict record with: id, path, kind (`content` or `delete-edit`), status (`open`, `review`, `resolved`, `dismissed`), the revision it was created at, the current and incoming device names and times, and the merge segments.

### Requirement R-RVW-02: Review inbox

The client SHALL show a count of open conflicts at all times and an inbox listing open conflicts first, then items with status `review` under "Review suggested".

Grounding: CNF-F-114, CNF-F-059, SB-F-027; JOP-F-040 conflict copies rejected

### Requirement R-RVW-03: Per-hunk choices

The client SHALL show each hunk with its current and incoming text side by side, labelled with device and time, and offer Keep current, Keep incoming, Keep both and Edit for each, plus Keep all current / Keep all incoming for the whole record.

#### Scenario: Mixed choices

- **GIVEN** an open conflict with two hunks
- **WHEN** the user keeps incoming for hunk 1 and both for hunk 2, then applies
- **THEN** the document text reflects those choices and the record is `resolved`

### Requirement R-RVW-04: Resolution is a merge, not an overwrite

The server SHALL apply a resolution as a push whose base is the conflict's revision, so edits made after the conflict was opened are kept.

#### Scenario: Edited meanwhile

- **GIVEN** an open conflict in paragraph 1 and a later edit to paragraph 4
- **WHEN** the conflict is resolved
- **THEN** the head contains the resolution and the paragraph 4 edit

### Requirement R-RVW-05: Note banner

The client SHALL show a banner on a note that has an open conflict, linking to its card.

### Requirement R-RVW-06: Review suggested

The client SHALL let the user accept an auto-resolved item (status becomes `dismissed`) or change its choices (applied as in R-RVW-04).

### Requirement R-RVW-07: Delete-edit decision

The client SHALL offer Keep note and Delete note for a `delete-edit` conflict.
