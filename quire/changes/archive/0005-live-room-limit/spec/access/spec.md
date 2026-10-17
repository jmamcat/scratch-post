---
capability: access
prefix: ACC
---

# Access control

## MODIFIED Requirements

### Requirement R-ACC-06: Request limits

The server SHALL refuse note texts larger than `QUIRE_MAX_NOTE_BYTES` (default 2 MiB) and attachments larger than `QUIRE_MAX_FILE_BYTES` (default 25 MiB) with status 413; in a live room, an edit that takes the note over `QUIRE_MAX_NOTE_BYTES` SHALL be undone in the room, so every device converges on the text before it, the connection that sent it SHALL be closed with code 4413, and the room SHALL never commit a text over the limit; and after 10 failed token checks from one address within a minute SHALL answer that address with status 429 until the minute has passed.

Layer: system

#### Scenario: Oversized note

- **GIVEN** a cloud server
- **AND** device `pixel`
- **WHEN** `pixel` tries to save a note of 3 MiB
- **THEN** the request is rejected with status 413

#### Scenario: Guessing tokens is throttled

- **GIVEN** a cloud server that requires the token `s3cret`
- **WHEN** 11 requests with a wrong token are made
- **THEN** a request for the note list with the token is answered with status 429

#### Scenario: Oversized live edit

- **GIVEN** a cloud server that allows notes of at most 1 KiB
- **AND** devices `pixel` and `tab`
- **AND** `pixel` has `Draft.md` reading `short`
- **AND** `pixel` and `tab` are editing `Draft.md` live
- **WHEN** `pixel` pastes 2 KiB at the end of `Draft.md`
- **THEN** within 5 seconds `pixel` sees `Draft.md` reading `short`
- **AND** within 5 seconds `tab` sees `Draft.md` reading `short`
- **AND** the cloud server has `Draft.md` reading `short`
