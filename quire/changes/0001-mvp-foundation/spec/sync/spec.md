---
capability: sync
prefix: SYN
---

# Offline sync

How devices that edit while disconnected converge.

## ADDED Requirements

### Requirement R-SYN-01: Full local copy

The client SHALL keep every non-deleted document of the vault in a local store and SHALL let the user open, edit, create and delete documents with no network connection.

Grounding: JOP-F-027, SB-F-017, OBS-F-163; NOT-F-090 and CNF-F-115 only keep opened pages (rejected)

#### Scenario: Airplane mode

- **GIVEN** a client that has synced once
- **WHEN** the network is off and the user edits `a.md`
- **THEN** the edit is saved locally and `a.md` shows as pending sync

### Requirement R-SYN-02: Fast-forward push

The server SHALL commit a pushed document directly when its `baseRev` equals the current head revision.

### Requirement R-SYN-03: Merge on stale base

The server SHALL three-way merge a push whose `baseRev` is older than the head, using the text at `baseRev` as base, the head as current and the pushed text as incoming (see capability `merge`), commit the merged or provisional text, and return it to the client.

#### Scenario: Two offline devices, different paragraphs

- **GIVEN** devices P and L both synced `a.md` at rev 5, then went offline
- **WHEN** P edits paragraph 1 and syncs, then L edits paragraph 3 and syncs
- **THEN** the head contains both edits and no conflict is open

### Requirement R-SYN-04: Convergence

The system SHALL bring every device to the same text for every document once each device completes a sync cycle after the last edit.

#### Scenario: Random edits

- **GIVEN** three devices making random offline edits, deletes and creates
- **WHEN** all of them sync twice in any order with no further edits
- **THEN** every device's documents equal the server's heads

### Requirement R-SYN-05: No silent loss

The system SHALL keep both sides of every unresolved hunk in a conflict record until a person resolves or dismisses it.

### Requirement R-SYN-06: Delete versus edit

The server SHALL keep the edited version when one side deleted a document and the other edited it, and SHALL open a `delete-edit` conflict so a person can confirm the deletion.

### Requirement R-SYN-07: Rebase during round trip

The client SHALL preserve edits typed while a push is in flight by merging them onto the text the server returned.

### Requirement R-SYN-08: Change feed

The server SHALL expose the list of heads changed after a given `rev` cursor, and the client SHALL fast-forward documents with no local changes to those heads.

### Requirement R-SYN-09: Local node replication

A server in local mode SHALL replicate its heads with an upstream server as a sync client, retrying with backoff while the upstream is unreachable, and SHALL keep serving its own clients meanwhile.

Grounding: JOP-F-028, OBS-F-166

#### Scenario: Cloud down

- **GIVEN** a local node whose upstream is offline
- **WHEN** a LAN client edits `a.md` through the local node
- **THEN** the edit is committed locally and reaches the upstream after it comes back
