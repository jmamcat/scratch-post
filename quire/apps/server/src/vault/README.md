# vault (server)

Stores documents: the append-only SQLite revision log and the vault folder mirror that
Obsidian can open; captures edits other programs make to that folder.

- Public API: `SqliteRevisionStore`, `VaultMirror`, `vaultRoutes` (`/api/docs`, `/api/doc`, `/api/history`).
- Depends on: `@quire/sync` (RevisionStore contract), `@quire/vault` (paths), `shared/`.
- Specs: `R-VLT-*`.
