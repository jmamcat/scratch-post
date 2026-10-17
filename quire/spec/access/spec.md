---
capability: access
prefix: ACC
---

# Access control

Who may talk to a server, how they prove it, and the limits every request lives within.
Quire serves one vault. Tokens identify the people and devices allowed to use it (up to 32);
everyone with a valid token sees the whole vault.

## Requirements

### Requirement R-ACC-01: A token is required

The server SHALL refuse to start in either mode when no access token is configured, unless `QUIRE_INSECURE_NO_AUTH=1` is set (for development, with a warning in the log), and SHALL answer every `/api` route except `/api/health`, and every live connection, with 401 when the request carries no valid token.

Layer: system

#### Scenario: No token, no start

- **WHEN** a cloud server starts with no access token
- **THEN** the cloud server fails to start with the message `no access token configured`

#### Scenario: Missing token

- **GIVEN** a cloud server that requires the token `s3cret`
- **THEN** a request for the note list without a token is refused
- **AND** a request for the note list with the token succeeds
- **AND** the health check without a token succeeds

### Requirement R-ACC-02: Named tokens

The server SHALL accept up to 32 named access tokens, one per person or device, created, listed and revoked with `quire tokens add|list|revoke <name>`, stored only as SHA-256 hashes and compared in constant time; a revoked token SHALL stop working at once, and live connections and event streams opened with it SHALL close within 5 seconds. `QUIRE_TOKEN` stays valid as the token named `admin`.

Layer: system

#### Scenario: A token per device

- **GIVEN** a cloud server that requires the token `s3cret`
- **AND** the token `phone-token` is added as `phone`
- **THEN** a request for the note list with the token `phone-token` succeeds
- **AND** the cloud server's data folder does not contain `phone-token`
- **WHEN** the token `phone` is revoked
- **THEN** a request for the note list with the token `phone-token` is refused

#### Scenario: Revoking closes live connections

- **GIVEN** a cloud server that requires the token `s3cret`
- **AND** the token `tablet-token` is added as `tablet`
- **AND** device `tablet` using the token `tablet-token`
- **AND** `tablet` is editing `p.md` live
- **WHEN** the token `tablet` is revoked
- **THEN** within 5 seconds `tablet` has lost its live connection

#### Scenario: At most 32 tokens

- **GIVEN** a cloud server that requires the token `s3cret`
- **AND** 32 tokens are added
- **THEN** adding the token `one-more` as `extra` is refused

#### Scenario: Revoking closes event streams

- **GIVEN** a cloud server that requires the token `s3cret`
- **AND** the token `tablet-token` is added as `tablet`
- **AND** device `tablet` using the token `tablet-token`
- **AND** `tablet` is listening to the event stream
- **WHEN** the token `tablet` is revoked
- **THEN** within 5 seconds the event stream of `tablet` has closed

### Requirement R-ACC-03: No secrets in URLs

The server SHALL accept access tokens only in the `Authorization: Bearer` header and SHALL refuse a `token` query parameter; event streams and live connections SHALL carry a ticket from `POST /api/tickets` instead, valid for 60 seconds and for one connection.

Layer: system

#### Scenario: Tokens in URLs are refused

- **GIVEN** a cloud server that requires the token `s3cret`
- **THEN** a request for the note list with the token in the URL is refused

#### Scenario: A ticket opens one connection

- **GIVEN** a cloud server that requires the token `s3cret`
- **THEN** a ticket opens the event stream once and is refused the second time

#### Scenario: Devices sync and edit live with a token

- **GIVEN** a cloud server that requires the token `s3cret`
- **AND** devices `a` and `b` using the token `s3cret`
- **AND** `a` and `b` are editing `p.md` live
- **WHEN** `a` types `hello` at the end of `p.md`
- **THEN** within 5 seconds `b` sees `p.md` reading `hello`

### Requirement R-ACC-04: The app never puts the token in a URL

The web app SHALL send the access token only in the `Authorization` header and SHALL open event streams and live connections with tickets.

Layer: ui

#### Scenario: The app works with a token

- **GIVEN** a cloud server that requires the token `s3cret`
- **AND** device `pixel` using the token `s3cret`
- **AND** `pixel` has `a.md` reading `hello`
- **WHEN** `pixel` opens `a.md`
- **AND** `pixel` types `!` at the end of `a.md`
- **THEN** within 5 seconds the cloud server has `a.md` reading `hello!`
- **AND** no request from `pixel` carries `s3cret` in its URL

### Requirement R-ACC-05: Origins and security headers

The server SHALL allow cross-origin requests only from origins listed in `QUIRE_ALLOWED_ORIGINS` (comma separated; its own origin always works), and SHALL send `Content-Security-Policy` (including `frame-ancestors 'none'`), `X-Content-Type-Options: nosniff` and `Referrer-Policy: no-referrer` with every response.

Layer: system

#### Scenario: Only listed origins

- **GIVEN** a cloud server that allows the origin `capacitor://localhost`
- **THEN** a request from the origin `capacitor://localhost` is allowed
- **AND** a request from the origin `https://evil.example` is not allowed

#### Scenario: Security headers

- **GIVEN** a cloud server
- **THEN** the app page and the note list carry the security headers

### Requirement R-ACC-06: Request limits

The server SHALL refuse note texts larger than `QUIRE_MAX_NOTE_BYTES` (default 2 MiB) and attachments larger than `QUIRE_MAX_FILE_BYTES` (default 25 MiB) with status 413, and after 10 failed token checks from one address within a minute SHALL answer that address with status 429 until the minute has passed.

Layer: system

#### Scenario: Oversized note

- **GIVEN** a cloud server
- **AND** device `pixel`
- **WHEN** `pixel` tries to save a note of 3 MiB
- **THEN** the request is rejected with status 413

#### Scenario: Guessing tokens is throttled

- **GIVEN** a cloud server that requires the token `s3cret`
- **WHEN** 11 requests with a wrong token are made
- **THEN** a request for the note list with the token is answered with status 429
