---
capability: ops
prefix: OPS
---

# Operations

## MODIFIED Requirements

### Requirement R-OPS-02: Structured logs

The server SHALL write one JSON line per request to standard output with time, level, request id, method, route, status, duration in milliseconds and device, at the level set by `QUIRE_LOG_LEVEL` (default `info`), SHALL write everything else it logs (start-up, warnings, unexpected errors) as one JSON object per line too, and SHALL never write access tokens, tickets or note text to the log.

Layer: system

#### Scenario: Logs without secrets

- **GIVEN** a cloud server that requires the token `s3cret`
- **AND** device `pixel` using the token `s3cret`
- **WHEN** `pixel` has `a.md` reading `secret plans`
- **THEN** the cloud server's log has a JSON line for `POST /api/sync/push` with status 200
- **AND** the cloud server's log does not contain `s3cret`
- **AND** the cloud server's log does not contain `secret plans`

#### Scenario: Every line is JSON

- **GIVEN** a cloud server that requires the token `s3cret`
- **AND** device `pixel` using the token `s3cret`
- **WHEN** `pixel` has `a.md` reading `x`
- **AND** a request for the note list without a token is refused
- **THEN** every line in the cloud server's log is a JSON object
