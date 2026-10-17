# sync (web)

The local-first workspace: every note in IndexedDB, an in-memory copy the UI reads, and the
sync loop (on start, online, server events, after edits, every 30 s). Status bar.

- Public API: `Workspace`, `StatusBar`.
- Depends on: `@quire/sync`, `@quire/navigate`, `platforms/`, `shared/`.
- Specs: `R-SYN-01`, `R-SYN-07`.
