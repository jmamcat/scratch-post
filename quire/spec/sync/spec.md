---
capability: sync
prefix: SYN
---

# Offline sync

How devices that edit while disconnected converge.

## Requirements

### Requirement R-SYN-01: Full local copy

The client SHALL keep every non-deleted document of the vault in a local store and SHALL let the user open, edit, create and delete documents with no network connection.

Grounding: JOP-F-027, SB-F-017, OBS-F-163; NOT-F-090 and CNF-F-115 only keep opened pages (rejected)

#### Scenario: Airplane mode

- **GIVEN** a cloud server
- **AND** device `pixel`
- **AND** `pixel` has `a.md` reading `one\n`
- **WHEN** `pixel` goes offline
- **AND** `pixel` sets `a.md` to `two\n`
- **AND** `pixel` creates `b.md` reading `new\n`
- **AND** `pixel` syncs
- **THEN** `a.md` on `pixel` reads `two\n`
- **AND** `pixel` shows `a.md` as pending sync
- **AND** the cloud server has `a.md` reading `one\n`
- **WHEN** `pixel` comes back online
- **THEN** the cloud server has `a.md` reading `two\n`
- **AND** the cloud server has `b.md` reading `new\n`
- **AND** `pixel` shows `a.md` as synced

### Requirement R-SYN-02: Fast-forward push

The server SHALL commit a pushed document directly when its `baseRev` equals the current head revision.

#### Scenario: An edit on top of the latest version

- **GIVEN** a cloud server
- **AND** devices `pixel` and `laptop`
- **AND** everyone has `a.md` reading `one\n`
- **WHEN** `pixel` sets `a.md` to `two\n`
- **AND** `pixel` syncs
- **THEN** the cloud server has `a.md` reading `two\n`
- **AND** the review inbox shows 0 open items

### Requirement R-SYN-03: Merge on stale base

The server SHALL three-way merge a push whose `baseRev` is older than the head, using the text at `baseRev` as base, the head as current and the pushed text as incoming (see capability `merge`), commit the merged or provisional text, and return it to the client.

#### Scenario: Two offline devices, different paragraphs

- **GIVEN** a cloud server
- **AND** devices `pixel` and `laptop`
- **AND** everyone has `a.md` reading `para 1\n\npara 2\n\npara 3\n`
- **WHEN** `pixel` goes offline
- **AND** `laptop` goes offline
- **AND** `pixel` replaces `para 1` with `para 1 from pixel` in `a.md`
- **AND** `laptop` replaces `para 3` with `para 3 from laptop` in `a.md`
- **AND** `pixel` comes back online
- **AND** `laptop` comes back online
- **AND** everyone syncs
- **THEN** `a.md` reads `para 1 from pixel\n\npara 2\n\npara 3 from laptop\n` on every device
- **AND** the review inbox shows 0 open items

#### Scenario: The same daily note created on two devices

- **GIVEN** a cloud server
- **AND** devices `pixel` and `laptop`
- **WHEN** `pixel` goes offline
- **AND** `laptop` creates `2026-10-16.md` reading `- from laptop\n`
- **AND** `laptop` syncs
- **AND** `pixel` creates `2026-10-16.md` reading `- from pixel\n`
- **AND** `pixel` comes back online
- **AND** everyone syncs
- **THEN** `2026-10-16.md` reads `- from laptop\n- from pixel\n` on every device
- **AND** the review inbox shows 1 items under review

### Requirement R-SYN-04: Convergence

The system SHALL bring every device to the same text for every document once each device completes a sync cycle after the last edit.

#### Scenario: Random offline edits on three devices

- **GIVEN** a cloud server
- **WHEN** 3 devices make 200 random edits while going on and offline, with seed 42
- **AND** everyone syncs
- **THEN** every device matches the cloud server
- **AND** the run produced at least one review item

#### Scenario: Another seed

- **GIVEN** a cloud server
- **WHEN** 3 devices make 200 random edits while going on and offline, with seed 1337
- **AND** everyone syncs
- **THEN** every device matches the cloud server
- **AND** the run produced at least one review item

### Requirement R-SYN-05: No silent loss

The system SHALL keep both sides of every unresolved hunk in a conflict record until a person resolves or dismisses it.

#### Scenario: Both versions are kept for review

- **GIVEN** a cloud server
- **AND** devices `pixel` and `laptop`
- **AND** everyone has `c.md` reading `x = 1\n\nkeep\n`
- **WHEN** `pixel` goes offline
- **AND** `laptop` sets `c.md` to `x = 2\n\nkeep\n`
- **AND** `laptop` syncs
- **AND** `pixel` sets `c.md` to `x = 3\n\nkeep\n`
- **AND** `pixel` comes back online
- **THEN** the open item for `c.md` shows `x = 2\n` from `laptop` against `x = 3\n` from `pixel`

### Requirement R-SYN-06: Delete versus edit

The server SHALL keep the edited version when one side deleted a document and the other edited it, and SHALL open a `delete-edit` conflict so a person can confirm the deletion.

#### Scenario: Deleted on one device, edited on another

