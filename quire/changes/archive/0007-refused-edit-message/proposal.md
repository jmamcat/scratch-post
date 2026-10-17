---
id: 0007-refused-edit-message
play: add-feature
status: archived
created: 2026-10-17
references: []
capabilities: [live]
---

# Say why a live edit was undone

## Why

Since 0005, a live room undoes an edit that takes a note over `QUIRE_MAX_NOTE_BYTES`. The
room closes the sender's connection with code 4413, but the app only reconnects. The paste
simply vanishes, and the person cannot tell why.

## Headline scenario

- A paste over the limit is undone and the app says why (R-LIV-06).

## What changes

- **live**: new R-LIV-06. When a room closes the connection with 4413, the app shows a
  message that names the note and says the last change was undone.

## Out of scope

Stopping the paste before it is sent: the app does not know the server's limit.
