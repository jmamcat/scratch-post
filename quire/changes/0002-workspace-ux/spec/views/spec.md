---
capability: views
prefix: VIEW
---

# Views

Different ways to see the same vault. A view never moves files; it only groups and orders
them. Grouping rules are pure functions in `@quire/views`, shown by the sidebar view switcher.

## ADDED Requirements

### Requirement R-VIEW-01: Sidebar view switcher

The client SHALL let the user switch the left sidebar between Folders, Search, Recent, Changes, Domains, Tags, Timeline and Board, and SHALL remember the choice per device.

Layer: ui

Grounding: OBS-F-067, OBS-F-079, OBS-F-083 (Obsidian sidebar views), NOT-F-036

#### Scenario: Remembered after reload

- **GIVEN** a cloud server
- **AND** device `pixel`
- **WHEN** `pixel` switches the sidebar to `Tags`
- **AND** `pixel` reloads the app
- **THEN** the sidebar on `pixel` shows the `Tags` view

### Requirement R-VIEW-02: Domains

The client SHALL group notes into domains, taking for each note the first that applies: its `domain` property; `Journal` for daily notes named `YYYY-MM-DD.md`; the top level of its first tag; its top-level folder; otherwise `Unsorted`. Domain names are shown in title case.

Layer: ui

#### Scenario: Grouped by what notes are about

- **GIVEN** a cloud server
- **AND** device `pixel`
- **AND** `pixel` has `money/budget.md` reading `# Budget\n`
- **AND** `pixel` has `misc/taxes.md` reading `---\ndomain: money\n---\n# Taxes\n`
- **AND** `pixel` has `2026-10-16.md` reading `# Today\n`
- **AND** `pixel` has `ideas/level.md` reading `#gamedev/levels first sketch\n`
- **WHEN** `pixel` switches the sidebar to `Domains`
- **THEN** the sidebar on `pixel` shows `budget` under `Money`
- **AND** the sidebar on `pixel` shows `taxes` under `Money`
- **AND** the sidebar on `pixel` shows `2026-10-16` under `Journal`
- **AND** the sidebar on `pixel` shows `level` under `Gamedev`

### Requirement R-VIEW-03: Tags view

The client SHALL list every tag as a nested tree (`a/b` under `a`) with the number of notes using it, and open a tag search when a tag is chosen.

Layer: ui

Grounding: OBS-F-083

#### Scenario: Nested tags with counts

- **GIVEN** a cloud server
- **AND** device `pixel`
- **AND** `pixel` has `a.md` reading `#idea/raw one\n`
- **AND** `pixel` has `b.md` reading `#idea two\n`
- **WHEN** `pixel` switches the sidebar to `Tags`
- **THEN** the sidebar on `pixel` shows `raw` under `idea`
- **AND** the sidebar on `pixel` shows the tag `idea` with 2 notes

### Requirement R-VIEW-04: Timeline

The client SHALL group notes by when they last changed, in the buckets Today, Yesterday, This week, This month and Older, newest first, using the server's revision times (cached for offline use).

Layer: ui

#### Scenario: Today's notes

- **GIVEN** a cloud server
- **AND** device `pixel`
- **AND** `pixel` has `fresh.md` reading `new\n`
- **WHEN** `pixel` switches the sidebar to `Timeline`
- **THEN** the sidebar on `pixel` shows `fresh` under `Today`

### Requirement R-VIEW-05: Board

The client SHALL group notes into columns by the value of a chosen property (default `status`), with notes lacking it in a `No status` column, and SHALL move a note to another column by changing that property.

Layer: ui

Grounding: NOT-F-052, OBS-F-111, CNF-F-052

#### Scenario: Columns by status

- **GIVEN** a cloud server
- **AND** device `pixel`
- **AND** `pixel` has `t1.md` reading `---\nstatus: todo\n---\nfirst\n`
- **AND** `pixel` has `t2.md` reading `---\nstatus: done\n---\nsecond\n`
- **WHEN** `pixel` switches the sidebar to `Board`
- **THEN** the sidebar on `pixel` shows `t1` under `todo`
- **AND** the sidebar on `pixel` shows `t2` under `done`

#### Scenario: Moving a card changes the note

- **GIVEN** a cloud server
- **AND** device `pixel`
- **AND** `pixel` has `t1.md` reading `---\nstatus: todo\n---\nfirst\n`
- **WHEN** `pixel` switches the sidebar to `Board`
- **AND** `pixel` moves `t1` to the `done` column
- **THEN** `t1.md` on `pixel` reads `---\nstatus: done\n---\nfirst\n`

### Requirement R-VIEW-06: Recent

The client SHALL list the notes this device opened most recently, newest first, up to 20.

Layer: ui

Grounding: OBS-F-077 (recent in switcher), Recent Files community plugin

#### Scenario: Last opened first

- **GIVEN** a cloud server
- **AND** device `pixel`
- **AND** `pixel` has `a.md` reading `a\n`
- **AND** `pixel` has `b.md` reading `b\n`
- **WHEN** `pixel` opens `a.md`
- **AND** `pixel` switches the sidebar to `Recent`
- **THEN** the sidebar on `pixel` lists `a` first