- **GIVEN** a cloud server
- **AND** devices `pixel` and `laptop`
- **AND** everyone has `d.md` reading `v1\n`
- **WHEN** `pixel` goes offline
- **AND** `laptop` deletes `d.md`
- **AND** `laptop` syncs
- **AND** `pixel` sets `d.md` to `v2\n`
- **AND** `pixel` comes back online
- **AND** everyone syncs
- **THEN** `d.md` reads `v2\n` on every device
- **AND** the review inbox shows 1 open item for `d.md`

#### Scenario: A stale device deletes an edited note

- **GIVEN** a cloud server
- **AND** devices `pixel` and `laptop`
- **AND** everyone has `d.md` reading `v1\n`
- **WHEN** `pixel` goes offline
- **AND** `laptop` sets `d.md` to `v2\n`
- **AND** `laptop` syncs
- **AND** `pixel` deletes `d.md`
- **AND** `pixel` comes back online
- **AND** everyone syncs
- **THEN** `d.md` reads `v2\n` on every device
- **AND** the review inbox shows 1 open item for `d.md`

### Requirement R-SYN-07: Rebase during round trip

The client SHALL preserve edits typed while a push is in flight by merging them onto the text the server returned.

#### Scenario: Typing while syncing

- **GIVEN** a cloud server
- **AND** devices `pixel` and `laptop`
- **AND** everyone has `r.md` reading `one\n\ntwo\n`
- **WHEN** `laptop` replaces `one` with `ONE` in `r.md`
- **AND** `laptop` syncs
- **AND** `pixel` replaces `two` with `two!` in `r.md`
- **AND** `pixel` keeps typing `\nthree\n` at the end of `r.md` while syncing
- **AND** everyone syncs
- **THEN** `r.md` reads `ONE\n\ntwo!\n\nthree\n` on every device

### Requirement R-SYN-08: Change feed

The server SHALL expose the list of heads changed after a given `rev` cursor, and the client SHALL fast-forward documents with no local changes to those heads.

#### Scenario: Other devices pick up changes

- **GIVEN** a cloud server
- **AND** devices `pixel`, `laptop` and `tablet`
- **WHEN** `pixel` has `n.md` reading `hello\n`
- **AND** `laptop` syncs
- **AND** `tablet` syncs
- **THEN** `n.md` on `laptop` reads `hello\n`
- **AND** `n.md` on `tablet` reads `hello\n`

### Requirement R-SYN-09: Local node replication

A server in local mode SHALL replicate its note heads with an upstream server as a sync client, retrying with backoff while the upstream is unreachable, and SHALL keep serving its own clients meanwhile.

Known limitations (0.1.0): attachments (R-VLT-11) are not replicated through a local node, so files its clients add stay on the node and files added upstream do not reach them; and a rename made on a local node reaches the upstream as a new note plus a deletion, so the upstream's history of that note starts at the rename (edits still follow the rename, R-VLT-09).

Grounding: JOP-F-028, OBS-F-166

#### Scenario: Both directions

- **GIVEN** a cloud server
- **AND** a local node `nas` replicating with the cloud server
- **AND** device `phone`
- **AND** device `desk` connected to `nas`
- **WHEN** `phone` has `from-cloud.md` reading `cloud\n`
- **THEN** within 5 seconds `nas` has `from-cloud.md` reading `cloud\n`
- **WHEN** `desk` has `from-desk.md` reading `desk\n`
- **THEN** within 5 seconds the cloud server has `from-desk.md` reading `desk\n`

#### Scenario: Cloud down

- **GIVEN** a cloud server
- **AND** a local node `nas` replicating with the cloud server
- **AND** device `desk` connected to `nas`
- **WHEN** the cloud server goes down
- **AND** `desk` has `offline.md` reading `written while the cloud was down\n`
- **THEN** within 5 seconds `nas` has `offline.md` reading `written while the cloud was down\n`
- **WHEN** the cloud server comes back
- **THEN** within 10 seconds the cloud server has `offline.md` reading `written while the cloud was down\n`

### Requirement R-SYN-10: Sync state is visible

The client SHALL show, at all times, whether it is synced, offline or has changes waiting, and SHALL mark each note that has unsynced changes.

Layer: ui

#### Scenario: Pending while offline, synced after

- **GIVEN** a cloud server
- **AND** device `pixel`
- **AND** `pixel` has `a.md` reading `one\n`
- **WHEN** `pixel` goes offline
- **AND** `pixel` sets `a.md` to `two\n`
- **THEN** `pixel` sees the sync status `Offline`
- **AND** `pixel` shows `a.md` as pending sync
- **WHEN** `pixel` comes back online
- **THEN** `pixel` sees the sync status `Synced`
- **AND** `pixel` shows `a.md` as synced

#### Scenario: Leaving a live note leaves nothing pending

- **GIVEN** a cloud server
- **AND** device `pixel`
- **WHEN** `pixel` has `b.md` reading `# B\n`
- **AND** `pixel` has `a.md` reading `see [[b]]\n`
- **THEN** `pixel` sees the sync status `Synced`
