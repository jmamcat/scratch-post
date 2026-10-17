---
capability: live
prefix: LIV
---

# Live co-editing

Real-time editing while online, layered on the revision log.

## Requirements

### Requirement R-LIV-01: Yjs rooms

The server SHALL host one Yjs document per open path at `/live?path=<path>` speaking the y-websocket sync and awareness protocol, seeded by the server from the head text into `Y.Text("content")`.

Grounding: NOT-F-074, CNF-F-068, CNF-F-069

#### Scenario: Two editors

- **GIVEN** a cloud server
- **AND** devices `pixel` and `laptop`
- **AND** everyone has `a.md` reading `start\n`
- **AND** `pixel` and `laptop` are editing `a.md` live
- **WHEN** `pixel` types `hello` at the end of `a.md`
- **THEN** within 3 seconds `laptop` sees `a.md` reading `start\nhello`

### Requirement R-LIV-02: Live text becomes revisions

The server SHALL commit a room's text as a revision from device `live` 1.5 s after the last change, at least every 10 s during continuous typing, and when the last client disconnects.

#### Scenario: Typing is saved without pressing save

- **GIVEN** a cloud server
- **AND** device `pixel`
- **AND** `pixel` has `n.md` reading `draft\n`
- **AND** `pixel` is editing `n.md` live
- **WHEN** `pixel` types ` more` at the end of `n.md`
- **THEN** within 5 seconds the cloud server has `n.md` reading `draft\n more`
- **AND** within 5 seconds the cloud server has `n.md` changed by device `live`

### Requirement R-LIV-03: Offline merges reach live editors

The server SHALL, before handling a push or resolution for a path with an active room, commit the room's pending text, and afterwards apply the resulting head text to the room as a minimal edit.

#### Scenario: Offline device returns while others type

- **GIVEN** a cloud server
- **AND** devices `pixel`, `laptop` and `phone`
- **AND** everyone has `p.md` reading `para 1\n\npara 2\n\npara 3\n`
- **AND** `phone` goes offline
- **AND** `pixel` and `laptop` are editing `p.md` live
- **WHEN** `pixel` types `LIVE ` at the start of `p.md`
- **AND** `phone` replaces `para 3` with `para 3 offline` in `p.md`
- **AND** `phone` comes back online
- **THEN** within 5 seconds `laptop` sees `p.md` reading `LIVE para 1\n\npara 2\n\npara 3 offline\n`
- **AND** within 5 seconds `pixel` sees `p.md` reading `LIVE para 1\n\npara 2\n\npara 3 offline\n`

### Requirement R-LIV-04: Event stream

The server SHALL announce each commit (`path`, `rev`, `hash`, `device`) and each conflict change on a Server-Sent Events stream.

#### Scenario: A commit is announced

- **GIVEN** a cloud server
- **AND** devices `pixel` and `laptop`
- **AND** `laptop` is listening to the event stream
- **WHEN** `pixel` has `e.md` reading `x`
- **THEN** the event stream announces a commit of `e.md` by `pixel`

### Requirement R-LIV-05: Fall back to offline

The client SHALL keep editing locally when the live connection drops, and on reconnect push its local changes through the offline path before rejoining the room.

#### Scenario: Connection drops mid-edit

- **GIVEN** a cloud server
- **AND** devices `pixel` and `laptop`
- **AND** everyone has `a.md` reading `one\n`
- **AND** `pixel` and `laptop` are editing `a.md` live
- **WHEN** `pixel` loses its live connection
- **AND** `pixel` goes offline
- **AND** `pixel` sets `a.md` to `one\ntwo\n`
- **AND** `pixel` comes back online
- **AND** `pixel` reconnects
- **THEN** within 5 seconds `laptop` sees `a.md` reading `one\ntwo\n`
- **AND** within 5 seconds the cloud server has `a.md` reading `one\ntwo\n`

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
