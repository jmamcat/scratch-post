---
id: 0003-production-hardening
play: add-feature
status: in-progress
created: 2026-10-16
references: [obsidian, joplin]
capabilities: [access, backup, ops, vault, platforms]
---

# Production hardening

## Why

Quire 0002 works end to end, but it is not safe to run for real: the server runs open when
no token is set, tokens travel in URLs, nothing backs the data up, the web app cannot start
offline in a browser, renaming a note breaks links, files cannot be attached, and there is
no way to see what the server is doing. The owner runs Quire mainly alone, but it must hold
up to 32 users or devices at once, and it is deployed with Docker and Compose.

## Headline scenarios

- A server with no access token refuses to start; tokens never appear in a URL (R-ACC-01,
  R-ACC-03).
- Lose the data folder, restore it from backup bundles, and every note and its history is
  back (R-BAK-06).
- Roll the whole vault back to how it was after any group of changes, and undo that
  (R-BAK-03).
- Rename a note and every link to it follows, even when another device edited the note
  offline (R-VLT-09).
- Drop an image into a note; every device shows it, offline too (R-VLT-11, R-VLT-12).
- Open the app with no network after one visit (R-PLT-06).
- 32 devices sync at once, 8 of them typing in one note, and all converge (R-OPS-05).
- `docker compose up` gives a healthy, non-root server with volumes (R-OPS-04).

## What changes

- **access** (new): required tokens, named tokens for up to 32 people or devices, tickets
  for event streams and live connections, origin allow-list, security headers, size limits,
  failed-login throttling.
- **backup** (new): schema versions and migrations, change sets (groups of commits),
  whole-vault restore, history compaction, chained backup bundles built from change sets,
  restore from bundles, a vault history view.
- **ops** (new): health and readiness, JSON logs, Prometheus metrics, container image and
  Compose stack, a 32-device load scenario.
- **vault**: rename with link rewriting and history that follows; attachments stored by
  content hash and synced.
- **platforms**: offline app start (service worker), a first-load size budget, a UX gate
  (accessibility, contrast, readability) in every theme. R-PLT-04 is replaced by access.

## Reference grounding

Obsidian: rename updates internal links (OBS-F-042, OBS-F-058), attachment location and
paste or drop (OBS-F-045, OBS-F-046), file recovery snapshots and version history
(OBS-F-068, OBS-F-156). Joplin: attachments as content plus metadata (JOP-F-023), download
on demand (JOP-F-024), attachment conflicts (JOP-F-045), revisions and their retention
(JOP-F-049, JOP-F-050), restore as a new version (JOP-F-051).

## Out of scope

User accounts with passwords or per-vault permissions (tokens identify people and devices;
everyone with a token sees the whole vault), end-to-end encryption, CI pipelines (the gates
stay local; the Compose stack makes them easy to wire later), the Android build.

## Impact

New server folders `access/`, `backup/`, `ops/`; new web folders `backup/`,
`vault/attachments/`, `platforms/offline/`; a database migration (schema version 2); the
sync protocol gains rename and file entries; new files at the repository root for Docker
and uv. Scenario servers run with `QUIRE_INSECURE_NO_AUTH=1` unless a step sets a token.
