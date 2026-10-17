---
id: 0005-live-room-limit
play: fix-bug
status: archived
created: 2026-10-17
references: []
capabilities: [access]
---

# Live rooms honour the note size limit

## Why

R-ACC-06 caps note texts at `QUIRE_MAX_NOTE_BYTES`, but only HTTP bodies are checked. An
edit through a live room (typing, a paste, an offline doc rejoining) can grow a note past the
limit, and the room commits it to the revision log. The 0003 run report lists this gap.

## Headline scenario

- A paste that would take a note over the limit is undone in the room: every device
  converges on the text before the paste, and nothing oversized reaches the revision log
  (R-ACC-06, "Oversized live edit").

## What changes

- **access**: R-ACC-06 covers live rooms. The room undoes an edit that takes the note over
  the limit and closes the connection that sent it with code 4413; a room never commits a
  text over the limit.

## Out of scope

Telling the person in the web app why their paste vanished (a follow-up for the app's live
client); limits on awareness messages.
