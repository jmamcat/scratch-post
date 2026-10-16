---
capability: merge
prefix: MRG
---

# Three-way merge

The pure function that reconciles two edits of one document made from a common base.

## ADDED Requirements

### Requirement R-MRG-01: Line-based three-way merge

The system SHALL merge `base`, `current` and `incoming` texts line by line, taking each side's change where only that side changed a region.

#### Scenario: Separate paragraphs

- **GIVEN** base `A\n\nB\n`, current `A1\n\nB\n`, incoming `A\n\nB1\n`
- **THEN** the result is `A1\n\nB1\n` with no conflicts

### Requirement R-MRG-02: Front matter merges per property

The system SHALL, when all three sides have a parseable YAML map as front matter, merge each top-level key independently, and report a key changed differently on both sides as a `property` hunk; when only one side changed the front matter, its text SHALL be kept byte for byte.

Grounding: OBS-F-100, NOT-F-093 (Notion keeps one side; Quire flags instead)

#### Scenario: Different keys

- **GIVEN** base `status: draft`, current adds `owner: jo`, incoming changes `status: done`
- **THEN** the merged front matter has `status: done` and `owner: jo`, no conflicts

### Requirement R-MRG-03: Collision tiers

The system SHALL classify each overlapping hunk and resolve it automatically where safe:

| Kind | Rule | Outcome |
| --- | --- | --- |
| `false-conflict` | both sides made the same change | merged silently |
| `whitespace` | sides differ only in whitespace | take current, silently |
| `intraline` | a word-level merge of the hunk is clean | merged, flagged for review |
| `both-inserted` | base empty, both sides inserted | current then incoming, flagged for review |
| `text` / `property` | anything else | unresolved |

#### Scenario: Two appends

- **GIVEN** base `# Log\n`, current `# Log\n- a\n`, incoming `# Log\n- b\n`
- **THEN** the result is `# Log\n- a\n- b\n` with one auto-resolved hunk of kind `both-inserted`

#### Scenario: Same paragraph, different words

- **GIVEN** base `The quick fox.`, current `The slow fox.`, incoming `The quick fox jumps.`
- **THEN** the result is `The slow fox jumps.` with one auto-resolved hunk of kind `intraline`

#### Scenario: True conflict

- **GIVEN** base `x = 1`, current `x = 2`, incoming `x = 3`
- **THEN** there is one unresolved hunk of kind `text`

### Requirement R-MRG-04: Provisional text

The system SHALL produce a provisional merged text in which every unresolved hunk takes the current side.

### Requirement R-MRG-05: Segments and deterministic resolution

The system SHALL return the merge as an ordered list of stable segments and hunks, and SHALL turn a set of per-hunk choices (`current`, `incoming`, `both`, or custom text) into exactly one text; unchosen hunks keep their auto-resolution or, if unresolved, the current side.

#### Scenario: Choose incoming

- **GIVEN** the true conflict above
- **WHEN** the hunk is resolved with `incoming`
- **THEN** the text is `x = 3`
