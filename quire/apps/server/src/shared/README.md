# shared (server)

Cross-cutting pieces every capability may use; imports no capability.

- `events.ts`: in-process event hub for commits and conflict changes.
- `http.ts`: error-to-status mapping and query parsing.
- `hash.ts`: SHA-256 of a text.
