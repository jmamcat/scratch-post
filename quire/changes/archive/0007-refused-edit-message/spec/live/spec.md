---
capability: live
prefix: LIV
---

# Live co-editing

## ADDED Requirements

### Requirement R-LIV-06: Say why an edit was undone

When a live room undoes an edit because the note would be over the size limit (R-ACC-06), the app SHALL show a message that names the note and says that the last change was undone.

Layer: ui

#### Scenario: Paste over the limit

- **GIVEN** a cloud server that allows notes of at most 1 KiB
- **AND** device `pixel`
- **AND** `pixel` has `Draft.md` reading `short`
- **WHEN** `pixel` pastes 2 KiB at the end of `Draft.md`
- **THEN** `pixel` sees the message `Draft is over the size limit`
- **AND** `Draft.md` on `pixel` reads `short`
