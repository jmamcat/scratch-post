---
capability: platforms
prefix: PLT
---

# Platforms

## ADDED Requirements

### Requirement R-PLT-01: Cloud mode

The server in `cloud` mode SHALL serve the API, the event stream, live rooms and, when built, the web client from one port.

### Requirement R-PLT-02: Local mode

The server in `local` mode SHALL behave like cloud mode for its own clients and additionally replicate with `QUIRE_UPSTREAM` (R-SYN-09).

### Requirement R-PLT-03: Android

The project SHALL include a Capacitor Android wrapper for the web client, and the client SHALL let the user set the server URL and token in Settings so it works outside a browser origin.

### Requirement R-PLT-04: Optional token

The server SHALL require `Authorization: Bearer <QUIRE_TOKEN>` (or `?token=` for SSE and WebSocket) on every route except `/api/health` when `QUIRE_TOKEN` is set.

#### Scenario: Missing token

- **GIVEN** `QUIRE_TOKEN=s3cret`
- **WHEN** a client calls `/api/docs` without a token
- **THEN** the reply is HTTP 401
