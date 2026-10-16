---
capability: vault
prefix: VLT
---

# Vault storage

## ADDED Requirements

### Requirement R-VLT-07: Editable properties

The client SHALL let the user add, change and remove front matter properties from the properties pane, showing text, number, checkbox, date and list values with matching inputs, and SHALL write the change back to the note's YAML front matter, creating or removing the front matter block as needed.

Layer: ui

Grounding: OBS-F-075, OBS-F-100, OBS-F-101, NOT-F-046

#### Scenario: Change a property

- **GIVEN** a cloud server
- **AND** device `pixel`
- **AND** `pixel` has `p.md` reading `---\nstatus: draft\n---\nBody\n`
- **WHEN** `pixel` opens `p.md`
- **AND** `pixel` sets the property `status` to `done`
- **THEN** `p.md` on `pixel` reads `---\nstatus: done\n---\nBody\n`

#### Scenario: Add the first property

- **GIVEN** a cloud server
- **AND** device `pixel`
- **AND** `pixel` has `p.md` reading `Body\n`
- **WHEN** `pixel` opens `p.md`
- **AND** `pixel` adds the property `owner` with `jo`
- **THEN** `p.md` on `pixel` reads `---\nowner: jo\n---\nBody\n`

#### Scenario: Remove the last property

- **GIVEN** a cloud server
- **AND** device `pixel`
- **AND** `pixel` has `p.md` reading `---\nowner: jo\n---\nBody\n`
- **WHEN** `pixel` opens `p.md`
- **AND** `pixel` removes the property `owner`
- **THEN** `p.md` on `pixel` reads `Body\n`

### Requirement R-VLT-08: Changes view

The client SHALL list the most recently changed notes across the vault, newest first, with the device that changed each and when, from the server's revision log (cached for offline use).

Layer: ui

Grounding: Obsidian Sync history (OBS-F-157), CNF-F-057, community "changelog" plugins

#### Scenario: Who changed what

- **GIVEN** a cloud server
- **AND** devices `pixel` and `laptop`
- **AND** `laptop` has `report.md` reading `draft\n`
- **AND** `pixel` syncs
- **WHEN** `pixel` switches the sidebar to `Changes`
- **THEN** the sidebar on `pixel` shows `report` changed by `laptop`
