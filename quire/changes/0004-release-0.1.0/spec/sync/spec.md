---
capability: sync
prefix: SYN
---

# Offline sync

## MODIFIED Requirements

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
