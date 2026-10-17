---
id: 0006-node-files-and-renames
play: add-feature
status: archived
created: 2026-10-17
references: []
capabilities: [sync]
---

# Local nodes replicate attachments and renames

## Why

0.1.0 shipped with two known limits on local nodes (R-SYN-09):

- attachments stay where they were added;
- a rename made on a node reaches the cloud as a new note plus a deletion, so the cloud's
  history of that note starts at the rename.

Both are listed in the README, the deployment guide and the CHANGELOG. A node is meant to
be a full stand-in for the cloud on a home network, so both limits go.

## Headline scenarios

- Attachments both ways: a file added through the cloud reaches a device on the node, bytes
  included, and the other way round.
- A rename on the node keeps its history upstream (the cloud lists both revisions).
- A rename upstream keeps its history on the node.

## What changes

- **sync**: R-SYN-09 drops its known limitations. Notes and attachments replicate; the node
  keeps the bytes; renames arrive as renames on both sides.
- Code:
  - `NodeFiles` (`apps/server/src/sync/node-files.ts`) replicates attachments on the
    browser's file protocol (`/api/files`, `/api/blobs`), with a per-path upstream base in
    the node's key-value table.
  - `NodeStore` sends a path renamed on the node with `renamedFrom`.
  - `SyncClient` passes a pulled rename's origin to its store (`PutOrigin`), so the node
    records it.
- Docs: the limitation paragraphs leave `quire/README.md` and `deploy/README.md`.

## Out of scope

Attachment renames (attachments have no rename operation yet), and replaying the history
of a note that was renamed and then edited upstream before the node pulled it: that note
arrives as new.
