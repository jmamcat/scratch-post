# access (server)

Who may call the server: required tokens, named tokens for up to 32 people or devices,
single-use tickets for event streams and live connections, allowed origins, security headers,
size limits and throttling of failed token checks.

- Public API: `createAccess` (`install`, `authorizeUpgrade`, `onRevoke`), `tokensCli`.
- Depends on: `platforms/`, `vault/` (the `tokens` table).
- Specs: `R-ACC-*`.
