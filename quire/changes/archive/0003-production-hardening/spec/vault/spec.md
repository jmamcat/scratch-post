---
capability: vault
prefix: VLT
---

# Vault storage

## ADDED Requirements

### Requirement R-VLT-09: Rename keeps links and history

Renaming a note SHALL move it and rewrite every wikilink and Markdown link in other notes that resolved to it, keeping the alias, heading and block parts and the link's style (shortest unique name for wikilinks, a relative path for Markdown links). A rename SHALL work offline and sync like any edit; an edit another device makes to the old path before it learns of the rename SHALL land on the new path. The history of the new path SHALL include the revisions made under the old one.

Layer: system

Grounding: OBS-F-042, OBS-F-058

#### Scenario: Links follow a rename

- **GIVEN** a cloud server
- **AND** device `pixel`
- **AND** `pixel` has `Old.md` reading `body`
- **AND** `pixel` has `ref.md` reading `see [[Old]], [[Old#Part|that part]] and [x](Old.md)`
- **WHEN** `pixel` renames `Old.md` to `notes/New.md`
- **AND** `pixel` syncs
- **THEN** the cloud server has `notes/New.md` reading `body`
- **AND** the cloud server has no `Old.md`
- **AND** the cloud server has `ref.md` reading `see [[New]], [[New#Part|that part]] and [x](notes/New.md)`
- **AND** the history of `notes/New.md` lists 2 revisions, newest first

#### Scenario: An offline edit follows the rename

- **GIVEN** a cloud server
- **AND** devices `a` and `b`
- **AND** everyone has `Old.md` reading `body`
- **WHEN** `b` goes offline
- **AND** `a` renames `Old.md` to `New.md`
- **AND** `a` syncs
- **AND** `b` appends ` more` to `Old.md`
- **AND** `b` comes back online
- **AND** everyone syncs
- **THEN** `New.md` reads `body more` on every device
- **AND** the cloud server has no `Old.md`

### Requirement R-VLT-10: Rename in the app

Editing the inline title, or the file tree's Rename action, SHALL rename the note as R-VLT-09 describes.

Layer: ui

Grounding: OBS-F-035, OBS-F-058

#### Scenario: Rename from the title

- **GIVEN** a cloud server
- **AND** device `pixel`
- **AND** `pixel` has `Old.md` reading `body`
- **AND** `pixel` has `ref.md` reading `see [[Old]]`
- **WHEN** `pixel` opens `Old.md`
- **AND** `pixel` renames the open note to `New`
- **THEN** within 5 seconds the cloud server has `ref.md` reading `see [[New]]`
- **AND** within 5 seconds the cloud server has `New.md` reading `body`

### Requirement R-VLT-11: Attachments

The server SHALL store files that are not notes (images, PDF, audio, video and other allowed types) by SHA-256 of their content, once per distinct content, version them in the revision log like notes, mirror them into the vault folder, and sync them to every device; a device SHALL fetch a file's bytes when it is first needed and keep them for offline use. A file changed on two devices SHALL keep both: the later one is saved next to it with the device name in the file name, and a review item names both.

Layer: system

Grounding: JOP-F-023, JOP-F-024, JOP-F-045, OBS-F-045

#### Scenario: A file reaches every device

- **GIVEN** a cloud server
- **AND** devices `a` and `b`
- **WHEN** `a` adds the file `attachments/cat.png` with 2048 bytes from seed 1
- **AND** everyone syncs
- **THEN** `b` has the file `attachments/cat.png` with 2048 bytes from seed 1
- **AND** the vault folder has the file `attachments/cat.png` with 2048 bytes from seed 1

#### Scenario: Same bytes stored once

- **GIVEN** a cloud server
- **AND** device `a`
- **WHEN** `a` adds the file `x.png` with 4096 bytes from seed 2
- **AND** `a` adds the file `y.png` with 4096 bytes from seed 2
- **THEN** the cloud server stores 1 copy of 4096 bytes from seed 2

#### Scenario: Files open offline once fetched

- **GIVEN** a cloud server
- **AND** devices `a` and `b`
- **AND** `a` adds the file `doc.pdf` with 1024 bytes from seed 3
- **AND** everyone syncs
- **AND** `b` has the file `doc.pdf` with 1024 bytes from seed 3
- **WHEN** `b` goes offline
- **THEN** `b` has the file `doc.pdf` with 1024 bytes from seed 3

### Requirement R-VLT-12: Attachments in the app

The client SHALL add a file that is dropped, pasted or picked into the attachment folder (`attachments/` by default, a setting), insert an embed at the cursor (`![[name]]`, the shortest unique name), show images in reading view and Live Preview, and refuse files over the size limit with a message naming the limit.

Layer: ui

Grounding: OBS-F-045, OBS-F-046

#### Scenario: Drop an image

- **GIVEN** a cloud server
- **AND** device `pixel`
- **AND** `pixel` has `a.md` reading `# A\n`
- **WHEN** `pixel` opens `a.md`
- **AND** `pixel` drops the image `cat.png` into the editor
- **THEN** within 5 seconds `a.md` on `pixel` reads `# A\n![[cat.png]]\n`
- **AND** within 5 seconds the cloud server has the file `attachments/cat.png`
- **WHEN** `pixel` opens `a.md` in reading view
- **THEN** the reading view on `pixel` shows the image `cat.png` loaded

#### Scenario: Too large

- **GIVEN** a cloud server
- **AND** device `pixel`
- **AND** `pixel` has `a.md` reading `# A\n`
- **WHEN** `pixel` opens `a.md`
- **AND** `pixel` drops a file of 30 MiB into the editor
- **THEN** `pixel` sees the message `larger than 25 MiB`
