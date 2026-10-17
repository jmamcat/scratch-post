---
capability: sync
prefix: SYN
---

# Offline sync

## MODIFIED Requirements

### Requirement R-SYN-09: Local node replication

A server in local mode SHALL replicate its notes and attachments with an upstream server as a sync client, retrying with backoff while the upstream is unreachable, and SHALL keep serving its own clients meanwhile. The node SHALL keep the bytes of every attachment it replicates, so its clients read them from it. A rename made on either side SHALL arrive on the other as a rename, so on both servers the history of the new path includes the revisions made under the old one (R-VLT-09).

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

#### Scenario: Attachments both ways

- **GIVEN** a cloud server
- **AND** a local node `nas` replicating with the cloud server
- **AND** device `phone`
- **AND** device `desk` connected to `nas`
- **WHEN** `phone` adds the file `img/cloud.png` with 2000 bytes from seed 1
- **THEN** within 5 seconds `nas` has the file `img/cloud.png`
- **WHEN** `desk` syncs
- **THEN** `desk` has the file `img/cloud.png` with 2000 bytes from seed 1
- **WHEN** `desk` adds the file `img/desk.png` with 3000 bytes from seed 2
- **THEN** within 5 seconds the cloud server has the file `img/desk.png`
- **WHEN** `phone` syncs
- **THEN** `phone` has the file `img/desk.png` with 3000 bytes from seed 2

#### Scenario: A rename on the node keeps its history upstream

- **GIVEN** a cloud server
- **AND** a local node `nas` replicating with the cloud server
- **AND** device `desk` connected to `nas`
- **AND** `desk` has `Old.md` reading `body`
- **AND** within 5 seconds the cloud server has `Old.md` reading `body`
- **WHEN** `desk` renames `Old.md` to `New.md`
- **AND** `desk` syncs
- **THEN** within 5 seconds the cloud server has `New.md` reading `body`
- **AND** the cloud server has no `Old.md`
- **AND** the history of `New.md` lists 2 revisions, newest first

#### Scenario: A rename upstream keeps its history on the node

- **GIVEN** a cloud server
- **AND** a local node `nas` replicating with the cloud server
- **AND** device `phone`
- **AND** `phone` has `Old.md` reading `body`
- **AND** within 5 seconds `nas` has `Old.md` reading `body`
- **WHEN** `phone` renames `Old.md` to `New.md`
- **AND** `phone` syncs
- **THEN** within 5 seconds `nas` has `New.md` reading `body`
- **AND** the history of `New.md` on `nas` lists 2 revisions
