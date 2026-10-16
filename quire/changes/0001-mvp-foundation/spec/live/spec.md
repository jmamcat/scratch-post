---
capability: live
prefix: LIV
---

# Live co-editing

Real-time editing while online, layered on the revision log.

## ADDED Requirements

### Requirement R-LIV-01: Yjs rooms

The server SHALL host one Yjs document per open path at `/live?path=<path>` speaking the y-websocket sync and awareness protocol, seeded by the server from the head text into `Y.Text("content")`.

Grounding: NOT-F-074, CNF-F-068, CNF-F-069

#### Scenario: Two editors

- **GIVEN** two clients connected to the room for `a.md`
- **WHEN** one types `hello`
- **THEN** the other sees `hello` without reloading

### Requirement R-LIV-02: Live text becomes revisions

The server SHALL commit a room's text as a revision from device `live` 1.5 s after the last change, at least every 10 s during continuous typing, and when the last client disconnects.

### Requirement R-LIV-03: Offline merges reach live editors

The server SHALL, before handling a push or resolution for a path with an active room, commit the room's pending text, and afterwards apply the resulting head text to the room as a minimal edit.

#### Scenario: Offline device returns

- **GIVEN** a user is live-editing `a.md`
- **WHEN** an offline device pushes an edit to another paragraph of `a.md`
- **THEN** the live user sees that paragraph change in place and keeps their own edits

### Requirement R-LIV-04: Event stream

The server SHALL announce each commit (`path`, `rev`, `hash`, `device`) and each conflict change on a Server-Sent Events stream.

### Requirement R-LIV-05: Fall back to offline

The client SHALL keep editing locally when the live connection drops, and on reconnect push its local changes through the offline path before rejoining the room.
