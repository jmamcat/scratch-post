# access (server)

Who may call the server: required tokens, named tokens for up to 32 people or devices,
single-use tickets for event streams and live connections, allowed origins, security headers,
size limits and throttling of failed token checks.

- Public API: `createAccess` (`assertConfigured`, `install`, `authorizeUpgrade`, `onRevoke`),
  `tokensCli`. `install` sets the request's `principal` (the token name) for the request log.
- Files: `tokens.ts` (hashed table, constant-time checks), `tickets.ts`, `guard.ts` (headers,
  CORS, limits, throttle), `tokens-cli.ts` (`quire tokens add|list|revoke`).
- Depends on: `platforms/`, `vault/` (the `tokens` table), `shared/hash`.
- Specs: `R-ACC-*`.
