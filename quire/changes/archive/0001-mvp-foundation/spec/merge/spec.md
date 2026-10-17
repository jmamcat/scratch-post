---
capability: merge
prefix: MRG
---

# Three-way merge

How two edits of one document made from a common base are reconciled when the second
device syncs. Every scenario starts from two devices that share a note and then edit it
while offline.

## ADDED Requirements

### Requirement R-MRG-01: Line-based three-way merge

The system SHALL merge `base`, `current` and `incoming` texts line by line, taking each side's change where only that side changed a region.

#### Scenario: Separate paragraphs

- **GIVEN** a cloud server
- **AND** devices `pixel` and `laptop`
- **AND** everyone has `a.md` reading `A\n\nB\n`
- **WHEN** `pixel` goes offline
- **AND** `laptop` goes offline
- **AND** `pixel` sets `a.md` to `A1\n\nB\n`
- **AND** `laptop` sets `a.md` to `A\n\nB1\n`
- **AND** `pixel` comes back online
- **AND** `laptop` comes back online
- **AND** everyone syncs
- **THEN** `a.md` reads `A1\n\nB1\n` on every device
- **AND** the review inbox shows 0 open items

### Requirement R-MRG-02: Front matter merges per property

The system SHALL, when all three sides have a parseable YAML map as front matter, merge each top-level key independently, and report a key changed differently on both sides as a `property` hunk; when only one side changed the front matter, its text SHALL be kept byte for byte.

Grounding: OBS-F-100, NOT-F-093 (Notion keeps one side; Quire flags instead)

#### Scenario: Different properties

- **GIVEN** a cloud server
- **AND** devices `pixel` and `laptop`
- **AND** everyone has `p.md` reading `---\nstatus: draft\n---\nBody\n`
- **WHEN** `pixel` goes offline
- **AND** `pixel` sets `p.md` to `---\nstatus: draft\nowner: jo\n---\nBody\n`
- **AND** `laptop` sets `p.md` to `---\nstatus: done\n---\nBody\n`
- **AND** `laptop` syncs
- **AND** `pixel` comes back online
- **AND** everyone syncs
- **THEN** `p.md` reads `---\nstatus: done\nowner: jo\n---\nBody\n` on every device
- **AND** the review inbox shows 0 open items

#### Scenario: Same property, different values

- **GIVEN** a cloud server
- **AND** devices `pixel` and `laptop`
- **AND** everyone has `p.md` reading `---\nstatus: draft\n---\n`
- **WHEN** `pixel` goes offline
- **AND** `laptop` sets `p.md` to `---\nstatus: review\n---\n`
- **AND** `laptop` syncs
- **AND** `pixel` sets `p.md` to `---\nstatus: done\n---\n`
- **AND** `pixel` comes back online
- **THEN** the review inbox shows 1 open item for `p.md`
- **AND** the open item for `p.md` shows `status: review\n` from `laptop` against `status: done\n` from `pixel`

### Requirement R-MRG-03: Collision tiers

The system SHALL classify each overlapping hunk and resolve it automatically where safe:

| Kind | Rule | Outcome |
| --- | --- | --- |
| `false-conflict` | both sides made the same change | merged silently |
| `whitespace` | sides differ only in whitespace | take current, silently |
| `intraline` | a word-level merge of the hunk is clean | merged, flagged for review |
| `both-inserted` | base empty, both sides inserted | current then incoming, flagged for review |
| `text` / `property` | anything else | unresolved |

#### Scenario: Two devices append to a log

- **GIVEN** a cloud server
- **AND** devices `pixel` and `laptop`
- **AND** everyone has `log.md` reading `# Log\n`
- **WHEN** `pixel` goes offline
- **AND** `laptop` appends `- from laptop\n` to `log.md`
- **AND** `laptop` syncs
- **AND** `pixel` appends `- from pixel\n` to `log.md`
- **AND** `pixel` comes back online
- **AND** everyone syncs
- **THEN** `log.md` reads `# Log\n- from laptop\n- from pixel\n` on every device
- **AND** the review inbox shows 1 items under review

#### Scenario: Different words of one paragraph

- **GIVEN** a cloud server
- **AND** devices `pixel` and `laptop`
- **AND** everyone has `fox.md` reading `The quick fox.`
- **WHEN** `pixel` goes offline
- **AND** `laptop` replaces `quick` with `slow` in `fox.md`
- **AND** `laptop` syncs
- **AND** `pixel` replaces `fox.` with `fox jumps.` in `fox.md`
- **AND** `pixel` comes back online
- **AND** everyone syncs
- **THEN** `fox.md` reads `The slow fox jumps.` on every device
- **AND** the review inbox shows 1 items under review

#### Scenario: The same change on both sides

- **GIVEN** a cloud server
- **AND** devices `pixel` and `laptop`
- **AND** everyone has `x.md` reading `x = 1\n`
- **WHEN** `pixel` goes offline
- **AND** `laptop` sets `x.md` to `x = 2\n`
- **AND** `laptop` syncs
- **AND** `pixel` sets `x.md` to `x = 2\n`
- **AND** `pixel` comes back online
- **THEN** the review inbox shows 0 open items
- **AND** the review inbox shows 0 items under review

#### Scenario: A true conflict

- **GIVEN** a cloud server
- **AND** devices `pixel` and `laptop`
- **AND** everyone has `x.md` reading `x = 1\n`
- **WHEN** `pixel` goes offline
- **AND** `laptop` sets `x.md` to `x = 2\n`
- **AND** `laptop` syncs
- **AND** `pixel` sets `x.md` to `x = 3\n`
- **AND** `pixel` comes back online
- **THEN** the review inbox shows 1 open item for `x.md`

### Requirement R-MRG-04: Provisional text

The system SHALL produce a provisional merged text in which every unresolved hunk takes the current side.

#### Scenario: Readers keep seeing the current text

- **GIVEN** a cloud server
- **AND** devices `pixel` and `laptop`
- **AND** everyone has `x.md` reading `x = 1\n\nkeep\n`
- **WHEN** `pixel` goes offline
- **AND** `laptop` sets `x.md` to `x = 2\n\nkeep\n`
- **AND** `laptop` syncs
- **AND** `pixel` sets `x.md` to `x = 3\n\nkeep\n`
- **AND** `pixel` comes back online
- **AND** everyone syncs
- **THEN** `x.md` reads `x = 2\n\nkeep\n` on every device

### Requirement R-MRG-05: Segments and deterministic resolution

The system SHALL return the merge as an ordered list of stable segments and hunks, and SHALL turn a set of per-hunk choices (`current`, `incoming`, `both`, or custom text) into exactly one text; unchosen hunks keep their auto-resolution or, if unresolved, the current side.

#### Scenario: Mixed choices per change

- **GIVEN** a cloud server
- **AND** devices `pixel` and `laptop`
- **AND** everyone has `two.md` reading `a = 1\n\nmiddle\n\nb = 1\n`
- **WHEN** `pixel` goes offline
- **AND** `laptop` sets `two.md` to `a = 2\n\nmiddle\n\nb = 2\n`
- **AND** `laptop` syncs
- **AND** `pixel` sets `two.md` to `a = 3\n\nmiddle\n\nb = 3\n`
- **AND** `pixel` comes back online
- **AND** `laptop` resolves `two.md` keeping `incoming` for change 1 and `both` for change 2
- **THEN** the cloud server has `two.md` reading `a = 3\n\nmiddle\n\nb = 2\nb = 3\n`
