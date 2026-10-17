# Changelog

## Unreleased

### Templates and the slash menu (0008)

- Templates: notes in `templates/` (a setting), inserted with **Insert template**. `{{title}}`,
  `{{date}}`, `{{time}}` and `{{date:FORMAT}}` are filled in, and the template's properties
  are merged into the note's.
- **New note from template** starts an untitled note from one.
- The slash menu: `/` at the start of a line or after a space offers headings, lists, a
  task, quote, code block, callout, table, divider, and the template and attachment
  commands.

### Local nodes (0006)

- Local nodes replicate attachments both ways and keep their bytes, so the node's clients
  open files without the cloud.
- A rename made on a node, or upstream, arrives as a rename: on both servers the history
  of the new path includes the revisions made under the old one. This lifts both 0.1.0
  limits of R-SYN-09.

### Fixes

- Live rooms honour `QUIRE_MAX_NOTE_BYTES` (R-ACC-06, change 0005). An edit that takes a
  note over the limit is undone in the room, and its connection is closed with code 4413.
  Nothing oversized reaches the revision log.
- Compose builds no longer need a filesystem grant when no CA file is given (the
  `extra_ca` secret defaults to `deploy/no-extra-ca.pem`).

## 0.1.0 (2026-10-17)

The first stable point: a Markdown store and renderer with Obsidian defaults, a cloud server,
a local node, and a local-first web client (also wrapped for Android), syncing live and
offline. Specs are in `spec/`; each change's run report, with the decisions taken and how
to reverse them, is in `changes/archive/`.

### Storage and sync (0001)

- Notes are plain `.md` files in a vault folder Obsidian can open; an append-only revision
  log keeps every version.
- Live co-editing while online; three-way merge after offline edits; a review inbox for
  anything that cannot merge safely, with both versions kept.
- A local node that serves its own devices and keeps working while the cloud is down.

### Workspace (0002)

- Live Preview editing, interactive tasks, editable typed properties.
- Sidebar views: Folders, Search, Recent, Changes, Domains, Tags, Timeline, Board.
- Global and local graph; search operators (`path:`, `file:`, `tag:`, phrases, `-term`).
- Five themes, light and dark, with distinct heading styles.

### Production hardening (0003)

- Required, named, revocable tokens for up to 32 people or devices; tickets instead of
  tokens in URLs; origin allow-list, security headers, size limits, login throttling.
- Change sets, whole-vault restore, compaction, chained and verified backup bundles,
  `quire restore`.
- Rename keeps links and history; attachments stored once by content and cached offline.
- Offline app start; first-load JavaScript of 183 kB gzip.
- JSON logs, Prometheus metrics, readiness; a non-root container image and Compose stack.
- Load: 32 devices, 8 typing in one note, p95 push under 250 ms on the test machine.
- Every screen passes the UX gate (accessibility, contrast, typography, interaction) in
  every theme.

### Release (0004)

- Revoking a token also closes the event streams it opened.
- Every line the server logs is one JSON object, unexpected errors included.
- CI runs `check` and `scenarios` on every push and pull request.

### Known limitations

- Local nodes replicate notes only: no attachments, and a rename made on a local node
  arrives upstream as a new note plus a deletion (R-SYN-09).
- One vault per server; every token sees the whole vault.
- No Android build has been produced yet; the Capacitor wrapper is untested on a device.
